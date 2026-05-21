// api/subscribe.js
// Obtiene el link de pago del plan de MercadoPago
 
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
 
  var planId = req.body.plan_id;
  var userEmail = req.body.user_email;
 
  if (!planId || !userEmail) {
    return res.status(400).json({ error: "plan_id y user_email son requeridos" });
  }
 
  try {
    // Obtener los detalles del plan para conseguir el init_point
    var planRes = await fetch("https://api.mercadopago.com/preapproval_plan/" + planId, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.MP_ACCESS_TOKEN,
      },
    });
 
    var planData = await planRes.json();
 
    if (!planRes.ok) {
      return res.status(planRes.status).json({ error: planData.message || "Plan no encontrado" });
    }
 
    // El plan tiene su propio init_point para que el usuario se suscriba
    var initPoint = planData.init_point || planData.sandbox_init_point;
 
    if (!initPoint) {
      // Si no tiene init_point, crear la preaprobación manualmente
      var preapRes = await fetch("https://api.mercadopago.com/preapproval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + process.env.MP_ACCESS_TOKEN,
        },
        body: JSON.stringify({
          preapproval_plan_id: planId,
          payer_email: userEmail,
          back_url: "https://eduai-pro-nine.vercel.app/",
          reason: planData.reason || "EduAI Pro",
          auto_recurring: planData.auto_recurring,
          status: "pending",
        }),
      });
 
      var preapData = await preapRes.json();
 
      if (!preapRes.ok) {
        return res.status(preapRes.status).json({ error: preapData.message || "Error creando suscripcion" });
      }
 
      initPoint = preapData.init_point || preapData.sandbox_init_point;
    }
 
    return res.status(200).json({ init_point: initPoint });
 
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
 