// api/_auth.js
// Helpers de autenticación para los endpoints serverless.
// Verifican el token del usuario que llama (header Authorization: Bearer <token>)
// usando la anon key. NUNCA confiar en user_id/isAdmin que lleguen en el body.
import { createClient } from "@supabase/supabase-js";

// Cliente con anon key, solo para validar tokens de usuario.
var authClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// Extrae el token del header Authorization.
function getToken(req) {
  var h = req.headers.authorization || req.headers.Authorization || "";
  if (h.indexOf("Bearer ") === 0) return h.slice(7).trim();
  return null;
}

// Devuelve el usuario autenticado, o null si el token falta/es inválido.
export async function getAuthUser(req) {
  var token = getToken(req);
  if (!token) return null;
  try {
    var r = await authClient.auth.getUser(token);
    if (r.error || !r.data || !r.data.user) return null;
    return r.data.user;
  } catch (e) {
    return null;
  }
}

// ¿Este usuario es el admin del sistema? (compara con ADMIN_EMAIL del backend)
export function isAdminUser(user) {
  if (!user || !user.email) return false;
  var admin = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (!admin) return false;
  return user.email.trim().toLowerCase() === admin;
}

// ¿Este usuario es directivo? (rol en user_metadata)
export function isDirectivo(user) {
  return !!(user && user.user_metadata && user.user_metadata.role === "directivo");
}

// Exige un usuario autenticado. Si no, responde 401 y devuelve null.
export async function requireUser(req, res) {
  var user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "No autenticado" });
    return null;
  }
  return user;
}

// Exige que el usuario sea admin. Si no, responde 401/403 y devuelve null.
export async function requireAdmin(req, res) {
  var user = await getAuthUser(req);
  var hasHeader = !!(req.headers.authorization || req.headers.Authorization);
  var adminEnv = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  console.log("[AUTH-DEBUG] requireAdmin:",
    "hasAuthHeader=" + hasHeader,
    "| tokenValido=" + (!!user),
    "| userEmail=" + (user ? user.email : "null"),
    "| ADMIN_EMAIL_set=" + (!!adminEnv),
    "| ADMIN_EMAIL=" + (adminEnv || "(vacio)"),
    "| match=" + (user ? isAdminUser(user) : false)
  );
  if (!user) {
    res.status(401).json({ error: "No autenticado (token ausente o invalido)" });
    return null;
  }
  if (!isAdminUser(user)) {
    res.status(403).json({ error: "No autorizado (no es admin)" });
    return null;
  }
  return user;
}
