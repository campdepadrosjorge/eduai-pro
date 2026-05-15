# Cambios en src/App.jsx
## Abrí el archivo y aplicá estos 8 cambios en orden

---

### CAMBIO 1 — Agregar import de exportUtils
**Buscá la línea:**
```js
import supabase from "./supabase.js";
```
**Reemplazala por:**
```js
import supabase from "./supabase.js";
import { exportDocx, exportPdf, exportZip } from "./exportUtils.js";
```

---

### CAMBIO 2 — Agregar tipo Generador de Imágenes al array MM_TYPES
**Buscá:**
```js
  { id:"presentacion_visual", label:"Presentación Visual",      icon:"✨", desc:"Slide por slide" },
];
```
**Reemplazalo por:**
```js
  { id:"presentacion_visual", label:"Presentación Visual",      icon:"✨", desc:"Slide por slide" },
  { id:"imagen_ia",           label:"Generador de Imágenes IA", icon:"🖼️", desc:"Imágenes con DALL·E 3" },
];
```

---

### CAMBIO 3 — Agregar estado para generación de imágenes
**Buscá:**
```js
  const [mmType,    setMmType]    = useState("podcast");
  const [mmTopic,   setMmTopic]   = useState("");
  const [mmExtra,   setMmExtra]   = useState("");
  const [mmResult,  setMmResult]  = useState("");
  const [mmLoading, setMmLoading] = useState(false);
```
**Reemplazalo por:**
```js
  const [mmType,    setMmType]    = useState("podcast");
  const [mmTopic,   setMmTopic]   = useState("");
  const [mmExtra,   setMmExtra]   = useState("");
  const [mmResult,  setMmResult]  = useState("");
  const [mmLoading, setMmLoading] = useState(false);
  const [imgUrl,    setImgUrl]    = useState(null);
  const [imgLoading,setImgLoading]= useState(false);
  const [imgError,  setImgError]  = useState("");
```

---

### CAMBIO 4 — Agregar función generateImage (después de generateMM)
**Buscá:**
```js
  async function saveLib(content, type, typeName, topic) {
```
**Agregá ANTES de esa línea:**
```js
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
      setImgError("❌ " + e.message + " (Verificá que OPENAI_API_KEY esté configurada en Vercel)");
    }
    setImgLoading(false);
  }

```

---

### CAMBIO 5 — Cambiar fuente a Arial en MDView
**Buscá:**
```js
      lineHeight:1.75, fontSize:14, fontFamily:"Georgia,serif"
```
**Reemplazalo por:**
```js
      lineHeight:1.75, fontSize:14, fontFamily:"Arial,sans-serif"
```

---

### CAMBIO 6 — Cambiar fuente global a Arial
**Buscá:**
```js
    <div style={{ display:"flex", height:"100vh", background:C.bg, color:C.text, fontFamily:"'Segoe UI',system-ui,sans-serif", overflow:"hidden" }}>
```
**Reemplazalo por:**
```js
    <div style={{ display:"flex", height:"100vh", background:C.bg, color:C.text, fontFamily:"Arial,sans-serif", overflow:"hidden" }}>
```

---

### CAMBIO 7 — Agregar botones de exportación en el Generador
**Buscá este bloque en la vista GENERATOR:**
```jsx
                        {genSaved
                          ? <span style={{ color:C.green, fontSize:12, fontWeight:700 }}>✓ Guardado</span>
                          : <>
                              <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={()=>saveLib(genResult,genType,gt?.label,genTopic)}>💾 Biblioteca</Btn>
                              {(genType==="evaluacion"||genType==="rubrica") && <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={()=>saveBank(genResult,genTopic)}>🏦 Banco</Btn>}
                            </>}
```
**Reemplazalo por:**
```jsx
                        {genSaved
                          ? <span style={{ color:C.green, fontSize:12, fontWeight:700 }}>✓ Guardado</span>
                          : <>
                              <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={()=>saveLib(genResult,genType,gt?.label,genTopic)}>💾 Biblioteca</Btn>
                              {(genType==="evaluacion"||genType==="rubrica") && <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={()=>saveBank(genResult,genTopic)}>🏦 Banco</Btn>}
                            </>}
                        <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={()=>exportDocx(genTopic, gt?.label, curSubj?.name, genResult)}>📄 Word</Btn>
                        {(genType==="evaluacion"||genType==="rubrica"||genType==="planclase") &&
                          <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={()=>exportPdf(genTopic, gt?.label, curSubj?.name, genResult)}>📋 PDF</Btn>}
```

---

### CAMBIO 8 — Reemplazar la sección de MULTIMEDIA completa
**Buscá:**
```jsx
          {/* MULTIMEDIA */}
          {!dataLoading && view==="multimedia" && (
```
**Reemplazá todo el bloque hasta el siguiente `{/* CHAT */}` por:**

```jsx
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

                {/* Resultado imagen */}
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
                        <p style={{ fontSize:11, color:C.textDim, marginTop:10 }}>
                          Las imágenes de DALL·E expiran en 1 hora. Descargala para guardarla.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Resultado texto */}
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

```

---

### CAMBIO 9 — Agregar botón "Exportar todo como ZIP" en la Biblioteca
**Buscá en la sección LIBRARY:**
```jsx
                <h2 style={{ margin:0, fontSize:19, fontWeight:700, flex:1, color:C.text }}>📚 Biblioteca <span style={{ color:C.textDim, fontWeight:400, fontSize:15 }}>({library.length})</span></h2>
```
**Reemplazalo por:**
```jsx
                <h2 style={{ margin:0, fontSize:19, fontWeight:700, flex:1, color:C.text }}>📚 Biblioteca <span style={{ color:C.textDim, fontWeight:400, fontSize:15 }}>({library.length})</span></h2>
                {library.length > 0 && <Btn v="secondary" st={{ fontSize:12, padding:"5px 14px" }} onClick={()=>exportZip(library)}>📦 Exportar todo (.zip)</Btn>}
```

---

### CAMBIO 10 — Agregar botón de exportación en el detalle de la Biblioteca
**Buscá en la sección LIBRARY (vista de detalle):**
```jsx
                      <Btn v="danger" onClick={()=>delLib(libItem.id)}>🗑 Eliminar</Btn>
```
**Reemplazalo por:**
```jsx
                      <div style={{ display:"flex", gap:8 }}>
                        <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={()=>exportDocx(libItem.topic, libItem.type_name, libItem.subject_name, libItem.content)}>📄 Word</Btn>
                        <Btn v="secondary" st={{ fontSize:12, padding:"5px 12px" }} onClick={()=>exportPdf(libItem.topic, libItem.type_name, libItem.subject_name, libItem.content)}>📋 PDF</Btn>
                        <Btn v="danger" onClick={()=>delLib(libItem.id)}>🗑 Eliminar</Btn>
                      </div>
```

---

## ¡Listo! Después de los 10 cambios:

```bash
git add .
git commit -m "Add image generation, DOCX/PDF/ZIP export, Arial font"
git push
```

## Variable de entorno necesaria en Vercel:
Para que las imágenes funcionen, agregá en Vercel → Settings → Environment Variables:

| Key | Value |
|-----|-------|
| `OPENAI_API_KEY` | Tu clave de OpenAI (openai.com → API Keys) |

Si no tenés clave de OpenAI todavía, todo lo demás (exports DOCX/PDF/ZIP) funciona igual.
