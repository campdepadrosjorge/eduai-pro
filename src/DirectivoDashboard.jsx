import { useState } from "react";
import { exportDocx, exportPdf } from "./exportUtils.js";
import { sysComunicado, userComunicado } from "./directivoPrompts.js";

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
  { id:"acompanamiento", label:"Acompañamiento Docente", icon:"ti-users-group" },
];

async function callClaude(system, messages, maxTokens) {
  if (!maxTokens) maxTokens = 4000;
  var res = await fetch("/api/generate", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ system, messages, maxTokens, stream:false }),
  });
  if (!res.ok) { var err = {}; try { err = await res.json(); } catch(e) {} throw new Error(err.error || "Error " + res.status); }
  var data = await res.json();
  return data.content.filter(function(b){return b.type==="text";}).map(function(b){return b.text;}).join("");
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
  var userName = (authUser && authUser.user_metadata && authUser.user_metadata.name) || "Directivo";

  // Estado comunicados
  var [comDest,setComDest] = useState("Las familias");
  var [comAsunto,setComAsunto] = useState("");
  var [comDetalles,setComDetalles] = useState("");
  var [comTono,setComTono] = useState("formal");
  var [comResult,setComResult] = useState("");
  var [comLoading,setComLoading] = useState(false);
  var [comErr,setComErr] = useState("");

  async function generarComunicado(){
    if(!comAsunto.trim()) return;
    setComLoading(true);setComResult("");setComErr("");
    try{
      var r = await callClaude(sysComunicado(), [{role:"user",content:userComunicado(comDest,comAsunto,comDetalles,comTono)}], 3000);
      setComResult(r);
    }catch(e){setComErr("Error: "+e.message);}
    setComLoading(false);
  }

  return (
    <div style={{display:"flex",height:"100vh",background:C.bg,color:C.text,fontFamily:"Quicksand,sans-serif",overflow:"hidden"}}>
      <div style={{width:218,minWidth:218,background:"#0D3559",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"16px 16px",borderBottom:"1px solid rgba(255,255,255,.1)"}}>
          <span style={{fontSize:15,fontWeight:700,color:"#fff"}}>Aula<span style={{color:"#26C3D4"}}>X</span>pro</span>
          <div style={{fontSize:11,color:"#7aaabf",marginTop:4}}>Panel de Directivos</div>
        </div>
        <nav style={{flex:1,padding:"8px 0",overflowY:"auto"}}>
          {DIR_NAV.map(function(n){
            return (
              <div key={n.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",cursor:"pointer",margin:"2px 8px",borderRadius:4,background:view===n.id?"rgba(38,195,212,.15)":"transparent",color:view===n.id?"#26C3D4":"#7aaabf",fontSize:13}} onClick={function(){setView(n.id);}}>
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
        <div style={{background:C.surf,borderBottom:"1px solid "+C.border,padding:"0 24px",display:"flex",alignItems:"center",minHeight:54}}>
          <h1 style={{margin:0,fontSize:16,fontWeight:700,color:C.text,flex:1}}>{(DIR_NAV.find(function(n){return n.id===view;})||{}).label}</h1>
          <div style={{fontSize:13,color:C.textMuted}}>{userName}</div>
        </div>

        <div style={{flex:1,overflow:"auto",padding:"22px 26px"}}>
          {view==="comunicados"&&(
            <div style={{display:"grid",gridTemplateColumns:"360px 1fr",gap:18}}>
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

          {view!=="comunicados"&&(
            <div style={Object.assign({},card,{textAlign:"center",padding:"56px 24px",color:C.textDim})}>
              <i className="ti ti-tools" style={{fontSize:44,display:"block",marginBottom:12,color:C.textDim}}/>
              <h3 style={{color:C.textMuted,marginBottom:8}}>Próximamente</h3>
              <p style={{fontSize:13}}>Esta herramienta se va a habilitar en una próxima actualización.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}