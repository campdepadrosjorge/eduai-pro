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
    // Buscar memberships activos del usuario
    var members = await supabase.from("project_members")
      .select("project_id")
      .eq("user_id", userId)
      .eq("status", "active");
 
    var memberIds = (members.data||[]).map(function(m){ return m.project_id; });
 
    if (!memberIds.length) return res.status(200).json({ projects: [] });
 
    // Buscar proyectos donde NO es owner
    var projects = await supabase.from("projects")
      .select("*, project_members(*)")
      .in("id", memberIds)
      .neq("owner_id", userId);
 
    return res.status(200).json({ projects: projects.data||[] });
 
  } catch(error) {
    return res.status(500).json({ error: error.message });
  }
}
 