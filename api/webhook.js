// api/webhook.js
// Recibe notificaciones de MercadoPago cuando un pago se procesa
 
import { createClient } from "@supabase/supabase-js";
 
var supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
async function fetchConReintento(url, options, intentos) {
  intentos = intentos || 3;
  var ultimoError;
  for (var i = 0; i < intentos; i++) {
    try {
      var res = await fetch(url, options);
      return res;
    } catch (e) {
      ultimoError = e;
      // Esperar antes de reintentar (500ms, 1s, 1.5s...)
      await new Promise(function(resolve){ setTimeout(resolve, 500 * (i + 1)); });
    }
  }
  throw ultimoError;
} 
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
 
  var topic = req.body.type || req.query.topic;
  var id = req.body.data && req.body.data.id ? req.body.data.id : req.query.id;
 
  // Confirmar recepcion inmediatamente
  res.status(200).json({ received: true });
 
  if (topic === "payment") {
    // Pago unico de creditos
    try {
      var mpPayRes = await fetchConReintento("https://api.mercadopago.com/v1/payments/" + id, {
        headers: { "Authorization": "Bearer " + process.env.MP_ACCESS_TOKEN },
      });
      if (!mpPayRes.ok) return;
      var payment = await mpPayRes.json();
      if (payment.status !== "approved") return;
      var externalRef = payment.external_reference;
      if (!externalRef || !externalRef.includes("|")) return;
      var parts = externalRef.split("|");
      var userId = parts[0];
      var amountUsd = parseFloat(parts[1]) || 1;
      var subResult = await supabase.from("subscriptions").select("id,extra_credits").eq("user_id",userId).eq("status","active").limit(1);
      if (subResult.error || !subResult.data || subResult.data.length === 0) return;
      var sub = subResult.data[0];
      await supabase.from("subscriptions").update({extra_credits:(sub.extra_credits||0)+amountUsd}).eq("id",sub.id);
      await supabase.from("credit_purchases").insert({user_id:userId,amount_usd:amountUsd,amount_local:payment.transaction_amount||0,currency:payment.currency_id||"ARS",status:"approved",mp_payment_id:String(id)});
    } catch(e) { console.error("Credits webhook error:",e.message); }
    return;
  }

  if (topic !== "preapproval" && topic !== "subscription_preapproval") return;
 
  try {
    // Obtener detalles de la suscripcion
    var mpRes = await fetchConReintento("https://api.mercadopago.com/preapproval/" + id, {
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

    // Si el plan es Directivo, asignar el rol directivo al usuario
    if (planId === "d1ee77dd48f44b0f98d8b3ca1baa774e" && (status === "authorized" || status === "active")) {
      try {
        var newMeta = Object.assign({}, user.user_metadata, { role: "directivo" });
        await supabase.auth.admin.updateUserById(user.id, { user_metadata: newMeta });
      } catch(e) { console.error("Error asignando rol directivo:", e.message); }
    }
 
  } catch (error) {
    console.error("Webhook error:", error.message);
  }
}
 