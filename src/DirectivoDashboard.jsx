import { useState } from "react";

const C = {
  bg:"#f0efea", surf:"#ffffff", card:"#ffffff", border:"#d4cfc6",
  accent:"#0d9488", accentBg:"#e6f7f5",
  text:"#111110", textMuted:"#555550", textDim:"#888880",
  blue:"#1d4ed8", green:"#059669", purple:"#7c3aed", red:"#dc2626",
};

export default function DirectivoDashboard({ authUser, onVerComoDocente, onSignOut }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,fontFamily:"Quicksand,sans-serif",gap:16,padding:24,textAlign:"center"}}>
      <i className="ti ti-briefcase" style={{fontSize:52,color:C.accent}}/>
      <h1 style={{color:C.accent,fontSize:28,fontWeight:700,margin:0}}>Panel de Directivos</h1>
      <p style={{color:C.textMuted,fontSize:15,margin:0}}>Hola{authUser && authUser.user_metadata && authUser.user_metadata.name ? ", "+authUser.user_metadata.name : ""}. Este es tu dashboard.</p>
      <p style={{color:C.textDim,fontSize:13,maxWidth:420}}>Las herramientas (comunicados, actas, corrección de informes y acompañamiento docente) se van a ir agregando acá.</p>
      <div style={{display:"flex",gap:12,marginTop:8}}>
        <button onClick={onVerComoDocente} style={{background:"transparent",border:"1px solid "+C.accent,color:C.accent,borderRadius:4,padding:"9px 18px",cursor:"pointer",fontWeight:600,fontSize:13,fontFamily:"Quicksand,sans-serif"}}>
          Ver como docente
        </button>
        <button onClick={onSignOut} style={{background:"transparent",border:"1px solid "+C.border,color:C.textMuted,borderRadius:4,padding:"9px 18px",cursor:"pointer",fontWeight:600,fontSize:13,fontFamily:"Quicksand,sans-serif"}}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}