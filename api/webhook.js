// api/webhook.js
// Recibe notificaciones de MercadoPago cuando un pago se procesa
 
import { createClient } from "@supabase/supabase-js";
 
var supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
 
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
 
  var topic = req.body.type || req.query.topic;
  var id = req.body.data && req.body.data.id ? req.body.data.id : req.query.id;
 
  // Confirmar recepcion inmediatamente
  res.status(200).json({ received: true });
 
  if (topic !== "preapproval" && topic !== "subscription_preapproval") return;
 
  try {
    // Obtener detalles de la suscripcion
    var mpRes = await fetch("https://api.mercadopago.com/preapproval/" + id, {
      headers: { "Authorization": "Bearer " + process.env.MP_ACCESS_TOKEN },
    });
 
    if (!mpRes.ok) return;
 
    var sub = await mpRes.json();
 
    var status = sub.status;
    var payerEmail = sub.payer_email;
    var planId = sub.preapproval_plan_id;
    var externalRef = sub.external_reference;
 
    // Buscar el plan en Supabase
    var planResult = await supabase
      .from("plans")
      .select("id, name, max_users")
      .eq("mp_plan_id", planId)
      .single();
 
    if (planResult.error || !planResult.data) return;
 
    var plan = planResult.data;
 
    // Buscar usuario por email o external_reference
    var userResult = await supabase.auth.admin.listUsers();
    var users = userResult.data ? userResult.data.users : [];
    var user = users.find(function(u) {
      return u.email === payerEmail || u.id === externalRef;
    });
 
    if (!user) return;
 
    // Calcular fecha de vencimiento (1 mes o 1 año)
    var endDate = new Date();
    if (sub.auto_recurring && sub.auto_recurring.frequency_type === "months") {
      endDate.setMonth(endDate.getMonth() + sub.auto_recurring.frequency);
    }
 
    // Crear o actualizar suscripcion en Supabase
    await supabase.from("subscriptions").upsert({
      user_id: user.id,
      plan_id: plan.id,
      type: "individual",
      status: status === "authorized" ? "active" : status,
      max_users: plan.max_users,
      stripe_subscription_id: sub.id,
      current_period_start: new Date().toISOString(),
      current_period_end: endDate.toISOString(),
    }, { onConflict: "user_id" });
 
  } catch (error) {
    console.error("Webhook error:", error.message);
  }
}
 