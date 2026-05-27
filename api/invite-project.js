import { createClient } from "@supabase/supabase-js";
 
var supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
 
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
 
  var projectId = req.body.project_id;
  var email = req.body.email;
  var subjectName = req.body.subject_name;
 
  if (!projectId || !email) return res.status(400).json({ error: "Datos requeridos" });
 
  try {
    var listResult = await supabase.auth.admin.listUsers({ perPage: 1000 });
    var users = listResult.data ? listResult.data.users : [];
    var user = users.find(function(u) { return u.email === email; });
 
    if (!user) return res.status(404).json({ error: "El usuario no tiene cuenta en AulaXpro" });
 
    var existing = await supabase.from("project_members")
      .select("id").eq("project_id", projectId).eq("user_id", user.id).single();
 
    if (existing.data) return res.status(400).json({ error: "Este docente ya es miembro del proyecto" });
 
    var r = await supabase.from("project_members").insert({
      project_id: projectId,
      user_id: user.id,
      subject_name: subjectName || "",
      status: "active",
      joined_at: new Date().toISOString(),
    });
 
   if (r.error) throw new Error(r.error.message);

    // Obtener nombre del proyecto
    var projectResult = await supabase.from("projects").select("title,owner_id").eq("id",projectId).single();
    var projectTitle = projectResult.data ? projectResult.data.title : "un proyecto";

    // Enviar email via Supabase Edge Function o simplemente loguear
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + (process.env.RESEND_API_KEY || ""),
        },
        body: JSON.stringify({
          from: "AulaXpro <hola@aulaxpro.com>",
          to: email,
          subject: "Te invitaron a colaborar en AulaXpro",
          html: "<p>Hola,</p><p>Te invitaron a colaborar en el proyecto <strong>"+projectTitle+"</strong> en AulaXpro.</p><p>Ingresá a tu cuenta para ver el proyecto y empezar a colaborar.</p><a href='https://app.aulaxpro.com' style='background:#0d9488;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px;font-weight:700'>Ver proyecto en AulaXpro</a><p style='margin-top:20px;color:#888;font-size:12px'>AulaXpro — Tu asistente docente con IA</p>",
        }),
      });
    } catch(emailErr) { console.log("Email no enviado:", emailErr.message); }

    return res.status(200).json({ success: true, user_id: user.id });
 
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
 