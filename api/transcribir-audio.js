import { createClient } from "@supabase/supabase-js";

var supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
  var userId = req.body.userId;
  var userEmail = req.body.userEmail || "";
  if (!base64) return res.status(400).json({ error: "Audio requerido" });

  try {
    var buffer = Buffer.from(base64, "base64");

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
      "--" + boundary + "\r\n" +
      "Content-Disposition: form-data; name=\"response_format\"\r\n\r\n" +
      "verbose_json\r\n" +
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
    var duracionSeg = data.duration || 0;
    var minutos = Math.round((duracionSeg / 60) * 100) / 100;

    // Registrar el uso de transcripcion
    if (userId) {
      try {
        await supabase.from("usage_log").insert({
          user_id: userId,
          user_email: userEmail,
          type: "transcripcion",
          type_name: "Transcripcion de audio",
          subject_name: "",
          tokens_input: 0,
          tokens_output: 0,
          is_image: false,
          audio_minutes: minutos,
        });
      } catch (e) {}
    }

    return res.status(200).json({ text: data.text, minutes: minutos });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}