// api/process-pdf.js
// Extrae y resume el contenido de un PDF que ya está subido en Storage (recibe su URL)

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  var fileUrl = req.body.url;
  var filename = req.body.filename || "documento.pdf";

  if (!fileUrl) return res.status(400).json({ error: "URL del PDF requerida" });

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
        max_tokens: 4000,
        stream: true,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "url",
                url: fileUrl,
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
      return res.status(claudeRes.status).json({ error: err.error ? err.error.message : "Error procesando el PDF" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    var reader = claudeRes.body.getReader();
    var decoder = new TextDecoder();

    while (true) {
      var result = await reader.read();
      if (result.done) break;
      var chunk = decoder.decode(result.value, { stream: true });
      var lines = chunk.split("\n");
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (!line.startsWith("data: ")) continue;
        var data = line.slice(6);
        if (data === "[DONE]") { res.write("data: [DONE]\n\n"); continue; }
        try {
          var parsed = JSON.parse(data);
          if (parsed.type === "content_block_delta" && parsed.delta && parsed.delta.type === "text_delta") {
            res.write("data: " + JSON.stringify({ text: parsed.delta.text }) + "\n\n");
          }
        } catch(e) {}
      }
    }
    res.end();

  } catch (error) {
    res.write("data: " + JSON.stringify({ error: error.message }) + "\n\n");
    res.end();
  }
}