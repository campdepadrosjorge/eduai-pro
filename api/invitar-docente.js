// api/invitar-docente.js
// El directivo carga el mail de un docente. Crea la invitación en
// institutional_users y le manda el mail de invitación.
// Valida que el directivo no se pase de max_users.

import { createClient } from "@supabase/supabase-js";

var supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  var directivoId = req.body.directivo_id;   // auth.uid del directivo
  var email = (req.body.email || "").trim().toLowerCase();
  var name = (req.body.name || "").trim();
  var role = req.body.role === "directivo" ? "directivo" : "docente";

  if (!directivoId || !email) return res.status(400).json({ error: "directivo_id y email son requeridos" });
  if (email.indexOf("@") < 0) return res.status(400).json({ error: "Email inválido" });

  try {
    // 1) Buscar la suscripción madre del directivo
    var madreRes = await supabase.from("subscriptions")
      .select("id,max_users,status,institution_name")
      .eq("user_id", directivoId).eq("type", "institutional").limit(1);
    if (madreRes.error || !madreRes.data || madreRes.data.length === 0) {
      return res.status(403).json({ error: "No tenés una suscripción institucional activa" });
    }
    var madre = madreRes.data[0];
    if (madre.status !== "active") {
      return res.status(403).json({ error: "Tu suscripción institucional no está activa" });
    }

    // 2) Contar cupos usados (invitaciones + activos de esta institución)
    var usadosRes = await supabase.from("institutional_users")
      .select("id", { count: "exact", head: true })
      .eq("subscription_id", madre.id);
    var usados = usadosRes.count || 0;
    if (usados >= (madre.max_users || 0)) {
      return res.status(400).json({ error: "Ya usaste todos los cupos de tu plan (" + madre.max_users + "). Ampliá tu plan para agregar más." });
    }

    // 3) ¿Ya está cargado este mail en esta institución?
    var existe = await supabase.from("institutional_users")
      .select("id,status").eq("subscription_id", madre.id).ilike("email", email).limit(1);
    if (existe.data && existe.data.length > 0) {
      return res.status(400).json({ error: "Ese email ya está cargado en tu institución" });
    }

    // 4) Crear la invitación
    var ins = await supabase.from("institutional_users").insert({
      subscription_id: madre.id,
      email: email,
      name: name,
      role: role,
      status: "invited",
      invited_at: new Date().toISOString(),
    }).select("id").single();
    if (ins.error) return res.status(500).json({ error: "No se pudo crear la invitación: " + ins.error.message });

    // 5) Mandar el mail de invitación (no bloquea la respuesta si falla)
    enviarMailInvitacion(email, name, madre.institution_name || "tu institución").catch(function(e){
      console.error("Mail invitación error:", e.message);
    });

    return res.status(200).json({ success: true, cupos_restantes: (madre.max_users - usados - 1) });
  } catch (e) {
    console.error("invitar-docente error:", e.message);
    return res.status(500).json({ error: "Error interno", detail: e.message });
  }
}

async function enviarMailInvitacion(email, name, institucion) {
  var userName = name || email.split("@")[0];
  var appUrl = "https://app.aulaxpro.com";
  var html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff">
      <div style="background:#0D3559;padding:32px 40px;text-align:center">
        <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700">Aula<span style="color:#26C3D4">X</span>pro</h1>
        <p style="color:#7aaabf;margin:8px 0 0;font-size:14px">Tu asistente docente con IA</p>
      </div>
      <div style="padding:40px">
        <h2 style="color:#111110;font-size:20px;margin:0 0 12px">Hola, ${userName} 👋</h2>
        <p style="color:#555550;font-size:15px;line-height:1.6;margin:0 0 20px">
          <strong>${institucion}</strong> te habilitó una cuenta en AulaXpro, la plataforma con IA para generar material educativo, evaluaciones, rúbricas y mucho más.
        </p>
        <p style="color:#555550;font-size:15px;line-height:1.6;margin:0 0 28px">
          Para activar tu cuenta, entrá con este mismo email (<strong>${email}</strong>). Si todavía no tenés contraseña, creá una desde "Registrarme" usando este email, y tu cuenta institucional queda activada automáticamente.
        </p>
        <div style="text-align:center;margin-bottom:32px">
          <a href="${appUrl}" style="background:#0d9488;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">Activar mi cuenta</a>
        </div>
        <p style="color:#888880;font-size:13px;line-height:1.6;margin:0">
          Si tenés alguna pregunta, escribinos a <a href="mailto:hola@aulaxpro.com" style="color:#0d9488">hola@aulaxpro.com</a>
        </p>
      </div>
      <div style="background:#f0efea;padding:20px 40px;text-align:center;border-top:1px solid #d4cfc6">
        <p style="color:#888880;font-size:12px;margin:0">AulaXpro — aulaxpro.com</p>
      </div>
    </div>`;
  var text = "Hola " + userName + ",\n\n" + institucion + " te habilitó una cuenta en AulaXpro.\n\n" +
    "Para activarla, entrá con este mismo email (" + email + "). Si no tenés contraseña, creá una desde Registrarme usando este email y tu cuenta institucional se activa sola.\n\n" +
    "Ingresá: " + appUrl + "\n\nDudas: hola@aulaxpro.com";

  var r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.RESEND_API_KEY },
    body: JSON.stringify({
      from: "AulaXpro <hola@aulaxpro.com>",
      to: email,
      subject: "Tu cuenta de AulaXpro en " + institucion,
      html: html, text: text,
      headers: { "List-Unsubscribe": "<mailto:hola@aulaxpro.com?subject=BAJA>" },
    }),
  });
  if (!r.ok) { var err = await r.json(); throw new Error(JSON.stringify(err)); }
}
