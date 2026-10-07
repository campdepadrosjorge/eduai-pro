// api/activar-institucional.js
// Se llama cuando un usuario entra. Chequea si su email fue invitado a una
// institución. Si sí, activa su cuenta como cuenta hija institucional (cap $3
// propio) absorbiendo cualquier trial existente. Corre con service key.
//
// Casos:
//   1) Usuario nuevo o con trial  -> upsert fila hija institucional (active)
//   2) Usuario con suscripción PAGA individual activa (no trial) -> NO se toca;
//      se marca la invitación como "pending_manual" para que el directivo lo vea.
//   3) Sin invitación -> no hace nada (el front sigue con el trial normal).

import { createClient } from "@supabase/supabase-js";

var supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  var userId = req.body.user_id;
  if (!userId) return res.status(400).json({ error: "user_id requerido" });

  try {
    // Email del usuario
    var uRes = await supabase.auth.admin.getUserById(userId);
    var user = uRes.data ? uRes.data.user : null;
    if (!user || !user.email) return res.status(200).json({ activated: false, reason: "no_user" });
    var email = user.email.toLowerCase();

    // ¿Hay una invitación pendiente para este email?
    var invRes = await supabase.from("institutional_users")
      .select("id,subscription_id,role,status").ilike("email", email)
      .in("status", ["invited"]).limit(1);
    if (invRes.error || !invRes.data || invRes.data.length === 0) {
      return res.status(200).json({ activated: false, reason: "no_invite" });
    }
    var inv = invRes.data[0];

    // Datos de la suscripción madre (para heredar vencimiento y validar que esté activa)
    var madreRes = await supabase.from("subscriptions")
      .select("id,status,current_period_end,institution_name").eq("id", inv.subscription_id).single();
    if (madreRes.error || !madreRes.data) return res.status(200).json({ activated: false, reason: "no_madre" });
    var madre = madreRes.data;
    if (madre.status !== "active") return res.status(200).json({ activated: false, reason: "madre_inactiva" });

    // ¿El usuario ya tiene una suscripción PAGA individual activa (no trial)?
    var actualRes = await supabase.from("subscriptions")
      .select("id,is_trial,type,status").eq("user_id", userId).eq("status", "active").limit(1);
    var actual = (actualRes.data && actualRes.data.length > 0) ? actualRes.data[0] : null;

    if (actual && actual.is_trial === false && actual.type === "individual") {
      // Caso 3: ya paga individual. No pisar. Marcar para revisión manual del directivo.
      await supabase.from("institutional_users")
        .update({ status: "pending_manual", user_id: userId }).eq("id", inv.id);
      return res.status(200).json({ activated: false, reason: "ya_tiene_pago" });
    }

    // Casos 1 y 2: crear/convertir a fila hija institucional (absorbe el trial).
    var upsert = await supabase.from("subscriptions").upsert({
      user_id: userId,
      type: "individual",            // individual para que dbCheckBudget/dbGetUsage funcionen tal cual
      status: "active",
      is_trial: false,
      max_users: 1,
      institution_id: madre.id,      // vínculo a la madre
      institution_name: madre.institution_name,
      current_period_start: new Date().toISOString(),
      current_period_end: madre.current_period_end,
      tokens_limit: 3,
      tokens_used: 0,
      tokens_reset_date: primerDiaMesSiguiente(),
    }, { onConflict: "user_id" });
    if (upsert.error) return res.status(500).json({ error: upsert.error.message });

    // Marcar la invitación como activa
    await supabase.from("institutional_users")
      .update({ status: "active", user_id: userId, activated_at: new Date().toISOString() }).eq("id", inv.id);

    return res.status(200).json({ activated: true, institution: madre.institution_name });
  } catch (e) {
    console.error("activar-institucional error:", e.message);
    return res.status(500).json({ error: "Error interno", detail: e.message });
  }
}

function primerDiaMesSiguiente() {
  var now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}
