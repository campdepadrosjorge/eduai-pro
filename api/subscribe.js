// api/subscribe.js
// Usa el init_point del plan (que funciona para el checkout) y le agrega
// el external_reference con el userId para que el webhook vincule al usuario

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  var planId = req.body.plan_id;
  var userEmail = req.body.user_email;
  var userId = req.body.user_id;

  if (!planId || !userEmail) {
    return res.status(400).json({ error: "plan_id y user_email son requeridos" });
  }

  try {
    // Obtener el init_point del plan
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

    var initPoint = planData.init_point || planData.sandbox_init_point;

    if (!initPoint) {
      return res.status(500).json({ error: "El plan no tiene link de pago" });
    }

    // Agregar el external_reference (userId) como parametro en la URL del checkout
    if (userId) {
      var separador = initPoint.indexOf("?") >= 0 ? "&" : "?";
      initPoint = initPoint + separador + "external_reference=" + encodeURIComponent(userId);
    }

    return res.status(200).json({ init_point: initPoint });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}