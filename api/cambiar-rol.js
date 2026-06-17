import { createClient } from "@supabase/supabase-js";

var supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  var email = req.body.email;
  var role = req.body.role;

  if (!email) return res.status(400).json({ error: "Email requerido" });
  if (role !== "docente" && role !== "directivo") return res.status(400).json({ error: "Rol inválido" });

  try {
    var listResult = await supabase.auth.admin.listUsers();
    var users = listResult.data && listResult.data.users ? listResult.data.users : [];
    var emailBuscado = email.trim().toLowerCase();
    var user = users.find(function(u){ return u.email && u.email.toLowerCase() === emailBuscado; });

    if (!user) return res.status(404).json({ error: "No se encontró un usuario con ese email" });

    var newMetadata = Object.assign({}, user.user_metadata, { role: role });
    var updateResult = await supabase.auth.admin.updateUserById(user.id, { user_metadata: newMetadata });

    if (updateResult.error) throw new Error(updateResult.error.message);

    return res.status(200).json({ success: true, email: email, role: role });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}