import { useState, useEffect, useRef } from "react";
import supabase from "./supabase.js";
import { exportDocx, exportPdf, exportZip } from "./exportUtils.js";

// ── CONSTANTS ────────────────────────────────────────────────────────────────

const NAV = [
  { id:"dashboard",  label:"Inicio",            icon:"🏠" },
  { id:"generator",  label:"Generador IA",       icon:"⚡" },
  { id:"multimedia", label:"Multimedia",         icon:"🎨" },
  { id:"chat",       label:"Chat Docente",       icon:"💬" },
  { id:"corrector",  label:"Corrector de TPs",   icon:"✅" },
  { id:"library",    label:"Biblioteca",         icon:"📚" },
  { id:"bank",       label:"Banco de Preguntas", icon:"🏦" },
];

const GEN_TYPES = [
  { id:"planclase",    label:"Plan de Clase",             icon:"📅", color:"#3b82f6" },
  { id:"actividad",   label:"Actividad Didáctica",        icon:"🎯", color:"#10b981" },
  { id:"rubrica",     label:"Rúbrica de Evaluación",      icon:"📊", color:"#f59e0b" },
  { id:"evaluacion",  label:"Evaluación / Examen",        icon:"📝", color:"#a78bfa" },
  { id:"material",    label:"Material Didáctico",         icon:"📖", color:"#06b6d4" },
  { id:"presentacion",label:"Esquema de Presentación",    icon:"🖥️", color:"#f97316" },
  { id:"guia",        label:"Guía de Estudio",            icon:"🗺️", color:"#84cc16" },
  { id:"adaptado",    label:"Contenido Adaptado (NEE)",   icon:"💙", color:"#ec4899" },
];

const MM_TYPES = [
  { id:"podcast",             label:"Guión de Podcast",         icon:"🎙️", desc:"Episodio educativo completo" },
  { id:"infografia",          label:"Estructura de Infografía", icon:"📊", desc:"Layout para Canva" },
  { id:"video_script",        label:"Guión de Video",           icon:"🎬", desc:"Con descripción visual" },
  { id:"imagen_prompt",       label:"Prompts para Imágenes IA", icon:"🖼️", desc:"Para DALL·E / Midjourney" },
  { id:"presentacion_visual", label:"Presentación Visual",      icon:"✨", desc:"Slide por slide" },
  { id:"imagen_ia",           label:"Generador de Imágenes IA", icon:"🖼️", desc:"Imágenes con DALL·E 3" },
];

const LEVELS = [
  "Inicial","Primario (1°-3°)","Primario (4°-6°)",
  "Secundario (1°-3°)","Secundario (4°-6°)",
  "Terciario / Universitario","Formación Docente","Capacitación Profesional",
];

// ── PROMPTS ──────────────────────────────────────────────────────────────────

function sysGen(type, subject, level, materials) {
  const ctx = `Materia: "${subject}" | Nivel: ${level}.${materials ? `\n\nPrograma:\n${materials}` : ""}`;
  const p = {
    planclase:    `Sos un experto en planificación curricular y didáctica. ${ctx}`,
    actividad:    `Sos un especialista en diseño instruccional y pedagogía activa. ${ctx}`,
    rubrica:      `Sos un experto en evaluación educativa y diseño de instrumentos. ${ctx}`,
    evaluacion:   `Sos un especialista en evaluación educativa y psicometría. ${ctx}`,
    material:     `Sos un experto en comunicación educativa y diseño de contenidos. ${ctx}`,
    presentacion: `Sos un especialista en comunicación visual y presentaciones educativas. ${ctx}`,
    guia:         `Sos un experto en aprendizaje autónomo y metacognición. ${ctx}`,
    adaptado:     `Sos un especialista en educación inclusiva y NEE. ${ctx}`,
  };
  return (p[type]||ctx) + "\n\nRespondé en español rioplatense con Markdown (##, ###, **, listas, tablas). Sé detallado y aplicable en el aula.";
}

function userGen(type, topic, diff, extra) {
  const e = extra ? `\n\nInstrucciones adicionales: ${extra}` : "";
  const m = {
    planclase:   `Plan de clase completo sobre: "${topic}" | Dificultad: ${diff}\n\nIncluí: datos del plan, 3-4 objetivos (verbos Bloom), contenidos conceptuales/procedimentales/actitudinales, recursos, secuencia didáctica detallada (inicio/desarrollo/cierre con tiempos y roles), evaluación formativa, tarea opcional, adaptaciones.${e}`,
    actividad:   `Actividad didáctica sobre: "${topic}" | Dificultad: ${diff}\n\nIncluí: título, objetivos, duración, materiales, desarrollo completo (inicio/desarrollo/cierre), consignas exactas para alumnos, criterios de evaluación, variantes.${topic.toLowerCase().includes("micro") || topic.toLowerCase().includes("makecode") || topic.toLowerCase().includes("bloque") || topic.toLowerCase().includes("programa") ? "\n\nIMPORTANTE: Al final de la actividad incluí una sección '## Código MakeCode' con el código JavaScript completo para micro:bit que los alumnos deben programar. El código debe estar en un bloque de código con triple backtick javascript y ser funcional en MakeCode." : ""}${e}`,
    rubrica:     `Rúbrica analítica para evaluar: "${topic}" | Dificultad: ${diff}\n\nIncluí: objetivo, tabla con 5-6 criterios, 4 niveles (Excelente/Satisfactorio/En proceso/Inicial), descriptores específicos y observables, puntaje, escala final, notas para el docente.${e}`,
    evaluacion:  `Evaluación completa sobre: "${topic}" | Dificultad: ${diff}\n\nIncluí: encabezado formal, Sección 1 (5 opción múltiple), Sección 2 (4 V/F con justificación), Sección 3 (3 respuesta breve), Sección 4 (1 desarrollo integrador), puntaje por sección, clave de respuestas.${e}`,
    material:    `Material didáctico sobre: "${topic}" | Dificultad: ${diff}\n\nIncluí: título, introducción motivadora, desarrollo por subtemas, definiciones clave, ejemplos reales, actividades integradas, síntesis, glosario (8-10 términos), recursos adicionales.${e}`,
    presentacion:`Esquema de presentación sobre: "${topic}" | Dificultad: ${diff}\n\n12-15 slides. Para cada una: N°, título, tipo de layout, contenido exacto, elemento visual sugerido, notas del orador. Además: narrativa general, actividad interactiva, tips de diseño.${e}`,
    guia:        `Guía de estudio sobre: "${topic}" | Dificultad: ${diff}\n\nIncluí: objetivos, mapa de conceptos, preguntas orientadoras, actividades de lectura activa, autoevaluación con respuestas, organizadores gráficos, estrategias de repaso, lista "Ya puedo...", recursos.${e}`,
    adaptado:    `Contenido adaptado (NEE) sobre: "${topic}" | Dificultad base: ${diff}\n\n4 versiones: 1) Dislexia, 2) TDAH, 3) Discapacidad Visual, 4) Altas Capacidades. Para cada versión: instrucciones paso a paso, estrategias docentes, indicadores de logro adaptados.${e}`,
  };
  return m[type]||`Contenido educativo sobre "${topic}". Dificultad: ${diff}.${e}`;
}

function userMM(type, topic, extra) {
  const e = extra ? `\n\nInstrucciones: ${extra}` : "";
  const m = {
    podcast:             `Guión completo de podcast educativo sobre "${topic}": título, duración, [INTRO] texto completo, [BLOQUE 1] contexto 3-4min, [BLOQUE 2] desarrollo 8-10min con subtemas, [BLOQUE 3] ejemplos, [ACTIVIDAD] reflexiva, [CIERRE] síntesis+CTA, notas de producción.${e}`,
    infografia:          `Estructura de infografía educativa sobre "${topic}": título impactante, tipo, 5+ secciones (título+contenido+ícono+visualización), paleta HEX, tipografías, flujo de lectura, instrucciones para Canva.${e}`,
    video_script:        `Guión de video sobre "${topic}" en formato [IMAGEN][VOZ][TEXTO EN PANTALLA]: duración, gancho (10 seg), pregunta disparadora, 3-4 bloques con tiempos, demostraciones, síntesis, CTA.${e}`,
    imagen_prompt:       `8 prompts de imágenes educativas sobre "${topic}": prompt inglés (detallado), traducción, propósito pedagógico, herramienta (DALL·E 3/Midjourney/Firefly), parámetros. Variedad: diagrama, ilustración, escena, mapa mental, timeline, comparativa.${e}`,
    presentacion_visual: `Guía visual de presentación sobre "${topic}" (15 slides): N°, título, layout, descripción visual, texto exacto (máx 40 palabras), animaciones, guión del presentador (60-90 palabras). Paleta 5 colores HEX, tipografías, tips.${e}`,
  };
  return m[type]||`Contenido multimedia educativo sobre "${topic}".${e}`;
}

// ── API CALL (vía Vercel proxy) ───────────────────────────────────────────────

async function callClaude(system, messages, maxTokens = 4000) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages, maxTokens }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  const data = await res.json();
  return data.content.filter(b => b.type === "text").map(b => b.text).join("");
}

// ── SUPABASE DATA LAYER ───────────────────────────────────────────────────────

async function dbLoadSubjects(userId) {
  const { data, error } = await supabase.from("subjects").select("*").eq("user_id", userId).order("created_at");
  if (error) throw error;
  return data || [];
}
async function dbAddSubject(userId, form) {
  const { data, error } = await supabase.from("subjects").insert({ user_id: userId, ...form }).select().single();
  if (error) throw error;
  return data;
}
async function dbDelSubject(id) {
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) throw error;
}
async function dbLoadLibrary(userId) {
  const { data, error } = await supabase.from("library_items").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function dbAddLibraryItem(userId, item) {
  const { error } = await supabase.from("library_items").insert({ user_id: userId, ...item });
  if (error) throw error;
}
async function dbDelLibraryItem(id) {
  const { error } = await supabase.from("library_items").delete().eq("id", id);
  if (error) throw error;
}
async function dbLoadBank(userId) {
  const { data, error } = await supabase.from("question_bank").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function dbAddBankItem(userId, item) {
  const { error } = await supabase.from("question_bank").insert({ user_id: userId, ...item });
  if (error) throw error;
}
async function dbDelBankItem(id) {
  const { error } = await supabase.from("question_bank").delete().eq("id", id);
  if (error) throw error;
}

// ── DESIGN ────────────────────────────────────────────────────────────────────

const C = {
  bg:"#0c1220", surf:"#111827", card:"#1a2640", border:"#243350",
  accent:"#f59e0b", accentBg:"#1c1408",
  text:"#e8edf5", textMuted:"#7a90b0", textDim:"#4a5a75",
  blue:"#3b82f6", green:"#10b981", purple:"#a78bfa", red:"#f87171",
};

const inp  = { background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 13px", color:C.text, fontSize:14, width:"100%", outline:"none", fontFamily:"inherit" };
const sel  = { background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 13px", color:C.text, fontSize:13, outline:"none", fontFamily:"inherit" };
const lbl  = { fontSize:11, color:C.textMuted, marginBottom:5, display:"block", fontWeight:700, letterSpacing:.6 };
const card = { background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"18px 20px", marginBottom:16 };

function Btn({ children, onClick, v="primary", disabled=false, st={} }) {
  const base = { padding:v==="sm"?"5px 11px":"9px 18px", borderRadius:8, cursor:disabled?"not-allowed":"pointer", fontWeight:600, fontSize:v==="sm"?12:13, fontFamily:"inherit", opacity:disabled?.45:1, transition:"opacity .15s", ...st };
  const vs = {
    primary:   { background:C.accent, color:"#000", border:"none" },
    secondary: { background:C.card, color:C.text, border:`1px solid ${C.border}` },
    ghost:     { background:"transparent", color:C.text, border:`1px solid ${C.border}` },
    danger:    { background:"#7f1d1d", color:"#fca5a5", border:"none" },
    accent:    { background:"transparent", color:C.accent, border:`1px solid ${C.accent}` },
  };
  return <button style={{ ...base, ...vs[v] }} onClick={disabled ? undefined : onClick}>{children}</button>;
}

function Spin() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"44px 0", gap:12 }}>
      <div style={{ width:34, height:34, border:`3px solid ${C.border}`, borderTop:`3px solid ${C.accent}`, borderRadius:"50%", animation:"spin 1s linear infinite" }} />
      <div style={{ color:C.textMuted, fontSize:13 }}>Claude está generando el contenido...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Tag({ children, color }) {
  return <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:color+"25", color, letterSpacing:.3 }}>{children}</span>;
}

// ── MARKDOWN ──────────────────────────────────────────────────────────────────

function MDView({ text, maxH=560 }) {
  const css = `.md h1{color:#fbbf24;font-size:1.28em;font-weight:700;margin:1.2em 0 .4em;border-bottom:1px solid #243350;padding-bottom:.2em}
.md h2{color:#f59e0b;font-size:1.1em;font-weight:700;margin:1.1em 0 .35em;border-bottom:1px solid #1a2640;padding-bottom:.15em}
.md h3{color:#fcd34d;font-size:1em;font-weight:600;margin:.95em 0 .28em}
.md h4{color:#d97706;font-size:.93em;font-weight:600;margin:.85em 0 .22em}
.md strong{color:#fef3c7;font-weight:700}.md em{color:#bfdbfe}
.md code{background:#0c1220;padding:2px 6px;border-radius:4px;font-size:.82em;font-family:monospace;color:#86efac}
.md ul{margin:.35em 0 .35em 1.3em;list-style:disc}.md ol{margin:.35em 0 .35em 1.3em;list-style:decimal}
.md li{margin:.22em 0;color:#cbd5e1;line-height:1.6}.md p{color:#cbd5e1;margin:.45em 0;line-height:1.7}
.md hr{border:none;border-top:1px solid #243350;margin:.9em 0}
.md table{border-collapse:collapse;width:100%;margin:.7em 0;font-size:.87em}
.md th{background:#1a2640;color:#f59e0b;padding:6px 10px;border:1px solid #334155;font-weight:600;text-align:left}
.md td{padding:5px 10px;border:1px solid #243350;color:#cbd5e1;vertical-align:top}
.md tr:nth-child(even) td{background:#1a2640}
.md blockquote{border-left:3px solid #f59e0b;margin:.5em 0;padding:.35em .75em;background:#1a2640;color:#94a3b8;border-radius:0 6px 6px 0}
.md pre{background:#0c1220;padding:11px;border-radius:7px;overflow-x:auto;font-family:monospace;font-size:.82em;color:#86efac;margin:.5em 0}`;

  let h = text
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/```[\w]*\n([\s\S]*?)```/g,(_,c)=>`<pre>${c}</pre>`)
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
    .replace(/^\|(.+)\|$/gm, line => {
      if (/^[\|\s\-:]+$/.test(line)) return "";
      const cells = line.split("|").filter((_,i,a)=>i>0&&i<a.length-1).map(c=>c.trim());
      return `<tr>${cells.map(c=>`<td>${c}</td>`).join("")}</tr>`;
    })
    .replace(/(<tr>[\s\S]*?<\/tr>\n?)+/g, m=>`<table>${m}</table>`)
    .replace(/^[\*\-] (.+)$/gm,"<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm,"<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, m=>`<ul>${m}</ul>`)
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
  const [mode, setMode]       = useState("login"); // login | register
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [name, setName]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true); setError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else onAuth(data.user);
    setLoading(false);
  }

  async function handleRegister() {
    if (!email || !password || !name) return;
    setLoading(true); setError("");
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name } },
    });
    if (error) { setError(error.message); }
    else if (data.user) { onAuth(data.user); }
    else { setError("Revisá tu email para confirmar el registro."); }
    setLoading(false);
  }

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:C.bg }}>
      <div style={{ width:420 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:52, marginBottom:12 }}>🎓</div>
          <h1 style={{ color:C.accent, fontSize:30, fontWeight:700, margin:"0 0 6px" }}>EduAI Pro</h1>
          <p style={{ color:C.textMuted, fontSize:15 }}>Tu asistente docente impulsado por Claude AI</p>
        </div>

        <div style={card}>
          {/* Tabs */}
          <div style={{ display:"flex", gap:4, marginBottom:22, background:C.bg, borderRadius:8, padding:4 }}>
            {[{id:"login",label:"Iniciar sesión"},{id:"register",label:"Registrarse"}].map(t=>(
              <button key={t.id} style={{ flex:1, padding:"7px 0", borderRadius:6, border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:600, fontSize:13, background:mode===t.id?C.card:"transparent", color:mode===t.id?C.text:C.textDim }} onClick={()=>{setMode(t.id);setError("");}}>
                {t.label}
              </button>
            ))}
          </div>

          {mode==="register" && (
            <>
              <label style={lbl}>NOMBRE</label>
              <input style={{ ...inp, marginBottom:12 }} value={name} onChange={e=>setName(e.target.value)} placeholder="Prof. García" />
            </>
          )}

          <label style={lbl}>EMAIL</label>
          <input style={{ ...inp, marginBottom:12 }} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="docente@escuela.edu.ar" />

          <label style={lbl}>CONTRASEÑA</label>
          <input style={{ ...inp, marginBottom:20 }} type="password" value={password} onChange={e=>setPass(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&(mode==="login"?handleLogin():handleRegister())}
            placeholder="Mínimo 6 caracteres" />

          {error && <div style={{ color:"#f87171", fontSize:13, background:"#1a0a0a", padding:"9px 13px", borderRadius:7, marginBottom:14 }}>{error}</div>}

          <Btn st={{ width:"100%", padding:"11px 20px", fontSize:14 }} disabled={loading} onClick={mode==="login"?handleLogin:handleRegister}>
            {loading ? "Procesando..." : mode==="login" ? "Entrar" : "Crear cuenta"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────

export default function EduAIPro() {
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [subjects, setSubjects]   = useState([]);
  const [curSid, setCurSid]       = useState(null);
  const [view, setView]           = useState("dashboard");
  const [bar, setBar]             = useState(true);
  const [subjModal, setSubjModal] = useState(false);
  const [sf, setSf]               = useState({ name:"", level:"Secundario (4°-6°)", materials:"" });
  const [library, setLibrary]     = useState([]);
  const [bank, setBank]           = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Generator
  const [genType,    setGenType]    = useState("planclase");
  const [genTopic,   setGenTopic]   = useState("");
  const [genLevel,   setGenLevel]   = useState("Secundario (4°-6°)");
  const [genDiff,    setGenDiff]    = useState("Intermedio");
  const [genExtra,   setGenExtra]   = useState("");
  const [genResult,  setGenResult]  = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genSaved,   setGenSaved]   = useState(false);
const [genErr,     setGenErr]     = useState("");
 const [actImgUrl,  setActImgUrl]  = useState(null);
  const [actImgLoad, setActImgLoad] = useState(false);
  const [actImgErr,  setActImgErr]  = useState("");
  const [actImgDesc, setActImgDesc] = useState("");
  const [makeCodeUrl, setMakeCodeUrl] = useState(null);

  // Multimedia
  const [mmType,    setMmType]    = useState("podcast");
  const [mmTopic,   setMmTopic]   = useState("");
  const [mmExtra,   setMmExtra]   = useState("");
  const [mmResult,  setMmResult]  = useState("");
  const [mmLoading, setMmLoading] = useState(false);
  const [imgUrl,    setImgUrl]    = useState(null);
  const [imgLoading,setImgLoading]= useState(false);
  const [imgError,  setImgError]  = useState("");

  // Chat
  const [chatSid,     setChatSid]     = useState(null);
  const [chatMsgs,    setChatMsgs]    = useState([]);
  const [chatIn,      setChatIn]      = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatRef = useRef(null);

  // Corrector
  const [corrR,       setCorrR]       = useState("");
  const [corrW,       setCorrW]       = useState("");
  const [corrResult,  setCorrResult]  = useState("");
  const [corrLoading, setCorrLoading] = useState(false);

  // Library
  const [libFilter, setLibFilter] = useState("all");
  const [libSearch, setLibSearch] = useState("");
  const [libItem,   setLibItem]   = useState(null);

  const curSubj = subjects.find(s => s.id === curSid) || null;

  // ── AUTH INIT ─────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user || null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── LOAD USER DATA ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authUser) return;
    setDataLoading(true);
    Promise.all([
      dbLoadSubjects(authUser.id),
      dbLoadLibrary(authUser.id),
      dbLoadBank(authUser.id),
    ]).then(([subs, lib, bk]) => {
      setSubjects(subs);
      setLibrary(lib);
      setBank(bk);
      if (subs.length) setCurSid(subs[0].id);
      setDataLoading(false);
    }).catch(() => setDataLoading(false));
  }, [authUser]);

  useEffect(() => { chatRef.current?.scrollIntoView({ behavior:"smooth" }); }, [chatMsgs]);

  async function signOut() {
    await supabase.auth.signOut();
    setSubjects([]); setLibrary([]); setBank([]);
    setCurSid(null); setView("dashboard");
  }

  // ── SUBJECT HANDLERS ──────────────────────────────────────────────────────

  async function addSubject() {
    if (!sf.name.trim() || !authUser) return;
    const sub = await dbAddSubject(authUser.id, sf);
    const upd = [...subjects, sub];
    setSubjects(upd); setCurSid(sub.id);
    setSf({ name:"", level:"Secundario (4°-6°)", materials:"" });
    setSubjModal(false);
  }

  async function delSubject(id) {
    await dbDelSubject(id);
    const upd = subjects.filter(s => s.id !== id);
    setSubjects(upd);
    if (curSid === id) setCurSid(upd[0]?.id || null);
  }

  // ── GENERATOR ─────────────────────────────────────────────────────────────

  async function generate() {
    if (!genTopic.trim() || !curSubj) return;
    setGenLoading(true); setGenResult(""); setGenSaved(false); setGenErr("");
    try {
      const sys = sysGen(genType, curSubj.name, genLevel || curSubj.level, curSubj.materials);
      const usr = userGen(genType, genTopic, genDiff, genExtra);
      const r = await callClaude(sys, [{ role:"user", content:usr }]);
      setGenResult(r);
      setMakeCodeUrl(generateMakeCodeUrl(r));
    } catch(e) { setGenErr("❌ " + e.message); }
    setGenLoading(false);
  }

  async function generateMM() {
    if (!mmTopic.trim() || !curSubj) return;
    setMmLoading(true); setMmResult("");
    try {
      const sys = `Sos experto en contenido educativo digital para ${curSubj.name} (${curSubj.level}). Respondé en español rioplatense con Markdown.`;
      const r = await callClaude(sys, [{ role:"user", content:userMM(mmType, mmTopic, mmExtra) }]);
      setMmResult(r);
    } catch(e) { setMmResult("❌ " + e.message); }
    setMmLoading(false);
  }
function generateMakeCodeUrl(content) {
    const match = content.match(/```javascript\n([\s\S]*?)```/);
    if (!match) return null;
    const code = match[1].trim();
    const snippet = {
      name: genTopic,
      description: "Generado con EduAI Pro",
      editor: "microbit",
      code: { "main.ts": code },
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(snippet))));
    return "https://makecode.microbit.org/#pub:" + encoded;
  }
  async function generateActivityImage() {
    if (!genResult || !curSubj) return;
    setActImgLoad(true); setActImgUrl(null); setActImgErr("");
    try {
      const res = await fetch("/api/generate-image", {
method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: actImgDesc || `High quality educational illustration for ${curSubj.name} class (${genLevel}) about: ${genTopic}. ${curSubj.name.toLowerCase().includes("geograf") ? "Detailed map or geographic illustration, cartographic style, clear labels" : curSubj.name.toLowerCase().includes("histor") ? "Historical scene or portrait, realistic illustration, detailed" : curSubj.name.toLowerCase().includes("ciencia") || curSubj.name.toLowerCase().includes("biolog") ? "Scientific diagram or nature illustration, detailed and accurate, labeled" : curSubj.name.toLowerCase().includes("matem") ? "Mathematical diagram or visual representation, clean and clear" : "Clean educational illustration, colorful, detailed, suitable for classroom"}. Professional quality, no text overlays.`,
          subject: curSubj.name,
          level: genLevel,
        }),
      });
      let data;
      try { data = await res.json(); } catch { throw new Error("Error del servidor. Intentá de nuevo."); }
      if (!res.ok) throw new Error(data.error || "Error al generar imagen.");
      setActImgUrl(data.url);
    } catch(e) {
      setActImgErr("❌ " + e.message);
    }
    setActImgLoad(false);
  }
  async function generateImage() {
    if (!mmTopic.trim() || !curSubj) return;
    setImgLoading(true); setImgUrl(null); setImgError("");
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: mmTopic,
          subject: curSubj.name,
          level: curSubj.level,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImgUrl(data.url);
    } catch(e) {
      setImgError("❌ " + e.message);
    }
    setImgLoading(false);
  }
  async function saveLib(content, type, typeName, topic) {
    if (!authUser) return;
    await dbAddLibraryItem(authUser.id, { type, type_name:typeName, topic, subject_name:curSubj?.name||"", content });
    const upd = await dbLoadLibrary(authUser.id);
    setLibrary(upd); setGenSaved(true);
  }

  async function saveBank(content, topic) {
    if (!authUser) return;
    await dbAddBankItem(authUser.id, { topic, subject_name:curSubj?.name||"", content });
    const upd = await dbLoadBank(authUser.id);
    setBank(upd);
  }

  async function delLib(id) {
    await dbDelLibraryItem(id);
    setLibrary(prev => prev.filter(i => i.id !== id));
    if (libItem?.id === id) setLibItem(null);
  }

  async function delBank(id) {
    await dbDelBankItem(id);
    setBank(prev => prev.filter(i => i.id !== id));
  }

  // ── CHAT ──────────────────────────────────────────────────────────────────

  async function sendChat() {
    const subj = subjects.find(s => s.id === chatSid) || curSubj;
    if (!chatIn.trim() || !subj) return;
    const msg = chatIn.trim(); setChatIn("");
    const hist = [...chatMsgs, { role:"user", content:msg }];
    setChatMsgs(hist); setChatLoading(true);
    const sys = `Sos asistente educativo experto para docentes argentinos en "${subj.name}" (${subj.level}).${subj.materials ? `\nPrograma: ${subj.materials}` : ""}\nRespondé en español rioplatense con Markdown.`;
    try {
      const r = await callClaude(sys, hist.map(m => ({ role:m.role, content:m.content })), 2000);
      setChatMsgs([...hist, { role:"assistant", content:r }]);
    } catch(e) {
      setChatMsgs([...hist, { role:"assistant", content:"❌ " + e.message }]);
    }
    setChatLoading(false);
  }

  // ── CORRECTOR ─────────────────────────────────────────────────────────────

  async function correctTP() {
    if (!corrR.trim() || !corrW.trim()) return;
    setCorrLoading(true); setCorrResult("");
    const sys = `Sos docente evaluador experto y constructivo. Materia: "${curSubj?.name||"General"}". Respondé en español rioplatense con Markdown.`;
    const usr = `Corrección completa usando la rúbrica.\n\n## RÚBRICA:\n${corrR}\n\n## TRABAJO DEL ALUMNO:\n${corrW}\n\nIncluí: 1) Evaluación por criterio (nivel + justificación + puntaje), 2) Calificación final, 3) Fortalezas (mín. 3), 4) Áreas de mejora (mín. 3 con sugerencias), 5) Devolución al alumno (2-3 párrafos en 2da persona), 6) Próximos pasos.`;
    try {
      const r = await callClaude(sys, [{ role:"user", content:usr }], 4000);
      setCorrResult(r);
    } catch(e) { setCorrResult("❌ " + e.message); }
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

  const filtLib = library.filter(i => {
    const mf = libFilter==="all" || i.type===libFilter;
    const ms = !libSearch || i.topic.toLowerCase().includes(libSearch.toLowerCase()) || (i.subject_name||"").toLowerCase().includes(libSearch.toLowerCase());
    return mf && ms;
  });

  const gt = GEN_TYPES.find(g => g.id===genType);
  const mt = MM_TYPES.find(m => m.id===mmType);

  const userName = authUser.user_metadata?.name || authUser.email?.split("@")[0] || "Docente";

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, color:C.text, fontFamily:"Arial,sans-serif", overflow:"hidden" }}>

      {/* SIDEBAR */}
      <div style={{ width:bar?218:56, minWidth:bar?218:56, background:C.surf, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", transition:"all .22s", overflow:"hidden" }}>
        <div style={{ padding:"14px 10px 12px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8 }}>
          <button style={{ background:"none", border:"none", cursor:"pointer", color:C.accent, fontSize:17, minWidth:26, fontFamily:"inherit" }} onClick={()=>setBar(!bar)}>{bar?"◁":"▷"}</button>
          {bar && <span style={{ fontSize:15, fontWeight:700, color:C.accent, whiteSpace:"nowrap" }}>EduAI Pro</span>}
        </div>
        {bar && subjects.length > 0 && (
          <div style={{ padding:"8px 10px 10px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:10, color:C.textDim, fontWeight:700, letterSpacing:.8, marginBottom:5 }}>MATERIA ACTIVA</div>
            <select style={{ ...sel, width:"100%", fontSize:12, padding:"5px 9px" }} value={curSid||""} onChange={e=>setCurSid(e.target.value)}>
              {subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        <nav style={{ flex:1, padding:"6px 0", overflowY:"auto" }}>
          {NAV.map(n=>(
            <div key={n.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 11px", cursor:"pointer", borderRadius:8, margin:"2px 6px", background:view===n.id?"#1d3d7a":"transparent", color:view===n.id?"#93c5fd":C.textMuted, fontSize:13, whiteSpace:"nowrap", overflow:"hidden" }} onClick={()=>setView(n.id)}>
              <span style={{ fontSize:17, minWidth:24, textAlign:"center" }}>{n.icon}</span>
              {bar && <span>{n.label}</span>}
            </div>
          ))}
        </nav>
        <div style={{ padding:"10px 12px", borderTop:`1px solid ${C.border}` }}>
          {bar ? (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:11, color:C.textDim, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>👤 {userName}</div>
              <button style={{ background:"transparent", border:"none", cursor:"pointer", color:C.textDim, fontSize:11, fontFamily:"inherit" }} onClick={signOut}>Salir</button>
            </div>
          ) : (
            <button style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:16, width:"100%", textAlign:"center" }} onClick={signOut} title="Cerrar sesión">🚪</button>
          )}
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
        <div style={{ background:C.surf, borderBottom:`1px solid ${C.border}`, padding:"10px 22px", display:"flex", alignItems:"center", gap:14, minHeight:54 }}>
          <h1 style={{ margin:0, fontSize:16, fontWeight:700, flex:1, color:C.text }}>
            {NAV.find(n=>n.id===view)?.icon} {NAV.find(n=>n.id===view)?.label}
          </h1>
          {curSubj && <div style={{ fontSize:12, color:C.textMuted, background:C.bg, padding:"4px 12px", borderRadius:20, border:`1px solid ${C.border}` }}>📖 {curSubj.name}</div>}
          <Btn v="accent" st={{ padding:"5px 13px", fontSize:12 }} onClick={()=>setSubjModal(true)}>+ Materia</Btn>
        </div>

        <div style={{ flex:1, overflow:"auto", padding:"20px 26px" }}>

          {dataLoading && (
            <div style={{ textAlign:"center", padding:"60px 0", color:C.textMuted }}>
              <Spin/> Cargando tus datos...
            </div>
          )}

          {/* DASHBOARD */}
          {!dataLoading && view==="dashboard" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
                <div>
                  <h2 style={{ fontSize:22, fontWeight:700, color:C.text, margin:0 }}>Bienvenido, {userName} 👋</h2>
                  <p style={{ color:C.textDim, fontSize:13, margin:"4px 0 0" }}>¿Qué creamos hoy para tus alumnos?</p>
                </div>
                <Btn onClick={()=>setSubjModal(true)}>+ Nueva Materia</Btn>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
                {[{l:"Materias",v:subjects.length,i:"📚",c:C.blue},{l:"Biblioteca",v:library.length,i:"💾",c:C.green},{l:"Banco",v:bank.length,i:"🏦",c:C.accent},{l:"Herramientas",v:13,i:"⚡",c:C.purple}].map(x=>(
                  <div key={x.l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"15px 18px" }}>
                    <div style={{ fontSize:24, marginBottom:8 }}>{x.i}</div>
                    <div style={{ fontSize:28, fontWeight:700, color:x.c }}>{x.v}</div>
                    <div style={{ fontSize:12, color:C.textDim, marginTop:2 }}>{x.l}</div>
                  </div>
                ))}
              </div>
              <div style={card}>
                <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:.8, marginBottom:14 }}>MIS MATERIAS</div>
                {!subjects.length ? (
                  <div style={{ textAlign:"center", padding:"32px 0", color:C.textDim }}>
                    <div style={{ fontSize:34, marginBottom:10 }}>📚</div>
                    <p style={{ marginBottom:14 }}>Todavía no tenés materias. Creá la primera para empezar.</p>
                    <Btn onClick={()=>setSubjModal(true)}>Crear mi primera materia</Btn>
                  </div>
                ) : (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
                    {subjects.map(sub=>(
                      <div key={sub.id} style={{ background:C.bg, border:`2px solid ${curSid===sub.id?C.accent:C.border}`, borderRadius:10, padding:14, cursor:"pointer" }} onClick={()=>setCurSid(sub.id)}>
                        <div style={{ fontSize:22, marginBottom:7 }}>📖</div>
                        <div style={{ fontWeight:700, color:C.text, marginBottom:2, fontSize:14 }}>{sub.name}</div>
                        <div style={{ fontSize:12, color:C.textDim, marginBottom:sub.materials?5:10 }}>{sub.level}</div>
                        {sub.materials && <div style={{ fontSize:11, color:C.green, marginBottom:10 }}>✓ Con programa cargado</div>}
                        <div style={{ display:"flex", gap:6 }}>
                          <Btn v="sm" onClick={e=>{e.stopPropagation();setCurSid(sub.id);setView("generator");}}>⚡ Generar</Btn>
                          <Btn v="ghost" st={{ padding:"5px 9px", fontSize:12 }} onClick={e=>{e.stopPropagation();delSubject(sub.id);}}>🗑</Btn>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={card}>
                <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:.8, marginBottom:14 }}>ACCESO RÁPIDO</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
                  {[{v:"generator",i:"⚡",l:"Generador IA",c:C.accent},{v:"chat",i:"💬",l:"Chat Docente",c:C.blue},{v:"multimedia",i:"🎨",l:"Multimedia",c:C.green},{v:"corrector",i:"✅",l:"Corrector TPs",c:C.purple}].map(x=>(
                    <button key={x.v} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:"13px 8px", cursor:"pointer", textAlign:"center", fontFamily:"inherit" }} onClick={()=>setView(x.v)}>
                      <div style={{ fontSize:24, marginBottom:5 }}>{x.i}</div>
                      <div style={{ fontSize:12, fontWeight:600, color:x.c }}>{x.l}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* GENERATOR */}
          {!dataLoading && view==="generator" && (
            <div style={{ display:"grid", gridTemplateColumns:"258px 1fr", gap:18 }}>
              <div>
                <div style={card}>
                  <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:.8, marginBottom:12 }}>TIPO DE CONTENIDO</div>
                  {GEN_TYPES.map(g=>(
                    <button key={g.id} style={{ display:"flex", alignItems:"center", gap:9, width:"100%", padding:"8px 10px", borderRadius:7, border:"none", cursor:"pointer", marginBottom:3, background:genType===g.id?"#1d3d7a":"transparent", color:genType===g.id?"#93c5fd":C.textMuted, textAlign:"left", fontFamily:"inherit", fontSize:13 }}
                      onClick={()=>{setGenType(g.id);setGenResult("");setGenSaved(false);setGenErr("");}}>
                      <span style={{ fontSize:16 }}>{g.icon}</span>
                      <span style={{ fontWeight:genType===g.id?700:400 }}>{g.label}</span>
                    </button>
                  ))}
                </div>
                <div style={card}>
                  <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:.8, marginBottom:12 }}>PARÁMETROS</div>
                  <label style={lbl}>NIVEL</label>
                  <select style={{ ...sel, width:"100%", marginBottom:12 }} value={genLevel} onChange={e=>setGenLevel(e.target.value)}>
                    {LEVELS.map(l=><option key={l}>{l}</option>)}
                  </select>
                  <label style={lbl}>DIFICULTAD</label>
                  <div style={{ display:"flex", gap:5 }}>
                    {["Básico","Intermedio","Avanzado"].map(d=>(
                      <button key={d} style={{ flex:1, padding:"6px 3px", borderRadius:6, border:`1px solid ${genDiff===d?C.accent:C.border}`, background:genDiff===d?C.accentBg:"transparent", color:genDiff===d?C.accent:C.textMuted, cursor:"pointer", fontSize:11, fontWeight:genDiff===d?700:400, fontFamily:"inherit" }}
                        onClick={()=>setGenDiff(d)}>{d}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <div style={card}>
                  <div style={{ display:"flex", alignItems:"center", gap:13, marginBottom:18 }}>
                    <span style={{ fontSize:30 }}>{gt?.icon}</span>
                    <div>
                      <h2 style={{ margin:0, fontSize:19, fontWeight:700, color:C.text }}>{gt?.label}</h2>
                      <div style={{ fontSize:13, color:C.textDim }}>Materia: {curSubj?.name||"—"}</div>
                    </div>
                  </div>
                  {!curSubj ? (
                    <div style={{ textAlign:"center", padding:"28px 0", color:C.textDim }}>
                      <p style={{ marginBottom:14 }}>Seleccioná o creá una materia primero.</p>
                      <Btn onClick={()=>setSubjModal(true)}>Crear materia</Btn>
                    </div>
                  ) : <>
                    <label style={lbl}>TEMA ESPECÍFICO *</label>
                    <input style={{ ...inp, marginBottom:12 }} value={genTopic} onChange={e=>setGenTopic(e.target.value)} placeholder={genType==="planclase"?"Ej: La Primera Guerra Mundial":genType==="rubrica"?"Ej: Informe de laboratorio grupal":"Ej: Ecuaciones de primer grado"} />
                    <label style={lbl}>INSTRUCCIONES ADICIONALES (opcional)</label>
                    <textarea style={{ ...inp, height:70, resize:"vertical", marginBottom:18 }} value={genExtra} onChange={e=>setGenExtra(e.target.value)} placeholder="Ej: grupos de 4, enfoque por proyectos, uso de tecnología..." />
                    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                      <Btn onClick={generate} disabled={genLoading||!genTopic.trim()}>
                        {genLoading?"Generando...":"⚡ Generar "+gt?.label}
                      </Btn>
                      {genLoading && <span style={{ color:C.textMuted, fontSize:12 }}>Puede tardar unos segundos...</span>}
                    </div>
                    {genErr && <div style={{ marginTop:12, color:"#f87171", fontSize:13, background:"#1a0a0a", padding:"10px 14px", borderRadius:7 }}>{genErr}</div>}
                  </>}
                </div>
                {genLoading && <div style={card}><Spin/></div>}
                {genResult && !genLoading && (
                  <div style={card}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
<div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:.8 }}>RESULTADO GENERADO</div>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        {genSaved
                          ? <span style={{ color:C.green, fontSize:12, fontWeight:700 }}>✓ Guardado</span>
                          : <>
                              <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={()=>saveLib(genResult,genType,gt?.label,genTopic)}>💾 Biblioteca</Btn>
                              {(genType==="evaluacion"||genType==="rubrica") && <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={()=>saveBank(genResult,genTopic)}>🏦 Banco</Btn>}
                            </>}
                        <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={()=>exportDocx(genTopic, gt?.label, curSubj?.name, genResult)}>📄 Word</Btn>
                        {(genType==="evaluacion"||genType==="rubrica"||genType==="planclase") &&
                          <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={()=>exportPdf(genTopic, gt?.label, curSubj?.name, genResult)}>📋 PDF</Btn>}                      </div>
                    </div>
<MDView text={genResult}/>
{makeCodeUrl && (
                      <div style={{ marginTop:16, padding:"12px 16px", background:"#0f2027", border:"1px solid #00b4d8", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:"#00b4d8", marginBottom:3 }}>🔧 Código MakeCode detectado</div>
                          <div style={{ fontSize:12, color:C.textMuted }}>Abrí el proyecto directamente en el editor con los bloques listos</div>
                        </div>
                        <a href={makeCodeUrl} target="_blank" rel="noopener noreferrer">
                          <Btn v="primary" st={{ fontSize:13, padding:"8px 18px" }}>Abrir en MakeCode →</Btn>
                        </a>
                      </div>
                    )}
                   <div style={{ marginTop:16 }}>
                      <label style={lbl}>DESCRIPCIÓN DE LA IMAGEN (opcional)</label>
                      <input style={{ ...inp, marginBottom:10 }} value={actImgDesc} onChange={e=>setActImgDesc(e.target.value)} placeholder="Ej: bloques de MakeCode mostrando un loop con LED encendido, fondo blanco"/>
                    </div>
                    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                      <Btn v="secondary" st={{ fontSize:12, padding:"5px 14px" }} onClick={generateActivityImage} disabled={actImgLoad}>
                        {actImgLoad ? "Generando imagen..." : "🖼️ Generar imagen ilustrativa"}
                      </Btn>
                      {actImgErr && <span style={{ color:"#f87171", fontSize:12 }}>{actImgErr}</span>}
                    </div>
                    {actImgUrl && (
                      <div style={{ marginTop:14 }}>
                        <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:.8, marginBottom:10 }}>IMAGEN GENERADA</div>
                        <img src={actImgUrl} alt={genTopic} style={{ width:"100%", borderRadius:8, display:"block" }}/>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
                          <p style={{ fontSize:11, color:C.textDim }}>Las imágenes expiran en 1 hora. Descargala para guardarla.</p>
                          <a href={actImgUrl} download="imagen_actividad.png" target="_blank" rel="noopener noreferrer">
                            <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }}>⬇️ Descargar</Btn>
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
          {!dataLoading && view==="multimedia" && (
            <div style={{ display:"grid", gridTemplateColumns:"248px 1fr", gap:18 }}>
              <div style={card}>
                <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:.8, marginBottom:12 }}>TIPO</div>
                {MM_TYPES.map(m=>(
                  <button key={m.id} style={{ display:"flex", alignItems:"flex-start", gap:10, width:"100%", padding:"8px 10px", borderRadius:7, border:"none", cursor:"pointer", marginBottom:4, background:mmType===m.id?"#1d3d7a":"transparent", textAlign:"left", fontFamily:"inherit" }}
                    onClick={()=>{setMmType(m.id);setMmResult("");setImgUrl(null);setImgError("");}}>
                    <span style={{ fontSize:17, minWidth:24 }}>{m.icon}</span>
                    <div>
                      <div style={{ fontWeight:mmType===m.id?700:400, fontSize:13, color:mmType===m.id?"#93c5fd":C.textMuted }}>{m.label}</div>
                      <div style={{ fontSize:11, color:C.textDim, marginTop:1 }}>{m.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div>
                <div style={card}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                    <span style={{ fontSize:28 }}>{mt?.icon}</span>
                    <div><h2 style={{ margin:0, fontSize:18, fontWeight:700, color:C.text }}>{mt?.label}</h2><div style={{ fontSize:12, color:C.textDim }}>{mt?.desc}</div></div>
                  </div>
                  {!curSubj ? <div style={{ textAlign:"center", padding:"22px 0", color:C.textDim }}>Seleccioná una materia primero.</div>
                  : <>
                    <label style={lbl}>{mmType==="imagen_ia" ? "DESCRIPCIÓN DE LA IMAGEN" : "TEMA DEL CONTENIDO"}</label>
                    <input style={{ ...inp, marginBottom:12 }} value={mmTopic} onChange={e=>setMmTopic(e.target.value)}
                      placeholder={mmType==="imagen_ia" ? "Ej: Ciclo del agua con nubes, lluvia y ríos" : "Ej: La fotosíntesis para 5to año"}/>
                    {mmType!=="imagen_ia" && <>
                      <label style={lbl}>INSTRUCCIONES ADICIONALES</label>
                      <textarea style={{ ...inp, height:62, resize:"vertical", marginBottom:16 }} value={mmExtra} onChange={e=>setMmExtra(e.target.value)} placeholder="Duración, tono, audiencia..."/>
                    </>}
                    <div style={{ display:"flex", gap:10, marginTop:mmType==="imagen_ia"?16:0 }}>
                      {mmType==="imagen_ia"
                        ? <Btn onClick={generateImage} disabled={imgLoading||!mmTopic.trim()}>{imgLoading?"Generando imagen...":"🖼️ Generar Imagen"}</Btn>
                        : <Btn onClick={generateMM} disabled={mmLoading||!mmTopic.trim()}>{mmLoading?"Generando...":"🎨 Generar Contenido"}</Btn>}
                    </div>
                  </>}
                </div>
                {mmType==="imagen_ia" && (
                  <>
                    {imgLoading && <div style={card}><Spin/></div>}
                    {imgError && <div style={{ ...card, color:"#f87171", fontSize:13 }}>{imgError}</div>}
                    {imgUrl && !imgLoading && (
                      <div style={card}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                          <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:.8 }}>IMAGEN GENERADA</div>
                          <a href={imgUrl} download="imagen_educativa.png" target="_blank" rel="noopener noreferrer">
                            <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }}>⬇️ Descargar PNG</Btn>
                          </a>
                        </div>
                        <img src={imgUrl} alt={mmTopic} style={{ width:"100%", borderRadius:8, display:"block" }}/>
                        <p style={{ fontSize:11, color:C.textDim, marginTop:10 }}>Las imágenes de DALL·E expiran en 1 hora. Descargala para guardarla.</p>
                      </div>
                    )}
                  </>
                )}
                {mmType!=="imagen_ia" && (
                  <>
                    {mmLoading && <div style={card}><Spin/></div>}
                    {mmResult && !mmLoading && (
                      <div style={card}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:8 }}>
                          <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:.8 }}>CONTENIDO GENERADO</div>
                          <div style={{ display:"flex", gap:8 }}>
                            <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={()=>saveLib(mmResult,mmType,mt?.label,mmTopic)}>💾 Biblioteca</Btn>
                            <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={()=>exportDocx(mmTopic, mt?.label, curSubj?.name, mmResult)}>📄 Word</Btn>
                            <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={()=>exportPdf(mmTopic, mt?.label, curSubj?.name, mmResult)}>📋 PDF</Btn>
                          </div>
                        </div>
                        <MDView text={mmResult}/>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* CHAT */}
          {!dataLoading && view==="chat" && (()=>{
            const chatSubj = subjects.find(s=>s.id===chatSid)||curSubj;
            const SUGS = ["¿Cómo explico este concepto de forma simple?","Dame 5 actividades de cierre creativas","¿Qué TIC puedo usar en esta clase?","Diseñame una pregunta diagnóstica","¿Cómo manejo distintos ritmos de aprendizaje?","Sugerí secuencia de temas para el trimestre"];
            return (
              <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 132px)" }}>
                <div style={{ ...card, marginBottom:12, padding:"9px 14px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:.6, whiteSpace:"nowrap" }}>CONTEXTO:</span>
                    <select style={{ ...sel, flex:1 }} value={chatSid||curSid||""} onChange={e=>{setChatSid(e.target.value);setChatMsgs([]);}}>
                      <option value="">— Sin materia específica —</option>
                      {subjects.map(s=><option key={s.id} value={s.id}>{s.name} ({s.level})</option>)}
                    </select>
                    <Btn v="ghost" st={{ padding:"5px 11px", fontSize:12 }} onClick={()=>setChatMsgs([])}>🗑 Limpiar</Btn>
                  </div>
                </div>
                <div style={{ flex:1, overflow:"auto", ...card, padding:"14px 18px", minHeight:0 }}>
                  {!chatMsgs.length ? (
                    <div style={{ textAlign:"center", padding:"28px 0", color:C.textDim }}>
                      <div style={{ fontSize:36, marginBottom:10 }}>💬</div>
                      <p style={{ fontSize:14, marginBottom:18 }}>Chat contextualizado a tu materia</p>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, maxWidth:500, margin:"0 auto" }}>
                        {SUGS.map(s=><button key={s} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 11px", color:C.textMuted, cursor:"pointer", textAlign:"left", fontSize:12, fontFamily:"inherit" }} onClick={()=>setChatIn(s)}>{s}</button>)}
                      </div>
                    </div>
                  ) : chatMsgs.map((m,i)=>(
                    <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", marginBottom:14 }}>
                      <div style={{ maxWidth:"82%", background:m.role==="user"?"#1d3d7a":C.card, borderRadius:12, padding:"10px 14px" }}>
                        {m.role==="user" ? <span style={{ fontSize:14, color:C.text }}>{m.content}</span> : <MDView text={m.content} maxH={9999}/>}
                      </div>
                    </div>
                  ))}
                  {chatLoading && <div style={{ textAlign:"center", padding:"12px 0" }}><Spin/></div>}
                  <div ref={chatRef}/>
                </div>
                <div style={{ display:"flex", gap:10, marginTop:10 }}>
                  <input style={{ ...inp, flex:1, padding:"10px 14px" }} value={chatIn} onChange={e=>setChatIn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendChat()} placeholder="Escribí tu consulta... (Enter para enviar)"/>
                  <Btn onClick={sendChat} disabled={chatLoading||!chatIn.trim()} st={{ padding:"10px 22px" }}>Enviar →</Btn>
                </div>
              </div>
            );
          })()}

          {/* CORRECTOR */}
          {!dataLoading && view==="corrector" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
              <div style={card}>
                <h3 style={{ margin:"0 0 5px", fontSize:18, fontWeight:700, color:C.text }}>✅ Corrector de TPs</h3>
                <p style={{ fontSize:13, color:C.textDim, marginBottom:18 }}>Pegá la rúbrica y el trabajo del alumno para una corrección formativa completa.</p>
                <label style={lbl}>RÚBRICA *</label>
                <textarea style={{ ...inp, height:155, resize:"vertical", marginBottom:12 }} value={corrR} onChange={e=>setCorrR(e.target.value)} placeholder="Pegá la rúbrica aquí..."/>
                {library.filter(i=>i.type==="rubrica").length > 0 && (
                  <div style={{ marginBottom:12 }}>
                    <label style={lbl}>O CARGÁ UNA DE LA BIBLIOTECA</label>
                    <select style={{ ...sel, width:"100%" }} onChange={e=>{ const it=library.find(i=>i.id===e.target.value); if(it) setCorrR(it.content); }}>
                      <option value="">— Seleccionar rúbrica guardada —</option>
                      {library.filter(i=>i.type==="rubrica").map(r=><option key={r.id} value={r.id}>{r.topic} ({new Date(r.created_at).toLocaleDateString("es-AR")})</option>)}
                    </select>
                  </div>
                )}
                <label style={lbl}>TRABAJO DEL ALUMNO *</label>
                <textarea style={{ ...inp, height:175, resize:"vertical", marginBottom:18 }} value={corrW} onChange={e=>setCorrW(e.target.value)} placeholder="Pegá el texto del trabajo práctico..."/>
                <Btn onClick={correctTP} disabled={corrLoading||!corrR.trim()||!corrW.trim()}>{corrLoading?"Corrigiendo...":"✅ Corregir Trabajo Práctico"}</Btn>
              </div>
              <div>
                {corrLoading && <div style={card}><Spin/></div>}
                {corrResult && !corrLoading ? (
                  <div style={card}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                      <div style={{ fontSize:11, color:C.textMuted, fontWeight:700, letterSpacing:.8 }}>CORRECCIÓN GENERADA</div>
                      <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={()=>saveLib(corrResult,"correccion","Corrección de TP","Corrección "+new Date().toLocaleDateString("es-AR"))}>💾 Guardar</Btn>
                    </div>
                    <MDView text={corrResult} maxH={640}/>
                  </div>
                ) : !corrLoading && (
                  <div style={{ ...card, textAlign:"center", padding:"56px 24px", color:C.textDim }}>
                    <div style={{ fontSize:44, marginBottom:12 }}>📋</div>
                    <h3 style={{ color:C.textMuted, marginBottom:8 }}>La corrección aparecerá aquí</h3>
                    <p style={{ fontSize:13 }}>Evaluación por criterio · Calificación · Fortalezas · Mejoras · Devolución al alumno</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LIBRARY */}
          {!dataLoading && view==="library" && (
            <div>
              <div style={{ display:"flex", gap:12, marginBottom:18, flexWrap:"wrap", alignItems:"center" }}>
                <h2 style={{ margin:0, fontSize:19, fontWeight:700, flex:1, color:C.text }}>📚 Biblioteca <span style={{ color:C.textDim, fontWeight:400, fontSize:15 }}>({library.length})</span></h2>
                {library.length > 0 && <Btn v="secondary" st={{ fontSize:12, padding:"5px 14px" }} onClick={()=>exportZip(library)}>📦 Exportar todo (.zip)</Btn>}
                <input style={{ ...inp, width:185 }} value={libSearch} onChange={e=>setLibSearch(e.target.value)} placeholder="🔍 Buscar..."/>
                <select style={sel} value={libFilter} onChange={e=>setLibFilter(e.target.value)}>
                  <option value="all">Todos</option>
                  {GEN_TYPES.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}
                  {MM_TYPES.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}
                  <option value="correccion">Correcciones</option>
                </select>
              </div>
              {libItem ? (
                <div>
                  <Btn v="ghost" st={{ marginBottom:14, fontSize:12 }} onClick={()=>setLibItem(null)}>← Volver a la lista</Btn>
                  <div style={card}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
                      <div>
                        <div style={{ fontSize:12, color:C.textDim, marginBottom:4 }}>{libItem.type_name} · {libItem.subject_name} · {new Date(libItem.created_at).toLocaleDateString("es-AR")}</div>
                        <h2 style={{ margin:0, fontSize:19, fontWeight:700, color:C.text }}>{libItem.topic}</h2>
                      </div>
<div style={{ display:"flex", gap:8 }}>
                        <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={()=>exportDocx(libItem.topic, libItem.type_name, libItem.subject_name, libItem.content)}>📄 Word</Btn>
                        <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={()=>exportPdf(libItem.topic, libItem.type_name, libItem.subject_name, libItem.content)}>📋 PDF</Btn>
                        <Btn v="danger" onClick={()=>delLib(libItem.id)}>🗑 Eliminar</Btn>
                      </div>
                    </div>
                    <MDView text={libItem.content} maxH={680}/>
                  </div>
                </div>
              ) : !filtLib.length ? (
                <div style={{ ...card, textAlign:"center", padding:"52px 24px", color:C.textDim }}>
                  <div style={{ fontSize:36, marginBottom:10 }}>📚</div>
                  <p>{!library.length?"Tu biblioteca está vacía. Generá contenido y guardalo aquí.":"Sin resultados."}</p>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(258px,1fr))", gap:12 }}>
                  {filtLib.map(item=>{
                    const g = GEN_TYPES.find(g=>g.id===item.type)||MM_TYPES.find(m=>m.id===item.type);
                    return (
                      <div key={item.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16, cursor:"pointer" }} onClick={()=>setLibItem(item)}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                          <span style={{ fontSize:22 }}>{g?.icon||"📄"}</span>
                          <button style={{ background:"transparent", border:"none", cursor:"pointer", color:C.red, fontSize:15 }} onClick={e=>{e.stopPropagation();delLib(item.id);}}>🗑</button>
                        </div>
                        <Tag color={g?.color||C.textMuted}>{item.type_name}</Tag>
                        <div style={{ fontWeight:600, color:C.text, fontSize:14, marginTop:8, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.topic}</div>
                        <div style={{ fontSize:12, color:C.textDim, marginTop:3 }}>{item.subject_name} · {new Date(item.created_at).toLocaleDateString("es-AR")}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* BANK */}
          {!dataLoading && view==="bank" && (
            <div>
              <h2 style={{ fontSize:19, fontWeight:700, marginBottom:18, color:C.text }}>🏦 Banco de Preguntas <span style={{ color:C.textDim, fontWeight:400, fontSize:15 }}>({bank.length})</span></h2>
              {!bank.length ? (
                <div style={{ ...card, textAlign:"center", padding:"52px 24px", color:C.textDim }}>
                  <div style={{ fontSize:36, marginBottom:10 }}>🏦</div>
                  <p>El banco está vacío. Generá evaluaciones o rúbricas y guardalas aquí.</p>
                </div>
              ) : bank.map(item=>(
                <div key={item.id} style={card}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15, color:C.text, marginBottom:2 }}>{item.topic}</div>
                      <div style={{ fontSize:12, color:C.textDim }}>{item.subject_name} · {new Date(item.created_at).toLocaleDateString("es-AR")}</div>
                    </div>
                    <Btn v="danger" st={{ fontSize:12, padding:"5px 12px" }} onClick={()=>delBank(item.id)}>🗑</Btn>
                  </div>
                  <MDView text={item.content.slice(0,900)+(item.content.length>900?"...":"")} maxH={280}/>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* SUBJECT MODAL */}
      {subjModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:26, width:488, maxWidth:"92vw" }}>
            <h2 style={{ margin:"0 0 18px", fontSize:19, fontWeight:700, color:C.text }}>➕ Nueva Materia</h2>
            <label style={lbl}>NOMBRE *</label>
            <input style={{ ...inp, marginBottom:13 }} value={sf.name} onChange={e=>setSf({...sf,name:e.target.value})} placeholder="Ej: Biología, Historia, Matemática II..." autoFocus/>
            <label style={lbl}>NIVEL</label>
            <select style={{ ...sel, width:"100%", marginBottom:13 }} value={sf.level} onChange={e=>setSf({...sf,level:e.target.value})}>
              {LEVELS.map(l=><option key={l}>{l}</option>)}
            </select>
            <label style={lbl}>PROGRAMA / MATERIALES <span style={{ color:C.green, fontWeight:400, letterSpacing:0 }}>(muy recomendado)</span></label>
            <p style={{ fontSize:12, color:C.textDim, margin:"0 0 6px" }}>Pegá el programa o contenidos. Permite que Claude genere material ajustado a tu materia real.</p>
            <textarea style={{ ...inp, height:118, resize:"vertical", marginBottom:20 }} value={sf.materials} onChange={e=>setSf({...sf,materials:e.target.value})} placeholder="Pegá programa, objetivos, unidades temáticas, bibliografía..."/>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <Btn v="ghost" st={{ fontSize:13 }} onClick={()=>setSubjModal(false)}>Cancelar</Btn>
              <Btn onClick={addSubject} disabled={!sf.name.trim()}>✓ Crear Materia</Btn>
            </div>
          </div>
        </div>
      )}

      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#243350;border-radius:3px}select option{background:#1a2640}`}</style>
    </div>
  );
}
