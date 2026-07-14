// api/subscribe.js
// Crea una suscripcion de MercadoPago asociada al plan, con checkout para el usuario

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  var planId = req.body.plan_id;
  var userEmail = req.body.user_email;
  var userId = req.body.user_id;

  if (!planId || !userEmail) {
    return res.status(400).json({ error: "plan_id y user_email son requeridos" });
  }

  try {
    // Crear la suscripcion asociada al plan.
    // No enviamos payer_email ni status: dejamos que el usuario complete
    // sus datos y tarjeta en el checkout de MercadoPago.
    // El external_reference lleva el userId para que el webhook lo vincule.
    var preapRes = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.MP_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        preapproval_plan_id: planId,
        external_reference: userId || "",
        back_url: "https://app.aulaxpro.com/",
      }),
    });

    var preapData = await preapRes.json();

    if (!preapRes.ok) {
      return res.status(preapRes.status).json({ error: preapData.message || "Error creando suscripcion" });
    }

    var initPoint = preapData.init_point || preapData.sandbox_init_point;

    return res.status(200).json({ init_point: initPoint });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}