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
  var days = req.body.days || 30;

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
      var inviteResult = await supabase.auth.admin.inviteUserByEmail(user.email, {
        data: { name: user.name || "", institution: institutionName || "", school: institutionName || "" },
        redirectTo: "https://app.aulaxpro.com/",
      });

      if (inviteResult.error) {
        if (inviteResult.error.message.includes("already been registered") ||
            inviteResult.error.message.includes("already exists")) {
          var listResult = await supabase.auth.admin.listUsers();
          var existingUser = listResult.data && listResult.data.users
            ? listResult.data.users.find(function(u) { return u.email === user.email; })
            : null;
          if (existingUser) {
            await createSubscription(existingUser.id, planId, institutionName, days);
            results.already_exists.push(user.email);
          } else {
            results.failed.push({ email: user.email, error: inviteResult.error.message });
          }
          continue;
        }
        results.failed.push({ email: user.email, error: inviteResult.error.message });
        continue;
      }

      var newUser = inviteResult.data.user;
      await createSubscription(newUser.id, planId, institutionName, days);
      await supabase.from("institutional_users").upsert({
        email: user.email,
        name: user.name || "",
        institution_name: institutionName || "",
        status: "invited",
        invited_at: new Date().toISOString(),
      }, { onConflict: "email" });

      // Agregar colegio a tabla schools
      if (institutionName) {
        try { await supabase.from("schools").upsert({ name: institutionName }, { onConflict: "name" }); } catch(e) {}
      }

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

async function createSubscription(userId, planId, institutionName, days) {
  var endDate = new Date();
  endDate.setDate(endDate.getDate() + (days || 30));

  await supabase.from("subscriptions").upsert({
    user_id: userId,
    plan_id: planId || null,
    type: "institutional",
    status: "active",
    institution_name: institutionName || "",
    max_users: 1,
    current_period_start: new Date().toISOString(),
    current_period_end: endDate.toISOString(),
    is_trial: false,
  }, { onConflict: "user_id" });
}