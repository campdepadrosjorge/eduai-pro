// api/process-pdf.js
// Extrae texto de un PDF usando Claude Vision
 
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
 
  var base64 = req.body.base64;
  var filename = req.body.filename || "documento.pdf";
 
  if (!base64) return res.status(400).json({ error: "PDF requerido" });
 
  try {
    // Usar Claude para extraer y resumir el contenido del PDF
    var claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: "Extraé y resumí el contenido de este documento academico/educativo. Incluí: temas principales, conceptos clave, autores mencionados, objetivos de aprendizaje si los hay, y cualquier contenido relevante para usar como contexto al generar material educativo. Responde en español, de forma estructurada con Markdown.",
            },
          ],
        }],
      }),
    });
 
    if (!claudeRes.ok) {
      var err = await claudeRes.json().catch(function() { return {}; });
      throw new Error(err.error ? err.error.message : "Error procesando el PDF");
    }
 
    var data = await claudeRes.json();
    var text = data.content.filter(function(b) { return b.type === "text"; }).map(function(b) { return b.text; }).join("");
 
    return res.status(200).json({
      text: text,
      filename: filename,
      chars: text.length,
    });
 
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}