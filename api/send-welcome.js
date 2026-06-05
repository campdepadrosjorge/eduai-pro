export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  var { email, name } = req.body;

  if (!email) return res.status(400).json({ error: "Email requerido" });

  var userName = name || email.split("@")[0];

  var html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff">
      
      <div style="background:#0D3559;padding:32px 40px;text-align:center">
        <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700">
          Aula<span style="color:#26C3D4">X</span>pro
        </h1>
        <p style="color:#7aaabf;margin:8px 0 0;font-size:14px">Tu asistente docente con IA</p>
      </div>

      <div style="padding:40px">
        <h2 style="color:#111110;font-size:20px;margin:0 0 12px">Bienvenido, ${userName} 👋</h2>
        <p style="color:#555550;font-size:15px;line-height:1.6;margin:0 0 28px">
          Tu cuenta en AulaXpro ya esta activa. Tenes 7 dias de prueba gratuita para explorar todas las funciones.
        </p>

        <div style="background:#f0efea;border-radius:8px;padding:24px;margin-bottom:28px">
          <p style="color:#0d9488;font-weight:700;font-size:13px;margin:0 0 16px;letter-spacing:0.5px">PARA EMPEZAR</p>
          
          <div style="display:flex;align-items:flex-start;margin-bottom:14px">
            <div style="background:#0d9488;color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;margin-right:12px;text-align:center;line-height:24px">1</div>
            <div>
              <p style="margin:0;font-weight:700;color:#111110;font-size:14px">Crea tu primera materia</p>
              <p style="margin:4px 0 0;color:#555550;font-size:13px">Carga el nombre, nivel y programa. La IA usara ese contexto para generar material mas preciso.</p>
            </div>
          </div>

          <div style="display:flex;align-items:flex-start;margin-bottom:14px">
            <div style="background:#0d9488;color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;margin-right:12px;text-align:center;line-height:24px">2</div>
            <div>
              <p style="margin:0;font-weight:700;color:#111110;font-size:14px">Genera tu primer contenido</p>
              <p style="margin:4px 0 0;color:#555550;font-size:13px">Desde el Generador IA elegis el tipo (actividad, evaluacion, rubrica) y en segundos tenes material listo para usar.</p>
            </div>
          </div>

          <div style="display:flex;align-items:flex-start">
            <div style="background:#0d9488;color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;margin-right:12px;text-align:center;line-height:24px">3</div>
            <div>
              <p style="margin:0;font-weight:700;color:#111110;font-size:14px">Explora el tour interactivo</p>
              <p style="margin:4px 0 0;color:#555550;font-size:13px">Hace clic en el boton "Guia" en la barra superior para ver como funciona cada seccion.</p>
            </div>
          </div>
        </div>

        <div style="text-align:center;margin-bottom:32px">
          <a href="https://app.aulaxpro.com" style="background:#0d9488;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
            Ir a AulaXpro
          </a>
        </div>

        <p style="color:#888880;font-size:13px;line-height:1.6;margin:0">
          Si tenes alguna pregunta, respondé este email o escribinos a 
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

  try {
    var resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "AulaXpro <hola@aulaxpro.com>",
        to: email,
        subject: "Bienvenido a AulaXpro, " + userName + "!",
        html,
      }),
    });

    if (!resendRes.ok) {
      var err = await resendRes.json();
      throw new Error(JSON.stringify(err));
    }

    return res.status(200).json({ success: true });

  } catch(error) {
    return res.status(500).json({ error: error.message });
  }
}