// api/webhook-credits.js
// Recibe notificaciones de MercadoPago para pagos de creditos
 
import { createClient } from "@supabase/supabase-js";
 
var supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
 
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
 
  res.status(200).json({ received: true });
 
  var topic = req.body.type || req.query.topic;
  var id = req.body.data && req.body.data.id ? req.body.data.id : req.query.id;
 
  if (topic !== "payment") return;
 
  try {
    var mpRes = await fetch("https://api.mercadopago.com/v1/payments/" + id, {
      headers: { "Authorization": "Bearer " + process.env.MP_ACCESS_TOKEN },
    });
 
    if (!mpRes.ok) return;
 
    var payment = await mpRes.json();
 
    if (payment.status !== "approved") return;
 
    var externalRef = payment.external_reference;
    if (!externalRef) return;
 
    var parts = externalRef.split("|");
    var userId = parts[0];
    var amountUsd = parseFloat(parts[1]) || 1;
 
    // Agregar credito al usuario
    var subResult = await supabase.from("subscriptions")
      .select("id, extra_credits")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1);
 
    if (subResult.error || !subResult.data || subResult.data.length === 0) return;
 
    var sub = subResult.data[0];
    var newCredits = (sub.extra_credits || 0) + amountUsd;
 
    await supabase.from("subscriptions")
      .update({ extra_credits: newCredits })
      .eq("id", sub.id);
 
    // Registrar la compra
    await supabase.from("credit_purchases").insert({
      user_id: userId,
      amount_usd: amountUsd,
      amount_local: payment.transaction_amount || 0,
      currency: payment.currency_id || "ARS",
      status: "approved",
      mp_payment_id: String(id),
    });
 
  } catch (error) {
    console.error("Webhook credits error:", error.message);
  }
}
 