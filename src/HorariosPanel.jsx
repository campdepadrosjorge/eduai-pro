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

// ---------- Jornada (placeholder Fase 1, se completa después) ----------
function JornadaTab({ uid }) {
  return (
    <div>
      <h3 style={{fontSize:17,fontWeight:700,color:C.text,marginBottom:4}}>Jornada escolar</h3>
      <p style={{fontSize:13,color:C.textMuted,marginBottom:16}}>Configurá los turnos, días y módulos (bloques de clase y recreos). <strong>Esta sección se completa en el próximo paso.</strong></p>
      <div style={{background:C.accentBg,border:"1px solid "+C.accent,borderRadius:6,padding:16,fontSize:13,color:C.accent}}>En construcción — ya podés cargar materias, cursos, espacios y docentes en las otras pestañas.</div>
    </div>
  );
}

// ---------- Placeholders de las otras pestañas (se completan en próximos pasos) ----------
function CursosTab({ uid }) {
  return <SimpleCrud uid={uid} tabla="hor_cursos" titulo="Cursos" singular="curso"
    campos={[{k:"nombre",label:"Nombre (ej: 1°A)",req:true},{k:"anio",label:"Año",tipo:"number"},{k:"division",label:"División"},{k:"cantidad_alumnos",label:"Alumnos",tipo:"number"},{k:"turno",label:"Turno",tipo:"select",opciones:["manana","tarde"]}]} />;
}
function DocentesTab({ uid }) {
  return (
    <div>
      <SimpleCrud uid={uid} tabla="hor_docentes" titulo="Docentes" singular="docente"
        campos={[{k:"nombre",label:"Nombre",req:true},{k:"email",label:"Email"}]} />
      <p style={{fontSize:12,color:C.textDim,marginTop:14}}>La disponibilidad horaria de cada docente (grilla por clic) se agrega en el próximo paso.</p>
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
