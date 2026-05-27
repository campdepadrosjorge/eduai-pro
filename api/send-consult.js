// api/send-consult.js
// Envia email de consulta institucional via Resend
 
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
 
  var { plan, nombre, cargo, colegio, telefono, email, docentes } = req.body;
 
  if (!nombre || !email || !colegio) {
    return res.status(400).json({ error: "Datos requeridos faltantes" });
  }
 
  try {
    var html = `
      <h2>Nueva consulta institucional — AulaXpro</h2>
      <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px">
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:700;background:#f5f5f5">Plan consultado</td><td style="padding:8px 12px;border:1px solid #ddd">${plan}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:700;background:#f5f5f5">Nombre</td><td style="padding:8px 12px;border:1px solid #ddd">${nombre}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:700;background:#f5f5f5">Cargo</td><td style="padding:8px 12px;border:1px solid #ddd">${cargo}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:700;background:#f5f5f5">Colegio</td><td style="padding:8px 12px;border:1px solid #ddd">${colegio}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:700;background:#f5f5f5">Email</td><td style="padding:8px 12px;border:1px solid #ddd">${email}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:700;background:#f5f5f5">Teléfono</td><td style="padding:8px 12px;border:1px solid #ddd">${telefono||"No indicado"}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:700;background:#f5f5f5">Cantidad de docentes</td><td style="padding:8px 12px;border:1px solid #ddd">${docentes}</td></tr>
      </table>
      <p style="margin-top:20px;color:#888;font-size:12px">AulaXpro — aulaxpro.com</p>
    `;
 
    var resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "AulaXpro <hola@aulaxpro.com>",
        to: "hola@aulaxpro.com",
        reply_to: email,
        subject: "Consulta institucional — " + plan + " — " + colegio,
        html,
      }),
    });
 
    if (!resendRes.ok) {
      var err = await resendRes.json();
      throw new Error(err.message || "Error al enviar email");
    }
 
    return res.status(200).json({ success: true });
 
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
 