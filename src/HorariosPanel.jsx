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
    for(var i=0;i<req.length;i++){ if(!form[req[i].k]){ setErr("Completá: "+req[i].label); return; } }
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
      <p style={{fontSize:13,color:C.textMuted,marginBottom:16}}>Cargá las {titulo.toLowerCase()} de tu institución.</p>

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
      <p style={{fontSize:13,color:C.textMuted,marginBottom:16}}>Configurá cada turno: días, hora de inicio y los módulos del día (bloques de clase y recreos, en orden).</p>

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

  function guardarJornada() {
    supabase.from("hor_jornadas").update({dias:dias,hora_inicio:horaInicio}).eq("id",jornada.id).then(function(){
      setSavedMsg("Guardado"); setTimeout(function(){setSavedMsg("");},1500);
    });
  }
  function agregarModulo(tipo) {
    var orden = (modulos.length? Math.max.apply(null,modulos.map(function(m){return m.orden;})) : 0) + 1;
    supabase.from("hor_modulos").insert({owner_id:uid,jornada_id:jornada.id,orden:orden,tipo:tipo,duracion_minutos:tipo==="recreo"?15:60}).then(function(){onChange();});
  }
  function cambiarDuracion(id,val) {
    supabase.from("hor_modulos").update({duracion_minutos:parseInt(val)||0}).eq("id",id).then(function(){onChange();});
  }
  function borrarModulo(id) {
    supabase.from("hor_modulos").delete().eq("id",id).then(function(){onChange();});
  }

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

      <div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>Módulos del día</div>
      {modulos.length===0 ? (
        <div style={{color:C.textDim,fontSize:13,marginBottom:10}}>Agregá los bloques del día en orden (clases y recreos).</div>
      ) : (
        <div style={{marginBottom:10}}>
          {modulos.sort(function(a,b){return a.orden-b.orden;}).map(function(m,i){
            return (
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",background:m.tipo==="recreo"?"#fff7ed":C.accentBg,borderRadius:4,marginBottom:5}}>
                <span style={{fontSize:12,fontWeight:700,color:m.tipo==="recreo"?C.amber:C.accent,minWidth:70}}>{m.tipo==="recreo"?"Recreo":"Clase "+(i+1)}</span>
                <input style={Object.assign({},inp,{width:70,padding:"5px 8px",fontSize:13})} type="number" value={m.duracion_minutos} onChange={function(e){cambiarDuracion(m.id,e.target.value);}} />
                <span style={{fontSize:12,color:C.textMuted}}>min</span>
                <button onClick={function(){borrarModulo(m.id);}} style={{marginLeft:"auto",background:"transparent",border:"none",cursor:"pointer",color:C.red,fontSize:12,fontFamily:"Quicksand,sans-serif"}}>Quitar</button>
              </div>
            );
          })}
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
    if(!nombre.trim()){setErr("Poné el nombre del docente");return;}
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
      <p style={{fontSize:13,color:C.textMuted,marginBottom:16}}>Cargá los docentes y marcá en qué bloques está disponible cada uno.</p>

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
        <p style={{fontSize:12,color:C.textMuted,marginBottom:14}}>Marcá los bloques en los que el docente puede dar clase. Verde = disponible.</p>

        {(dias.length===0||nModulos===0) ? (
          <div style={{color:C.amber,fontSize:13,marginBottom:16}}>Primero configurá la jornada (días y módulos de clase) en la pestaña Jornada.</div>
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
  return <PlaceholderTab titulo="Asignaciones" texto="Acá vas a cruzar materia + curso + docente + horas semanales. Se habilita cuando tengas cargados materias, cursos y docentes." />;
}
function GenerarTab({ uid }) {
  return <PlaceholderTab titulo="Generar horario" texto="El algoritmo que arma el horario respetando las restricciones. Se desarrolla en la Fase 2." />;
}
function VerHorarioTab({ uid }) {
  return <PlaceholderTab titulo="Ver horario" texto="Visualización del horario generado por curso, docente o espacio, y exportación a Excel. Fase 3." />;
}
function PlaceholderTab({ titulo, texto }) {
  return (
    <div>
      <h3 style={{fontSize:17,fontWeight:700,color:C.text,marginBottom:4}}>{titulo}</h3>
      <div style={{background:C.accentBg,border:"1px solid "+C.accent,borderRadius:6,padding:16,fontSize:13,color:C.accent,marginTop:12}}>{texto}</div>
    </div>
  );
}
