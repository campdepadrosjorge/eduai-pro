export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") return res.status(405).end();

  const secret = req.headers["authorization"]?.replace("Bearer ", "") || req.query.secret;
  if (secret !== process.env.CRON_SECRET) return res.status(401).json({ error: "No autorizado" });

  try {
    const now = new Date();
    const in3days = new Date(now);
    in3days.setDate(in3days.getDate() + 3);

    const dateFrom = in3days.toISOString().split("T")[0] + "T00:00:00.000Z";
    const dateTo   = in3days.toISOString().split("T")[0] + "T23:59:59.999Z";

    const subRes = await fetch(process.env.SUPABASE_URL + "/rest/v1/subscriptions?status=eq.active&current_period_end=gte." + dateFrom + "&current_period_end=lte." + dateTo + "&select=user_id,current_period_end", {
      headers: {
        "apikey": process.env.SUPABASE_SERVICE_KEY,
        "Authorization": "Bearer " + process.env.SUPABASE_SERVICE_KEY,
      }
    });

   const subs = await subRes.json();
if (!subs || !subs.length) return res.status(200).json({ message: "Sin vencimientos en 3 dias", count: 0 });

const uniqueSubs = Object.values(subs.reduce(function(acc, sub) {
  if (!acc[sub.user_id]) acc[sub.user_id] = sub;
  return acc;
}, {}));

    var sent = 0;
    var failed = 0;

    for (const sub of uniqueSubs) {
      try {
        const userRes = await fetch(process.env.SUPABASE_URL + "/auth/v1/admin/users/" + sub.user_id, {
          headers: {
            "apikey": process.env.SUPABASE_SERVICE_KEY,
            "Authorization": "Bearer " + process.env.SUPABASE_SERVICE_KEY,
          }
        });
        const userData = await userRes.json();
        const email = userData.email;
        const name = userData.user_metadata?.name || email.split("@")[0];

        const venceDate = new Date(sub.current_period_end).toLocaleDateString("es-AR", { day:"numeric", month:"long", year:"numeric" });

        const html = `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff">
            <div style="background:#0D3559;padding:32px 40px;text-align:center">
              <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700">
                Aula<span style="color:#26C3D4">X</span>pro
              </h1>
              <p style="color:#7aaabf;margin:8px 0 0;font-size:14px">Tu asistente docente con IA</p>
            </div>
            <div style="padding:40px">
              <h2 style="color:#111110;font-size:20px;margin:0 0 12px">Tu acceso vence en 3 dias, ${name}</h2>
              <p style="color:#555550;font-size:15px;line-height:1.6;margin:0 0 28px">
                Tu suscripcion a AulaXpro vence el <strong>${venceDate}</strong>. Para seguir generando material y accediendo a todas las funciones, renova tu plan.
              </p>
              <div style="background:#f0efea;border-radius:8px;padding:24px;margin-bottom:28px">
                <p style="color:#0d9488;font-weight:700;font-size:13px;margin:0 0 12px;letter-spacing:0.5px">LO QUE PERDERIAS SIN RENOVAR</p>
                <p style="color:#555550;font-size:14px;margin:0 0 8px">— Generador IA (actividades, evaluaciones, rubricas)</p>
                <p style="color:#555550;font-size:14px;margin:0 0 8px">— Chat Docente con busqueda web</p>
                <p style="color:#555550;font-size:14px;margin:0 0 8px">— Corrector de TPs y correccion batch</p>
                <p style="color:#555550;font-size:14px;margin:0">— Tu biblioteca, banco de preguntas y secuencias guardadas</p>
              </div>
              <div style="text-align:center;margin-bottom:32px">
                <a href="https://app.aulaxpro.com?section=pricing" style="background:#0d9488;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
                  Renovar mi plan
                </a>
              </div>
              <p style="color:#888880;font-size:13px;line-height:1.6;margin:0">
                Si tenes alguna pregunta escribinos a 
                <a href="mailto:hola@aulaxpro.com" style="color:#0d9488">hola@aulaxpro.com</a>
              </p>
            </div>
            <div style="background:#f0efea;padding:20px 40px;text-align:center;border-top:1px solid #d4cfc6">
              <p style="color:#888880;font-size:12px;margin:0">
                AulaXpro — aulaxpro.com<br>
                <a href="https://app.aulaxpro.com" style="color:#0d9488;text-decoration:none">Ir a la app</a>
              </p>
            </div>
          </div>
        `;
        const emailText = "Tu acceso a AulaXpro vence en 3 dias, " + name + "\n\n" +
          "Tu suscripcion a AulaXpro vence el " + venceDate + ". Para seguir generando material y accediendo a todas las funciones, renova tu plan.\n\n" +
          "Renova tu plan: https://app.aulaxpro.com?section=pricing\n\n" +
          "Si tenes alguna pregunta escribinos a hola@aulaxpro.com\n\n" +
          "AulaXpro - aulaxpro.com\n\n" +
          "Para no recibir mas estos correos, escribinos a hola@aulaxpro.com con el asunto BAJA.";
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + process.env.RESEND_API_KEY,
          },
          body: JSON.stringify({
            from: "AulaXpro <hola@aulaxpro.com>",
            to: email,
            subject: "Tu acceso a AulaXpro vence en 3 dias",
            html,
            text: emailText,
            headers: {
              "List-Unsubscribe": "<mailto:hola@aulaxpro.com?subject=BAJA>",
            },
          }),
        });

        if (!emailRes.ok) throw new Error("Error Resend");
        sent++;
      } catch(e) {
        failed++;
      }
    }

    return res.status(200).json({ success: true, sent, failed });

  } catch(error) {
    return res.status(500).json({ error: error.message });
  }
}