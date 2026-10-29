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
    if(!form.materia_id||!form.curso_id||!form.docente_id){ setErr("Elegí materia, curso y docente"); return; }
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
      <p style={{fontSize:13,color:C.textMuted,marginBottom:16}}>Definí qué materia da cada docente en cada curso, y cuántas horas por semana.</p>

      {faltan.length>0 ? (
        <div style={{background:"#fff7ed",border:"1px solid "+C.amber,borderRadius:6,padding:16,fontSize:13,color:C.amber}}>
          Primero cargá {faltan.join(", ")} en sus pestañas para poder crear asignaciones.
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
      .catch(function(){ setErr("No se pudo generar. Intentá de nuevo."); setGen(false); });
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
              <strong>✓ Horario generado completo.</strong> Se ubicaron las {res.ubicadas} horas de clase sin ningún conflicto. Mirá el resultado en la pestaña "Ver horario".
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
  var [modo, setModo] = useState("curso");
  var [turno, setTurno] = useState("");
  var [sel, setSel] = useState("");
  var [exporting, setExporting] = useState(false);

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
    ]).then(function (rs) {
      setHorario(rs[0].data || []);
      setCursos(rs[1].data || []);
      setDocentes(rs[2].data || []);
      setEspacios(rs[3].data || []);
      setMaterias(rs[4].data || []);
      setJornadas(rs[5].data || []);
      setModulos(rs[6].data || []);
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

  if (loading) return <div style={{color:C.textMuted,fontSize:13}}>Cargando horario…</div>;

  if (horario.length === 0) {
    return (
      <div>
        <h3 style={{fontSize:17,fontWeight:700,color:C.text,marginBottom:4}}>Ver horario</h3>
        <div style={{background:C.accentBg,border:"1px solid "+C.accent,borderRadius:6,padding:16,fontSize:13,color:C.accent,marginTop:12}}>
          Todavía no generaste ningún horario. Andá a la pestaña <strong>Generar</strong> y corré el armado; después vas a verlo acá.
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
          <p style={{fontSize:13,color:C.textMuted}}>Mirá la grilla por curso, docente o espacio. Exportá todo a Excel con un clic.</p>
        </div>
        <button style={Object.assign({},btnPrimary,{display:"flex",alignItems:"center",gap:6})} onClick={exportar} disabled={exporting}>
          <i className="ti ti-download" style={{fontSize:15}}/>{exporting?"Generando…":"Exportar a Excel"}
        </button>
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
                      if (!h) return <td key={dia} style={{border:"1px solid "+C.border,padding:4,background:"#fafaf8"}}/>;
                      var col = colorMat[h.materia_id] || C.accent;
                      return (
                        <td key={dia} style={{border:"1px solid "+C.border,padding:4,verticalAlign:"top"}}>
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
