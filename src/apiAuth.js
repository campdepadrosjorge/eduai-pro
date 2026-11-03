// src/apiAuth.js
// Helper compartido para llamar a los endpoints protegidos del backend
// adjuntando el token del usuario autenticado.
import supabase from "./supabase.js";

export async function authHeaders(extra) {
  var h = Object.assign({ "Content-Type": "application/json" }, extra || {});
  try {
    var s = await supabase.auth.getSession();
    var token = s && s.data && s.data.session ? s.data.session.access_token : null;
    if (token) h["Authorization"] = "Bearer " + token;
  } catch (e) {}
  return h;
}
