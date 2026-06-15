export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  var base64 = req.body.base64;
  var instruccion = req.body.instruccion;

  if (!base64) return res.status(400).json({ error: "PDF requerido" });
  if (!instruccion) return res.status(400).json({ error: "Instrucción requerida" });

  var sistema = "Sos un asesor experto en gestión educativa que ayuda a equipos directivos a entender y gestionar trámites administrativos a partir de la normativa oficial que te comparten. Trabajás con la resolución o normativa que el directivo te adjunta, sin asumir normativa de ninguna jurisdicción en particular: te basás únicamente en el documento provisto. Sos claro, concreto y práctico. Respondés en español con formato Markdown. Si el documento no contiene la información necesaria para lo solicitado, lo decís claramente en lugar de inventar.";

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
        system: sistema,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 },
            },
            { type: "text", text: instruccion },
          ],
        }],
      }),
    });

    if (!claudeRes.ok) {
      var err = await claudeRes.json().catch(function() { return {}; });
      return res.status(claudeRes.status).json({ error: err.error ? err.error.message : "Error procesando el documento" });
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