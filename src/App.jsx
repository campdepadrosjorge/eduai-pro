import { useState, useEffect, useRef } from "react";
import supabase from "./supabase.js";
import { exportDocx, exportPdf, exportZip } from "./exportUtils.js";
import { generatePptx } from "./pptxUtils.js";

const NAV = [
  { id:"dashboard",  label:"Inicio",              icon:"ti-layout-dashboard" },
  { id:"generator",  label:"Generador IA",         icon:"ti-bolt" },
  { id:"multimedia", label:"Multimedia",           icon:"ti-photo" },
  { id:"chat",       label:"Chat Docente",         icon:"ti-message" },
  { id:"corrector",  label:"Corrector de TPs",     icon:"ti-checklist" },
  { id:"library",    label:"Biblioteca",           icon:"ti-books" },
  { id:"bank",       label:"Banco de Preguntas",   icon:"ti-database" },
  { id:"sequences",  label:"Secuencias",           icon:"ti-list-numbers" },
  { id:"students",   label:"Mis Alumnos",          icon:"ti-users" },
  { id:"publiclib",  label:"Biblioteca Publica",   icon:"ti-world" },
  { id:"pricing",    label:"Planes y Precios",     icon:"ti-credit-card" },
  { id:"admin",      label:"Panel Admin",          icon:"ti-chart-bar" },
];

const GEN_TYPES = [
  { id:"planclase",    label:"Plan de Clase",            icon:"ti-calendar",   color:"#1d4ed8" },
  { id:"actividad",   label:"Actividad Didactica",       icon:"ti-target",     color:"#059669" },
  { id:"rubrica",     label:"Rubrica de Evaluacion",     icon:"ti-list-check", color:"#0d9488" },
  { id:"evaluacion",  label:"Evaluacion / Examen",       icon:"ti-writing",    color:"#7c3aed" },
  { id:"material",    label:"Material Didactico",        icon:"ti-book",       color:"#0891b2" },
  { id:"presentacion",label:"Esquema de Presentacion",   icon:"ti-slideshow",  color:"#d97706" },
  { id:"guia",        label:"Guia de Estudio",           icon:"ti-map",        color:"#65a30d" },
  { id:"adaptado",    label:"Contenido Adaptado (NEE)",  icon:"ti-heart",      color:"#db2777" },
];

const MM_TYPES = [
  { id:"podcast",             label:"Guion de Podcast",         icon:"ti-microphone",   desc:"Episodio educativo completo" },
  { id:"infografia",          label:"Estructura de Infografia", icon:"ti-chart-bar",    desc:"Layout para Canva" },
  { id:"video_script",        label:"Guion de Video",           icon:"ti-video",        desc:"Con descripcion visual" },
  { id:"presentacion_visual", label:"Presentacion Visual",      icon:"ti-presentation", desc:"Slide por slide" },
  { id:"imagen_ia",           label:"Generador de Imagenes IA", icon:"ti-photo-ai",     desc:"Imagenes con IA" },
];

const LEVELS = [
  "Inicial","Primario (1-3)","Primario (4-6)",
  "Secundario (1-3)","Secundario (4-6)",
  "Terciario / Universitario","Formacion Docente","Capacitacion Profesional",
];

function sysGen(type, subject, level, materials, bibliography) {
  var ctx = "Materia: \"" + subject + "\" | Nivel: " + level + "." +
    (materials ? "\n\nPrograma:\n" + materials : "") +
    (bibliography ? "\n\nBibliografia y contenido de referencia:\n" + bibliography.slice(0, 8000) : "");
  var p = {
    planclase:    "Sos experto en planificacion curricular. " + ctx,
    actividad:    "Sos especialista en diseno instruccional. " + ctx,
    rubrica:      "Sos experto en evaluacion educativa. " + ctx,
    evaluacion:   "Sos especialista en evaluacion y psicometria. " + ctx,
    material:     "Sos experto en comunicacion educativa. " + ctx,
    presentacion: "Sos especialista en presentaciones educativas. " + ctx,
    guia:         "Sos experto en aprendizaje autonomo. " + ctx,
    adaptado:     "Sos especialista en educacion inclusiva y NEE. " + ctx,
  };
  return (p[type] || ctx) + "\n\nResponde en espanol rioplatense con Markdown.";
}

function userGen(type, topic, diff, extra, subject) {
  var e = extra ? "\n\nInstrucciones adicionales: " + extra : "";
  var isMakeCode = topic.toLowerCase().includes("micro") || topic.toLowerCase().includes("makecode") ||
    (extra && extra.toLowerCase().includes("makecode")) ||
    (subject && ((subject.name||"").toLowerCase().includes("robot") || (subject.name||"").toLowerCase().includes("program")));
  var mk = isMakeCode ? "\n\nIMPORTANTE: Al final agrega '## Codigo MakeCode' con codigo JavaScript para micro:bit en bloque ```javascript." : "";
  var m = {
    planclase:   "Plan de clase completo sobre: \"" + topic + "\" | Dificultad: " + diff + "\n\nIncluí: objetivos (verbos Bloom), contenidos, secuencia didactica (inicio/desarrollo/cierre con tiempos), evaluacion formativa." + e,
    actividad:   "Actividad didactica sobre: \"" + topic + "\" | Dificultad: " + diff + "\n\nIncluí: titulo, objetivos, duracion, materiales, desarrollo completo, consignas exactas, criterios." + mk + e,
    rubrica:     "Rubrica analitica para: \"" + topic + "\" | Dificultad: " + diff + "\n\nIncluí: tabla con 5-6 criterios, 4 niveles (Excelente/Satisfactorio/En proceso/Inicial), descriptores, puntaje." + e,
    evaluacion:  "Evaluacion completa sobre: \"" + topic + "\" | Dificultad: " + diff + "\n\n5 opcion multiple, 4 V/F con justificacion, 3 respuesta breve, 1 desarrollo, clave de respuestas." + e,
    material:    "Material didactico sobre: \"" + topic + "\" | Dificultad: " + diff + "\n\nIntroduccion, desarrollo por subtemas, ejemplos, actividades, sintesis, glosario." + e,
    presentacion:"Esquema sobre: \"" + topic + "\" | Dificultad: " + diff + "\n\nGenera 12-15 diapositivas con EXACTAMENTE este formato:\n\n## SLIDE [N]: [Titulo]\n[Bullets comenzando con -]\nNOTAS: [Lo que dice el presentador]\n\n---\n\nRepeti para cada slide." + e,
    guia:        "Guia de estudio sobre: \"" + topic + "\" | Dificultad: " + diff + "\n\nObjetivos, mapa de conceptos, preguntas orientadoras, actividades, autoevaluacion, estrategias de repaso." + e,
    adaptado:    "Contenido adaptado NEE sobre: \"" + topic + "\" | 4 versiones: Dislexia, TDAH, Discapacidad Visual, Altas Capacidades. Instrucciones paso a paso, estrategias docentes." + e,
  };
  return m[type] || "Contenido educativo sobre \"" + topic + "\". Dificultad: " + diff + "." + e;
}

function userMM(type, topic, extra) {
  var e = extra ? "\n\nInstrucciones: " + extra : "";
  var m = {
    podcast:             "Guion de podcast sobre \"" + topic + "\": [INTRO], [BLOQUES] 3-4 partes, [CIERRE], notas de produccion." + e,
    infografia:          "Infografia sobre \"" + topic + "\": titulo, 5+ secciones, paleta HEX, instrucciones para Canva." + e,
    video_script:        "Guion de video sobre \"" + topic + "\" [IMAGEN][VOZ][TEXTO]: gancho, 3-4 bloques, CTA." + e,
    presentacion_visual: "Presentacion visual sobre \"" + topic + "\" 15 slides: N, titulo, layout, descripcion, texto, guion." + e,
  };
  return m[type] || "Contenido multimedia educativo sobre \"" + topic + "\"." + e;
}

function userSequence(topic, nClasses, level, subject, extra) {
  return "Diseña una secuencia didactica de " + nClasses + " clases sobre: \"" + topic + "\"" +
    (subject ? " para " + subject.name : "") + (level ? " | Nivel: " + level : "") +
    (subject && subject.materials ? "\n\nPrograma:\n" + subject.materials.slice(0, 400) : "") +
    "\n\nPara cada clase usa ESTE FORMATO EXACTO:\n\n## CLASE [N]: [Titulo]\n**Duracion:** [min]\n**Objetivos:** [2-3]\n**Retoma:** [conexion anterior]\n**Inicio (10min):** [apertura]\n**Desarrollo (25min):** [actividad principal]\n**Cierre (10min):** [sintesis]\n**Recursos:** [materiales]\n**Evaluacion:** [como evaluar]\n\n---\n\nProgresion clara de dificultad entre clases." + (extra ? "\n\nInstrucciones adicionales: " + extra : "");
}

async function callClaude(system, messages, maxTokens) {
  if (!maxTokens) maxTokens = 4000;
  var res = await fetch("/api/generate", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ system, messages, maxTokens }),
  });
  if (!res.ok) { var err = {}; try { err = await res.json(); } catch {} throw new Error(err.error || "Error " + res.status); }
  var data = await res.json();
  return data.content.filter(function(b){return b.type==="text";}).map(function(b){return b.text;}).join("");
}

async function dbLoadPublicLib() {
  var r = await supabase.from("public_library").select("*").order("created_at",{ascending:false});
  if (r.error) throw r.error; return r.data||[];
}
async function dbAddPublicItem(userId, userName, item) {
  var r = await supabase.from("public_library").insert({user_id:userId,user_name:userName,...item});
  if (r.error) throw r.error;
}
async function dbDelPublicItem(id) {
  var r = await supabase.from("public_library").delete().eq("id",id); if(r.error) throw r.error;
}
async function dbLoadSubjects(userId) {
  var r = await supabase.from("subjects").select("*").eq("user_id",userId).order("created_at");
  if(r.error) throw r.error; return r.data||[];
}
async function dbAddSubject(userId, form) {
  var r = await supabase.from("subjects").insert({user_id:userId,...form}).select().single();
  if(r.error) throw r.error; return r.data;
}
async function dbUpdateSubject(id, data) {
  var r = await supabase.from("subjects").update(data).eq("id",id).select().single();
  if(r.error) throw r.error; return r.data;
}
async function dbDelSubject(id) {
  var r = await supabase.from("subjects").delete().eq("id",id); if(r.error) throw r.error;
}
async function dbLoadLibrary(userId) {
  var r = await supabase.from("library_items").select("*").eq("user_id",userId).order("created_at",{ascending:false});
  if(r.error) throw r.error; return r.data||[];
}
async function dbAddLibraryItem(userId, item) {
  var r = await supabase.from("library_items").insert({user_id:userId,...item}); if(r.error) throw r.error;
}
async function dbDelLibraryItem(id) {
  var r = await supabase.from("library_items").delete().eq("id",id); if(r.error) throw r.error;
}
async function dbLoadBank(userId) {
  var r = await supabase.from("question_bank").select("*").eq("user_id",userId).order("created_at",{ascending:false});
  if(r.error) throw r.error; return r.data||[];
}
async function dbAddBankItem(userId, item) {
  var r = await supabase.from("question_bank").insert({user_id:userId,...item}); if(r.error) throw r.error;
}
async function dbDelBankItem(id) {
  var r = await supabase.from("question_bank").delete().eq("id",id); if(r.error) throw r.error;
}
async function dbLoadSequences(userId) {
  var r = await supabase.from("sequences").select("*").eq("user_id",userId).order("created_at",{ascending:false});
  if(r.error) throw r.error; return r.data||[];
}
async function dbAddSequence(userId, data) {
  var r = await supabase.from("sequences").insert({user_id:userId,...data}).select().single();
  if(r.error) throw r.error; return r.data;
}
async function dbDelSequence(id) {
  var r = await supabase.from("sequences").delete().eq("id",id); if(r.error) throw r.error;
}
async function dbLoadStudents(userId, subjectId) {
  var r = await supabase.from("students").select("*").eq("user_id",userId).eq("subject_id",subjectId).order("name");
  if(r.error) throw r.error; return r.data||[];
}
async function dbAddStudent(userId, subjectId, name, notes) {
  var r = await supabase.from("students").insert({user_id:userId,subject_id:subjectId,name,notes:notes||""}).select().single();
  if(r.error) throw r.error; return r.data;
}
async function dbDelStudent(id) {
  var r = await supabase.from("students").delete().eq("id",id); if(r.error) throw r.error;
}
async function dbLoadEvaluations(userId, studentId) {
  var r = await supabase.from("student_evaluations").select("*").eq("user_id",userId).eq("student_id",studentId).order("evaluated_at",{ascending:false});
  if(r.error) throw r.error; return r.data||[];
}
async function dbAddEvaluation(userId, studentId, evalData) {
  var r = await supabase.from("student_evaluations").insert({user_id:userId,student_id:studentId,...evalData}).select().single();
  if(r.error) throw r.error; return r.data;
}
async function dbDelEvaluation(id) {
  var r = await supabase.from("student_evaluations").delete().eq("id",id); if(r.error) throw r.error;
}
async function dbLoadAllEvaluations(userId, subjectId) {
  var r = await supabase.from("student_evaluations").select("*, students(name, subject_id)").eq("user_id",userId).order("evaluated_at",{ascending:false});
  if(r.error) throw r.error;
  var data = r.data||[];
  if(subjectId) data = data.filter(function(e){return e.students && e.students.subject_id===subjectId;});
  return data;
}
async function dbLogUsage(userId, userEmail, type, typeName, subjectName, tokIn, tokOut, isImage) {
  try { await supabase.from("usage_log").insert({user_id:userId,user_email:userEmail,type,type_name:typeName,subject_name:subjectName||"",tokens_input:tokIn||0,tokens_output:tokOut||0,is_image:isImage||false}); } catch {}
}
async function dbCheckSubscription(userId) {
  var r = await supabase.from("subscriptions").select("id,status,current_period_end,plan_id,is_trial").eq("user_id",userId).eq("status","active").limit(1);
  if(r.error||!r.data||r.data.length===0) return null;
  var sub = r.data[0];
  if(sub.current_period_end && new Date(sub.current_period_end)<new Date()) return null;
  return sub;
}
async function dbCreateTrial(userId) {
  var endDate = new Date(); endDate.setDate(endDate.getDate()+7);
  await supabase.from("subscriptions").insert({user_id:userId,type:"individual",status:"active",is_trial:true,max_users:1,current_period_start:new Date().toISOString(),current_period_end:endDate.toISOString()});
}

const C = {
  bg:"#EBF5F0", surf:"#ffffff", card:"#ffffff", border:"#A8DBA8",
  accent:"#26C3D4", accentBg:"#e6f9fb",
  text:"#0D3559", textMuted:"#2a5a7a", textDim:"#5a8aaa",
  blue:"#0D3559", green:"#79BD9A", purple:"#26C3D4", red:"#dc2626",
};
const inp = {background:"#fff",border:"1px solid #A8DBA8",borderRadius:4,padding:"9px 13px",color:C.text,fontSize:14,width:"100%",outline:"none",fontFamily:"Quicksand,sans-serif"};
const sel = {background:"#fff",border:"1px solid #A8DBA8",borderRadius:4,padding:"9px 13px",color:C.text,fontSize:13,outline:"none",fontFamily:"Quicksand,sans-serif"};
const lbl = {fontSize:11,color:C.textMuted,marginBottom:5,display:"block",fontWeight:600,letterSpacing:.5};
const card = {background:"#fff",border:"1px solid #A8DBA8",borderRadius:4,padding:"18px 20px",marginBottom:16};

function Btn({children,onClick,v,disabled,st}) {
  if(!v) v="primary"; if(!st) st={}; if(!disabled) disabled=false;
  var base={padding:v==="sm"?"5px 11px":"9px 18px",borderRadius:4,cursor:disabled?"not-allowed":"pointer",fontWeight:600,fontSize:v==="sm"?12:13,fontFamily:"Quicksand,sans-serif",opacity:disabled?.45:1,transition:"opacity .15s",display:"inline-flex",alignItems:"center",gap:2};
  var vs={
    primary:{background:C.accent,color:"#fff",border:"none"},
    secondary:{background:C.card,color:C.text,border:"1px solid #d4cfc6"},
    ghost:{background:"transparent",color:C.text,border:"1px solid #d4cfc6"},
    danger:{background:"#fee2e2",color:C.red,border:"none"},
    accent:{background:"transparent",color:C.accent,border:"1px solid #0d9488"},
    green:{background:"transparent",color:C.green,border:"1px solid #059669"},
    sm:{background:C.card,color:C.text,border:"1px solid #d4cfc6"},
  };
  return <button style={Object.assign({},base,vs[v]||vs.primary,st)} onClick={disabled?undefined:onClick}>{children}</button>;
}

function Spin() {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"44px 0",gap:12}}>
      <div style={{width:34,height:34,border:"3px solid #d4cfc6",borderTop:"3px solid "+C.accent,borderRadius:"50%",animation:"spin 1s linear infinite"}} />
      <div style={{color:C.textMuted,fontSize:13}}>Generando contenido...</div>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}

function Tag({children,color}) {
  return <span style={{display:"inline-block",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:color+"22",color,letterSpacing:.3}}>{children}</span>;
}

function MDView({text,maxH}) {
  if(!maxH) maxH=560;
  var css=".md h1{color:#0f766e;font-size:1.28em;font-weight:700;margin:1.2em 0 .4em;border-bottom:1px solid #d4cfc6;padding-bottom:.2em}"+
    ".md h2{color:#0d9488;font-size:1.1em;font-weight:700;margin:1.1em 0 .35em}"+
    ".md h3{color:#0f766e;font-size:1em;font-weight:600;margin:.95em 0 .28em}"+
    ".md strong{color:#111110;font-weight:700}.md em{color:#0f766e}"+
    ".md code{background:#e6f7f5;padding:2px 6px;border-radius:4px;font-size:.82em;font-family:monospace;color:#0f766e}"+
    ".md ul{margin:.35em 0 .35em 1.3em;list-style:disc}.md ol{margin:.35em 0 .35em 1.3em;list-style:decimal}"+
    ".md li{margin:.22em 0;color:#374151;line-height:1.6}.md p{color:#374151;margin:.45em 0;line-height:1.7}"+
    ".md hr{border:none;border-top:1px solid #d4cfc6;margin:.9em 0}"+
    ".md table{border-collapse:collapse;width:100%;margin:.7em 0;font-size:.87em}"+
    ".md th{background:#e6f7f5;color:#0f766e;padding:6px 10px;border:1px solid #d4cfc6;font-weight:600;text-align:left}"+
    ".md td{padding:5px 10px;border:1px solid #d4cfc6;color:#374151;vertical-align:top}"+
    ".md tr:nth-child(even) td{background:#f9f9f7}"+
    ".md blockquote{border-left:3px solid #0d9488;margin:.5em 0;padding:.35em .75em;background:#e6f7f5;color:#6b7280;border-radius:0 4px 4px 0}"+
    ".md pre{background:#f5f5f0;padding:11px;border-radius:4px;overflow-x:auto;font-family:monospace;font-size:.82em;color:#0f766e;margin:.5em 0}";
  var h=text
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/```[\w]*\n([\s\S]*?)```/g,function(_,c){return "<pre>"+c+"</pre>";})
    .replace(/\*\*\*(.+?)\*\*\*/g,"<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*([^\n*]+?)\*/g,"<em>$1</em>")
    .replace(/`([^`]+)`/g,"<code>$1</code>")
    .replace(/^#### (.+)$/gm,"<h4>$1</h4>").replace(/^### (.+)$/gm,"<h3>$1</h3>")
    .replace(/^## (.+)$/gm,"<h2>$1</h2>").replace(/^# (.+)$/gm,"<h1>$1</h1>")
    .replace(/^---$/gm,"<hr/>").replace(/^> (.+)$/gm,"<blockquote>$1</blockquote>")
    .replace(/^[-*] (.+)$/gm,"<li>$1</li>").replace(/^\d+\. (.+)$/gm,"<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g,function(m){return "<ul>"+m+"</ul>";})
    .replace(/\n\n+/g,"</p><p>").replace(/\n/g,"<br/>");
  return (
    <div style={{background:"#f9f9f7",border:"1px solid #d4cfc6",borderRadius:4,padding:"15px 19px",maxHeight:maxH,overflow:"auto",lineHeight:1.75,fontSize:14,fontFamily:"Quicksand,sans-serif"}}>
      <style>{css}</style>
      <div className="md"><p dangerouslySetInnerHTML={{__html:h}}/></div>
    </div>
  );
}

function PricingPanel({authUser}) {
  var [loading,setLoading]=useState(null);
  var [error,setError]=useState("");
  var plans=[
    {id:"98238f5797f94e58b94d51aa08f63fad",name:"Individual Mensual",price:"$12.000",period:"por mes",users:1,color:C.blue,features:["Generador IA (8 tipos)","Multimedia + Imagenes","Chat Docente","Corrector de TPs","Exportacion Word y PDF","Biblioteca personal"]},
    {id:"55095e9d02bb469ba4aef78826676787",name:"Individual Anual",price:"$102.000",period:"por anio",badge:"Ahorra 15%",users:1,color:C.accent,features:["Todo Individual","2 meses gratis","Soporte prioritario"]},
    {id:"bcdbe285413b4acbbd187fc2fe6d52dc",name:"Institucional Basico",price:"$100.000",period:"por mes",users:10,color:C.green,features:["Hasta 10 docentes","Biblioteca publica compartida","Panel admin institucional","Soporte dedicado"]},
    {id:"e01bfd16f46c4d0db1a8aa56afc837d7",name:"Institucional Pro",price:"$255.000",period:"por mes",users:30,color:C.purple,features:["Hasta 30 docentes","Todo Institucional Basico","Carga masiva de usuarios","Reportes de uso"]},
  ];
  async function subscribe(plan) {
    if(!authUser){setError("Tenes que iniciar sesion para suscribirte.");return;}
    setLoading(plan.id);setError("");
    try {
      var res=await fetch("/api/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan_id:plan.id,user_email:authUser.email,user_name:(authUser.user_metadata&&authUser.user_metadata.name)||"",user_id:authUser.id})});
      var data=await res.json();
      if(!res.ok) throw new Error(data.error);
      window.open(data.init_point,"_blank");
    } catch(e){setError("Error: "+e.message);}
    setLoading(null);
  }
  return (
    <div>
      <div style={{textAlign:"center",marginBottom:32}}>
        <h2 style={{fontSize:26,fontWeight:700,color:C.text,marginBottom:8}}>Planes y Precios</h2>
        <p style={{color:C.textMuted,fontSize:15}}>Elegí el plan que mejor se adapta a tus necesidades</p>
      </div>
      {error&&<div style={{background:"#fee2e2",border:"1px solid #fca5a5",borderRadius:4,padding:"10px 16px",marginBottom:20,color:C.red,fontSize:13}}>{error}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
        {plans.map(function(plan){
          return (
            <div key={plan.id} style={{background:C.card,border:"2px solid "+plan.color+"44",borderRadius:4,padding:24,display:"flex",flexDirection:"column"}}>
              {plan.badge&&<div style={{background:plan.color,color:"#fff",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,display:"inline-block",marginBottom:12,alignSelf:"flex-start"}}>{plan.badge}</div>}
              <div style={{fontSize:17,fontWeight:700,color:C.text,marginBottom:4}}>{plan.name}</div>
              <div style={{fontSize:11,color:C.textMuted,marginBottom:16}}>{"Hasta "+plan.users+(plan.users===1?" usuario":" usuarios")}</div>
              <div style={{marginBottom:20}}>
                <span style={{fontSize:28,fontWeight:700,color:plan.color}}>{plan.price}</span>
                <span style={{fontSize:13,color:C.textMuted,marginLeft:6}}>{plan.period}</span>
              </div>
              <div style={{flex:1,marginBottom:20}}>
                {plan.features.map(function(f){
                  return (
                    <div key={f} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <i className="ti ti-check" style={{color:plan.color,fontSize:14}}/>
                      <span style={{fontSize:13,color:C.text}}>{f}</span>
                    </div>
                  );
                })}
              </div>
              <button style={{width:"100%",padding:"11px 0",borderRadius:4,border:"none",cursor:loading===plan.id?"not-allowed":"pointer",fontWeight:700,fontSize:14,fontFamily:"Quicksand,sans-serif",background:plan.color,color:"#fff",opacity:loading===plan.id?.7:1}} onClick={function(){subscribe(plan);}} disabled={loading===plan.id}>
                {loading===plan.id?"Procesando...":"Suscribirme"}
              </button>
            </div>
          );
        })}
      </div>
      <p style={{textAlign:"center",color:C.textDim,fontSize:12,marginTop:24}}>Pagos procesados por MercadoPago</p>
    </div>
  );
}

function AdminPanel({authUser,supabaseClient}) {
  var isAdmin=authUser&&authUser.email===import.meta.env.VITE_ADMIN_EMAIL;
  var [stats,setStats]=useState(null);
  var [statsLoading,setStatsLoading]=useState(true);
  var [instName,setInstName]=useState("");
  var [instMaxUsers,setInstMaxUsers]=useState(10);
  var [instFile,setInstFile]=useState(null);
  var [instLoading,setInstLoading]=useState(false);
  var [instResult,setInstResult]=useState(null);
  var [institutions,setInstitutions]=useState([]);
  var [selectedInst,setSelectedInst]=useState("");
  var [instUsers,setInstUsers]=useState([]);
  var [instUsersLoading,setInstUsersLoading]=useState(false);

  useEffect(function(){
    if(!isAdmin) return;
    supabaseClient.from("usage_log").select("*").order("created_at",{ascending:false}).limit(500)
      .then(function(result){setStats(result.data||[]);setStatsLoading(false);});
    supabaseClient.from("subscriptions").select("institution_name").eq("type","institutional").neq("institution_name","")
      .then(function(result){
        if(result.data){
          var unique=[];
          result.data.forEach(function(s){if(s.institution_name&&!unique.includes(s.institution_name)) unique.push(s.institution_name);});
          setInstitutions(unique);
        }
      });
  },[isAdmin]);

  async function processExcel() {
    if(!instFile||!instName) return;
    setInstLoading(true);setInstResult(null);
    try {
      var XLSX=await import("xlsx");
      var buffer=await instFile.arrayBuffer();
      var wb=XLSX.read(buffer,{type:"array"});
      var sheet=wb.Sheets[wb.SheetNames[0]];
      var rows=XLSX.utils.sheet_to_json(sheet,{header:1});
      var users=[];
      for(var i=1;i<rows.length;i++){
        var row=rows[i];
        if(row[0]) users.push({email:String(row[0]).trim(),name:row[1]?String(row[1]).trim():""});
      }
      var res=await fetch("/api/invite-users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({users,institution_name:instName,plan_id:"bcdbe285413b4acbbd187fc2fe6d52dc",max_users:instMaxUsers})});
      var data=await res.json();
      setInstResult(data);
    } catch(e){setInstResult({error:e.message});}
    setInstLoading(false);
  }

  async function loadInstUsers(institutionName) {
    setInstUsersLoading(true);
    var result=await supabaseClient.from("subscriptions").select("user_id,status,institution_name,current_period_end").eq("institution_name",institutionName).eq("type","institutional");
    setInstUsers(result.data||[]);setInstUsersLoading(false);
  }

  async function toggleUserStatus(userId,currentStatus) {
    var newStatus=currentStatus==="active"?"inactive":"active";
    await supabaseClient.from("subscriptions").update({status:newStatus}).eq("user_id",userId);
    loadInstUsers(selectedInst);
  }

  if(!isAdmin) return (
    <div style={Object.assign({},card,{textAlign:"center",padding:"52px 24px",color:C.textDim})}>
      <i className="ti ti-lock" style={{fontSize:36,display:"block",marginBottom:10,color:C.textDim}}/>
      <p>Acceso restringido al administrador.</p>
    </div>
  );

  if(statsLoading||!stats) return <div style={{textAlign:"center",padding:"40px 0"}}><Spin/></div>;

  var totalGen=stats.filter(function(s){return!s.is_image;}).length;
  var totalImg=stats.filter(function(s){return s.is_image;}).length;
  var totalTokIn=stats.reduce(function(a,s){return a+(s.tokens_input||0);},0);
  var totalTokOut=stats.reduce(function(a,s){return a+(s.tokens_output||0);},0);
  var costText=((totalTokIn*0.000003)+(totalTokOut*0.000015)+(totalImg*0.07)).toFixed(2);
  var userMap={};
  stats.forEach(function(s){if(!userMap[s.user_email])userMap[s.user_email]={email:s.user_email,gens:0,imgs:0};if(s.is_image)userMap[s.user_email].imgs++;else userMap[s.user_email].gens++;});
  var users=Object.values(userMap).sort(function(a,b){return(b.gens+b.imgs)-(a.gens+a.imgs);});
  var typeMap={};
  stats.filter(function(s){return!s.is_image;}).forEach(function(s){typeMap[s.type_name]=(typeMap[s.type_name]||0)+1;});
  var types=Object.entries(typeMap).sort(function(a,b){return b[1]-a[1];});

  return (
    <div>
      <h2 style={{fontSize:19,fontWeight:700,color:C.text,marginBottom:20,display:"flex",alignItems:"center",gap:8}}>
        <i className="ti ti-chart-bar" style={{fontSize:18,color:C.accent}}/>Panel de Administrador
      </h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[{l:"Generaciones",v:totalGen,i:"ti-bolt",c:C.accent},{l:"Imagenes",v:totalImg,i:"ti-photo",c:C.purple},{l:"Usuarios activos",v:users.length,i:"ti-users",c:C.blue},{l:"Costo estimado",v:"$"+costText,i:"ti-coin",c:C.green}].map(function(x){
          return (
            <div key={x.l} style={Object.assign({},card,{marginBottom:0})}>
              <i className={"ti "+x.i} style={{fontSize:22,marginBottom:8,color:x.c,display:"block"}}/>
              <div style={{fontSize:26,fontWeight:700,color:x.c}}>{x.v}</div>
              <div style={{fontSize:12,color:C.textDim,marginTop:2}}>{x.l}</div>
            </div>
          );
        })}
      </div>
      <div style={Object.assign({},card,{marginBottom:16})}>
        <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
          <i className="ti ti-school" style={{fontSize:16,color:C.accent}}/>Carga Institucional
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div>
            <label style={lbl}>NOMBRE DEL COLEGIO *</label>
            <input style={inp} value={instName} onChange={function(e){setInstName(e.target.value);}} placeholder="Ej: Colegio San Martin"/>
          </div>
          <div>
            <label style={lbl}>MAX USUARIOS</label>
            <input style={inp} type="number" value={instMaxUsers} onChange={function(e){setInstMaxUsers(parseInt(e.target.value)||10);}}/>
          </div>
        </div>
        <div style={{marginBottom:12}}>
          <label style={{...lbl,marginBottom:8}}>ARCHIVO EXCEL</label>
          <label style={{display:"inline-flex",alignItems:"center",gap:6,background:C.surf,border:"1px solid "+C.border,borderRadius:4,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:600,color:C.text}}>
            <i className="ti ti-upload" style={{fontSize:14}}/>
            {instFile?instFile.name:"Importar Excel"}
            <input type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={function(e){setInstFile(e.target.files[0]);}}/>
          </label>
        </div>
        <Btn disabled={instLoading||!instFile||!instName} onClick={processExcel}>
          {instLoading?"Procesando...":<><i className="ti ti-upload" style={{fontSize:13,marginRight:4}}/>Cargar usuarios</>}
        </Btn>
        {instResult&&(
          <div style={{marginTop:14,padding:"12px 16px",background:C.bg,borderRadius:4,fontSize:13,border:"1px solid "+C.border}}>
            {instResult.error?<span style={{color:C.red}}>Error: {instResult.error}</span>:(
              <div>
                <div style={{color:C.green,marginBottom:4}}>Creados: {instResult.created}</div>
                <div style={{color:C.textMuted,marginBottom:4}}>Ya existian: {instResult.already_exists}</div>
                {instResult.failed>0&&<div style={{color:C.red}}>Fallidos: {instResult.failed}</div>}
              </div>
            )}
          </div>
        )}
      </div>
      <div style={Object.assign({},card,{marginBottom:16})}>
        <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
          <i className="ti ti-users" style={{fontSize:16,color:C.accent}}/>Gestion de Usuarios Institucionales
        </div>
        <div style={{display:"flex",gap:10,marginBottom:14}}>
          <select style={Object.assign({},sel,{flex:1})} value={selectedInst} onChange={function(e){setSelectedInst(e.target.value);}}>
            <option value="">-- Seleccionar colegio --</option>
            {institutions.map(function(inst){return <option key={inst} value={inst}>{inst}</option>;})}
          </select>
          <Btn onClick={function(){if(selectedInst)loadInstUsers(selectedInst);}}>Buscar</Btn>
        </div>
        {instUsersLoading&&<div style={{color:C.textMuted,fontSize:13}}>Cargando...</div>}
        {instUsers.length>0&&(
          <div>
            <div style={{fontSize:12,color:C.textMuted,marginBottom:10}}>{instUsers.length+" usuarios encontrados"}</div>
            {instUsers.map(function(u){
              return (
                <div key={u.user_id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid "+C.border}}>
                  <div>
                    <div style={{fontSize:13,color:C.text}}>{u.user_id.slice(0,8)+"..."}</div>
                    <div style={{fontSize:11,color:C.textDim}}>{"Vence: "+new Date(u.current_period_end).toLocaleDateString("es-AR")}</div>
                  </div>
                  <button style={{padding:"5px 14px",borderRadius:4,border:"none",cursor:"pointer",fontFamily:"Quicksand,sans-serif",fontWeight:600,fontSize:12,background:u.status==="active"?"#fee2e2":"#dcfce7",color:u.status==="active"?C.red:C.green}} onClick={function(){toggleUserStatus(u.user_id,u.status);}}>
                    {u.status==="active"?"Desactivar":"Activar"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <div style={card}>
          <div style={{fontSize:13,fontWeight:700,color:C.textMuted,marginBottom:14}}>USUARIOS MAS ACTIVOS</div>
          {!users.length?<p style={{color:C.textDim,fontSize:13}}>Sin datos aun.</p>:users.slice(0,10).map(function(u){
            return (
              <div key={u.email} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid "+C.border}}>
                <div style={{fontSize:13,color:C.text}}>{u.email.split("@")[0]}</div>
                <div style={{display:"flex",gap:12}}>
                  <span style={{fontSize:12,color:C.accent}}>{u.gens+" gen"}</span>
                  <span style={{fontSize:12,color:C.purple}}>{u.imgs+" img"}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={card}>
          <div style={{fontSize:13,fontWeight:700,color:C.textMuted,marginBottom:14}}>CONTENIDO MAS GENERADO</div>
          {!types.length?<p style={{color:C.textDim,fontSize:13}}>Sin datos aun.</p>:types.slice(0,8).map(function(t){
            var pct=totalGen>0?Math.round((t[1]/totalGen)*100):0;
            return (
              <div key={t[0]} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:13,color:C.text}}>{t[0]}</span>
                  <span style={{fontSize:12,color:C.textMuted}}>{t[1]+" ("+pct+"%)"}</span>
                </div>
                <div style={{background:C.bg,borderRadius:4,height:6}}>
                  <div style={{background:C.accent,borderRadius:4,height:6,width:pct+"%"}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={card}>
        <div style={{fontSize:13,fontWeight:700,color:C.textMuted,marginBottom:14}}>ULTIMAS GENERACIONES</div>
        {!stats.length?<p style={{color:C.textDim,fontSize:13}}>Sin datos aun.</p>:(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{borderBottom:"1px solid "+C.border}}>
                  {["Usuario","Tipo","Materia","Tokens","Fecha"].map(function(h){return <th key={h} style={{textAlign:"left",padding:"6px 10px",color:C.textMuted,fontWeight:600}}>{h}</th>;})}
                </tr>
              </thead>
              <tbody>
                {stats.slice(0,20).map(function(s){
                  return (
                    <tr key={s.id} style={{borderBottom:"1px solid "+C.bg}}>
                      <td style={{padding:"6px 10px",color:C.textMuted}}>{s.user_email.split("@")[0]}</td>
                      <td style={{padding:"6px 10px",color:C.text}}>{s.type_name}</td>
                      <td style={{padding:"6px 10px",color:C.textDim}}>{s.subject_name||"—"}</td>
                      <td style={{padding:"6px 10px",color:C.accent}}>{s.is_image?"imagen":(s.tokens_input+s.tokens_output)}</td>
                      <td style={{padding:"6px 10px",color:C.textDim}}>{new Date(s.created_at).toLocaleDateString("es-AR")}</td>
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

function AuthScreen({onAuth}) {
  var [mode,setMode]=useState("login");
  var [email,setEmail]=useState("");
  var [password,setPass]=useState("");
  var [name,setName]=useState("");
  var [loading,setLoading]=useState(false);
  var [error,setError]=useState("");
  var [confirmed,setConfirmed]=useState(false);

  async function handleLogin() {
    if(!email||!password) return;
    setLoading(true);setError("");
    var result=await supabase.auth.signInWithPassword({email,password});
    if(result.error){setError(result.error.message.includes("Email not confirmed")?"Todavia no confirmaste tu email.":"Email o contrasena incorrectos.");}
    else{onAuth(result.data.user);}
    setLoading(false);
  }

  async function handleRegister() {
    if(!email||!password||!name) return;
    setLoading(true);setError("");
    var result=await supabase.auth.signUp({email,password,options:{data:{name}}});
    if(result.error){setError(result.error.message);}
    else if(result.data.session){onAuth(result.data.user);}
    else{setConfirmed(true);}
    setLoading(false);
  }

  if(confirmed) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg}}>
      <div style={{width:420,textAlign:"center"}}>
        <i className="ti ti-mail" style={{fontSize:52,color:C.accent,display:"block",marginBottom:16}}/>
        <h2 style={{color:C.accent,fontSize:24,fontWeight:700,margin:"0 0 12px"}}>Revisa tu email</h2>
        <p style={{color:C.textMuted,fontSize:15,marginBottom:8}}>Te enviamos un link a {email}</p>
        <button style={{background:"transparent",border:"none",cursor:"pointer",color:C.accent,fontSize:14,fontFamily:"Quicksand,sans-serif",fontWeight:600,marginTop:24}} onClick={function(){setConfirmed(false);setMode("login");}}>Ir a iniciar sesion</button>
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg}}>
      <div style={{width:420}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <i className="ti ti-school" style={{fontSize:52,color:C.accent,display:"block",marginBottom:12}}/>
          <h1 style={{color:C.accent,fontSize:30,fontWeight:700,margin:"0 0 6px"}}>AulaXpro</h1>
          <p style={{color:C.textMuted,fontSize:15}}>Tu asistente docente con IA</p>
        </div>
        <div style={card}>
          <div style={{display:"flex",gap:4,marginBottom:22,background:C.bg,borderRadius:4,padding:4}}>
            {[{id:"login",label:"Iniciar sesion"},{id:"register",label:"Registrarse"}].map(function(t){
              return <button key={t.id} style={{flex:1,padding:"7px 0",borderRadius:4,border:"none",cursor:"pointer",fontFamily:"Quicksand,sans-serif",fontWeight:600,fontSize:13,background:mode===t.id?C.card:"transparent",color:mode===t.id?C.text:C.textDim}} onClick={function(){setMode(t.id);setError("");}}>{t.label}</button>;
            })}
          </div>
          {mode==="register"&&(
            <div>
              <label style={lbl}>NOMBRE</label>
              <input style={Object.assign({},inp,{marginBottom:12})} value={name} onChange={function(e){setName(e.target.value);}} placeholder="Prof. Garcia"/>
            </div>
          )}
          <label style={lbl}>EMAIL</label>
          <input style={Object.assign({},inp,{marginBottom:12})} type="email" value={email} onChange={function(e){setEmail(e.target.value);}} placeholder="docente@escuela.edu.ar"/>
          <label style={lbl}>CONTRASENA</label>
          <input style={Object.assign({},inp,{marginBottom:20})} type="password" value={password} onChange={function(e){setPass(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter") mode==="login"?handleLogin():handleRegister();}} placeholder="Minimo 6 caracteres"/>
          {error&&<div style={{color:C.red,fontSize:13,background:"#fee2e2",padding:"9px 13px",borderRadius:4,marginBottom:14}}>{error}</div>}
          <Btn st={{width:"100%",padding:"11px 20px",fontSize:14,justifyContent:"center"}} disabled={loading} onClick={mode==="login"?handleLogin:handleRegister}>
            {loading?"Procesando...":mode==="login"?"Entrar":"Crear cuenta"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

export default function AulaXpro() {
  var [authUser,setAuthUser]=useState(null);
  var [authLoading,setAuthLoading]=useState(true);
  var [subjects,setSubjects]=useState([]);
  var [curSid,setCurSid]=useState(null);
  var [view,setView]=useState("dashboard");
  var [bar,setBar]=useState(true);
  var [mobileMenu,setMobileMenu]=useState(false);
  var [subjModal,setSubjModal]=useState(false);
  var [sf,setSf]=useState({name:"",level:"Secundario (4-6)",materials:"",bibliography:""});
var [sfPdfs,setSfPdfs]=useState([]);
var [pdfLoading,setPdfLoading]=useState(false);
var [editingSubject,setEditingSubject]=useState(null);var [sf,setSf]=useState({name:"",level:"Secundario (4-6)",materials:""});
  var [library,setLibrary]=useState([]);
  var [bank,setBank]=useState([]);
  var [publicLib,setPublicLib]=useState([]);
  var [sequences,setSequences]=useState([]);
  var [dataLoading,setDataLoading]=useState(false);
  var [subscription,setSubscription]=useState(null);
  var [subChecked,setSubChecked]=useState(false);
  var [genType,setGenType]=useState("planclase");
  var [genTopic,setGenTopic]=useState("");
  var [genLevel,setGenLevel]=useState("Secundario (4-6)");
  var [genDiff,setGenDiff]=useState("Intermedio");
  var [genExtra,setGenExtra]=useState("");
  var [genResult,setGenResult]=useState("");
  var [genLoading,setGenLoading]=useState(false);
  var [genSaved,setGenSaved]=useState(false);
  var [genErr,setGenErr]=useState("");
  var [makeCodeUrl,setMakeCodeUrl]=useState(null);
  var [actImgUrl,setActImgUrl]=useState(null);
  var [actImgLoad,setActImgLoad]=useState(false);
  var [actImgErr,setActImgErr]=useState("");
  var [actImgDesc,setActImgDesc]=useState("");
  var [mmType,setMmType]=useState("podcast");
  var [mmTopic,setMmTopic]=useState("");
  var [mmExtra,setMmExtra]=useState("");
  var [mmResult,setMmResult]=useState("");
  var [mmLoading,setMmLoading]=useState(false);
  var [imgUrl,setImgUrl]=useState(null);
  var [imgLoading,setImgLoading]=useState(false);
  var [imgError,setImgError]=useState("");
  var [chatSid,setChatSid]=useState(null);
  var [chatMsgs,setChatMsgs]=useState([]);
  var [chatIn,setChatIn]=useState("");
  var [chatLoading,setChatLoading]=useState(false);
  var chatRef=useRef(null);
  var [corrR,setCorrR]=useState("");
  var [corrW,setCorrW]=useState("");
  var [corrResult,setCorrResult]=useState("");
  var [corrLoading,setCorrLoading]=useState(false);
  var [imgExtractLoading,setImgExtractLoading]=useState(false);
  var [imgExtractErr,setImgExtractErr]=useState("");
  var [batchFile,setBatchFile]=useState(null);
  var [batchLoading,setBatchLoading]=useState(false);
  var [batchProgress,setBatchProgress]=useState(0);
  var [batchTotal,setBatchTotal]=useState(0);
  var [batchResults,setBatchResults]=useState([]);
  var [libFilter,setLibFilter]=useState("all");
  var [libSearch,setLibSearch]=useState("");
  var [libItem,setLibItem]=useState(null);
  var [seqLoading,setSeqLoading]=useState(false);
  var [seqForm,setSeqForm]=useState({topic:"",n_classes:6,level:""});
  var [seqView,setSeqView]=useState(null);
  var [students,setStudents]=useState([]);
  var [selectedStudent,setSelectedStudent]=useState(null);
  var [studentEvals,setStudentEvals]=useState([]);
  var [allEvals,setAllEvals]=useState([]);
  var [studentsLoading,setStudentsLoading]=useState(false);
  var [newStudentName,setNewStudentName]=useState("");
  var [evalModal,setEvalModal]=useState(false);
  var [evalForm,setEvalForm]=useState({topic:"",score:0,max_score:10,rubric_id:"",rubric_name:"",feedback:""});
  var [isMobile,setIsMobile]=useState(window.innerWidth<768);
  useEffect(function(){
    function handleResize(){setIsMobile(window.innerWidth<768);}
    window.addEventListener("resize",handleResize);
    return function(){window.removeEventListener("resize",handleResize);};
  },[]);
  var curSubj=subjects.find(function(s){return s.id===curSid;})||null;

  useEffect(function(){
    supabase.auth.getSession().then(function(result){setAuthUser(result.data.session?result.data.session.user:null);setAuthLoading(false);});
    var sub=supabase.auth.onAuthStateChange(function(event,session){setAuthUser(session?session.user:null);});
    return function(){sub.data.subscription.unsubscribe();};
  },[]);

  useEffect(function(){
    if(!authUser) return;
    setDataLoading(true);
    Promise.all([dbLoadSubjects(authUser.id),dbLoadLibrary(authUser.id),dbLoadBank(authUser.id),dbLoadPublicLib(),dbLoadSequences(authUser.id)])
      .then(function(results){
        setSubjects(results[0]);setLibrary(results[1]);setBank(results[2]);setPublicLib(results[3]);setSequences(results[4]);
        if(results[0].length) setCurSid(results[0][0].id);
        setDataLoading(false);
        dbCheckSubscription(authUser.id).then(function(sub){
          if(!sub){dbCreateTrial(authUser.id).then(function(){dbCheckSubscription(authUser.id).then(function(ns){setSubscription(ns);setSubChecked(true);});});}
          else{setSubscription(sub);setSubChecked(true);}
        });
      }).catch(function(){setDataLoading(false);});
  },[authUser]);

  useEffect(function(){
    if(!authUser||!curSid) return;
    setStudentsLoading(true);
    dbLoadStudents(authUser.id,curSid).then(function(data){setStudents(data);setSelectedStudent(null);setStudentEvals([]);setStudentsLoading(false);}).catch(function(){setStudentsLoading(false);});
    dbLoadAllEvaluations(authUser.id,curSid).then(function(data){setAllEvals(data);});
  },[authUser,curSid]);

  useEffect(function(){if(chatRef.current) chatRef.current.scrollIntoView({behavior:"smooth"});},[chatMsgs]);

  async function signOut(){
    await supabase.auth.signOut();
    setSubjects([]);setLibrary([]);setBank([]);setPublicLib([]);setSequences([]);setCurSid(null);setView("dashboard");
  }

  async function processPdf(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = async function(e) {
        try {
          var base64 = e.target.result.split(",")[1];
          var res = await fetch("/api/process-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base64, filename: file.name }),
          });
          var data = await res.json();
          if (!res.ok) throw new Error(data.error);
          resolve(data);
        } catch(err) { reject(err); }
      };
      reader.readAsDataURL(file);
    });
  }
  async function addSubject(){
    if(!sf.name.trim()||!authUser) return;
    var subData = Object.assign({},sf);
    if(sfPdfs.length>0){
      var bibTexts = sfPdfs.map(function(p){return "### "+p.filename+"\n"+p.text;}).join("\n\n");
      subData.bibliography = (sf.bibliography?sf.bibliography+"\n\n":"")+bibTexts;
      subData.bibliography_files = JSON.stringify(sfPdfs.map(function(p){return {filename:p.filename,chars:p.chars};}));
    }
    if(editingSubject){
      var updated = await dbUpdateSubject(editingSubject.id, subData);
      setSubjects(subjects.map(function(s){return s.id===editingSubject.id?updated:s;}));
    } else {
      var sub=await dbAddSubject(authUser.id,subData);
      setSubjects(subjects.concat([sub]));setCurSid(sub.id);
    }
    setSf({name:"",level:"Secundario (4-6)",materials:"",bibliography:""});
    setSfPdfs([]);setEditingSubject(null);setSubjModal(false);
  }

  function generateMakeCodeUrl(content){
    var match=content.match(/```javascript\n([\s\S]*?)```/);
    if(!match) return null;
    var code=match[1].trim();
    var snippet={name:genTopic,description:"Generado con AulaXpro",editor:"microbit",code:{"main.ts":code}};
    try{var encoded=btoa(unescape(encodeURIComponent(JSON.stringify(snippet))));return "https://makecode.microbit.org/#pub:"+encoded;}
    catch{return null;}
  }

  async function generate(){
    if(!genTopic.trim()||!curSubj) return;
    setGenLoading(true);setGenResult("");setGenSaved(false);setGenErr("");setMakeCodeUrl(null);setActImgUrl(null);
    try{
      var sys=sysGen(genType,curSubj.name,genLevel||curSubj.level,curSubj.materials,curSubj.bibliography);
      var usr=userGen(genType,genTopic,genDiff,genExtra,curSubj);
      var r=await callClaude(sys,[{role:"user",content:usr}]);
      setGenResult(r);setMakeCodeUrl(generateMakeCodeUrl(r));
      var gt2=GEN_TYPES.find(function(g){return g.id===genType;});
      dbLogUsage(authUser.id,authUser.email,genType,gt2?gt2.label:genType,curSubj?curSubj.name:"",Math.round((sys.length+usr.length)/4),Math.round(r.length/4),false);
    }catch(e){setGenErr("Error: "+e.message);}
    setGenLoading(false);
  }

  async function generateMM(){
    if(!mmTopic.trim()||!curSubj) return;
    setMmLoading(true);setMmResult("");
    try{
      var sys="Sos experto en contenido educativo digital para "+curSubj.name+" ("+curSubj.level+"). Responde en espanol rioplatense con Markdown.";
      var r=await callClaude(sys,[{role:"user",content:userMM(mmType,mmTopic,mmExtra)}]);
      setMmResult(r);
    }catch(e){setMmResult("Error: "+e.message);}
    setMmLoading(false);
  }

  async function callImgApi(description,subject,level){
    var res=await fetch("/api/generate-image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({description,subject,level})});
    if(!res.ok){var ej;try{ej=await res.json();}catch{throw new Error("Error del servidor.");}throw new Error(ej.error||"Error al generar imagen.");}
    var ct=res.headers.get("content-type")||"";
    if(ct.includes("image")){var bl=await res.blob();return URL.createObjectURL(bl);}
    var jd=await res.json();return jd.url;
  }

  async function generateImage(){
    if(!mmTopic.trim()||!curSubj) return;
    setImgLoading(true);setImgUrl(null);setImgError("");
    try{var url=await callImgApi(mmTopic,curSubj.name,curSubj.level);setImgUrl(url);dbLogUsage(authUser.id,authUser.email,"imagen_ia","Imagen IA Multimedia",curSubj.name,300,0,true);}
    catch(e){setImgError("Error: "+e.message);}
    setImgLoading(false);
  }

  async function generateActivityImage(){
    if(!genResult||!curSubj) return;
    setActImgLoad(true);setActImgUrl(null);setActImgErr("");
    try{var desc=actImgDesc||("Educational illustration for: "+genTopic+". Subject: "+curSubj.name);var url=await callImgApi(desc,curSubj.name,genLevel);setActImgUrl(url);dbLogUsage(authUser.id,authUser.email,"imagen","Imagen IA",curSubj.name,300,0,true);}
    catch(e){setActImgErr("Error: "+e.message);}
    setActImgLoad(false);
  }

  async function saveLib(content,type,typeName,topic){
    if(!authUser) return;
    await dbAddLibraryItem(authUser.id,{type,type_name:typeName,topic,subject_name:curSubj?curSubj.name:"",content});
    var upd=await dbLoadLibrary(authUser.id);setLibrary(upd);setGenSaved(true);
  }

  async function sharePublic(content,type,typeName,topic){
    if(!authUser) return;
    var userName=(authUser.user_metadata&&authUser.user_metadata.name)||authUser.email.split("@")[0]||"Docente";
    await dbAddPublicItem(authUser.id,userName,{type,type_name:typeName,topic,subject_name:curSubj?curSubj.name:"",level:genLevel,content});
    var pub=await dbLoadPublicLib();setPublicLib(pub);
    alert("Compartido en la biblioteca publica!");
  }

  async function saveBank(content,topic){
    if(!authUser) return;
    await dbAddBankItem(authUser.id,{topic,subject_name:curSubj?curSubj.name:"",content});
    var upd=await dbLoadBank(authUser.id);setBank(upd);
  }

  async function delLib(id){
    await dbDelLibraryItem(id);
    setLibrary(function(prev){return prev.filter(function(i){return i.id!==id;});});
    if(libItem&&libItem.id===id) setLibItem(null);
  }

  async function delBank(id){
    await dbDelBankItem(id);
    setBank(function(prev){return prev.filter(function(i){return i.id!==id;});});
  }

  async function sendChat(){
    var subj=subjects.find(function(s){return s.id===chatSid;})||curSubj;
    if(!chatIn.trim()||!subj) return;
    var msg=chatIn.trim();setChatIn("");
    var hist=chatMsgs.concat([{role:"user",content:msg}]);
    setChatMsgs(hist);setChatLoading(true);
    var sys="Sos asistente educativo para docentes argentinos en \""+subj.name+"\" ("+subj.level+")."+(subj.materials?"\nPrograma: "+subj.materials:"")+"\nResponde en espanol rioplatense con Markdown.";
    try{
      var r=await callClaude(sys,hist.map(function(m){return{role:m.role,content:m.content};}),2000);
      setChatMsgs(hist.concat([{role:"assistant",content:r}]));
    }catch(e){setChatMsgs(hist.concat([{role:"assistant",content:"Error: "+e.message}]));}
    setChatLoading(false);
  }

  function extractScore(text) {
    var patterns = [
      /calificaci[oó]n\s*final[:\s]+(\d+(?:[.,]\d+)?)/i,
      /nota\s*final[:\s]+(\d+(?:[.,]\d+)?)/i,
      /puntaje\s*final[:\s]+(\d+(?:[.,]\d+)?)/i,
      /calificaci[oó]n[:\s]+(\d+(?:[.,]\d+)?)\s*\/\s*10/i,
      /(\d+(?:[.,]\d+)?)\s*\/\s*10/,
    ];
    for(var i=0;i<patterns.length;i++){
      var match=text.match(patterns[i]);
      if(match){var score=parseFloat(match[1].replace(",","."));if(score>=0&&score<=10) return score;}
    }
    return null;
  }

  async function correctBatch() {
    if(!corrR.trim()||!batchFile||!curSubj) return;
    setBatchLoading(true);setBatchResults([]);setBatchProgress(0);
    try {
      var XLSX = await import("xlsx");
      var buffer = await batchFile.arrayBuffer();
      var wb = XLSX.read(buffer,{type:"array"});
      var sheet = wb.Sheets[wb.SheetNames[0]];
      var rows = XLSX.utils.sheet_to_json(sheet,{header:1});
      var trabajos = [];
      for(var i=1;i<rows.length;i++){
        var row=rows[i];
        if(row[0]&&row[1]) trabajos.push({name:String(row[0]).trim(),work:String(row[1]).trim()});
      }
      setBatchTotal(trabajos.length);
      var results = [];
      var sys = "Sos docente evaluador experto. Materia: \""+(curSubj?curSubj.name:"General")+"\". Responde en espanol rioplatense con Markdown.";
      for(var j=0;j<trabajos.length;j++){
        var t = trabajos[j];
        setBatchProgress(j+1);
        try {
          var usr = "Correccion usando la rubrica.\n\n## RUBRICA:\n"+corrR+"\n\n## TRABAJO DE "+t.name+":\n"+t.work+"\n\nIncluí: evaluacion por criterio, Calificacion final: X/10, fortalezas, areas de mejora, devolucion al alumno.";
          var r = await callClaude(sys,[{role:"user",content:usr}],3000);
          var score = extractScore(r);
          results.push({name:t.name,result:r,score:score,saved:false});
          // Buscar alumno en la lista y guardar evaluacion automaticamente
          var student = students.find(function(s){return s.name.toLowerCase().includes(t.name.toLowerCase())||t.name.toLowerCase().includes(s.name.toLowerCase());});
          if(student && score !== null && authUser){
            try{
              await dbAddEvaluation(authUser.id,student.id,{topic:"Correccion batch - "+(new Date().toLocaleDateString("es-AR")),score:score,max_score:10,rubric_id:null,rubric_name:"",feedback:r.slice(0,500)});
              results[results.length-1].saved=true;
            }catch{}
          }
        } catch(e) {
          results.push({name:t.name,result:"Error: "+e.message,score:null,saved:false});
        }
      }
      setBatchResults(results);
      await dbLoadAllEvaluations(authUser.id,curSid).then(setAllEvals);
    } catch(e) { alert("Error: "+e.message); }
    setBatchLoading(false);setBatchProgress(0);
  }
  async function correctTP(){
    if(!corrR.trim()||!corrW.trim()) return;
    setCorrLoading(true);setCorrResult("");
    var sys="Sos docente evaluador experto. Materia: \""+(curSubj?curSubj.name:"General")+"\". Responde en espanol rioplatense con Markdown.";
    var usr="Correccion usando la rubrica.\n\n## RUBRICA:\n"+corrR+"\n\n## TRABAJO:\n"+corrW+"\n\nIncluí: evaluacion por criterio, calificacion final, fortalezas, areas de mejora, devolucion al alumno.";
    try{var r=await callClaude(sys,[{role:"user",content:usr}],4000);setCorrResult(r);}
    catch(e){setCorrResult("Error: "+e.message);}
    setCorrLoading(false);
  }

  if(authLoading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,flexDirection:"column",gap:12}}>
      <i className="ti ti-school" style={{fontSize:38,color:C.accent}}/>
      <div style={{color:C.textMuted,fontSize:14}}>Cargando AulaXpro...</div>
    </div>
  );

  if(!authUser) return <AuthScreen onAuth={setAuthUser}/>;

  if(subChecked&&!subscription&&authUser.email!==import.meta.env.VITE_ADMIN_EMAIL) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg}}>
      <div style={{width:900,textAlign:"center"}}>
        <i className="ti ti-school" style={{fontSize:52,color:C.accent,display:"block",marginBottom:12}}/>
        <h1 style={{color:C.accent,fontSize:28,fontWeight:700,margin:"0 0 8px"}}>AulaXpro</h1>
        <p style={{color:C.textMuted,fontSize:15,marginBottom:32}}>Necesitas una suscripcion activa para acceder.</p>
        <div style={Object.assign({},card,{padding:28})}><PricingPanel authUser={authUser}/></div>
        <button style={{marginTop:20,background:"transparent",border:"none",cursor:"pointer",color:C.textDim,fontSize:13,fontFamily:"Quicksand,sans-serif",display:"inline-flex",alignItems:"center",gap:5}} onClick={signOut}>
          <i className="ti ti-logout" style={{fontSize:14}}/>Cerrar sesion
        </button>
      </div>
    </div>
  );

  var filtLib=library.filter(function(i){
    var mf=libFilter==="all"||i.type===libFilter;
    var ms=!libSearch||i.topic.toLowerCase().includes(libSearch.toLowerCase())||(i.subject_name||"").toLowerCase().includes(libSearch.toLowerCase());
    return mf&&ms;
  });

  var gt=GEN_TYPES.find(function(g){return g.id===genType;});
  var mt=MM_TYPES.find(function(m){return m.id===mmType;});
  var userName=(authUser.user_metadata&&authUser.user_metadata.name)||authUser.email.split("@")[0]||"Docente";

  return (
    <div style={{display:"flex",height:"100vh",background:C.bg,color:C.text,fontFamily:"Quicksand,sans-serif",overflow:"hidden"}}>

      {isMobile&&mobileMenu&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:9998}} onClick={function(){setMobileMenu(false);}}/>
      )}
      <div style={{width:isMobile?(mobileMenu?280:0):bar?218:56,minWidth:isMobile?(mobileMenu?280:0):bar?218:56,background:"#0D3559",borderRight:"1px solid "+C.border,display:"flex",flexDirection:"column",transition:"all .22s",overflow:"hidden",position:isMobile?"fixed":"relative",top:0,left:0,height:isMobile?"100vh":"auto",zIndex:isMobile?9999:"auto"}}>
        <div style={{padding:"0 10px",borderBottom:"1px solid "+C.border,minHeight:54,display:"flex",alignItems:"center",gap:8}}>
          <button style={{background:"none",border:"none",cursor:"pointer",color:C.accent,fontSize:17,minWidth:26,fontFamily:"Quicksand,sans-serif"}} onClick={function(){setBar(!bar);}}>
            {bar?<i className="ti ti-chevron-left" style={{fontSize:16}}/>:<i className="ti ti-chevron-right" style={{fontSize:16}}/>}
          </button>
          {bar&&<span style={{fontSize:15,fontWeight:700,color:C.accent,whiteSpace:"nowrap"}}>AulaXpro</span>}
        </div>
        {bar&&subjects.length>0&&(
          <div style={{padding:"8px 10px 10px"}}>
            <div style={{fontSize:10,color:C.textDim,fontWeight:700,letterSpacing:.8,marginBottom:5}}>MATERIA ACTIVA</div>
            <select style={Object.assign({},sel,{width:"100%",fontSize:12,padding:"5px 9px"})} value={curSid||""} onChange={function(e){setCurSid(e.target.value);}}>
              {subjects.map(function(s){return <option key={s.id} value={s.id}>{s.name}</option>;})}
            </select>
          </div>
        )}
        <nav style={{flex:1,padding:"6px 0",overflowY:"auto"}}>
          {NAV.map(function(n){
            return (
              <div key={n.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 11px",cursor:"pointer",margin:"2px 6px",background:view===n.id?C.accentBg:"transparent",color:view===n.id?"#26C3D4":"#7aaabf",fontSize:13,whiteSpace:"nowrap",overflow:"hidden",borderLeft:view===n.id?"2px solid "+C.accent:"2px solid transparent"}}
                onClick={function(){setView(n.id);if(isMobile) setMobileMenu(false);}}>
                <i className={"ti "+n.icon} style={{fontSize:17,minWidth:24,textAlign:"center"}}/>
                {bar&&<span>{n.label}</span>}
              </div>
            );
          })}
        </nav>
        <div style={{padding:"10px 12px",borderTop:"1px solid "+C.border}}>
          {bar?(
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:11,color:C.textDim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
                <i className="ti ti-user" style={{fontSize:12}}/>{userName}
              </div>
              <button style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim,fontSize:11,fontFamily:"Quicksand,sans-serif"}} onClick={signOut}>Salir</button>
            </div>
          ):(
            <button style={{background:"transparent",border:"none",cursor:"pointer",fontSize:16,width:"100%",textAlign:"center",color:C.textDim}} onClick={signOut} title="Cerrar sesion">
              <i className="ti ti-logout" style={{fontSize:16}}/>
            </button>
          )}
        </div>
      </div>

      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
        <div style={{background:C.surf,borderBottom:"1px solid "+C.border,padding:"0 22px",display:"flex",alignItems:"center",gap:14,minHeight:54}}>
          {isMobile&&(
            <button style={{background:"transparent",border:"none",cursor:"pointer",color:C.text,marginRight:8,padding:4}} onClick={function(){setMobileMenu(!mobileMenu);}}>
              <i className="ti ti-menu-2" style={{fontSize:22}}/>
            </button>
          )}
          <h1 style={{margin:0,fontSize:16,fontWeight:700,flex:1,color:C.text,display:"flex",alignItems:"center",gap:8}}>
            {(NAV.find(function(n){return n.id===view;})||{}).icon&&<i className={"ti "+((NAV.find(function(n){return n.id===view;})||{}).icon||"")} style={{fontSize:16}}/>}
            {(NAV.find(function(n){return n.id===view;})||{}).label}
          </h1>
          {curSubj&&<div style={{fontSize:12,color:C.textMuted,background:C.bg,padding:"4px 12px",borderRadius:20,border:"1px solid "+C.border,display:"flex",alignItems:"center",gap:5}}><i className="ti ti-book" style={{fontSize:13}}/>{curSubj.name}</div>}
          <Btn v="accent" st={{padding:"5px 13px",fontSize:12}} onClick={function(){setSubjModal(true);}}>
            <i className="ti ti-plus" style={{fontSize:12,marginRight:3}}/>Materia
          </Btn>
        </div>

        <div style={{flex:1,overflow:"auto",padding:"20px 26px"}}>

          {subscription&&subscription.is_trial&&authUser.email!==import.meta.env.VITE_ADMIN_EMAIL&&(function(){
            var daysLeft=Math.ceil((new Date(subscription.current_period_end)-new Date())/(1000*60*60*24));
            if(daysLeft<=0) return null;
            return (
              <div style={{background:C.accentBg,border:"1px solid "+C.accent,borderRadius:4,padding:"10px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,color:C.accent}}>{"Periodo de prueba: "+daysLeft+" dia"+(daysLeft===1?"":"s")+" restante"+(daysLeft===1?"":"s")}</span>
                <button style={{background:C.accent,border:"none",borderRadius:4,padding:"5px 14px",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"Quicksand,sans-serif",color:"#fff"}} onClick={function(){setView("pricing");}}>
                  <i className="ti ti-credit-card" style={{fontSize:12,marginRight:4}}/>Ver planes
                </button>
              </div>
            );
          })()}

          {dataLoading&&<div style={{textAlign:"center",padding:"60px 0"}}><Spin/></div>}

          {!dataLoading&&view==="dashboard"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22}}>
                <div>
                  <h2 style={{fontSize:22,fontWeight:700,color:C.text,margin:0}}>{"Bienvenido, "+userName}</h2>
                  <p style={{color:C.textDim,fontSize:13,margin:"4px 0 0"}}>Que creamos hoy para tus alumnos?</p>
                </div>
                <Btn onClick={function(){setSubjModal(true);}}>
                  <i className="ti ti-plus" style={{fontSize:13,marginRight:4}}/>Nueva Materia
                </Btn>
              </div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:12,marginBottom:20}}>
                {[{l:"Materias",v:subjects.length,i:"ti-books",c:C.blue},{l:"Biblioteca",v:library.length,i:"ti-folder",c:C.green},{l:"Banco",v:bank.length,i:"ti-database",c:C.accent},{l:"Biblioteca Publica",v:publicLib.length,i:"ti-world",c:C.purple}].map(function(x){
                  return (
                    <div key={x.l} style={{background:"#CFF09E",border:"1px solid #A8DBA8",borderRadius:4,padding:"18px 20px"}}style={Object.assign({},card,{marginBottom:0})}>
                      <i className={"ti "+x.i} style={{fontSize:22,marginBottom:8,color:x.c,display:"block"}}/>
                      <div style={{fontSize:28,fontWeight:700,color:x.c}}>{x.v}</div>
                      <div style={{fontSize:12,color:C.textDim,marginTop:2}}>{x.l}</div>
                    </div>
                  );
                })}
              </div>
              <div style={card}>
                <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8,marginBottom:14}}>MIS MATERIAS</div>
                {!subjects.length?(
                  <div style={{textAlign:"center",padding:"32px 0",color:C.textDim}}>
                    <i className="ti ti-books" style={{fontSize:34,display:"block",marginBottom:10,color:C.textDim}}/>
                    <p style={{marginBottom:14}}>Todavia no tenes materias. Crea la primera para empezar.</p>
                    <Btn onClick={function(){setSubjModal(true);}}>
                      <i className="ti ti-plus" style={{fontSize:13,marginRight:4}}/>Crear mi primera materia
                    </Btn>
                  </div>
                ):(
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
                    {subjects.map(function(sub){
                      return (
                        <div key={sub.id} style={{background:C.bg,border:"2px solid "+(curSid===sub.id?C.accent:C.border),borderRadius:4,padding:14,cursor:"pointer"}} onClick={function(){setCurSid(sub.id);}}>
                          <i className="ti ti-book" style={{fontSize:22,marginBottom:7,color:C.accent,display:"block"}}/>
                          <div style={{fontWeight:700,color:C.text,marginBottom:2,fontSize:14}}>{sub.name}</div>
                          <div style={{fontSize:12,color:C.textDim,marginBottom:sub.materials?5:10}}>{sub.level}</div>
                          {sub.materials&&<div style={{fontSize:11,color:C.green,marginBottom:10}}>Con programa</div>}
                          <div style={{display:"flex",gap:6}}>
                            <Btn v="sm" onClick={function(e){e.stopPropagation();setCurSid(sub.id);setView("generator");}}>
                              <i className="ti ti-bolt" style={{fontSize:12,marginRight:3}}/>Generar
                            </Btn>
                            <Btn v="ghost" st={{padding:"5px 9px",fontSize:12}} onClick={function(e){e.stopPropagation();setEditingSubject(sub);setSf({name:sub.name,level:sub.level,materials:sub.materials||"",bibliography:sub.bibliography||""});setSfPdfs([]);setSubjModal(true);}}>
                              <i className="ti ti-pencil" style={{fontSize:14}}/>
                            </Btn>
                            <Btn v="ghost" st={{padding:"5px 9px",fontSize:12}} onClick={function(e){e.stopPropagation();dbDelSubject(sub.id).then(function(){var upd=subjects.filter(function(s){return s.id!==sub.id;});setSubjects(upd);if(curSid===sub.id) setCurSid(upd.length?upd[0].id:null);});}}>
                              <i className="ti ti-trash" style={{fontSize:14}}/>
                            </Btn>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div style={card}>
                <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8,marginBottom:14}}>ACCESO RAPIDO</div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:10}}>
                  {[{v:"generator",i:"ti-bolt",l:"Generador IA",c:C.accent},{v:"chat",i:"ti-message",l:"Chat Docente",c:C.blue},{v:"multimedia",i:"ti-photo",l:"Multimedia",c:C.green},{v:"corrector",i:"ti-checklist",l:"Corrector TPs",c:C.purple}].map(function(x){
                    return (
                      <button key={x.v} style={{background:C.bg,border:"1px solid "+C.border,borderRadius:4,padding:"13px 8px",cursor:"pointer",textAlign:"center",fontFamily:"Quicksand,sans-serif"}} onClick={function(){setView(x.v);}}>
                        <i className={"ti "+x.i} style={{fontSize:24,marginBottom:5,color:x.c,display:"block"}}/>
                        <div style={{fontSize:12,fontWeight:600,color:x.c}}>{x.l}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {!dataLoading&&view==="generator"&&(
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"258px 1fr",gap:18}}>
              <div>
                <div style={card}>
                  <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8,marginBottom:12}}>TIPO DE CONTENIDO</div>
                  {GEN_TYPES.map(function(g){
                    return (
                      <button key={g.id} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"8px 10px",borderRadius:4,border:"none",cursor:"pointer",marginBottom:3,background:genType===g.id?C.accentBg:"transparent",color:genType===g.id?C.accent:C.textMuted,textAlign:"left",fontFamily:"Quicksand,sans-serif",fontSize:13,borderLeft:genType===g.id?"2px solid "+C.accent:"2px solid transparent"}}
                        onClick={function(){setGenType(g.id);setGenResult("");setGenSaved(false);setGenErr("");setMakeCodeUrl(null);setActImgUrl(null);}}>
                        <i className={"ti "+g.icon} style={{fontSize:16}}/>
                        <span style={{fontWeight:genType===g.id?700:400}}>{g.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={card}>
                  <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8,marginBottom:12}}>PARAMETROS</div>
                  <label style={lbl}>NIVEL</label>
                  <select style={Object.assign({},sel,{width:"100%",marginBottom:12})} value={genLevel} onChange={function(e){setGenLevel(e.target.value);}}>
                    {LEVELS.map(function(l){return <option key={l}>{l}</option>;})}
                  </select>
                  <label style={lbl}>DIFICULTAD</label>
                  <div style={{display:"flex",gap:5}}>
                    {["Basico","Intermedio","Avanzado"].map(function(d){
                      return <button key={d} style={{flex:1,padding:"6px 3px",borderRadius:4,border:"1px solid "+(genDiff===d?C.accent:C.border),background:genDiff===d?C.accentBg:"transparent",color:genDiff===d?C.accent:C.textMuted,cursor:"pointer",fontSize:11,fontWeight:genDiff===d?700:400,fontFamily:"Quicksand,sans-serif"}} onClick={function(){setGenDiff(d);}}>{d}</button>;
                    })}
                  </div>
                </div>
              </div>
              <div>
                <div style={card}>
                  <div style={{display:"flex",alignItems:"center",gap:13,marginBottom:18}}>
                    {gt&&<i className={"ti "+gt.icon} style={{fontSize:30,color:gt.color}}/>}
                    <div>
                      <h2 style={{margin:0,fontSize:19,fontWeight:700,color:C.text}}>{gt?gt.label:""}</h2>
                      <div style={{fontSize:13,color:C.textDim}}>{"Materia: "+(curSubj?curSubj.name:"—")}</div>
                    </div>
                  </div>
                  {!curSubj?(
                    <div style={{textAlign:"center",padding:"28px 0",color:C.textDim}}>
                      <p style={{marginBottom:14}}>Selecciona o crea una materia primero.</p>
                      <Btn onClick={function(){setSubjModal(true);}}>Crear materia</Btn>
                    </div>
                  ):(
                    <div>
                      <label style={lbl}>TEMA ESPECIFICO *</label>
                      <input style={Object.assign({},inp,{marginBottom:12})} value={genTopic} onChange={function(e){setGenTopic(e.target.value);}} placeholder="Ej: La Primera Guerra Mundial"/>
                      <label style={lbl}>INSTRUCCIONES ADICIONALES (opcional)</label>
                      <textarea style={Object.assign({},inp,{height:70,resize:"vertical",marginBottom:18})} value={genExtra} onChange={function(e){setGenExtra(e.target.value);}} placeholder="Ej: grupos de 4, enfoque por proyectos..."/>
                      <div style={{display:"flex",gap:10,alignItems:"center"}}>
                        <Btn onClick={generate} disabled={genLoading||!genTopic.trim()}>
                          {genLoading?"Generando...":<><i className="ti ti-bolt" style={{fontSize:13,marginRight:4}}/>{"Generar "+(gt?gt.label:"")}</>}
                        </Btn>
                        {genLoading&&<span style={{color:C.textMuted,fontSize:12}}>Puede tardar unos segundos...</span>}
                      </div>
                      {genErr&&<div style={{marginTop:12,color:C.red,fontSize:13,background:"#fee2e2",padding:"10px 14px",borderRadius:4}}>{genErr}</div>}
                    </div>
                  )}
                </div>
                {genLoading&&<div style={card}><Spin/></div>}
                {genResult&&!genLoading&&(
                  <div style={card}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
                      <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8}}>RESULTADO GENERADO</div>
                      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                        {genSaved&&(
                          <Btn v="green" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){sharePublic(genResult,genType,gt?gt.label:"",genTopic);}}>
                            <i className="ti ti-world" style={{fontSize:13,marginRight:4}}/>Compartir
                          </Btn>
                        )}
                        {genSaved?(
                          <span style={{color:C.green,fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
                            <i className="ti ti-check" style={{fontSize:13}}/>Guardado
                          </span>
                        ):(
                          <div style={{display:"flex",gap:8}}>
                            <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){saveLib(genResult,genType,gt?gt.label:"",genTopic);}}>
                              <><i className="ti ti-device-floppy" style={{fontSize:13,marginRight:4}}/>Guardar</>
                            </Btn>
                            {(genType==="evaluacion"||genType==="rubrica")&&(
                              <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){saveBank(genResult,genTopic);}}>
                                <i className="ti ti-database" style={{fontSize:13,marginRight:4}}/>Banco
                              </Btn>
                            )}
                          </div>
                        )}
                        <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportDocx(genTopic,gt?gt.label:"",curSubj?curSubj.name:"",genResult);}}>
                          <i className="ti ti-file-text" style={{fontSize:13,marginRight:4}}/>Word
                        </Btn>
                        {(genType==="evaluacion"||genType==="rubrica"||genType==="planclase")&&(
                          <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportPdf(genTopic,gt?gt.label:"",curSubj?curSubj.name:"",genResult);}}>
                            <i className="ti ti-file-invoice" style={{fontSize:13,marginRight:4}}/>PDF
                          </Btn>
                        )}
                        {genType==="presentacion"&&(
                          <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){generatePptx(genTopic,curSubj?curSubj.name:"",genResult);}}>
                            <i className="ti ti-presentation" style={{fontSize:13,marginRight:4}}/>PowerPoint
                          </Btn>
                        )}
                      </div>
                    </div>
                    <MDView text={genResult}/>
                    {makeCodeUrl&&(
                      <div style={{marginTop:16,padding:"12px 16px",background:C.accentBg,borderRadius:4,border:"1px solid "+C.accent,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:C.accent,marginBottom:3}}>Codigo MakeCode detectado</div>
                          <div style={{fontSize:12,color:C.textMuted}}>Abri el proyecto en el editor</div>
                        </div>
                        <a href={makeCodeUrl} target="_blank" rel="noopener noreferrer">
                          <Btn st={{fontSize:13,padding:"8px 18px"}}>
                            <i className="ti ti-code" style={{fontSize:14,marginRight:4}}/>Abrir en MakeCode
                          </Btn>
                        </a>
                      </div>
                    )}
                    <div style={{marginTop:16}}>
                      <label style={lbl}>DESCRIPCION DE LA IMAGEN (opcional)</label>
                      <input style={Object.assign({},inp,{marginBottom:10})} value={actImgDesc} onChange={function(e){setActImgDesc(e.target.value);}} placeholder="Ej: diagrama de la celula eucariota"/>
                    </div>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <Btn v="secondary" st={{fontSize:12,padding:"5px 14px"}} onClick={generateActivityImage} disabled={actImgLoad}>
                        {actImgLoad?"Generando...":<><i className="ti ti-photo-ai" style={{fontSize:13,marginRight:4}}/>Generar imagen</>}
                      </Btn>
                      {actImgErr&&<span style={{color:C.red,fontSize:12}}>{actImgErr}</span>}
                    </div>
                    {actImgUrl&&(
                      <div style={{marginTop:14}}>
                        <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8,marginBottom:10}}>IMAGEN GENERADA</div>
                        <img src={actImgUrl} alt={genTopic} style={{width:"100%",borderRadius:4,display:"block"}}/>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
                          <p style={{fontSize:11,color:C.textDim}}>Las imagenes expiran en 1 hora.</p>
                          <a href={actImgUrl} download="imagen_actividad.png" target="_blank" rel="noopener noreferrer">
                            <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}}>
                              <i className="ti ti-download" style={{fontSize:13,marginRight:4}}/>Descargar
                            </Btn>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!dataLoading&&view==="multimedia"&&(
           <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"248px 1fr",gap:18}}>
              <div style={card}>
                <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8,marginBottom:12}}>TIPO</div>
                {MM_TYPES.map(function(m){
                  return (
                    <button key={m.id} style={{display:"flex",alignItems:"flex-start",gap:10,width:"100%",padding:"8px 10px",borderRadius:4,border:"none",cursor:"pointer",marginBottom:4,background:mmType===m.id?C.accentBg:"transparent",textAlign:"left",fontFamily:"Quicksand,sans-serif",borderLeft:mmType===m.id?"2px solid "+C.accent:"2px solid transparent"}}
                      onClick={function(){setMmType(m.id);setMmResult("");setImgUrl(null);setImgError("");}}>
                      <i className={"ti "+m.icon} style={{fontSize:17,minWidth:24,color:mmType===m.id?C.accent:C.textMuted}}/>
                      <div>
                        <div style={{fontWeight:mmType===m.id?700:400,fontSize:13,color:mmType===m.id?C.accent:C.textMuted}}>{m.label}</div>
                        <div style={{fontSize:11,color:C.textDim,marginTop:1}}>{m.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div>
                <div style={card}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                    {mt&&<i className={"ti "+mt.icon} style={{fontSize:28,color:C.accent}}/>}
                    <div>
                      <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.text}}>{mt?mt.label:""}</h2>
                      <div style={{fontSize:12,color:C.textDim}}>{mt?mt.desc:""}</div>
                    </div>
                  </div>
                  {!curSubj?(
                    <div style={{textAlign:"center",padding:"22px 0",color:C.textDim}}>Selecciona una materia primero.</div>
                  ):(
                    <div>
                      <label style={lbl}>{mmType==="imagen_ia"?"DESCRIPCION DE LA IMAGEN":"TEMA DEL CONTENIDO"}</label>
                      <input style={Object.assign({},inp,{marginBottom:12})} value={mmTopic} onChange={function(e){setMmTopic(e.target.value);}} placeholder={mmType==="imagen_ia"?"Ej: Ciclo del agua":"Ej: La fotosintesis para 5to ano"}/>
                      {mmType!=="imagen_ia"&&(
                        <div>
                          <label style={lbl}>INSTRUCCIONES ADICIONALES</label>
                          <textarea style={Object.assign({},inp,{height:62,resize:"vertical",marginBottom:16})} value={mmExtra} onChange={function(e){setMmExtra(e.target.value);}} placeholder="Duracion, tono, audiencia..."/>
                        </div>
                      )}
                      <div style={{display:"flex",gap:10,marginTop:mmType==="imagen_ia"?16:0}}>
                        {mmType==="imagen_ia"
                          ?<Btn onClick={generateImage} disabled={imgLoading||!mmTopic.trim()}>{imgLoading?"Generando...":<><i className="ti ti-photo-ai" style={{fontSize:13,marginRight:4}}/>Generar Imagen</>}</Btn>
                          :<Btn onClick={generateMM} disabled={mmLoading||!mmTopic.trim()}>{mmLoading?"Generando...":<><i className="ti ti-sparkles" style={{fontSize:13,marginRight:4}}/>Generar Contenido</>}</Btn>
                        }
                      </div>
                    </div>
                  )}
                </div>
                {mmType==="imagen_ia"&&(
                  <div>
                    {imgLoading&&<div style={card}><Spin/></div>}
                    {imgError&&<div style={Object.assign({},card,{color:C.red,fontSize:13})}>{imgError}</div>}
                    {imgUrl&&!imgLoading&&(
                      <div style={card}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
                          <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8}}>IMAGEN GENERADA</div>
                          <a href={imgUrl} download="imagen_educativa.png" target="_blank" rel="noopener noreferrer">
                            <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}}>
                              <i className="ti ti-download" style={{fontSize:13,marginRight:4}}/>Descargar PNG
                            </Btn>
                          </a>
                        </div>
                        <img src={imgUrl} alt={mmTopic} style={{width:"100%",borderRadius:4,display:"block"}}/>
                        <p style={{fontSize:11,color:C.textDim,marginTop:10}}>Las imagenes expiran en 1 hora.</p>
                      </div>
                    )}
                  </div>
                )}
                {mmType!=="imagen_ia"&&(
                  <div>
                    {mmLoading&&<div style={card}><Spin/></div>}
                    {mmResult&&!mmLoading&&(
                      <div style={card}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
                          <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8}}>CONTENIDO GENERADO</div>
                          <div style={{display:"flex",gap:8}}>
                            <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){saveLib(mmResult,mmType,mt?mt.label:"",mmTopic);}}>
                              <><i className="ti ti-device-floppy" style={{fontSize:13,marginRight:4}}/>Guardar</>
                            </Btn>
                            <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportDocx(mmTopic,mt?mt.label:"",curSubj?curSubj.name:"",mmResult);}}>
                              <i className="ti ti-file-text" style={{fontSize:13,marginRight:4}}/>Word
                            </Btn>
                            <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportPdf(mmTopic,mt?mt.label:"",curSubj?curSubj.name:"",mmResult);}}>
                              <i className="ti ti-file-invoice" style={{fontSize:13,marginRight:4}}/>PDF
                            </Btn>
                          </div>
                        </div>
                        <MDView text={mmResult}/>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!dataLoading&&view==="chat"&&(function(){
            var chatSubj=subjects.find(function(s){return s.id===chatSid;})||curSubj;
            var SUGS=["Como explico este concepto de forma simple?","Dame 5 actividades de cierre creativas","Que TIC puedo usar en esta clase?","Diseñame una pregunta diagnostica","Como manejo distintos ritmos de aprendizaje?","Sugeri secuencia de temas para el trimestre"];
            return (
              <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 132px)"}}>
                <div style={Object.assign({},card,{marginBottom:12,padding:"9px 14px"})}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.6,whiteSpace:"nowrap"}}>CONTEXTO:</span>
                    <select style={Object.assign({},sel,{flex:1})} value={chatSid||curSid||""} onChange={function(e){setChatSid(e.target.value);setChatMsgs([]);}}>
                      <option value="">Sin materia especifica</option>
                      {subjects.map(function(s){return <option key={s.id} value={s.id}>{s.name+" ("+s.level+")"}</option>;})}
                    </select>
                    <Btn v="ghost" st={{padding:"5px 11px",fontSize:12}} onClick={function(){setChatMsgs([]);}}>
                      <i className="ti ti-trash" style={{fontSize:13,marginRight:4}}/>Limpiar
                    </Btn>
                  </div>
                </div>
                <div style={Object.assign({},card,{flex:1,overflow:"auto",padding:"14px 18px",minHeight:0})}>
                  {!chatMsgs.length?(
                    <div style={{textAlign:"center",padding:"28px 0",color:C.textDim}}>
                      <i className="ti ti-message" style={{fontSize:36,display:"block",marginBottom:10,color:C.textDim}}/>
                      <p style={{fontSize:14,marginBottom:18}}>Chat contextualizado a tu materia</p>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,maxWidth:500,margin:"0 auto"}}>
                        {SUGS.map(function(s){return <button key={s} style={{background:C.bg,border:"1px solid "+C.border,borderRadius:4,padding:"9px 11px",color:C.textMuted,cursor:"pointer",textAlign:"left",fontSize:12,fontFamily:"Quicksand,sans-serif"}} onClick={function(){setChatIn(s);}}>{s}</button>;})}
                      </div>
                    </div>
                  ):chatMsgs.map(function(m,i){
                    return (
                      <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:14}}>
                        <div style={{maxWidth:"82%",background:m.role==="user"?C.accent:C.card,borderRadius:4,padding:"10px 14px",border:m.role==="user"?"none":"1px solid "+C.border}}>
                          {m.role==="user"?<span style={{fontSize:14,color:"#fff"}}>{m.content}</span>:<MDView text={m.content} maxH={9999}/>}
                        </div>
                      </div>
                    );
                  })}
                  {chatLoading&&<div style={{textAlign:"center",padding:"12px 0"}}><Spin/></div>}
                  <div ref={chatRef}/>
                </div>
                <div style={{display:"flex",gap:10,marginTop:10}}>
                  <input style={Object.assign({},inp,{flex:1,padding:"10px 14px"})} value={chatIn} onChange={function(e){setChatIn(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter"&&!e.shiftKey) sendChat();}} placeholder="Escribe tu consulta... (Enter para enviar)"/>
                  <Btn onClick={sendChat} disabled={chatLoading||!chatIn.trim()} st={{padding:"10px 22px"}}>
                    <i className="ti ti-send" style={{fontSize:14,marginRight:4}}/>Enviar
                  </Btn>
                </div>
              </div>
            );
          })()}

          {!dataLoading&&view==="corrector"&&(
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:18}}>
              <div style={card}>
                <h3 style={{margin:"0 0 5px",fontSize:18,fontWeight:700,color:C.text}}>Corrector de TPs</h3>
                <p style={{fontSize:13,color:C.textDim,marginBottom:18}}>Pega la rubrica y el trabajo del alumno para una correccion completa.</p>
                <label style={lbl}>RUBRICA *</label>
                <textarea style={Object.assign({},inp,{height:155,resize:"vertical",marginBottom:12})} value={corrR} onChange={function(e){setCorrR(e.target.value);}} placeholder="Pega la rubrica aqui..."/>
                {library.filter(function(i){return i.type==="rubrica";}).length>0&&(
                  <div style={{marginBottom:12}}>
                    <label style={lbl}>O CARGA UNA DE LA BIBLIOTECA</label>
                    <select style={Object.assign({},sel,{width:"100%"})} onChange={function(e){var it=library.find(function(i){return i.id===e.target.value;});if(it) setCorrR(it.content);}}>
                      <option value="">Seleccionar rubrica guardada</option>
                      {library.filter(function(i){return i.type==="rubrica";}).map(function(r){return <option key={r.id} value={r.id}>{r.topic}</option>;})}
                    </select>
                  </div>
                )}
                <label style={lbl}>TRABAJO DEL ALUMNO *</label>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <label style={{display:"inline-flex",alignItems:"center",gap:6,background:C.surf,border:"1px solid "+C.border,borderRadius:4,padding:"7px 14px",cursor:imgExtractLoading?"not-allowed":"pointer",fontSize:12,fontWeight:600,color:C.text,opacity:imgExtractLoading?.6:1}}>
                    <i className="ti ti-camera" style={{fontSize:14}}/>
                    {imgExtractLoading?"Extrayendo texto...":"Fotografiar examen"}
                    <input type="file" accept="image/*" capture="environment" style={{display:"none"}} disabled={imgExtractLoading} onChange={async function(e){
                      var file=e.target.files[0]; if(!file) return;
                      setImgExtractLoading(true);setImgExtractErr("");
                      try{
                        var reader=new FileReader();
                        reader.onload=async function(ev){
                          var base64=ev.target.result.split(",")[1];
                          var mediaType=file.type||"image/jpeg";
                          var res=await fetch("/api/extract-text",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({base64,mediaType})});
                          var data=await res.json();
                          if(!res.ok) throw new Error(data.error);
                          setCorrW(data.text);
                          setImgExtractLoading(false);
                        };
                        reader.readAsDataURL(file);
                      }catch(err){setImgExtractErr("Error: "+err.message);setImgExtractLoading(false);}
                    }}/>
                  </label>
                  {imgExtractErr&&<span style={{fontSize:12,color:C.red}}>{imgExtractErr}</span>}
                  {corrW&&<span style={{fontSize:11,color:C.green,display:"flex",alignItems:"center",gap:3}}><i className="ti ti-check" style={{fontSize:12}}/>Texto extraido</span>}
                </div>
                <textarea style={Object.assign({},inp,{height:175,resize:"vertical",marginBottom:18})} value={corrW} onChange={function(e){setCorrW(e.target.value);}} placeholder="Pega el texto del trabajo o fotografialo con el boton de arriba..."/>
                <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid "+C.border}}>
                  <label style={Object.assign({},lbl,{marginBottom:8})}>CORRECCION EN BATCH (Excel)</label>
                  <p style={{fontSize:12,color:C.textDim,marginBottom:10}}>Subi un Excel con columna A = Nombre del alumno, columna B = Texto del trabajo. La IA corrige todos y guarda las notas en Mis Alumnos automaticamente.</p>
                  <label style={{display:"inline-flex",alignItems:"center",gap:6,background:C.surf,border:"1px solid "+C.border,borderRadius:4,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:600,color:C.text,marginBottom:10}}>
                    <i className="ti ti-upload" style={{fontSize:14}}/>
                    {batchFile?batchFile.name:"Subir Excel de trabajos"}
                    <input type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={function(e){setBatchFile(e.target.files[0]);setBatchResults([]);}}/>
                  </label>
                  {batchFile&&(
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <Btn disabled={batchLoading||!corrR.trim()} onClick={correctBatch}>
                        {batchLoading
                          ?<><i className="ti ti-loader" style={{fontSize:13,marginRight:4}}/>{"Corrigiendo "+batchProgress+" de "+batchTotal+"..."}</>
                          :<><i className="ti ti-checklist" style={{fontSize:13,marginRight:4}}/>Corregir todos los trabajos</>
                        }
                      </Btn>
                    </div>
                  )}
                  {batchResults.length>0&&(
                    <div style={{marginTop:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                        <span style={{fontSize:13,fontWeight:600,color:C.text}}>{batchResults.length+" correcciones completadas"}</span>
                        <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}} onClick={async function(){
                          var zip = (await import("jszip")).default();
                          batchResults.forEach(function(r){
                            zip.file(r.name.replace(/[^a-zA-Z0-9]/g,"_")+".txt",r.result);
                          });
                          var blob = await zip.generateAsync({type:"blob"});
                          var url = URL.createObjectURL(blob);
                          var a = document.createElement("a");
                          a.href=url;a.download="correcciones.zip";a.click();
                        }}>
                          <i className="ti ti-download" style={{fontSize:13,marginRight:4}}/>Descargar ZIP
                        </Btn>
                      </div>
                      {batchResults.map(function(r,i){
                        return (
                          <div key={i} style={{padding:"10px 14px",background:C.bg,borderRadius:4,marginBottom:6,border:"1px solid "+C.border}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                              <div style={{display:"flex",alignItems:"center",gap:10}}>
                                <span style={{fontSize:13,fontWeight:600,color:C.text}}>{r.name}</span>
                                {r.score!==null&&<span style={{fontSize:13,fontWeight:700,color:r.score>=6?C.green:C.red}}>{r.score+"/10"}</span>}
                                {r.saved&&<span style={{fontSize:11,color:C.green,display:"flex",alignItems:"center",gap:3}}><i className="ti ti-check" style={{fontSize:12}}/>Guardado en Mis Alumnos</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <Btn onClick={correctTP} disabled={corrLoading||!corrR.trim()||!corrW.trim()}>
                  {corrLoading?"Corrigiendo...":<><i className="ti ti-checklist" style={{fontSize:13,marginRight:4}}/>Corregir Trabajo Practico</>}
                </Btn>
              </div>
              <div>
                {corrLoading&&<div style={card}><Spin/></div>}
                {corrResult&&!corrLoading?(
                  <div style={card}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
                      <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8}}>CORRECCION GENERADA</div>
                      <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){saveLib(corrResult,"correccion","Correccion de TP","Correccion "+new Date().toLocaleDateString("es-AR"));}}>
                        <><i className="ti ti-device-floppy" style={{fontSize:13,marginRight:4}}/>Guardar</>
                      </Btn>
                    </div>
                    <MDView text={corrResult} maxH={640}/>
                  </div>
                ):!corrLoading&&(
                  <div style={Object.assign({},card,{textAlign:"center",padding:"56px 24px",color:C.textDim})}>
                    <i className="ti ti-checklist" style={{fontSize:44,display:"block",marginBottom:12,color:C.textDim}}/>
                    <h3 style={{color:C.textMuted,marginBottom:8}}>La correccion aparecera aqui</h3>
                    <p style={{fontSize:13}}>Evaluacion por criterio · Calificacion · Fortalezas · Mejoras · Devolucion</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!dataLoading&&view==="library"&&(
            <div>
              <div style={{display:"flex",gap:12,marginBottom:18,flexWrap:"wrap",alignItems:"center"}}>
                <h2 style={{margin:0,fontSize:19,fontWeight:700,flex:1,color:C.text,display:"flex",alignItems:"center",gap:8}}>
                  <i className="ti ti-books" style={{fontSize:18,color:C.accent}}/>{"Biblioteca ("+library.length+")"}
                </h2>
                {library.length>0&&<Btn v="secondary" st={{fontSize:12,padding:"5px 14px"}} onClick={function(){exportZip(library);}}>
                  <i className="ti ti-archive" style={{fontSize:13,marginRight:4}}/>Exportar todo (.zip)
                </Btn>}
                <input style={Object.assign({},inp,{width:185})} value={libSearch} onChange={function(e){setLibSearch(e.target.value);}} placeholder="Buscar..."/>
                <select style={sel} value={libFilter} onChange={function(e){setLibFilter(e.target.value);}}>
                  <option value="all">Todos</option>
                  {GEN_TYPES.map(function(g){return <option key={g.id} value={g.id}>{g.label}</option>;})}
                  {MM_TYPES.map(function(m){return <option key={m.id} value={m.id}>{m.label}</option>;})}
                  <option value="correccion">Correcciones</option>
                </select>
              </div>
              {libItem?(
                <div>
                  <Btn v="ghost" st={{marginBottom:14,fontSize:12}} onClick={function(){setLibItem(null);}}>
                    <i className="ti ti-arrow-left" style={{fontSize:13,marginRight:4}}/>Volver
                  </Btn>
                  <div style={card}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
                      <div>
                        <div style={{fontSize:12,color:C.textDim,marginBottom:4}}>{libItem.type_name+" · "+libItem.subject_name+" · "+new Date(libItem.created_at).toLocaleDateString("es-AR")}</div>
                        <h2 style={{margin:0,fontSize:19,fontWeight:700,color:C.text}}>{libItem.topic}</h2>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportDocx(libItem.topic,libItem.type_name,libItem.subject_name,libItem.content);}}>
                          <i className="ti ti-file-text" style={{fontSize:13,marginRight:4}}/>Word
                        </Btn>
                        <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportPdf(libItem.topic,libItem.type_name,libItem.subject_name,libItem.content);}}>
                          <i className="ti ti-file-invoice" style={{fontSize:13,marginRight:4}}/>PDF
                        </Btn>
                        <Btn v="danger" onClick={function(){delLib(libItem.id);}}>Eliminar</Btn>
                      </div>
                    </div>
                    <MDView text={libItem.content} maxH={680}/>
                  </div>
                </div>
              ):!filtLib.length?(
                <div style={Object.assign({},card,{textAlign:"center",padding:"52px 24px",color:C.textDim})}>
                  <i className="ti ti-books" style={{fontSize:36,display:"block",marginBottom:10,color:C.textDim}}/>
                  <p>{!library.length?"Tu biblioteca esta vacia.":"Sin resultados."}</p>
                </div>
              ):(
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(258px,1fr))",gap:12}}>
                  {filtLib.map(function(item){
                    var g=GEN_TYPES.find(function(g){return g.id===item.type;})||MM_TYPES.find(function(m){return m.id===item.type;});
                    return (
                      <div key={item.id} style={{background:C.card,border:"1px solid "+C.border,borderRadius:4,padding:16,cursor:"pointer"}} onClick={function(){setLibItem(item);}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                          <i className={"ti "+(g?g.icon:"ti-file")} style={{fontSize:20,color:g?g.color:C.textMuted}}/>
                          <button style={{background:"transparent",border:"none",cursor:"pointer",color:C.red,fontSize:15}} onClick={function(e){e.stopPropagation();delLib(item.id);}}>
                            <i className="ti ti-trash" style={{fontSize:14}}/>
                          </button>
                        </div>
                        <Tag color={g?g.color:C.textMuted}>{item.type_name}</Tag>
                        <div style={{fontWeight:600,color:C.text,fontSize:14,marginTop:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.topic}</div>
                        <div style={{fontSize:12,color:C.textDim,marginTop:3}}>{(item.subject_name||"")+" · "+new Date(item.created_at).toLocaleDateString("es-AR")}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!dataLoading&&view==="bank"&&(
            <div>
              <h2 style={{fontSize:19,fontWeight:700,marginBottom:18,color:C.text,display:"flex",alignItems:"center",gap:8}}>
                <i className="ti ti-database" style={{fontSize:18,color:C.accent}}/>{"Banco de Preguntas ("+bank.length+")"}
              </h2>
              {!bank.length?(
                <div style={Object.assign({},card,{textAlign:"center",padding:"52px 24px",color:C.textDim})}>
                  <i className="ti ti-database" style={{fontSize:36,display:"block",marginBottom:10,color:C.textDim}}/>
                  <p>El banco esta vacio.</p>
                </div>
              ):bank.map(function(item){
                return (
                  <div key={item.id} style={card}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:15,color:C.text,marginBottom:2}}>{item.topic}</div>
                        <div style={{fontSize:12,color:C.textDim}}>{(item.subject_name||"")+" · "+new Date(item.created_at).toLocaleDateString("es-AR")}</div>
                      </div>
                      <Btn v="danger" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){delBank(item.id);}}>Eliminar</Btn>
                    </div>
                    <MDView text={item.content.slice(0,900)+(item.content.length>900?"...":"")} maxH={280}/>
                  </div>
                );
              })}
            </div>
          )}

          {!dataLoading&&view==="sequences"&&(
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"280px 1fr",gap:18}}>
              <div>
                <div style={card}>
                  <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8,marginBottom:14}}>NUEVA SECUENCIA</div>
                  <label style={lbl}>TEMA *</label>
                  <input style={Object.assign({},inp,{marginBottom:12})} value={seqForm.topic} onChange={function(e){setSeqForm(Object.assign({},seqForm,{topic:e.target.value}));}} placeholder="Ej: La celula eucariota"/>
                  <label style={lbl}>NIVEL</label>
                  <select style={Object.assign({},sel,{width:"100%",marginBottom:12})} value={seqForm.level||(curSubj?curSubj.level:"")} onChange={function(e){setSeqForm(Object.assign({},seqForm,{level:e.target.value}));}}>
                    {LEVELS.map(function(l){return <option key={l}>{l}</option>;})}
                  </select>
                  <label style={lbl}>CANTIDAD DE CLASES</label>
                  <div style={{display:"flex",gap:6,marginBottom:18}}>
                    {[4,6,8].map(function(n){
                      return <button key={n} style={{flex:1,padding:"7px 0",borderRadius:4,border:"1px solid "+(seqForm.n_classes===n?C.accent:C.border),background:seqForm.n_classes===n?C.accentBg:"transparent",color:seqForm.n_classes===n?C.accent:C.textMuted,cursor:"pointer",fontWeight:600,fontSize:13,fontFamily:"Quicksand,sans-serif"}} onClick={function(){setSeqForm(Object.assign({},seqForm,{n_classes:n}));}}>{n+" clases"}</button>;
                    })}
                  </div>
                  <Btn st={{width:"100%",justifyContent:"center"}} disabled={seqLoading||!seqForm.topic.trim()||!curSubj} onClick={async function(){
                    setSeqLoading(true);
                    try{
                      var sys="Sos experto en planificacion curricular argentina. Responde en espanol rioplatense con Markdown.";
                      var r=await callClaude(sys,[{role:"user",content:userSequence(seqForm.topic,seqForm.n_classes,seqForm.level||(curSubj?curSubj.level:""),curSubj,seqForm.extra)}],6000);
                      var seq={subject_id:curSid,subject_name:curSubj?curSubj.name:"",topic:seqForm.topic,level:seqForm.level||(curSubj?curSubj.level:""),n_classes:seqForm.n_classes,content:r};
                      var saved=await dbAddSequence(authUser.id,seq);
                      setSequences(function(prev){return [saved].concat(prev);});setSeqView(saved);
                    }catch(e){alert("Error: "+e.message);}
                    setSeqLoading(false);
                  }}>
                    {seqLoading?"Generando...":<><i className="ti ti-list-numbers" style={{fontSize:13,marginRight:4}}/>Generar secuencia</>}
                  </Btn>
                  <label style={Object.assign({},lbl,{marginTop:12})}>INSTRUCCIONES ADICIONALES (opcional)</label>
                  <textarea style={Object.assign({},inp,{height:70,resize:"vertical",marginBottom:12})} value={seqForm.extra||""} onChange={function(e){setSeqForm(Object.assign({},seqForm,{extra:e.target.value}));}} placeholder="Ej: enfoque en trabajo grupal, incluir uso de tecnologia, adaptar para alumnos con NEE..."/>
                  {!curSubj&&<p style={{fontSize:12,color:C.red,marginTop:8}}>Selecciona una materia primero.</p>}
                </div>
                <div style={card}>
                  <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8,marginBottom:12}}>{"GUARDADAS ("+sequences.length+")"}</div>
                  {!sequences.length?<p style={{fontSize:13,color:C.textDim}}>No hay secuencias todavia.</p>:
                    sequences.map(function(s){
                      return (
                        <div key={s.id} style={{padding:"8px 10px",borderRadius:4,marginBottom:4,cursor:"pointer",background:seqView&&seqView.id===s.id?C.accentBg:"transparent",border:"1px solid "+(seqView&&seqView.id===s.id?C.accent:"transparent"),display:"flex",justifyContent:"space-between",alignItems:"center"}}
                          onClick={function(){setSeqView(s);}}>
                          <div>
                            <div style={{fontSize:13,fontWeight:600,color:C.text}}>{s.topic}</div>
                            <div style={{fontSize:11,color:C.textDim}}>{s.subject_name+" · "+s.n_classes+" clases"}</div>
                          </div>
                          <button style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim}} onClick={function(e){e.stopPropagation();dbDelSequence(s.id).then(function(){setSequences(function(prev){return prev.filter(function(x){return x.id!==s.id;});});if(seqView&&seqView.id===s.id) setSeqView(null);});}}>
                            <i className="ti ti-trash" style={{fontSize:14}}/>
                          </button>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
              <div>
                {seqLoading&&<div style={card}><Spin/></div>}
                {!seqLoading&&!seqView&&(
                  <div style={Object.assign({},card,{textAlign:"center",padding:"52px 24px",color:C.textDim})}>
                    <i className="ti ti-list-numbers" style={{fontSize:44,display:"block",marginBottom:12,color:C.textDim}}/>
                    <h3 style={{color:C.textMuted,marginBottom:8}}>Genera tu primera secuencia</h3>
                    <p style={{fontSize:13}}>Un conjunto de clases encadenadas con progresion pedagogica clara.</p>
                  </div>
                )}
                {!seqLoading&&seqView&&(
                  <div style={card}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                      <div>
                        <h2 style={{fontSize:18,fontWeight:700,color:C.text,margin:0}}>{seqView.topic}</h2>
                        <div style={{fontSize:12,color:C.textDim,marginTop:3}}>{seqView.subject_name+" · "+seqView.n_classes+" clases · "+seqView.level}</div>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportDocx(seqView.topic,"Secuencia Didactica",seqView.subject_name,seqView.content);}}>
                          <i className="ti ti-file-text" style={{fontSize:13,marginRight:4}}/>Word
                        </Btn>
                        <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportPdf(seqView.topic,"Secuencia Didactica",seqView.subject_name,seqView.content);}}>
                          <i className="ti ti-file-invoice" style={{fontSize:13,marginRight:4}}/>PDF
                        </Btn>
                      </div>
                    </div>
                    <MDView text={seqView.content} maxH={620}/>
                  </div>
                )}
              </div>
            </div>
          )}

          {!dataLoading&&view==="students"&&(
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"260px 1fr",gap:18}}>
              <div>
                <div style={card}>
                  <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8,marginBottom:12}}>{"ALUMNOS — "+(curSubj?curSubj.name:"Sin materia")}</div>
                  {!curSubj?(
                    <p style={{fontSize:13,color:C.textDim}}>Selecciona una materia primero.</p>
                  ):(
                    <div>
                      <div style={{marginBottom:10}}>
                        <label style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.5,marginBottom:5,display:"block"}}>IMPORTAR DESDE EXCEL</label>
                        <label style={{display:"inline-flex",alignItems:"center",gap:6,background:C.surf,border:"1px solid "+C.border,borderRadius:4,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:600,color:C.text}}>
                          <i className="ti ti-upload" style={{fontSize:14}}/>
                          Importar Excel
                          <input type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={async function(e){
                            var file=e.target.files[0];if(!file) return;
                            var XLSX=await import("xlsx");
                            var buffer=await file.arrayBuffer();
                            var wb=XLSX.read(buffer,{type:"array"});
                            var sheet=wb.Sheets[wb.SheetNames[0]];
                            var rows=XLSX.utils.sheet_to_json(sheet,{header:1});
                            var added=0;
                            for(var i=1;i<rows.length;i++){
                              var nm=rows[i][0]?String(rows[i][0]).trim():"";
                              if(!nm) continue;
                              try{var s3=await dbAddStudent(authUser.id,curSid,nm,rows[i][1]?String(rows[i][1]).trim():"");setStudents(function(prev){return prev.concat([s3]);});added++;}catch{}
                            }
                            alert(added+" alumnos importados.");e.target.value="";
                          }}/>
                        </label>
                        <p style={{fontSize:11,color:C.textDim,marginTop:6,marginBottom:0}}>Col A: Nombre · Col B: Notas</p>
                      </div>
                      <div style={{display:"flex",gap:8,marginBottom:12,marginTop:12}}>
                        <input style={Object.assign({},inp,{flex:1,fontSize:13})} value={newStudentName} onChange={function(e){setNewStudentName(e.target.value);}}
                          onKeyDown={function(e){if(e.key==="Enter"&&newStudentName.trim()){dbAddStudent(authUser.id,curSid,newStudentName.trim()).then(function(s){setStudents(function(prev){return prev.concat([s]);});setNewStudentName("");})}}}
                          placeholder="Nombre del alumno..."/>
                        <Btn onClick={function(){if(!newStudentName.trim()) return;dbAddStudent(authUser.id,curSid,newStudentName.trim()).then(function(s){setStudents(function(prev){return prev.concat([s]);});setNewStudentName("");});}} st={{padding:"9px 12px"}}>
                          <i className="ti ti-plus" style={{fontSize:14}}/>
                        </Btn>
                      </div>
                      {studentsLoading?<div style={{color:C.textDim,fontSize:13}}>Cargando...</div>:!students.length?(
                        <p style={{fontSize:13,color:C.textDim}}>No hay alumnos cargados.</p>
                      ):students.map(function(s){
                        var ev2=allEvals.filter(function(e){return e.student_id===s.id;});
                        var avg=ev2.length?(ev2.reduce(function(a,e){return a+(e.score/e.max_score*10);},0)/ev2.length).toFixed(1):null;
                        return (
                          <div key={s.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",borderRadius:4,marginBottom:4,cursor:"pointer",background:selectedStudent&&selectedStudent.id===s.id?C.accentBg:"transparent",border:"1px solid "+(selectedStudent&&selectedStudent.id===s.id?C.accent:"transparent")}}
                            onClick={function(){setSelectedStudent(s);dbLoadEvaluations(authUser.id,s.id).then(setStudentEvals);}}>
                            <div>
                              <div style={{fontSize:13,fontWeight:600,color:C.text}}>{s.name}</div>
                              <div style={{fontSize:11,color:C.textDim}}>{ev2.length+" evaluacion"+(ev2.length!==1?"es":"")}</div>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              {avg&&<span style={{fontSize:13,fontWeight:700,color:parseFloat(avg)>=6?C.green:C.red}}>{avg}</span>}
                              <button style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim}} onClick={function(e){e.stopPropagation();dbDelStudent(s.id).then(function(){setStudents(function(prev){return prev.filter(function(x){return x.id!==s.id;});});if(selectedStudent&&selectedStudent.id===s.id){setSelectedStudent(null);setStudentEvals([])}});}}>
                                <i className="ti ti-trash" style={{fontSize:14}}/>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div>
                {!selectedStudent?(
                  <div style={Object.assign({},card,{textAlign:"center",padding:"52px 24px",color:C.textDim})}>
                    <i className="ti ti-users" style={{fontSize:44,display:"block",marginBottom:12,color:C.textDim}}/>
                    <h3 style={{color:C.textMuted,marginBottom:8}}>Selecciona un alumno</h3>
                    <p style={{fontSize:13}}>Haz click en un alumno para ver su historial.</p>
                  </div>
                ):(
                  <div style={card}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                      <div>
                        <h2 style={{fontSize:18,fontWeight:700,color:C.text,margin:0}}>{selectedStudent.name}</h2>
                        <div style={{fontSize:12,color:C.textDim,marginTop:3}}>{(curSubj?curSubj.name:"")+" · "+studentEvals.length+" evaluaciones"}</div>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        {studentEvals.length>0&&(
                          <div style={{textAlign:"center",background:C.accentBg,border:"1px solid "+C.accent,borderRadius:4,padding:"8px 16px"}}>
                            <div style={{fontSize:22,fontWeight:700,color:C.accent}}>{(studentEvals.reduce(function(a,e){return a+(e.score/e.max_score*10);},0)/studentEvals.length).toFixed(1)}</div>
                            <div style={{fontSize:10,color:C.textMuted}}>Promedio</div>
                          </div>
                        )}
                        <Btn onClick={function(){setEvalModal(true);setEvalForm({topic:"",score:0,max_score:10,rubric_id:"",rubric_name:"",feedback:""});}}>
                          <i className="ti ti-plus" style={{fontSize:13,marginRight:4}}/>Nueva evaluacion
                        </Btn>
                      </div>
                    </div>
                    {!studentEvals.length?(
                      <p style={{color:C.textDim,fontSize:13}}>Sin evaluaciones todavia.</p>
                    ):studentEvals.map(function(ev){
                      var pct=(ev.score/ev.max_score*100).toFixed(0);
                      var clr=ev.score/ev.max_score>=.6?C.green:C.red;
                      return (
                        <div key={ev.id} style={{borderBottom:"1px solid "+C.border,padding:"12px 0"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                            <div>
                              <div style={{fontSize:14,fontWeight:600,color:C.text}}>{ev.topic}</div>
                              <div style={{fontSize:11,color:C.textDim,marginTop:2}}>{(ev.rubric_name?ev.rubric_name+" · ":"")+new Date(ev.evaluated_at).toLocaleDateString("es-AR")}</div>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <div style={{textAlign:"center"}}>
                                <span style={{fontSize:18,fontWeight:700,color:clr}}>{ev.score}</span>
                                <span style={{fontSize:12,color:C.textDim}}>{"/"+ev.max_score}</span>
                              </div>
                              <button style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim}} onClick={function(){dbDelEvaluation(ev.id).then(function(){setStudentEvals(function(prev){return prev.filter(function(x){return x.id!==ev.id;});});dbLoadAllEvaluations(authUser.id,curSid).then(setAllEvals);});}}>
                                <i className="ti ti-trash" style={{fontSize:14}}/>
                              </button>
                            </div>
                          </div>
                          <div style={{background:C.bg,borderRadius:4,height:6,overflow:"hidden"}}>
                            <div style={{background:clr,height:6,width:pct+"%"}}/>
                          </div>
                          {ev.feedback&&<p style={{fontSize:12,color:C.textMuted,marginTop:8,fontStyle:"italic"}}>{ev.feedback}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {!dataLoading&&view==="publiclib"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                <h2 style={{fontSize:19,fontWeight:700,color:C.text,margin:0,display:"flex",alignItems:"center",gap:8}}>
                  <i className="ti ti-world" style={{fontSize:18,color:C.accent}}/>{"Biblioteca Publica ("+publicLib.length+")"}
                </h2>
                <span style={{fontSize:13,color:C.textMuted}}>Contenido compartido por docentes de la plataforma</span>
              </div>
              {!publicLib.length?(
                <div style={Object.assign({},card,{textAlign:"center",padding:"52px 24px",color:C.textDim})}>
                  <i className="ti ti-world" style={{fontSize:36,display:"block",marginBottom:10,color:C.textDim}}/>
                  <p>La biblioteca publica esta vacia.</p>
                </div>
              ):(
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
                  {publicLib.map(function(item){
                    var g=GEN_TYPES.find(function(g){return g.id===item.type;})||MM_TYPES.find(function(m){return m.id===item.type;});
                    return (
                      <div key={item.id} style={{background:C.card,border:"1px solid "+C.border,borderRadius:4,padding:16}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                          <i className={"ti "+(g?g.icon:"ti-file")} style={{fontSize:20,color:g?g.color:C.textMuted}}/>
                          {authUser&&item.user_id===authUser.id&&(
                            <button style={{background:"transparent",border:"none",cursor:"pointer",color:C.red,fontSize:14}} onClick={async function(){await dbDelPublicItem(item.id);var pub=await dbLoadPublicLib();setPublicLib(pub);}}>
                              <i className="ti ti-trash" style={{fontSize:15}}/>
                            </button>
                          )}
                        </div>
                        <Tag color={g?g.color:C.textMuted}>{item.type_name}</Tag>
                        <div style={{fontWeight:600,color:C.text,fontSize:14,marginTop:8,marginBottom:4}}>{item.topic}</div>
                        <div style={{fontSize:12,color:C.textDim,marginBottom:10}}>{(item.subject_name||"")+" · Por "+(item.user_name||"Docente")}</div>
                        <div style={{fontSize:12,color:C.textDim,marginBottom:12}}>{new Date(item.created_at).toLocaleDateString("es-AR")}</div>
                        <div style={{display:"flex",gap:8}}>
                          <Btn v="secondary" st={{fontSize:12,padding:"5px 12px",flex:1}} onClick={function(){saveLib(item.content,item.type,item.type_name,item.topic);}}>
                            <><i className="ti ti-device-floppy" style={{fontSize:13,marginRight:4}}/>Guardar</>
                          </Btn>
                          <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportDocx(item.topic,item.type_name,item.subject_name||"",item.content);}}>
                            <i className="ti ti-file-text" style={{fontSize:15}}/>
                          </Btn>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!dataLoading&&view==="pricing"&&<PricingPanel authUser={authUser}/>}
          {!dataLoading&&view==="admin"&&<AdminPanel authUser={authUser} supabaseClient={supabase}/>}

        </div>
      </div>

      {evalModal&&selectedStudent&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999}}>
          <div style={{background:C.surf,border:"1px solid "+C.border,borderRadius:4,padding:26,width:500,maxWidth:"92vw"}}>
            <h2 style={{margin:"0 0 18px",fontSize:18,fontWeight:700,color:C.text}}>{"Nueva evaluacion — "+selectedStudent.name}</h2>
            <label style={lbl}>TEMA / ACTIVIDAD *</label>
            <input style={Object.assign({},inp,{marginBottom:12})} value={evalForm.topic} onChange={function(e){setEvalForm(Object.assign({},evalForm,{topic:e.target.value}));}} placeholder="Ej: Trabajo practico N°2"/>
            <label style={lbl}>RUBRICA (opcional)</label>
            <select style={Object.assign({},sel,{width:"100%",marginBottom:12})} value={evalForm.rubric_id} onChange={function(e){var r=library.find(function(i){return i.id===e.target.value;});setEvalForm(Object.assign({},evalForm,{rubric_id:e.target.value,rubric_name:r?r.topic:""}));}}>
              <option value="">Sin rubrica</option>
              {library.filter(function(i){return i.type==="rubrica";}).map(function(r){return <option key={r.id} value={r.id}>{r.topic}</option>;})}
            </select>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div>
                <label style={lbl}>CALIFICACION *</label>
                <input style={inp} type="number" min="0" max={evalForm.max_score} value={evalForm.score} onChange={function(e){setEvalForm(Object.assign({},evalForm,{score:parseFloat(e.target.value)||0}));}}/>
              </div>
              <div>
                <label style={lbl}>NOTA MAXIMA</label>
                <input style={inp} type="number" min="1" value={evalForm.max_score} onChange={function(e){setEvalForm(Object.assign({},evalForm,{max_score:parseFloat(e.target.value)||10}));}}/>
              </div>
            </div>
            <label style={lbl}>DEVOLUCION / COMENTARIOS</label>
            <textarea style={Object.assign({},inp,{height:80,resize:"vertical",marginBottom:20})} value={evalForm.feedback} onChange={function(e){setEvalForm(Object.assign({},evalForm,{feedback:e.target.value}));}} placeholder="Comentarios para el alumno..."/>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn v="ghost" onClick={function(){setEvalModal(false);}}>Cancelar</Btn>
              <Btn disabled={!evalForm.topic.trim()} onClick={function(){dbAddEvaluation(authUser.id,selectedStudent.id,Object.assign({},evalForm,{rubric_id:evalForm.rubric_id||null})).then(function(ev){setStudentEvals(function(prev){return [ev].concat(prev);});dbLoadAllEvaluations(authUser.id,curSid).then(setAllEvals);setEvalModal(false);});}}>Guardar evaluacion</Btn>
            </div>
          </div>
        </div>
      )}

      {subjModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999}}>
          <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:4,padding:26,width:488,maxWidth:"92vw"}}>
            <h2 style={{margin:"0 0 18px",fontSize:19,fontWeight:700,color:C.text}}>{editingSubject?"Editar Materia":"Nueva Materia"}</h2>
            <label style={lbl}>NOMBRE *</label>
            <input style={Object.assign({},inp,{marginBottom:13})} value={sf.name} onChange={function(e){setSf(Object.assign({},sf,{name:e.target.value}));}} placeholder="Ej: Biologia, Historia, Matematica II..." autoFocus/>
            <label style={lbl}>NIVEL</label>
            <select style={Object.assign({},sel,{width:"100%",marginBottom:13})} value={sf.level} onChange={function(e){setSf(Object.assign({},sf,{level:e.target.value}));}}>
              {LEVELS.map(function(l){return <option key={l}>{l}</option>;})}
            </select>
            <label style={lbl}>PROGRAMA / MATERIALES</label>
            <textarea style={Object.assign({},inp,{height:100,resize:"vertical",marginBottom:14})} value={sf.materials} onChange={function(e){setSf(Object.assign({},sf,{materials:e.target.value}));}} placeholder="Pega programa, objetivos, unidades tematicas..."/>
            <label style={lbl}>BIBLIOGRAFIA EN PDF (opcional)</label>
            <p style={{fontSize:12,color:C.textDim,margin:"0 0 8px"}}>Claude extraera el contenido para generar material mas preciso.</p>
            <label style={{display:"inline-flex",alignItems:"center",gap:6,background:C.surf,border:"1px solid "+C.border,borderRadius:4,padding:"7px 14px",cursor:pdfLoading?"not-allowed":"pointer",fontSize:12,fontWeight:600,color:C.text,marginBottom:10,opacity:pdfLoading?.6:1}}>
              <i className="ti ti-file-upload" style={{fontSize:14}}/>
              {pdfLoading?"Procesando PDF...":"Subir PDF"}
              <input type="file" accept=".pdf" multiple style={{display:"none"}} disabled={pdfLoading} onChange={async function(e){
                var files=Array.from(e.target.files);
                if(!files.length) return;
                setPdfLoading(true);
                for(var i=0;i<files.length;i++){
                  try{
                    var result=await processPdf(files[i]);
                    setSfPdfs(function(prev){return prev.concat([result]);});
                  }catch(err){alert("Error procesando "+files[i].name+": "+err.message);}
                }
                setPdfLoading(false);
                e.target.value="";
              }}/>
            </label>
            {sfPdfs.length>0&&(
              <div style={{marginBottom:14}}>
                {sfPdfs.map(function(p,i){
                  return (
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:C.bg,borderRadius:4,marginBottom:4,border:"1px solid "+C.border}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <i className="ti ti-file-type-pdf" style={{fontSize:15,color:C.red}}/>
                        <span style={{fontSize:12,color:C.text}}>{p.filename}</span>
                        <span style={{fontSize:11,color:C.textDim}}>{"("+Math.round(p.chars/1000)+"k caracteres)"}</span>
                      </div>
                      <button style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim}} onClick={function(){setSfPdfs(function(prev){return prev.filter(function(_,j){return j!==i;});});}}>
                        <i className="ti ti-x" style={{fontSize:14}}/>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn v="ghost" st={{fontSize:13}} onClick={function(){setSubjModal(false);setEditingSubject(null);setSfPdfs([]);}}>Cancelar</Btn>
              <Btn onClick={addSubject} disabled={!sf.name.trim()}>
                <i className="ti ti-plus" style={{fontSize:13,marginRight:4}}/>Crear Materia
              </Btn>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}