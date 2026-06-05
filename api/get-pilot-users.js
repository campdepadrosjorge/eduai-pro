import { createClient } from "@supabase/supabase-js";

var supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    var subsResult = await supabase
      .from("subscriptions")
      .select("user_id, status, current_period_end, is_trial, institution_name")
      .eq("status", "active")
      .order("current_period_end", {ascending: false});

    // Deduplicar por user_id, quedarse con la suscripcion que vence mas tarde
    var subsMap = {};
    (subsResult.data || []).forEach(function(sub) {
      if (!subsMap[sub.user_id] || new Date(sub.current_period_end) > new Date(subsMap[sub.user_id].current_period_end)) {
        subsMap[sub.user_id] = sub;
      }
    });
    var subs = Object.values(subsMap);

   var authResult = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (authResult.error) throw new Error("listUsers error: " + authResult.error.message);
    var authUsers = authResult.data ? authResult.data.users : [];

    var merged = subs.map(function(sub) {
      var authUser = authUsers.find(function(u) { return u.id === sub.user_id; });
      var daysLeft = Math.ceil((new Date(sub.current_period_end) - new Date()) / (1000*60*60*24));
      return {
        user_id: sub.user_id,
        email: authUser ? authUser.email : "Desconocido",
        days_left: daysLeft,
        period_end: sub.current_period_end,
        is_trial: sub.is_trial,
        institution: sub.institution_name || "",
      };
    });

    return res.status(200).json({ users: merged });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}