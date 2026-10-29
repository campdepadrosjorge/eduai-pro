// ============================================================
// AulaXpro · Módulo de Horarios (nativo, reemplaza el iframe de Base44)
// Fase 1: carga de datos (jornada, materias, cursos, espacios, docentes, asignaciones)
// Se integra en DirectivoDashboard. Usa las tablas hor_* de Supabase.
// ============================================================
import { useState, useEffect } from "react";
import supabase from "./supabase.js";

var C = {
  bg:"#f0efea", surf:"#ffffff", card:"#ffffff", border:"#d4cfc6",
  accent:"#0d9488", accentBg:"#e6f7f5",
  text:"#111110", textMuted:"#555550", textDim:"#888880",
  blue:"#1d4ed8", green:"#059669", purple:"#7c3aed", red:"#dc2626", amber:"#d97706",
};
var inp = {background:"#fff",border:"1px solid "+C.border,borderRadius:4,padding:"9px 12px",color:C.text,fontSize:14,fontFamily:"Quicksand,sans-serif",outline:"none",width:"100%",boxSizing:"border-box"};
var btnPrimary = {background:C.accent,color:"#fff",border:"none",borderRadius:4,padding:"9px 16px",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"Quicksand,sans-serif"};
var btnGhost = {background:"transparent",color:C.text,border:"1px solid "+C.border,borderRadius:4,padding:"8px 14px",cursor:"pointer",fontSize:13,fontFamily:"Quicksand,sans-serif"};

var DIAS = ["Lunes","Martes","Miercoles","Jueves","Viernes"];

var TABS = [
  { id:"jornada",     label:"Jornada",      icon:"ti-clock" },
  { id:"materias",    label:"Materias",     icon:"ti-book" },
  { id:"cursos",      label:"Cursos",       icon:"ti-users" },
  { id:"espacios",    label:"Espacios",     icon:"ti-building" },
  { id:"docentes",    label:"Docentes",     icon:"ti-user" },
  { id:"asignaciones",label:"Asignaciones", icon:"ti-link" },
  { id:"generar",     label:"Generar",      icon:"ti-sparkles" },
  { id:"ver",         label:"Ver horario",  icon:"ti-calendar" },
  { id:"cambios",     label:"Cambios",      icon:"ti-arrows-exchange" },
];

export default function HorariosPanel({ authUser }) {
  var [tab, setTab] = useState("jornada");
  var uid = authUser ? authUser.id : null;

  return (
    <div>
      {/* Tabs internas */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",borderBottom:"1px solid "+C.border,marginBottom:20,paddingBottom:2}}>
        {TABS.map(function(t){
          var active = tab===t.id;
          return (
            <button key={t.id} onClick={function(){setTab(t.id);}}
              style={{display:"flex",alignItems:"center",gap:6,padding:"9px 14px",border:"none",borderBottom:"2px solid "+(active?C.accent:"transparent"),background:"transparent",cursor:"pointer",color:active?C.accent:C.textMuted,fontWeight:active?700:500,fontSize:13,fontFamily:"Quicksand,sans-serif"}}>
              <i className={"ti "+t.icon} style={{fontSize:15}}/>{t.label}
            </button>
          );
        })}
      </div>

      {tab==="jornada"      && <JornadaTab uid={uid} />}
      {tab==="materias"     && <SimpleCrud uid={uid} tabla="hor_materias" titulo="Materias" singular="materia" campos={[{k:"nombre",label:"Nombre",req:true}]} />}
      {tab==="cursos"       && <CursosTab uid={uid} />}
      {tab==="espacios"     && <SimpleCrud uid={uid} tabla="hor_espacios" titulo="Espacios" singular="espacio" campos={[{k:"nombre",label:"Nombre",req:true},{k:"tipo",label:"Tipo",tipo:"select",opciones:["aula","laboratorio","gimnasio","taller","otro"]},{k:"capacidad",label:"Capacidad",tipo:"number"}]} />}
      {tab==="docentes"     && <DocentesTab uid={uid} />}
      {tab==="asignaciones" && <AsignacionesTab uid={uid} />}
      {tab==="generar"      && <GenerarTab uid={uid} />}
      {tab==="ver"          && <VerHorarioTab uid={uid} />}
      {tab==="cambios"      && <CambiosTab uid={uid} />}
    </div>
  );
}

// ---------- CRUD genérico para entidades simples (materias, espacios) ----------
function SimpleCrud({ uid, tabla, titulo, singular, campos }) {
  var [items, setItems] = useState([]);
  var [loading, setLoading] = useState(true);
  var [form, setForm] = useState({});
  var [saving, setSaving] = useState(false);
  var [err, setErr] = useState("");

  function cargar() {
    if(!uid) return;
    setLoading(true);
    supabase.from(tabla).select("*").eq("owner_id",uid).order("created_at",{ascending:true})
      .then(function(r){ setItems(r.data||[]); setLoading(false); });
  }
  useEffect(cargar, [uid]);

  function guardar() {
    setErr("");
    var req = campos.filter(function(c){return c.req;});
    for(var i=0;i<req.length;i++){ if(!form[req[i].k]){ setErr("Completa: "+req[i].label); return; } }
    setSaving(true);
    var row = Object.assign({}, form, { owner_id: uid });
    supabase.from(tabla).insert(row).then(function(r){
      if(r.error){ setErr(r.error.message); }
      else { setForm({}); cargar(); }
      setSaving(false);
    });
  }
  function borrar(id) {
    supabase.from(tabla).delete().eq("id",id).then(function(){ cargar(); });
  }

  return (
    <div>
      <h3 style={{fontSize:17,fontWeight:700,color:C.text,marginBottom:4}}>{titulo}</h3>
      <p style={{fontSize:13,color:C.textMuted,marginBottom:16}}>Carga las {titulo.toLowerCase()} de tu institución.</p>

      <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:6,padding:16,marginBottom:18,display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
        {campos.map(function(c){
          return (
            <div key={c.k} style={{flex:"1 1 160px"}}>
              <label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:4}}>{c.label}</label>
              {c.tipo==="select" ? (
                <select style={inp} value={form[c.k]||""} onChange={function(e){setForm(Object.assign({},form,{[c.k]:e.target.value}));}}>
                  <option value="">—</option>
                  {c.opciones.map(function(o){return <option key={o} value={o}>{o}</option>;})}
                </select>
              ) : (
                <input style={inp} type={c.tipo==="number"?"number":"text"} value={form[c.k]||""} onChange={function(e){setForm(Object.assign({},form,{[c.k]:c.tipo==="number"?(e.target.value?parseInt(e.target.value):""):e.target.value}));}} />
              )}
            </div>
          );
        })}
        <button style={btnPrimary} onClick={guardar} disabled={saving}>{saving?"Guardando…":"Agregar"}</button>
      </div>
      {err && <div style={{color:C.red,fontSize:12,marginBottom:12}}>{err}</div>}

      {loading ? <div style={{color:C.textMuted,fontSize:13}}>Cargando…</div> : (
        items.length===0 ? <div style={{color:C.textDim,fontSize:13}}>Todavía no cargaste {titulo.toLowerCase()}.</div> : (
          <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:6,overflow:"hidden"}}>
            {items.map(function(it,idx){
              return (
                <div key={it.id} style={{display:"flex",alignItems:"center",padding:"10px 14px",borderTop:idx>0?"1px solid "+C.border:"none",gap:12}}>
                  <div style={{flex:1,fontSize:14,color:C.text}}>
                    {campos.map(function(c){ return it[c.k]; }).filter(function(x){return x!==undefined&&x!==null&&x!=="";}).join(" · ")}
                  </div>
                  <button onClick={function(){borrar(it.id);}} style={{background:"transparent",border:"none",cursor:"pointer",color:C.red,fontSize:12,fontFamily:"Quicksand,sans-serif"}}>Quitar</button>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

// ---------- Jornada: turnos + dias + modulos (bloques y recreos) ----------
function JornadaTab({ uid }) {
  var [jornadas, setJornadas] = useState([]);
  var [modulos, setModulos] = useState({});   // { jornada_id: [modulos] }
  var [loading, setLoading] = useState(true);

  function cargar() {
    if(!uid) return;
    setLoading(true);
    supabase.from("hor_jornadas").select("*").eq("owner_id",uid).order("turno",{ascending:true}).then(function(rj){
      var js=rj.data||[];
      setJornadas(js);
      if(js.length===0){ setModulos({}); setLoading(false); return; }
      supabase.from("hor_modulos").select("*").eq("owner_id",uid).order("orden",{ascending:true}).then(function(rm){
        var byJ={};
        (rm.data||[]).forEach(function(m){ (byJ[m.jornada_id]=byJ[m.jornada_id]||[]).push(m); });
        setModulos(byJ); setLoading(false);
      });
    });
  }
  useEffect(cargar, [uid]);

  function crearTurno(turno, nombre) {
    supabase.from("hor_jornadas").insert({owner_id:uid,turno:turno,nombre:nombre,dias:"Lunes,Martes,Miercoles,Jueves,Viernes",hora_inicio:turno==="manana"?"08:00":"13:00"}).then(function(){cargar();});
  }
  function borrarTurno(id) {
    supabase.from("hor_jornadas").delete().eq("id",id).then(function(){cargar();});
  }

  var tieneM = jornadas.some(function(j){return j.turno==="manana";});
  var tieneT = jornadas.some(function(j){return j.turno==="tarde";});

  if(loading) return <div style={{color:C.textMuted,fontSize:13}}>Cargando…</div>;

  return (
    <div>
      <h3 style={{fontSize:17,fontWeight:700,color:C.text,marginBottom:4}}>Jornada escolar</h3>
      <p style={{fontSize:13,color:C.textMuted,marginBottom:16}}>Configura cada turno: días, hora de inicio y los módulos del día (bloques de clase y recreos, en orden).</p>

      {jornadas.length===0 && (
        <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:18}}>
          <button onClick={function(){crearTurno("manana","Jornada");}}
            style={{flex:"1 1 220px",background:C.card,border:"2px solid "+C.border,borderRadius:8,padding:"22px 20px",cursor:"pointer",textAlign:"left",fontFamily:"Quicksand,sans-serif"}}>
            <i className="ti ti-sun" style={{fontSize:26,color:C.accent,display:"block",marginBottom:8}}/>
            <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:4}}>Jornada simple</div>
            <div style={{fontSize:12,color:C.textMuted}}>Un solo turno. Lo más común.</div>
          </button>
          <button onClick={function(){crearTurno("manana","Turno mañana");crearTurno("tarde","Turno tarde");}}
            style={{flex:"1 1 220px",background:C.card,border:"2px solid "+C.border,borderRadius:8,padding:"22px 20px",cursor:"pointer",textAlign:"left",fontFamily:"Quicksand,sans-serif"}}>
            <i className="ti ti-moon" style={{fontSize:26,color:C.accent,display:"block",marginBottom:8}}/>
            <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:4}}>Doble jornada</div>
            <div style={{fontSize:12,color:C.textMuted}}>Turno mañana y turno tarde.</div>
          </button>
        </div>
      )}

      {jornadas.map(function(j){
        var esSimple = jornadas.length===1 && jornadas[0].turno==="manana";
        return <TurnoCard key={j.id} jornada={j} modulos={modulos[j.id]||[]} uid={uid} onChange={cargar} onDelete={function(){borrarTurno(j.id);}} simple={esSimple} />;
      })}

      {jornadas.length===1 && jornadas[0].turno==="manana" ? (
        <button style={Object.assign({},btnGhost,{marginTop:4})} onClick={function(){crearTurno("tarde","Turno tarde");}}>+ Convertir en doble jornada (agregar turno tarde)</button>
      ) : (jornadas.length>0 && jornadas.length<2 && (
        <div style={{marginTop:14}}>
          {!tieneM && <button style={btnGhost} onClick={function(){crearTurno("manana","Turno mañana");}}>+ Agregar turno mañana</button>}
          {!tieneT && <button style={btnGhost} onClick={function(){crearTurno("tarde","Turno tarde");}}>+ Agregar turno tarde</button>}
        </div>
      ))}
    </div>
  );
}

function TurnoCard({ jornada, modulos, uid, onChange, onDelete, simple }) {
  var [dias, setDias] = useState(jornada.dias||"");
  var [horaInicio, setHoraInicio] = useState(jornada.hora_inicio||"08:00");
  var [savedMsg, setSavedMsg] = useState("");
  // edicion fluida de duraciones (estado local, se guarda al salir del campo)
  var [dur, setDur] = useState({});
  var [durMsg, setDurMsg] = useState("");
  // generador rapido
  var [nClases, setNClases] = useState(6);
  var [minClase, setMinClase] = useState(40);
  var [minRecreo, setMinRecreo] = useState(15);
  var [recreoCada, setRecreoCada] = useState(2);
  var [generando, setGenerando] = useState(false);

  var modsOrden = modulos.slice().sort(function(a,b){return a.orden-b.orden;});

  function guardarJornada() {
    supabase.from("hor_jornadas").update({dias:dias,hora_inicio:horaInicio}).eq("id",jornada.id).then(function(){
      setSavedMsg("Guardado"); setTimeout(function(){setSavedMsg("");},1500);
    });
  }

  function generarDia() {
    var n = parseInt(nClases)||0;
    if (n <= 0) return;
    setGenerando(true);
    var mc = parseInt(minClase)||40;
    var mr = parseInt(minRecreo)||15;
    var cada = parseInt(recreoCada)||0;
    var filas = [];
    var orden = 1;
    for (var c = 1; c <= n; c++) {
      filas.push({owner_id:uid,jornada_id:jornada.id,orden:orden++,tipo:"clase",duracion_minutos:mc});
      if (cada > 0 && c % cada === 0 && c < n) {
        filas.push({owner_id:uid,jornada_id:jornada.id,orden:orden++,tipo:"recreo",duracion_minutos:mr});
      }
    }
    supabase.from("hor_modulos").delete().eq("jornada_id",jornada.id).then(function(){
      supabase.from("hor_modulos").insert(filas).then(function(){
        setGenerando(false); setDur({}); onChange();
      });
    });
  }

  function agregarModulo(tipo) {
    var orden = (modulos.length? Math.max.apply(null,modulos.map(function(m){return m.orden;})) : 0) + 1;
    supabase.from("hor_modulos").insert({owner_id:uid,jornada_id:jornada.id,orden:orden,tipo:tipo,duracion_minutos:tipo==="recreo"?parseInt(minRecreo)||15:parseInt(minClase)||40}).then(function(){onChange();});
  }
  function onDurChange(id,val){ setDur(Object.assign({},dur,{[id]:val})); }
  function guardarDuracion(id){
    if (dur[id]===undefined) return;
    var v = parseInt(dur[id])||0;
    supabase.from("hor_modulos").update({duracion_minutos:v}).eq("id",id).then(function(){
      setDurMsg("Cambios guardados"); setTimeout(function(){setDurMsg("");},1200);
    });
  }
  function borrarModulo(id) {
    supabase.from("hor_modulos").delete().eq("id",id).then(function(){onChange();});
  }

  // hora de fin estimada del dia
  function horaFin(){
    var total = modsOrden.reduce(function(s,m){ var d = dur[m.id]!==undefined?(parseInt(dur[m.id])||0):m.duracion_minutos; return s+d; },0);
    var hi = (horaInicio||"08:00").split(":"); var mins = (parseInt(hi[0])||0)*60 + (parseInt(hi[1])||0) + total;
    var hh = Math.floor(mins/60)%24; var mm = mins%60;
    return (hh<10?"0":"")+hh+":"+(mm<10?"0":"")+mm;
  }
  var nClasesActual = modsOrden.filter(function(m){return m.tipo==="clase";}).length;

  return (
    <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:8,padding:18,marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:15,fontWeight:700,color:C.accent}}>
          <i className={"ti "+(jornada.turno==="manana"?"ti-sun":"ti-sunset")} style={{marginRight:6}}/>
          {simple?"Jornada":(jornada.turno==="manana"?"Turno mañana":"Turno tarde")}
        </div>
        <button onClick={onDelete} style={{background:"transparent",border:"none",cursor:"pointer",color:C.red,fontSize:12,fontFamily:"Quicksand,sans-serif"}}>Eliminar turno</button>
      </div>

      <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end",marginBottom:16}}>
        <div style={{flex:"2 1 280px"}}>
          <label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:4}}>Días (separados por coma)</label>
          <input style={inp} value={dias} onChange={function(e){setDias(e.target.value);}} placeholder="Lunes,Martes,Miercoles,Jueves,Viernes" />
        </div>
        <div style={{flex:"0 1 120px"}}>
          <label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:4}}>Hora de inicio</label>
          <input style={inp} value={horaInicio} onChange={function(e){setHoraInicio(e.target.value);}} placeholder="08:00" />
        </div>
        <button style={btnGhost} onClick={guardarJornada}>Guardar</button>
        {savedMsg && <span style={{color:C.green,fontSize:12}}>{savedMsg}</span>}
      </div>

      {/* Generador rapido de la jornada */}
      <div style={{background:C.accentBg,border:"1px dashed "+C.accent,borderRadius:6,padding:14,marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,color:C.accent,marginBottom:10,textTransform:"uppercase",letterSpacing:.5}}>
          <i className="ti ti-wand" style={{marginRight:6}}/>Armar la jornada de una
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div style={{flex:"0 1 120px"}}>
            <label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:4}}>Clases por día</label>
            <input style={inp} type="number" min="1" value={nClases} onChange={function(e){setNClases(e.target.value);}} />
          </div>
          <div style={{flex:"0 1 120px"}}>
            <label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:4}}>Min. por clase</label>
            <input style={inp} type="number" min="1" value={minClase} onChange={function(e){setMinClase(e.target.value);}} />
          </div>
          <div style={{flex:"0 1 120px"}}>
            <label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:4}}>Min. de recreo</label>
            <input style={inp} type="number" min="0" value={minRecreo} onChange={function(e){setMinRecreo(e.target.value);}} />
          </div>
          <div style={{flex:"0 1 150px"}}>
            <label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:4}}>Recreo cada N clases</label>
            <input style={inp} type="number" min="0" value={recreoCada} onChange={function(e){setRecreoCada(e.target.value);}} placeholder="0 = sin recreos" />
          </div>
          <button style={Object.assign({},btnPrimary,{whiteSpace:"nowrap"})} onClick={generarDia} disabled={generando}>{generando?"Generando…":"Generar día"}</button>
        </div>
        {modulos.length>0 && <div style={{fontSize:11,color:C.amber,marginTop:8}}><i className="ti ti-alert-triangle" style={{marginRight:4}}/>Generar reemplaza los módulos actuales de este turno.</div>}
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:12,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:.5}}>Módulos del día</div>
        {modsOrden.length>0 && <div style={{fontSize:12,color:C.textDim}}>{nClasesActual} clases · termina {horaFin()}</div>}
      </div>
      {modsOrden.length===0 ? (
        <div style={{color:C.textDim,fontSize:13,marginBottom:10}}>Usa el generador de arriba, o agrega los bloques uno por uno.</div>
      ) : (
        <div style={{marginBottom:10}}>
          {modsOrden.map(function(m,i){
            var clasesHasta = modsOrden.slice(0,i+1).filter(function(x){return x.tipo==="clase";}).length;
            var val = dur[m.id]!==undefined?dur[m.id]:m.duracion_minutos;
            return (
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",background:m.tipo==="recreo"?"#fff7ed":C.accentBg,borderRadius:4,marginBottom:5}}>
                <span style={{fontSize:12,fontWeight:700,color:m.tipo==="recreo"?C.amber:C.accent,minWidth:70}}>{m.tipo==="recreo"?"Recreo":"Clase "+clasesHasta}</span>
                <input style={Object.assign({},inp,{width:70,padding:"5px 8px",fontSize:13})} type="number" value={val}
                  onChange={function(e){onDurChange(m.id,e.target.value);}}
                  onBlur={function(){guardarDuracion(m.id);}}
                  onKeyDown={function(e){if(e.key==="Enter"){e.target.blur();}}} />
                <span style={{fontSize:12,color:C.textMuted}}>min</span>
                <button onClick={function(){borrarModulo(m.id);}} style={{marginLeft:"auto",background:"transparent",border:"none",cursor:"pointer",color:C.red,fontSize:12,fontFamily:"Quicksand,sans-serif"}}>Quitar</button>
              </div>
            );
          })}
          {durMsg && <div style={{fontSize:11,color:C.green,marginTop:2}}>{durMsg}</div>}
        </div>
      )}
      <div style={{display:"flex",gap:8}}>
        <button style={Object.assign({},btnGhost,{fontSize:12,padding:"6px 12px"})} onClick={function(){agregarModulo("clase");}}>+ Bloque de clase</button>
        <button style={Object.assign({},btnGhost,{fontSize:12,padding:"6px 12px"})} onClick={function(){agregarModulo("recreo");}}>+ Recreo</button>
      </div>
    </div>
  );
}
// ---------- Placeholders de las otras pestañas (se completan en próximos pasos) ----------
function CursosTab({ uid }) {
  return <SimpleCrud uid={uid} tabla="hor_cursos" titulo="Cursos" singular="curso"
    campos={[{k:"nombre",label:"Nombre (ej: 1°A)",req:true},{k:"anio",label:"Año",tipo:"number"},{k:"division",label:"División"},{k:"cantidad_alumnos",label:"Alumnos",tipo:"number"},{k:"turno",label:"Turno",tipo:"select",opciones:["manana","tarde"]}]} />;
}
function DocentesTab({ uid }) {
  var [docentes,setDocentes]=useState([]);
  var [jornadas,setJornadas]=useState([]);
  var [modulos,setModulos]=useState([]);
  var [loading,setLoading]=useState(true);
  var [nombre,setNombre]=useState("");
  var [email,setEmail]=useState("");
  var [saving,setSaving]=useState(false);
  var [err,setErr]=useState("");
  var [editDisp,setEditDisp]=useState(null); // docente al que se le edita disponibilidad

  function cargar(){
    if(!uid) return;
    setLoading(true);
    Promise.all([
      supabase.from("hor_docentes").select("*").eq("owner_id",uid).order("created_at",{ascending:true}),
      supabase.from("hor_jornadas").select("*").eq("owner_id",uid),
      supabase.from("hor_modulos").select("*").eq("owner_id",uid).eq("tipo","clase").order("orden",{ascending:true})
    ]).then(function(res){
      setDocentes(res[0].data||[]);
      setJornadas(res[1].data||[]);
      setModulos(res[2].data||[]);
      setLoading(false);
    });
  }
  useEffect(cargar,[uid]);

  function agregar(){
    setErr("");
    if(!nombre.trim()){setErr("Escribe el nombre del docente");return;}
    setSaving(true);
    supabase.from("hor_docentes").insert({owner_id:uid,nombre:nombre.trim(),email:email.trim()||null}).then(function(r){
      if(r.error)setErr(r.error.message); else {setNombre("");setEmail("");cargar();}
      setSaving(false);
    });
  }
  function borrar(id){ supabase.from("hor_docentes").delete().eq("id",id).then(function(){cargar();}); }

  // Dias unicos de todas las jornadas
  var dias = [];
  jornadas.forEach(function(j){ (j.dias||"").split(",").forEach(function(d){ d=d.trim(); if(d&&dias.indexOf(d)<0)dias.push(d); }); });
  // Cantidad de modulos de clase (indice 0..n-1)
  var nModulos = modulos.length;

  if(loading) return <div style={{color:C.textMuted,fontSize:13}}>Cargando…</div>;

  return (
    <div>
      <h3 style={{fontSize:17,fontWeight:700,color:C.text,marginBottom:4}}>Docentes</h3>
      <p style={{fontSize:13,color:C.textMuted,marginBottom:16}}>Carga los docentes y marca en qué bloques está disponible cada uno.</p>

      <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:6,padding:16,marginBottom:18,display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:"2 1 200px"}}>
          <label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:4}}>Nombre</label>
          <input style={inp} value={nombre} onChange={function(e){setNombre(e.target.value);}} placeholder="Prof. García"/>
        </div>
        <div style={{flex:"2 1 200px"}}>
          <label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:4}}>Email (opcional)</label>
          <input style={inp} value={email} onChange={function(e){setEmail(e.target.value);}} placeholder="garcia@escuela.edu"/>
        </div>
        <button style={btnPrimary} onClick={agregar} disabled={saving}>{saving?"Guardando…":"Agregar"}</button>
      </div>
      {err && <div style={{color:C.red,fontSize:12,marginBottom:12}}>{err}</div>}

      {docentes.length===0 ? <div style={{color:C.textDim,fontSize:13}}>Todavía no cargaste docentes.</div> : (
        <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:6,overflow:"hidden"}}>
          {docentes.map(function(d,idx){
            var slots = d.disponibilidad ? d.disponibilidad.split(";").filter(Boolean).length : 0;
            return (
              <div key={d.id} style={{display:"flex",alignItems:"center",padding:"10px 14px",borderTop:idx>0?"1px solid "+C.border:"none",gap:12}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,color:C.text,fontWeight:600}}>{d.nombre}</div>
                  <div style={{fontSize:11,color:C.textDim}}>{d.email||""}{d.email&&" · "}{d.disponibilidad?(slots+" bloques disponibles"):"disponible en todos los bloques"}</div>
                </div>
                <button style={Object.assign({},btnGhost,{fontSize:12,padding:"6px 12px"})} onClick={function(){setEditDisp(d);}}>Disponibilidad</button>
                <button onClick={function(){borrar(d.id);}} style={{background:"transparent",border:"none",cursor:"pointer",color:C.red,fontSize:12,fontFamily:"Quicksand,sans-serif"}}>Quitar</button>
              </div>
            );
          })}
        </div>
      )}

      {editDisp && (
        <DisponibilidadModal docente={editDisp} dias={dias} nModulos={nModulos}
          onClose={function(){setEditDisp(null);}}
          onSave={function(){ setEditDisp(null); cargar(); }} />
      )}
    </div>
  );
}

function DisponibilidadModal({ docente, dias, nModulos, onClose, onSave }) {
  // set de slots marcados "Dia-Modulo"
  var inicial = {};
  if(docente.disponibilidad){ docente.disponibilidad.split(";").filter(Boolean).forEach(function(sl){ inicial[sl]=true; }); }
  var [sel,setSel]=useState(inicial);
  var [saving,setSaving]=useState(false);
  var todosLibres = !docente.disponibilidad; // vacio = todos

  function toggle(dia,mod){
    var k=dia+"-"+mod;
    var n=Object.assign({},sel);
    if(n[k]) delete n[k]; else n[k]=true;
    setSel(n);
  }
  function marcarTodo(val){
    var n={};
    if(val){ dias.forEach(function(d){ for(var m=0;m<nModulos;m++) n[d+"-"+m]=true; }); }
    setSel(n);
  }
  function guardar(){
    setSaving(true);
    var keys=Object.keys(sel);
    // Si marco TODOS los slots, guardamos vacio (= disponible en todos)
    var total = dias.length*nModulos;
    var disp = (keys.length===0 || keys.length===total) ? null : keys.join(";");
    supabase.from("hor_docentes").update({disponibilidad:disp}).eq("id",docente.id).then(function(){ setSaving(false); onSave(); });
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:20}}>
      <div style={{background:C.surf,border:"1px solid "+C.border,borderRadius:8,padding:24,maxWidth:"92vw",maxHeight:"88vh",overflow:"auto"}}>
        <h3 style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:4}}>Disponibilidad — {docente.nombre}</h3>
        <p style={{fontSize:12,color:C.textMuted,marginBottom:14}}>Marca los bloques en los que el docente puede dar clase. Verde = disponible.</p>

        {(dias.length===0||nModulos===0) ? (
          <div style={{color:C.amber,fontSize:13,marginBottom:16}}>Primero configura la jornada (días y módulos de clase) en la pestaña Jornada.</div>
        ) : (
          <div style={{overflowX:"auto",marginBottom:16}}>
            <table style={{borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  <th style={{padding:6}}></th>
                  {Array.from({length:nModulos}).map(function(_,m){
                    return <th key={m} style={{padding:"6px 8px",fontSize:11,color:C.textMuted,fontWeight:700}}>Clase {m+1}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {dias.map(function(dia){
                  return (
                    <tr key={dia}>
                      <td style={{padding:"6px 10px 6px 0",fontSize:12,color:C.text,fontWeight:600,whiteSpace:"nowrap"}}>{dia}</td>
                      {Array.from({length:nModulos}).map(function(_,m){
                        var k=dia+"-"+m;
                        var on = todosLibres ? true : !!sel[k];
                        var onReal = Object.keys(sel).length===0 && todosLibres ? true : !!sel[k];
                        return (
                          <td key={m} style={{padding:4}}>
                            <button onClick={function(){toggle(dia,m);}}
                              style={{width:44,height:34,borderRadius:4,border:"1px solid "+(sel[k]?C.accent:C.border),background:sel[k]?C.accent:"#fff",cursor:"pointer",color:sel[k]?"#fff":C.textDim,fontSize:14,fontFamily:"Quicksand,sans-serif"}}>
                              {sel[k]?"✓":""}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{display:"flex",gap:8,marginBottom:16}}>
          <button style={Object.assign({},btnGhost,{fontSize:12,padding:"5px 10px"})} onClick={function(){marcarTodo(true);}}>Marcar todo</button>
          <button style={Object.assign({},btnGhost,{fontSize:12,padding:"5px 10px"})} onClick={function(){marcarTodo(false);}}>Limpiar</button>
        </div>

        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button style={btnGhost} onClick={onClose}>Cancelar</button>
          <button style={btnPrimary} onClick={guardar} disabled={saving}>{saving?"Guardando…":"Guardar disponibilidad"}</button>
        </div>
      </div>
    </div>
  );
}
function AsignacionesTab({ uid }) {
  var [materias,setMaterias]=useState([]);
  var [cursos,setCursos]=useState([]);
  var [docentes,setDocentes]=useState([]);
  var [asigs,setAsigs]=useState([]);
  var [loading,setLoading]=useState(true);
  var [form,setForm]=useState({materia_id:"",curso_id:"",docente_id:"",horas_semanales:4});
  var [saving,setSaving]=useState(false);
  var [err,setErr]=useState("");

  function cargar(){
    if(!uid) return;
    setLoading(true);
    Promise.all([
      supabase.from("hor_materias").select("id,nombre").eq("owner_id",uid).order("nombre"),
      supabase.from("hor_cursos").select("id,nombre").eq("owner_id",uid).order("nombre"),
      supabase.from("hor_docentes").select("id,nombre").eq("owner_id",uid).order("nombre"),
      supabase.from("hor_asignaciones").select("*").eq("owner_id",uid).order("created_at",{ascending:true})
    ]).then(function(res){
      setMaterias(res[0].data||[]); setCursos(res[1].data||[]);
      setDocentes(res[2].data||[]); setAsigs(res[3].data||[]);
      setLoading(false);
    });
  }
  useEffect(cargar,[uid]);

  function nombreDe(arr,id){ var x=arr.find(function(e){return e.id===id;}); return x?x.nombre:"—"; }

  function agregar(){
    setErr("");
    if(!form.materia_id||!form.curso_id||!form.docente_id){ setErr("Elige materia, curso y docente"); return; }
    if(!form.horas_semanales||form.horas_semanales<1){ setErr("Las horas deben ser 1 o más"); return; }
    setSaving(true);
    supabase.from("hor_asignaciones").insert({
      owner_id:uid, materia_id:form.materia_id, curso_id:form.curso_id,
      docente_id:form.docente_id, horas_semanales:parseInt(form.horas_semanales)
    }).then(function(r){
      if(r.error)setErr(r.error.message);
      else { setForm({materia_id:"",curso_id:"",docente_id:"",horas_semanales:4}); cargar(); }
      setSaving(false);
    });
  }
  function borrar(id){ supabase.from("hor_asignaciones").delete().eq("id",id).then(function(){cargar();}); }

  if(loading) return <div style={{color:C.textMuted,fontSize:13}}>Cargando…</div>;

  var faltan = [];
  if(materias.length===0) faltan.push("materias");
  if(cursos.length===0) faltan.push("cursos");
  if(docentes.length===0) faltan.push("docentes");

  return (
    <div>
      <h3 style={{fontSize:17,fontWeight:700,color:C.text,marginBottom:4}}>Asignaciones</h3>
      <p style={{fontSize:13,color:C.textMuted,marginBottom:16}}>Define qué materia da cada docente en cada curso, y cuántas horas por semana.</p>

      {faltan.length>0 ? (
        <div style={{background:"#fff7ed",border:"1px solid "+C.amber,borderRadius:6,padding:16,fontSize:13,color:C.amber}}>
          Primero carga {faltan.join(", ")} en sus pestañas para poder crear asignaciones.
        </div>
      ) : (
        <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:6,padding:16,marginBottom:18,display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div style={{flex:"1 1 160px"}}>
            <label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:4}}>Materia</label>
            <select style={inp} value={form.materia_id} onChange={function(e){setForm(Object.assign({},form,{materia_id:e.target.value}));}}>
              <option value="">—</option>
              {materias.map(function(m){return <option key={m.id} value={m.id}>{m.nombre}</option>;})}
            </select>
          </div>
          <div style={{flex:"1 1 140px"}}>
            <label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:4}}>Curso</label>
            <select style={inp} value={form.curso_id} onChange={function(e){setForm(Object.assign({},form,{curso_id:e.target.value}));}}>
              <option value="">—</option>
              {cursos.map(function(c){return <option key={c.id} value={c.id}>{c.nombre}</option>;})}
            </select>
          </div>
          <div style={{flex:"1 1 160px"}}>
            <label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:4}}>Docente</label>
            <select style={inp} value={form.docente_id} onChange={function(e){setForm(Object.assign({},form,{docente_id:e.target.value}));}}>
              <option value="">—</option>
              {docentes.map(function(d){return <option key={d.id} value={d.id}>{d.nombre}</option>;})}
            </select>
          </div>
          <div style={{flex:"0 1 90px"}}>
            <label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:4}}>Horas/sem</label>
            <input style={inp} type="number" min="1" value={form.horas_semanales} onChange={function(e){setForm(Object.assign({},form,{horas_semanales:e.target.value}));}}/>
          </div>
          <button style={btnPrimary} onClick={agregar} disabled={saving}>{saving?"Guardando…":"Agregar"}</button>
        </div>
      )}
      {err && <div style={{color:C.red,fontSize:12,marginBottom:12}}>{err}</div>}

      {asigs.length===0 ? <div style={{color:C.textDim,fontSize:13}}>Todavía no cargaste asignaciones.</div> : (
        <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:6,overflow:"hidden"}}>
          <div style={{display:"flex",padding:"8px 14px",background:C.bg,fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:.3}}>
            <div style={{flex:2}}>Materia</div><div style={{flex:1}}>Curso</div><div style={{flex:2}}>Docente</div><div style={{flex:"0 0 70px",textAlign:"center"}}>Horas</div><div style={{flex:"0 0 60px"}}></div>
          </div>
          {asigs.map(function(a,idx){
            return (
              <div key={a.id} style={{display:"flex",alignItems:"center",padding:"10px 14px",borderTop:"1px solid "+C.border,fontSize:13,color:C.text}}>
                <div style={{flex:2}}>{nombreDe(materias,a.materia_id)}</div>
                <div style={{flex:1}}>{nombreDe(cursos,a.curso_id)}</div>
                <div style={{flex:2}}>{nombreDe(docentes,a.docente_id)}</div>
                <div style={{flex:"0 0 70px",textAlign:"center",fontWeight:700,color:C.accent}}>{a.horas_semanales}</div>
                <div style={{flex:"0 0 60px",textAlign:"right"}}>
                  <button onClick={function(){borrar(a.id);}} style={{background:"transparent",border:"none",cursor:"pointer",color:C.red,fontSize:12,fontFamily:"Quicksand,sans-serif"}}>Quitar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
function GenerarTab({ uid }) {
  var [gen,setGen]=useState(false);
  var [res,setRes]=useState(null);
  var [err,setErr]=useState("");

  function generar(){
    setGen(true);setErr("");setRes(null);
    fetch("/api/generar-horario",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:uid})})
      .then(function(r){return r.json();})
      .then(function(d){ if(d.error)setErr(d.error); else setRes(d); setGen(false); })
      .catch(function(){ setErr("No se pudo generar. Intenta de nuevo."); setGen(false); });
  }

  return (
    <div>
      <h3 style={{fontSize:17,fontWeight:700,color:C.text,marginBottom:4}}>Generar horario</h3>
      <p style={{fontSize:13,color:C.textMuted,marginBottom:18}}>El algoritmo ubica todas las materias respetando la disponibilidad de los docentes, los espacios compartidos y sin superposiciones.</p>

      <button style={Object.assign({},btnPrimary,{padding:"12px 24px",fontSize:14})} onClick={generar} disabled={gen}>
        {gen?"Generando… (puede tardar unos segundos)":"✦ Generar horario"}
      </button>

      {err && <div style={{background:"#fee2e2",border:"1px solid #fca5a5",borderRadius:6,padding:"12px 16px",marginTop:16,color:C.red,fontSize:13}}>{err}</div>}

      {res && (
        <div style={{marginTop:20}}>
          {res.completo ? (
            <div style={{background:"#d1fae5",border:"1px solid "+C.green,borderRadius:6,padding:"14px 18px",color:"#065f46",fontSize:14}}>
              <strong>✓ Horario generado completo.</strong> Se ubicaron las {res.ubicadas} horas de clase sin ningún conflicto. Mira el resultado en la pestaña "Ver horario".
            </div>
          ) : (
            <div style={{background:"#fff7ed",border:"1px solid "+C.amber,borderRadius:6,padding:"14px 18px",color:"#92400e",fontSize:14}}>
              <strong>Horario generado parcial.</strong> Se ubicaron {res.ubicadas} de {res.total_clases} horas.
              {res.timeout && " (El cálculo alcanzó el límite de tiempo.)"}
              <div style={{marginTop:10,fontSize:13}}>Lo que no se pudo ubicar:</div>
              <ul style={{margin:"6px 0 0",paddingLeft:18}}>
                {(res.reporte||[]).map(function(r,i){ return <li key={i} style={{marginBottom:4,fontSize:13}}>{r.texto}</li>; })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function VerHorarioTab({ uid }) {
  var [loading, setLoading] = useState(true);
  var [horario, setHorario] = useState([]);
  var [cursos, setCursos] = useState([]);
  var [docentes, setDocentes] = useState([]);
  var [espacios, setEspacios] = useState([]);
  var [materias, setMaterias] = useState([]);
  var [jornadas, setJornadas] = useState([]);
  var [modulos, setModulos] = useState([]);
  var [asigs, setAsigs] = useState([]);
  var [modo, setModo] = useState("curso");
  var [turno, setTurno] = useState("");
  var [sel, setSel] = useState("");
  var [exporting, setExporting] = useState(false);
  var [editar, setEditar] = useState(null); // {dia, orden, clase|null}
  var [versiones, setVersiones] = useState([]);
  var [verNombre, setVerNombre] = useState("");
  var [verAnio, setVerAnio] = useState("");
  var [guardandoVer, setGuardandoVer] = useState(false);
  var [cargandoVer, setCargandoVer] = useState("");
  var [verMsg, setVerMsg] = useState("");
  var [mostrarVer, setMostrarVer] = useState(false);

  function cargar() {
    if (!uid) return;
    setLoading(true);
    Promise.all([
      supabase.from("hor_horario").select("*").eq("owner_id", uid),
      supabase.from("hor_cursos").select("*").eq("owner_id", uid),
      supabase.from("hor_docentes").select("*").eq("owner_id", uid),
      supabase.from("hor_espacios").select("*").eq("owner_id", uid),
      supabase.from("hor_materias").select("*").eq("owner_id", uid),
      supabase.from("hor_jornadas").select("*").eq("owner_id", uid),
      supabase.from("hor_modulos").select("*").eq("owner_id", uid),
      supabase.from("hor_asignaciones").select("*").eq("owner_id", uid),
      supabase.from("hor_horario_versiones").select("*").eq("owner_id", uid).order("created_at",{ascending:false}),
    ]).then(function (rs) {
      setHorario(rs[0].data || []);
      setCursos(rs[1].data || []);
      setDocentes(rs[2].data || []);
      setEspacios(rs[3].data || []);
      setMaterias(rs[4].data || []);
      setJornadas(rs[5].data || []);
      setModulos(rs[6].data || []);
      setAsigs(rs[7].data || []);
      setVersiones((rs[8] && rs[8].data) || []);
      setLoading(false);
    });
  }
  useEffect(cargar, [uid]);

  var nombreCurso = {}; cursos.forEach(function (c) { nombreCurso[c.id] = c.nombre; });
  var nombreDoc = {}; docentes.forEach(function (d) { nombreDoc[d.id] = d.nombre; });
  var nombreEsp = {}; espacios.forEach(function (e) { nombreEsp[e.id] = e.nombre; });
  var nombreMat = {}; var colorMat = {};
  var paleta = ["#0d9488","#1d4ed8","#7c3aed","#d97706","#dc2626","#059669","#db2777","#2563eb","#ca8a04","#0891b2","#9333ea","#e11d48","#15803d","#c2410c","#4f46e5"];
  materias.forEach(function (m, i) { nombreMat[m.id] = m.nombre; colorMat[m.id] = m.color || paleta[i % paleta.length]; });

  var turnosSet = {};
  horario.forEach(function (h) { turnosSet[h.turno || "manana"] = true; });
  jornadas.forEach(function (j) { turnosSet[j.turno || "manana"] = true; });
  var turnos = Object.keys(turnosSet);
  if (turnos.length === 0) turnos = ["manana"];
  var turnoActivo = turno || turnos[0];
  var nombreTurno = { manana: "Mañana", tarde: "Tarde" };

  var jornadaTurno = jornadas.find(function (j) { return (j.turno || "manana") === turnoActivo; });
  var diasTurno = jornadaTurno && jornadaTurno.dias
    ? jornadaTurno.dias.split(",").map(function (d) { return d.trim(); }).filter(Boolean)
    : DIAS;
  var modsClase = modulos
    .filter(function (m) { return jornadaTurno && m.jornada_id === jornadaTurno.id && m.tipo === "clase"; })
    .sort(function (a, b) { return a.orden - b.orden; });
  if (modsClase.length === 0) {
    var ordSet = {};
    horario.filter(function (h) { return (h.turno || "manana") === turnoActivo; })
      .forEach(function (h) { ordSet[h.modulo_orden] = true; });
    modsClase = Object.keys(ordSet).map(Number).sort(function (a, b) { return a - b; })
      .map(function (o) { return { orden: o }; });
  }

  var hdeTurno = horario.filter(function (h) { return (h.turno || "manana") === turnoActivo; });
  var entIds = {};
  hdeTurno.forEach(function (h) {
    var k = modo === "curso" ? h.curso_id : modo === "docente" ? h.docente_id : h.espacio_id;
    if (k) entIds[k] = true;
  });
  var mapaNombre = modo === "curso" ? nombreCurso : modo === "docente" ? nombreDoc : nombreEsp;
  var entidades = Object.keys(entIds)
    .map(function (id) { return { id: id, nombre: mapaNombre[id] || "—" }; })
    .sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });

  var selActivo = sel && entIds[sel] ? sel : (entidades[0] ? entidades[0].id : "");

  function claseEn(dia, orden) {
    return hdeTurno.find(function (h) {
      if (h.dia !== dia || h.modulo_orden !== orden) return false;
      if (modo === "curso") return h.curso_id === selActivo;
      if (modo === "docente") return h.docente_id === selActivo;
      return h.espacio_id === selActivo;
    });
  }

  function detalle(h) {
    if (modo === "curso") return nombreDoc[h.docente_id] || "";
    if (modo === "docente") return nombreCurso[h.curso_id] || "";
    return nombreCurso[h.curso_id] || "";
  }

  // Disponibilidad docente -> set "Dia-idxClase" (null = todos)
  function dispSet(docId) {
    var d = docentes.find(function (x) { return x.id === docId; });
    if (!d || !d.disponibilidad) return null;
    var s = {}; d.disponibilidad.split(";").filter(Boolean).forEach(function (sl) { s[sl.trim()] = true; });
    return s;
  }
  function idxClaseDeOrden(orden) {
    for (var i = 0; i < modsClase.length; i++) if (modsClase[i].orden === orden) return i;
    return 0;
  }

  async function exportar() {
    setExporting(true);
    try {
      var XLSX = await import("xlsx");
      var wb = XLSX.utils.book_new();
      var mapas = [["curso", nombreCurso], ["docente", nombreDoc], ["espacio", nombreEsp]];
      turnos.forEach(function (tn) {
        var hT = horario.filter(function (h) { return (h.turno || "manana") === tn; });
        var jT = jornadas.find(function (j) { return (j.turno || "manana") === tn; });
        var diasT = jT && jT.dias ? jT.dias.split(",").map(function (d) { return d.trim(); }).filter(Boolean) : DIAS;
        var modsT = modulos.filter(function (m) { return jT && m.jornada_id === jT.id && m.tipo === "clase"; })
          .sort(function (a, b) { return a.orden - b.orden; });
        if (modsT.length === 0) {
          var os = {}; hT.forEach(function (h) { os[h.modulo_orden] = true; });
          modsT = Object.keys(os).map(Number).sort(function (a, b) { return a - b; }).map(function (o) { return { orden: o }; });
        }
        mapas.forEach(function (par) {
          var md = par[0]; var mapN = par[1];
          var ids = {};
          hT.forEach(function (h) {
            var k = md === "curso" ? h.curso_id : md === "docente" ? h.docente_id : h.espacio_id;
            if (k) ids[k] = true;
          });
          var ents = Object.keys(ids).map(function (id) { return { id: id, nombre: mapN[id] || "—" }; })
            .sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
          if (ents.length === 0) return;
          var aoa = [];
          aoa.push([(md === "curso" ? "Curso" : md === "docente" ? "Docente" : "Espacio") + " / Día"].concat(diasT));
          ents.forEach(function (ent) {
            modsT.forEach(function (m, i) {
              var fila = [i === 0 ? ent.nombre + "  (M" + m.orden + ")" : "M" + m.orden];
              diasT.forEach(function (dia) {
                var h = hT.find(function (x) {
                  if (x.dia !== dia || x.modulo_orden !== m.orden) return false;
                  return md === "curso" ? x.curso_id === ent.id : md === "docente" ? x.docente_id === ent.id : x.espacio_id === ent.id;
                });
                if (!h) { fila.push(""); return; }
                var txt = nombreMat[h.materia_id] || "";
                if (md === "curso") txt += (nombreDoc[h.docente_id] ? " · " + nombreDoc[h.docente_id] : "") + (h.espacio_id && nombreEsp[h.espacio_id] ? " · " + nombreEsp[h.espacio_id] : "");
                else if (md === "docente") txt += (nombreCurso[h.curso_id] ? " · " + nombreCurso[h.curso_id] : "") + (h.espacio_id && nombreEsp[h.espacio_id] ? " · " + nombreEsp[h.espacio_id] : "");
                else txt += (nombreCurso[h.curso_id] ? " · " + nombreCurso[h.curso_id] : "");
                fila.push(txt);
              });
              aoa.push(fila);
            });
            aoa.push([]);
          });
          var ws = XLSX.utils.aoa_to_sheet(aoa);
          ws["!cols"] = [{ wch: 22 }].concat(diasT.map(function () { return { wch: 26 }; }));
          var hoja = (nombreTurno[tn] || tn) + " · " + (md === "curso" ? "Cursos" : md === "docente" ? "Docentes" : "Espacios");
          XLSX.utils.book_append_sheet(wb, ws, hoja.substring(0, 31));
        });
      });
      XLSX.writeFile(wb, "horario-aulaxpro.xlsx");
    } catch (e) {
      alert("No se pudo exportar: " + e.message);
    }
    setExporting(false);
  }

  function guardarVersion() {
    if (!verNombre.trim()) { setVerMsg("Escribe un nombre para la versión."); return; }
    if (horario.length === 0) { setVerMsg("No hay horario para guardar."); return; }
    setGuardandoVer(true); setVerMsg("");
    supabase.from("hor_horario_versiones").insert({
      owner_id: uid, nombre: verNombre.trim(),
      anio: verAnio ? parseInt(verAnio) : null, cantidad_clases: horario.length,
    }).select().then(function (r) {
      if (r.error || !r.data || !r.data[0]) { setGuardandoVer(false); setVerMsg("No se pudo guardar: " + (r.error ? r.error.message : "")); return; }
      var vid = r.data[0].id;
      var items = horario.map(function (h) {
        return { owner_id: uid, version_id: vid, asignacion_id: h.asignacion_id, curso_id: h.curso_id,
          docente_id: h.docente_id, materia_id: h.materia_id, espacio_id: h.espacio_id,
          dia: h.dia, modulo_orden: h.modulo_orden, turno: h.turno };
      });
      supabase.from("hor_horario_version_items").insert(items).then(function () {
        setGuardandoVer(false); setVerNombre(""); setVerAnio(""); setVerMsg("Versión guardada.");
        cargar();
      });
    });
  }

  function cargarVersion(v) {
    if (!window.confirm('Cargar "' + v.nombre + '" como base reemplaza el horario activo actual. ¿Continuar?')) return;
    setCargandoVer(v.id); setVerMsg("");
    supabase.from("hor_horario_version_items").select("*").eq("version_id", v.id).then(function (r) {
      var items = (r.data || []).map(function (it) {
        return { owner_id: uid, asignacion_id: it.asignacion_id, curso_id: it.curso_id,
          docente_id: it.docente_id, materia_id: it.materia_id, espacio_id: it.espacio_id,
          dia: it.dia, modulo_orden: it.modulo_orden, turno: it.turno };
      });
      supabase.from("hor_horario").delete().eq("owner_id", uid).then(function () {
        var insertar = items.length ? supabase.from("hor_horario").insert(items) : Promise.resolve({});
        Promise.resolve(insertar).then(function () {
          setCargandoVer(""); setVerMsg('Cargado "' + v.nombre + '". Ya puedes editar los cambios del año.');
          cargar();
        });
      });
    });
  }

  function eliminarVersion(v) {
    if (!window.confirm('¿Eliminar la versión "' + v.nombre + '"? Esto no toca el horario activo.')) return;
    supabase.from("hor_horario_versiones").delete().eq("id", v.id).then(function () { cargar(); });
  }

  if (loading) return <div style={{color:C.textMuted,fontSize:13}}>Cargando horario…</div>;

  if (horario.length === 0) {
    return (
      <div>
        <h3 style={{fontSize:17,fontWeight:700,color:C.text,marginBottom:4}}>Ver horario</h3>
        <div style={{background:C.accentBg,border:"1px solid "+C.accent,borderRadius:6,padding:16,fontSize:13,color:C.accent,marginTop:12}}>
          Todavía no generaste ningún horario. Ve a la pestaña <strong>Generar</strong> y corre el armado; después podrás verlo ahí.
        </div>
      </div>
    );
  }

  var tipoLabel = { curso: "Curso", docente: "Docente", espacio: "Espacio" };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}>
        <div>
          <h3 style={{fontSize:17,fontWeight:700,color:C.text,marginBottom:4}}>Ver horario</h3>
          <p style={{fontSize:13,color:C.textMuted}}>Toca cualquier celda para editar, mover o quitar una clase. Exporta todo a Excel.</p>
        </div>
        <button style={Object.assign({},btnPrimary,{display:"flex",alignItems:"center",gap:6})} onClick={exportar} disabled={exporting}>
          <i className="ti ti-download" style={{fontSize:15}}/>{exporting?"Generando…":"Exportar a Excel"}
        </button>
      </div>

      <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:8,padding:16,marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={function(){setMostrarVer(!mostrarVer);}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text}}>
            <i className={"ti "+(mostrarVer?"ti-chevron-down":"ti-chevron-right")} style={{marginRight:6}}/>
            <i className="ti ti-versions" style={{marginRight:6,color:C.accent}}/>Versiones guardadas {versiones.length>0 && <span style={{color:C.textDim,fontWeight:500}}>({versiones.length})</span>}
          </div>
          <span style={{fontSize:12,color:C.textDim}}>Guarda este horario o usa uno anterior como base</span>
        </div>
        {mostrarVer && (
          <div style={{marginTop:14}}>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end",marginBottom:12}}>
              <div style={{flex:"2 1 200px"}}>
                <label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:4}}>Nombre de la versión</label>
                <input style={inp} value={verNombre} onChange={function(e){setVerNombre(e.target.value);}} placeholder="ej: Ciclo 2025" />
              </div>
              <div style={{flex:"0 1 110px"}}>
                <label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:4}}>Año</label>
                <input style={inp} type="number" value={verAnio} onChange={function(e){setVerAnio(e.target.value);}} placeholder="2025" />
              </div>
              <button style={btnPrimary} onClick={guardarVersion} disabled={guardandoVer}>{guardandoVer?"Guardando…":"Guardar versión"}</button>
            </div>
            {verMsg && <div style={{fontSize:12,color:C.green,marginBottom:10}}>{verMsg}</div>}
            {versiones.length===0 ? (
              <div style={{fontSize:13,color:C.textDim}}>Todavía no guardaste ninguna versión. Guarda la actual para poder reusarla el año que viene.</div>
            ) : (
              <div style={{border:"1px solid "+C.border,borderRadius:6,overflow:"hidden"}}>
                {versiones.map(function(v,idx){
                  return (
                    <div key={v.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderTop:idx>0?"1px solid "+C.border:"none"}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:700,color:C.text}}>{v.nombre}{v.anio?" · "+v.anio:""}</div>
                        <div style={{fontSize:11,color:C.textDim}}>{v.cantidad_clases||0} clases · guardada {(v.created_at||"").substring(0,10)}</div>
                      </div>
                      <button style={Object.assign({},btnGhost,{fontSize:12,padding:"6px 12px"})} onClick={function(){cargarVersion(v);}} disabled={cargandoVer===v.id}>{cargandoVer===v.id?"Cargando…":"Cargar como base"}</button>
                      <button onClick={function(){eliminarVersion(v);}} style={{background:"transparent",border:"none",cursor:"pointer",color:C.red,fontSize:12,fontFamily:"Quicksand,sans-serif"}}>Eliminar</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"flex-end",marginBottom:18}}>
        {turnos.length > 1 && (
          <div>
            <label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:4}}>Turno</label>
            <div style={{display:"flex",gap:6}}>
              {turnos.map(function (tn) {
                var a = tn === turnoActivo;
                return <button key={tn} onClick={function(){setTurno(tn);setSel("");}} style={a?btnPrimary:btnGhost}>{nombreTurno[tn]||tn}</button>;
              })}
            </div>
          </div>
        )}
        <div>
          <label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:4}}>Ver por</label>
          <div style={{display:"flex",gap:6}}>
            {["curso","docente","espacio"].map(function (m) {
              var a = m === modo;
              return <button key={m} onClick={function(){setModo(m);setSel("");}} style={a?btnPrimary:btnGhost}>{tipoLabel[m]}</button>;
            })}
          </div>
        </div>
        <div style={{flex:"1 1 200px",maxWidth:280}}>
          <label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:4}}>{tipoLabel[modo]}</label>
          <select style={inp} value={selActivo} onChange={function(e){setSel(e.target.value);}}>
            {entidades.map(function (ent) { return <option key={ent.id} value={ent.id}>{ent.nombre}</option>; })}
          </select>
        </div>
      </div>

      {modo==="curso" && <div style={{fontSize:12,color:C.textDim,marginBottom:10}}><i className="ti ti-click" style={{marginRight:4}}/>Toca una celda para cambiar docente/espacio, mover o quitar la clase. En celdas vacías puedes agregar una.</div>}

      {entidades.length === 0 ? (
        <div style={{color:C.textDim,fontSize:13}}>No hay clases de {modo} en este turno.</div>
      ) : (
        <div style={{overflowX:"auto",border:"1px solid "+C.border,borderRadius:6}}>
          <table style={{borderCollapse:"collapse",width:"100%",minWidth:560,fontSize:13}}>
            <thead>
              <tr>
                <th style={{background:C.bg,border:"1px solid "+C.border,padding:"8px 10px",fontWeight:700,color:C.textMuted,width:70,textAlign:"left"}}>Módulo</th>
                {diasTurno.map(function (dia) {
                  return <th key={dia} style={{background:C.bg,border:"1px solid "+C.border,padding:"8px 10px",fontWeight:700,color:C.text,textAlign:"center"}}>{dia}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {modsClase.map(function (m, i) {
                return (
                  <tr key={m.orden}>
                    <td style={{background:C.bg,border:"1px solid "+C.border,padding:"8px 10px",fontWeight:700,color:C.textMuted,textAlign:"center"}}>{i+1}°</td>
                    {diasTurno.map(function (dia) {
                      var h = claseEn(dia, m.orden);
                      var editable = modo === "curso";
                      if (!h) return (
                        <td key={dia} onClick={editable?function(){setEditar({dia:dia,orden:m.orden,clase:null});}:undefined}
                          style={{border:"1px solid "+C.border,padding:4,background:"#fafaf8",cursor:editable?"pointer":"default"}}/>
                      );
                      var col = colorMat[h.materia_id] || C.accent;
                      return (
                        <td key={dia} onClick={editable?function(){setEditar({dia:dia,orden:m.orden,clase:h});}:undefined}
                          style={{border:"1px solid "+C.border,padding:4,verticalAlign:"top",cursor:editable?"pointer":"default"}}>
                          <div style={{background:col+"18",borderLeft:"3px solid "+col,borderRadius:4,padding:"6px 8px",minHeight:34}}>
                            <div style={{fontWeight:700,color:C.text,fontSize:13}}>{nombreMat[h.materia_id]||"—"}</div>
                            {detalle(h) && <div style={{fontSize:11,color:C.textMuted,marginTop:2}}>{detalle(h)}</div>}
                            {modo!=="espacio" && h.espacio_id && nombreEsp[h.espacio_id] && (
                              <div style={{fontSize:11,color:C.textDim,marginTop:1}}><i className="ti ti-map-pin" style={{fontSize:11}}/> {nombreEsp[h.espacio_id]}</div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editar && (
        <EditarClaseModal
          ctx={editar} uid={uid} cursoId={selActivo} turno={turnoActivo}
          horario={horario} asigs={asigs} docentes={docentes} espacios={espacios}
          nombreMat={nombreMat} nombreDoc={nombreDoc} nombreEsp={nombreEsp} nombreCurso={nombreCurso}
          modsClase={modsClase} diasTurno={diasTurno} dispSet={dispSet} idxClaseDeOrden={idxClaseDeOrden}
          onClose={function(){setEditar(null);}}
          onSaved={function(){setEditar(null);cargar();}}
        />
      )}
    </div>
  );
}

// ---------- Modal de edición manual de una clase ----------
function EditarClaseModal(p) {
  var ctx = p.ctx; var clase = ctx.clase;
  var asignsCurso = p.asigs.filter(function (a) { return a.curso_id === p.cursoId; });

  var [asigId, setAsigId] = useState(clase ? clase.asignacion_id : (asignsCurso[0] ? asignsCurso[0].id : ""));
  var [docenteId, setDocenteId] = useState(clase ? clase.docente_id : "");
  var [espacioId, setEspacioId] = useState(clase ? (clase.espacio_id || "") : "");
  var [dia, setDia] = useState(ctx.dia);
  var [orden, setOrden] = useState(ctx.orden);
  var [saving, setSaving] = useState(false);

  // Al elegir asignación (en alta o cambio de materia), precargar docente/espacio de la asignación
  var asigSel = p.asigs.find(function (a) { return a.id === asigId; });
  useEffect(function () {
    if (!clase && asigSel) {
      setDocenteId(asigSel.docente_id || "");
      setEspacioId(asigSel.espacio_id || "");
    }
  }, [asigId]);

  var materiaId = asigSel ? asigSel.materia_id : (clase ? clase.materia_id : null);

  // Detección de conflictos para el slot elegido
  function conflictos() {
    var out = [];
    var otras = p.horario.filter(function (h) {
      return (h.turno||"manana") === p.turno && h.dia === dia && h.modulo_orden === orden && (!clase || h.id !== clase.id);
    });
    if (otras.some(function (h) { return h.curso_id === p.cursoId; }))
      out.push("Este curso ya tiene otra clase en ese módulo.");
    if (docenteId && otras.some(function (h) { return h.docente_id === docenteId; }))
      out.push((p.nombreDoc[docenteId]||"El docente") + " ya está dando clase en otro curso en ese módulo.");
    if (espacioId && otras.some(function (h) { return h.espacio_id === espacioId; }))
      out.push((p.nombreEsp[espacioId]||"El espacio") + " ya está ocupado en ese módulo.");
    if (docenteId) {
      var ds = p.dispSet(docenteId);
      if (ds) {
        var key = dia + "-" + p.idxClaseDeOrden(orden);
        if (!ds[key]) out.push((p.nombreDoc[docenteId]||"El docente") + " no tiene disponibilidad en ese día/módulo.");
      }
    }
    return out;
  }
  var confs = asigId || clase ? conflictos() : [];

  function guardar() {
    setSaving(true);
    var fila = {
      owner_id: p.uid,
      asignacion_id: asigId || (clase ? clase.asignacion_id : null),
      curso_id: p.cursoId,
      docente_id: docenteId || null,
      materia_id: materiaId,
      espacio_id: espacioId || null,
      dia: dia,
      modulo_orden: orden,
      turno: p.turno,
    };
    if (!clase) {
      supabase.from("hor_horario").insert(fila).then(function () { setSaving(false); p.onSaved(); });
      return;
    }
    // Edición: si el destino cambió y ya hay otra clase del mismo curso en ese slot, intercambiarlas.
    var movio = (dia !== clase.dia || orden !== clase.modulo_orden);
    var ocupante = movio ? p.horario.find(function (h) {
      return (h.turno||"manana") === p.turno && h.dia === dia && h.modulo_orden === orden
        && h.curso_id === p.cursoId && h.id !== clase.id;
    }) : null;
    if (ocupante) {
      // la clase que estaba en el destino se va al slot de origen de la que movemos
      Promise.all([
        supabase.from("hor_horario").update(fila).eq("id", clase.id),
        supabase.from("hor_horario").update({ dia: clase.dia, modulo_orden: clase.modulo_orden }).eq("id", ocupante.id),
      ]).then(function () { setSaving(false); p.onSaved(); });
    } else {
      supabase.from("hor_horario").update(fila).eq("id", clase.id).then(function () { setSaving(false); p.onSaved(); });
    }
  }
  function quitar() {
    setSaving(true);
    supabase.from("hor_horario").delete().eq("id", clase.id).then(function () { setSaving(false); p.onSaved(); });
  }

  var overlay = {position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16};
  var box = {background:"#fff",borderRadius:10,padding:22,maxWidth:460,width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 10px 40px rgba(0,0,0,.2)"};
  var lbl = {fontSize:11,color:C.textMuted,display:"block",marginBottom:4,marginTop:12};

  return (
    <div style={overlay} onClick={p.onClose}>
      <div style={box} onClick={function(e){e.stopPropagation();}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <h3 style={{fontSize:16,fontWeight:700,color:C.text}}>{clase?"Editar clase":"Agregar clase"}</h3>
          <button onClick={p.onClose} style={{background:"transparent",border:"none",cursor:"pointer",color:C.textMuted,fontSize:18}}>×</button>
        </div>
        <div style={{fontSize:12,color:C.textDim,marginBottom:4}}>{p.nombreCurso[p.cursoId]||""}</div>

        <label style={lbl}>Materia / Asignación</label>
        {clase ? (
          <select style={inp} value={asigId} onChange={function(e){setAsigId(e.target.value);}}>
            {asignsCurso.map(function (a) { return <option key={a.id} value={a.id}>{p.nombreMat[a.materia_id]||"Materia"} ({p.nombreDoc[a.docente_id]||"s/doc"})</option>; })}
          </select>
        ) : (
          asignsCurso.length === 0
            ? <div style={{fontSize:13,color:C.red}}>Este curso no tiene asignaciones cargadas.</div>
            : <select style={inp} value={asigId} onChange={function(e){setAsigId(e.target.value);}}>
                {asignsCurso.map(function (a) { return <option key={a.id} value={a.id}>{p.nombreMat[a.materia_id]||"Materia"} ({p.nombreDoc[a.docente_id]||"s/doc"})</option>; })}
              </select>
        )}

        <label style={lbl}>Docente</label>
        <select style={inp} value={docenteId} onChange={function(e){setDocenteId(e.target.value);}}>
          <option value="">— sin docente —</option>
          {p.docentes.map(function (d) { return <option key={d.id} value={d.id}>{d.nombre}</option>; })}
        </select>

        <label style={lbl}>Espacio</label>
        <select style={inp} value={espacioId} onChange={function(e){setEspacioId(e.target.value);}}>
          <option value="">— sin espacio —</option>
          {p.espacios.map(function (e) { return <option key={e.id} value={e.id}>{e.nombre}</option>; })}
        </select>

        <div style={{display:"flex",gap:10}}>
          <div style={{flex:1}}>
            <label style={lbl}>Día</label>
            <select style={inp} value={dia} onChange={function(e){setDia(e.target.value);}}>
              {p.diasTurno.map(function (d) { return <option key={d} value={d}>{d}</option>; })}
            </select>
          </div>
          <div style={{flex:1}}>
            <label style={lbl}>Módulo</label>
            <select style={inp} value={orden} onChange={function(e){setOrden(parseInt(e.target.value));}}>
              {p.modsClase.map(function (m, i) { return <option key={m.orden} value={m.orden}>{(i+1)+"° clase"}</option>; })}
            </select>
          </div>
        </div>

        {confs.length > 0 && (
          <div style={{background:"#fef2f2",border:"1px solid "+C.red,borderRadius:6,padding:"10px 12px",marginTop:14,fontSize:12,color:C.red}}>
            <div style={{fontWeight:700,marginBottom:4}}><i className="ti ti-alert-triangle" style={{marginRight:4}}/>Conflictos detectados</div>
            {confs.map(function (c, i) { return <div key={i} style={{marginTop:2}}>• {c}</div>; })}
            <div style={{marginTop:6,color:C.textMuted}}>Podés guardar igual si estás seguro.</div>
          </div>
        )}

        <div style={{display:"flex",gap:10,marginTop:18,alignItems:"center"}}>
          <button style={Object.assign({},btnPrimary,confs.length?{background:C.amber}:{})} onClick={guardar} disabled={saving||(!clase&&asignsCurso.length===0)}>
            {saving?"Guardando…":(confs.length?"Guardar igual":"Guardar")}
          </button>
          <button style={btnGhost} onClick={p.onClose}>Cancelar</button>
          {clase && <button onClick={quitar} disabled={saving} style={{marginLeft:"auto",background:"transparent",border:"none",cursor:"pointer",color:C.red,fontSize:13,fontWeight:700,fontFamily:"Quicksand,sans-serif"}}>Quitar clase</button>}
        </div>
      </div>
    </div>
  );
}

// ---------- Asistente de cambios (reubicación automática, sin IA) ----------
function CambiosTab({ uid }) {
  var [loading, setLoading] = useState(true);
  var [horario, setHorario] = useState([]);
  var [docentes, setDocentes] = useState([]);
  var [cursos, setCursos] = useState([]);
  var [materias, setMaterias] = useState([]);
  var [espacios, setEspacios] = useState([]);
  var [jornadas, setJornadas] = useState([]);
  var [modulos, setModulos] = useState([]);
  var [tipo, setTipo] = useState("mover_dia"); // mover_dia | reemplazar | liberar
  var [docA, setDocA] = useState("");
  var [docB, setDocB] = useState("");
  var [diaDesde, setDiaDesde] = useState("");
  var [diaHasta, setDiaHasta] = useState("");
  var [plan, setPlan] = useState(null); // {movimientos:[], noResueltos:[], aplicar:fn}
  var [aplicando, setAplicando] = useState(false);
  var [okMsg, setOkMsg] = useState("");

  function cargar() {
    if (!uid) return;
    setLoading(true);
    Promise.all([
      supabase.from("hor_horario").select("*").eq("owner_id", uid),
      supabase.from("hor_docentes").select("*").eq("owner_id", uid),
      supabase.from("hor_cursos").select("*").eq("owner_id", uid),
      supabase.from("hor_materias").select("*").eq("owner_id", uid),
      supabase.from("hor_espacios").select("*").eq("owner_id", uid),
      supabase.from("hor_jornadas").select("*").eq("owner_id", uid),
      supabase.from("hor_modulos").select("*").eq("owner_id", uid),
    ]).then(function (rs) {
      setHorario(rs[0].data || []);
      setDocentes(rs[1].data || []);
      setCursos(rs[2].data || []);
      setMaterias(rs[3].data || []);
      setEspacios(rs[4].data || []);
      setJornadas(rs[5].data || []);
      setModulos(rs[6].data || []);
      setLoading(false);
    });
  }
  useEffect(cargar, [uid]);

  var nombreDoc = {}; docentes.forEach(function (d) { nombreDoc[d.id] = d.nombre; });
  var nombreCurso = {}; cursos.forEach(function (c) { nombreCurso[c.id] = c.nombre; });
  var nombreMat = {}; materias.forEach(function (m) { nombreMat[m.id] = m.nombre; });

  function slotsTurno(turno) {
    var j = jornadas.find(function (x) { return (x.turno || "manana") === turno; });
    var dias = j && j.dias ? j.dias.split(",").map(function (d) { return d.trim(); }).filter(Boolean) : DIAS;
    var mods = modulos.filter(function (m) { return j && m.jornada_id === j.id && m.tipo === "clase"; })
      .sort(function (a, b) { return a.orden - b.orden; });
    if (mods.length === 0) {
      var os = {}; horario.filter(function (h) { return (h.turno||"manana") === turno; }).forEach(function (h) { os[h.modulo_orden] = true; });
      mods = Object.keys(os).map(Number).sort(function (a, b) { return a - b; }).map(function (o) { return { orden: o }; });
    }
    return { dias: dias, mods: mods };
  }
  function idxClase(turno, orden) {
    var m = slotsTurno(turno).mods;
    for (var i = 0; i < m.length; i++) if (m[i].orden === orden) return i;
    return 0;
  }
  function dispSet(docId) {
    var d = docentes.find(function (x) { return x.id === docId; });
    if (!d || !d.disponibilidad) return null;
    var s = {}; d.disponibilidad.split(";").filter(Boolean).forEach(function (sl) { s[sl.trim()] = true; });
    return s;
  }

  // Ocupación simulada: trabaja sobre una copia del horario
  function construirOcup(items) {
    var oc = { curso: {}, doc: {}, esp: {} };
    items.forEach(function (h) {
      var k = (h.turno||"manana")+"|"+h.dia+"|"+h.modulo_orden;
      oc.curso[h.curso_id+"|"+k] = h.id;
      if (h.docente_id) oc.doc[h.docente_id+"|"+k] = h.id;
      if (h.espacio_id) oc.esp[h.espacio_id+"|"+k] = h.id;
    });
    return oc;
  }
  // ¿Puede ir la clase h al slot (dia,orden) sin chocar? (ignora su propia posición)
  function libre(h, dia, orden, items, oc) {
    var turno = h.turno||"manana";
    var k = turno+"|"+dia+"|"+orden;
    if (oc.curso[h.curso_id+"|"+k] && oc.curso[h.curso_id+"|"+k] !== h.id) return false;
    if (h.docente_id && oc.doc[h.docente_id+"|"+k] && oc.doc[h.docente_id+"|"+k] !== h.id) return false;
    if (h.espacio_id && oc.esp[h.espacio_id+"|"+k] && oc.esp[h.espacio_id+"|"+k] !== h.id) return false;
    var ds = dispSet(h.docente_id);
    if (ds) { if (!ds[dia+"-"+idxClase(turno,orden)]) return false; }
    return true;
  }

  function calcularPlan() {
    setOkMsg("");
    var items = horario.map(function (h) { return Object.assign({}, h); }); // copia mutable
    var oc = construirOcup(items);
    var movimientos = []; // {id, de:{dia,orden}, a:{dia,orden}, texto}
    var noResueltos = [];

    function mover(h, dia, orden) {
      var kOld = (h.turno||"manana")+"|"+h.dia+"|"+h.modulo_orden;
      delete oc.curso[h.curso_id+"|"+kOld]; if (h.docente_id) delete oc.doc[h.docente_id+"|"+kOld]; if (h.espacio_id) delete oc.esp[h.espacio_id+"|"+kOld];
      var de = { dia: h.dia, orden: h.modulo_orden };
      h.dia = dia; h.modulo_orden = orden;
      var kNew = (h.turno||"manana")+"|"+dia+"|"+orden;
      oc.curso[h.curso_id+"|"+kNew] = h.id; if (h.docente_id) oc.doc[h.docente_id+"|"+kNew] = h.id; if (h.espacio_id) oc.esp[h.espacio_id+"|"+kNew] = h.id;
      movimientos.push({ id: h.id, de: de, a: { dia: dia, orden: orden },
        texto: nombreMat[h.materia_id]+" ("+nombreCurso[h.curso_id]+") — "+de.dia+" "+ (idxClase(h.turno,de.orden)+1)+"° → "+dia+" "+(idxClase(h.turno,orden)+1)+"°" });
    }

    // Busca el primer slot libre para h, en los días permitidos, probando todos los módulos
    function buscarSlot(h, diasPermitidos) {
      var turno = h.turno||"manana";
      var st = slotsTurno(turno);
      for (var di = 0; di < diasPermitidos.length; di++) {
        var dia = diasPermitidos[di];
        for (var mi = 0; mi < st.mods.length; mi++) {
          var orden = st.mods[mi].orden;
          if (libre(h, dia, orden, items, oc)) return { dia: dia, orden: orden };
        }
      }
      return null;
    }

    if (tipo === "mover_dia") {
      if (!docA || !diaDesde || !diaHasta) { setPlan({ error: "Completa docente, día de origen y día de destino." }); return; }
      var clasesDoc = items.filter(function (h) { return h.docente_id === docA && h.dia === diaDesde; });
      if (clasesDoc.length === 0) { setPlan({ error: "Ese docente no tiene clases el "+diaDesde+"." }); return; }
      clasesDoc.forEach(function (h) {
        var slot = buscarSlot(h, [diaHasta]);
        if (slot) mover(h, slot.dia, slot.orden);
        else noResueltos.push({ texto: nombreMat[h.materia_id]+" ("+nombreCurso[h.curso_id]+") — no entra el "+diaHasta+" (sin módulo libre o sin disponibilidad)." });
      });
    } else if (tipo === "liberar") {
      if (!docA || !diaDesde) { setPlan({ error: "Completa docente y el día a liberar." }); return; }
      var clasesLib = items.filter(function (h) { return h.docente_id === docA && h.dia === diaDesde; });
      if (clasesLib.length === 0) { setPlan({ error: "Ese docente no tiene clases el "+diaDesde+"." }); return; }
      var otrosDias = slotsTurno(clasesLib[0].turno||"manana").dias.filter(function (d) { return d !== diaDesde; });
      clasesLib.forEach(function (h) {
        var slot = buscarSlot(h, otrosDias);
        if (slot) mover(h, slot.dia, slot.orden);
        else noResueltos.push({ texto: nombreMat[h.materia_id]+" ("+nombreCurso[h.curso_id]+") — no se pudo reubicar fuera del "+diaDesde+"." });
      });
    } else if (tipo === "reemplazar") {
      if (!docA || !docB) { setPlan({ error: "Elige el docente que sale y el que entra." }); return; }
      if (docA === docB) { setPlan({ error: "Son el mismo docente." }); return; }
      var clasesR = items.filter(function (h) { return h.docente_id === docA; });
      if (clasesR.length === 0) { setPlan({ error: "Ese docente no tiene clases asignadas." }); return; }
      var dsB = dispSet(docB);
      clasesR.forEach(function (h) {
        // reasignar docente al que entra
        var kOld = (h.turno||"manana")+"|"+h.dia+"|"+h.modulo_orden;
        delete oc.doc[docA+"|"+kOld];
        h.docente_id = docB;
        // ¿el nuevo docente puede en el mismo slot? (disponibilidad + no estar ocupado en otro curso)
        var okMismo = true;
        if (oc.doc[docB+"|"+kOld]) okMismo = false;
        if (dsB && !dsB[h.dia+"-"+idxClase(h.turno,h.modulo_orden)]) okMismo = false;
        if (okMismo) {
          oc.doc[docB+"|"+kOld] = h.id;
          movimientos.push({ id: h.id, cambioDoc: true,
            texto: nombreMat[h.materia_id]+" ("+nombreCurso[h.curso_id]+") "+h.dia+" "+(idxClase(h.turno,h.modulo_orden)+1)+"° — pasa a "+nombreDoc[docB] });
        } else {
          // buscar otro slot donde el nuevo docente sí pueda
          var st = slotsTurno(h.turno||"manana");
          var slot = buscarSlot(h, st.dias);
          if (slot) {
            var de = { dia: h.dia, orden: h.modulo_orden };
            h.dia = slot.dia; h.modulo_orden = slot.orden;
            var kNew = (h.turno||"manana")+"|"+slot.dia+"|"+slot.orden;
            oc.curso[h.curso_id+"|"+kNew] = h.id; oc.doc[docB+"|"+kNew] = h.id; if (h.espacio_id) oc.esp[h.espacio_id+"|"+kNew] = h.id;
            delete oc.curso[h.curso_id+"|"+kOld]; if (h.espacio_id) delete oc.esp[h.espacio_id+"|"+kOld];
            movimientos.push({ id: h.id, cambioDoc: true, de: de, a: { dia: slot.dia, orden: slot.orden },
              texto: nombreMat[h.materia_id]+" ("+nombreCurso[h.curso_id]+") — pasa a "+nombreDoc[docB]+" y se mueve a "+slot.dia+" "+(idxClase(h.turno,slot.orden)+1)+"°" });
          } else {
            noResueltos.push({ texto: nombreMat[h.materia_id]+" ("+nombreCurso[h.curso_id]+") — "+nombreDoc[docB]+" no tiene disponibilidad para tomarla." });
          }
        }
      });
    }

    // construir función de aplicación (updates reales)
    var updates = items.filter(function (h) {
      var orig = horario.find(function (o) { return o.id === h.id; });
      return orig && (orig.dia !== h.dia || orig.modulo_orden !== h.modulo_orden || orig.docente_id !== h.docente_id);
    });
    setPlan({ movimientos: movimientos, noResueltos: noResueltos, updates: updates });
  }

  function aplicar() {
    if (!plan || !plan.updates || plan.updates.length === 0) return;
    setAplicando(true);
    Promise.all(plan.updates.map(function (h) {
      return supabase.from("hor_horario").update({ dia: h.dia, modulo_orden: h.modulo_orden, docente_id: h.docente_id }).eq("id", h.id);
    })).then(function () {
      setAplicando(false); setPlan(null); setOkMsg("Cambios aplicados. Revisalos en \"Ver horario\".");
      cargar();
    });
  }

  if (loading) return <div style={{color:C.textMuted,fontSize:13}}>Cargando…</div>;
  if (horario.length === 0) {
    return (
      <div>
        <h3 style={{fontSize:17,fontWeight:700,color:C.text,marginBottom:4}}>Cambios</h3>
        <div style={{background:C.accentBg,border:"1px solid "+C.accent,borderRadius:6,padding:16,fontSize:13,color:C.accent,marginTop:12}}>Primero genera un horario; después podrás pedir cambios aquí.</div>
      </div>
    );
  }

  var diasSel = (function () { var s = {}; jornadas.forEach(function (j) { (j.dias||"").split(",").map(function (d){return d.trim();}).filter(Boolean).forEach(function (d){s[d]=true;}); }); var ks = Object.keys(s); return ks.length?ks:DIAS; })();
  var tipos = [
    { id:"mover_dia", label:"Mover las clases de un docente de un día a otro" },
    { id:"reemplazar", label:"Reemplazar un docente por otro" },
    { id:"liberar", label:"Liberar un día de un docente" },
  ];

  return (
    <div>
      <h3 style={{fontSize:17,fontWeight:700,color:C.text,marginBottom:4}}>Cambios automáticos</h3>
      <p style={{fontSize:13,color:C.textMuted,marginBottom:16}}>Pide un cambio y el sistema busca cómo acomodarlo respetando las restricciones. Te muestra el plan antes de aplicarlo.</p>

      <div style={{marginBottom:14}}>
        <label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:6}}>Tipo de cambio</label>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {tipos.map(function (t) {
            var a = t.id === tipo;
            return <button key={t.id} onClick={function(){setTipo(t.id);setPlan(null);}} style={Object.assign({},a?btnPrimary:btnGhost,{fontSize:12})}>{t.label}</button>;
          })}
        </div>
      </div>

      <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:6,padding:16,marginBottom:16,display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:"1 1 180px"}}>
          <label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:4}}>{tipo==="reemplazar"?"Docente que sale":"Docente"}</label>
          <select style={inp} value={docA} onChange={function(e){setDocA(e.target.value);setPlan(null);}}>
            <option value="">— elegir —</option>
            {docentes.map(function (d) { return <option key={d.id} value={d.id}>{d.nombre}</option>; })}
          </select>
        </div>
        {tipo==="reemplazar" && (
          <div style={{flex:"1 1 180px"}}>
            <label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:4}}>Docente que entra</label>
            <select style={inp} value={docB} onChange={function(e){setDocB(e.target.value);setPlan(null);}}>
              <option value="">— elegir —</option>
              {docentes.map(function (d) { return <option key={d.id} value={d.id}>{d.nombre}</option>; })}
            </select>
          </div>
        )}
        {(tipo==="mover_dia"||tipo==="liberar") && (
          <div style={{flex:"1 1 140px"}}>
            <label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:4}}>{tipo==="liberar"?"Día a liberar":"Día de origen"}</label>
            <select style={inp} value={diaDesde} onChange={function(e){setDiaDesde(e.target.value);setPlan(null);}}>
              <option value="">—</option>
              {diasSel.map(function (d) { return <option key={d} value={d}>{d}</option>; })}
            </select>
          </div>
        )}
        {tipo==="mover_dia" && (
          <div style={{flex:"1 1 140px"}}>
            <label style={{fontSize:11,color:C.textMuted,display:"block",marginBottom:4}}>Día de destino</label>
            <select style={inp} value={diaHasta} onChange={function(e){setDiaHasta(e.target.value);setPlan(null);}}>
              <option value="">—</option>
              {diasSel.map(function (d) { return <option key={d} value={d}>{d}</option>; })}
            </select>
          </div>
        )}
        <button style={btnPrimary} onClick={calcularPlan}>Calcular cambio</button>
      </div>

      {okMsg && <div style={{color:C.green,fontSize:13,marginBottom:12}}><i className="ti ti-check" style={{marginRight:4}}/>{okMsg}</div>}

      {plan && plan.error && <div style={{color:C.red,fontSize:13,marginBottom:12}}>{plan.error}</div>}

      {plan && !plan.error && (
        <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:6,padding:16}}>
          <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10}}>Plan propuesto</div>
          {plan.movimientos.length === 0 ? (
            <div style={{fontSize:13,color:C.textDim}}>No hay movimientos para aplicar.</div>
          ) : (
            <div style={{marginBottom:plan.noResueltos.length?14:0}}>
              {plan.movimientos.map(function (m, i) {
                return <div key={i} style={{fontSize:13,color:C.text,padding:"6px 10px",background:C.accentBg,borderRadius:4,marginBottom:5}}><i className="ti ti-arrow-right" style={{marginRight:6,color:C.accent}}/>{m.texto}</div>;
              })}
            </div>
          )}
          {plan.noResueltos.length > 0 && (
            <div style={{background:"#fef2f2",border:"1px solid "+C.red,borderRadius:6,padding:"10px 12px",fontSize:12,color:C.red,marginBottom:14}}>
              <div style={{fontWeight:700,marginBottom:4}}><i className="ti ti-alert-triangle" style={{marginRight:4}}/>No se pudieron resolver</div>
              {plan.noResueltos.map(function (n, i) { return <div key={i} style={{marginTop:2}}>• {n.texto}</div>; })}
            </div>
          )}
          {plan.movimientos.length > 0 && (
            <div style={{display:"flex",gap:10,marginTop:4}}>
              <button style={btnPrimary} onClick={aplicar} disabled={aplicando}>{aplicando?"Aplicando…":"Aplicar cambios"}</button>
              <button style={btnGhost} onClick={function(){setPlan(null);}}>Descartar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function PlaceholderTab({ titulo, texto }) {
  return (
    <div>
      <h3 style={{fontSize:17,fontWeight:700,color:C.text,marginBottom:4}}>{titulo}</h3>
      <div style={{background:C.accentBg,border:"1px solid "+C.accent,borderRadius:6,padding:16,fontSize:13,color:C.accent,marginTop:12}}>{texto}</div>
    </div>
  );
}
