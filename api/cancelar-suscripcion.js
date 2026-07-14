import { createClient } from "@supabase/supabase-js";

var supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  var userId = req.body.user_id;
  if (!userId) return res.status(400).json({ error: "user_id requerido" });

  try {
    // Buscar la suscripcion activa del usuario
    var subResult = await supabase
      .from("subscriptions")
      .select("id, stripe_subscription_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1);

    if (subResult.error || !subResult.data || subResult.data.length === 0) {
      return res.status(404).json({ error: "No se encontro una suscripcion activa" });
    }

    var sub = subResult.data[0];
    var mpSubId = sub.stripe_subscription_id;

    // Cancelar en MercadoPago (si tiene ID de MP)
    if (mpSubId) {
      var mpRes = await fetch("https://api.mercadopago.com/preapproval/" + mpSubId, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + process.env.MP_ACCESS_TOKEN,
        },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (!mpRes.ok) {
        var errData = await mpRes.json().catch(function() { return {}; });
        return res.status(mpRes.status).json({ error: errData.message || "Error al cancelar en MercadoPago" });
      }
    }

    // Marcar como cancelada en Supabase
    await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("id", sub.id);

    return res.status(200).json({ success: true });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}