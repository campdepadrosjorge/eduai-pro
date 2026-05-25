import { useState, useEffect, useRef } from "react";
import supabase from "./supabase.js";
import { exportDocx, exportPdf, exportZip } from "./exportUtils.js";
import { generatePptx } from "./pptxUtils.js";

// ── CONSTANTS ────────────────────────────────────────────────────────────────

const NAV = [
  { id:"dashboard",  label:"Inicio",             icon:"ti-layout-dashboard" },
  { id:"generator",  label:"Generador IA",        icon:"ti-bolt" },
  { id:"multimedia", label:"Multimedia",          icon:"ti-photo" },
  { id:"chat",       label:"Chat Docente",        icon:"ti-message" },
  { id:"corrector",  label:"Corrector de TPs",    icon:"ti-checklist" },
  { id:"library",    label:"Biblioteca",          icon:"ti-books" },
  { id:"bank",       label:"Banco de Preguntas",  icon:"ti-database" },
  { id:"publiclib",  label:"Biblioteca Publica",  icon:"ti-world" },
  { id:"pricing",    label:"Planes y Precios",    icon:"ti-credit-card" },
  { id:"admin",      label:"Panel Admin",         icon:"ti-chart-bar" },
];

const GEN_TYPES = [
  { id:"planclase",    label:"Plan de Clase",              icon:"ti-calendar", color:"#1d4ed8" },
  { id:"actividad",   label:"Actividad Didactica",         icon:"ti-target",   color:"#059669" },
  { id:"rubrica",     label:"Rubrica de Evaluacion",       icon:"ti-list-check",color:"#0d9488" },
  { id:"evaluacion",  label:"Evaluacion / Examen",         icon:"ti-writing",  color:"#7c3aed" },
  { id:"material",    label:"Material Didactico",          icon:"ti-book",     color:"#0891b2" },
  { id:"presentacion",label:"Esquema de Presentacion",     icon:"ti-slideshow", color:"#d97706" },
  { id:"guia",        label:"Guia de Estudio",             icon:"ti-map",      color:"#65a30d" },
  { id:"adaptado",    label:"Contenido Adaptado (NEE)",    icon:"ti-heart",    color:"#db2777" },
];

const MM_TYPES = [
  { id:"podcast",             label:"Guion de Podcast",          icon:"ti-microphone", desc:"Episodio educativo completo" },
  { id:"infografia",          label:"Estructura de Infografia",  icon:"ti-chart-bar",  desc:"Layout para Canva" },
  { id:"video_script",        label:"Guion de Video",            icon:"ti-video",      desc:"Con descripcion visual" },
  { id:"presentacion_visual", label:"Presentacion Visual",       icon:"ti-presentation",desc:"Slide por slide" },
  { id:"imagen_ia",           label:"Generador de Imagenes IA",  icon:"ti-photo-ai",   desc:"Imagenes con IA" },
];

const LEVELS = [
  "Inicial","Primario (1-3)","Primario (4-6)",
  "Secundario (1-3)","Secundario (4-6)",
  "Terciario / Universitario","Formacion Docente","Capacitacion Profesional",
];

// ── PROMPTS ──────────────────────────────────────────────────────────────────

function sysGen(type, subject, level, materials) {
  const ctx = "Materia: \"" + subject + "\" | Nivel: " + level + "." + (materials ? "\n\nPrograma:\n" + materials : "");
  const p = {
    planclase:    "Sos un experto en planificacion curricular y didactica. " + ctx,
    actividad:    "Sos un especialista en diseno instruccional y pedagogia activa. " + ctx,
    rubrica:      "Sos un experto en evaluacion educativa y diseno de instrumentos. " + ctx,
    evaluacion:   "Sos un especialista en evaluacion educativa y psicometria. " + ctx,
    material:     "Sos un experto en comunicacion educativa y diseno de contenidos. " + ctx,
    presentacion: "Sos un especialista en comunicacion visual y presentaciones educativas. " + ctx,
    guia:         "Sos un experto en aprendizaje autonomo y metacognicion. " + ctx,
    adaptado:     "Sos un especialista en educacion inclusiva y NEE. " + ctx,
  };
  return (p[type] || ctx) + "\n\nResponde en espanol rioplatense con Markdown (##, ###, **, listas, tablas). Se detallado y aplicable en el aula.";
}

function userGen(type, topic, diff, extra, subject) {
  const e = extra ? "\n\nInstrucciones adicionales: " + extra : "";
  const isMakeCode = topic.toLowerCase().includes("micro") ||
    topic.toLowerCase().includes("makecode") ||
    topic.toLowerCase().includes("bloque") ||
    topic.toLowerCase().includes("programa") ||
    (extra && (extra.toLowerCase().includes("makecode") || extra.toLowerCase().includes("micro"))) ||
    (subject && (
      (subject.name || "").toLowerCase().includes("micro") ||
      (subject.name || "").toLowerCase().includes("robot") ||
      (subject.name || "").toLowerCase().includes("program") ||
      (subject.name || "").toLowerCase().includes("tecnolog")
    ));

  const makecodeExtra = isMakeCode ? "\n\nIMPORTANTE: Al final de la actividad agrega una seccion '## Codigo MakeCode' con el codigo JavaScript completo para micro:bit que los alumnos deben programar. El codigo debe estar en un bloque ```javascript y ser funcional en MakeCode." : "";

  const m = {
    planclase:   "Plan de clase completo sobre: \"" + topic + "\" | Dificultad: " + diff + "\n\nIncluí: datos del plan, 3-4 objetivos (verbos Bloom), contenidos conceptuales/procedimentales/actitudinales, recursos, secuencia didactica detallada (inicio/desarrollo/cierre con tiempos y roles), evaluacion formativa, tarea opcional, adaptaciones." + e,
    actividad:   "Actividad didactica sobre: \"" + topic + "\" | Dificultad: " + diff + "\n\nIncluí: titulo, objetivos, duracion, materiales, desarrollo completo (inicio/desarrollo/cierre), consignas exactas para alumnos, criterios de evaluacion, variantes." + makecodeExtra + e,
    rubrica:     "Rubrica analitica para evaluar: \"" + topic + "\" | Dificultad: " + diff + "\n\nIncluí: objetivo, tabla con 5-6 criterios, 4 niveles (Excelente/Satisfactorio/En proceso/Inicial), descriptores especificos y observables, puntaje, escala final, notas para el docente." + e,
    evaluacion:  "Evaluacion completa sobre: \"" + topic + "\" | Dificultad: " + diff + "\n\nIncluí: encabezado formal, Seccion 1 (5 opcion multiple), Seccion 2 (4 V/F con justificacion), Seccion 3 (3 respuesta breve), Seccion 4 (1 desarrollo integrador), puntaje por seccion, clave de respuestas." + e,
    material:    "Material didactico sobre: \"" + topic + "\" | Dificultad: " + diff + "\n\nIncluí: titulo, introduccion motivadora, desarrollo por subtemas, definiciones clave, ejemplos reales, actividades integradas, sintesis, glosario (8-10 terminos), recursos adicionales." + e,
  presentacion:"Esquema de presentacion sobre: \"" + topic + "\" | Dificultad: " + diff + "\n\nGenera entre 12 y 15 diapositivas usando EXACTAMENTE este formato para cada una:\n\n## SLIDE [N]: [Titulo de la diapositiva]\n[Bullets de contenido, uno por linea comenzando con -]\nNOTAS: [Lo que dice el presentador, 2-3 oraciones]\n\n---\n\nRepeti este bloque para cada diapositiva. No uses otro formato." + e,
    guia:        "Guia de estudio sobre: \"" + topic + "\" | Dificultad: " + diff + "\n\nIncluí: objetivos, mapa de conceptos, preguntas orientadoras, actividades de lectura activa, autoevaluacion con respuestas, organizadores graficos, estrategias de repaso, lista Ya puedo..., recursos." + e,
    adaptado:    "Contenido adaptado (NEE) sobre: \"" + topic + "\" | Dificultad base: " + diff + "\n\n4 versiones: 1) Dislexia, 2) TDAH, 3) Discapacidad Visual, 4) Altas Capacidades. Para cada version: instrucciones paso a paso, estrategias docentes, indicadores de logro adaptados." + e,
  };
  return m[type] || "Contenido educativo sobre \"" + topic + "\". Dificultad: " + diff + "." + e;
}

function userMM(type, topic, extra) {
  const e = extra ? "\n\nInstrucciones: " + extra : "";
  const m = {
    podcast:             "Guion de podcast educativo sobre \"" + topic + "\": titulo, duracion, [INTRO] texto completo, [BLOQUE 1] contexto 3-4min, [BLOQUE 2] desarrollo 8-10min con subtemas, [BLOQUE 3] ejemplos, [ACTIVIDAD] reflexiva, [CIERRE] sintesis+CTA, notas de produccion." + e,
    infografia:          "Estructura de infografia educativa sobre \"" + topic + "\": titulo impactante, tipo, 5+ secciones (titulo+contenido+icono+visualizacion), paleta HEX, tipografias, flujo de lectura, instrucciones para Canva." + e,
    video_script:        "Guion de video sobre \"" + topic + "\" en formato [IMAGEN][VOZ][TEXTO EN PANTALLA]: duracion, gancho (10 seg), pregunta disparadora, 3-4 bloques con tiempos, demostraciones, sintesis, CTA." + e,
    presentacion_visual: "Guia visual de presentacion sobre \"" + topic + "\" (15 slides): N, titulo, layout, descripcion visual, texto exacto (max 40 palabras), animaciones, guion del presentador (60-90 palabras). Paleta 5 colores HEX, tipografias, tips." + e,
  };
  return m[type] || "Contenido multimedia educativo sobre \"" + topic + "\"." + e;
}

// ── API ───────────────────────────────────────────────────────────────────────

async function callClaude(system, messages, maxTokens) {
  if (!maxTokens) maxTokens = 4000;
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages, maxTokens }),
  });
  if (!res.ok) {
    var err = {};
    try { err = await res.json(); } catch {}
    throw new Error(err.error || "Error " + res.status);
  }
  const data = await res.json();
  return data.content.filter(function(b) { return b.type === "text"; }).map(function(b) { return b.text; }).join("");
}

// ── SUPABASE DATA LAYER ───────────────────────────────────────────────────────

async function dbLoadPublicLib() {
  const result = await supabase.from("public_library").select("*").order("created_at", { ascending: false });
  if (result.error) throw result.error;
  return result.data || [];
}

async function dbAddPublicItem(userId, userName, item) {
  const result = await supabase.from("public_library").insert({
    user_id: userId, user_name: userName,
    type: item.type, type_name: item.type_name,
    topic: item.topic, subject_name: item.subject_name || "",
    level: item.level || "", content: item.content,
  });
  if (result.error) throw result.error;
}

async function dbDelPublicItem(id) {
  const result = await supabase.from("public_library").delete().eq("id", id);
  if (result.error) throw result.error;
}

async function dbLoadSubjects(userId) {
  const result = await supabase.from("subjects").select("*").eq("user_id", userId).order("created_at");
  if (result.error) throw result.error;
  return result.data || [];
}

async function dbAddSubject(userId, form) {
  const result = await supabase.from("subjects").insert({ user_id: userId, ...form }).select().single();
  if (result.error) throw result.error;
  return result.data;
}

async function dbDelSubject(id) {
  const result = await supabase.from("subjects").delete().eq("id", id);
  if (result.error) throw result.error;
}

async function dbLoadLibrary(userId) {
  const result = await supabase.from("library_items").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (result.error) throw result.error;
  return result.data || [];
}

async function dbAddLibraryItem(userId, item) {
  const result = await supabase.from("library_items").insert({ user_id: userId, ...item });
  if (result.error) throw result.error;
}

async function dbDelLibraryItem(id) {
  const result = await supabase.from("library_items").delete().eq("id", id);
  if (result.error) throw result.error;
}

async function dbLoadBank(userId) {
  const result = await supabase.from("question_bank").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (result.error) throw result.error;
  return result.data || [];
}

async function dbAddBankItem(userId, item) {
  const result = await supabase.from("question_bank").insert({ user_id: userId, ...item });
  if (result.error) throw result.error;
}
async function dbLogUsage(userId, userEmail, type, typeName, subjectName, tokensInput, tokensOutput, isImage) {
  try {
    await supabase.from("usage_log").insert({
      user_id: userId,
      user_email: userEmail,
      type: type,
      type_name: typeName,
      subject_name: subjectName || "",
      tokens_input: tokensInput || 0,
      tokens_output: tokensOutput || 0,
      is_image: isImage || false,
    });
  } catch {}
}
async function dbCreateTrial(userId) {
  var endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);
  var result = await supabase.from("subscriptions").insert({
    user_id: userId,
    type: "individual",
    status: "active",
    is_trial: true,
    max_users: 1,
    current_period_start: new Date().toISOString(),
    current_period_end: endDate.toISOString(),
  });
  return result;
}
async function dbCheckSubscription(userId) {
  var result = await supabase.from("subscriptions")
    .select("id, status, current_period_end, plan_id, is_trial")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1);
  if (result.error || !result.data || result.data.length === 0) return null;
  var sub = result.data[0];
  if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) return null;
  return sub;
}
async function dbDelBankItem(id) {
  const result = await supabase.from("question_bank").delete().eq("id", id);
  if (result.error) throw result.error;
}

// ── DESIGN ────────────────────────────────────────────────────────────────────

const C = {
  bg:"#f5f5f0", surf:"#ffffff", card:"#ffffff", border:"#e0ddd6",
  accent:"#0d9488", accentBg:"#f0fdfa",
  text:"#1c1917", textMuted:"#6b7280", textDim:"#9ca3af",
  blue:"#1d4ed8", green:"#059669", purple:"#7c3aed", red:"#dc2626",
};

const inp = { background:"#ffffff", border:"1px solid #e0ddd6", borderRadius:8, padding:"9px 13px", color:C.text, fontSize:14, width:"100%", outline:"none", fontFamily:"inherit" };
const sel = { background:"#ffffff", border:"1px solid #e0ddd6", borderRadius:8, padding:"9px 13px", color:C.text, fontSize:13, outline:"none", fontFamily:"inherit" };
const lbl = { fontSize:11, color:C.textMuted, marginBottom:5, display:"block", fontWeight:600, letterSpacing:.5 };
const card = { background:"#ffffff", border:"1px solid #e0ddd6", borderRadius:12, padding:"18px 20px", marginBottom:16 };

function Btn({ children, onClick, v, disabled, st }) {
  if (!v) v = "primary";
  if (!st) st = {};
  if (!disabled) disabled = false;
  var base = { padding: v === "sm" ? "5px 11px" : "9px 18px", borderRadius:8, cursor:disabled?"not-allowed":"pointer", fontWeight:600, fontSize: v === "sm" ? 12 : 13, fontFamily:"inherit", opacity:disabled?.45:1, transition:"opacity .15s" };
  var vs = {
    primary:   { background:C.accent, color:"#000", border:"none" },
    secondary: { background:C.card, color:C.text, border:"1px solid #243350" },
    ghost:     { background:"transparent", color:C.text, border:"1px solid #243350" },
    danger:    { background:"#7f1d1d", color:"#fca5a5", border:"none" },
    accent:    { background:"transparent", color:C.accent, border:"1px solid #f59e0b" },
    green:     { background:"transparent", color:C.green, border:"1px solid #10b981" },
  };
  return <button style={Object.assign({}, base, vs[v] || vs.primary, st)} onClick={disabled ? undefined : onClick}>{children}</button>;
}

function Spin() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"44px 0", gap:12 }}>
      <div style={{ width:34, height:34, border:"3px solid #243350", borderTop:"3px solid #f59e0b", borderRadius:"50%", animation:"spin 1s linear infinite" }} />
      <div style={{ color:C.textMuted, fontSize:13 }}>Claude esta generando el contenido...</div>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}

function Tag({ children, color }) {
  return <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:color+"25", color:color, letterSpacing:.3 }}>{children}</span>;
}

function MDView({ text, maxH }) {
  if (!maxH) maxH = 560;
  var css = ".md h1{color:#0f766e;font-size:1.28em;font-weight:700;margin:1.2em 0 .4em;border-bottom:1px solid #e0ddd6;padding-bottom:.2em}" +
    ".md h2{color:#0d9488;font-size:1.1em;font-weight:700;margin:1.1em 0 .35em;border-bottom:1px solid #f0fdfa;padding-bottom:.15em}" +
    ".md h3{color:#0f766e;font-size:1em;font-weight:600;margin:.95em 0 .28em}" +
    ".md h4{color:#374151;font-size:.93em;font-weight:600;margin:.85em 0 .22em}" +
    ".md strong{color:#1c1917;font-weight:700}.md em{color:#0f766e}" +
    ".md code{background:#f0fdfa;padding:2px 6px;border-radius:4px;font-size:.82em;font-family:monospace;color:#0f766e}" +
    ".md ul{margin:.35em 0 .35em 1.3em;list-style:disc}.md ol{margin:.35em 0 .35em 1.3em;list-style:decimal}" +
    ".md li{margin:.22em 0;color:#374151;line-height:1.6}.md p{color:#374151;margin:.45em 0;line-height:1.7}" +
    ".md hr{border:none;border-top:1px solid #e0ddd6;margin:.9em 0}" +
    ".md table{border-collapse:collapse;width:100%;margin:.7em 0;font-size:.87em}" +
    ".md th{background:#f0fdfa;color:#0f766e;padding:6px 10px;border:1px solid #e0ddd6;font-weight:600;text-align:left}" +
    ".md td{padding:5px 10px;border:1px solid #e0ddd6;color:#374151;vertical-align:top}" +
    ".md tr:nth-child(even) td{background:#f9f9f7}" +
    ".md blockquote{border-left:3px solid #0d9488;margin:.5em 0;padding:.35em .75em;background:#f0fdfa;color:#6b7280;border-radius:0 6px 6px 0}" +
    ".md pre{background:#f5f5f0;padding:11px;border-radius:7px;overflow-x:auto;font-family:monospace;font-size:.82em;color:#0f766e;margin:.5em 0}";

  var h = text
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/```[\w]*\n([\s\S]*?)```/g, function(_, c) { return "<pre>" + c + "</pre>"; })
    .replace(/\*\*\*(.+?)\*\*\*/g,"<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*([^\n*]+?)\*/g,"<em>$1</em>")
    .replace(/`([^`]+)`/g,"<code>$1</code>")
    .replace(/^#### (.+)$/gm,"<h4>$1</h4>")
    .replace(/^### (.+)$/gm,"<h3>$1</h3>")
    .replace(/^## (.+)$/gm,"<h2>$1</h2>")
    .replace(/^# (.+)$/gm,"<h1>$1</h1>")
    .replace(/^---$/gm,"<hr/>")
    .replace(/^> (.+)$/gm,"<blockquote>$1</blockquote>")
    .replace(/^- (.+)$/gm,"<li>$1</li>")
    .replace(/^\* (.+)$/gm,"<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm,"<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, function(m) { return "<ul>" + m + "</ul>"; })
    .replace(/\n\n+/g,"</p><p>").replace(/\n/g,"<br/>");

  return (
    <div style={{ background:"#f9f9f7", border:"1px solid #e0ddd6", borderRadius:8, padding:"15px 19px", maxHeight:maxH, overflow:"auto", lineHeight:1.75, fontSize:14, fontFamily:"Arial,sans-serif" }}>
      <style>{css}</style>
      <div className="md"><p dangerouslySetInnerHTML={{ __html:h }}/></div>
    </div>
  );
}

function AdminPanel({ authUser, supabaseClient }) {
  var isAdmin = authUser && authUser.email === import.meta.env.VITE_ADMIN_EMAIL;
  var [stats, setStats] = useState(null);
  var [statsLoading, setStatsLoading] = useState(true);
    var [instName, setInstName] = useState("");
  var [instPlanId, setInstPlanId] = useState("bcdbe285413b4acbbd187fc2fe6d52dc");
  var [instMaxUsers, setInstMaxUsers] = useState(10);
  var [instFile, setInstFile] = useState(null);
  var [instLoading, setInstLoading] = useState(false);
  var [instResult, setInstResult] = useState(null);
 var [institutions, setInstitutions] = useState([]);
  var [instUsers, setInstUsers] = useState([]);
  var [instUsersLoading, setInstUsersLoading] = useState(false);
  var [selectedInst, setSelectedInst] = useState("");

  useEffect(function() {
    if (!isAdmin) return;
 supabaseClient.from("usage_log").select("*").order("created_at", { ascending: false }).limit(500)
      .then(function(result) { setStats(result.data || []); setStatsLoading(false); });
    supabaseClient.from("subscriptions").select("institution_name").eq("type", "institutional").neq("institution_name", "")
      .then(function(result) {
        if (result.data) {
          var unique = [];
          result.data.forEach(function(s) { if (s.institution_name && !unique.includes(s.institution_name)) unique.push(s.institution_name); });
          setInstitutions(unique);
        }
      });
  }, [isAdmin]);

  if (!isAdmin) return (
    <div style={{ background:C.card, border:"1px solid #243350", borderRadius:12, padding:"52px 24px", textAlign:"center", color:C.textDim }}>
      <div style={{ marginBottom:10 }}><i className="ti ti-lock" style={{ fontSize:36, color:C.textDim }} /></div>
      <p>Acceso restringido al administrador.</p>
    </div>
  );

  if (statsLoading || !stats) return <div style={{ textAlign:"center", padding:"40px 0" }}><Spin /></div>;

  var totalGen = stats.filter(function(s) { return !s.is_image; }).length;
  var totalImg = stats.filter(function(s) { return s.is_image; }).length;
  var totalTokIn = stats.reduce(function(a, s) { return a + (s.tokens_input || 0); }, 0);
  var totalTokOut = stats.reduce(function(a, s) { return a + (s.tokens_output || 0); }, 0);
  var costText = ((totalTokIn * 0.000003) + (totalTokOut * 0.000015) + (totalImg * 0.07)).toFixed(2);

  var userMap = {};
  stats.forEach(function(s) {
    if (!userMap[s.user_email]) userMap[s.user_email] = { email: s.user_email, gens: 0, imgs: 0 };
    if (s.is_image) userMap[s.user_email].imgs++;
    else userMap[s.user_email].gens++;
  });
  var users = Object.values(userMap).sort(function(a, b) { return (b.gens + b.imgs) - (a.gens + a.imgs); });

  var typeMap = {};
  stats.filter(function(s) { return !s.is_image; }).forEach(function(s) {
    typeMap[s.type_name] = (typeMap[s.type_name] || 0) + 1;
  });
  var types = Object.entries(typeMap).sort(function(a, b) { return b[1] - a[1]; });

  async function loadInstUsers(institutionName) {
    setInstUsersLoading(true);
    var result = await supabaseClient.from("subscriptions")
      .select("user_id, status, institution_name, current_period_end, is_trial")
      .eq("institution_name", institutionName)
      .eq("type", "institutional");
    setInstUsers(result.data || []);
    setInstUsersLoading(false);
  }

  async function toggleUserStatus(userId, currentStatus) {
    var newStatus = currentStatus === "active" ? "inactive" : "active";
    await supabaseClient.from("subscriptions")
      .update({ status: newStatus })
      .eq("user_id", userId);
    loadInstUsers(selectedInst);
  }
  async function processExcel() {
    if (!instFile || !instName) return;
    setInstLoading(true); setInstResult(null);
    try {
      var XLSX = await import("xlsx");
      var buffer = await instFile.arrayBuffer();
      var workbook = XLSX.read(buffer, { type: "array" });
      var sheet = workbook.Sheets[workbook.SheetNames[0]];
      var rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      var users = [];
      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        if (row[0]) users.push({ email: String(row[0]).trim(), name: row[1] ? String(row[1]).trim() : "" });
      }
      var res = await fetch("/api/invite-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users, institution_name: instName, plan_id: instPlanId, max_users: instMaxUsers }),
      });
      var data = await res.json();
      setInstResult(data);
    } catch(e) {
      setInstResult({ error: e.message });
    }
    setInstLoading(false);
  }

  return (
    <div>
      <h2 style={{ fontSize:19, fontWeight:700, color:C.text, marginBottom:20, display:"flex", alignItems:"center", gap:8 }}><i className="ti ti-chart-bar" style={{fontSize:18, color:C.accent}} />Panel de Administrador</h2>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[
          { l:"Generaciones", v:totalGen, i:"ti-bolt", c:"#f59e0b" },
          { l:"Imagenes", v:totalImg, i:"ti-photo", c:"#7c3aed" },
          { l:"Usuarios activos", v:users.length, i:"ti-users", c:"#3b82f6" },
          { l:"Costo estimado", v:"$" + costText, i:"ti-coin", c:"#10b981" },
        ].map(function(x) {
          return (
            <div key={x.l} style={{ background:C.card, border:"1px solid #243350", borderRadius:12, padding:"15px 18px" }}>
              <i className={"ti " + x.i} style={{ fontSize:22, marginBottom:8, color:x.c, display:"block" }} />
              <div style={{ fontSize:26, fontWeight:700, color:x.c }}>{x.v}</div>
              <div style={{ fontSize:12, color:C.textDim, marginTop:2 }}>{x.l}</div>
            </div>
          );
        })}
      </div>
      <div style={{ background:C.card, border:"1px solid #243350", borderRadius:12, padding:"18px 20px", marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}><i className="ti ti-school" style={{fontSize:16, color:C.accent}} />Carga Institucional</div>
        <p style={{ fontSize:13, color:C.textMuted, marginBottom:16 }}>Subí un Excel con columna A = Email y columna B = Nombre. El sistema crea las cuentas y activa las suscripciones automaticamente.</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          <div>
            <label style={{ fontSize:11, color:C.textMuted, marginBottom:5, display:"block", fontWeight:700 }}>NOMBRE DEL COLEGIO *</label>
            <input style={{ background:C.bg, border:"1px solid #243350", borderRadius:8, padding:"9px 13px", color:C.text, fontSize:14, width:"100%", outline:"none", fontFamily:"inherit" }}
              value={instName} onChange={function(e) { setInstName(e.target.value); }} placeholder="Ej: Colegio San Martin" />
          </div>
          <div>
            <label style={{ fontSize:11, color:C.textMuted, marginBottom:5, display:"block", fontWeight:700 }}>MAX USUARIOS</label>
            <input style={{ background:C.bg, border:"1px solid #243350", borderRadius:8, padding:"9px 13px", color:C.text, fontSize:14, width:"100%", outline:"none", fontFamily:"inherit" }}
              type="number" value={instMaxUsers} onChange={function(e) { setInstMaxUsers(parseInt(e.target.value)); }} />
          </div>
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, color:C.textMuted, marginBottom:5, display:"block", fontWeight:700 }}>ARCHIVO EXCEL (.xlsx)</label>
          <input type="file" accept=".xlsx,.xls,.csv" style={{ color:C.text, fontSize:13 }}
            onChange={function(e) { setInstFile(e.target.files[0]); }} />
        </div>
        <button style={{ background:"#f59e0b", border:"none", borderRadius:8, padding:"9px 18px", cursor:instLoading||!instFile||!instName?"not-allowed":"pointer", fontWeight:600, fontSize:13, fontFamily:"inherit", opacity:instLoading||!instFile||!instName?.5:1 }}
          onClick={processExcel} disabled={instLoading||!instFile||!instName}>
          {instLoading ? "Procesando..." : <><i className="ti ti-upload" style={{fontSize:13,marginRight:4}} />Cargar usuarios y activar suscripciones</>}
        </button>
        {instResult && (
          <div style={{ marginTop:14, padding:"12px 16px", background:C.bg, borderRadius:8, fontSize:13 }}>
            {instResult.error
              ? <span style={{ color:"#f87171" }}>Error: {instResult.error}</span>
              : <div>
                  <div style={{ color:"#10b981", marginBottom:4 }}>Creados: {instResult.created}</div>
                  <div style={{ color:C.textMuted, marginBottom:4 }}>Ya existian: {instResult.already_exists}</div>
                  {instResult.failed > 0 && <div style={{ color:"#f87171" }}>Fallidos: {instResult.failed}</div>}
                </div>
            }
          </div>
        )}
      </div>
      <div style={{ background:C.card, border:"1px solid #243350", borderRadius:12, padding:"18px 20px", marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:12, display:"flex", alignItems:"center", gap:8 }}><i className="ti ti-users" style={{fontSize:16, color:C.accent}} />Gestión de Usuarios Institucionales</div>
        <div style={{ display:"flex", gap:10, marginBottom:14 }}>
          <select style={{ background:C.bg, border:"1px solid #243350", borderRadius:8, padding:"9px 13px", color:C.text, fontSize:14, flex:1, outline:"none", fontFamily:"inherit" }}
            value={selectedInst} onChange={function(e) { setSelectedInst(e.target.value); }}>
            <option value="">-- Seleccionar colegio --</option>
            {institutions.map(function(inst) {
              return <option key={inst} value={inst}>{inst}</option>;
            })}
          </select>
          <button style={{ background:"#f59e0b", border:"none", borderRadius:8, padding:"9px 18px", cursor:"pointer", fontWeight:600, fontSize:13, fontFamily:"inherit" }}
            onClick={function() { if (selectedInst) loadInstUsers(selectedInst); }}>
            Buscar
          </button>
        </div>
        {instUsersLoading && <div style={{ color:C.textMuted, fontSize:13 }}>Cargando...</div>}
        {instUsers.length > 0 && (
          <div>
            <div style={{ fontSize:12, color:C.textMuted, marginBottom:10 }}>{instUsers.length + " usuarios encontrados"}</div>
            {instUsers.map(function(u) {
              return (
                <div key={u.user_id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #243350" }}>
                  <div>
                    <div style={{ fontSize:13, color:C.text }}>{u.user_id.slice(0, 8) + "..."}</div>
                    <div style={{ fontSize:11, color:C.textMuted }}>{"Vence: " + new Date(u.current_period_end).toLocaleDateString("es-AR")}</div>
                  </div>
                  <button style={{ padding:"5px 14px", borderRadius:6, border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:600, fontSize:12, background:u.status === "active" ? "#7f1d1d" : "#10b981", color:u.status === "active" ? "#fca5a5" : "#000" }}
                    onClick={function() { toggleUserStatus(u.user_id, u.status); }}>
                    {u.status === "active" ? "Desactivar" : "Activar"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {!instUsersLoading && instUsers.length === 0 && selectedInst && (
          <div style={{ color:C.textDim, fontSize:13 }}>No se encontraron usuarios para ese colegio.</div>
        )}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <div style={{ background:C.card, border:"1px solid #243350", borderRadius:12, padding:"18px 20px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.textMuted, marginBottom:14 }}>USUARIOS MAS ACTIVOS</div>
          {!users.length ? <p style={{ color:C.textDim, fontSize:13 }}>Sin datos aun.</p> : users.slice(0, 10).map(function(u) {
            return (
              <div key={u.email} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #243350" }}>
                <div style={{ fontSize:13, color:C.text }}>{u.email.split("@")[0]}</div>
                <div style={{ display:"flex", gap:12 }}>
                  <span style={{ fontSize:12, color:"#f59e0b" }}>{u.gens} gen</span>
                  <span style={{ fontSize:12, color:"#a78bfa" }}>{u.imgs} img</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ background:C.card, border:"1px solid #243350", borderRadius:12, padding:"18px 20px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.textMuted, marginBottom:14 }}>CONTENIDO MAS GENERADO</div>
          {!types.length ? <p style={{ color:C.textDim, fontSize:13 }}>Sin datos aun.</p> : types.slice(0, 8).map(function(t) {
            var pct = totalGen > 0 ? Math.round((t[1] / totalGen) * 100) : 0;
            return (
              <div key={t[0]} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:13, color:C.text }}>{t[0]}</span>
                  <span style={{ fontSize:12, color:C.textMuted }}>{t[1]} ({pct}%)</span>
                </div>
                <div style={{ background:C.border, borderRadius:4, height:6 }}>
                  <div style={{ background:"#f59e0b", borderRadius:4, height:6, width:pct + "%" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ background:C.card, border:"1px solid #243350", borderRadius:12, padding:"18px 20px" }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.textMuted, marginBottom:14 }}>ULTIMAS GENERACIONES</div>
        {!stats.length ? <p style={{ color:C.textDim, fontSize:13 }}>Sin datos aun.</p> : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:"1px solid #243350" }}>
                  {["Usuario","Tipo","Materia","Tokens","Fecha"].map(function(h) {
                    return <th key={h} style={{ textAlign:"left", padding:"6px 10px", color:C.textMuted, fontWeight:600 }}>{h}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {stats.slice(0, 20).map(function(s) {
                  return (
                    <tr key={s.id} style={{ borderBottom:"1px solid #1a2640" }}>
                      <td style={{ padding:"6px 10px", color:C.textMuted }}>{s.user_email.split("@")[0]}</td>
                      <td style={{ padding:"6px 10px", color:C.text }}>{s.type_name}</td>
                      <td style={{ padding:"6px 10px", color:C.textDim }}>{s.subject_name || "—"}</td>
                      <td style={{ padding:"6px 10px", color:"#f59e0b" }}>{s.is_image ? "imagen" : (s.tokens_input + s.tokens_output)}</td>
                      <td style={{ padding:"6px 10px", color:C.textDim }}>{new Date(s.created_at).toLocaleDateString("es-AR")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── AUTH SCREEN ───────────────────────────────────────────────────────────────
function PricingPanel({ authUser }) {
  var [loading, setLoading] = useState(null);
  var [error, setError] = useState("");

  var plans = [
    {
      id: "98238f5797f94e58b94d51aa08f63fad",
      name: "Individual Mensual",
      price: "$12.000",
      period: "por mes",
      users: 1,
      color: "#3b82f6",
      features: ["Generador IA (8 tipos)", "Multimedia + Imagenes", "Chat Docente", "Corrector de TPs", "Exportacion Word y PDF", "Biblioteca personal"],
    },
    {
      id: "55095e9d02bb469ba4aef78826676787",
      name: "Individual Anual",
      price: "$102.000",
      period: "por año",
      badge: "Ahorra 15%",
      users: 1,
      color: "#f59e0b",
      features: ["Todo Individual", "2 meses gratis", "Soporte prioritario"],
    },
    {
      id: "bcdbe285413b4acbbd187fc2fe6d52dc",
      name: "Institucional Basico",
      price: "$100.000",
      period: "por mes",
      users: 10,
      color: "#10b981",
      features: ["Hasta 10 docentes", "Biblioteca publica compartida", "Panel de uso institucional", "Soporte dedicado"],
    },
    {
      id: "e01bfd16f46c4d0db1a8aa56afc837d7",
      name: "Institucional Pro",
      price: "$255.000",
      period: "por mes",
      users: 30,
      color: "#a78bfa",
      features: ["Hasta 30 docentes", "Todo Institucional Basico", "Carga masiva de usuarios", "Reportes de uso detallados"],
    },
  ];

  async function subscribe(plan) {
    if (!authUser) { setError("Tenes que iniciar sesion para suscribirte."); return; }
    setLoading(plan.id); setError("");
    try {
      var res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: plan.id,
          user_email: authUser.email,
          user_name: (authUser.user_metadata && authUser.user_metadata.name) || "",
          user_id: authUser.id,
        }),
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.open(data.init_point, "_blank");
    } catch(e) {
      setError("Error: " + e.message);
    }
    setLoading(null);
  }

  return (
    <div>
      <div style={{ textAlign:"center", marginBottom:32 }}>
        <h2 style={{ fontSize:26, fontWeight:700, color:C.text, marginBottom:8 }}>Planes y Precios</h2>
        <p style={{ color:C.textMuted, fontSize:15 }}>Elegí el plan que mejor se adapta a tus necesidades</p>
      </div>
      {error && <div style={{ background:"#1a0a0a", border:"1px solid #f87171", borderRadius:8, padding:"10px 16px", marginBottom:20, color:"#f87171", fontSize:13 }}>{error}</div>}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:16 }}>
        {plans.map(function(plan) {
          return (
            <div key={plan.id} style={{ background:C.card, border:"2px solid " + plan.color + "40", borderRadius:14, padding:24, display:"flex", flexDirection:"column" }}>
              {plan.badge && (
                <div style={{ background:plan.color, color:"#000", fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, display:"inline-block", marginBottom:12, alignSelf:"flex-start" }}>{plan.badge}</div>
              )}
              <div style={{ fontSize:17, fontWeight:700, color:C.text, marginBottom:4 }}>{plan.name}</div>
              <div style={{ fontSize:11, color:C.textMuted, marginBottom:16 }}>{"Hasta " + plan.users + (plan.users === 1 ? " usuario" : " usuarios")}</div>
              <div style={{ marginBottom:20 }}>
                <span style={{ fontSize:28, fontWeight:700, color:plan.color }}>{plan.price}</span>
                <span style={{ fontSize:13, color:C.textMuted, marginLeft:6 }}>{plan.period}</span>
              </div>
              <div style={{ flex:1, marginBottom:20 }}>
                {plan.features.map(function(f) {
                  return (
                    <div key={f} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                      <i className="ti ti-check" style={{ color:plan.color, fontSize:14 }} />
                      <span style={{ fontSize:13, color:"#cbd5e1" }}>{f}</span>
                    </div>
                  );
                })}
              </div>
              <button style={{ width:"100%", padding:"11px 0", borderRadius:8, border:"none", cursor:loading===plan.id?"not-allowed":"pointer", fontWeight:700, fontSize:14, fontFamily:"inherit", background:plan.color, color:"#000", opacity:loading===plan.id?.7:1 }}
                onClick={function() { subscribe(plan); }} disabled={loading===plan.id}>
                {loading===plan.id ? "Procesando..." : <><i className="ti ti-credit-card" style={{fontSize:13,marginRight:4}} />Suscribirme</>}
              </button>
            </div>
          );
        })}
</div>
      <p style={{ textAlign:"center", color:C.textDim, fontSize:12, marginTop:24 }}>Pagos procesados de forma segura por MercadoPago · Podes cancelar en cualquier momento</p>
    </div>
  );
}
function AuthScreen({ onAuth }) {
  var [mode, setMode]         = useState("login");
  var [email, setEmail]       = useState("");
  var [password, setPass]     = useState("");
  var [name, setName]         = useState("");
  var [loading, setLoading]   = useState(false);
  var [error, setError]       = useState("");
  var [confirmed, setConfirmed] = useState(false);

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true); setError("");
    var result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) {
      setError(result.error.message.includes("Email not confirmed") ? "Todavia no confirmaste tu email. Revisa tu bandeja." : "Email o contrasena incorrectos.");
    } else {
      onAuth(result.data.user);
    }
    setLoading(false);
  }

  async function handleRegister() {
    if (!email || !password || !name) return;
    setLoading(true); setError("");
    var result = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (result.error) { setError(result.error.message); }
    else if (result.data.session) { onAuth(result.data.user); }
    else { setConfirmed(true); }
    setLoading(false);
  }

  if (confirmed) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:C.bg }}>
      <div style={{ width:420, textAlign:"center" }}>
        <div style={{ marginBottom:16 }}><i className="ti ti-mail" style={{ fontSize:52, color:C.accent }} /></div>
        <h2 style={{ color:C.accent, fontSize:24, fontWeight:700, margin:"0 0 12px" }}>Revisa tu email</h2>
        <p style={{ color:C.textMuted, fontSize:15, marginBottom:8 }}>Te enviamos un link de confirmacion a {email}</p>
        <p style={{ color:C.textDim, fontSize:13, marginBottom:32 }}>Una vez que confirmes, volvé e iniciá sesion.</p>
        <div style={card}>
          <button style={{ background:"transparent", border:"none", cursor:"pointer", color:C.accent, fontSize:14, fontFamily:"inherit", fontWeight:600 }}
            onClick={function() { setConfirmed(false); setMode("login"); }}>
            Ir a iniciar sesion
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:C.bg }}>
      <div style={{ width:420 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ marginBottom:12 }}><i className="ti ti-school" style={{ fontSize:52, color:C.accent }} /></div>
          <h1 style={{ color:C.accent, fontSize:30, fontWeight:700, margin:"0 0 6px" }}>EduAI Pro</h1>
          <p style={{ color:C.textMuted, fontSize:15 }}>Tu asistente docente impulsado por Claude AI</p>
        </div>
        <div style={card}>
          <div style={{ display:"flex", gap:4, marginBottom:22, background:C.bg, borderRadius:8, padding:4 }}>
            {[{id:"login",label:"Iniciar sesion"},{id:"register",label:"Registrarse"}].map(function(t) {
              return (
                <button key={t.id} style={{ flex:1, padding:"7px 0", borderRadius:6, border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:600, fontSize:13, background:mode===t.id?C.card:"transparent", color:mode===t.id?C.text:C.textDim }}
                  onClick={function() { setMode(t.id); setError(""); }}>
                  {t.label}
                </button>
              );
            })}
          </div>
          {mode === "register" && (
            <div>
              <label style={lbl}>NOMBRE</label>
              <input style={Object.assign({}, inp, { marginBottom:12 })} value={name} onChange={function(e) { setName(e.target.value); }} placeholder="Prof. Garcia" />
            </div>
          )}
          <label style={lbl}>EMAIL</label>
          <input style={Object.assign({}, inp, { marginBottom:12 })} type="email" value={email} onChange={function(e) { setEmail(e.target.value); }} placeholder="docente@escuela.edu.ar" />
          <label style={lbl}>CONTRASENA</label>
          <input style={Object.assign({}, inp, { marginBottom:20 })} type="password" value={password} onChange={function(e) { setPass(e.target.value); }}
            onKeyDown={function(e) { if (e.key === "Enter") mode === "login" ? handleLogin() : handleRegister(); }}
            placeholder="Minimo 6 caracteres" />
          {error && <div style={{ color:"#f87171", fontSize:13, background:"#1a0a0a", padding:"9px 13px", borderRadius:7, marginBottom:14 }}>{error}</div>}
          <Btn st={{ width:"100%", padding:"11px 20px", fontSize:14 }} disabled={loading} onClick={mode === "login" ? handleLogin : handleRegister}>
            {loading ? "Procesando..." : mode === "login" ? "Entrar" : "Crear cuenta"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────

export default function EduAIPro() {
  var [authUser, setAuthUser]   = useState(null);
  var [authLoading, setAuthLoading] = useState(true);
  var [subjects, setSubjects]   = useState([]);
  var [curSid, setCurSid]       = useState(null);
  var [view, setView]           = useState("dashboard");
  var [bar, setBar]             = useState(true);
  var [subjModal, setSubjModal] = useState(false);
  var [sf, setSf]               = useState({ name:"", level:"Secundario (4-6)", materials:"" });
  var [library, setLibrary]     = useState([]);
  var [bank, setBank]           = useState([]);
  var [publicLib, setPublicLib] = useState([]);
  var [dataLoading, setDataLoading] = useState(false);
  var [subscription, setSubscription] = useState(null);
  var [subChecked, setSubChecked] = useState(false);

  var [genType,    setGenType]    = useState("planclase");
  var [genTopic,   setGenTopic]   = useState("");
  var [genLevel,   setGenLevel]   = useState("Secundario (4-6)");
  var [genDiff,    setGenDiff]    = useState("Intermedio");
  var [genExtra,   setGenExtra]   = useState("");
  var [genResult,  setGenResult]  = useState("");
  var [genLoading, setGenLoading] = useState(false);
  var [genSaved,   setGenSaved]   = useState(false);
  var [genErr,     setGenErr]     = useState("");
  var [makeCodeUrl, setMakeCodeUrl] = useState(null);
  var [actImgUrl,  setActImgUrl]  = useState(null);
  var [actImgLoad, setActImgLoad] = useState(false);
  var [actImgErr,  setActImgErr]  = useState("");
  var [actImgDesc, setActImgDesc] = useState("");

  var [mmType,    setMmType]    = useState("podcast");
  var [mmTopic,   setMmTopic]   = useState("");
  var [mmExtra,   setMmExtra]   = useState("");
  var [mmResult,  setMmResult]  = useState("");
  var [mmLoading, setMmLoading] = useState(false);
  var [imgUrl,    setImgUrl]    = useState(null);
  var [imgLoading,setImgLoading]= useState(false);
  var [imgError,  setImgError]  = useState("");

  var [chatSid,     setChatSid]     = useState(null);
  var [chatMsgs,    setChatMsgs]    = useState([]);
  var [chatIn,      setChatIn]      = useState("");
  var [chatLoading, setChatLoading] = useState(false);
  var chatRef = useRef(null);

  var [corrR,       setCorrR]       = useState("");
  var [corrW,       setCorrW]       = useState("");
  var [corrResult,  setCorrResult]  = useState("");
  var [corrLoading, setCorrLoading] = useState(false);

  var [libFilter, setLibFilter] = useState("all");
  var [libSearch, setLibSearch] = useState("");
  var [libItem,   setLibItem]   = useState(null);

  var curSubj = subjects.find(function(s) { return s.id === curSid; }) || null;

  useEffect(function() {
    supabase.auth.getSession().then(function(result) {
      setAuthUser(result.data.session ? result.data.session.user : null);
      setAuthLoading(false);
    });
    var sub = supabase.auth.onAuthStateChange(function(event, session) {
      setAuthUser(session ? session.user : null);
    });
    return function() { sub.data.subscription.unsubscribe(); };
  }, []);

  useEffect(function() {
    if (!authUser) return;
    setDataLoading(true);
    Promise.all([
      dbLoadSubjects(authUser.id),
      dbLoadLibrary(authUser.id),
      dbLoadBank(authUser.id),
      dbLoadPublicLib(),
    ]).then(function(results) {
      var subs = results[0], lib = results[1], bk = results[2], pub = results[3];
      setSubjects(subs);
      setLibrary(lib);
      setBank(bk);
      setPublicLib(pub);
      if (subs.length) setCurSid(subs[0].id);
      setDataLoading(false);
      dbCheckSubscription(authUser.id).then(function(sub) {
        if (!sub) {
          dbCreateTrial(authUser.id).then(function() {
            dbCheckSubscription(authUser.id).then(function(newSub) {
              setSubscription(newSub);
              setSubChecked(true);
            });
          });
        } else {
          setSubscription(sub);
          setSubChecked(true);
        }
      });
    }).catch(function() { setDataLoading(false); });
  }, [authUser]);

  useEffect(function() { if (chatRef.current) chatRef.current.scrollIntoView({ behavior:"smooth" }); }, [chatMsgs]);

  async function signOut() {
    await supabase.auth.signOut();
    setSubjects([]); setLibrary([]); setBank([]); setPublicLib([]);
    setCurSid(null); setView("dashboard");
  }

  async function addSubject() {
    if (!sf.name.trim() || !authUser) return;
    var sub = await dbAddSubject(authUser.id, sf);
    var upd = subjects.concat([sub]);
    setSubjects(upd); setCurSid(sub.id);
    setSf({ name:"", level:"Secundario (4-6)", materials:"" });
    setSubjModal(false);
  }

  async function delSubject(id) {
    await dbDelSubject(id);
    var upd = subjects.filter(function(s) { return s.id !== id; });
    setSubjects(upd);
    if (curSid === id) setCurSid(upd.length ? upd[0].id : null);
  }

  function generateMakeCodeUrl(content) {
    var match = content.match(/```javascript\n([\s\S]*?)```/);
    if (!match) return null;
    var code = match[1].trim();
    var snippet = { name: genTopic, description: "Generado con EduAI Pro", editor: "microbit", code: { "main.ts": code } };
    try {
      var encoded = btoa(unescape(encodeURIComponent(JSON.stringify(snippet))));
      return "https://makecode.microbit.org/#pub:" + encoded;
    } catch { return null; }
  }

  async function generate() {
    if (!genTopic.trim() || !curSubj) return;
    setGenLoading(true); setGenResult(""); setGenSaved(false); setGenErr(""); setMakeCodeUrl(null); setActImgUrl(null);
    try {
      var sys = sysGen(genType, curSubj.name, genLevel || curSubj.level, curSubj.materials);
      var usr = userGen(genType, genTopic, genDiff, genExtra, curSubj);
      var r = await callClaude(sys, [{ role:"user", content:usr }]);
      setGenResult(r);
      setMakeCodeUrl(generateMakeCodeUrl(r));
      var tokIn = Math.round((sysGen(genType, curSubj.name, genLevel || curSubj.level, curSubj.materials).length + userGen(genType, genTopic, genDiff, genExtra, curSubj).length) / 4);
      var tokOut = Math.round(r.length / 4);
      dbLogUsage(authUser.id, authUser.email, genType, gt ? gt.label : genType, curSubj ? curSubj.name : "", tokIn, tokOut, false);
    } catch(e) { setGenErr("Error: " + e.message); }
    setGenLoading(false);
  }

  async function generateMM() {
    if (!mmTopic.trim() || !curSubj) return;
    setMmLoading(true); setMmResult("");
    try {
      var sys = "Sos experto en contenido educativo digital para " + curSubj.name + " (" + curSubj.level + "). Responde en espanol rioplatense con Markdown.";
      var r = await callClaude(sys, [{ role:"user", content:userMM(mmType, mmTopic, mmExtra) }]);
      setMmResult(r);
    } catch(e) { setMmResult("Error: " + e.message); }
    setMmLoading(false);
  }

  async function generateImage() {
    if (!mmTopic.trim() || !curSubj) return;
    setImgLoading(true); setImgUrl(null); setImgError("");
    try {
      var res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: mmTopic, subject: curSubj.name, level: curSubj.level }),
      });
      if (!res.ok) {
        var errJson; try { errJson = await res.json(); } catch { throw new Error("Error del servidor."); }
        throw new Error(errJson.error || "Error al generar imagen.");
      }
      var contentType = res.headers.get("content-type") || "";
      var imgUrl;
      if (contentType.includes("image")) {
        var blob = await res.blob();
        imgUrl = URL.createObjectURL(blob);
      } else {
        var jsonData = await res.json();
        imgUrl = jsonData.url;
      }
      setImgUrl(imgUrl);
      dbLogUsage(authUser.id, authUser.email, "imagen_ia", "Imagen IA Multimedia", curSubj ? curSubj.name : "", 300, 0, true);
    } catch(e) { setImgError("Error: " + e.message); }
    setImgLoading(false);
  }

  async function generateActivityImage() {
    if (!genResult || !curSubj) return;
    setActImgLoad(true); setActImgUrl(null); setActImgErr("");
    try {
      var description = actImgDesc || ("Educational activity illustration for: " + genTopic + ". Subject: " + curSubj.name + ". Level: " + genLevel + ". Clean educational diagram, colorful, suitable for classroom.");
      var res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description, subject: curSubj.name, level: genLevel }),
      });
      if (!res.ok) {
        var errJson; try { errJson = await res.json(); } catch { throw new Error("Error del servidor."); }
        throw new Error(errJson.error || "Error al generar imagen.");
      }
      var contentType = res.headers.get("content-type") || "";
      var imgUrl;
      if (contentType.includes("image")) {
        var blob = await res.blob();
        imgUrl = URL.createObjectURL(blob);
      } else {
        var jsonData = await res.json();
        imgUrl = jsonData.url;
      }
      setActImgUrl(imgUrl);
      dbLogUsage(authUser.id, authUser.email, "imagen", "Imagen IA", curSubj ? curSubj.name : "", 300, 0, true);
    } catch(e) { setActImgErr("Error: " + e.message); }
    setActImgLoad(false);
  }

  async function saveLib(content, type, typeName, topic) {
    if (!authUser) return;
    await dbAddLibraryItem(authUser.id, { type, type_name:typeName, topic, subject_name:curSubj ? curSubj.name : "", content });
    var upd = await dbLoadLibrary(authUser.id);
    setLibrary(upd); setGenSaved(true);
  }

  async function sharePublic(content, type, typeName, topic) {
    if (!authUser) return;
    var userName = (authUser.user_metadata && authUser.user_metadata.name) || authUser.email.split("@")[0] || "Docente";
    await dbAddPublicItem(authUser.id, userName, { type, type_name:typeName, topic, subject_name:curSubj ? curSubj.name : "", level:genLevel, content });
    var pub = await dbLoadPublicLib();
    setPublicLib(pub);
    alert("Compartido en la biblioteca publica!");
  }

  async function saveBank(content, topic) {
    if (!authUser) return;
    await dbAddBankItem(authUser.id, { topic, subject_name:curSubj ? curSubj.name : "", content });
    var upd = await dbLoadBank(authUser.id);
    setBank(upd);
  }

  async function delLib(id) {
    await dbDelLibraryItem(id);
    setLibrary(function(prev) { return prev.filter(function(i) { return i.id !== id; }); });
    if (libItem && libItem.id === id) setLibItem(null);
  }

  async function delBank(id) {
    await dbDelBankItem(id);
    setBank(function(prev) { return prev.filter(function(i) { return i.id !== id; }); });
  }

  async function sendChat() {
    var subj = subjects.find(function(s) { return s.id === chatSid; }) || curSubj;
    if (!chatIn.trim() || !subj) return;
    var msg = chatIn.trim(); setChatIn("");
    var hist = chatMsgs.concat([{ role:"user", content:msg }]);
    setChatMsgs(hist); setChatLoading(true);
    var sys = "Sos asistente educativo experto para docentes argentinos en \"" + subj.name + "\" (" + subj.level + ")." + (subj.materials ? "\nPrograma: " + subj.materials : "") + "\nResponde en espanol rioplatense con Markdown.";
    try {
      var r = await callClaude(sys, hist.map(function(m) { return { role:m.role, content:m.content }; }), 2000);
      setChatMsgs(hist.concat([{ role:"assistant", content:r }]));
    } catch(e) {
      setChatMsgs(hist.concat([{ role:"assistant", content:"Error: " + e.message }]));
    }
    setChatLoading(false);
  }

  async function correctTP() {
    if (!corrR.trim() || !corrW.trim()) return;
    setCorrLoading(true); setCorrResult("");
    var sys = "Sos docente evaluador experto y constructivo. Materia: \"" + (curSubj ? curSubj.name : "General") + "\". Responde en espanol rioplatense con Markdown.";
    var usr = "Correccion completa usando la rubrica.\n\n## RUBRICA:\n" + corrR + "\n\n## TRABAJO DEL ALUMNO:\n" + corrW + "\n\nIncluí: 1) Evaluacion por criterio (nivel + justificacion + puntaje), 2) Calificacion final, 3) Fortalezas (min. 3), 4) Areas de mejora (min. 3 con sugerencias), 5) Devolucion al alumno (2-3 parrafos en 2da persona), 6) Proximos pasos.";
    try {
      var r = await callClaude(sys, [{ role:"user", content:usr }], 4000);
      setCorrResult(r);
    } catch(e) { setCorrResult("Error: " + e.message); }
    setCorrLoading(false);
  }

  // ── RENDER ────────────────────────────────────────────────────────────────

  if (authLoading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:C.bg, flexDirection:"column", gap:12 }}>
      <div><i className="ti ti-school" style={{ fontSize:38, color:C.accent }} /></div>
      <div style={{ color:C.textMuted, fontSize:14 }}>Cargando EduAI Pro...</div>
    </div>
  );

  if (!authUser) return <AuthScreen onAuth={setAuthUser} />;

  if (subChecked && !subscription && authUser.email !== import.meta.env.VITE_ADMIN_EMAIL) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:C.bg }}>
      <div style={{ width:480, textAlign:"center" }}>
        <div style={{ marginBottom:12 }}><i className="ti ti-school" style={{ fontSize:52, color:C.accent }} /></div>
        <h1 style={{ color:"#f59e0b", fontSize:28, fontWeight:700, margin:"0 0 8px" }}>EduAI Pro</h1>
        <p style={{ color:C.textMuted, fontSize:15, marginBottom:32 }}>Necesitas una suscripcion activa para acceder.</p>
        <div style={{ background:C.card, border:"1px solid #243350", borderRadius:16, padding:28 }}>
          <PricingPanel authUser={authUser} />
        </div>
        <button style={{ marginTop:20, background:"transparent", border:"none", cursor:"pointer", color:C.textDim, fontSize:13, fontFamily:"inherit" }} onClick={signOut}>
          Cerrar sesion
        </button>
      </div>
    </div>
  );

  var filtLib = library.filter(function(i) {
    var mf = libFilter === "all" || i.type === libFilter;
    var ms = !libSearch || i.topic.toLowerCase().includes(libSearch.toLowerCase()) || (i.subject_name || "").toLowerCase().includes(libSearch.toLowerCase());
    return mf && ms;
  });

  var gt = GEN_TYPES.find(function(g) { return g.id === genType; });
  var mt = MM_TYPES.find(function(m) { return m.id === mmType; });
  var userName = (authUser.user_metadata && authUser.user_metadata.name) || authUser.email.split("@")[0] || "Docente";

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, color:C.text, fontFamily:"Arial,sans-serif", overflow:"hidden" }}>

      <div style={{ width:bar?218:56, minWidth:bar?218:56, background:"#ffffff", borderRight:"1px solid #e0ddd6", display:"flex", flexDirection:"column", transition:"all .22s", overflow:"hidden" }}>
        <div style={{ padding:"14px 10px 12px", borderBottom:"1px solid #243350", display:"flex", alignItems:"center", gap:8 }}>
          <button style={{ background:"none", border:"none", cursor:"pointer", color:C.accent, fontSize:17, minWidth:26, fontFamily:"inherit" }} onClick={function() { setBar(!bar); }}>
  {bar ? <i className="ti ti-chevron-left" style={{fontSize:16}} /> : <i className="ti ti-chevron-right" style={{fontSize:16}} />}
</button>
          {bar && <span style={{ fontSize:15, fontWeight:700, color:C.accent, whiteSpace:"nowrap" }}>EduAI Pro</span>}
        </div>
        {bar && subjects.length > 0 && (
          <div style={{ padding:"8px 10px 10px", borderBottom:"1px solid #243350" }}>
            <div style={{ fontSize:10, color:C.textDim, fontWeight:700, letterSpacing:.8, marginBottom:5 }}>MATERIA ACTIVA</div>
            <select style={Object.assign({}, sel, { width:"100%", fontSize:12, padding:"5px 9px" })} value={curSid || ""} onChange={function(e) { setCurSid(e.target.value); }}>
              {subjects.map(function(s) { return <option key={s.id} value={s.id}>{s.name}</option>; })}
            </select>
          </div>
        )}
        <nav style={{ flex:1, padding:"6px 0", overflowY:"auto" }}>
          {NAV.map(function(n) {
            return (
              <div key={n.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 11px", cursor:"pointer", borderRadius:8, margin:"2px 6px", background:view===n.id?"#f0fdfa":"transparent", color:view===n.id?"#0f766e":C.textMuted, fontSize:13, whiteSpace:"nowrap", overflow:"hidden" }}
                onClick={function() { setView(n.id); }}>
                <i className={"ti " + n.icon} style={{ fontSize:17, minWidth:24, textAlign:"center" }} />
                {bar && <span>{n.label}</span>}
              </div>
            );
          })}
        </nav>
        <div style={{ padding:"10px 12px", borderTop:"1px solid #243350" }}>
          {bar ? (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:11, color:C.textDim, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:4 }}><i className="ti ti-user" style={{fontSize:12}} />{userName}</div>
              <button style={{ background:"transparent", border:"none", cursor:"pointer", color:C.textDim, fontSize:11, fontFamily:"inherit" }} onClick={signOut}>Salir</button>
            </div>
          ) : (
            <button style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:16, width:"100%", textAlign:"center", color:C.textDim }} onClick={signOut} title="Cerrar sesion"><i className="ti ti-logout" style={{fontSize:16}} /></button>
          )}
        </div>
      </div>

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
        <div style={{ background:"#ffffff", borderBottom:"1px solid #e0ddd6", padding:"10px 22px", display:"flex", alignItems:"center", gap:14, minHeight:54 }}>
          <h1 style={{ margin:0, fontSize:16, fontWeight:700, flex:1, color:C.text }}>
            {(NAV.find(function(n) { return n.id === view; }) || {}).icon} {(NAV.find(function(n) { return n.id === view; }) || {}).label}
          </h1>
          {curSubj && <div style={{ fontSize:12, color:C.textMuted, background:C.bg, padding:"4px 12px", borderRadius:20, border:"1px solid #e0ddd6", display:"flex", alignItems:"center", gap:5 }}><i className="ti ti-book" style={{fontSize:13}} />{curSubj.name}</div>}
          <Btn v="accent" st={{ padding:"5px 13px", fontSize:12 }} onClick={function() { setSubjModal(true); }}><i className="ti ti-plus" style={{fontSize:12,marginRight:3}} />Materia</Btn>
        </div>

        <div style={{ flex:1, overflow:"auto", padding:"20px 26px" }}>
{subscription && subscription.is_trial && authUser.email !== import.meta.env.VITE_ADMIN_EMAIL && (function() {
            var daysLeft = Math.ceil((new Date(subscription.current_period_end) - new Date()) / (1000 * 60 * 60 * 24));
            if (daysLeft <= 0) return null;
            return (
              <div style={{ background:"#1c1408", border:"1px solid #f59e0b", borderRadius:8, padding:"10px 16px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:13, color:"#f59e0b" }}>{"Periodo de prueba: " + daysLeft + " dia" + (daysLeft === 1 ? "" : "s") + " restante" + (daysLeft === 1 ? "" : "s")}</span>
                <button style={{ background:"#f59e0b", border:"none", borderRadius:6, padding:"5px 14px", cursor:"pointer", fontWeight:700, fontSize:12, fontFamily:"inherit", color:"#000" }}
                  onClick={function() { setView("pricing"); }}>
                  <><i className="ti ti-credit-card" style={{fontSize:12,marginRight:4}} />Ver planes</>
                </button>
              </div>
            );
          })()}
          {dataLoading && (
            <div style={{ textAlign:"center", padding:"60px 0" }}><Spin /></div>
          )}

          {/* DASHBOARD */}
          {!dataLoading && view === "dashboard" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
                <div>
                  <h2 style={{ fontSize:22, fontWeight:700, color:C.text, margin:0 }}>{"Bienvenido, " + userName + " 👋"}</h2>
                  <p style={{ color:C.textDim, fontSize:13, margin:"4px 0 0" }}>Que creamos hoy para tus alumnos?</p>
                </div>
                <Btn onClick={function() { setSubjModal(true); }}><i className="ti ti-plus" style={{fontSize:13,marginRight:4}} />Nueva Materia</Btn>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
                {[{l:"Materias",v:subjects.length,i:"ti-books",c:C.blue},{l:"Biblioteca",v:library.length,i:"ti-folder",c:C.green},{l:"Banco",v:bank.length,i:"ti-database",c:C.accent},{l:"Biblioteca Publica",v:publicLib.length,i:"ti-world",c:C.purple}].map(function(x) {
                  return (
                    <div key={x.l} style={{ background:C.card, border:"1px solid #243350", borderRadius:12, padding:"15px 18px" }}>
                      <i className={"ti " + x.i} style={{ fontSize:22, marginBottom:8, color:x.c, display:"block" }} />
                      <div style={{ fontSize:28, fontWeight:700, color:x.c }}>{x.v}</div>
                      <div style={{ fontSize:12, color:C.textDim, marginTop:2 }}>{x.l}</div>
                    </div>
                  );
                })}
              </div>
              <div style={card}>
                <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:.8, marginBottom:14 }}>MIS MATERIAS</div>
                {!subjects.length ? (
                  <div style={{ textAlign:"center", padding:"32px 0", color:C.textDim }}>
                    <div style={{ marginBottom:10 }}><i className="ti ti-books" style={{ fontSize:34, color:C.textDim }} /></div>
                    <p style={{ marginBottom:14 }}>Todavia no tenes materias. Crea la primera para empezar.</p>
                    <Btn onClick={function() { setSubjModal(true); }}><i className="ti ti-plus" style={{fontSize:13,marginRight:4}} />Crear mi primera materia</Btn>
                  </div>
                ) : (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12 }}>
                    {subjects.map(function(sub) {
                      return (
                        <div key={sub.id} style={{ background:C.bg, border:"2px solid " + (curSid === sub.id ? C.accent : C.border), borderRadius:10, padding:14, cursor:"pointer" }}
                          onClick={function() { setCurSid(sub.id); }}>
                          <div style={{ fontSize:22, marginBottom:7 }}><i className="ti ti-book" style={{fontSize:22,color:C.accent}} /></div>
                          <div style={{ fontWeight:700, color:C.text, marginBottom:2, fontSize:14 }}>{sub.name}</div>
                          <div style={{ fontSize:12, color:C.textDim, marginBottom:sub.materials?5:10 }}>{sub.level}</div>
                          {sub.materials && <div style={{ fontSize:11, color:C.green, marginBottom:10 }}>Con programa cargado</div>}
                          <div style={{ display:"flex", gap:6 }}>
                            <Btn v="sm" onClick={function(e) { e.stopPropagation(); setCurSid(sub.id); setView("generator"); }}><i className="ti ti-bolt" style={{fontSize:12,marginRight:3}} />Generar</Btn>
                            <Btn v="ghost" st={{ padding:"5px 9px", fontSize:12 }} onClick={function(e) { e.stopPropagation(); delSubject(sub.id); }}><i className="ti ti-trash" style={{fontSize:15}} /></Btn>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div style={card}>
                <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:.8, marginBottom:14 }}>ACCESO RAPIDO</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
                  {[{v:"generator",i:"ti-bolt",l:"Generador IA",c:C.accent},{v:"chat",i:"ti-message",l:"Chat Docente",c:C.blue},{v:"multimedia",i:"ti-photo",l:"Multimedia",c:C.green},{v:"corrector",i:"ti-checklist",l:"Corrector TPs",c:C.purple}].map(function(x) {
                    return (
                      <button key={x.v} style={{ background:C.bg, border:"1px solid #243350", borderRadius:10, padding:"13px 8px", cursor:"pointer", textAlign:"center", fontFamily:"inherit" }}
                        onClick={function() { setView(x.v); }}>
                        <i className={"ti " + x.i} style={{ fontSize:24, marginBottom:5, color:x.c, display:"block" }} />
                        <div style={{ fontSize:12, fontWeight:600, color:x.c }}>{x.l}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* GENERATOR */}
          {!dataLoading && view === "generator" && (
            <div style={{ display:"grid", gridTemplateColumns:"258px 1fr", gap:18 }}>
              <div>
                <div style={card}>
                  <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:.8, marginBottom:12 }}>TIPO DE CONTENIDO</div>
                  {GEN_TYPES.map(function(g) {
                    return (
                      <button key={g.id} style={{ display:"flex", alignItems:"center", gap:9, width:"100%", padding:"8px 10px", borderRadius:7, border:"none", cursor:"pointer", marginBottom:3, background:genType===g.id?"#1d3d7a":"transparent", color:genType===g.id?"#93c5fd":C.textMuted, textAlign:"left", fontFamily:"inherit", fontSize:13 }}
                        onClick={function() { setGenType(g.id); setGenResult(""); setGenSaved(false); setGenErr(""); setMakeCodeUrl(null); setActImgUrl(null); }}>
                        <i className={"ti " + g.icon} style={{ fontSize:16, minWidth:18 }} />
                        <span style={{ fontWeight:genType===g.id?700:400 }}>{g.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={card}>
                  <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:.8, marginBottom:12 }}>PARAMETROS</div>
                  <label style={lbl}>NIVEL</label>
                  <select style={Object.assign({}, sel, { width:"100%", marginBottom:12 })} value={genLevel} onChange={function(e) { setGenLevel(e.target.value); }}>
                    {LEVELS.map(function(l) { return <option key={l}>{l}</option>; })}
                  </select>
                  <label style={lbl}>DIFICULTAD</label>
                  <div style={{ display:"flex", gap:5 }}>
                    {["Basico","Intermedio","Avanzado"].map(function(d) {
                      return (
                        <button key={d} style={{ flex:1, padding:"6px 3px", borderRadius:6, border:"1px solid " + (genDiff===d?C.accent:C.border), background:genDiff===d?C.accentBg:"transparent", color:genDiff===d?C.accent:C.textMuted, cursor:"pointer", fontSize:11, fontWeight:genDiff===d?700:400, fontFamily:"inherit" }}
                          onClick={function() { setGenDiff(d); }}>{d}</button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div>
                <div style={card}>
                  <div style={{ display:"flex", alignItems:"center", gap:13, marginBottom:18 }}>
                    <i className={"ti " + (gt ? gt.icon : "ti-bolt")} style={{ fontSize:28, color:gt ? gt.color : C.accent }} />
                    <div>
                      <h2 style={{ margin:0, fontSize:19, fontWeight:700, color:C.text }}>{gt ? gt.label : ""}</h2>
                      <div style={{ fontSize:13, color:C.textDim }}>{"Materia: " + (curSubj ? curSubj.name : "—")}</div>
                    </div>
                  </div>
                  {!curSubj ? (
                    <div style={{ textAlign:"center", padding:"28px 0", color:C.textDim }}>
                      <p style={{ marginBottom:14 }}>Selecciona o crea una materia primero.</p>
                      <Btn onClick={function() { setSubjModal(true); }}>Crear materia</Btn>
                    </div>
                  ) : (
                    <div>
                      <label style={lbl}>TEMA ESPECIFICO *</label>
                      <input style={Object.assign({}, inp, { marginBottom:12 })} value={genTopic} onChange={function(e) { setGenTopic(e.target.value); }}
                        placeholder={genType==="planclase"?"Ej: La Primera Guerra Mundial":genType==="rubrica"?"Ej: Informe de laboratorio grupal":"Ej: Ecuaciones de primer grado"} />
                      <label style={lbl}>INSTRUCCIONES ADICIONALES (opcional)</label>
                      <textarea style={Object.assign({}, inp, { height:70, resize:"vertical", marginBottom:18 })} value={genExtra} onChange={function(e) { setGenExtra(e.target.value); }}
                        placeholder="Ej: grupos de 4, enfoque por proyectos, uso de tecnologia..." />
                      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                        <Btn onClick={generate} disabled={genLoading || !genTopic.trim()}>
                          {genLoading ? "Generando..." : <><i className="ti ti-bolt" style={{fontSize:13,marginRight:4}} />{"Generar " + (gt ? gt.label : "")}</>}
                        </Btn>
                        {genLoading && <span style={{ color:C.textMuted, fontSize:12 }}>Puede tardar unos segundos...</span>}
                      </div>
                      {genErr && <div style={{ marginTop:12, color:"#f87171", fontSize:13, background:"#1a0a0a", padding:"10px 14px", borderRadius:7 }}>{genErr}</div>}
                    </div>
                  )}
                </div>
                {genLoading && <div style={card}><Spin /></div>}
                {genResult && !genLoading && (
                  <div style={card}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
                      <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:.8 }}>RESULTADO GENERADO</div>
                      <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                        {genSaved && (
                          <Btn v="green" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { sharePublic(genResult, genType, gt ? gt.label : "", genTopic); }}>
                            Compartir
                          </Btn>
                        )}
                        {genSaved
                          ? <span style={{ color:C.green, fontSize:12, fontWeight:700, display:"flex", alignItems:"center", gap:4 }}><i className="ti ti-check" style={{fontSize:13}} />Guardado</span>
                          : (
                            <div style={{ display:"flex", gap:8 }}>
                              <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { saveLib(genResult, genType, gt ? gt.label : "", genTopic); }}><i className="ti ti-device-floppy" style={{fontSize:14,marginRight:4}} /> Biblioteca</Btn>
                              {(genType==="evaluacion"||genType==="rubrica") && <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { saveBank(genResult, genTopic); }}><i className="ti ti-database" style={{fontSize:14,marginRight:4}} /> Banco</Btn>}
                            </div>
                          )
                        }
                        <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { exportDocx(genTopic, gt ? gt.label : "", curSubj ? curSubj.name : "", genResult); }}><i className="ti ti-file-text" style={{fontSize:13,marginRight:4}} />Word</Btn>
                        {(genType==="evaluacion"||genType==="rubrica"||genType==="planclase") && (
                          <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { exportPdf(genTopic, gt ? gt.label : "", curSubj ? curSubj.name : "", genResult); }}><i className="ti ti-file-invoice" style={{fontSize:13,marginRight:4}} />PDF</Btn>
                        )}
                        {genType==="presentacion" && (
                          <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { generatePptx(genTopic, curSubj ? curSubj.name : "", genResult); }}><i className="ti ti-presentation" style={{fontSize:13,marginRight:4}} />PowerPoint</Btn>
                        )}
                      </div>
                    </div>
                    <MDView text={genResult} />
                    {makeCodeUrl && (
                      <div style={{ marginTop:16, padding:"12px 16px", background:"#0f2027", borderRadius:8, border:"1px solid #00b4d8", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:"#00b4d8", marginBottom:3 }}>Codigo MakeCode detectado</div>
                          <div style={{ fontSize:12, color:C.textMuted }}>Abri el proyecto en el editor con los bloques listos</div>
                        </div>
                        <a href={makeCodeUrl} target="_blank" rel="noopener noreferrer">
                          <Btn v="primary" st={{ fontSize:13, padding:"8px 18px" }}><i className="ti ti-code" style={{fontSize:14,marginRight:4}} />Abrir en MakeCode</Btn>
                        </a>
                      </div>
                    )}
                    <div style={{ marginTop:16 }}>
                      <label style={lbl}>DESCRIPCION DE LA IMAGEN (opcional)</label>
                      <input style={Object.assign({}, inp, { marginBottom:10 })} value={actImgDesc} onChange={function(e) { setActImgDesc(e.target.value); }} placeholder="Ej: bloques de MakeCode mostrando un loop con LED encendido, fondo blanco" />
                    </div>
                    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                      <Btn v="secondary" st={{ fontSize:12, padding:"5px 14px" }} onClick={generateActivityImage} disabled={actImgLoad}>
                        {actImgLoad ? "Generando..." : <><i className="ti ti-photo-ai" style={{fontSize:13,marginRight:4}} />Generar imagen</>}
                      </Btn>
                      {actImgErr && <span style={{ color:"#f87171", fontSize:12 }}>{actImgErr}</span>}
                    </div>
                    {actImgUrl && (
                      <div style={{ marginTop:14 }}>
                        <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:.8, marginBottom:10 }}>IMAGEN GENERADA</div>
                        <img src={actImgUrl} alt={genTopic} style={{ width:"100%", borderRadius:8, display:"block" }} />
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
                          <p style={{ fontSize:11, color:C.textDim }}>Las imagenes expiran en 1 hora. Descargala para guardarla.</p>
                          <a href={actImgUrl} download="imagen_actividad.png" target="_blank" rel="noopener noreferrer">
                            <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }}><i className="ti ti-download" style={{fontSize:13,marginRight:4}} />Descargar</Btn>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MULTIMEDIA */}
          {!dataLoading && view === "multimedia" && (
            <div style={{ display:"grid", gridTemplateColumns:"248px 1fr", gap:18 }}>
              <div style={card}>
                <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:.8, marginBottom:12 }}>TIPO</div>
                {MM_TYPES.map(function(m) {
                  return (
                    <button key={m.id} style={{ display:"flex", alignItems:"flex-start", gap:10, width:"100%", padding:"8px 10px", borderRadius:7, border:"none", cursor:"pointer", marginBottom:4, background:mmType===m.id?"#1d3d7a":"transparent", textAlign:"left", fontFamily:"inherit" }}
                      onClick={function() { setMmType(m.id); setMmResult(""); setImgUrl(null); setImgError(""); }}>
                      <span style={{ fontSize:17, minWidth:24 }}>{m.icon}</span>
                      <div>
                        <div style={{ fontWeight:mmType===m.id?700:400, fontSize:13, color:mmType===m.id?"#93c5fd":C.textMuted }}>{m.label}</div>
                        <div style={{ fontSize:11, color:C.textDim, marginTop:1 }}>{m.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div>
                <div style={card}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                   <i className={"ti " + (mt ? mt.icon : "ti-photo")} style={{ fontSize:26, color:C.accent }} />
                    <div>
                      <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:C.text }}>{mt ? mt.label : ""}</h2>
                      <div style={{ fontSize:12, color:C.textDim }}>{mt ? mt.desc : ""}</div>
                    </div>
                  </div>
                  {!curSubj ? (
                    <div style={{ textAlign:"center", padding:"22px 0", color:C.textDim }}>Selecciona una materia primero.</div>
                  ) : (
                    <div>
                      <label style={lbl}>{mmType === "imagen_ia" ? "DESCRIPCION DE LA IMAGEN" : "TEMA DEL CONTENIDO"}</label>
                      <input style={Object.assign({}, inp, { marginBottom:12 })} value={mmTopic} onChange={function(e) { setMmTopic(e.target.value); }}
                        placeholder={mmType === "imagen_ia" ? "Ej: Ciclo del agua con nubes, lluvia y rios" : "Ej: La fotosintesis para 5to ano"} />
                      {mmType !== "imagen_ia" && (
                        <div>
                          <label style={lbl}>INSTRUCCIONES ADICIONALES</label>
                          <textarea style={Object.assign({}, inp, { height:62, resize:"vertical", marginBottom:16 })} value={mmExtra} onChange={function(e) { setMmExtra(e.target.value); }} placeholder="Duracion, tono, audiencia..." />
                        </div>
                      )}
                      <div style={{ display:"flex", gap:10, marginTop:mmType === "imagen_ia" ? 16 : 0 }}>
                        {mmType === "imagen_ia"
                          ? <Btn onClick={generateImage} disabled={imgLoading || !mmTopic.trim()}>{imgLoading ? "Generando..." : <><i className="ti ti-photo-ai" style={{fontSize:13,marginRight:4}} />Generar Imagen</>}</Btn>
                          : <Btn onClick={generateMM} disabled={mmLoading || !mmTopic.trim()}>{mmLoading ? "Generando..." : <><i className="ti ti-sparkles" style={{fontSize:13,marginRight:4}} />Generar Contenido</>}</Btn>
                        }
                      </div>
                    </div>
                  )}
                </div>
                {mmType === "imagen_ia" && (
                  <div>
                    {imgLoading && <div style={card}><Spin /></div>}
                    {imgError && <div style={Object.assign({}, card, { color:"#f87171", fontSize:13 })}>{imgError}</div>}
                    {imgUrl && !imgLoading && (
                      <div style={card}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                          <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:.8 }}>IMAGEN GENERADA</div>
                          <a href={imgUrl} download="imagen_educativa.png" target="_blank" rel="noopener noreferrer">
                            <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }}><i className="ti ti-download" style={{fontSize:13,marginRight:4}} />Descargar PNG</Btn>
                          </a>
                        </div>
                        <img src={imgUrl} alt={mmTopic} style={{ width:"100%", borderRadius:8, display:"block" }} />
                        <p style={{ fontSize:11, color:C.textDim, marginTop:10 }}>Las imagenes expiran en 1 hora. Descargala para guardarla.</p>
                      </div>
                    )}
                  </div>
                )}
                {mmType !== "imagen_ia" && (
                  <div>
                    {mmLoading && <div style={card}><Spin /></div>}
                    {mmResult && !mmLoading && (
                      <div style={card}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:8 }}>
                          <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:.8 }}>CONTENIDO GENERADO</div>
                          <div style={{ display:"flex", gap:8 }}>
                            <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { saveLib(mmResult, mmType, mt ? mt.label : "", mmTopic); }}><i className="ti ti-device-floppy" style={{fontSize:14,marginRight:4}} /> Biblioteca</Btn>
                            <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { exportDocx(mmTopic, mt ? mt.label : "", curSubj ? curSubj.name : "", mmResult); }}><i className="ti ti-file-text" style={{fontSize:13,marginRight:4}} />Word</Btn>
                            <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { exportPdf(mmTopic, mt ? mt.label : "", curSubj ? curSubj.name : "", mmResult); }}><i className="ti ti-file-invoice" style={{fontSize:13,marginRight:4}} />PDF</Btn>
                          </div>
                        </div>
                        <MDView text={mmResult} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CHAT */}
          {!dataLoading && view === "chat" && (function() {
            var chatSubj = subjects.find(function(s) { return s.id === chatSid; }) || curSubj;
            var SUGS = ["Como explico este concepto de forma simple?","Dame 5 actividades de cierre creativas","Que TIC puedo usar en esta clase?","Diseñame una pregunta diagnostica","Como manejo distintos ritmos de aprendizaje?","Sugeri secuencia de temas para el trimestre"];
            return (
              <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 132px)" }}>
                <div style={Object.assign({}, card, { marginBottom:12, padding:"9px 14px" })}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:.6, whiteSpace:"nowrap" }}>CONTEXTO:</span>
                    <select style={Object.assign({}, sel, { flex:1 })} value={chatSid || curSid || ""} onChange={function(e) { setChatSid(e.target.value); setChatMsgs([]); }}>
                      <option value="">Sin materia especifica</option>
                      {subjects.map(function(s) { return <option key={s.id} value={s.id}>{s.name + " (" + s.level + ")"}</option>; })}
                    </select>
                    <Btn v="ghost" st={{ padding:"5px 11px", fontSize:12 }} onClick={function() { setChatMsgs([]); }}><i className="ti ti-trash" style={{fontSize:13,marginRight:4}} />Limpiar</Btn>
                  </div>
                </div>
                <div style={Object.assign({}, card, { flex:1, overflow:"auto", padding:"14px 18px", minHeight:0 })}>
                  {!chatMsgs.length ? (
                    <div style={{ textAlign:"center", padding:"28px 0", color:C.textDim }}>
                      <div style={{ marginBottom:10 }}><i className="ti ti-message" style={{ fontSize:36, color:C.textDim }} /></div>
                      <p style={{ fontSize:14, marginBottom:18 }}>Chat contextualizado a tu materia</p>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, maxWidth:500, margin:"0 auto" }}>
                        {SUGS.map(function(s) {
                          return <button key={s} style={{ background:C.bg, border:"1px solid #243350", borderRadius:8, padding:"9px 11px", color:C.textMuted, cursor:"pointer", textAlign:"left", fontSize:12, fontFamily:"inherit" }} onClick={function() { setChatIn(s); }}>{s}</button>;
                        })}
                      </div>
                    </div>
                  ) : chatMsgs.map(function(m, i) {
                    return (
                      <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", marginBottom:14 }}>
                        <div style={{ maxWidth:"82%", background:m.role==="user"?"#0d9488":C.card, borderRadius:12, padding:"10px 14px", border:m.role==="user"?"none":"1px solid #e0ddd6" }}>
                          {m.role === "user" ? <span style={{ fontSize:14, color:C.text }}>{m.content}</span> : <MDView text={m.content} maxH={9999} />}
                        </div>
                      </div>
                    );
                  })}
                  {chatLoading && <div style={{ textAlign:"center", padding:"12px 0" }}><Spin /></div>}
                  <div ref={chatRef} />
                </div>
                <div style={{ display:"flex", gap:10, marginTop:10 }}>
                  <input style={Object.assign({}, inp, { flex:1, padding:"10px 14px" })} value={chatIn} onChange={function(e) { setChatIn(e.target.value); }}
                    onKeyDown={function(e) { if (e.key === "Enter" && !e.shiftKey) sendChat(); }}
                    placeholder="Escribe tu consulta... (Enter para enviar)" />
                  <Btn onClick={sendChat} disabled={chatLoading || !chatIn.trim()} st={{ padding:"10px 22px" }}><i className="ti ti-send" style={{fontSize:14,marginRight:4}} />Enviar</Btn>
                </div>
              </div>
            );
          })()}

          {/* CORRECTOR */}
          {!dataLoading && view === "corrector" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
              <div style={card}>
                <h3 style={{ margin:"0 0 5px", fontSize:18, fontWeight:700, color:C.text }}>Corrector de TPs</h3>
                <p style={{ fontSize:13, color:C.textDim, marginBottom:18 }}>Pega la rubrica y el trabajo del alumno para una correccion formativa completa.</p>
                <label style={lbl}>RUBRICA *</label>
                <textarea style={Object.assign({}, inp, { height:155, resize:"vertical", marginBottom:12 })} value={corrR} onChange={function(e) { setCorrR(e.target.value); }} placeholder="Pega la rubrica aqui..." />
                {library.filter(function(i) { return i.type === "rubrica"; }).length > 0 && (
                  <div style={{ marginBottom:12 }}>
                    <label style={lbl}>O CARGA UNA DE LA BIBLIOTECA</label>
                    <select style={Object.assign({}, sel, { width:"100%" })} onChange={function(e) { var it = library.find(function(i) { return i.id === e.target.value; }); if (it) setCorrR(it.content); }}>
                      <option value="">Seleccionar rubrica guardada</option>
                      {library.filter(function(i) { return i.type === "rubrica"; }).map(function(r) { return <option key={r.id} value={r.id}>{r.topic + " (" + new Date(r.created_at).toLocaleDateString("es-AR") + ")"}</option>; })}
                    </select>
                  </div>
                )}
                <label style={lbl}>TRABAJO DEL ALUMNO *</label>
                <textarea style={Object.assign({}, inp, { height:175, resize:"vertical", marginBottom:18 })} value={corrW} onChange={function(e) { setCorrW(e.target.value); }} placeholder="Pega el texto del trabajo practico..." />
                <Btn onClick={correctTP} disabled={corrLoading || !corrR.trim() || !corrW.trim()}>{corrLoading ? "Corrigiendo..." : <><i className="ti ti-checklist" style={{fontSize:13,marginRight:4}} />Corregir Trabajo Practico</>}</Btn>
              </div>
              <div>
                {corrLoading && <div style={card}><Spin /></div>}
                {corrResult && !corrLoading ? (
                  <div style={card}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                      <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:.8 }}>CORRECCION GENERADA</div>
                      <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { saveLib(corrResult, "correccion", "Correccion de TP", "Correccion " + new Date().toLocaleDateString("es-AR")); }}><i className="ti ti-device-floppy" style={{fontSize:14,marginRight:4}} /> Guardar</Btn>
                    </div>
                    <MDView text={corrResult} maxH={640} />
                  </div>
                ) : !corrLoading && (
                  <div style={Object.assign({}, card, { textAlign:"center", padding:"56px 24px", color:C.textDim })}>
                    <div style={{ marginBottom:12 }}><i className="ti ti-checklist" style={{fontSize:44, color:C.textDim}} /></div>
                    <h3 style={{ color:C.textMuted, marginBottom:8 }}>La correccion aparecera aqui</h3>
                    <p style={{ fontSize:13 }}>Evaluacion por criterio · Calificacion · Fortalezas · Mejoras · Devolucion al alumno</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LIBRARY */}
          {!dataLoading && view === "library" && (
            <div>
              <div style={{ display:"flex", gap:12, marginBottom:18, flexWrap:"wrap", alignItems:"center" }}>
                <h2 style={{ margin:0, fontSize:19, fontWeight:700, flex:1, color:C.text, display:"flex", alignItems:"center", gap:8 }}><i className="ti ti-books" style={{fontSize:18, color:C.accent}} />{"Biblioteca (" + library.length + ")"}</h2>
                {library.length > 0 && <Btn v="secondary" st={{ fontSize:12, padding:"5px 14px" }} onClick={function() { exportZip(library); }}><i className="ti ti-archive" style={{fontSize:13,marginRight:4}} /> Exportar todo (.zip)</Btn>}
                <input style={Object.assign({}, inp, { width:185 })} value={libSearch} onChange={function(e) { setLibSearch(e.target.value); }} placeholder="Buscar..." />
                <select style={sel} value={libFilter} onChange={function(e) { setLibFilter(e.target.value); }}>
                  <option value="all">Todos</option>
                  {GEN_TYPES.map(function(g) { return <option key={g.id} value={g.id}>{g.label}</option>; })}
                  {MM_TYPES.map(function(m) { return <option key={m.id} value={m.id}>{m.label}</option>; })}
                  <option value="correccion">Correcciones</option>
                </select>
              </div>
              {libItem ? (
                <div>
                  <Btn v="ghost" st={{ marginBottom:14, fontSize:12 }} onClick={function() { setLibItem(null); }}><i className="ti ti-arrow-left" style={{fontSize:13,marginRight:4}} />Volver</Btn>
                  <div style={card}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
                      <div>
                        <div style={{ fontSize:12, color:C.textDim, marginBottom:4 }}>{libItem.type_name + " · " + libItem.subject_name + " · " + new Date(libItem.created_at).toLocaleDateString("es-AR")}</div>
                        <h2 style={{ margin:0, fontSize:19, fontWeight:700, color:C.text }}>{libItem.topic}</h2>
                      </div>
                      <div style={{ display:"flex", gap:8 }}>
                        <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { exportDocx(libItem.topic, libItem.type_name, libItem.subject_name, libItem.content); }}><i className="ti ti-file-text" style={{fontSize:13,marginRight:4}} />Word</Btn>
                        <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { exportPdf(libItem.topic, libItem.type_name, libItem.subject_name, libItem.content); }}><i className="ti ti-file-invoice" style={{fontSize:13,marginRight:4}} />PDF</Btn>
                        <Btn v="danger" onClick={function() { delLib(libItem.id); }}>Eliminar</Btn>
                      </div>
                    </div>
                    <MDView text={libItem.content} maxH={680} />
                  </div>
                </div>
              ) : !filtLib.length ? (
                <div style={Object.assign({}, card, { textAlign:"center", padding:"52px 24px", color:C.textDim })}>
                  <div style={{ marginBottom:10 }}><i className="ti ti-books" style={{ fontSize:36, color:C.textDim }} /></div>
                  <p>{!library.length ? "Tu biblioteca esta vacia. Genera contenido y guardalo aqui." : "Sin resultados."}</p>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(258px,1fr))", gap:12 }}>
                  {filtLib.map(function(item) {
                    var g = GEN_TYPES.find(function(g) { return g.id === item.type; }) || MM_TYPES.find(function(m) { return m.id === item.type; });
                    return (
                      <div key={item.id} style={{ background:C.card, border:"1px solid #243350", borderRadius:12, padding:16, cursor:"pointer" }} onClick={function() { setLibItem(item); }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                          <i className={"ti " + (g ? g.icon : "ti-file")} style={{ fontSize:20, color:g ? g.color : C.textMuted }} />
                          <button style={{ background:"transparent", border:"none", cursor:"pointer", color:C.red, fontSize:15 }} onClick={function(e) { e.stopPropagation(); delLib(item.id); }}><i className="ti ti-trash" style={{fontSize:15}} /></button>
                        </div>
                        <Tag color={g ? g.color : C.textMuted}>{item.type_name}</Tag>
                        <div style={{ fontWeight:600, color:C.text, fontSize:14, marginTop:8, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.topic}</div>
                        <div style={{ fontSize:12, color:C.textDim, marginTop:3 }}>{(item.subject_name || "") + " · " + new Date(item.created_at).toLocaleDateString("es-AR")}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* BANK */}
          {!dataLoading && view === "bank" && (
            <div>
              <h2 style={{ fontSize:19, fontWeight:700, marginBottom:18, color:C.text, display:"flex", alignItems:"center", gap:8 }}><i className="ti ti-database" style={{fontSize:18, color:C.accent}} />{"Banco de Preguntas (" + bank.length + ")"}</h2>
              {!bank.length ? (
                <div style={Object.assign({}, card, { textAlign:"center", padding:"52px 24px", color:C.textDim })}>
                  <div style={{ fontSize:36, marginBottom:10 }}><i className="ti ti-database" style={{fontSize:14,marginRight:4}} /></div>
                  <p>El banco esta vacio. Genera evaluaciones o rubricas y guardalas aqui.</p>
                </div>
              ) : bank.map(function(item) {
                return (
                  <div key={item.id} style={card}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:15, color:C.text, marginBottom:2 }}>{item.topic}</div>
                        <div style={{ fontSize:12, color:C.textDim }}>{(item.subject_name || "") + " · " + new Date(item.created_at).toLocaleDateString("es-AR")}</div>
                      </div>
                      <Btn v="danger" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { delBank(item.id); }}>Eliminar</Btn>
                    </div>
                    <MDView text={item.content.slice(0, 900) + (item.content.length > 900 ? "..." : "")} maxH={280} />
                  </div>
                );
              })}
            </div>
          )}
{/* PRICING */}
          {view === "pricing" && (
            <PricingPanel authUser={authUser} />
          )}
{/* ADMIN PANEL */}
          {!dataLoading && view === "admin" && (
            <AdminPanel authUser={authUser} supabaseClient={supabase} />
          )}

          {/* PUBLIC LIBRARY */}
          {!dataLoading && view === "publiclib" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                <h2 style={{ fontSize:19, fontWeight:700, color:C.text, margin:0, display:"flex", alignItems:"center", gap:8 }}><i className="ti ti-world" style={{fontSize:18, color:C.accent}} />{"Biblioteca Publica (" + publicLib.length + ")"}</h2>
                <span style={{ fontSize:13, color:C.textMuted }}>Contenido compartido por docentes de la plataforma</span>
              </div>
              {!publicLib.length ? (
                <div style={Object.assign({}, card, { textAlign:"center", padding:"52px 24px", color:C.textDim })}>
                  <div style={{ fontSize:36, marginBottom:10 }}><i className="ti ti-world" style={{fontSize:14,marginRight:4}} /> </div>
                  <p>La biblioteca publica esta vacia. Se el primero en compartir contenido.</p>
                  <p style={{ fontSize:12, marginTop:8 }}>Despues de guardar en el Generador, haz click en el boton Compartir.</p>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
                  {publicLib.map(function(item) {
                    var g = GEN_TYPES.find(function(g) { return g.id === item.type; }) || MM_TYPES.find(function(m) { return m.id === item.type; });
                    return (
                      <div key={item.id} style={{ background:C.card, border:"1px solid #243350", borderRadius:12, padding:16 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                          <i className={"ti " + (g ? g.icon : "ti-file")} style={{ fontSize:20, color:g ? g.color : C.textMuted }} />
                          {authUser && item.user_id === authUser.id && (
                            <button style={{ background:"transparent", border:"none", cursor:"pointer", color:C.red, fontSize:14 }}
                              onClick={async function() { await dbDelPublicItem(item.id); var pub = await dbLoadPublicLib(); setPublicLib(pub); }}><i className="ti ti-trash" style={{fontSize:15}} /></button>
                          )}
                        </div>
                        <Tag color={g ? g.color : C.textMuted}>{item.type_name}</Tag>
                        <div style={{ fontWeight:600, color:C.text, fontSize:14, marginTop:8, marginBottom:4 }}>{item.topic}</div>
                        <div style={{ fontSize:12, color:C.textDim, marginBottom:10 }}>{(item.subject_name || "") + " · " + (item.level || "") + " · Por " + (item.user_name || "Docente")}</div>
                        <div style={{ fontSize:12, color:C.textDim, marginBottom:12 }}>{new Date(item.created_at).toLocaleDateString("es-AR")}</div>
                        <div style={{ display:"flex", gap:8 }}>
                          <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px", flex:1 }} onClick={function() { saveLib(item.content, item.type, item.type_name, item.topic); }}>
                            <><i className="ti ti-device-floppy" style={{fontSize:13,marginRight:4}} />Guardar</>
                          </Btn>
                          <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { exportDocx(item.topic, item.type_name, item.subject_name || "", item.content); }}><i className="ti ti-file-text" style={{fontSize:15}} /></Btn>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* SUBJECT MODAL */}
      {subjModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}>
          <div style={{ background:C.card, border:"1px solid #243350", borderRadius:16, padding:26, width:488, maxWidth:"92vw" }}>
            <h2 style={{ margin:"0 0 18px", fontSize:19, fontWeight:700, color:C.text }}>Nueva Materia</h2>
            <label style={lbl}>NOMBRE *</label>
            <input style={Object.assign({}, inp, { marginBottom:13 })} value={sf.name} onChange={function(e) { setSf(Object.assign({}, sf, { name:e.target.value })); }} placeholder="Ej: Biologia, Historia, Matematica II..." autoFocus />
            <label style={lbl}>NIVEL</label>
            <select style={Object.assign({}, sel, { width:"100%", marginBottom:13 })} value={sf.level} onChange={function(e) { setSf(Object.assign({}, sf, { level:e.target.value })); }}>
              {LEVELS.map(function(l) { return <option key={l}>{l}</option>; })}
            </select>
            <label style={lbl}>PROGRAMA / MATERIALES (muy recomendado)</label>
            <p style={{ fontSize:12, color:C.textDim, margin:"0 0 6px" }}>Pega el programa o contenidos. Permite que Claude genere material ajustado a tu materia real.</p>
            <textarea style={Object.assign({}, inp, { height:118, resize:"vertical", marginBottom:20 })} value={sf.materials} onChange={function(e) { setSf(Object.assign({}, sf, { materials:e.target.value })); }} placeholder="Pega programa, objetivos, unidades tematicas, bibliografia..." />
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <Btn v="ghost" st={{ fontSize:13 }} onClick={function() { setSubjModal(false); }}>Cancelar</Btn>
              <Btn onClick={addSubject} disabled={!sf.name.trim()}><i className="ti ti-plus" style={{fontSize:13,marginRight:4}} />Crear Materia</Btn>
            </div>
          </div>
        </div>
      )}

      <style>{"*{box-sizing:border-box}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#243350;border-radius:3px}select option{background:#1a2640}"}</style>
    </div>
  );
}
