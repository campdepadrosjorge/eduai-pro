import { useState, useEffect, useRef } from "react";
import supabase from "./supabase.js";
import { exportDocx, exportPdf, exportZip } from "./exportUtils.js";

// ── CONSTANTS ────────────────────────────────────────────────────────────────

const NAV = [
  { id:"dashboard",  label:"Inicio",             icon:"🏠" },
  { id:"generator",  label:"Generador IA",        icon:"⚡" },
  { id:"multimedia", label:"Multimedia",          icon:"🎨" },
  { id:"chat",       label:"Chat Docente",        icon:"💬" },
  { id:"corrector",  label:"Corrector de TPs",    icon:"✅" },
  { id:"library",    label:"Biblioteca",          icon:"📚" },
  { id:"bank",       label:"Banco de Preguntas",  icon:"🏦" },
  { id:"publiclib",  label:"Biblioteca Publica",  icon:"🌐" },
];

const GEN_TYPES = [
  { id:"planclase",    label:"Plan de Clase",              icon:"📅", color:"#3b82f6" },
  { id:"actividad",   label:"Actividad Didactica",         icon:"🎯", color:"#10b981" },
  { id:"rubrica",     label:"Rubrica de Evaluacion",       icon:"📊", color:"#f59e0b" },
  { id:"evaluacion",  label:"Evaluacion / Examen",         icon:"📝", color:"#a78bfa" },
  { id:"material",    label:"Material Didactico",          icon:"📖", color:"#06b6d4" },
  { id:"presentacion",label:"Esquema de Presentacion",     icon:"🖥️", color:"#f97316" },
  { id:"guia",        label:"Guia de Estudio",             icon:"🗺️", color:"#84cc16" },
  { id:"adaptado",    label:"Contenido Adaptado (NEE)",    icon:"💙", color:"#ec4899" },
];

const MM_TYPES = [
  { id:"podcast",             label:"Guion de Podcast",          icon:"🎙️", desc:"Episodio educativo completo" },
  { id:"infografia",          label:"Estructura de Infografia",  icon:"📊", desc:"Layout para Canva" },
  { id:"video_script",        label:"Guion de Video",            icon:"🎬", desc:"Con descripcion visual" },
  { id:"presentacion_visual", label:"Presentacion Visual",       icon:"✨", desc:"Slide por slide" },
  { id:"imagen_ia",           label:"Generador de Imagenes IA",  icon:"🖼️", desc:"Imagenes con IA" },
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
    presentacion:"Esquema de presentacion sobre: \"" + topic + "\" | Dificultad: " + diff + "\n\n12-15 slides. Para cada una: N, titulo, tipo de layout, contenido exacto, elemento visual sugerido, notas del orador. Ademas: narrativa general, actividad interactiva, tips de diseno." + e,
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

async function dbDelBankItem(id) {
  const result = await supabase.from("question_bank").delete().eq("id", id);
  if (result.error) throw result.error;
}

// ── DESIGN ────────────────────────────────────────────────────────────────────

const C = {
  bg:"#0c1220", surf:"#111827", card:"#1a2640", border:"#243350",
  accent:"#f59e0b", accentBg:"#1c1408",
  text:"#e8edf5", textMuted:"#7a90b0", textDim:"#4a5a75",
  blue:"#3b82f6", green:"#10b981", purple:"#a78bfa", red:"#f87171",
};

const inp = { background:C.bg, border:"1px solid #243350", borderRadius:8, padding:"9px 13px", color:C.text, fontSize:14, width:"100%", outline:"none", fontFamily:"inherit" };
const sel = { background:C.bg, border:"1px solid #243350", borderRadius:8, padding:"9px 13px", color:C.text, fontSize:13, outline:"none", fontFamily:"inherit" };
const lbl = { fontSize:11, color:C.textMuted, marginBottom:5, display:"block", fontWeight:700, letterSpacing:.6 };
const card = { background:C.card, border:"1px solid #243350", borderRadius:12, padding:"18px 20px", marginBottom:16 };

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
  var css = ".md h1{color:#fbbf24;font-size:1.28em;font-weight:700;margin:1.2em 0 .4em;border-bottom:1px solid #243350;padding-bottom:.2em}" +
    ".md h2{color:#f59e0b;font-size:1.1em;font-weight:700;margin:1.1em 0 .35em;border-bottom:1px solid #1a2640;padding-bottom:.15em}" +
    ".md h3{color:#fcd34d;font-size:1em;font-weight:600;margin:.95em 0 .28em}" +
    ".md h4{color:#d97706;font-size:.93em;font-weight:600;margin:.85em 0 .22em}" +
    ".md strong{color:#fef3c7;font-weight:700}.md em{color:#bfdbfe}" +
    ".md code{background:#0c1220;padding:2px 6px;border-radius:4px;font-size:.82em;font-family:monospace;color:#86efac}" +
    ".md ul{margin:.35em 0 .35em 1.3em;list-style:disc}.md ol{margin:.35em 0 .35em 1.3em;list-style:decimal}" +
    ".md li{margin:.22em 0;color:#cbd5e1;line-height:1.6}.md p{color:#cbd5e1;margin:.45em 0;line-height:1.7}" +
    ".md hr{border:none;border-top:1px solid #243350;margin:.9em 0}" +
    ".md table{border-collapse:collapse;width:100%;margin:.7em 0;font-size:.87em}" +
    ".md th{background:#1a2640;color:#f59e0b;padding:6px 10px;border:1px solid #334155;font-weight:600;text-align:left}" +
    ".md td{padding:5px 10px;border:1px solid #243350;color:#cbd5e1;vertical-align:top}" +
    ".md tr:nth-child(even) td{background:#1a2640}" +
    ".md blockquote{border-left:3px solid #f59e0b;margin:.5em 0;padding:.35em .75em;background:#1a2640;color:#94a3b8;border-radius:0 6px 6px 0}" +
    ".md pre{background:#0c1220;padding:11px;border-radius:7px;overflow-x:auto;font-family:monospace;font-size:.82em;color:#86efac;margin:.5em 0}";

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
    <div style={{ background:"#0c1220", borderRadius:8, padding:"15px 19px", maxHeight:maxH, overflow:"auto", lineHeight:1.75, fontSize:14, fontFamily:"Arial,sans-serif" }}>
      <style>{css}</style>
      <div className="md"><p dangerouslySetInnerHTML={{ __html:h }}/></div>
    </div>
  );
}

// ── AUTH SCREEN ───────────────────────────────────────────────────────────────

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
        <div style={{ fontSize:52, marginBottom:16 }}>📬</div>
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
          <div style={{ fontSize:52, marginBottom:12 }}>🎓</div>
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
      var data;
      try { data = await res.json(); } catch { throw new Error("Error del servidor. Intenta de nuevo."); }
      if (!res.ok) throw new Error(data.error || "Error al generar imagen.");
      setImgUrl(data.url);
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
      var data;
      try { data = await res.json(); } catch { throw new Error("Error del servidor. Intenta de nuevo."); }
      if (!res.ok) throw new Error(data.error || "Error al generar imagen.");
      setActImgUrl(data.url);
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
      <div style={{ fontSize:38 }}>🎓</div>
      <div style={{ color:C.textMuted, fontSize:14 }}>Cargando EduAI Pro...</div>
    </div>
  );

  if (!authUser) return <AuthScreen onAuth={setAuthUser} />;

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

      <div style={{ width:bar?218:56, minWidth:bar?218:56, background:C.surf, borderRight:"1px solid #243350", display:"flex", flexDirection:"column", transition:"all .22s", overflow:"hidden" }}>
        <div style={{ padding:"14px 10px 12px", borderBottom:"1px solid #243350", display:"flex", alignItems:"center", gap:8 }}>
          <button style={{ background:"none", border:"none", cursor:"pointer", color:C.accent, fontSize:17, minWidth:26, fontFamily:"inherit" }} onClick={function() { setBar(!bar); }}>{bar ? "◁" : "▷"}</button>
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
              <div key={n.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 11px", cursor:"pointer", borderRadius:8, margin:"2px 6px", background:view===n.id?"#1d3d7a":"transparent", color:view===n.id?"#93c5fd":C.textMuted, fontSize:13, whiteSpace:"nowrap", overflow:"hidden" }}
                onClick={function() { setView(n.id); }}>
                <span style={{ fontSize:17, minWidth:24, textAlign:"center" }}>{n.icon}</span>
                {bar && <span>{n.label}</span>}
              </div>
            );
          })}
        </nav>
        <div style={{ padding:"10px 12px", borderTop:"1px solid #243350" }}>
          {bar ? (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:11, color:C.textDim, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{"👤 " + userName}</div>
              <button style={{ background:"transparent", border:"none", cursor:"pointer", color:C.textDim, fontSize:11, fontFamily:"inherit" }} onClick={signOut}>Salir</button>
            </div>
          ) : (
            <button style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:16, width:"100%", textAlign:"center" }} onClick={signOut} title="Cerrar sesion">🚪</button>
          )}
        </div>
      </div>

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
        <div style={{ background:C.surf, borderBottom:"1px solid #243350", padding:"10px 22px", display:"flex", alignItems:"center", gap:14, minHeight:54 }}>
          <h1 style={{ margin:0, fontSize:16, fontWeight:700, flex:1, color:C.text }}>
            {(NAV.find(function(n) { return n.id === view; }) || {}).icon} {(NAV.find(function(n) { return n.id === view; }) || {}).label}
          </h1>
          {curSubj && <div style={{ fontSize:12, color:C.textMuted, background:C.bg, padding:"4px 12px", borderRadius:20, border:"1px solid #243350" }}>{"📖 " + curSubj.name}</div>}
          <Btn v="accent" st={{ padding:"5px 13px", fontSize:12 }} onClick={function() { setSubjModal(true); }}>+ Materia</Btn>
        </div>

        <div style={{ flex:1, overflow:"auto", padding:"20px 26px" }}>

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
                <Btn onClick={function() { setSubjModal(true); }}>+ Nueva Materia</Btn>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
                {[{l:"Materias",v:subjects.length,i:"📚",c:C.blue},{l:"Biblioteca",v:library.length,i:"💾",c:C.green},{l:"Banco",v:bank.length,i:"🏦",c:C.accent},{l:"Biblioteca Publica",v:publicLib.length,i:"🌐",c:C.purple}].map(function(x) {
                  return (
                    <div key={x.l} style={{ background:C.card, border:"1px solid #243350", borderRadius:12, padding:"15px 18px" }}>
                      <div style={{ fontSize:24, marginBottom:8 }}>{x.i}</div>
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
                    <div style={{ fontSize:34, marginBottom:10 }}>📚</div>
                    <p style={{ marginBottom:14 }}>Todavia no tenes materias. Crea la primera para empezar.</p>
                    <Btn onClick={function() { setSubjModal(true); }}>Crear mi primera materia</Btn>
                  </div>
                ) : (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
                    {subjects.map(function(sub) {
                      return (
                        <div key={sub.id} style={{ background:C.bg, border:"2px solid " + (curSid === sub.id ? C.accent : C.border), borderRadius:10, padding:14, cursor:"pointer" }}
                          onClick={function() { setCurSid(sub.id); }}>
                          <div style={{ fontSize:22, marginBottom:7 }}>📖</div>
                          <div style={{ fontWeight:700, color:C.text, marginBottom:2, fontSize:14 }}>{sub.name}</div>
                          <div style={{ fontSize:12, color:C.textDim, marginBottom:sub.materials?5:10 }}>{sub.level}</div>
                          {sub.materials && <div style={{ fontSize:11, color:C.green, marginBottom:10 }}>Con programa cargado</div>}
                          <div style={{ display:"flex", gap:6 }}>
                            <Btn v="sm" onClick={function(e) { e.stopPropagation(); setCurSid(sub.id); setView("generator"); }}>Generar</Btn>
                            <Btn v="ghost" st={{ padding:"5px 9px", fontSize:12 }} onClick={function(e) { e.stopPropagation(); delSubject(sub.id); }}>🗑</Btn>
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
                  {[{v:"generator",i:"⚡",l:"Generador IA",c:C.accent},{v:"chat",i:"💬",l:"Chat Docente",c:C.blue},{v:"multimedia",i:"🎨",l:"Multimedia",c:C.green},{v:"corrector",i:"✅",l:"Corrector TPs",c:C.purple}].map(function(x) {
                    return (
                      <button key={x.v} style={{ background:C.bg, border:"1px solid #243350", borderRadius:10, padding:"13px 8px", cursor:"pointer", textAlign:"center", fontFamily:"inherit" }}
                        onClick={function() { setView(x.v); }}>
                        <div style={{ fontSize:24, marginBottom:5 }}>{x.i}</div>
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
                        <span style={{ fontSize:16 }}>{g.icon}</span>
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
                    <span style={{ fontSize:30 }}>{gt ? gt.icon : ""}</span>
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
                          {genLoading ? "Generando..." : "Generar " + (gt ? gt.label : "")}
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
                            🌐 Compartir
                          </Btn>
                        )}
                        {genSaved
                          ? <span style={{ color:C.green, fontSize:12, fontWeight:700 }}>Guardado</span>
                          : (
                            <div style={{ display:"flex", gap:8 }}>
                              <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { saveLib(genResult, genType, gt ? gt.label : "", genTopic); }}>💾 Biblioteca</Btn>
                              {(genType==="evaluacion"||genType==="rubrica") && <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { saveBank(genResult, genTopic); }}>🏦 Banco</Btn>}
                            </div>
                          )
                        }
                        <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { exportDocx(genTopic, gt ? gt.label : "", curSubj ? curSubj.name : "", genResult); }}>📄 Word</Btn>
                        {(genType==="evaluacion"||genType==="rubrica"||genType==="planclase") && (
                          <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { exportPdf(genTopic, gt ? gt.label : "", curSubj ? curSubj.name : "", genResult); }}>📋 PDF</Btn>
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
                          <Btn v="primary" st={{ fontSize:13, padding:"8px 18px" }}>Abrir en MakeCode</Btn>
                        </a>
                      </div>
                    )}
                    <div style={{ marginTop:16 }}>
                      <label style={lbl}>DESCRIPCION DE LA IMAGEN (opcional)</label>
                      <input style={Object.assign({}, inp, { marginBottom:10 })} value={actImgDesc} onChange={function(e) { setActImgDesc(e.target.value); }} placeholder="Ej: bloques de MakeCode mostrando un loop con LED encendido, fondo blanco" />
                    </div>
                    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                      <Btn v="secondary" st={{ fontSize:12, padding:"5px 14px" }} onClick={generateActivityImage} disabled={actImgLoad}>
                        {actImgLoad ? "Generando imagen..." : "Generar imagen ilustrativa"}
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
                            <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }}>Descargar</Btn>
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
                    <span style={{ fontSize:28 }}>{mt ? mt.icon : ""}</span>
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
                          ? <Btn onClick={generateImage} disabled={imgLoading || !mmTopic.trim()}>{imgLoading ? "Generando imagen..." : "Generar Imagen"}</Btn>
                          : <Btn onClick={generateMM} disabled={mmLoading || !mmTopic.trim()}>{mmLoading ? "Generando..." : "Generar Contenido"}</Btn>
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
                            <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }}>Descargar PNG</Btn>
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
                            <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { saveLib(mmResult, mmType, mt ? mt.label : "", mmTopic); }}>💾 Biblioteca</Btn>
                            <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { exportDocx(mmTopic, mt ? mt.label : "", curSubj ? curSubj.name : "", mmResult); }}>📄 Word</Btn>
                            <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { exportPdf(mmTopic, mt ? mt.label : "", curSubj ? curSubj.name : "", mmResult); }}>📋 PDF</Btn>
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
                    <Btn v="ghost" st={{ padding:"5px 11px", fontSize:12 }} onClick={function() { setChatMsgs([]); }}>Limpiar</Btn>
                  </div>
                </div>
                <div style={Object.assign({}, card, { flex:1, overflow:"auto", padding:"14px 18px", minHeight:0 })}>
                  {!chatMsgs.length ? (
                    <div style={{ textAlign:"center", padding:"28px 0", color:C.textDim }}>
                      <div style={{ fontSize:36, marginBottom:10 }}>💬</div>
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
                        <div style={{ maxWidth:"82%", background:m.role==="user"?"#1d3d7a":C.card, borderRadius:12, padding:"10px 14px" }}>
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
                  <Btn onClick={sendChat} disabled={chatLoading || !chatIn.trim()} st={{ padding:"10px 22px" }}>Enviar</Btn>
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
                <Btn onClick={correctTP} disabled={corrLoading || !corrR.trim() || !corrW.trim()}>{corrLoading ? "Corrigiendo..." : "Corregir Trabajo Practico"}</Btn>
              </div>
              <div>
                {corrLoading && <div style={card}><Spin /></div>}
                {corrResult && !corrLoading ? (
                  <div style={card}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                      <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:.8 }}>CORRECCION GENERADA</div>
                      <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { saveLib(corrResult, "correccion", "Correccion de TP", "Correccion " + new Date().toLocaleDateString("es-AR")); }}>💾 Guardar</Btn>
                    </div>
                    <MDView text={corrResult} maxH={640} />
                  </div>
                ) : !corrLoading && (
                  <div style={Object.assign({}, card, { textAlign:"center", padding:"56px 24px", color:C.textDim })}>
                    <div style={{ fontSize:44, marginBottom:12 }}>📋</div>
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
                <h2 style={{ margin:0, fontSize:19, fontWeight:700, flex:1, color:C.text }}>{"📚 Biblioteca (" + library.length + ")"}</h2>
                {library.length > 0 && <Btn v="secondary" st={{ fontSize:12, padding:"5px 14px" }} onClick={function() { exportZip(library); }}>📦 Exportar todo (.zip)</Btn>}
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
                  <Btn v="ghost" st={{ marginBottom:14, fontSize:12 }} onClick={function() { setLibItem(null); }}>Volver a la lista</Btn>
                  <div style={card}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
                      <div>
                        <div style={{ fontSize:12, color:C.textDim, marginBottom:4 }}>{libItem.type_name + " · " + libItem.subject_name + " · " + new Date(libItem.created_at).toLocaleDateString("es-AR")}</div>
                        <h2 style={{ margin:0, fontSize:19, fontWeight:700, color:C.text }}>{libItem.topic}</h2>
                      </div>
                      <div style={{ display:"flex", gap:8 }}>
                        <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { exportDocx(libItem.topic, libItem.type_name, libItem.subject_name, libItem.content); }}>📄 Word</Btn>
                        <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { exportPdf(libItem.topic, libItem.type_name, libItem.subject_name, libItem.content); }}>📋 PDF</Btn>
                        <Btn v="danger" onClick={function() { delLib(libItem.id); }}>Eliminar</Btn>
                      </div>
                    </div>
                    <MDView text={libItem.content} maxH={680} />
                  </div>
                </div>
              ) : !filtLib.length ? (
                <div style={Object.assign({}, card, { textAlign:"center", padding:"52px 24px", color:C.textDim })}>
                  <div style={{ fontSize:36, marginBottom:10 }}>📚</div>
                  <p>{!library.length ? "Tu biblioteca esta vacia. Genera contenido y guardalo aqui." : "Sin resultados."}</p>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(258px,1fr))", gap:12 }}>
                  {filtLib.map(function(item) {
                    var g = GEN_TYPES.find(function(g) { return g.id === item.type; }) || MM_TYPES.find(function(m) { return m.id === item.type; });
                    return (
                      <div key={item.id} style={{ background:C.card, border:"1px solid #243350", borderRadius:12, padding:16, cursor:"pointer" }} onClick={function() { setLibItem(item); }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                          <span style={{ fontSize:22 }}>{g ? g.icon : "📄"}</span>
                          <button style={{ background:"transparent", border:"none", cursor:"pointer", color:C.red, fontSize:15 }} onClick={function(e) { e.stopPropagation(); delLib(item.id); }}>🗑</button>
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
              <h2 style={{ fontSize:19, fontWeight:700, marginBottom:18, color:C.text }}>{"🏦 Banco de Preguntas (" + bank.length + ")"}</h2>
              {!bank.length ? (
                <div style={Object.assign({}, card, { textAlign:"center", padding:"52px 24px", color:C.textDim })}>
                  <div style={{ fontSize:36, marginBottom:10 }}>🏦</div>
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

          {/* PUBLIC LIBRARY */}
          {!dataLoading && view === "publiclib" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                <h2 style={{ fontSize:19, fontWeight:700, color:C.text, margin:0 }}>{"🌐 Biblioteca Publica (" + publicLib.length + ")"}</h2>
                <span style={{ fontSize:13, color:C.textMuted }}>Contenido compartido por docentes de la plataforma</span>
              </div>
              {!publicLib.length ? (
                <div style={Object.assign({}, card, { textAlign:"center", padding:"52px 24px", color:C.textDim })}>
                  <div style={{ fontSize:36, marginBottom:10 }}>🌐</div>
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
                          <span style={{ fontSize:22 }}>{g ? g.icon : "📄"}</span>
                          {authUser && item.user_id === authUser.id && (
                            <button style={{ background:"transparent", border:"none", cursor:"pointer", color:C.red, fontSize:14 }}
                              onClick={async function() { await dbDelPublicItem(item.id); var pub = await dbLoadPublicLib(); setPublicLib(pub); }}>🗑</button>
                          )}
                        </div>
                        <Tag color={g ? g.color : C.textMuted}>{item.type_name}</Tag>
                        <div style={{ fontWeight:600, color:C.text, fontSize:14, marginTop:8, marginBottom:4 }}>{item.topic}</div>
                        <div style={{ fontSize:12, color:C.textDim, marginBottom:10 }}>{(item.subject_name || "") + " · " + (item.level || "") + " · Por " + (item.user_name || "Docente")}</div>
                        <div style={{ fontSize:12, color:C.textDim, marginBottom:12 }}>{new Date(item.created_at).toLocaleDateString("es-AR")}</div>
                        <div style={{ display:"flex", gap:8 }}>
                          <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px", flex:1 }} onClick={function() { saveLib(item.content, item.type, item.type_name, item.topic); }}>
                            💾 Guardar en mi biblioteca
                          </Btn>
                          <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={function() { exportDocx(item.topic, item.type_name, item.subject_name || "", item.content); }}>📄</Btn>
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
              <Btn onClick={addSubject} disabled={!sf.name.trim()}>Crear Materia</Btn>
            </div>
          </div>
        </div>
      )}

      <style>{"*{box-sizing:border-box}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#243350;border-radius:3px}select option{background:#1a2640}"}</style>
    </div>
  );
}
