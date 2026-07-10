import { useState, useEffect, useRef } from "react";
import { exportDocx, exportPdf, exportInformeCorregido, exportInformeMarcado, exportInformesZip } from "./exportUtils.js";
import { sysComunicado, userComunicado, sysActa, userActa, sysCorreccionInforme, userCorreccionInforme, sysAcompanamiento, userAcompanamiento, instruccionTramite, sysRevisionDocumento, userRevisionDocumento } from "./directivoPrompts.js";

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

const DIR_NAV = [
  { id:"comunicados", label:"Comunicados", icon:"ti-speakerphone" },
  { id:"actas",       label:"Actas",       icon:"ti-file-description" },
  { id:"informes",    label:"Corrección de Informes", icon:"ti-report" },
  { id:"revision",    label:"Revisión de Documentos", icon:"ti-file-search" },
  { id:"acompanamiento", label:"Acompañamiento Docente", icon:"ti-users-group" },
  { id:"tramites",    label:"Asistente de Trámites", icon:"ti-clipboard-text" },
];

async function callClaude(system, messages, maxTokens, onStream) {
  if (!maxTokens) maxTokens = 4000;
  var useStreaming = typeof onStream === "function";
  var res = await fetch("/api/generate", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ system, messages, maxTokens, stream:useStreaming }),
  });
  if (!res.ok) { var err = {}; try { err = await res.json(); } catch(e) {} throw new Error(err.error || "Error " + res.status); }
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

function MDView({text,maxH}) {
  if(!maxH) maxH=560;
  var h=text
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/\*\*\*(.+?)\*\*\*/g,"<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*([^\n*]+?)\*/g,"<em>$1</em>")
    .replace(/^#### (.+)$/gm,"<h4>$1</h4>").replace(/^### (.+)$/gm,"<h3>$1</h3>")
    .replace(/^## (.+)$/gm,"<h2>$1</h2>").replace(/^# (.+)$/gm,"<h1>$1</h1>")
    .replace(/^---$/gm,"<hr/>")
    .replace(/^[-*] (.+)$/gm,"<li>$1</li>").replace(/^\d+\. (.+)$/gm,"<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g,function(m){return "<ul>"+m+"</ul>";})
    .replace(/\n\n+/g,"</p><p>").replace(/\n/g,"<br/>");
  return (
    <div style={{background:"#f9f9f7",border:"1px solid #d4cfc6",borderRadius:4,padding:"15px 19px",maxHeight:maxH,overflow:"auto",lineHeight:1.75,fontSize:14,fontFamily:"Quicksand,sans-serif"}}>
      <div dangerouslySetInnerHTML={{__html:"<p>"+h+"</p>"}}/>
    </div>
  );
}

function Btn({children,onClick,disabled,v,st}) {
  if(!st) st={};
  var bg = v==="ghost"?"transparent":C.accent;
  var col = v==="ghost"?C.text:"#fff";
  var bd = v==="ghost"?"1px solid #d4cfc6":"none";
  return <button onClick={disabled?undefined:onClick} disabled={disabled} style={Object.assign({padding:"9px 18px",borderRadius:4,cursor:disabled?"not-allowed":"pointer",fontWeight:600,fontSize:13,fontFamily:"Quicksand,sans-serif",opacity:disabled?.45:1,background:bg,color:col,border:bd},st)}>{children}</button>;
}

export default function DirectivoDashboard({ authUser, onVerComoDocente, onSignOut }) {
  var [view,setView] = useState("comunicados");
  var [isMobile,setIsMobile] = useState(typeof window!=="undefined" && window.innerWidth<768);
  var [mobileMenu,setMobileMenu] = useState(false);
  useEffect(function(){
    function handleResize(){setIsMobile(window.innerWidth<768);}
    window.addEventListener("resize",handleResize);
    return function(){window.removeEventListener("resize",handleResize);};
  },[]);
  var [isMobile,setIsMobile] = useState(typeof window!=="undefined" && window.innerWidth<768);
  var [mobileMenu,setMobileMenu] = useState(false);
  useEffect(function(){
    function handleResize(){setIsMobile(window.innerWidth<768);}
    window.addEventListener("resize",handleResize);
    return function(){window.removeEventListener("resize",handleResize);};
  },[]);
  var userName = (authUser && authUser.user_metadata && authUser.user_metadata.name) || "Directivo";

  // Estado comunicados
  var [comDest,setComDest] = useState("Las familias");
  var [comAsunto,setComAsunto] = useState("");
  var [comDetalles,setComDetalles] = useState("");
  var [comTono,setComTono] = useState("formal");
  var [comResult,setComResult] = useState("");
  var [comLoading,setComLoading] = useState(false);
  var [comErr,setComErr] = useState("");
  // Estado actas
  var [actTipo,setActTipo] = useState("Reunión de personal");
  var [actDatos,setActDatos] = useState("");
  var [actTemas,setActTemas] = useState("");
  var [actAcuerdos,setActAcuerdos] = useState("");
  var [actResult,setActResult] = useState("");
  var [actLoading,setActLoading] = useState(false);
  var [actErr,setActErr] = useState("");
  var [actFotoLoading,setActFotoLoading] = useState(false);
  var [actHojas,setActHojas] = useState(0);
  var [actFotoErr,setActFotoErr] = useState("");
  var [actGrabando,setActGrabando] = useState(false);
  var [actAudioLoading,setActAudioLoading] = useState(false);
  var [actAudioErr,setActAudioErr] = useState("");
  var [actTiempo,setActTiempo] = useState(0);

  async function generarActa(){
    if(!actTemas.trim()) return;
    setActLoading(true);setActResult("");setActErr("");
    try{
      var r = await callClaude(sysActa(), [{role:"user",content:userActa(actTipo,actDatos,actTemas,actAcuerdos)}], 3500, function(partial){setActResult(partial);});
      setActResult(r);
    }catch(e){setActErr("Error: "+e.message);}
    setActLoading(false);
  }

  async function agregarFotoActa(file){
    if(!file) return;
    setActFotoLoading(true);setActFotoErr("");
    try{
      var base64 = await new Promise(function(resolve,reject){
        var reader = new FileReader();
        reader.onload = function(ev){ resolve(ev.target.result.split(",")[1]); };
        reader.onerror = function(){ reject(new Error("No se pudo leer la imagen")); };
        reader.readAsDataURL(file);
      });
      var mediaType = file.type || "image/jpeg";
      var res = await fetch("/api/extract-text",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({base64:base64,mediaType:mediaType})});
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || "Error al leer la imagen");
      setActHojas(function(h){
        var nueva = h+1;
        setActTemas(function(prev){return prev?(prev+"\n\n--- HOJA "+nueva+" ---\n"+data.text):("--- HOJA "+nueva+" ---\n"+data.text);});
        return nueva;
      });
 }catch(e){setActFotoErr("Error: "+e.message);}
    setActFotoLoading(false);
  }

  var mediaRecorderRef = useRef(null);
  var audioChunksRef = useRef([]);
  var timerRef = useRef(null);

  async function iniciarGrabacion(){
    setActAudioErr("");
    try{
      var stream = await navigator.mediaDevices.getUserMedia({audio:true});
      var recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = function(e){ if(e.data.size>0) audioChunksRef.current.push(e.data); };
      recorder.onstop = function(){
        stream.getTracks().forEach(function(t){t.stop();});
        procesarAudioGrabado();
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setActGrabando(true);
      setActTiempo(0);
      timerRef.current = setInterval(function(){ setActTiempo(function(t){return t+1;}); }, 1000);
    }catch(e){
      setActAudioErr("No se pudo acceder al microfono. Revisa los permisos del navegador.");
    }
  }

  function detenerGrabacion(){
    if(mediaRecorderRef.current && actGrabando){
      mediaRecorderRef.current.stop();
      setActGrabando(false);
      if(timerRef.current) clearInterval(timerRef.current);
    }
  }

  async function procesarAudioGrabado(){
    setActAudioLoading(true);setActAudioErr("");
    try{
      var blob = new Blob(audioChunksRef.current, {type:"audio/webm"});
      if(blob.size > 28*1024*1024) throw new Error("La grabacion es demasiado larga. Intenta con reuniones mas cortas.");
      var base64 = await new Promise(function(resolve,reject){
        var reader = new FileReader();
        reader.onload = function(ev){ resolve(ev.target.result.split(",")[1]); };
        reader.onerror = function(){ reject(new Error("No se pudo procesar el audio")); };
        reader.readAsDataURL(blob);
      });
      var res = await fetch("/api/transcribir-audio",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({base64:base64,mimeType:"audio/webm"})});
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || "Error al transcribir");
      setActTemas(function(prev){return prev?(prev+"\n\n--- TRANSCRIPCION DE LA REUNION ---\n"+data.text):("--- TRANSCRIPCION DE LA REUNION ---\n"+data.text);});
    }catch(e){setActAudioErr("Error: "+e.message);}
    setActAudioLoading(false);
  }

  function formatTiempo(s){
    var m = Math.floor(s/60);
    var sec = s%60;
    return m+":"+(sec<10?"0":"")+sec;
  }

// Estado correccion de informes
  var [infNivel,setInfNivel] = useState("Sala de 5 años");
  var [infPrioridad,setInfPrioridad] = useState("");
  var [infFile,setInfFile] = useState(null);
  var [infLoading,setInfLoading] = useState(false);
  var [infErr,setInfErr] = useState("");
  var [infResult,setInfResult] = useState(null);

  async function extraerTextoInforme(file){
    if(/\.pdf$/i.test(file.name)){
      var base64 = await new Promise(function(resolve,reject){
        var reader = new FileReader();
        reader.onload = function(e){ resolve(e.target.result.split(",")[1]); };
        reader.onerror = function(){ reject(new Error("No se pudo leer el archivo")); };
        reader.readAsDataURL(file);
      });
      var res = await fetch("/api/extraer-texto-pdf",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ base64:base64 }),
      });
      if(!res.ok){ var err={}; try{err=await res.json();}catch(e){} throw new Error(err.error||"Error al leer el PDF"); }
      var data = await res.json();
      return data.text;
    } else {
      var mammoth = await import("mammoth");
      var buffer = await file.arrayBuffer();
      var extraction = await mammoth.extractRawText({arrayBuffer:buffer});
      return extraction.value;
    }
  }
  async function corregirInforme(){
    if(!infFile) return;
    setInfLoading(true);setInfErr("");setInfResult(null);
    try{
      var texto = await extraerTextoInforme(infFile);
      if(!texto || !texto.trim()) throw new Error("No se pudo extraer texto del documento.");

      var sys = sysCorreccionInforme();
      var usr = userCorreccionInforme(infNivel, texto, infPrioridad);
      var r = await callClaude(sys, [{role:"user",content:usr}], 4000);

      var nombreAlumno = infFile.name.replace(/\.(docx|doc|pdf)$/i,"");
      setInfResult({nombre:nombreAlumno, textoOriginal:texto, textoCorregido:r.trim()});
    }catch(e){setInfErr("Error: "+e.message);}
    setInfLoading(false);
  }
// Estado correccion por lote (ZIP)
  var [infZip,setInfZip] = useState(null);
  var [infZipLoading,setInfZipLoading] = useState(false);
  var [infZipProgress,setInfZipProgress] = useState(0);
  var [infZipTotal,setInfZipTotal] = useState(0);
  var [infZipErr,setInfZipErr] = useState("");
  var [infZipDone,setInfZipDone] = useState(0);

  async function corregirLote(){
    if(!infZip) return;
    setInfZipLoading(true);setInfZipErr("");setInfZipProgress(0);setInfZipDone(0);
    try{
      var JSZip = (await import("jszip")).default;
      var mammoth = await import("mammoth");
      var zip = await JSZip.loadAsync(infZip);

      var docxFiles = [];
      zip.forEach(function(path, file){
        if(/\.(docx|pdf)$/i.test(path) && !path.startsWith("__MACOSX") && !file.dir) docxFiles.push(file);
      });

      if(!docxFiles.length) throw new Error("El ZIP no contiene archivos .docx ni .pdf");
      setInfZipTotal(docxFiles.length);

      var informes = [];
      for(var i=0;i<docxFiles.length;i++){
        setInfZipProgress(i+1);
        try{
          var nombreArch = docxFiles[i].name.split("/").pop();
          var texto;
          if(/\.pdf$/i.test(nombreArch)){
            var pdfBuffer = await docxFiles[i].async("base64");
            var resPdf = await fetch("/api/extraer-texto-pdf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({base64:pdfBuffer})});
            if(!resPdf.ok) continue;
            var dataPdf = await resPdf.json();
            texto = dataPdf.text;
          } else {
            var buffer = await docxFiles[i].async("arraybuffer");
            var extraction = await mammoth.extractRawText({arrayBuffer:buffer});
            texto = extraction.value;
          }
          if(!texto || !texto.trim()) continue;

          var r = await callClaude(sysCorreccionInforme(), [{role:"user",content:userCorreccionInforme(infNivel, texto, infPrioridad)}], 4000);

          var nombre = nombreArch.replace(/\.(docx|pdf)$/i,"");
          informes.push({nombre:nombre, textoCorregido:r.trim()});
          setInfZipDone(informes.length);
        }catch(e){ /* salteamos el que falle y seguimos */ }
      }

      if(!informes.length) throw new Error("No se pudo procesar ningún informe del ZIP.");

      var exportMod = await import("./exportUtils.js");
      await exportMod.exportInformesCorregidosZip(informes);
    }catch(e){setInfZipErr("Error: "+e.message);}
    setInfZipLoading(false);
  }

  // Estado acompañamiento docente
  var [acoTipo,setAcoTipo] = useState("completo");
  var [acoFoco,setAcoFoco] = useState("Gestión del aula");
  var [acoContexto,setAcoContexto] = useState("");
  var [acoSituacion,setAcoSituacion] = useState("");
  var [acoResult,setAcoResult] = useState("");
  var [acoLoading,setAcoLoading] = useState(false);
  var [acoErr,setAcoErr] = useState("");

  async function generarAcompanamiento(){
    if(!acoSituacion.trim()) return;
    setAcoLoading(true);setAcoResult("");setAcoErr("");
    try{
      var r = await callClaude(sysAcompanamiento(), [{role:"user",content:userAcompanamiento(acoTipo,acoFoco,acoContexto,acoSituacion)}], 4000, function(partial){setAcoResult(partial);});
      setAcoResult(r);
    }catch(e){setAcoErr("Error: "+e.message);}
    setAcoLoading(false);
  }
// Estado asistente de tramites
  var [traFile,setTraFile] = useState(null);
  var [traTipo,setTraTipo] = useState("explicar");
  var [traResult,setTraResult] = useState("");
  var [traLoading,setTraLoading] = useState(false);
  var [traErr,setTraErr] = useState("");

  async function procesarTramite(){
    if(!traFile) return;
    setTraLoading(true);setTraResult("");setTraErr("");
    try{
      var base64 = await new Promise(function(resolve,reject){
        var reader = new FileReader();
        reader.onload = function(e){ resolve(e.target.result.split(",")[1]); };
        reader.onerror = function(){ reject(new Error("No se pudo leer el archivo")); };
        reader.readAsDataURL(traFile);
      });

      var res = await fetch("/api/procesar-tramite",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ base64:base64, instruccion:instruccionTramite(traTipo) }),
      });
      if(!res.ok){ var err={}; try{err=await res.json();}catch(e){} throw new Error(err.error||"Error "+res.status); }

      var reader2 = res.body.getReader();
      var decoder = new TextDecoder();
      var fullText = "";
      while(true){
        var result = await reader2.read();
        if(result.done) break;
        var chunk = decoder.decode(result.value,{stream:true});
        var lines = chunk.split("\n");
        for(var i=0;i<lines.length;i++){
          var line = lines[i];
          if(!line.startsWith("data: ")) continue;
          var data2 = line.slice(6);
          if(data2==="[DONE]") break;
          try{
            var parsed = JSON.parse(data2);
            if(parsed.text){ fullText += parsed.text; setTraResult(fullText); }
            if(parsed.error) throw new Error(parsed.error);
          }catch(e){}
        }
      }
    }catch(e){setTraErr("Error: "+e.message);}
    setTraLoading(false);
  }
  // Estado revision de documentos
  var [revTipo,setRevTipo] = useState("Planificación anual");
  var [revCriterios,setRevCriterios] = useState("");
  var [revFile,setRevFile] = useState(null);
  var [revLoading,setRevLoading] = useState(false);
  var [revErr,setRevErr] = useState("");
  var [revResult,setRevResult] = useState(null);
  var [revZip,setRevZip] = useState(null);
  var [revZipLoading,setRevZipLoading] = useState(false);
  var [revZipProgress,setRevZipProgress] = useState(0);
  var [revZipTotal,setRevZipTotal] = useState(0);
  var [revZipDone,setRevZipDone] = useState(0);
  var [revZipErr,setRevZipErr] = useState("");

  async function revisarDocumento(){
    if(!revFile) return;
    setRevLoading(true);setRevErr("");setRevResult(null);
    try{
      var texto = await extraerTextoInforme(revFile);
      if(!texto || !texto.trim()) throw new Error("No se pudo extraer texto del documento.");
      var r = await callClaude(sysRevisionDocumento(), [{role:"user",content:userRevisionDocumento(revTipo, texto, revCriterios)}], 3000);
      var clean = r.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
      var observaciones = JSON.parse(clean);
      var nombre = revFile.name.replace(/\.(docx|doc|pdf)$/i,"");
      setRevResult({nombre:nombre, texto:texto, observaciones:observaciones});
    }catch(e){setRevErr("Error: "+e.message);}
    setRevLoading(false);
  }

  async function revisarLote(){
    if(!revZip) return;
    setRevZipLoading(true);setRevZipErr("");setRevZipProgress(0);setRevZipDone(0);
    try{
      var JSZip = (await import("jszip")).default;
      var mammoth = await import("mammoth");
      var zip = await JSZip.loadAsync(revZip);
      var files = [];
      zip.forEach(function(path, file){
        if(/\.(docx|pdf)$/i.test(path) && !path.startsWith("__MACOSX") && !file.dir) files.push(file);
      });
      if(!files.length) throw new Error("El ZIP no contiene archivos .docx ni .pdf");
      setRevZipTotal(files.length);

      var docs = [];
      for(var i=0;i<files.length;i++){
        setRevZipProgress(i+1);
        try{
          var nombreArch = files[i].name.split("/").pop();
          var texto;
          if(/\.pdf$/i.test(nombreArch)){
            var pdfBuffer = await files[i].async("base64");
            var resPdf = await fetch("/api/extraer-texto-pdf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({base64:pdfBuffer})});
            if(!resPdf.ok) continue;
            var dataPdf = await resPdf.json();
            texto = dataPdf.text;
          } else {
            var buffer = await files[i].async("arraybuffer");
            var extraction = await mammoth.extractRawText({arrayBuffer:buffer});
            texto = extraction.value;
          }
          if(!texto || !texto.trim()) continue;

          var r = await callClaude(sysRevisionDocumento(), [{role:"user",content:userRevisionDocumento(revTipo, texto, revCriterios)}], 3000);
          var clean = r.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
          var observaciones = JSON.parse(clean);
          var nombre = nombreArch.replace(/\.(docx|pdf)$/i,"");
          docs.push({nombre:nombre, texto:texto, sugerencias:observaciones});
          setRevZipDone(docs.length);
        }catch(e){}
      }
      if(!docs.length) throw new Error("No se pudo procesar ningún documento del ZIP.");
      var exportMod = await import("./exportUtils.js");
      await exportMod.exportInformesZip(docs);
    }catch(e){setRevZipErr("Error: "+e.message);}
    setRevZipLoading(false);
  }
  async function generarComunicado(){
    if(!comAsunto.trim()) return;
    setComLoading(true);setComResult("");setComErr("");
    try{
      var r = await callClaude(sysComunicado(), [{role:"user",content:userComunicado(comDest,comAsunto,comDetalles,comTono)}], 3000, function(partial){setComResult(partial);});
      setComResult(r);
    }catch(e){setComErr("Error: "+e.message);}
    setComLoading(false);
  }

  return (
    <div style={{display:"flex",height:"100vh",background:C.bg,color:C.text,fontFamily:"Quicksand,sans-serif",overflow:"hidden"}}>
      {isMobile&&mobileMenu&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:9998}} onClick={function(){setMobileMenu(false);}}/>
      )}
      <div style={{width:isMobile?(mobileMenu?240:0):218,minWidth:isMobile?(mobileMenu?240:0):218,background:"#0D3559",display:"flex",flexDirection:"column",overflow:"hidden",overflowY:isMobile?"auto":"hidden",transition:"all .22s",position:isMobile?"fixed":"relative",top:0,left:0,height:isMobile?"100dvh":"auto",zIndex:isMobile?9999:"auto"}}>
        <div style={{padding:"16px 16px",borderBottom:"1px solid rgba(255,255,255,.1)"}}>
          <span style={{fontSize:15,fontWeight:700,color:"#fff"}}>Aula<span style={{color:"#26C3D4"}}>X</span>pro</span>
          <div style={{fontSize:11,color:"#7aaabf",marginTop:4}}>Panel de Directivos</div>
        </div>
        <nav style={{flex:1,padding:"8px 0",overflowY:"auto"}}>
          {DIR_NAV.map(function(n){
            return (
              <div key={n.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",cursor:"pointer",margin:"2px 8px",borderRadius:4,background:view===n.id?"rgba(38,195,212,.15)":"transparent",color:view===n.id?"#26C3D4":"#7aaabf",fontSize:13}} onClick={function(){setView(n.id);if(isMobile)setMobileMenu(false);}}>
                <i className={"ti "+n.icon} style={{fontSize:17,minWidth:22}}/>
                <span>{n.label}</span>
              </div>
            );
          })}
        </nav>
        <div style={{padding:"12px",borderTop:"1px solid rgba(255,255,255,.1)",display:"flex",flexDirection:"column",gap:8}}>
          <button onClick={onVerComoDocente} style={{background:"transparent",border:"1px solid #26C3D4",color:"#26C3D4",borderRadius:4,padding:"7px 0",cursor:"pointer",fontWeight:600,fontSize:12,fontFamily:"Quicksand,sans-serif"}}>Ver como docente</button>
          <button onClick={onSignOut} style={{background:"transparent",border:"none",color:"#7aaabf",cursor:"pointer",fontSize:11,fontFamily:"Quicksand,sans-serif"}}>Cerrar sesión</button>
        </div>
      </div>

      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{background:C.surf,borderBottom:"1px solid "+C.border,padding:isMobile?"0 16px":"0 24px",display:"flex",alignItems:"center",gap:12,minHeight:54}}>
          {isMobile&&(
            <button style={{background:"transparent",border:"none",cursor:"pointer",color:C.text,padding:4,display:"flex"}} onClick={function(){setMobileMenu(!mobileMenu);}}>
              <i className="ti ti-menu-2" style={{fontSize:22}}/>
            </button>
          )}
          <h1 style={{margin:0,fontSize:16,fontWeight:700,color:C.text,flex:1}}>{(DIR_NAV.find(function(n){return n.id===view;})||{}).label}</h1>
          <div style={{fontSize:13,color:C.textMuted}}>{userName}</div>
        </div>

        <div style={{flex:1,overflow:"auto",padding:"22px 26px"}}>
          {view==="comunicados"&&(
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"360px 1fr",gap:18}}>
              <div style={card}>
                <h3 style={{margin:"0 0 4px",fontSize:17,fontWeight:700,color:C.text}}>Generar comunicado</h3>
                <p style={{fontSize:13,color:C.textDim,marginBottom:18}}>Completá los datos y la IA redacta el comunicado listo para enviar.</p>
                <label style={lbl}>DESTINATARIO</label>
                <select style={Object.assign({},sel,{width:"100%",marginBottom:12})} value={comDest} onChange={function(e){setComDest(e.target.value);}}>
                  {["Las familias","El cuerpo docente","Los alumnos","Toda la comunidad educativa"].map(function(d){return <option key={d}>{d}</option>;})}
                </select>
                <label style={lbl}>ASUNTO *</label>
                <input style={Object.assign({},inp,{marginBottom:12})} value={comAsunto} onChange={function(e){setComAsunto(e.target.value);}} placeholder="Ej: Suspensión de clases por jornada docente"/>
                <label style={lbl}>DATOS A INCLUIR (opcional)</label>
                <textarea style={Object.assign({},inp,{height:110,resize:"vertical",marginBottom:12})} value={comDetalles} onChange={function(e){setComDetalles(e.target.value);}} placeholder="Fechas, horarios, lugares, instrucciones..."/>
                <label style={lbl}>TONO</label>
                <div style={{display:"flex",gap:6,marginBottom:18}}>
                  {[{id:"formal",label:"Formal"},{id:"cordial",label:"Cordial"},{id:"urgente",label:"Urgente"}].map(function(t){
                    return <button key={t.id} style={{flex:1,padding:"7px 0",borderRadius:4,border:"1px solid "+(comTono===t.id?C.accent:C.border),background:comTono===t.id?C.accentBg:"transparent",color:comTono===t.id?C.accent:C.textMuted,cursor:"pointer",fontWeight:comTono===t.id?700:400,fontSize:12,fontFamily:"Quicksand,sans-serif"}} onClick={function(){setComTono(t.id);}}>{t.label}</button>;
                  })}
                </div>
                <Btn onClick={generarComunicado} disabled={comLoading||!comAsunto.trim()} st={{width:"100%",justifyContent:"center"}}>
                  {comLoading?"Generando...":"Generar comunicado"}
                </Btn>
                {comErr&&<div style={{marginTop:12,color:C.red,fontSize:13,background:"#fee2e2",padding:"10px 14px",borderRadius:4}}>{comErr}</div>}
              </div>
              <div>
                {comResult?(
                  <div style={card}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                      <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8}}>COMUNICADO GENERADO</div>
                      <div style={{display:"flex",gap:8}}>
                        <Btn v="ghost" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportDocx(comAsunto,"Comunicado","",comResult);}}>Word</Btn>
                        <Btn v="ghost" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportPdf(comAsunto,"Comunicado","",comResult);}}>PDF</Btn>
                      </div>
                    </div>
                    <MDView text={comResult}/>
                  </div>
                ):(
                  <div style={Object.assign({},card,{textAlign:"center",padding:"56px 24px",color:C.textDim})}>
                    <i className="ti ti-speakerphone" style={{fontSize:44,display:"block",marginBottom:12,color:C.textDim}}/>
                    <h3 style={{color:C.textMuted,marginBottom:8}}>El comunicado aparecerá acá</h3>
                    <p style={{fontSize:13}}>Completá el formulario y generá tu primer comunicado.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {view==="actas"&&(
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"360px 1fr",gap:18}}>
              <div style={card}>
                <h3 style={{margin:"0 0 4px",fontSize:17,fontWeight:700,color:C.text}}>Generar acta</h3>
                <p style={{fontSize:13,color:C.textDim,marginBottom:18}}>Tirá tus notas de la reunión y la IA arma el acta formal.</p>
                <label style={lbl}>TIPO DE ACTA</label>
                <select style={Object.assign({},sel,{width:"100%",marginBottom:12})} value={actTipo} onChange={function(e){setActTipo(e.target.value);}}>
                  {["Reunión de personal","Reunión con familias","Acto escolar","Entrevista","Otra"].map(function(t){return <option key={t}>{t}</option>;})}
                </select>
                <label style={lbl}>FECHA Y PARTICIPANTES</label>
                <input style={Object.assign({},inp,{marginBottom:12})} value={actDatos} onChange={function(e){setActDatos(e.target.value);}} placeholder="Ej: 24/06/2026, equipo docente de primaria"/>
                <label style={lbl}>TEMAS TRATADOS *</label>
                <textarea style={Object.assign({},inp,{height:130,resize:"vertical",marginBottom:12})} value={actTemas} onChange={function(e){setActTemas(e.target.value);}} placeholder="Escribí tus notas en bruto de lo que se trató..."/>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
                  <label style={{display:"inline-flex",alignItems:"center",gap:6,background:C.surf,border:"1px solid "+C.border,borderRadius:4,padding:"7px 14px",cursor:actFotoLoading?"not-allowed":"pointer",fontSize:12,fontWeight:600,color:C.text,opacity:actFotoLoading?.6:1}}>
                    <i className="ti ti-camera" style={{fontSize:14}}/>
                    {actFotoLoading?"Leyendo imagen...":(actHojas>0?"Agregar otra hoja":"Fotografiar notas")}
                    <input type="file" accept="image/*" capture="environment" style={{display:"none"}} disabled={actFotoLoading} onChange={function(e){if(e.target.files[0])agregarFotoActa(e.target.files[0]);e.target.value="";}}/>
                  </label>
                  {actHojas>0&&(
                    <span style={{fontSize:12,color:C.accent,fontWeight:600}}><i className="ti ti-file-check" style={{fontSize:13,marginRight:3}}/>{actHojas} {actHojas===1?"hoja":"hojas"}</span>
                  )}
                  {actHojas>0&&(
                    <button style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.textDim,textDecoration:"underline"}} onClick={function(){setActHojas(0);}}>Reiniciar foto</button>
                  )}
                </div>
                {actFotoErr&&<div style={{marginBottom:12,color:C.red,fontSize:12}}>{actFotoErr}</div>}
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
                  {!actGrabando&&!actAudioLoading&&(
                    <button style={{display:"inline-flex",alignItems:"center",gap:6,background:C.surf,border:"1px solid "+C.border,borderRadius:4,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:600,color:C.text}} onClick={iniciarGrabacion}>
                      <i className="ti ti-microphone" style={{fontSize:14}}/>Grabar reunion
                    </button>
                  )}
                  {actGrabando&&(
                    <button style={{display:"inline-flex",alignItems:"center",gap:6,background:"#fee2e2",border:"1px solid "+C.red,borderRadius:4,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:600,color:C.red}} onClick={detenerGrabacion}>
                      <span style={{width:9,height:9,borderRadius:"50%",background:C.red,display:"inline-block",animation:"pulse 1s infinite"}}/>
                      Detener ({formatTiempo(actTiempo)})
                    </button>
                  )}
                  {actAudioLoading&&(
                    <span style={{fontSize:12,color:C.textDim}}>Transcribiendo audio...</span>
                  )}
                </div>
                {actGrabando&&(
                  <div style={{marginBottom:12,fontSize:11,color:C.textDim,background:"#fdf6ec",border:"1px solid #f0d9a8",borderRadius:4,padding:"7px 10px"}}>
                    <i className="ti ti-info-circle" style={{fontSize:12,marginRight:4}}/>Acordate de avisar a los participantes que la reunion esta siendo grabada.
                  </div>
                )}
                {actAudioErr&&<div style={{marginBottom:12,color:C.red,fontSize:12}}>{actAudioErr}</div>}
                <style>{"@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}"}</style>
                <label style={lbl}>ACUERDOS / CONCLUSIONES (opcional)</label>
                <textarea style={Object.assign({},inp,{height:80,resize:"vertical",marginBottom:18})} value={actAcuerdos} onChange={function(e){setActAcuerdos(e.target.value);}} placeholder="Si no los completás, la IA los infiere de lo tratado."/>
                <Btn onClick={generarActa} disabled={actLoading||!actTemas.trim()} st={{width:"100%",justifyContent:"center"}}>
                  {actLoading?"Generando...":"Generar acta"}
                </Btn>
                {actErr&&<div style={{marginTop:12,color:C.red,fontSize:13,background:"#fee2e2",padding:"10px 14px",borderRadius:4}}>{actErr}</div>}
              </div>
              <div>
                {actResult?(
                  <div style={card}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                      <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8}}>ACTA GENERADA</div>
                      <div style={{display:"flex",gap:8}}>
                        <Btn v="ghost" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportDocx(actTipo,"Acta","",actResult);}}>Word</Btn>
                        <Btn v="ghost" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportPdf(actTipo,"Acta","",actResult);}}>PDF</Btn>
                      </div>
                    </div>
                    <MDView text={actResult}/>
                  </div>
                ):(
                  <div style={Object.assign({},card,{textAlign:"center",padding:"56px 24px",color:C.textDim})}>
                    <i className="ti ti-file-description" style={{fontSize:44,display:"block",marginBottom:12,color:C.textDim}}/>
                    <h3 style={{color:C.textMuted,marginBottom:8}}>El acta aparecerá acá</h3>
                    <p style={{fontSize:13}}>Completá el formulario y generá el acta.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {view==="informes"&&(
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"360px 1fr",gap:18}}>
              <div style={card}>
                <h3 style={{margin:"0 0 4px",fontSize:17,fontWeight:700,color:C.text}}>Corregir informe</h3>
                <p style={{fontSize:13,color:C.textDim,marginBottom:18}}>Subí un informe en Word (.docx) o PDF y la IA lo corrige y lo deja listo para entregar.</p>
                <label style={lbl}>NIVEL / SALA</label>
                <input style={Object.assign({},inp,{marginBottom:12})} value={infNivel} onChange={function(e){setInfNivel(e.target.value);}} placeholder="Ej: Sala de 5 años"/>
                <label style={lbl}>PRESTAR ATENCIÓN A (opcional)</label>
                <textarea style={Object.assign({},inp,{height:70,resize:"vertical",marginBottom:12})} value={infPrioridad} onChange={function(e){setInfPrioridad(e.target.value);}} placeholder="Ej: cuidar el tono al describir dificultades"/>
                <label style={lbl}>INFORME (.docx o .pdf) *</label>
                <label style={{display:"inline-flex",alignItems:"center",gap:6,background:C.surf,border:"1px solid "+(infFile?C.accent:C.border),borderRadius:4,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:600,color:infFile?C.accent:C.text,marginBottom:18}}>
                  <i className="ti ti-file-upload" style={{fontSize:14}}/>
                  {infFile?infFile.name:"Subir documento"}
                  <input type="file" accept=".docx,.pdf" style={{display:"none"}} onChange={function(e){setInfFile(e.target.files[0]);setInfResult(null);setInfErr("");}}/>
                </label>
                <Btn onClick={corregirInforme} disabled={infLoading||!infFile} st={{width:"100%",justifyContent:"center"}}>
                  {infLoading?"Revisando...":"Revisar informe"}
                </Btn>
                {infErr&&<div style={{marginTop:12,color:C.red,fontSize:13,background:"#fee2e2",padding:"10px 14px",borderRadius:4}}>{infErr}</div>}

                <div style={{marginTop:20,paddingTop:18,borderTop:"1px solid "+C.border}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>Corrección por lote</div>
                  <p style={{fontSize:12,color:C.textDim,marginBottom:12}}>Subí un ZIP con varios informes .docx o .pdf (un archivo por alumno). La IA corrige todos y devolvés un ZIP con cada informe corregido. Nombrá cada archivo con el nombre del alumno.</p>
                  <label style={{display:"inline-flex",alignItems:"center",gap:6,background:C.surf,border:"1px solid "+(infZip?C.accent:C.border),borderRadius:4,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:600,color:infZip?C.accent:C.text,marginBottom:12}}>
                    <i className="ti ti-file-zip" style={{fontSize:14}}/>
                    {infZip?infZip.name:"Subir ZIP de informes"}
                    <input type="file" accept=".zip" style={{display:"none"}} onChange={function(e){setInfZip(e.target.files[0]);setInfZipErr("");setInfZipDone(0);setInfZipProgress(0);}}/>
                  </label>
                  {infZip&&(
                    <Btn onClick={corregirLote} disabled={infZipLoading} st={{width:"100%",justifyContent:"center"}}>
                      {infZipLoading?"Procesando "+infZipProgress+" de "+infZipTotal+"...":"Corregir todos"}
                    </Btn>
                  )}
                  {infZipLoading&&infZipTotal>0&&(
                    <div style={{marginTop:10}}>
                      <div style={{background:C.bg,borderRadius:4,height:6,overflow:"hidden"}}>
                        <div style={{background:C.accent,height:6,width:Math.round((infZipProgress/infZipTotal)*100)+"%",transition:"width .2s"}}/>
                      </div>
                      <p style={{fontSize:11,color:C.textDim,marginTop:6}}>No cierres esta ventana hasta que termine.</p>
                    </div>
                  )}
                  {infZipDone>0&&!infZipLoading&&(
                    <div style={{marginTop:10,color:C.green,fontSize:13,display:"flex",alignItems:"center",gap:5}}>
                      <i className="ti ti-check" style={{fontSize:14}}/>{infZipDone+" informes revisados. Se descargó el ZIP."}
                    </div>
                  )}
                  {infZipErr&&<div style={{marginTop:12,color:C.red,fontSize:13,background:"#fee2e2",padding:"10px 14px",borderRadius:4}}>{infZipErr}</div>}
                </div>
              </div>
              <div>
                {infResult?(
                  <div style={card}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                      <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8}}>INFORME CORREGIDO</div>
                      <Btn v="ghost" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportInformeCorregido(infResult.nombre,infResult.textoCorregido);}}>Descargar .docx corregido</Btn>
                    </div>
                    <div style={{background:"#f9f9f7",border:"1px solid "+C.border,borderRadius:4,padding:"15px 19px",maxHeight:560,overflow:"auto",fontSize:14,lineHeight:1.7,whiteSpace:"pre-wrap",color:C.text}}>{infResult.textoCorregido}</div>
                  </div>
                ):(
                  <div style={Object.assign({},card,{textAlign:"center",padding:"56px 24px",color:C.textDim})}>
                    <i className="ti ti-report" style={{fontSize:44,display:"block",marginBottom:12,color:C.textDim}}/>
                    <h3 style={{color:C.textMuted,marginBottom:8}}>Las sugerencias aparecerán acá</h3>
                    <p style={{fontSize:13}}>Subí un informe y la IA lo revisa.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {view==="revision"&&(
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"360px 1fr",gap:18}}>
              <div style={card}>
                <h3 style={{margin:"0 0 4px",fontSize:17,fontWeight:700,color:C.text}}>Revisión de documentos</h3>
                <p style={{fontSize:13,color:C.textDim,marginBottom:18}}>Subí una planificación, proyecto u otro documento docente (.docx o .pdf) y la IA marca observaciones para que la docente lo ajuste.</p>
                <label style={lbl}>TIPO DE DOCUMENTO</label>
                <select style={Object.assign({},sel,{width:"100%",marginBottom:12})} value={revTipo} onChange={function(e){setRevTipo(e.target.value);}}>
                  {["Planificación anual","Proyecto áulico","Secuencia didáctica","Salida educativa","Visita a museo","Otro"].map(function(t){return <option key={t}>{t}</option>;})}
                </select>
                <label style={lbl}>CRITERIOS ESPECÍFICOS (opcional)</label>
                <textarea style={Object.assign({},inp,{height:70,resize:"vertical",marginBottom:12})} value={revCriterios} onChange={function(e){setRevCriterios(e.target.value);}} placeholder="Ej: que incluya adaptaciones para alumnos con NEE"/>
                <label style={lbl}>DOCUMENTO (.docx o .pdf) *</label>
                <label style={{display:"inline-flex",alignItems:"center",gap:6,background:C.surf,border:"1px solid "+(revFile?C.accent:C.border),borderRadius:4,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:600,color:revFile?C.accent:C.text,marginBottom:18}}>
                  <i className="ti ti-file-upload" style={{fontSize:14}}/>
                  {revFile?revFile.name:"Subir documento"}
                  <input type="file" accept=".docx,.pdf" style={{display:"none"}} onChange={function(e){setRevFile(e.target.files[0]);setRevResult(null);setRevErr("");}}/>
                </label>
                <Btn onClick={revisarDocumento} disabled={revLoading||!revFile} st={{width:"100%",justifyContent:"center"}}>
                  {revLoading?"Revisando...":"Revisar documento"}
                </Btn>
                {revErr&&<div style={{marginTop:12,color:C.red,fontSize:13,background:"#fee2e2",padding:"10px 14px",borderRadius:4}}>{revErr}</div>}

                <div style={{marginTop:20,paddingTop:18,borderTop:"1px solid "+C.border}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>Revisión por lote</div>
                  <p style={{fontSize:12,color:C.textDim,marginBottom:12}}>Subí un ZIP con varios documentos .docx o .pdf. La IA revisa todos y devolvés un ZIP con cada documento marcado con observaciones.</p>
                  <label style={{display:"inline-flex",alignItems:"center",gap:6,background:C.surf,border:"1px solid "+(revZip?C.accent:C.border),borderRadius:4,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:600,color:revZip?C.accent:C.text,marginBottom:12}}>
                    <i className="ti ti-file-zip" style={{fontSize:14}}/>
                    {revZip?revZip.name:"Subir ZIP de documentos"}
                    <input type="file" accept=".zip" style={{display:"none"}} onChange={function(e){setRevZip(e.target.files[0]);setRevZipErr("");setRevZipDone(0);setRevZipProgress(0);}}/>
                  </label>
                  {revZip&&(
                    <Btn onClick={revisarLote} disabled={revZipLoading} st={{width:"100%",justifyContent:"center"}}>
                      {revZipLoading?"Procesando "+revZipProgress+" de "+revZipTotal+"...":"Revisar todos"}
                    </Btn>
                  )}
                  {revZipLoading&&revZipTotal>0&&(
                    <div style={{marginTop:10}}>
                      <div style={{background:C.bg,borderRadius:4,height:6,overflow:"hidden"}}>
                        <div style={{background:C.accent,height:6,width:Math.round((revZipProgress/revZipTotal)*100)+"%",transition:"width .2s"}}/>
                      </div>
                      <p style={{fontSize:11,color:C.textDim,marginTop:6}}>No cierres esta ventana hasta que termine.</p>
                    </div>
                  )}
                  {revZipDone>0&&!revZipLoading&&(
                    <div style={{marginTop:10,color:C.green,fontSize:13,display:"flex",alignItems:"center",gap:5}}>
                      <i className="ti ti-check" style={{fontSize:14}}/>{revZipDone+" documentos revisados. Se descargó el ZIP."}
                    </div>
                  )}
                  {revZipErr&&<div style={{marginTop:12,color:C.red,fontSize:13,background:"#fee2e2",padding:"10px 14px",borderRadius:4}}>{revZipErr}</div>}
                </div>
              </div>
              <div>
                {revResult?(
                  <div style={card}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                      <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8}}>{revResult.observaciones.length?revResult.observaciones.length+" OBSERVACIONES":"SIN OBSERVACIONES"}</div>
                      <Btn v="ghost" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportInformeMarcado(revResult.nombre,revResult.texto,revResult.observaciones);}}>Descargar .docx marcado</Btn>
                    </div>
                    {!revResult.observaciones.length?(
                      <div style={{color:C.green,fontSize:14,padding:"8px 0"}}>El documento está completo y bien logrado. No requiere ajustes.</div>
                    ):revResult.observaciones.map(function(s,i){
                      return (
                        <div key={i} style={{borderBottom:"1px solid "+C.border,padding:"12px 0"}}>
                          <div style={{fontSize:13,color:C.textMuted,fontStyle:"italic",marginBottom:6,background:"#fff3cd",padding:"6px 10px",borderRadius:4}}>"{s.fragmento}"</div>
                          <div style={{fontSize:13,color:C.text}}><span style={{fontWeight:700,color:C.accent}}>Observación: </span>{s.sugerencia}</div>
                        </div>
                      );
                    })}
                  </div>
                ):(
                  <div style={Object.assign({},card,{textAlign:"center",padding:"56px 24px",color:C.textDim})}>
                    <i className="ti ti-file-search" style={{fontSize:44,display:"block",marginBottom:12,color:C.textDim}}/>
                    <h3 style={{color:C.textMuted,marginBottom:8}}>Las observaciones aparecerán acá</h3>
                    <p style={{fontSize:13}}>Subí un documento y la IA lo revisa.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {view==="acompanamiento"&&(
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"360px 1fr",gap:18}}>
              <div style={card}>
                <h3 style={{margin:"0 0 4px",fontSize:17,fontWeight:700,color:C.text}}>Acompañamiento docente</h3>
                <p style={{fontSize:13,color:C.textDim,marginBottom:18}}>Describí la situación del docente y obtené un plan concreto y formativo.</p>
                <label style={lbl}>QUÉ NECESITÁS</label>
                <select style={Object.assign({},sel,{width:"100%",marginBottom:12})} value={acoTipo} onChange={function(e){setAcoTipo(e.target.value);}}>
                  <option value="completo">Plan de acompañamiento completo</option>
                  <option value="conversacion">Guion para conversación de devolución</option>
                  <option value="observacion">Pauta de observación de clase</option>
                  <option value="estrategias">Estrategias puntuales</option>
                </select>
                <label style={lbl}>ÁREA DE FOCO</label>
                <select style={Object.assign({},sel,{width:"100%",marginBottom:12})} value={acoFoco} onChange={function(e){setAcoFoco(e.target.value);}}>
                  {["Gestión del aula","Planificación","Vínculo con alumnos","Estrategias didácticas","Evaluación","Trabajo con familias","Integración al equipo","Otra"].map(function(f){return <option key={f}>{f}</option>;})}
                </select>
                <label style={lbl}>CONTEXTO DEL DOCENTE (opcional)</label>
                <input style={Object.assign({},inp,{marginBottom:12})} value={acoContexto} onChange={function(e){setAcoContexto(e.target.value);}} placeholder="Ej: Docente novel, primer año"/>
                <label style={lbl}>SITUACIÓN *</label>
                <textarea style={Object.assign({},inp,{height:140,resize:"vertical",marginBottom:18})} value={acoSituacion} onChange={function(e){setAcoSituacion(e.target.value);}} placeholder="Describí lo que observás: fortalezas, dificultades, lo que pasa en el aula..."/>
                <Btn onClick={generarAcompanamiento} disabled={acoLoading||!acoSituacion.trim()} st={{width:"100%",justifyContent:"center"}}>
                  {acoLoading?"Generando...":"Generar plan"}
                </Btn>
                {acoErr&&<div style={{marginTop:12,color:C.red,fontSize:13,background:"#fee2e2",padding:"10px 14px",borderRadius:4}}>{acoErr}</div>}
              </div>
              <div>
                {acoResult?(
                  <div style={card}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                      <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8}}>PLAN GENERADO</div>
                      <div style={{display:"flex",gap:8}}>
                        <Btn v="ghost" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportDocx("Acompañamiento docente","Acompañamiento","",acoResult);}}>Word</Btn>
                        <Btn v="ghost" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportPdf("Acompañamiento docente","Acompañamiento","",acoResult);}}>PDF</Btn>
                      </div>
                    </div>
                    <MDView text={acoResult}/>
                  </div>
                ):(
                  <div style={Object.assign({},card,{textAlign:"center",padding:"56px 24px",color:C.textDim})}>
                    <i className="ti ti-users-group" style={{fontSize:44,display:"block",marginBottom:12,color:C.textDim}}/>
                    <h3 style={{color:C.textMuted,marginBottom:8}}>El plan aparecerá acá</h3>
                    <p style={{fontSize:13}}>Describí la situación y generá el plan de acompañamiento.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {view==="tramites"&&(
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"360px 1fr",gap:18}}>
              <div style={card}>
                <h3 style={{margin:"0 0 4px",fontSize:17,fontWeight:700,color:C.text}}>Asistente de trámites</h3>
                <p style={{fontSize:13,color:C.textDim,marginBottom:18}}>Subí la resolución o normativa oficial (PDF) y la IA te ayuda a gestionar el trámite según ese documento.</p>
                <label style={lbl}>RESOLUCIÓN / NORMATIVA (PDF) *</label>
                <label style={{display:"inline-flex",alignItems:"center",gap:6,background:C.surf,border:"1px solid "+(traFile?C.accent:C.border),borderRadius:4,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:600,color:traFile?C.accent:C.text,marginBottom:14}}>
                  <i className="ti ti-file-upload" style={{fontSize:14}}/>
                  {traFile?traFile.name:"Subir PDF"}
                  <input type="file" accept=".pdf" style={{display:"none"}} onChange={function(e){setTraFile(e.target.files[0]);setTraResult("");setTraErr("");}}/>
                </label>
                <label style={lbl}>QUÉ NECESITÁS</label>
                <select style={Object.assign({},sel,{width:"100%",marginBottom:18})} value={traTipo} onChange={function(e){setTraTipo(e.target.value);}}>
                  <option value="explicar">Explicarme el trámite</option>
                  <option value="requisitos">Listar requisitos y documentación</option>
                  <option value="checklist">Generar checklist de pasos</option>
                  <option value="textos">Redactar los textos / notas necesarios</option>
                </select>
                <Btn onClick={procesarTramite} disabled={traLoading||!traFile} st={{width:"100%",justifyContent:"center"}}>
                  {traLoading?"Procesando...":"Procesar"}
                </Btn>
                {traErr&&<div style={{marginTop:12,color:C.red,fontSize:13,background:"#fee2e2",padding:"10px 14px",borderRadius:4}}>{traErr}</div>}
              </div>
              <div>
                {traResult?(
                  <div style={card}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                      <div style={{fontSize:11,color:C.textMuted,fontWeight:700,letterSpacing:.8}}>RESULTADO</div>
                      <div style={{display:"flex",gap:8}}>
                        <Btn v="ghost" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportDocx("Trámite","Asistente de trámites","",traResult);}}>Word</Btn>
                        <Btn v="ghost" st={{fontSize:12,padding:"5px 12px"}} onClick={function(){exportPdf("Trámite","Asistente de trámites","",traResult);}}>PDF</Btn>
                      </div>
                    </div>
                    <MDView text={traResult}/>
                  </div>
                ):(
                  <div style={Object.assign({},card,{textAlign:"center",padding:"56px 24px",color:C.textDim})}>
                    <i className="ti ti-clipboard-text" style={{fontSize:44,display:"block",marginBottom:12,color:C.textDim}}/>
                    <h3 style={{color:C.textMuted,marginBottom:8}}>El resultado aparecerá acá</h3>
                    <p style={{fontSize:13}}>Subí la normativa, elegí qué necesitás y procesá.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}