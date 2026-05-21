// api/invite-users.js
// Crea usuarios institucionales y les envia invitaciones por email
 
import { createClient } from "@supabase/supabase-js";
 
var supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
 
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
 
  var users = req.body.users;
  var institutionName = req.body.institution_name;
  var planId = req.body.plan_id;
  var maxUsers = req.body.max_users || 10;
 
  if (!users || !Array.isArray(users) || users.length === 0) {
    return res.status(400).json({ error: "Lista de usuarios requerida" });
  }
 
  if (users.length > maxUsers) {
    return res.status(400).json({ error: "Supera el limite de usuarios del plan (" + maxUsers + ")" });
  }
 
  var results = { created: [], failed: [], already_exists: [] };
 
  for (var i = 0; i < users.length; i++) {
    var user = users[i];
    if (!user.email) continue;
 
    try {
      // Crear usuario con password temporal
      var tempPassword = Math.random().toString(36).slice(-10) + "A1!";
 
      var createResult = await supabase.auth.admin.createUser({
        email: user.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name: user.name || "", institution: institutionName || "" },
      });
 
      if (createResult.error) {
        if (createResult.error.message.includes("already been registered")) {
          results.already_exists.push(user.email);
        } else {
          results.failed.push({ email: user.email, error: createResult.error.message });
        }
        continue;
      }
 
      var newUser = createResult.data.user;
 
      // Crear suscripcion institucional (6 meses)
      var endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6);
 
      await supabase.from("subscriptions").insert({
        user_id: newUser.id,
        plan_id: planId || null,
        type: "institutional",
        status: "active",
        institution_name: institutionName || "",
        max_users: 1,
        current_period_start: new Date().toISOString(),
        current_period_end: endDate.toISOString(),
        is_trial: false,
      });
 
      // Registrar en tabla institutional_users
      await supabase.from("institutional_users").upsert({
        email: user.email,
        name: user.name || "",
        status: "active",
        activated_at: new Date().toISOString(),
      }, { onConflict: "email" });
 
      // Enviar magic link para que el usuario pueda entrar
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: user.email,
        options: { redirect_to: "https://eduai-pro-nine.vercel.app/" },
      });
 
      results.created.push(user.email);
 
    } catch (error) {
      results.failed.push({ email: user.email, error: error.message });
    }
  }
 
  return res.status(200).json({
    success: true,
    created: results.created.length,
    already_exists: results.already_exists.length,
    failed: results.failed.length,
    details: results,
  });
}
 