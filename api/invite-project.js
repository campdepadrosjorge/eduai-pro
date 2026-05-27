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
 
    return res.status(200).json({ success: true, user_id: user.id });
 
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
 