// api/extract-text.js
// Extrae texto de una imagen usando Claude Vision
 
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
 
  var base64 = req.body.base64;
  var mediaType = req.body.mediaType || "image/jpeg";
 
  if (!base64) return res.status(400).json({ error: "Imagen requerida" });
 
  try {
    var claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: "Esta es la foto de un examen o trabajo practico escrito a mano por un alumno. Por favor extraé y transcribí TODO el texto que aparece en la imagen, respetando la estructura del escrito (preguntas, respuestas, parrafos). Si hay texto ilegible marcalo con [ilegible]. No agregues comentarios ni evaluaciones, solo transcribí el texto tal como aparece.",
            },
          ],
        }],
      }),
    });
 
    if (!claudeRes.ok) {
      var err = await claudeRes.json().catch(function() { return {}; });
      throw new Error(err.error ? err.error.message : "Error procesando la imagen");
    }
 
    var data = await claudeRes.json();
    var text = data.content.filter(function(b) { return b.type === "text"; }).map(function(b) { return b.text; }).join("");
 
    return res.status(200).json({ text });
 
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
 