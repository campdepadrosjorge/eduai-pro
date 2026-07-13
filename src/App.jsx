import { useState, useEffect, useRef } from "react";
import supabase from "./supabase.js";
import { exportDocx, exportPdf, exportZip } from "./exportUtils.js";
import { useTour, TourTooltip, TourLaunchButton, WelcomeModal } from "./TourSystem.jsx";
import { generatePptx } from "./pptxUtils.js";
import DirectivoDashboard from "./DirectivoDashboard.jsx";
var _currentUser = { id: null, isAdmin: false };

const NAV = [
  { id:"dashboard",  label:"Inicio",              icon:"ti-layout-dashboard" },
  { id:"generator",  label:"Generador IA",         icon:"ti-bolt" },
  { id:"multimedia", label:"Multimedia",           icon:"ti-photo" },
  { id:"chat",       label:"Chat Docente",         icon:"ti-message" },
  { id:"corrector",  label:"Corrector de TPs",     icon:"ti-checklist" },
  { id:"library",    label:"Biblioteca",           icon:"ti-books" },
  { id:"bank",       label:"Banco de Preguntas",   icon:"ti-database" },
  { id:"smartbank",  label:"Banco Inteligente",     icon:"ti-brain" },
  { id:"sequences",  label:"Secuencias",           icon:"ti-list-numbers" },
  { id:"students",   label:"Mis Alumnos",          icon:"ti-users" },
  { id:"publiclib",  label:"Biblioteca Publica",   icon:"ti-world" },
  { id:"projects",   label:"Proyectos Colaborativos", icon:"ti-topology-star" },
  { id:"pricing",    label:"Planes y Precios",     icon:"ti-credit-card" },
  { id:"admin",      label:"Panel Admin",          icon:"ti-chart-bar" },
];

const GEN_TYPES = [
  { id:"planclase",    label:"Plan de Clase",       icon:"ti-calendar",   color:"#1d4ed8" },
  { id:"actividad",   label:"Actividad para el Alumno",       icon:"ti-target",     color:"#059669" },
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
  { id:"imagen_ia",           label:"Generador de Imagenes IA", icon:"ti-photo-ai",     desc:"Imagenes con IA" },
];

const LEVELS = [
  "Nivel Inicial",
  "Primaria (primer ciclo)","Primaria (segundo ciclo)",
  "Secundaria (ciclo basico)","Secundaria (ciclo superior)",
  "Terciario / Universitario","Formacion Docente","Capacitacion Profesional",
];

function sysGen(type, subject, level, materials, bibliography) {
  var ctx = "Materia: \"" + subject + "\" | Nivel: " + level + "." +
    (materials ? "\n\nPrograma de la materia:\n" + materials : "") +
    (bibliography ? "\n\nBibliografia de referencia:\n" + bibliography.slice(0, 8000) : "");
  var base = "Sos un docente experto con 20 anos de experiencia en " + subject + " nivel " + level + ", especializado en diseno de materiales educativos de alta calidad. Usa el nivel educativo tal como se te indica, sin agregar rangos de grados o anos especificos (como '4to a 6to'), ya que la organizacion de grados varia segun la jurisdiccion y el pais. " + ctx;
  var p = {
    planclase:    base + "\n\nTu tarea es crear un PLAN DE CLASE de excelencia que un docente pueda llevar directamente al aula, pensado con criterio pedagogico real y no como un formulario a completar. Un buen plan de clase tiene una secuencia didactica clara (inicio, desarrollo y cierre) con tiempos, objetivos bien formulados, y consignas concretas para los alumnos. DesarrollÃ¡ bien lo importante y decidÃ­ con criterio que incluir segun el tema; no fuerces secciones de relleno. Como minimo deben quedar claros: los objetivos, la secuencia didactica con momentos y tiempos, y como se evalua.",
    actividad:   base + "\n\nTu tarea es crear una ACTIVIDAD DIDACTICA de excelencia, lista para usar en el aula y pensada con criterio pedagogico real, no como un formulario a completar. Una buena actividad es clara, motivadora, bien secuenciada y directamente aplicable; incluye consignas precisas que el alumno entiende sin ayuda, y propone un desafio genuino adecuado al nivel. Decidi vos que secciones y en que profundidad segun lo que el tema realmente necesita, priorizando la calidad y la usabilidad por sobre la exhaustividad. No fuerces secciones que no aporten. Como minimo, la actividad debe dejar claros: los objetivos de aprendizaje, el desarrollo paso a paso, y como se evalua.",
    rubrica:      base + "\n\nTu tarea es crear una RUBRICA ANALITICA de excelencia, lista para usar. Una buena rubrica tiene criterios claros y observables, con descriptores concretos que permiten distinguir sin ambiguedad cada nivel de logro. Los descriptores tienen que ser especificos del tema evaluado, no genericos. Mantene la estructura de tabla con criterios y niveles, e incluÃ­ como se traduce a una calificacion.",
    evaluacion:   base + "\n\nTu tarea es crear una EVALUACION de excelencia, lista para imprimir y tomar. Una buena evaluacion tiene preguntas claras, bien formuladas y de dificultad adecuada al nivel, que realmente midan la comprension del tema y no solo la memoria. Cuida que cada consigna sea inequivoca y que la evaluacion tenga una progresion razonable de dificultad. Mantene una estructura clara por secciones e incluÃ­ siempre una clave de respuestas al final para el docente.",
    material:     base + "\n\nTu tarea es crear MATERIALES DIDACTICOS atractivos y completos. IncluÃ­ siempre: titulo, introduccion motivadora, desarrollo por subtemas con ejemplos concretos y cercanos a la realidad del alumno, cuadros de conceptos clave, actividades integradas dentro del texto, sintesis visual, glosario, preguntas de autoevaluacion. Usa formato de texto escolar con tablas, recuadros destacados y estructura clara.",
    presentacion: base + "\n\nTu tarea es crear un ESQUEMA DE PRESENTACION de excelencia, pensado con criterio pedagogico y con una progresion clara del tema. REGLA CLAVE: las diapositivas llevan MUY POCO texto (ideas clave en pocas palabras, nunca oraciones largas ni parrafos); todo el desarrollo, las explicaciones y los ejemplos van en las NOTAS DEL PRESENTADOR. Una slide es un apoyo visual, no un documento.\n\nGenera la cantidad de diapositivas que el tema necesite (habitualmente entre 10 y 16), usando EXACTAMENTE este formato para cada una:\n\n## SLIDE [N]: [Titulo]\n[3-5 bullets cortos y telegraficos, uno por linea comenzando con -, pocas palabras cada uno]\nNOTAS DEL PRESENTADOR: [Todo el desarrollo del contenido, ejemplos y transiciones, 3-5 oraciones]\n\n---\n\nRespeta este formato al pie de la letra (el encabezado '## SLIDE', los bullets con '-', la linea 'NOTAS DEL PRESENTADOR:' y el separador '---'), porque se procesa automaticamente. No uses emojis en los titulos. IncluÃ­ slide de apertura, desarrollo, cierre y preguntas.",
    guia:         base + "\n\nTu tarea es crear GUIAS DE ESTUDIO completas y autonomas. IncluÃ­ siempre: objetivos de aprendizaje, mapa conceptual en texto, preguntas orientadoras antes de cada seccion, desarrollo por unidades con ejemplos, actividades de comprension lectora integradas, cuadros comparativos, autoevaluacion con respuestas, estrategias de repaso y memoria, recursos adicionales sugeridos.",
    adaptado:     base + "\n\nSos especialista en educacion inclusiva y NEE con experiencia en adaptaciones curriculares. Tu tarea es crear materiales adaptados especificos, practicos y listos para usar con un alumno concreto.",
  };
  return (p[type] || base) + "\n\nResponde siempre en espanol rioplatense. Usa Markdown con estructura visual clara (tablas, listas, encabezados). El material debe ser de calidad profesional, listo para usar sin modificaciones.";
}

function userGen(type, topic, diff, extra, subject, docText) {
  var docCtx = docText ? "\n\nDOCUMENTO DE CONTEXTO (usÃ¡ este material como base para generar el contenido, respetando su enfoque, vocabulario y nivel):\n" + docText.slice(0, 8000) : "";
  var e = (extra ? "\n\nInstrucciones adicionales del docente: " + extra : "") + docCtx;
  var makecodeText = (topic + " " + (extra || "")).toLowerCase();
  var isMakeCode = makecodeText.includes("makecode") || makecodeText.includes("micro:bit") || makecodeText.includes("microbit");
  var mk = isMakeCode ? "\n\nIMPORTANTE: IncluÃ­ una seccion '## Codigo MakeCode' con el codigo JavaScript completo para micro:bit dentro de un bloque ```javascript. ExplicÃ¡ cada linea con comentarios." : "";
  var nivel = subject ? " para alumnos de " + (subject.level||"nivel medio") : "";
  var materia = subject ? " en el contexto de " + subject.name : "";
  var m = {
   planclase:
      "Crea un plan de clase de excelencia sobre: \"" + topic + "\"" + nivel + materia + "\nNivel de dificultad: " + diff + "\n\n" +
      "El documento integra dos partes: una GUIA PARA EL DOCENTE (con los datos del plan, objetivos, la secuencia didactica de inicio-desarrollo-cierre con tiempos, consignas concretas para los alumnos y como se evalua) y un MATERIAL PARA EL ALUMNO listo para imprimir y entregar (con las consignas y los espacios de trabajo que la clase necesite). SumÃ¡ lo que el tema pida para ser un gran plan (diferenciacion, preguntas orientadoras, desafio extra, etc.) solo si aporta valor real.\n\n" +
      "SE CONCISO Y PRACTICO. DesarrollÃ¡ bien lo importante y evitÃ¡ el relleno. MantenÃ© las tablas breves (pocas filas, no listas larguisimas) y no desmenuces cada punto al extremo. Un docente tiene que poder leer y usar este plan rapido. ApuntÃ¡ a una extension moderada, no a un documento de muchas paginas.\n\n" +
      "FORMATO: usa exclusivamente tablas en formato Markdown (con | y guiones), nunca dibujadas con caracteres o ASCII. No uses emojis en los titulos; como mucho alguno muy puntual dentro del texto si de verdad aporta. Estructura clara con encabezados." + e,

    actividad:
      "Crea una actividad didactica de excelencia, lista para entregar al alumno, sobre: \"" + topic + "\"" + nivel + materia + "\nNivel de dificultad: " + diff + "\n\n" +
      "Pensala como la pensaria un gran docente: con un objetivo claro, un desarrollo bien secuenciado en pasos con consignas precisas, y una forma de evaluar lo aprendido. Sumale lo que el tema pida para ser una gran actividad (por ejemplo motivacion inicial, un desafio para quienes terminan antes, reflexion final o una nota para el docente), pero solo si aporta valor real.\n\n" +
      "SE CONCISO Y PRACTICO. El documento tiene que ser agil y directamente usable, no exhaustivo. PriorizÃ¡ lo esencial: desarrollÃ¡ bien lo importante y evitÃ¡ el relleno. Cuando uses tablas para completar, mantenelas breves (pocas filas de ejemplo, no listas larguisimas). No agregues espacios de escritura excesivos ni desmenuces cada paso al extremo. Un docente tiene que poder leer y usar esta actividad rapido. ApuntÃ¡ a una extension moderada, no a un documento de muchas paginas.\n\n" +
      "FORMATO: usa exclusivamente tablas en formato Markdown (con | y guiones), nunca dibujadas con caracteres o ASCII. No uses emojis en los titulos; como mucho, alguno muy puntual dentro del texto si de verdad aporta. Estructura clara con encabezados. El documento debe poder imprimirse y entregarse directamente." + mk + e,

    rubrica:
      "Crea una rubrica analitica completa y profesional para evaluar: \"" + topic + "\"" + nivel + materia + "\nNivel de dificultad: " + diff + "\n\n" +
      "La rubrica debe incluir:\n" +
      "- Una tabla principal con criterios especificos y observables (los que el tema realmente requiera)\n" +
      "- Niveles de logro claros (por ejemplo Excelente / Satisfactorio / En proceso / Inicio) con su puntaje\n" +
      "- Descriptores concretos y especificos del tema para cada criterio en cada nivel (no genericos)\n" +
      "- Puntaje por criterio y total, y como se convierte a una nota\n" +
      "- Breves instrucciones de uso para el docente\n\n" +
      "PriorizÃ¡ que los criterios y descriptores sean utiles y claros por sobre la cantidad. Que un docente pueda tomar la rubrica y evaluar con ella sin dudas.\n\n" +
      "FORMATO: usÃ¡ tablas en formato Markdown (con | y guiones), nunca dibujadas con ASCII. No uses emojis. Estructura clara." + e,

    evaluacion:
      "Crea una evaluacion completa y lista para imprimir sobre: \"" + topic + "\"" + nivel + materia + "\nNivel de dificultad: " + diff + "\n\n" +
      "Estructura sugerida (adaptala si el tema lo pide):\n" +
      "- Encabezado con: Nombre, Apellido, Curso, Fecha, Calificacion (campos en blanco)\n" +
      "- Instrucciones generales claras\n" +
      "- Seccion de opcion multiple (varios items con 4 opciones)\n" +
      "- Seccion de verdadero o falso con justificacion\n" +
      "- Seccion de respuesta breve\n" +
      "- Seccion de desarrollo (1-2 preguntas integradoras)\n" +
      "- El valor de cada seccion indicado\n" +
      "- CLAVE DE RESPUESTAS completa al final para el docente. La clave debe ser CONCISA: indicÃ¡ la respuesta correcta de cada item y, cuando haga falta, una fundamentacion breve de una sola linea. No escribas parrafos largos de explicacion por cada respuesta.\n\n" +
      "Las preguntas deben ser claras, bien formuladas y adecuadas al nivel; priorizÃ¡ la calidad de cada consigna por sobre la cantidad. No incluyas mas items de los necesarios para evaluar bien el tema.\n\n" +
      "FORMATO: usa tablas en formato Markdown (con | y guiones) si necesitas tablas, nunca dibujadas con ASCII. No uses emojis. Estructura clara con encabezados. Listo para imprimir." + e,

   material:
      "Crea un material didactico de excelencia sobre: \"" + topic + "\"" + nivel + materia + "\nNivel de dificultad: " + diff + "\n\n" +
      "Pensalo como lo escribiria un gran docente: con explicaciones claras, ejemplos concretos y cercanos al alumno, y todo lo que ayude a comprender el tema de verdad (introduccion motivadora, conceptos clave destacados, cuadros o tablas de sintesis, glosario, preguntas de autoevaluacion con sus respuestas). IncluÃ­ eso solo si aporta valor real; no agregues secciones de relleno ni cantidades fijas de items forzadas.\n\n" +
      "SE CONCISO. Esto es clave: el material tiene que ser acotado y estudiable, no extenso. Enfocate en el contenido central del tema y explicalo bien, sin desarrollar cada subtema hasta el agotamiento ni acumular ejemplos de mas. Si hay glosario, que tenga los terminos realmente importantes, no una lista larga. Un material de pocas paginas bien hecho es mucho mejor que uno larguisimo. PreferÃ­ siempre la claridad y la brevedad por sobre la exhaustividad.\n\n" +
      "FORMATO: usa exclusivamente tablas en formato Markdown (con | y guiones), nunca dibujadas con caracteres o ASCII. No uses emojis en los titulos; como mucho alguno muy puntual dentro del texto si de verdad aporta. Estructura clara con encabezados." + e,

    presentacion:
      "Crea un esquema de presentacion sobre: \"" + topic + "\"" + nivel + materia + "\nNivel de dificultad: " + diff + "\n\n" +
      "Genera la cantidad de diapositivas que el tema necesite (habitualmente entre 10 y 16) usando EXACTAMENTE este formato para cada una:\n\n" +
      "## SLIDE [N]: [Titulo de la diapositiva]\n" +
      "- [bullet corto y telegrafico, maximo 6-8 palabras]\n" +
      "- [bullet corto]\n" +
      "- [bullet corto]\n" +
      "NOTAS DEL PRESENTADOR: [Aca va TODO el desarrollo: lo que el docente explica en voz alta, ejemplos, detalles y transiciones. 3-5 oraciones]\n\n" +
      "---\n\n" +
      "REGLA CLAVE de una buena presentacion: las diapositivas llevan MUY POCO texto (ideas clave en pocas palabras, nunca oraciones largas ni parrafos). Maximo 3-5 bullets por slide, cada uno de pocas palabras. Todo el contenido desarrollado, las explicaciones y los ejemplos van en las NOTAS DEL PRESENTADOR, no en la slide. Una slide es un apoyo visual, no un documento.\n\n" +
      "Respeta el formato al pie de la letra (el '## SLIDE', los bullets con '-', la linea 'NOTAS DEL PRESENTADOR:' y el separador '---'), porque se procesa automaticamente. No uses emojis. IncluÃ­ apertura con pregunta disparadora, desarrollo, una slide de actividad para los alumnos, sintesis y cierre con preguntas." + e,

    guia:
      "Crea una guia de estudio de excelencia y autonoma sobre: \"" + topic + "\"" + nivel + materia + "\nNivel de dificultad: " + diff + "\n\n" +
      "Pensala para que el alumno pueda estudiar solo: con objetivos claros de lo que va a lograr, el tema bien organizado y explicado, preguntas orientadoras que activen la lectura, autoevaluacion con respuestas para verificar, y estrategias de repaso. SumÃ¡ cuadros de sintesis, actividades de comprension o recursos para profundizar solo si aportan valor real; no fuerces secciones de relleno.\n\n" +
      "SE CONCISA. Esto es clave: la guia tiene que ser acotada y util, no extensa. Enfocate en orientar el estudio de lo esencial, sin desarrollar cada punto hasta el agotamiento ni acumular actividades o preguntas de mas. Una guia de pocas paginas bien hecha es mucho mejor que una larguisima. PreferÃ­ siempre la claridad y la brevedad por sobre la exhaustividad.\n\n" +
      "FORMATO: usa exclusivamente tablas en formato Markdown (con | y guiones), nunca dibujadas con caracteres o ASCII. No uses emojis en los titulos; como mucho alguno muy puntual dentro del texto si de verdad aporta. Estructura clara con encabezados." + e,
  };
  return m[type] || "Crea contenido educativo de alta calidad sobre \"" + topic + "\"" + nivel + materia + ". Dificultad: " + diff + "." + e;
}

function userMM(type, topic, extra) {
  var e = extra ? "\n\nInstrucciones: " + extra : "";
  var m = {
    podcast:             "Crea un guion de podcast educativo de calidad sobre: \"" + topic + "\". Pensalo para que sea ameno y claro de escuchar: una introduccion que enganche, un desarrollo en bloques bien organizados con contenido sustancioso y ejemplos, y un cierre. IncluÃ­ indicaciones de produccion utiles (tono, pausas, musica) donde ayuden. Que suene natural, no acartonado. Se conciso y practico, sin relleno. No uses emojis." + e,
    infografia:          "Crea el contenido y la estructura de una infografia educativa de calidad sobre: \"" + topic + "\". DefinÃ­ un titulo claro, las secciones con su contenido concreto (datos, conceptos clave, pasos), y una propuesta visual: paleta de colores sugerida (en codigos HEX) e indicaciones de que iria en cada bloque para armarla en Canva u otra herramienta. PriorizÃ¡ que la informacion sea clara y bien jerarquizada. Se conciso. No uses emojis en el contenido." + e,
    video_script:        "Crea un guion de video educativo de calidad sobre: \"" + topic + "\". Estructuralo con un gancho inicial que capte la atencion, un desarrollo en bloques claros, y un cierre con llamado a la accion. Para cada parte, indicÃ¡ que se ve (imagen/visual), que se dice (voz en off o presentador) y que texto aparece en pantalla. Que sea dinamico y adecuado para video. Se conciso y practico. No uses emojis." + e,
  };
  return m[type] || "Contenido multimedia educativo sobre \"" + topic + "\"." + e;
}

function userSequence(topic, nClasses, level, subject, extra) {
  return "Disena una secuencia didactica de " + nClasses + " clases sobre: \"" + topic + "\"" +
    (subject ? " para " + subject.name : "") + (level ? " | Nivel: " + level : "") +
    (subject && subject.materials ? "\n\nPrograma:\n" + subject.materials.slice(0, 400) : "") +
    "\n\nPensala como lo haria un gran docente: con una progresion pedagogica real entre clases (cada una retoma y avanza sobre la anterior), objetivos claros, y actividades concretas y aplicables. Que sea util y directamente llevable al aula, no un relleno formal." +
    "\n\nPara cada clase usa ESTE FORMATO EXACTO:\n\n## CLASE [N]: [Titulo]\n**Duracion:** [min]\n**Objetivos:** [2-3]\n**Retoma:** [conexion anterior]\n**Inicio (10min):** [apertura]\n**Desarrollo (25min):** [actividad principal]\n**Cierre (10min):** [sintesis]\n**Recursos:** [materiales]\n**Evaluacion:** [como evaluar]\n\n---\n\nRespeta este formato al pie de la letra (el '## CLASE', los campos en negrita y el separador '---'). No uses emojis. Progresion clara de dificultad entre clases." + (extra ? "\n\nInstrucciones adicionales: " + extra : "");
}
function msgError(e){
  if(e && e.message==="__LIMIT__") return "Alcanzaste el limite de uso disponible por el momento. El servicio se restablece automaticamente. Si el problema persiste, escribinos a hola@aulaxpro.com.";
  return "Error: "+(e && e.message ? e.message : e);
}
async function callClaude(system, messages, maxTokens, useSearch, onStream, userId) {
  if (!maxTokens) maxTokens = 4000;
  var useStreaming = typeof onStream === "function";
  var res = await fetch("/api/generate", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ system, messages, maxTokens, useSearch:!!useSearch, stream:useStreaming, userId:_currentUser.id, isAdmin:_currentUser.isAdmin }),
  });
  if (!res.ok) {
    var err = {};
    try { err = await res.json(); } catch(e) {}
    var errMsg = err.error || ("Error " + res.status);
    if (res.status===402 || /usage limit|usage limits|credit balance|rate limit|reached your|limite de uso/i.test(errMsg)) {
      throw new Error("__LIMIT__");
    }
    throw new Error(errMsg);
  }
  if (!useStreaming) {
    var data = await res.json();
    return data.content.filter(function(b){return b.type==="text";}).map(function(b){return b.text;}).join("");
  }
  var reader = res.body.getReader();
  var decoder = new TextDecoder();
  var fullText = "";
  while(true) {
    var result = await reader.read();
    if(result.done) break;
    var chunk = decoder.decode(result.value, {stream:true});
    var lines = chunk.split("\n");
    for(var i=0;i<lines.length;i++) {
      var line = lines[i];
      if(!line.startsWith("data: ")) continue;
      var data2 = line.slice(6);
      if(data2 === "[DONE]") break;
      try {
        var parsed = JSON.parse(data2);
        if(parsed.text) { fullText += parsed.text; onStream(fullText); }
        if(parsed.error) throw new Error(parsed.error);
      } catch(e) {}
    }
  }
  return fullText;
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
async function dbLoadQuestionItems(userId, subjectName) {
  var q = supabase.from("question_items").select("*").eq("user_id",userId).order("topic");
  if(subjectName) q = q.eq("subject_name",subjectName);
  var r = await q;
  if(r.error) throw r.error; return r.data||[];
}
async function dbAddQuestionItem(userId, item) {
  var r = await supabase.from("question_items").insert({user_id:userId,...item}).select().single();
  if(r.error) throw r.error; return r.data;
}
async function dbDelQuestionItem(id) {
  var r = await supabase.from("question_items").delete().eq("id",id); if(r.error) throw r.error;
}
async function dbLoadProjects(userId) {
  var owned = await supabase.from("projects").select("*, project_members(*)").eq("owner_id",userId).order("created_at",{ascending:false});
  var sharedRes = await fetch("/api/get-shared-projects",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:userId})});
  var sharedData = sharedRes.ok ? await sharedRes.json() : {projects:[]};
  return {owned:owned.data||[], shared:sharedData.projects||[]};
}

async function dbAddProject(userId, data) {
  var r = await supabase.from("projects").insert({owner_id:userId,...data}).select().single();
  if(r.error) throw r.error; return r.data;
}

async function dbDelProject(id) {
  var r = await supabase.from("projects").delete().eq("id",id); if(r.error) throw r.error;
}

async function dbLoadProjectContents(projectId) {
  var r = await supabase.from("project_contents").select("*").eq("project_id",projectId).order("created_at",{ascending:false});
  if(r.error) throw r.error; return r.data||[];
}

async function dbAddProjectContent(userId, projectId, data) {
  var r = await supabase.from("project_contents").insert({user_id:userId,project_id:projectId,...data}).select().single();
  if(r.error) throw r.error; return r.data;
}

async function dbDelProjectContent(id) {
  var r = await supabase.from("project_contents").delete().eq("id",id); if(r.error) throw r.error;
}

async function dbInviteToProject(projectId, email, subjectName) {
  var userResult = await supabase.auth.admin.listUsers();
  var users = userResult.data ? userResult.data.users : [];
  var user = users.find(function(u){return u.email===email;});
  if(!user) throw new Error("El usuario no tiene cuenta en AulaXpro");
  var r = await supabase.from("project_members").insert({project_id:projectId,user_id:user.id,subject_name:subjectName,status:"active",joined_at:new Date().toISOString()});
  if(r.error) throw r.error;
  return user;
}

async function dbAcceptInvitation(memberId) {
  var r = await supabase.from("project_members").update({status:"active",joined_at:new Date().toISOString()}).eq("id",memberId);
  if(r.error) throw r.error;
}
async function dbSearchSchools(query) {
  if(!query||query.length<2) return [];
  var r = await supabase.from("schools").select("id,name,city").ilike("name","%"+query+"%").limit(8);
  return r.data||[];
}

async function dbAddOrUpdateSchool(name, city) {
  if(!name) return;
  var existing = await supabase.from("schools").select("id,users_count").eq("name",name).single();
  if(existing.data) {
    await supabase.from("schools").update({users_count:(existing.data.users_count||1)+1}).eq("id",existing.data.id);
  } else {
    await supabase.from("schools").insert({name,city:city||""}).catch(function(){});
  }
}
async function dbLoadNotifications(userId) {
  var r = await supabase.from("project_members")
    .select("id, project_id, status, invited_at, projects(title)")
    .eq("user_id", userId)
    .order("invited_at", {ascending:false});
  if(r.error) return [];
  return (r.data||[]).map(function(m){
    return {
      id: m.id,
      type: "project_invite",
      title: "Te invitaron a un proyecto",
      message: "Proyecto: " + (m.projects ? m.projects.title : "Sin tÃ­tulo"),
      date: m.invited_at,
      read: m.status === "active",
    };
  });
}
async function dbCreateChatSession(userId, title) {
  var r = await supabase.from("chat_sessions").insert({user_id:userId, title:title||"Nueva conversacion"}).select().single();
  if(r.error) throw r.error; return r.data;
}

async function dbUpdateSessionTitle(sessionId, title) {
  await supabase.from("chat_sessions").update({title, updated_at:new Date().toISOString()}).eq("id",sessionId);
}

async function dbLoadChatSessions(userId) {
  var r = await supabase.from("chat_sessions").select("*").eq("user_id",userId).order("updated_at",{ascending:false}).limit(30);
  if(r.error) return []; return r.data||[];
}

async function dbDeleteChatSession(sessionId) {
  await supabase.from("chat_history").delete().eq("session_id",sessionId);
  await supabase.from("chat_sessions").delete().eq("id",sessionId);
}

async function dbSaveChatMessage(userId, role, content, subjectId, sessionId) {
  try {
    await supabase.from("chat_history").insert({user_id:userId, role, content, subject_id:subjectId||null, session_id:sessionId||null});
    if(sessionId) await supabase.from("chat_sessions").update({updated_at:new Date().toISOString()}).eq("id",sessionId);
  } catch(e) {}
}

async function dbLoadChatHistory(userId, limit, sessionId) {
  if(!limit) limit = 100;
  var q = supabase.from("chat_history").select("*").eq("user_id",userId).order("created_at",{ascending:true}).limit(limit);
  if(sessionId) q = q.eq("session_id",sessionId);
  var r = await q;
  if(r.error) return []; return r.data||[];
}

async function dbClearChatHistory(userId) {
  await supabase.from("chat_history").delete().eq("user_id",userId);
  await supabase.from("chat_sessions").delete().eq("user_id",userId);
}

async function dbLogUsage(userId, userEmail, type, typeName, subjectName, tokIn, tokOut, isImage) {
  try { await supabase.from("usage_log").insert({user_id:userId,user_email:userEmail,type,type_name:typeName,subject_name:subjectName||"",tokens_input:tokIn||0,tokens_output:tokOut||0,is_image:isImage||false}); } catch(e) {}
}
async function dbGetUsage(userId) {
  var r = await supabase.from("subscriptions")
    .select("tokens_used,tokens_limit,extra_credits,tokens_reset_date")
    .eq("user_id",userId).eq("status","active").limit(1);
  if(r.error||!r.data||r.data.length===0) return null;
  return r.data[0];
}

async function dbAddUsageCost(userId, costUsd) {
  var usage = await dbGetUsage(userId);
  if(!usage) return;
  // Resetear si cambio el mes
  var resetDate = new Date(usage.tokens_reset_date);
  var now = new Date();
  if(now > resetDate) {
    var nextReset = new Date(now.getFullYear(), now.getMonth()+1, 1);
    await supabase.from("subscriptions").update({
      tokens_used: costUsd,
      tokens_reset_date: nextReset.toISOString(),
    }).eq("user_id",userId).eq("status","active");
    return;
  }
  await supabase.from("subscriptions").update({
    tokens_used: (usage.tokens_used||0) + costUsd,
  }).eq("user_id",userId).eq("status","active");
}

async function dbCheckBudget(userId) {
  var usage = await dbGetUsage(userId);
  if(!usage) return true;
  var resetDate = new Date(usage.tokens_reset_date);
  var now = new Date();
  if(now > resetDate) return true;
  var totalLimit = (usage.tokens_limit||3) + (usage.extra_credits||0);
  return (usage.tokens_used||0) < totalLimit;
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

const C = {
  bg:"#f0efea", surf:"#ffffff", card:"#ffffff", border:"#d4cfc6",
  accent:"#0d9488", accentBg:"#e6f7f5",
  text:"#111110", textMuted:"#555550", textDim:"#888880",
  blue:"#1d4ed8", green:"#059669", purple:"#7c3aed", red:"#dc2626",
};
const inp = {background:"#fff",border:"1px solid #d4cfc6",borderRadius:4,padding:"9px 13px",color:C.text,fontSize:14,width:"100%",outline:"none",fontFamily:"Quicksand,sans-serif"};
const sel = {background:"#fff",border:"1px solid #d4cfc6",borderRadius:4,padding:"9px 13px",color:C.text,fontSize:13,outline:"none",fontFamily:"Quicksand,sans-serif"};
const lbl = {fontSize:11,color:C.textMuted,marginBottom:5,display:"block",fontWeight:600,letterSpacing:.5};
const card = {background:"#fff",border:"1px solid #d4cfc6",borderRadius:4,padding:"18px 20px",marginBottom:16};
function PricingPanel({authUser}) {
  var [loading,setLoading]=useState(null);
  var [error,setError]=useState("");
  var [consultModal,setConsultModal]=useState(false);
  var [consultPlan,setConsultPlan]=useState("");
  var [consultForm,setConsultForm]=useState({nombre:"",cargo:"",colegio:"",telefono:"",email:"",docentes:""});
  var [consultLoading,setConsultLoading]=useState(false);
  var [consultSent,setConsultSent]=useState(false);
  var plans=[
    {id:"e62d30a047a8442581b2a5b94b470577",name:"Docente",price:"$12.000",period:"por mes",users:1,color:C.blue,features:["Generador IA (8 tipos)","Multimedia + Imagenes","Chat Docente","Corrector de TPs","Exportacion Word y PDF","Biblioteca personal"]},
    {id:"d1ee77dd48f44b0f98d8b3ca1baa774e",name:"Directivo",price:"$16.000",period:"por mes",users:1,color:C.accent,features:["Todo lo del plan Docente","Panel de Directivos","Comunicados y Actas","Correccion de informes","Grabacion y transcripcion de reuniones"]},
    {id:"institucional_basico",name:"Institucional Basico",price:"Consultar",period:"segun cantidad de docentes",users:10,color:C.green,institutional:true,features:["Hasta 10 docentes","Biblioteca publica compartida","Panel admin institucional","Soporte dedicado"]},
    {id:"institucional_consulta",name:"Institucional A Medida",price:"Consultar",period:"segun cantidad de docentes",users:999,color:C.purple,institutional:true,features:["Mas de 10 docentes","Todo Institucional Basico","Precio segun cantidad","Soporte dedicado"]},
  ];
  async function subscribe(plan) {
    if(!authUser){setError("Tenes que iniciar sesion para suscribirte.");return;}
    if(plan.institutional){
      setConsultPlan(plan.name);
      setConsultForm({nombre:(authUser.user_metadata&&authUser.user_metadata.name)||"",cargo:"",colegio:(authUser.user_metadata&&authUser.user_metadata.school)||"",telefono:"",email:authUser.email||"",docentes:""});
      setConsultSent(false);
      setConsultModal(true);
      return;
    }
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
        <p style={{color:C.textMuted,fontSize:15}}>ElegÃ­ el plan que mejor se adapta a tus necesidades</p>
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
                {loading===plan.id?"Procesando...":plan.institutional?"Consultar":"Suscribirme"}
              </button>
            </div>
          );
        })}
      </div>
      <p style={{textAlign:"center",color:C.textDim,fontSize:12,marginTop:24}}>Pagos procesados por MercadoPago</p>
      {consultModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999}}>
          <div style={{background:C.surf,border:"1px solid "+C.border,borderRadius:4,padding:26,width:500,maxWidth:"92vw",maxHeight:"90vh",overflow:"auto"}}>
            {consultSent?(
              <div style={{textAlign:"center",padding:"32px 0"}}>
                <i className="ti ti-check" style={{fontSize:52,color:C.green,display:"block",marginBottom:16}}/>
                <h2 style={{fontSize:20,fontWeight:700,color:C.text,marginBottom:8}}>Consulta enviada</h2>
                <p style={{fontSize:14,color:C.textMuted,marginBottom:24}}>Nos contactaremos a la brevedad al email indicado.</p>
                <Btn onClick={function(){setConsultModal(false);}}>Cerrar</Btn>
              </div>
            ):(
              <div>
                <h2 style={{margin:"0 0 6px",fontSize:18,fontWeight:700,color:C.text}}>{"Consulta â€” "+consultPlan}</h2>
                <p style={{fontSize:13,color:C.textMuted,marginBottom:20}}>CompletÃ¡ el formulario y te contactamos a la brevedad.</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <label style={lbl}>NOMBRE *</label>
                    <input style={inp} value={consultForm.nombre} onChange={function(e){setConsultForm(Object.assign({},consultForm,{nombre:e.target.value}));}} placeholder="Prof. GarcÃ­a"/>
                  </div>
                  <div>
                    <label style={lbl}>CARGO *</label>
                    <input style={inp} value={consultForm.cargo} onChange={function(e){setConsultForm(Object.assign({},consultForm,{cargo:e.target.value}));}} placeholder="Director/Docente/Coordinador"/>
                  </div>
                </div>
                <div style={{marginBottom:12}}>
                  <label style={lbl}>COLEGIO *</label>
                  <input style={inp} value={consultForm.colegio} onChange={function(e){setConsultForm(Object.assign({},consultForm,{colegio:e.target.value}));}} placeholder="Nombre del colegio"/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <label style={lbl}>EMAIL *</label>
                    <input style={inp} type="email" value={consultForm.email} onChange={function(e){setConsultForm(Object.assign({},consultForm,{email:e.target.value}));}} placeholder="email@colegio.edu.ar"/>
                  </div>
                  <div>
                    <label style={lbl}>TELEFONO</label>
                    <input style={inp} value={consultForm.telefono} onChange={function(e){setConsultForm(Object.assign({},consultForm,{telefono:e.target.value}));}} placeholder="+54 11 1234-5678"/>
                  </div>
                </div>
                <div style={{marginBottom:20}}>
                  <label style={lbl}>CANTIDAD DE DOCENTES *</label>
                  <input style={inp} type="number" value={consultForm.docentes} onChange={function(e){setConsultForm(Object.assign({},consultForm,{docentes:e.target.value}));}} placeholder="Ej: 15"/>
                </div>
                <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
                  <Btn v="ghost" onClick={function(){setConsultModal(false);}}>Cancelar</Btn>
                  <Btn disabled={consultLoading||!consultForm.nombre||!consultForm.cargo||!consultForm.colegio||!consultForm.email||!consultForm.docentes} onClick={async function(){
                    setConsultLoading(true);
                    try{
                      var res=await fetch("/api/send-consult",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan:consultPlan,...consultForm})});
                      if(!res.ok) throw new Error("Error al enviar");
                      setConsultSent(true);
                    }catch(e){alert("Error: "+e.message);}
                    setConsultLoading(false);
                  }}>
                    {consultLoading?"Enviando...":<><i className="ti ti-send" style={{fontSize:13,marginRight:4}}/>Enviar consulta</>}
                  </Btn>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminPanel({authUser,supabaseClient}) {
  var isAdmin=authUser&&authUser.email===import.meta.env.VITE_ADMIN_EMAIL;
  var [stats,setStats]=useState(null);
  var [statsLoading,setStatsLoading]=useState(true);
  var [instName,setInstName]=useState("");
  var [instMaxUsers,setInstMaxUsers]=useState(10);
  var [instDays,setInstDays]=useState(30);
  var [instFile,setInstFile]=useState(null);
  var [instLoading,setInstLoading]=useState(false);
  var [instResult,setInstResult]=useState(null);
  var [institutions,setInstitutions]=useState([]);
  var [selectedInst,setSelectedInst]=useState("");
  var [instUsers,setInstUsers]=useState([]);
  var [instUsersLoading,setInstUsersLoading]=useState(false);
  var [pilotUsers,setPilotUsers]=useState([]);
  var [pilotLoading,setPilotLoading]=useState(false);
  var [extendDays,setExtendDays]=useState(30);
  var [extendLoading,setExtendLoading]=useState(null);
  var [singleEmail,setSingleEmail]=useState("");
  var [singleName,setSingleName]=useState("");
  var [singleDays,setSingleDays]=useState(30);
  var [singleRole,setSingleRole]=useState("docente");
  var [roleEmail,setRoleEmail]=useState("");
  var [roleValue,setRoleValue]=useState("directivo");
  var [roleLoading,setRoleLoading]=useState(false);
  var [roleResult,setRoleResult]=useState(null);
  var [singleLoading,setSingleLoading]=useState(false);
  var [singleResult,setSingleResult]=useState(null);

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

  async function addSingleUser() {
    if(!singleEmail.trim()) return;
    setSingleLoading(true);setSingleResult(null);
    try {
      var res=await fetch("/api/invite-users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        users:[{email:singleEmail.trim(),name:singleName.trim()}],
        institution_name:"Piloto individual",
        plan_id:"bcdbe285413b4acbbd187fc2fe6d52dc",
        max_users:1,
        days:singleDays,
        role:singleRole
      })});
      var data=await res.json();
      setSingleResult(data);
      if(!data.error) {setSingleEmail("");setSingleName("");}
    } catch(e){setSingleResult({error:e.message});}
    setSingleLoading(false);
  }
  async function cambiarRol() {
    if(!roleEmail.trim()) return;
    setRoleLoading(true);setRoleResult(null);
    try {
      var res=await fetch("/api/cambiar-rol",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:roleEmail.trim(),role:roleValue})});
      var data=await res.json();
      setRoleResult(data);
      if(!data.error) setRoleEmail("");
    } catch(e){setRoleResult({error:e.message});}
    setRoleLoading(false);
  }
  async function loadPilotUsers() {
    setPilotLoading(true);
    try {
      var res = await fetch("/api/get-pilot-users", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPilotUsers(data.users || []);
    } catch(e) { alert("Error: "+e.message); }
    setPilotLoading(false);
  }

  async function extendUser(userId, days) {
    setExtendLoading(userId);
    try {
      var subResult = await supabaseClient
        .from("subscriptions")
        .select("current_period_end")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("current_period_end", {ascending: false})
        .limit(1);

      if (!subResult.data || subResult.data.length === 0) {
        alert("No se encontro suscripcion activa para este usuario.");
        setExtendLoading(null);
        return;
      }

      var currentEnd = new Date(subResult.data[0].current_period_end);
      var now = new Date();
      var base = currentEnd > now ? currentEnd : now;
      var newEnd = new Date(base);
      newEnd.setDate(newEnd.getDate() + days);

      await supabaseClient
        .from("subscriptions")
        .update({ current_period_end: newEnd.toISOString() })
        .eq("user_id", userId)
        .eq("status", "active");

      setPilotUsers(function(prev) {
        return prev.map(function(u) {
          if(u.user_id !== userId) return u;
          var daysLeft = Math.ceil((newEnd - new Date()) / (1000*60*60*24));
          return Object.assign({}, u, { days_left: daysLeft, period_end: newEnd.toISOString() });
        });
      });
    } catch(e) { alert("Error: "+e.message); }
    setExtendLoading(null);
  }
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
      var res=await fetch("/api/invite-users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({users,institution_name:instName,plan_id:"bcdbe285413b4acbbd187fc2fe6d52dc",max_users:instMaxUsers,days:instDays})});
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
  stats.forEach(function(s){if(!userMap[s.user_email])userMap[s.user_email]={email:s.user_email,gens:0,imgs:0,lastActivity:null};if(s.is_image)userMap[s.user_email].imgs++;else userMap[s.user_email].gens++;var d=new Date(s.created_at);if(!userMap[s.user_email].lastActivity||d>userMap[s.user_email].lastActivity)userMap[s.user_email].lastActivity=d;});
  var users=Object.values(userMap).sort(function(a,b){return(b.gens+b.imgs)-(a.gens+a.imgs);});
  var usersByActivity=Object.values(userMap).slice().sort(function(a,b){return (a.lastActivity?a.lastActivity.getTime():0)-(b.lastActivity?b.lastActivity.getTime():0);});
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
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:15,fontWeight:700,color:C.text,display:"flex",alignItems:"center",gap:8}}>
            <i className="ti ti-users" style={{fontSize:16,color:C.accent}}/>Usuarios del Piloto
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <select style={Object.assign({},sel)} value={extendDays} onChange={function(e){setExtendDays(parseInt(e.target.value));}}>
              {[7,15,30,60,90].map(function(d){return <option key={d} value={d}>+{d} dias</option>;})}
            </select>
            <Btn v="secondary" st={{fontSize:12,padding:"5px 14px"}} onClick={loadPilotUsers} disabled={pilotLoading}>
              {pilotLoading?"Cargando...":<><i className="ti ti-refresh" style={{fontSize:13,marginRight:4}}/>Actualizar</>}
            </Btn>
          </div>
        </div>
        {!pilotUsers.length?(
          <div style={{textAlign:"center",padding:"24px 0",color:C.textDim,fontSize:13}}>
            Hace clic en Actualizar para ver los usuarios activos.
          </div>
        ):(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{borderBottom:"1px solid "+C.border}}>
                  {["Email","Institucion","Dias restantes","Vence",""].map(function(h){
                    return <th key={h} style={{textAlign:"left",padding:"6px 10px",color:C.textMuted,fontWeight:600}}>{h}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {pilotUsers.map(function(u){
                  var clr = u.days_left<=3?C.red:u.days_left<=7?C.accent:C.green;
                  return (
                    <tr key={u.user_id} style={{borderBottom:"1px solid "+C.bg}}>
                      <td style={{padding:"8px 10px",color:C.text}}>{u.email}</td>
                      <td style={{padding:"8px 10px",color:C.textDim}}>{u.institution||"â€”"}</td>
                      <td style={{padding:"8px 10px"}}>
                        <span style={{fontWeight:700,color:clr}}>{u.days_left>0?u.days_left+" dias":"Vencido"}</span>
                      </td>
                      <td style={{padding:"8px 10px",color:C.textDim}}>{new Date(u.period_end).toLocaleDateString("es-AR")}</td>
                      <td style={{padding:"8px 10px"}}>
                        <Btn v="sm" disabled={extendLoading===u.user_id} onClick={function(){extendUser(u.user_id,extendDays);}}>
                          {extendLoading===u.user_id?"...":<><i className="ti ti-clock-plus" style={{fontSize:12,marginRight:3}}/>Extender</>}
                        </Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={Object.assign({},card,{marginBottom:16})}>
        <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
          <i className="ti ti-user-plus" style={{fontSize:16,color:C.accent}}/>Agregar Usuario Individual
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div>
            <label style={lbl}>EMAIL *</label>
            <input style={inp} value={singleEmail} onChange={function(e){setSingleEmail(e.target.value);}} placeholder="docente@escuela.edu.ar"/>
          </div>
          <div>
            <label style={lbl}>NOMBRE</label>
            <input style={inp} value={singleName} onChange={function(e){setSingleName(e.target.value);}} placeholder="Prof. Garcia"/>
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <label style={lbl}>DURACION</label>
          <div style={{display:"flex",gap:6}}>
            {[7,15,30,60,90].map(function(d){
              return (
                <button key={d} style={{flex:1,padding:"7px 0",borderRadius:4,border:"1px solid "+(singleDays===d?C.accent:C.border),background:singleDays===d?C.accentBg:"transparent",color:singleDays===d?C.accent:C.textMuted,cursor:"pointer",fontWeight:600,fontSize:12,fontFamily:"Quicksand,sans-serif"}} onClick={function(){setSingleDays(d);}}>
                  {d}d
                </button>
              );
            })}
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <label style={lbl}>ROL</label>
          <div style={{display:"flex",gap:6}}>
            {[{id:"docente",label:"Docente"},{id:"directivo",label:"Directivo"}].map(function(r){
              return (
                <button key={r.id} style={{flex:1,padding:"7px 0",borderRadius:4,border:"1px solid "+(singleRole===r.id?C.accent:C.border),background:singleRole===r.id?C.accentBg:"transparent",color:singleRole===r.id?C.accent:C.textMuted,cursor:"pointer",fontWeight:600,fontSize:12,fontFamily:"Quicksand,sans-serif"}} onClick={function(){setSingleRole(r.id);}}>
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
        <Btn disabled={singleLoading||!singleEmail.trim()} onClick={addSingleUser}>
          {singleLoading?"Procesando...":<><i className="ti ti-user-plus" style={{fontSize:13,marginRight:4}}/>Agregar usuario</>}
        </Btn>
        {singleResult&&(
          <div style={{marginTop:12,padding:"10px 14px",background:C.bg,borderRadius:4,fontSize:13,border:"1px solid "+C.border}}>
            {singleResult.error
              ?<span style={{color:C.red}}>Error: {singleResult.error}</span>
               :<div>
                <div style={{color:C.green,marginBottom:4}}>
  {singleResult.created>0?"Usuario invitado correctamente. Se envio un email para que active su cuenta.":singleResult.already_exists>0?"El usuario ya tenia cuenta. Suscripcion actualizada correctamente.":"Proceso completado. Si el email es valido el usuario recibira la invitacion."}
</div>
                {singleResult.details&&singleResult.details.failed&&singleResult.details.failed.length>0&&(
                  <div style={{color:C.red,fontSize:12}}>{singleResult.details.failed.map(function(f){return f.email+": "+f.error;}).join(", ")}</div>
                )}
              </div>
            }
          </div>
        )}
      </div>
      <div style={Object.assign({},card,{marginBottom:16})}>
        <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
          <i className="ti ti-user-cog" style={{fontSize:16,color:C.accent}}/>Cambiar Rol de Usuario
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 160px",gap:12,marginBottom:12}}>
          <div>
            <label style={lbl}>EMAIL DEL USUARIO *</label>
            <input style={inp} value={roleEmail} onChange={function(e){setRoleEmail(e.target.value);}} placeholder="usuario@escuela.edu.ar"/>
          </div>
          <div>
            <label style={lbl}>NUEVO ROL</label>
            <select style={Object.assign({},sel,{width:"100%"})} value={roleValue} onChange={function(e){setRoleValue(e.target.value);}}>
              <option value="directivo">Directivo</option>
              <option value="docente">Docente</option>
            </select>
          </div>
        </div>
        <Btn disabled={roleLoading||!roleEmail.trim()} onClick={cambiarRol}>
          {roleLoading?"Aplicando...":<><i className="ti ti-user-cog" style={{fontSize:13,marginRight:4}}/>Cambiar rol</>}
        </Btn>
        {roleResult&&(
          <div style={{marginTop:12,padding:"10px 14px",background:C.bg,borderRadius:4,fontSize:13,border:"1px solid "+C.border}}>
            {roleResult.error
              ?<span style={{color:C.red}}>Error: {roleResult.error}</span>
              :<span style={{color:C.green}}>{"Rol actualizado a "+roleResult.role+". El usuario debe cerrar sesiÃ³n y volver a entrar para que tome efecto."}</span>
            }
          </div>
        )}
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
          <div>
            <label style={lbl}>DURACION (dias)</label>
            <select style={Object.assign({},sel,{width:"100%"})} value={instDays} onChange={function(e){setInstDays(parseInt(e.target.value));}}>
              <option value={30}>30 dias (piloto)</option>
              <option value={60}>60 dias</option>
              <option value={90}>90 dias</option>
              <option value={180}>6 meses</option>
              <option value={365}>1 aÃ±o</option>
            </select>
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
      <div style={Object.assign({},card,{marginBottom:16})}>
        <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:4,display:"flex",alignItems:"center",gap:8}}>
          <i className="ti ti-activity" style={{fontSize:16,color:C.accent}}/>Retencion de usuarios
        </div>
        <p style={{fontSize:12,color:C.textDim,marginBottom:14}}>Ordenados por inactividad. Los usuarios sin actividad reciente aparecen primero.</p>
        {!usersByActivity.length?(
          <p style={{color:C.textDim,fontSize:13}}>Sin datos aun.</p>
        ):(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{borderBottom:"1px solid "+C.border}}>
                  {["Usuario","Ultima actividad","Dias inactivo","Estado"].map(function(h){
                    return <th key={h} style={{textAlign:"left",padding:"6px 10px",color:C.textMuted,fontWeight:600}}>{h}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {usersByActivity.map(function(u){
                  var daysInactive=u.lastActivity?Math.floor((new Date()-u.lastActivity)/(1000*60*60*24)):null;
                  var clr=daysInactive===null?C.textDim:daysInactive>7?C.red:daysInactive>3?C.blue:C.green;
                  var estado=daysInactive===null?"Sin actividad":daysInactive>7?"Inactivo":daysInactive>3?"En riesgo":"Activo";
                  return (
                    <tr key={u.email} style={{borderBottom:"1px solid "+C.bg}}>
                      <td style={{padding:"8px 10px",color:C.text}}>{u.email.split("@")[0]}</td>
                      <td style={{padding:"8px 10px",color:C.textDim}}>{u.lastActivity?u.lastActivity.toLocaleDateString("es-AR"):"â€”"}</td>
                      <td style={{padding:"8px 10px",color:clr,fontWeight:700}}>{daysInactive===null?"â€”":daysInactive+" dias"}</td>
                      <td style={{padding:"8px 10px"}}><span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:clr+"22",color:clr}}>{estado}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                      <td style={{padding:"6px 10px",color:C.textDim}}>{s.subject_name||"â€”"}</td>
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
  var [school,setSchool]=useState("");
  var [role,setRole]=useState("docente");
  var [schoolSuggestions,setSchoolSuggestions]=useState([]);
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
    var result=await supabase.auth.signUp({email,password,options:{data:{name,school:school||"",role}}});
    if(result.error){setError(result.error.message);}
    else{
      if(school) dbAddOrUpdateSchool(school,"").catch(function(){});
      if(result.data.session){onAuth(result.data.user);}
      else{setConfirmed(true);}
    }
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
              <label style={lbl}>SOY</label>
              <div style={{display:"flex",gap:8,marginBottom:12}}>
                {[{id:"docente",label:"Docente"},{id:"directivo",label:"Directivo"}].map(function(r){
                  return <button key={r.id} type="button" style={{flex:1,padding:"9px 0",borderRadius:4,border:"1px solid "+(role===r.id?C.accent:C.border),background:role===r.id?C.accentBg:"transparent",color:role===r.id?C.accent:C.textMuted,cursor:"pointer",fontWeight:role===r.id?700:400,fontSize:13,fontFamily:"Quicksand,sans-serif"}} onClick={function(){setRole(r.id);}}>{r.label}</button>;
                })}
              </div>
              <label style={lbl}>NOMBRE</label>
              <input style={Object.assign({},inp,{marginBottom:12})} value={name} onChange={function(e){setName(e.target.value);}} placeholder="Prof. Garcia"/>
              <label style={lbl}>COLEGIO (opcional)</label>
              <div style={{position:"relative",marginBottom:12}}>
                <input style={inp} value={school} onChange={async function(e){
                  setSchool(e.target.value);
                  if(e.target.value.length>=2){
                    var suggestions=await dbSearchSchools(e.target.value);
                    setSchoolSuggestions(suggestions);
                  } else {
                    setSchoolSuggestions([]);
                  }
                }} placeholder="Ej: Colegio San Martin"/>
                {schoolSuggestions.length>0&&(
                  <div style={{position:"absolute",top:"100%",left:0,right:0,background:C.surf,border:"1px solid "+C.border,borderRadius:4,zIndex:100,boxShadow:"0 4px 12px rgba(0,0,0,.1)"}}>
                    {schoolSuggestions.map(function(s){
                      return (
                        <div key={s.id} style={{padding:"9px 13px",cursor:"pointer",fontSize:13,color:C.text,borderBottom:"1px solid "+C.border}} onClick={function(){setSchool(s.name);setSchoolSuggestions([]);}}>
                          {s.name}{s.city?" â€” "+s.city:""}
                        </div>
                      );
                    })}
                    <div style={{padding:"8px 13px",cursor:"pointer",fontSize:12,color:C.textDim}} onClick={function(){setSchoolSuggestions([]);}}>
                      Usar "{school}" como nuevo colegio
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <label style={lbl}>EMAIL</label>
          <input style={Object.assign({},inp,{marginBottom:12})} type="email" value={email} onChange={function(e){setEmail(e.target.value);}} placeholder="docente@escuela.edu.ar"/>
          <label style={lbl}>CONTRASENA</label>
          <input style={Object.assign({},inp,{marginBottom:20})} type="password" value={password} onChange={function(e){setPass(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter") mode==="login"?handleLogin():handleRegister();}} placeholder="Minimo 6 caracteres"/>
          {error&&<div style={{color:C.red,fontSize:13,background:"#fee2e2",padding:"9px 13px",borderRadius:4,marginBottom:14}}>{error}</div>}
          {mode==="login"&&(
            <div style={{textAlign:"right",marginBottom:14}}>
              <button style={{background:"transparent",border:"none",cursor:"pointer",color:C.accent,fontSize:12,fontFamily:"Quicksand,sans-serif",fontWeight:600}} onClick={async function(){
                if(!email){setError("Ingresa tu email primero.");return;}
                setLoading(true);
                var result=await supabase.auth.resetPasswordForEmail(email,{redirectTo:"https://app.aulaxpro.com/"});
                if(result.error){setError(result.error.message);}
                else{setError("");alert("Te enviamos un email para restablecer tu contrasena. Revisa tu bandeja.");}
                setLoading(false);
              }}>Olvidaste tu contrasena?</button>
            </div>
          )}
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
  var [verComoDocente,setVerComoDocente]=useState(false);
  var [adminVerDirectivos,setAdminVerDirectivos]=useState(false);
  var [bar,setBar]=useState(true);
  var [mobileMenu,setMobileMenu]=useState(false);
  var [subjModal,setSubjModal]=useState(false);
  var [sf,setSf]=useState({name:"",level:"Secundaria (ciclo superior)",materials:"",bibliography:""});
  var [sfPdfs,setSfPdfs]=useState([]);
  var [pdfLoading,setPdfLoading]=useState(false);
  var [pdfStage,setPdfStage]=useState("");
  var [editingSubject,setEditingSubject]=useState(null);
  var [library,setLibrary]=useState([]);
  var [bank,setBank]=useState([]);
  var [publicLib,setPublicLib]=useState([]);
  var [sequences,setSequences]=useState([]);
  var [dataLoading,setDataLoading]=useState(false);
  var [subscription,setSubscription]=useState(null);
  var [subChecked,setSubChecked]=useState(false);
  var [usage,setUsage]=useState(null);
  var [budgetExceeded,setBudgetExceeded]=useState(false);
  var [showResetPassword,setShowResetPassword]=useState(false);
  var [needsPassword,setNeedsPassword]=useState(false);
  var [newPassword,setNewPassword]=useState("");
  var [resetLoading,setResetLoading]=useState(false);
  var [resetDone,setResetDone]=useState(false);
  var [notifications,setNotifications]=useState([]);
  var [showNotifications,setShowNotifications]=useState(false);
  var [genType,setGenType]=useState("planclase");
  var [genTopic,setGenTopic]=useState("");
  var [genLevel,setGenLevel]=useState("Secundaria (ciclo superior)");
  useEffect(function(){
    var m=subjects.find(function(s){return s.id===curSid;});
    if(m&&m.level) setGenLevel(m.level);
  },[curSid]);
  var [genDiff,setGenDiff]=useState("Intermedio");
  var [genExtra,setGenExtra]=useState("");
  var [genResult,setGenResult]=useState("");
  var [genLoading,setGenLoading]=useState(false);
  var [genSaved,setGenSaved]=useState(false);
  var [genErr,setGenErr]=useState("");
  var [genDocText,setGenDocText]=useState("");
  var [genDocName,setGenDocName]=useState("");
  var [genDocLoading,setGenDocLoading]=useState(false);
  var [makeCodeUrl,setMakeCodeUrl]=useState(null);
  var [actImgUrl,setActImgUrl]=useState(null);
  var [actImgLoad,setActImgLoad]=useState(false);
  var [actImgErr,setActImgErr]=useState("");
  var [actImgBase64,setActImgBase64]=useState(null);
  var [diffResult,setDiffResult]=useState("");
  var [diffLoading,setDiffLoading]=useState(false);
  var [questionItems,setQuestionItems]=useState([]);
  var [qiLoading,setQiLoading]=useState(false);
  var [qiFilter,setQiFilter]=useState("all");
  var [qiSelected,setQiSelected]=useState([]);
  var [qiExamLoading,setQiExamLoading]=useState(false);
  var [qiExamResult,setQiExamResult]=useState("");
  var [projects,setProjects]=useState({owned:[],shared:[]});
  var [currentProject,setCurrentProject]=useState(null);
  var [projectContents,setProjectContents]=useState([]);
  var [projectModal,setProjectModal]=useState(false);
  var [projectForm,setProjectForm]=useState({title:"",description:"",subjects:["","",""],emails:["","",""]});
  var [projectLoading,setProjectLoading]=useState(false);
  var [projectGenLoading,setProjectGenLoading]=useState(false);
  var [projectGenResult,setProjectGenResult]=useState("");
  var [inviteEmail,setInviteEmail]=useState("");
  var [inviteSubject,setInviteSubject]=useState("");
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
  var [chatSessions,setChatSessions]=useState([]);
  var [currentSessionId,setCurrentSessionId]=useState(null);
  var [chatDocText,setChatDocText]=useState("");
  var [chatDocName,setChatDocName]=useState("");
  var [chatDocLoading,setChatDocLoading]=useState(false);
  var [chatDocPaste,setChatDocPaste]=useState(false);
  var [chatSessionsLoading,setChatSessionsLoading]=useState(false);
  var chatRef=useRef(null);
  var [corrR,setCorrR]=useState("");
  var [corrW,setCorrW]=useState("");
  var [corrResult,setCorrResult]=useState("");
  var [corrLoading,setCorrLoading]=useState(false);
  var [corrRigor,setCorrRigor]=useState("equilibrado");
  var [imgExtractLoading,setImgExtractLoading]=useState(false);
  var [corrHojas,setCorrHojas]=useState(0);
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
  var [seqStream,setSeqStream]=useState("");
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
  var { activeTour, launchTour, closeTour, nextStep, prevStep } = useTour(authUser ? authUser.id : null, view);
  useEffect(function(){
    _currentUser.id = authUser ? authUser.id : null;
    _currentUser.isAdmin = authUser ? (authUser.email===import.meta.env.VITE_ADMIN_EMAIL) : false;
  },[authUser]);

  useEffect(function(){
    supabase.auth.getSession().then(function(result){var u=result.data.session?result.data.session.user:null;setAuthUser(u);setAuthLoading(false);if(u&&u.user_metadata&&u.user_metadata.needs_password) setNeedsPassword(true);var params=new URLSearchParams(window.location.search);if(params.get("section")==="pricing") setView("pricing");});
    var sub=supabase.auth.onAuthStateChange(function(event,session){
      setAuthUser(session?session.user:null);
      if(event==="PASSWORD_RECOVERY") setShowResetPassword(true);
      if(session && session.user && session.user.user_metadata && session.user.user_metadata.needs_password) setNeedsPassword(true);
    });
    return function(){sub.data.subscription.unsubscribe();};
  },[]);

useEffect(function(){
    if(!authUser) return;
    setDataLoading(true);
    Promise.all([dbLoadSubjects(authUser.id),dbLoadLibrary(authUser.id),dbLoadBank(authUser.id),dbLoadPublicLib(),dbLoadSequences(authUser.id),dbLoadQuestionItems(authUser.id),dbLoadProjects(authUser.id)])
      .then(function(results){
        setSubjects(results[0]);setLibrary(results[1]);setBank(results[2]);setPublicLib(results[3]);setSequences(results[4]);setQuestionItems(results[5]);setProjects(results[6]);
        if(results[0].length) setCurSid(results[0][0].id);
        setDataLoading(false);
        dbLoadNotifications(authUser.id).then(setNotifications);
        dbCheckSubscription(authUser.id).then(function(sub){
          if(!sub){
            dbCreateTrial(authUser.id).then(function(){
              dbCheckSubscription(authUser.id).then(function(ns){
                setSubscription(ns);setSubChecked(true);
                dbGetUsage(authUser.id).then(function(u){setUsage(u);});
              });
            });
            var userName=(authUser.user_metadata&&authUser.user_metadata.name)||"";
            fetch("/api/send-welcome",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:authUser.email,name:userName})}).catch(function(){});
          }
          else{setSubscription(sub);setSubChecked(true);dbGetUsage(authUser.id).then(function(u){setUsage(u);});}
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
  useEffect(function(){
    if(!authUser||!authUser.id||view!=="chat") return;
    setChatSessionsLoading(true);
    dbLoadChatSessions(authUser.id).then(function(sessions){
      setChatSessions(sessions);
      setChatSessionsLoading(false);
      if(sessions.length>0&&!currentSessionId){
        var latest=sessions[0];
        setCurrentSessionId(latest.id);
        dbLoadChatHistory(authUser.id,100,latest.id).then(function(history){
          setChatMsgs(history.map(function(m){return{role:m.role,content:m.content};}));
        });
      }
    });
  },[authUser,view]);
  async function signOut(){
    await supabase.auth.signOut();
    setSubjects([]);setLibrary([]);setBank([]);setPublicLib([]);setSequences([]);setCurSid(null);setView("dashboard");
  }

 async function processPdf(file, onStage) {
    if (onStage) onStage("Subiendo archivo...");
    // 1. Subir el archivo a Supabase Storage
    var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    var path = "pdfs/" + Date.now() + "_" + safeName;

    var uploadRes = await supabase.storage.from("documentos").upload(path, file, {
      contentType: file.type || "application/pdf",
      upsert: false,
    });
    if (uploadRes.error) throw new Error("Error al subir el archivo: " + uploadRes.error.message);

    // 2. Obtener la URL pÃºblica
    var urlData = supabase.storage.from("documentos").getPublicUrl(path);
    var publicUrl = urlData.data.publicUrl;

    if (onStage) onStage("Leyendo el documento...");
    // 3. Llamar al endpoint con la URL, leyendo la respuesta por streaming
    var res = await fetch("/api/process-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: publicUrl, filename: file.name }),
    });
    if (!res.ok) {
      var errData = {};
      try { errData = await res.json(); } catch(e) {}
      throw new Error(errData.error || "Error procesando el PDF");
    }

    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var fullText = "";
    while (true) {
      var result = await reader.read();
      if (result.done) break;
      var chunk = decoder.decode(result.value, { stream: true });
      var lines = chunk.split("\n");
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (!line.startsWith("data: ")) continue;
        var data2 = line.slice(6);
        if (data2 === "[DONE]") break;
        try {
          var parsed = JSON.parse(data2);
          if (parsed.text) {
            if (fullText === "" && onStage) onStage("Extrayendo contenido...");
            fullText += parsed.text;
          }
          if (parsed.error) throw new Error(parsed.error);
        } catch(e) {}
      }
    }

    return { text: fullText, filename: file.name, chars: fullText.length };
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
    setSf({name:"",level:"Secundaria (ciclo superior)",materials:"",bibliography:""});
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

  async function extractQuestionsFromBank(bankItem) {
    if(!authUser) return;
    setQiLoading(true);
    try {
      var sys="Sos experto en evaluacion educativa. Responde SOLO con JSON valido, sin texto adicional.";
      var usr="Extrae todas las preguntas de esta evaluacion y devuelve un JSON array con este formato exacto:\n[\n  {\n    \"topic\": \"tema de la pregunta\",\n    \"type\": \"multiple|verdadero_falso|desarrollo|completar\",\n    \"difficulty\": \"Basico|Intermedio|Avanzado\",\n    \"question\": \"texto completo de la pregunta\",\n    \"answer\": \"respuesta correcta\",\n    \"options\": [\"opcion1\",\"opcion2\",\"opcion3\",\"opcion4\"]\n  }\n]\n\nEVALUACION:\n"+bankItem.content.slice(0,4000);
      var r=await callClaude(sys,[{role:"user",content:usr}],3000);
      var clean=r.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
      var questions=JSON.parse(clean);
      for(var i=0;i<questions.length;i++){
        var q=questions[i];
        await dbAddQuestionItem(authUser.id,{
          bank_id:bankItem.id,
          subject_name:bankItem.subject_name||"",
          topic:q.topic||bankItem.topic,
          type:q.type||"multiple",
          difficulty:q.difficulty||"Intermedio",
          question:(q.question||"").replace(/\$\$[\s\S]*?\$\$/g,"").replace(/\\boxed\{[^}]*\}/g,"").replace(/\\textbf\{([^}]*)\}/g,"$1").replace(/\\qquad/g," ").trim(),
          answer:(q.answer||"").replace(/\$\$[\s\S]*?\$\$/g,"").replace(/\\boxed\{[^}]*\}/g,"").replace(/\\textbf\{([^}]*)\}/g,"$1").trim(),
          options:JSON.stringify(q.options||[]),
        });
      }
      var updated=await dbLoadQuestionItems(authUser.id);
      setQuestionItems(updated);
      alert(questions.length+" preguntas extraidas y guardadas.");
    }catch(e){alert("Error: "+e.message);}
    setQiLoading(false);
  }

  async function buildExam() {
    if(!qiSelected.length) return;
    setQiExamLoading(true);setQiExamResult("");
    try{
      var selected=questionItems.filter(function(q){return qiSelected.includes(q.id);});
      var sys="Sos experto en evaluacion educativa. Responde en espanol rioplatense con Markdown.";
      var questionsText=selected.sort(function(a,b){return a.type.localeCompare(b.type);}).map(function(q,i){
        var opts=[];
        try{opts=JSON.parse(q.options||"[]");}catch{}
        return (i+1)+". ["+q.type.toUpperCase()+"] "+q.question+(opts.length?"\n"+opts.map(function(o,j){return String.fromCharCode(65+j)+") "+o;}).join("\n"):"")+(q.answer?"\nRespuesta: "+q.answer:"");
      }).join("\n\n");
      var usr="Arma una evaluacion formal. NO inventes nombre de institucion ni docente. Usa este titulo y encabezado exacto:\n\n# Evaluacion de "+(curSubj?curSubj.name:"Materia")+"\n\n**Institucion:** ___________________________\n\n**Alumno/a:** ___________________________ **Curso:** ____________\n\n**Fecha:** ____________ **Calificacion:** ____________\n\n---\n\nLuego instrucciones por seccion y preguntas organizadas por tipo. Para V/F usa: V ___ F ___ (sin tablas). Para multiple choice usa a) b) c) d) sin tablas. No uses emojis. Al final la clave de respuestas.\n\nPREGUNTAS:\n"+questionsText;
      var r=await callClaude(sys,[{role:"user",content:usr}],4000);
      setQiExamResult(r);
    }catch(e){setQiExamResult(msgError(e));}
    setQiExamLoading(false);
  }
  async function generateDiff() {
    if(!genResult||!curSubj) return;
    setDiffLoading(true);setDiffResult("");
    try{
      var sys="Sos especialista en diferenciacion pedagogica y educacion inclusiva. Responde en espanol rioplatense con Markdown.";
      var usr="A partir del siguiente contenido educativo, genera 3 versiones diferenciadas para distintos niveles de aprendizaje:\n\n## CONTENIDO ORIGINAL:\n"+genResult.slice(0,3000)+"\n\n## VERSIONES A GENERAR:\n\n### VERSION 1 â€” BASICA (alumnos con dificultades o que necesitan apoyo)\n- Lenguaje simple y directo\n- Pasos muy detallados y secuenciados\n- Menos cantidad de consignas\n- Vocabulario accesible con definiciones de terminos clave\n- Ejemplos concretos y cercanos a la vida cotidiana\n\n### VERSION 2 â€” ESTANDAR (nivel esperado para el curso)\n- Fiel al contenido original con leves adaptaciones\n- Consignas claras con nivel de desafio apropiado\n\n### VERSION 3 â€” AVANZADA (alumnos con altas capacidades)\n- Mayor nivel de complejidad y abstraccion\n- Consignas que exigen analisis, sintesis y evaluacion (verbos Bloom superiores)\n- Contenido ampliado con conexiones interdisciplinarias\n- Desafios adicionales y preguntas de extension\n\nGenera las 3 versiones completas y utilizables en el aula.";
      var r=await callClaude(sys,[{role:"user",content:usr}],6000);
      setDiffResult(r);
    }catch(e){setDiffResult(msgError(e));}
    setDiffLoading(false);
  }
  async function generate(){
    if(!genTopic.trim()||!curSubj) return;
    var esAdmin = authUser.email===import.meta.env.VITE_ADMIN_EMAIL;
    var hasBudget = esAdmin || await dbCheckBudget(authUser.id);
    if(!hasBudget){setBudgetExceeded(true);return;}
    setGenLoading(true);setGenResult("");setGenSaved(false);setGenErr("");setMakeCodeUrl(null);setActImgUrl(null);
    try{
      var sys=sysGen(genType,curSubj.name,genLevel,curSubj.materials,curSubj.bibliography);
      var usr=userGen(genType,genTopic,genDiff,genExtra,curSubj,genDocText);
      var maxTokPorTipo={ material:16000, guia:16000, planclase:12000, secuencia:14000, presentacion:12000, actividad:10000, evaluacion:16000, rubrica:6000, adaptado:12000 };
      var maxTok=maxTokPorTipo[genType]||10000;
      var r=await callClaude(sys,[{role:"user",content:usr}],maxTok,false,function(partial){
        setGenResult(partial);
      });
      setGenResult(r);
      var pidioMakeCode=(genTopic+" "+(genExtra||"")).toLowerCase();
      if(pidioMakeCode.includes("makecode")||pidioMakeCode.includes("micro:bit")||pidioMakeCode.includes("microbit")){
        setMakeCodeUrl(generateMakeCodeUrl(r));
      }else{
        setMakeCodeUrl(null);
      }
      var gt2=GEN_TYPES.find(function(g){return g.id===genType;});
      var tokIn=Math.round((sys.length+usr.length)/4);
      var tokOut=Math.round(r.length/4);
      var costUsd=(tokIn*0.000003)+(tokOut*0.000015);
      dbLogUsage(authUser.id,authUser.email,genType,gt2?gt2.label:genType,curSubj?curSubj.name:"",tokIn,tokOut,false);
      dbAddUsageCost(authUser.id,costUsd).then(function(){dbGetUsage(authUser.id).then(function(u){setUsage(u);});});
    }catch(e){setGenErr(msgError(e));}
    setGenLoading(false);
  }

  async function generateMM(){
    if(!mmTopic.trim()||!curSubj) return;
    setMmLoading(true);setMmResult("");
    try{
      var sys="Sos experto en contenido educativo digital para "+curSubj.name+" ("+curSubj.level+"). Responde en espanol rioplatense con Markdown.";
      var r=await callClaude(sys,[{role:"user",content:userMM(mmType,mmTopic,mmExtra)}],6000,false,function(partial){setMmResult(partial);});
      setMmResult(r);
    }catch(e){setMmResult(msgError(e));}
    setMmLoading(false);
  }

  async function callImgApi(description,subject,level){
  var res=await fetch("/api/generate-image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({description,subject,level})});
  if(!res.ok){var ej;try{ej=await res.json();}catch{throw new Error("Error del servidor.");}throw new Error(ej.error||"Error al generar imagen.");}
  var ct=res.headers.get("content-type")||"";
  var blob;
  if(ct.includes("image")){blob=await res.blob();}
  else{var jd=await res.json();var r2=await fetch(jd.url);blob=await r2.blob();}
  var base64=await new Promise(function(resolve){var reader=new FileReader();reader.onload=function(e){resolve(e.target.result);};reader.readAsDataURL(blob);});
  return {url:URL.createObjectURL(blob),base64};
}

  async function generateImage(){
    if(!mmTopic.trim()||!curSubj) return;
    setImgLoading(true);setImgUrl(null);setImgError("");
   try{var result=await callImgApi(mmTopic,curSubj.name,curSubj.level);setImgUrl(result.url);dbLogUsage(authUser.id,authUser.email,"imagen_ia","Imagen IA Multimedia",curSubj.name,300,0,true);dbAddUsageCost(authUser.id,0.07).then(function(){dbGetUsage(authUser.id).then(function(u){setUsage(u);});});}
    catch(e){setImgError("Error: "+e.message);}
    setImgLoading(false);
  }

  async function generateActivityImage(){
    if(!genResult||!curSubj) return;
    setActImgLoad(true);setActImgUrl(null);setActImgErr("");
    try{var desc=actImgDesc||("Educational illustration for: "+genTopic+". Subject: "+curSubj.name);var result=await callImgApi(desc,curSubj.name,genLevel);setActImgUrl(result.url);setActImgBase64(result.base64);dbLogUsage(authUser.id,authUser.email,"imagen","Imagen IA",curSubj.name,300,0,true);dbAddUsageCost(authUser.id,0.07).then(function(){dbGetUsage(authUser.id).then(function(u){setUsage(u);});});}
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
    if(!chatIn.trim()) return;
    var msg=chatIn.trim();setChatIn("");

    // Crear sesion si no existe
    var sessionId=currentSessionId;
    if(!sessionId){
      var session=await dbCreateChatSession(authUser.id,"Nueva conversacion");
      sessionId=session.id;
      setCurrentSessionId(sessionId);
      setChatSessions(function(prev){return [session].concat(prev);});
    }

    var hist=chatMsgs.concat([{role:"user",content:msg}]);
    setChatMsgs(hist);setChatLoading(true);
    dbSaveChatMessage(authUser.id,"user",msg,chatSid||curSid,sessionId);

    // Generar titulo automatico con el primer mensaje
    if(chatMsgs.length===0){
      callClaude("Genera un titulo corto de maximo 5 palabras para esta conversacion. Solo el titulo, sin puntos ni comillas.",[{role:"user",content:msg}],100,false)
        .then(function(title){
          dbUpdateSessionTitle(sessionId,title.trim().slice(0,60));
          setChatSessions(function(prev){return prev.map(function(s){return s.id===sessionId?Object.assign({},s,{title:title.trim().slice(0,60)}):s;});});
        }).catch(function(){});
    }

    var sys="Sos un asistente experto y versatil. Responde de forma natural y conversacional, sin usar emojis, sin markdown, sin asteriscos ni simbolos de formato. Texto plano solamente, como si fuera una conversacion normal. Podes responder cualquier tipo de pregunta."
      +(subj?" Contexto: el usuario es docente de \""+subj.name+"\" ("+subj.level+")."+(subj.materials?"\nPrograma: "+subj.materials:""):"")
      +(chatDocText?"\n\nEl usuario adjunto un documento para esta conversacion. Basa tus respuestas principalmente en el contenido de este documento cuando la pregunta se relacione con el. Si te preguntan algo que no esta en el documento, aclaralo. DOCUMENTO ADJUNTO (\""+chatDocName+"\"):\n"+chatDocText.slice(0,50000):"")
      +"\nResponde en espanol rioplatense. Cuando necesites informacion actualizada usa la busqueda web.";
    try{
      setChatMsgs(hist.concat([{role:"assistant",content:""}]));
      var r=await callClaude(sys,hist.map(function(m){return{role:m.role,content:m.content};}),4000,true,function(partial){
        setChatMsgs(hist.concat([{role:"assistant",content:partial}]));
      });
      dbSaveChatMessage(authUser.id,"assistant",r,chatSid||curSid,sessionId);
    }catch(e){
      setChatMsgs(hist.concat([{role:"assistant",content:msgError(e)}]));
    }
    setChatLoading(false);
  }
async function loadChatDoc(file){
    setChatDocLoading(true);
    try{
      var texto="";
      if(/\.pdf$/i.test(file.name)){
        var result=await processPdf(file);
        texto=result.text;
      }else if(/\.docx$/i.test(file.name)){
        var mammoth=await import("mammoth");
        var buffer=await file.arrayBuffer();
        var extraction=await mammoth.extractRawText({arrayBuffer:buffer});
        texto=extraction.value;
      }else{
        throw new Error("Formato no soportado. Subi PDF o DOCX.");
      }
      if(!texto||!texto.trim()) throw new Error("No se pudo extraer texto del documento.");
      setChatDocText(texto);
      setChatDocName(file.name);
    }catch(e){
      alert("Error al procesar el documento: "+e.message);
    }
    setChatDocLoading(false);
  }

  function clearChatDoc(){
    setChatDocText("");setChatDocName("");setChatDocPaste(false);
  }

  function extractScore(text) {
    var patterns = [
      /calificaci[oÃ³]n\s*final[:\s]+(\d+(?:[.,]\d+)?)/i,
      /nota\s*final[:\s]+(\d+(?:[.,]\d+)?)/i,
      /puntaje\s*final[:\s]+(\d+(?:[.,]\d+)?)/i,
      /calificaci[oÃ³]n[:\s]+(\d+(?:[.,]\d+)?)\s*\/\s*10/i,
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
      var sys = "Sos un docente evaluador experto y justo. Materia: \""+(curSubj?curSubj.name:"General")+"\". Corregis con criterio pedagogico: riguroso pero constructivo, evaluas segun la rubrica de forma coherente y justificada, y tu devolucion ayuda al alumno a mejorar. Responde en espanol rioplatense con Markdown, sin emojis.";
      for(var j=0;j<trabajos.length;j++){
        var t = trabajos[j];
        setBatchProgress(j+1);
        try {
          var usr = "Corregi el trabajo usando la rubrica provista.\n\n## RUBRICA:\n"+corrR+"\n\n## TRABAJO DE "+t.name+":\n"+t.work+"\n\nEvalua cada criterio de forma justificada, da una Calificacion final: X/10 coherente con esa evaluacion, y escribÃ­ una devolucion constructiva que reconozca lo bueno y marque con claridad que puede mejorar y como. Se concreto y util."+instruccionRigor(corrRigor);
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
          results.push({name:t.name,result:msgError(e),score:null,saved:false});
        }
      }
      setBatchResults(results);
      await dbLoadAllEvaluations(authUser.id,curSid).then(setAllEvals);
    } catch(e) { alert("Error: "+e.message); }
    setBatchLoading(false);setBatchProgress(0);
  }
 function instruccionRigor(nivel){
    if(nivel==="riguroso") return "\n\nNIVEL DE EXIGENCIA: RIGUROSO. Corregi con exigencia alta, como en un examen final o un nivel avanzado. Aplica la rubrica con firmeza, marca los errores y no dejes pasar los relevantes. La calificacion es exigente: solo las respuestas realmente solidas y completas merecen la nota maxima. Manten un tono humano y respetuoso, exigente pero no cruel.";
    if(nivel==="flexible") return "\n\nNIVEL DE EXIGENCIA: FLEXIBLE Y MUY GENEROSO. Tu prioridad es reconocer lo que el alumno logro y alentarlo. IMPORTANTE: usa la rubrica solo como orientacion general, NO como una vara rigida. No exijas el cumplimiento estricto de cada criterio; lo que importa es si el alumno comprende el tema en lineas generales. Si muestra comprension basica y esfuerzo genuino, APRUEBA con comodidad, aunque no cumpla todos los puntos de la rubrica al detalle. Pasa por alto los errores menores por completo y no descuentes por detalles ni por criterios secundarios de la rubrica. Ante cualquier duda, siempre a favor del alumno. Como referencia: la mayoria de los trabajos con un minimo de comprension deberian quedar aprobados, varios puntos por encima de una correccion estricta. El tono es calido, positivo y motivador; lo mejorable se plantea como sugerencias suaves, nunca como faltas.";
    return "\n\nNIVEL DE EXIGENCIA: EQUILIBRADO. Corregi de forma justa y estandar, como un buen docente en una evaluacion normal. Aplica la rubrica con criterio razonable, marca lo importante sin ser lapidario, reconoce los aciertos y da una calificacion justa y merecida. Tono humano y constructivo.";
  }
  async function correctTP(){
    if(!corrR.trim()||!corrW.trim()) return;
    setCorrLoading(true);setCorrResult("");
    var sys="Sos docente evaluador experto. Materia: \""+(curSubj?curSubj.name:"General")+"\". Responde en espanol rioplatense con Markdown.";
    var usr="Corregi el siguiente trabajo usando la rubrica provista.\n\n## RUBRICA:\n"+corrR+"\n\n## TRABAJO:\n"+corrW+"\n\nEvalua cada criterio de la rubrica de forma justificada (por que esa calificacion, basandote en el trabajo), da una calificacion final coherente con esa evaluacion, y escribÃ­ una devolucion para el alumno que reconozca lo bueno y le marque con claridad y en tono constructivo que puede mejorar y como. Se concreto y util, no generico."+instruccionRigor(corrRigor);
    try{var r=await callClaude(sys,[{role:"user",content:usr}],4000);setCorrResult(r);}
    catch(e){setCorrResult(msgError(e));}
    setCorrLoading(false);
  }

  if(authLoading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,flexDirection:"column",gap:12}}>
      <i className="ti ti-school" style={{fontSize:38,color:C.accent}}/>
      <div style={{color:C.textMuted,fontSize:14}}>Cargando AulaXpro...</div>
    </div>
  );

  if(!authUser) return <AuthScreen onAuth={setAuthUser}/>;
  var esDirectivo = authUser && authUser.user_metadata && authUser.user_metadata.role==="directivo";
  var esAdmin = authUser && authUser.email===import.meta.env.VITE_ADMIN_EMAIL;
  if(((esDirectivo && !verComoDocente) || (esAdmin && adminVerDirectivos)) && !showResetPassword && !needsPassword){
    return <DirectivoDashboard authUser={authUser} onVerComoDocente={function(){setVerComoDocente(true);setAdminVerDirectivos(false);}} onSignOut={signOut}/>;
  }

  if(showResetPassword) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg}}>
      <div style={{width:420}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <i className="ti ti-lock-open" style={{fontSize:52,color:C.accent,display:"block",marginBottom:12}}/>
          <h1 style={{color:C.accent,fontSize:26,fontWeight:700,margin:"0 0 6px"}}>Nueva contraseÃ±a</h1>
          <p style={{color:C.textMuted,fontSize:15}}>IngresÃ¡ tu nueva contraseÃ±a</p>
        </div>
        <div style={card}>
          {resetDone?(
            <div style={{textAlign:"center",padding:"16px 0"}}>
              <i className="ti ti-check" style={{fontSize:40,color:C.green,display:"block",marginBottom:12}}/>
              <p style={{fontSize:15,color:C.text,marginBottom:20}}>ContraseÃ±a actualizada correctamente.</p>
              <Btn st={{width:"100%",justifyContent:"center"}} onClick={function(){setShowResetPassword(false);setResetDone(false);setNewPassword("");}}>
                Ir a la app
              </Btn>
            </div>
          ):(
            <div>
              <label style={lbl}>NUEVA CONTRASEÃ‘A</label>
              <input style={Object.assign({},inp,{marginBottom:20})} type="password" value={newPassword} onChange={function(e){setNewPassword(e.target.value);}} placeholder="Minimo 6 caracteres"/>
              <Btn st={{width:"100%",justifyContent:"center",fontSize:14,padding:"11px 20px"}} disabled={resetLoading||newPassword.length<6} onClick={async function(){
                setResetLoading(true);
                var result=await supabase.auth.updateUser({password:newPassword});
                if(result.error){alert("Error: "+result.error.message);}
                else{setResetDone(true);}
                setResetLoading(false);
              }}>
                {resetLoading?"Actualizando...":"Actualizar contraseÃ±a"}
              </Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  if(needsPassword) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg}}>
      <div style={{width:420}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <i className="ti ti-lock-plus" style={{fontSize:52,color:C.accent,display:"block",marginBottom:12}}/>
          <h1 style={{color:C.accent,fontSize:26,fontWeight:700,margin:"0 0 6px"}}>CreÃ¡ tu contraseÃ±a</h1>
          <p style={{color:C.textMuted,fontSize:15}}>DefinÃ­ una contraseÃ±a para poder ingresar siempre</p>
        </div>
        <div style={card}>
          <label style={lbl}>CONTRASEÃ‘A</label>
          <input style={Object.assign({},inp,{marginBottom:20})} type="password" value={newPassword} onChange={function(e){setNewPassword(e.target.value);}} placeholder="Minimo 6 caracteres" autoFocus/>
          <Btn st={{width:"100%",justifyContent:"center",fontSize:14,padding:"11px 20px"}} disabled={resetLoading||newPassword.length<6} onClick={async function(){
            setResetLoading(true);
            var result=await supabase.auth.updateUser({password:newPassword,data:{needs_password:false}});
            if(result.error){alert("Error: "+result.error.message);}
            else{setNeedsPassword(false);setNewPassword("");}
            setResetLoading(false);
          }}>
            {resetLoading?"Guardando...":"Crear contraseÃ±a y entrar"}
          </Btn>
        </div>
      </div>
    </div>
  );
  if(budgetExceeded&&authUser.email!==import.meta.env.VITE_ADMIN_EMAIL) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg}}>
      <div style={{width:480,textAlign:"center"}}>
        <i className="ti ti-coin-off" style={{fontSize:52,color:C.red,display:"block",marginBottom:12}}/>
        <h2 style={{color:C.text,fontSize:24,fontWeight:700,margin:"0 0 12px"}}>Alcanzaste tu limite mensual</h2>
        <p style={{color:C.textMuted,fontSize:15,marginBottom:8}}>Llegaste al maximo de uso incluido en tu plan por este mes.</p>
        <p style={{color:C.textDim,fontSize:14,marginBottom:32,lineHeight:1.5}}>Tu uso se renueva automaticamente al comenzar el proximo periodo. Si necesitas seguir usando AulaXpro sin esperar, escribinos a hola@aulaxpro.com y te ayudamos.</p>
        <button style={{marginTop:20,background:"transparent",border:"none",cursor:"pointer",color:C.textDim,fontSize:13,fontFamily:"Quicksand,sans-serif",display:"inline-flex",alignItems:"center",gap:5}} onClick={function(){setBudgetExceeded(false);}}>
          <i className="ti ti-arrow-left" style={{fontSize:14}}/>Volver a la app
        </button>
      </div>
    </div>
  );
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
      <div style={{width:isMobile?(mobileMenu?280:0):bar?218:56,minWidth:isMobile?(mobileMenu?280:0):bar?218:56,background:"#0D3559",borderRight:"1px solid "+C.border,display:"flex",flexDirection:"column",transition:"all .22s",overflow:isMobile?"hidden":"hidden",overflowY:isMobile?"auto":"hidden",position:isMobile?"fixed":"relative",top:0,left:0,height:isMobile?"100dvh":"auto",zIndex:isMobile?9999:"auto"}}>
        <div style={{padding:"0 10px",borderBottom:"1px solid "+C.border,minHeight:54,display:"flex",alignItems:"center",gap:8}}>
          <button style={{background:"none",border:"none",cursor:"pointer",color:C.accent,fontSize:17,minWidth:26,fontFamily:"Quicksand,sans-serif"}} onClick={function(){setBar(!bar);}}>
            {bar?<i className="ti ti-chevron-left" style={{fontSize:16}}/>:<i className="ti ti-chevron-right" style={{fontSize:16}}/>}
          </button>
          {bar&&(
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <div style={{width:26,height:26,background:"#0D3559",borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden",flexShrink:0}}>
                <div style={{position:"absolute",width:14,height:2,background:"#26C3D4",top:7,left:6,borderRadius:1}}/>
                <div style={{position:"absolute",width:14,height:2,background:"#79BD9A",top:12,left:6,borderRadius:1}}/>
                <div style={{position:"absolute",width:10,height:2,background:"#8FD9E8",top:17,left:6,borderRadius:1}}/>
                <div style={{position:"absolute",width:8,height:8,background:"#26C3D4",borderRadius:"50%",top:5,right:4,opacity:.7}}/>
              </div>
              <span style={{fontSize:15,fontWeight:700,color:"#ffffff",whiteSpace:"nowrap"}}>Aula<span style={{color:"#26C3D4"}}>X</span>pro</span>
            </div>
          )}
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
        <div style={{padding:"10px 12px",paddingBottom:isMobile?40:10,borderTop:"1px solid "+C.border}}>
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
        
          <div style={{position:"relative"}}>
            <button style={{background:"transparent",border:"1px solid "+C.border,borderRadius:4,padding:"5px 10px",cursor:"pointer",color:C.text,display:"flex",alignItems:"center",gap:4,fontFamily:"Quicksand,sans-serif"}} onClick={function(){setShowNotifications(!showNotifications);}}>
              <i className="ti ti-bell" style={{fontSize:16}}/>
              {notifications.filter(function(n){return !n.read;}).length>0&&(
                <span style={{background:C.red,color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {notifications.filter(function(n){return !n.read;}).length}
                </span>
              )}
            </button>
            {showNotifications&&(
              <div style={{position:"absolute",right:0,top:"100%",marginTop:6,width:320,background:C.surf,border:"1px solid "+C.border,borderRadius:4,boxShadow:"0 8px 24px rgba(0,0,0,.1)",zIndex:999}}>
                <div style={{padding:"12px 16px",borderBottom:"1px solid "+C.border,fontSize:13,fontWeight:700,color:C.text}}>Notificaciones</div>
                {!notifications.length?(
                  <div style={{padding:"20px 16px",textAlign:"center",color:C.textDim,fontSize:13}}>Sin notificaciones</div>
                ):notifications.map(function(n){
                  return (
                    <div key={n.id} style={{padding:"12px 16px",borderBottom:"1px solid "+C.border,background:n.read?C.surf:C.accentBg,cursor:"pointer"}} onClick={function(){setView("projects");setShowNotifications(false);}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                        <i className="ti ti-topology-star" style={{fontSize:16,color:C.accent,marginTop:2}}/>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:C.text}}>{n.title}</div>
                          <div style={{fontSize:12,color:C.textMuted,marginTop:2}}>{n.message}</div>
                          <div style={{fontSize:11,color:C.textDim,marginTop:4}}>{new Date(n.date).toLocaleDateString("es-AR")}</div>
                        </div>
                        {!n.read&&<span style={{width:8,height:8,borderRadius:"50%",background:C.accent,marginTop:4,flexShrink:0}}/>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {authUser && authUser.user_metadata && authUser.user_metadata.role==="directivo" && verComoDocente && (
            <Btn v="accent" st={{padding:"5px 13px",fontSize:12}} onClick={function(){setVerComoDocente(false);}}>
              <i className="ti ti-arrow-back-up" style={{fontSize:13,marginRight:3}}/>Volver a directivos
            </Btn>
          )}
          {authUser && authUser.email===import.meta.env.VITE_ADMIN_EMAIL && (
            <Btn v="accent" st={{padding:"5px 13px",fontSize:12}} onClick={function(){setAdminVerDirectivos(true);setVerComoDocente(false);}}>
              <i className="ti ti-briefcase" style={{fontSize:13,marginRight:3}}/>Panel directivos
            </Btn>
          )}
          <TourLaunchButton currentView={view} onLaunch={launchTour} showLabel={true} />
          <Btn v="accent" st={{padding:"5px 13px",fontSize:12}} onClick={function(){setSubjModal(true);}}>
            <i className="ti ti-plus" style={{fontSize:12,marginRight:3}}/>Materia
          </Btn>
        </div>

        <div style={{flex:1,overflow:"auto",padding:"20px 26px"}}>

          {usage&&authUser.email!==import.meta.env.VITE_ADMIN_EMAIL&&(function(){
            var resetDate=new Date(usage.tokens_reset_date);
            var totalLimit=(usage.tokens_limit||3)+(usage.extra_credits||0);
            var used=usage.tokens_used||0;
            var pct=Math.min(Math.round((used/totalLimit)*100),100);
            var remaining=(totalLimit-used).toFixed(2);
            if(pct<80) return null;
            return (
              <div style={{background:pct>=100?"#fee2e2":C.accentBg,border:"1px solid "+(pct>=100?C.red:C.accent),borderRadius:4,padding:"10px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <span style={{fontSize:13,color:pct>=100?C.red:C.accent,fontWeight:600}}>
                    {pct>=100?"Alcanzaste tu limite mensual":"Estas cerca de tu limite mensual"}
                  </span>
                  <span style={{fontSize:12,color:C.textMuted,marginLeft:8}}>
                    {pct>=100?"Tu uso se renueva el proximo periodo":"Ya usaste la mayor parte de tu plan este mes"}
                  </span>
                </div>
                <button style={{background:pct>=100?C.red:C.accent,border:"none",borderRadius:4,padding:"5px 14px",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"Quicksand,sans-serif",color:"#fff"}} onClick={function(){setView("pricing");}}>
                  <i className="ti ti-plus" style={{fontSize:12,marginRight:4}}/>Ver mi plan
                </button>
              </div>
            );
          })()}
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
              <div data-tour="add-subject-btn" style={{display:"inline-block"}}>
               <Btn onClick={function(){setSubjModal(true);}}>
               <i className="ti ti-plus" style={{fontSize:13,marginRight:4}}/>Nueva Materia
               </Btn>
               </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:12,marginBottom:20}}>
                {[{l:"Materias",v:subjects.length,i:"ti-books",c:C.blue},{l:"Biblioteca",v:library.length,i:"ti-folder",c:C.green},{l:"Banco",v:bank.length,i:"ti-database",c:C.accent},{l:"Biblioteca Publica",v:publicLib.length,i:"ti-world",c:C.purple}].map(function(x){
                  return (
                    <div key={x.l} style={Object.assign({},card,{marginBottom:0})}>
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
                  <div data-tour="subjects-grid" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
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
                <div data-tour="quick-access" style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:10}}>
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
                <div data-tour="gen-types" style={card}>
                  <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8,marginBottom:12}}>TIPO DE CONTENIDO</div>
                  {GEN_TYPES.map(function(g){
                    return (
                      <button key={g.id} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"8px 10px",borderRadius:4,border:"none",cursor:"pointer",marginBottom:3,background:genType===g.id?C.accentBg:"transparent",color:genType===g.id?C.accent:C.textMuted,textAlign:"left",fontFamily:"Quicksand,sans-serif",fontSize:13,borderLeft:genType===g.id?"2px solid "+C.accent:"2px solid transparent"}}
                        onClick={function(){setGenType(g.id);setGenResult("");setGenSaved(false);setGenErr("");setMakeCodeUrl(null);setActImgUrl(null);setGenDocText("");setGenDocName("");}}>
                        <i className={"ti "+g.icon} style={{fontSize:16}}/>
                        <span style={{fontWeight:genType===g.id?700:400}}>{g.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div data-tour="gen-params" style={card}>
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
                <div data-tour="gen-form" style={card}>
                  <div style={{display:"flex",alignItems:"center",gap:13,marginBottom:18}}>
                    {gt&&<i className={"ti "+gt.icon} style={{fontSize:30,color:gt.color}}/>}
                    <div>
                      <h2 style={{margin:0,fontSize:19,fontWeight:700,color:C.text}}>{gt?gt.label:""}</h2>
                      <div style={{fontSize:13,color:C.textDim}}>{"Materia: "+(curSubj?curSubj.name:"â€”")}</div>
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
                     <textarea style={Object.assign({},inp,{height:70,resize:"vertical",marginBottom:12})} value={genExtra} onChange={function(e){setGenExtra(e.target.value);}} placeholder="Ej: grupos de 4, enfoque por proyectos..."/>
                      <label style={lbl}>DOCUMENTO DE CONTEXTO (opcional)</label>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
                        <label style={{display:"inline-flex",alignItems:"center",gap:6,background:C.surf,border:"1px solid "+(genDocText?C.accent:C.border),borderRadius:4,padding:"7px 14px",cursor:genDocLoading?"not-allowed":"pointer",fontSize:12,fontWeight:600,color:genDocText?C.accent:C.text,opacity:genDocLoading?.6:1}}>
                          <i className={genDocLoading?"ti ti-loader":"ti ti-file-upload"} style={{fontSize:14}}/>
                          {genDocLoading?"Procesando...":genDocText?genDocName:"Adjuntar PDF o texto"}
                          <input type="file" accept=".pdf,.txt" style={{display:"none"}} disabled={genDocLoading} onChange={async function(e){
                            var file=e.target.files[0]; if(!file) return;
                            if(file.type==="application/pdf" && file.size > 3*1024*1024){alert("El PDF es demasiado grande. El lÃ­mite es 3MB. IntentÃ¡ con un PDF mÃ¡s pequeÃ±o o pegÃ¡ el texto directamente en las instrucciones adicionales.");return;}
                            setGenDocLoading(true);
                            try{
                              if(file.type==="application/pdf"){
                                var result=await processPdf(file);
                                setGenDocText(result.text);
                                setGenDocName(file.name);
                              } else {
                                var text=await file.text();
                                setGenDocText(text.slice(0,8000));
                                setGenDocName(file.name);
                              }
                            }catch(err){alert("Error al procesar el archivo: "+err.message);}
                            setGenDocLoading(false);
                            e.target.value="";
                          }}/>
                        </label>
                        {genDocText&&(
                          <button style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim,display:"flex",alignItems:"center",gap:4,fontSize:12,fontFamily:"Quicksand,sans-serif"}} onClick={function(){setGenDocText("");setGenDocName("");}}>
                            <i className="ti ti-x" style={{fontSize:13}}/>Quitar
                          </button>
                        )}
                        {genDocText&&<span style={{fontSize:11,color:C.green,display:"flex",alignItems:"center",gap:3}}><i className="ti ti-check" style={{fontSize:12}}/>{Math.round(genDocText.length/1000)+"k caracteres cargados"}</span>}
                      </div>
                      {genType==="adaptado"&&(
                        <div style={{marginBottom:18}}>
                          <label style={lbl}>TIPO DE NEE *</label>
                          <select style={Object.assign({},sel,{width:"100%",marginBottom:12})} onChange={function(e){
                            var nee=e.target.value;
                            var mat=genExtra.includes("MATERIAL:")?"\nMATERIAL:"+genExtra.split("MATERIAL:")[1]:"";
                            setGenExtra(nee?"NEE:"+nee+mat:"");
                          }}>
                            <option value="">Seleccionar necesidad educativa...</option>
                            {["Dislexia","TDAH","TEA","Discapacidad Visual","Discapacidad Auditiva","Baja Vision","Altas Capacidades","Dificultades en Lectoescritura","Barreras Idiomaticas"].map(function(n){
                              return <option key={n} value={n}>{n}</option>;
                            })}
                          </select>
                          <label style={lbl}>MATERIAL BASE (opcional)</label>
                          <textarea style={Object.assign({},inp,{height:100,resize:"vertical"})} onChange={function(e){
                            var nee=genExtra.includes("NEE:")?genExtra.split("\n")[0]:"";
                            setGenExtra(nee+(e.target.value?"\nMATERIAL:"+e.target.value:""));
                          }} placeholder="Pega aqui el material que queres adaptar. Si lo dejas vacio la IA genera desde cero."/>
                        </div>
                      )}
                      {genType!=="adaptado"&&<div style={{marginBottom:18}}/>}
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
            {genResult&&(
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
                        <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportDocx(genTopic,gt?gt.label:"",curSubj?curSubj.name:"",genResult,actImgBase64);}}>
                          <i className="ti ti-file-text" style={{fontSize:13,marginRight:4}}/>Word
                        </Btn>
                        {(genType==="evaluacion"||genType==="rubrica"||genType==="planclase")&&(
                          <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportPdf(genTopic,gt?gt.label:"",curSubj?curSubj.name:"",genResult,actImgBase64);}}>
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
                    <div data-tour="gen-diff" style={{marginTop:16,paddingTop:16,borderTop:"1px solid "+C.border}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:C.text}}>Diferenciacion automatica</div>
                          <div style={{fontSize:12,color:C.textDim}}>Genera 3 versiones: Basica, Estandar y Avanzada</div>
                        </div>
                        <Btn v="secondary" st={{fontSize:12,padding:"5px 14px"}} onClick={generateDiff} disabled={diffLoading}>
                          {diffLoading?"Generando...":<><i className="ti ti-arrows-split" style={{fontSize:13,marginRight:4}}/>Diferenciar</>}
                        </Btn>
                      </div>
                      {diffLoading&&<Spin/>}
                      {diffResult&&!diffLoading&&(
                        <div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                            <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8}}>3 VERSIONES GENERADAS</div>
                            <div style={{display:"flex",gap:8}}>
                              <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){saveLib(diffResult,"actividad","Actividad Diferenciada",genTopic+" (3 niveles)");}}>
                                <><i className="ti ti-device-floppy" style={{fontSize:13,marginRight:4}}/>Guardar</>
                              </Btn>
                              <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportDocx(genTopic+" - Diferenciacion",gt?gt.label:"",curSubj?curSubj.name:"",diffResult);}}>
                                <i className="ti ti-file-text" style={{fontSize:13,marginRight:4}}/>Word
                              </Btn>
                            </div>
                          </div>
                          <MDView text={diffResult} maxH={600}/>
                        </div>
                      )}
                    </div>
                    <div style={{marginTop:16,paddingTop:16,borderTop:"1px solid "+C.border}}>
                      <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8,marginBottom:10}}>IMAGEN PARA EL DOCUMENTO (opcional)</div>
                      <p style={{fontSize:12,color:C.textDim,marginBottom:10}}>GenerÃ¡ una imagen con IA o subÃ­ una desde tu dispositivo.</p>
                      <input style={Object.assign({},inp,{marginBottom:10})} value={actImgDesc} onChange={function(e){setActImgDesc(e.target.value);}} placeholder="Ej: diagrama de la celula eucariota"/>
                      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                        <Btn v="secondary" st={{fontSize:12,padding:"5px 14px"}} onClick={generateActivityImage} disabled={actImgLoad}>
                          {actImgLoad?"Generando...":<><i className="ti ti-photo-ai" style={{fontSize:13,marginRight:4}}/>Generar con IA</>}
                        </Btn>
                        <label style={{display:"inline-flex",alignItems:"center",gap:6,background:C.surf,border:"1px solid "+C.border,borderRadius:4,padding:"5px 14px",cursor:"pointer",fontSize:12,fontWeight:600,color:C.text}}>
                          <i className="ti ti-upload" style={{fontSize:13}}/>Subir imagen
                          <input type="file" accept="image/*" style={{display:"none"}} onChange={function(e){
                            var file=e.target.files[0];if(!file) return;
                            var reader=new FileReader();
                            reader.onload=function(ev){setActImgBase64(ev.target.result);setActImgUrl(ev.target.result);};
                            reader.readAsDataURL(file);
                            e.target.value="";
                          }}/>
                        </label>
                        {actImgErr&&<span style={{color:C.red,fontSize:12}}>{actImgErr}</span>}
                      </div>
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
              <div data-tour="mm-types" style={card}>
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
                <div data-tour="mm-form" style={card}>
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
                    {mmLoading&&!mmResult&&<div style={card}><Spin/></div>}
                    {mmResult&&(
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

          {!dataLoading&&view==="chat"&&(
            <div style={{display:"flex",height:"calc(100vh - 132px)",gap:0}}>
              <div data-tour="chat-sessions" style={{width:isMobile?"0":"240px",minWidth:isMobile?"0":"240px",background:C.surf,borderRight:"1px solid "+C.border,display:"flex",flexDirection:"column",overflow:"hidden",transition:"all .2s"}}>
                <div style={{padding:"12px 14px",borderBottom:"1px solid "+C.border}}>
                  <Btn st={{width:"100%",justifyContent:"center",fontSize:12,padding:"8px 0"}} onClick={function(){
                    setCurrentSessionId(null);setChatMsgs([]);
                  }}>
                    <i className="ti ti-plus" style={{fontSize:13,marginRight:4}}/>Nueva conversaciÃ³n
                  </Btn>
                </div>
                <div style={{flex:1,overflowY:"auto",padding:"8px 0"}}>
                  {chatSessionsLoading?<div style={{padding:"16px",textAlign:"center",color:C.textDim,fontSize:12}}>Cargando...</div>:
                  !chatSessions.length?<div style={{padding:"16px",textAlign:"center",color:C.textDim,fontSize:12}}>Sin conversaciones</div>:
                  chatSessions.map(function(s){
                    return (
                      <div key={s.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 14px",cursor:"pointer",background:currentSessionId===s.id?C.accentBg:"transparent",borderLeft:currentSessionId===s.id?"2px solid "+C.accent:"2px solid transparent"}}
                        onClick={function(){
                          setCurrentSessionId(s.id);
                          dbLoadChatHistory(authUser.id,100,s.id).then(function(history){
                            setChatMsgs(history.map(function(m){return{role:m.role,content:m.content};}));
                          });
                        }}>
                        <div style={{flex:1,overflow:"hidden"}}>
                          <div style={{fontSize:12,fontWeight:600,color:currentSessionId===s.id?C.accent:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.title||"Nueva conversaciÃ³n"}</div>
                          <div style={{fontSize:10,color:C.textDim,marginTop:2}}>{new Date(s.updated_at).toLocaleDateString("es-AR")}</div>
                        </div>
                        <button style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim,padding:"2px 4px",opacity:0,transition:"opacity .15s"}} className="del-session"
                          onClick={function(e){e.stopPropagation();dbDeleteChatSession(s.id).then(function(){setChatSessions(function(prev){return prev.filter(function(x){return x.id!==s.id;});});if(currentSessionId===s.id){setCurrentSessionId(null);setChatMsgs([]);}});}}>
                          <i className="ti ti-trash" style={{fontSize:13}}/>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
                <div data-tour="chat-context" style={Object.assign({},card,{marginBottom:8,padding:"9px 14px"})}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.6,whiteSpace:"nowrap"}}>CONTEXTO:</span>
                    <select style={Object.assign({},sel,{flex:1})} value={chatSid===null?"":chatSid||""} onChange={function(e){setChatSid(e.target.value||null);}}>
                      <option value="">Sin materia especÃ­fica</option>
                      {subjects.map(function(s){return <option key={s.id} value={s.id}>{s.name+" ("+s.level+")"}</option>;})}
                    </select>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.6,whiteSpace:"nowrap"}}>DOCUMENTO:</span>
                    {chatDocName?(
                      <div style={{display:"flex",alignItems:"center",gap:6,background:C.accentBg,borderRadius:4,padding:"4px 10px"}}>
                        <i className="ti ti-file-check" style={{fontSize:13,color:C.accent}}/>
                        <span style={{fontSize:12,color:C.accent,fontWeight:600}}>{chatDocName}</span>
                        <button style={{background:"none",border:"none",cursor:"pointer",color:C.textDim,fontSize:14,padding:0,display:"flex"}} onClick={clearChatDoc} title="Quitar documento"><i className="ti ti-x"/></button>
                      </div>
                    ):chatDocLoading?(
                      <span style={{fontSize:12,color:C.textDim}}>Procesando documento...</span>
                    ):(
                      <>
                        <label style={{display:"inline-flex",alignItems:"center",gap:5,background:C.surf,border:"1px solid "+C.border,borderRadius:4,padding:"4px 10px",cursor:"pointer",fontSize:12,fontWeight:600,color:C.text}}>
                          <i className="ti ti-paperclip" style={{fontSize:13}}/>Adjuntar PDF/DOCX
                          <input type="file" accept=".pdf,.docx" style={{display:"none"}} onChange={function(e){if(e.target.files[0])loadChatDoc(e.target.files[0]);e.target.value="";}}/>
                        </label>
                        <button style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.textDim,textDecoration:"underline"}} onClick={function(){setChatDocPaste(!chatDocPaste);}}>o pegar texto</button>
                      </>
                    )}
                  </div>
                  {chatDocPaste&&!chatDocName&&(
                    <div style={{marginTop:8}}>
                      <textarea style={Object.assign({},inp,{width:"100%",height:80,resize:"vertical",fontSize:12})} placeholder="Pega aca el texto del documento..." onChange={function(e){setChatDocText(e.target.value);}}/>
                      <button style={{marginTop:4,background:C.accent,color:"#fff",border:"none",borderRadius:4,padding:"4px 12px",cursor:"pointer",fontSize:12,fontWeight:600}} onClick={function(){if(chatDocText.trim()){setChatDocName("Texto pegado");setChatDocPaste(false);}}}>Usar este texto</button>
                    </div>
                  )}
                </div>
                <div style={Object.assign({},card,{flex:1,overflow:"auto",padding:"14px 18px",minHeight:0,marginBottom:0})}>
                  {!chatMsgs.length?(
                    <div style={{textAlign:"center",padding:"28px 0",color:C.textDim}}>
                      <i className="ti ti-message" style={{fontSize:36,display:"block",marginBottom:10,color:C.textDim}}/>
                      <p style={{fontSize:14,marginBottom:18}}>Preguntame lo que quieras</p>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,maxWidth:500,margin:"0 auto"}}>
                        {["Como explico este concepto de forma simple?","Dame 5 actividades de cierre creativas","Como esta el clima hoy en Buenos Aires?","Cuales son las ultimas noticias de educacion?","Que peliculas se estrenan esta semana?","Como manejo distintos ritmos de aprendizaje?"].map(function(s){
                          return <button key={s} style={{background:C.bg,border:"1px solid "+C.border,borderRadius:4,padding:"9px 11px",color:C.textMuted,cursor:"pointer",textAlign:"left",fontSize:12,fontFamily:"Quicksand,sans-serif"}} onClick={function(){setChatIn(s);}}>{s}</button>;
                        })}
                      </div>
                    </div>
                  ):chatMsgs.map(function(m,i){
                    return (
                    <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:16}}>
                        {m.role==="user"
                          ?<div style={{maxWidth:"75%",background:C.accent,borderRadius:18,padding:"10px 16px"}}>
                            <span style={{fontSize:14,color:"#fff"}}>{m.content}</span>
                          </div>
                          :<div style={{maxWidth:"85%"}}>
                            <span style={{fontSize:14,color:C.text,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{m.content}</span>
                          </div>
                        }
                      </div>
                    );
                  })}
                  {chatLoading&&<div style={{textAlign:"center",padding:"12px 0"}}><Spin/></div>}
                  <div ref={chatRef}/>
                </div>
                <div data-tour="chat-input" style={{display:"flex",gap:10,marginTop:10}}>
                  <input style={Object.assign({},inp,{flex:1,padding:"10px 14px"})} value={chatIn} onChange={function(e){setChatIn(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter"&&!e.shiftKey) sendChat();}} placeholder="Preguntame lo que quieras... (Enter para enviar)"/>
                  <Btn onClick={sendChat} disabled={chatLoading||!chatIn.trim()} st={{padding:"10px 22px"}}>
                    <i className="ti ti-send" style={{fontSize:14,marginRight:4}}/>Enviar
                  </Btn>
                </div>
              </div>
            </div>
          )}

          {!dataLoading&&view==="corrector"&&(
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:18}}>
              <div data-tour="corr-rubric" style={card}>
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
                <label style={lbl}>NIVEL DE CORRECCION</label>
                <div style={{display:"flex",gap:5,marginBottom:12}}>
                  {[{v:"riguroso",l:"Riguroso"},{v:"equilibrado",l:"Equilibrado"},{v:"flexible",l:"Flexible"}].map(function(o){
                    return <button key={o.v} style={{flex:1,padding:"6px 3px",borderRadius:4,border:"1px solid "+(corrRigor===o.v?C.accent:C.border),background:corrRigor===o.v?C.accentBg:"transparent",color:corrRigor===o.v?C.accent:C.textMuted,cursor:"pointer",fontSize:11,fontWeight:corrRigor===o.v?700:400,fontFamily:"Quicksand,sans-serif"}} onClick={function(){setCorrRigor(o.v);}}>{o.l}</button>;
                  })}
                </div>
                <label style={lbl}>TRABAJO DEL ALUMNO *</label>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <label data-tour="corr-photo" style={{display:"inline-flex",alignItems:"center",gap:6,background:C.surf,border:"1px solid "+C.border,borderRadius:4,padding:"7px 14px",cursor:imgExtractLoading?"not-allowed":"pointer",fontSize:12,fontWeight:600,color:C.text,opacity:imgExtractLoading?.6:1}}>
                    <i className="ti ti-camera" style={{fontSize:14}}/>
                    {imgExtractLoading?"Extrayendo texto...":(corrHojas>0?"Agregar otra hoja":"Fotografiar examen")}
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
                          setCorrHojas(function(h){
                            var nueva=h+1;
                            setCorrW(function(prev){return prev?(prev+"\n\n--- HOJA "+nueva+" ---\n"+data.text):("--- HOJA "+nueva+" ---\n"+data.text);});
                            return nueva;
                          });
                          setImgExtractLoading(false);
                        };
                        reader.readAsDataURL(file);
                      }catch(err){setImgExtractErr("Error: "+err.message);setImgExtractLoading(false);}
                      e.target.value="";
                    }}/>
                  </label>
                  {imgExtractErr&&<span style={{fontSize:12,color:C.red}}>{imgExtractErr}</span>}
                  {corrHojas>0&&(
                    <div style={{display:"flex",alignItems:"center",gap:10,marginTop:6}}>
                      <span style={{fontSize:12,color:C.accent,fontWeight:600}}><i className="ti ti-file-check" style={{fontSize:13,marginRight:3}}/>{corrHojas} {corrHojas===1?"hoja agregada":"hojas agregadas"}</span>
                      <button style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.textDim,textDecoration:"underline"}} onClick={function(){setCorrHojas(0);setCorrW("");}}>Reiniciar</button>
                    </div>
                  )}
                  {corrW&&<span style={{fontSize:11,color:C.green,display:"flex",alignItems:"center",gap:3}}><i className="ti ti-check" style={{fontSize:12}}/>Texto extraido</span>}
                </div>
                <textarea style={Object.assign({},inp,{height:175,resize:"vertical",marginBottom:18})} value={corrW} onChange={function(e){setCorrW(e.target.value);}} placeholder="Pega el texto del trabajo o fotografialo con el boton de arriba..."/>
                <div data-tour="corr-batch" style={{marginTop:20,paddingTop:16,borderTop:"1px solid "+C.border}}>
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
                    <p style={{fontSize:13}}>Evaluacion por criterio Â· Calificacion Â· Fortalezas Â· Mejoras Â· Devolucion</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!dataLoading&&view==="library"&&(
            <div>
              <div data-tour="lib-filters" style={{display:"flex",gap:12,marginBottom:18,flexWrap:"wrap",alignItems:"center"}}>
                <h2 style={{margin:0,fontSize:19,fontWeight:700,flex:1,color:C.text,display:"flex",alignItems:"center",gap:8}}>
                  <i className="ti ti-books" style={{fontSize:18,color:C.accent}}/>{"Biblioteca ("+library.length+")"}
                </h2>
                {library.length>0&&<Btn data-tour="lib-export" v="secondary" st={{fontSize:12,padding:"5px 14px"}} onClick={function(){exportZip(library);}}>
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
                        <div style={{fontSize:12,color:C.textDim,marginBottom:4}}>{libItem.type_name+" Â· "+libItem.subject_name+" Â· "+new Date(libItem.created_at).toLocaleDateString("es-AR")}</div>
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
                        <div style={{fontSize:12,color:C.textDim,marginTop:3}}>{(item.subject_name||"")+" Â· "+new Date(item.created_at).toLocaleDateString("es-AR")}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!dataLoading&&view==="smartbank"&&(
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"320px 1fr",gap:18}}>
              <div>
                <div data-tour="smartbank-import" style={card}>
                  <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8,marginBottom:12}}>IMPORTAR DEL BANCO</div>
                  <p style={{fontSize:12,color:C.textDim,marginBottom:12}}>Selecciona una evaluacion del banco para extraer sus preguntas automaticamente.</p>
                  {!bank.length?<p style={{fontSize:13,color:C.textDim}}>No hay evaluaciones en el banco todavia.</p>:bank.map(function(item){
                    return (
                      <div key={item.id} style={{padding:"8px 10px",borderRadius:4,marginBottom:4,border:"1px solid "+C.border,background:C.bg}}>
                        <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:2}}>{item.topic}</div>
                        <div style={{fontSize:11,color:C.textDim,marginBottom:6}}>{item.subject_name||""}</div>
                        <Btn v="sm" disabled={qiLoading} onClick={function(){extractQuestionsFromBank(item);}}>
                          {qiLoading?"Extrayendo...":<><i className="ti ti-brain" style={{fontSize:12,marginRight:3}}/>Extraer preguntas</>}
                        </Btn>
                      </div>
                    );
                  })}
                </div>
                <div style={card}>
                  <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8,marginBottom:12}}>FILTRAR POR MATERIA</div>
                  <select style={Object.assign({},sel,{width:"100%"})} value={qiFilter} onChange={function(e){setQiFilter(e.target.value);}}>
                    <option value="all">Todas las materias</option>
                    {[...new Set(questionItems.map(function(q){return q.subject_name;}))].filter(Boolean).map(function(s){return <option key={s} value={s}>{s}</option>;})}
                  </select>
                </div>
              </div>
              <div>
                <div data-tour="smartbank-list" style={card}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                    <div>
                      <div style={{fontSize:15,fontWeight:700,color:C.text}}>{"Banco inteligente ("+questionItems.length+" preguntas)"}</div>
                      <div style={{fontSize:12,color:C.textDim,marginTop:2}}>{qiSelected.length>0?qiSelected.length+" seleccionadas":"Selecciona preguntas para armar una evaluacion"}</div>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      {qiSelected.length>0&&(
                        <Btn onClick={buildExam} disabled={qiExamLoading}>
                          {qiExamLoading?"Armando...":<><i className="ti ti-file-plus" style={{fontSize:13,marginRight:4}}/>Armar evaluacion</>}
                        </Btn>
                      )}
                      {qiSelected.length>0&&<Btn v="ghost" st={{fontSize:12,padding:"5px 10px"}} onClick={function(){setQiSelected([]);}}>Limpiar</Btn>}
                    </div>
                  </div>
                  {!questionItems.length?(
                    <div style={{textAlign:"center",padding:"32px 0",color:C.textDim}}>
                      <i className="ti ti-brain" style={{fontSize:36,display:"block",marginBottom:10,color:C.textDim}}/>
                      <p>Importa preguntas del banco para empezar.</p>
                    </div>
                  ):(
                    <div>
                      {Object.entries(
                        questionItems
                          .filter(function(q){return qiFilter==="all"||q.subject_name===qiFilter;})
                          .reduce(function(acc,q){if(!acc[q.topic]) acc[q.topic]=[];acc[q.topic].push(q);return acc;},{})
                      ).map(function(entry){
                        var topic=entry[0];var qs=entry[1];
                        return (
                          <div key={topic} style={{marginBottom:16}}>
                            <div style={{fontSize:12,fontWeight:700,color:C.accent,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                              <i className="ti ti-tag" style={{fontSize:13}}/>
                              {topic}
                              <span style={{fontSize:11,color:C.textDim,fontWeight:400}}>({qs.length} preguntas)</span>
                            </div>
                            {qs.map(function(q){
                              var isSelected=qiSelected.includes(q.id);
                              return (
                                <div key={q.id} style={{padding:"10px 14px",borderRadius:4,marginBottom:6,border:"1px solid "+(isSelected?C.accent:C.border),background:isSelected?C.accentBg:C.bg,cursor:"pointer"}} onClick={function(){setQiSelected(function(prev){return isSelected?prev.filter(function(x){return x!==q.id;}):prev.concat([q.id]);});}}>
                                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                                    <div style={{flex:1}}>
                                      <div style={{fontSize:13,color:C.text,marginBottom:4}}>{q.question}</div>
                                      <div style={{display:"flex",gap:6}}>
                                        <Tag color={C.accent}>{q.type}</Tag>
                                        <Tag color={q.difficulty==="Avanzado"?C.red:q.difficulty==="Basico"?C.green:C.blue}>{q.difficulty}</Tag>
                                      </div>
                                    </div>
                                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                                      {isSelected&&<i className="ti ti-check" style={{fontSize:16,color:C.accent}}/>}
                                      <button style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim}} onClick={function(e){e.stopPropagation();dbDelQuestionItem(q.id).then(function(){setQuestionItems(function(prev){return prev.filter(function(x){return x.id!==q.id;});});setQiSelected(function(prev){return prev.filter(function(x){return x!==q.id;});});});}}>
                                        <i className="ti ti-trash" style={{fontSize:14}}/>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {qiExamLoading&&<div style={card}><Spin/></div>}
                {qiExamResult&&!qiExamLoading&&(
                  <div style={card}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
                      <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8}}>EVALUACION GENERADA</div>
                      <div style={{display:"flex",gap:8}}>
                        <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){saveLib(qiExamResult,"evaluacion","Evaluacion del Banco","Evaluacion "+new Date().toLocaleDateString("es-AR"));}}>
                          <><i className="ti ti-device-floppy" style={{fontSize:13,marginRight:4}}/>Guardar</>
                        </Btn>
                        <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportDocx("Evaluacion","Evaluacion",curSubj?curSubj.name:"",qiExamResult);}}>
                          <i className="ti ti-file-text" style={{fontSize:13,marginRight:4}}/>Word
                        </Btn>
                        <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportPdf("Evaluacion","Evaluacion",curSubj?curSubj.name:"",qiExamResult);}}>
                          <i className="ti ti-file-invoice" style={{fontSize:13,marginRight:4}}/>PDF
                        </Btn>
                      </div>
                    </div>
                    <MDView text={qiExamResult} maxH={600}/>
                  </div>
                )}
              </div>
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
                        <div style={{fontSize:12,color:C.textDim}}>{(item.subject_name||"")+" Â· "+new Date(item.created_at).toLocaleDateString("es-AR")}</div>
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
                <div data-tour="seq-form" style={card}>
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
                    setSeqLoading(true);setSeqStream("");
                    try{
                      var sys="Sos experto en planificacion curricular y diseno de secuencias didacticas. Responde en espanol rioplatense con Markdown.";
                      var r=await callClaude(sys,[{role:"user",content:userSequence(seqForm.topic,seqForm.n_classes,seqForm.level||(curSubj?curSubj.level:""),curSubj,seqForm.extra)}],6000,false,function(partial){setSeqStream(partial);});
                      var seq={subject_id:curSid,subject_name:curSubj?curSubj.name:"",topic:seqForm.topic,level:seqForm.level||(curSubj?curSubj.level:""),n_classes:seqForm.n_classes,content:r};
                      var saved=await dbAddSequence(authUser.id,seq);
                      setSequences(function(prev){return [saved].concat(prev);});setSeqView(saved);setSeqStream("");
                    }catch(e){alert(msgError(e));}
                    setSeqLoading(false);
                  }}>
                    {seqLoading?"Generando...":<><i className="ti ti-list-numbers" style={{fontSize:13,marginRight:4}}/>Generar secuencia</>}
                  </Btn>
                  <label style={Object.assign({},lbl,{marginTop:12})}>INSTRUCCIONES ADICIONALES (opcional)</label>
                  <textarea style={Object.assign({},inp,{height:70,resize:"vertical",marginBottom:12})} value={seqForm.extra||""} onChange={function(e){setSeqForm(Object.assign({},seqForm,{extra:e.target.value}));}} placeholder="Ej: enfoque en trabajo grupal, incluir uso de tecnologia, adaptar para alumnos con NEE..."/>
                  {!curSubj&&<p style={{fontSize:12,color:C.red,marginTop:8}}>Selecciona una materia primero.</p>}
                </div>
                <div data-tour="seq-list" style={card}>
                  <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8,marginBottom:12}}>{"GUARDADAS ("+sequences.length+")"}</div>
                  {!sequences.length?<p style={{fontSize:13,color:C.textDim}}>No hay secuencias todavia.</p>:
                    sequences.map(function(s){
                      return (
                        <div key={s.id} style={{padding:"8px 10px",borderRadius:4,marginBottom:4,cursor:"pointer",background:seqView&&seqView.id===s.id?C.accentBg:"transparent",border:"1px solid "+(seqView&&seqView.id===s.id?C.accent:"transparent"),display:"flex",justifyContent:"space-between",alignItems:"center"}}
                          onClick={function(){setSeqView(s);}}>
                          <div>
                            <div style={{fontSize:13,fontWeight:600,color:C.text}}>{s.topic}</div>
                            <div style={{fontSize:11,color:C.textDim}}>{s.subject_name+" Â· "+s.n_classes+" clases"}</div>
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
                {seqLoading&&(
                  <div style={card}>
                    {seqStream?(
                      <div>
                        <div style={{fontSize:11,color:C.accent,fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><Spin/>Generando secuencia...</div>
                        <MDView text={seqStream}/>
                      </div>
                    ):(
                      <Spin/>
                    )}
                  </div>
                )}
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
                        <div style={{fontSize:12,color:C.textDim,marginTop:3}}>{seqView.subject_name+" Â· "+seqView.n_classes+" clases Â· "+seqView.level}</div>
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
                <div data-tour="students-list" style={card}>
                  <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8,marginBottom:12}}>{"ALUMNOS â€” "+(curSubj?curSubj.name:"Sin materia")}</div>
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
                        <p style={{fontSize:11,color:C.textDim,marginTop:6,marginBottom:0}}>Col A: Nombre Â· Col B: Notas</p>
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
                        <div style={{fontSize:12,color:C.textDim,marginTop:3}}>{(curSubj?curSubj.name:"")+" Â· "+studentEvals.length+" evaluaciones"}</div>
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
                              <div style={{fontSize:11,color:C.textDim,marginTop:2}}>{(ev.rubric_name?ev.rubric_name+" Â· ":"")+new Date(ev.evaluated_at).toLocaleDateString("es-AR")}</div>
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
                        <div style={{fontSize:12,color:C.textDim,marginBottom:10}}>{(item.subject_name||"")+" Â· Por "+(item.user_name||"Docente")}</div>
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

          {!dataLoading&&view==="projects"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <h2 style={{fontSize:19,fontWeight:700,color:C.text,display:"flex",alignItems:"center",gap:8}}>
                  <i className="ti ti-topology-star" style={{fontSize:18,color:C.accent}}/>Proyectos Colaborativos
                </h2>
                <Btn onClick={function(){setProjectModal(true);setProjectForm({title:"",description:"",subjects:["","",""],emails:["","",""]});setProjectGenResult("");}}>
                  <i className="ti ti-plus" style={{fontSize:13,marginRight:4}}/>Nuevo proyecto
                </Btn>
              </div>

              {!currentProject?(
                <div>
                  {(projects.owned.length+projects.shared.length)===0?(
                    <div style={Object.assign({},card,{textAlign:"center",padding:"52px 24px",color:C.textDim})}>
                      <i className="ti ti-topology-star" style={{fontSize:44,display:"block",marginBottom:12,color:C.textDim}}/>
                      <h3 style={{color:C.textMuted,marginBottom:8}}>No hay proyectos todavia</h3>
                      <p style={{fontSize:13,marginBottom:16}}>Crea un proyecto interdisciplinario e invita a tus colegas.</p>
                      <Btn onClick={function(){setProjectModal(true);}}>
                        <i className="ti ti-plus" style={{fontSize:13,marginRight:4}}/>Crear primer proyecto
                      </Btn>
                    </div>
                  ):(
                    <div>
                      {projects.owned.length>0&&(
                        <div style={{marginBottom:24}}>
                          <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8,marginBottom:12}}>MIS PROYECTOS</div>
                          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
                            {projects.owned.map(function(p){
                              var members=(p.project_members||[]).filter(function(m){return m.status==="active";});
                              return (
                                <div key={p.id} style={{background:C.card,border:"1px solid "+C.border,borderRadius:4,padding:20,cursor:"pointer"}} onClick={function(){setCurrentProject(p);dbLoadProjectContents(p.id).then(setProjectContents);}}>
                                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                                    <h3 style={{fontSize:15,fontWeight:700,color:C.text}}>{p.title}</h3>
                                    <button style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim}} onClick={function(e){e.stopPropagation();dbDelProject(p.id).then(function(){dbLoadProjects(authUser.id).then(setProjects);});}}>
                                      <i className="ti ti-trash" style={{fontSize:14}}/>
                                    </button>
                                  </div>
                                  <p style={{fontSize:13,color:C.textMuted,marginBottom:12}}>{p.description}</p>
                                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                                    <i className="ti ti-users" style={{fontSize:14,color:C.accent}}/>
                                    <span style={{fontSize:12,color:C.textDim}}>{members.length+" colaborador"+(members.length!==1?"es":"")}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {projects.shared.length>0&&(
                        <div>
                          <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8,marginBottom:12}}>PROYECTOS EN LOS QUE PARTICIPO</div>
                          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
                            {projects.shared.map(function(p){
                              return (
                                <div key={p.id} style={{background:C.card,border:"1px solid "+C.border,borderRadius:4,padding:20,cursor:"pointer"}} onClick={function(){setCurrentProject(p);dbLoadProjectContents(p.id).then(setProjectContents);}}>
                                  <h3 style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:6}}>{p.title}</h3>
                                  <p style={{fontSize:13,color:C.textMuted}}>{p.description}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ):(
                <div>
                  <Btn v="ghost" st={{marginBottom:14,fontSize:12}} onClick={function(){setCurrentProject(null);setProjectContents([]);setProjectGenResult("");}}>
                    <i className="ti ti-arrow-left" style={{fontSize:13,marginRight:4}}/>Volver a proyectos
                  </Btn>
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 320px",gap:18}}>
                    <div>
                      <div style={card}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                          <div>
                            <h2 style={{fontSize:18,fontWeight:700,color:C.text,margin:0}}>{currentProject.title}</h2>
                            <p style={{fontSize:13,color:C.textMuted,marginTop:4}}>{currentProject.description}</p>
                          </div>
                          <div style={{display:"flex",gap:8}}>
                            <Btn v="secondary" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportDocx(currentProject.title,"Proyecto Interdisciplinario","",projectContents.map(function(c){return "## "+c.title+" ("+c.subject_name+")\n\n"+c.content;}).join("\n\n---\n\n"));}}>
                              <i className="ti ti-file-text" style={{fontSize:13,marginRight:4}}/>Exportar
                            </Btn>
                          </div>
                        </div>
                        <div style={{marginBottom:16}}>
                          <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8,marginBottom:10}}>GENERAR CONTENIDO PARA ESTE PROYECTO</div>
                          <div style={{display:"flex",gap:10,marginBottom:10,flexWrap:"wrap"}}>
                            <input style={Object.assign({},inp,{flex:1,minWidth:200})} value={projectGenResult.topic||""} onChange={function(e){setProjectGenResult(Object.assign({},projectGenResult,{topic:e.target.value}));}} placeholder="Tema del contenido..."/>
                            <select style={Object.assign({},sel,{minWidth:160})} value={projectGenResult.type||"actividad"} onChange={function(e){setProjectGenResult(Object.assign({},projectGenResult,{type:e.target.value}));}}>
                              {GEN_TYPES.map(function(g){return <option key={g.id} value={g.id}>{g.label}</option>;})}
                            </select>
                            <Btn disabled={projectGenLoading||!projectGenResult.topic} onClick={async function(){
                              setProjectGenLoading(true);
                              try{
                                var members=(currentProject.project_members||[]).filter(function(m){return m.status==="active";});
                                var materiasCtx=members.map(function(m){return m.subject_name;}).filter(Boolean).join(", ");
                                var gt3=GEN_TYPES.find(function(g){return g.id===(projectGenResult.type||"actividad");});
                                var sys="Sos experto en proyectos interdisciplinarios. Materia del docente: "+(curSubj?curSubj.name:"General")+". Materias colaboradoras: "+materiasCtx+". Responde en espanol rioplatense con Markdown.";
                                var usr=userGen(projectGenResult.type||"actividad",projectGenResult.topic,"Intermedio","Proyecto interdisciplinario que conecta: "+(curSubj?curSubj.name:"")+(materiasCtx?" con "+materiasCtx:""),curSubj);
                                var r=await callClaude(sys,[{role:"user",content:usr}]);
                                await dbAddProjectContent(authUser.id,currentProject.id,{subject_name:curSubj?curSubj.name:"General",type:projectGenResult.type||"actividad",type_name:gt3?gt3.label:"Contenido",title:projectGenResult.topic,content:r});
                                var updated=await dbLoadProjectContents(currentProject.id);
                                setProjectContents(updated);
                                setProjectGenResult("");
                              }catch(e){alert("Error: "+e.message);}
                              setProjectGenLoading(false);
                            }}>
                              {projectGenLoading?"Generando...":<><i className="ti ti-bolt" style={{fontSize:13,marginRight:4}}/>Generar</>}
                            </Btn>
                          </div>
                        </div>
                        {!projectContents.length?(
                          <div style={{textAlign:"center",padding:"32px 0",color:C.textDim}}>
                            <p style={{fontSize:13}}>No hay contenido todavia. GenerÃ¡ el primer material para este proyecto.</p>
                          </div>
                        ):projectContents.map(function(c){
                          var g=GEN_TYPES.find(function(g){return g.id===c.type;});
                          return (
                            <div key={c.id} style={{borderBottom:"1px solid "+C.border,padding:"14px 0"}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                                <div>
                                  <div style={{fontSize:14,fontWeight:700,color:C.text}}>{c.title}</div>
                                  <div style={{fontSize:11,color:C.textDim,marginTop:2,display:"flex",gap:8}}>
                                    <span>{c.subject_name}</span>
                                    <span>Â·</span>
                                    <span>{c.type_name}</span>
                                    <span>Â·</span>
                                    <span>{new Date(c.created_at).toLocaleDateString("es-AR")}</span>
                                  </div>
                                </div>
                                <div style={{display:"flex",gap:6}}>
                                  <Btn v="secondary" st={{fontSize:11,padding:"4px 10px"}} onClick={function(){exportDocx(c.title,c.type_name,c.subject_name,c.content);}}>
                                    <i className="ti ti-file-text" style={{fontSize:12}}/>
                                  </Btn>
                                  {c.user_id===authUser.id&&(
                                    <button style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim}} onClick={function(){dbDelProjectContent(c.id).then(function(){dbLoadProjectContents(currentProject.id).then(setProjectContents);});}}>
                                      <i className="ti ti-trash" style={{fontSize:14}}/>
                                    </button>
                                  )}
                                </div>
                              </div>
                              <MDView text={c.content.slice(0,600)+(c.content.length>600?"...":"")} maxH={200}/>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <div style={card}>
                        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Colaboradores</div>
                        {(currentProject.project_members||[]).filter(function(m){return m.status==="active";}).map(function(m){
                          return (
                            <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid "+C.border}}>
                              <div style={{width:32,height:32,borderRadius:"50%",background:C.accentBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:C.accent}}>
                                {(m.subject_name||"?").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{fontSize:13,fontWeight:600,color:C.text}}>{m.subject_name||"Colaborador"}</div>
                                <div style={{fontSize:11,color:C.textDim}}>{m.status==="active"?"Activo":"Pendiente"}</div>
                              </div>
                            </div>
                          );
                        })}
                        {currentProject.owner_id===authUser.id&&(
                          <div style={{marginTop:14}}>
                            <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8,marginBottom:10}}>INVITAR COLABORADOR</div>
                            <input style={Object.assign({},inp,{marginBottom:8})} value={inviteEmail} onChange={function(e){setInviteEmail(e.target.value);}} placeholder="Email del docente..."/>
                            <input style={Object.assign({},inp,{marginBottom:10})} value={inviteSubject} onChange={function(e){setInviteSubject(e.target.value);}} placeholder="Materia que dicta..."/>
                            <Btn st={{width:"100%",justifyContent:"center"}} onClick={async function(){
                              if(!inviteEmail||!inviteSubject) return;
                              try{
                                var invRes=await fetch("/api/invite-project",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({project_id:currentProject.id,email:inviteEmail,subject_name:inviteSubject})});
                              var invData=await invRes.json();
                              if(!invRes.ok) throw new Error(invData.error);
                                var updated=await dbLoadProjects(authUser.id);
                                setProjects(updated);
                                var updatedProject=updated.owned.find(function(p){return p.id===currentProject.id;});
                                if(updatedProject) setCurrentProject(updatedProject);
                                setInviteEmail("");setInviteSubject("");
                                alert("Colaborador agregado exitosamente.");
                              }catch(e){alert("Error: "+e.message);}
                            }}>
                              <i className="ti ti-user-plus" style={{fontSize:13,marginRight:4}}/>Invitar
                            </Btn>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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
            <h2 style={{margin:"0 0 18px",fontSize:18,fontWeight:700,color:C.text}}>{"Nueva evaluacion â€” "+selectedStudent.name}</h2>
            <label style={lbl}>TEMA / ACTIVIDAD *</label>
            <input style={Object.assign({},inp,{marginBottom:12})} value={evalForm.topic} onChange={function(e){setEvalForm(Object.assign({},evalForm,{topic:e.target.value}));}} placeholder="Ej: Trabajo practico NÂ°2"/>
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

      {projectModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999}}>
          <div style={{background:C.surf,border:"1px solid "+C.border,borderRadius:4,padding:26,width:540,maxWidth:"92vw",maxHeight:"90vh",overflow:"auto"}}>
            <h2 style={{margin:"0 0 18px",fontSize:18,fontWeight:700,color:C.text}}>Nuevo Proyecto Interdisciplinario</h2>
            <label style={lbl}>TITULO DEL PROYECTO *</label>
            <input style={Object.assign({},inp,{marginBottom:12})} value={projectForm.title} onChange={function(e){setProjectForm(Object.assign({},projectForm,{title:e.target.value}));}} placeholder="Ej: El agua en la vida cotidiana"/>
            <label style={lbl}>DESCRIPCION</label>
            <textarea style={Object.assign({},inp,{height:70,resize:"vertical",marginBottom:16})} value={projectForm.description} onChange={function(e){setProjectForm(Object.assign({},projectForm,{description:e.target.value}));}} placeholder="Breve descripcion del proyecto y sus objetivos..."/>
            <label style={lbl}>MATERIAS COLABORADORAS</label>
            <p style={{fontSize:12,color:C.textDim,marginBottom:8}}>Ingresa las materias que van a participar (ademas de la tuya).</p>
            {[0,1,2].map(function(i){
              return (
                <input key={i} style={Object.assign({},inp,{marginBottom:8})} value={projectForm.subjects[i]||""} onChange={function(e){var s=[...projectForm.subjects];s[i]=e.target.value;setProjectForm(Object.assign({},projectForm,{subjects:s}));}} placeholder={"Materia "+(i+2)+" (opcional)"}/>
              );
            })}
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:20}}>
              <Btn v="ghost" st={{fontSize:13}} onClick={function(){setProjectModal(false);}}>Cancelar</Btn>
              <Btn disabled={projectLoading||!projectForm.title.trim()} onClick={async function(){
                setProjectLoading(true);
                try{
                  var p=await dbAddProject(authUser.id,{title:projectForm.title,description:projectForm.description});
                  var updated=await dbLoadProjects(authUser.id);
                  setProjects(updated);
                  setProjectModal(false);
                  setCurrentProject(p);
                  setProjectContents([]);
                }catch(e){alert("Error: "+e.message);}
                setProjectLoading(false);
              }}>
                {projectLoading?"Creando...":<><i className="ti ti-plus" style={{fontSize:13,marginRight:4}}/>Crear proyecto</>}
              </Btn>
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
              <i className={pdfLoading?"ti ti-loader":"ti ti-file-upload"} style={{fontSize:14}}/>
              {pdfLoading?(pdfStage||"Procesando..."):"Subir PDF"}
              <input type="file" accept=".pdf" multiple style={{display:"none"}} disabled={pdfLoading} onChange={async function(e){
                var files=Array.from(e.target.files);
                if(!files.length) return;
                setPdfLoading(true);
                for(var i=0;i<files.length;i++){
                  try{
                    setPdfStage("Subiendo archivo...");
                    var result=await processPdf(files[i],function(stage){setPdfStage(stage);});
                    setSfPdfs(function(prev){return prev.concat([result]);});
                  }catch(err){alert("Error procesando "+files[i].name+": "+err.message);}
                }
                setPdfLoading(false);setPdfStage("");
                e.target.value="";
              }}/>
            </label>
            {pdfLoading&&(
              <div style={{marginTop:4,marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <div style={{width:16,height:16,border:"2px solid #d4cfc6",borderTop:"2px solid "+C.accent,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                  <span style={{fontSize:12,color:C.accent,fontWeight:600}}>{pdfStage||"Procesando..."}</span>
                </div>
                <div style={{background:C.bg,borderRadius:4,height:5,overflow:"hidden",position:"relative"}}>
                  <div style={{position:"absolute",height:5,width:"40%",background:C.accent,borderRadius:4,animation:"indeterminate 1.3s ease-in-out infinite"}}/>
                </div>
                <p style={{fontSize:11,color:C.textDim,marginTop:6}}>Puede tardar hasta un minuto en documentos largos. No cierres esta ventana.</p>
                <style>{"@keyframes spin{to{transform:rotate(360deg)}}@keyframes indeterminate{0%{left:-40%}100%{left:100%}}"}</style>
              </div>
            )}
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

    {authUser && (
        <WelcomeModal
          userId={authUser.id}
          onStartTour={() => launchTour("dashboard")}
          onDismiss={() => {}}
        />
      )}
      <TourTooltip
        activeTour={activeTour}
        onNext={nextStep}
        onPrev={prevStep}
        onClose={closeTour}
      />
    </div>
  );
}


