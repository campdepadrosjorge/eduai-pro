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
    // Buscar suscripciones autorizadas en MercadoPago
    var mpRes = await fetch("https://api.mercadopago.com/preapproval/search?status=authorized", {
      headers: { "Authorization": "Bearer " + process.env.MP_ACCESS_TOKEN },
    });

    if (!mpRes.ok) return res.status(200).json({ activated: false, reason: "mp_error" });

    var data = await mpRes.json();
    var subs = data.results || [];
    if (subs.length === 0) return res.status(200).json({ activated: false, reason: "sin_suscripciones" });

    // Traer los IDs de MP ya vinculados en Supabase
    var usadasRes = await supabase.from("subscriptions").select("stripe_subscription_id").not("stripe_subscription_id", "is", null);
    var usadas = (usadasRes.data || []).map(function(r) { return r.stripe_subscription_id; });

    // Candidatas: autorizadas, no vinculadas, y con external_reference vacio o igual a este usuario
    var candidatas = subs.filter(function(s) {
      if (usadas.indexOf(s.id) >= 0) return false;
      if (s.external_reference && s.external_reference !== userId) return false;
      return true;
    });

    if (candidatas.length === 0) return res.status(200).json({ activated: false, reason: "sin_candidatas" });

    // Preferir la que tenga external_reference igual al usuario; si no, la mas reciente
    candidatas.sort(function(a, b) {
      var aRef = a.external_reference === userId ? 1 : 0;
      var bRef = b.external_reference === userId ? 1 : 0;
      if (aRef !== bRef) return bRef - aRef;
      return new Date(b.date_created) - new Date(a.date_created);
    });

    var sub = candidatas[0];

    // Buscar el plan
    var planResult = await supabase.from("plans").select("id, max_users").eq("mp_plan_id", sub.preapproval_plan_id).single();
    if (planResult.error || !planResult.data) return res.status(200).json({ activated: false, reason: "plan_no_encontrado" });
    var plan = planResult.data;

    // Calcular vencimiento
    var endDate = new Date();
    if (sub.auto_recurring && sub.auto_recurring.frequency_type === "months") {
      endDate.setMonth(endDate.getMonth() + (sub.auto_recurring.frequency || 1));
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Activar la suscripcion del usuario
    await supabase.from("subscriptions").upsert({
      user_id: userId,
      plan_id: plan.id,
      type: "individual",
      status: "active",
      is_trial: false,
      max_users: plan.max_users,
      stripe_subscription_id: sub.id,
      current_period_start: new Date().toISOString(),
      current_period_end: endDate.toISOString(),
    }, { onConflict: "user_id" });

    // Si es el plan Directivo, asignar el rol
    if (sub.preapproval_plan_id === "d1ee77dd48f44b0f98d8b3ca1baa774e") {
      try {
        var userRes = await supabase.auth.admin.getUserById(userId);
        var u = userRes.data ? userRes.data.user : null;
        if (u) {
          var newMeta = Object.assign({}, u.user_metadata, { role: "directivo" });
          await supabase.auth.admin.updateUserById(userId, { user_metadata: newMeta });
        }
      } catch (e) {}
    }

    return res.status(200).json({ activated: true, subscription_id: sub.id });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}