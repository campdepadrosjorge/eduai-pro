// api/subscribe.js
// Crea una suscripcion en MercadoPago y devuelve el link de pago
 
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
 
  var planId = req.body.plan_id;
  var userEmail = req.body.user_email;
  var userName = req.body.user_name;
  var userId = req.body.user_id;
 
  if (!planId || !userEmail) {
    return res.status(400).json({ error: "plan_id y user_email son requeridos" });
  }
 
  try {
    var body = {
      preapproval_plan_id: planId,
      payer_email: userEmail,
      card_token_id: undefined,
      back_url: "https://eduai-pro-nine.vercel.app/",
      external_reference: userId || userEmail,
    };
 
    // Limpiar campos undefined
    Object.keys(body).forEach(function(k) {
      if (body[k] === undefined) delete body[k];
    });
 
    var mpRes = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.MP_ACCESS_TOKEN,
      },
      body: JSON.stringify(body),
    });
 
    var data = await mpRes.json();
 
    if (!mpRes.ok) {
      return res.status(mpRes.status).json({ error: data.message || "Error de MercadoPago" });
    }
 
    return res.status(200).json({
      init_point: data.init_point,
      subscription_id: data.id,
    });
 
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
 