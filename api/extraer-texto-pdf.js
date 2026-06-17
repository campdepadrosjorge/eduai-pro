export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  var base64 = req.body.base64;
  if (!base64) return res.status(400).json({ error: "PDF requerido" });

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
        system: "Sos un transcriptor literal de documentos. Tu única tarea es extraer y devolver el texto EXACTO del documento, palabra por palabra, sin resumir, sin corregir, sin reformular, sin agregar ni quitar nada. Respetá la redacción original tal cual está, incluso si tiene errores. No agregues comentarios, encabezados ni explicaciones tuyas. Devolvé únicamente el texto del documento.",
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 },
            },
            { type: "text", text: "Transcribí el texto literal de este documento, exactamente como está escrito." },
          ],
        }],
      }),
    });

    if (!claudeRes.ok) {
      var err = await claudeRes.json().catch(function() { return {}; });
      return res.status(claudeRes.status).json({ error: err.error ? err.error.message : "Error extrayendo el texto" });
    }

    var data = await claudeRes.json();
    var text = data.content.filter(function(b){ return b.type === "text"; }).map(function(b){ return b.text; }).join("");

    return res.status(200).json({ text: text });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}