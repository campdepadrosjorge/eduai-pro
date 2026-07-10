export const config = {
  api: {
    bodyParser: {
      sizeLimit: "30mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  var base64 = req.body.base64;
  var mimeType = req.body.mimeType || "audio/webm";
  if (!base64) return res.status(400).json({ error: "Audio requerido" });

  try {
    // Convertir base64 a buffer
    var buffer = Buffer.from(base64, "base64");

    // Armar el form-data para Whisper
    var ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("mpeg") ? "mp3" : mimeType.includes("wav") ? "wav" : "webm";
    var boundary = "----AulaXproBoundary" + Date.now();

    var pre = "--" + boundary + "\r\n" +
      "Content-Disposition: form-data; name=\"file\"; filename=\"audio." + ext + "\"\r\n" +
      "Content-Type: " + mimeType + "\r\n\r\n";
    var mid = "\r\n--" + boundary + "\r\n" +
      "Content-Disposition: form-data; name=\"model\"\r\n\r\n" +
      "whisper-1\r\n" +
      "--" + boundary + "\r\n" +
      "Content-Disposition: form-data; name=\"language\"\r\n\r\n" +
      "es\r\n" +
      "--" + boundary + "--\r\n";

    var body = Buffer.concat([
      Buffer.from(pre, "utf-8"),
      buffer,
      Buffer.from(mid, "utf-8"),
    ]);

    var whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
        "Content-Type": "multipart/form-data; boundary=" + boundary,
      },
      body: body,
    });

    if (!whisperRes.ok) {
      var errData = await whisperRes.json().catch(function() { return {}; });
      return res.status(whisperRes.status).json({ error: errData.error ? errData.error.message : "Error al transcribir el audio" });
    }

    var data = await whisperRes.json();
    return res.status(200).json({ text: data.text });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}