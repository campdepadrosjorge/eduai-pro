export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
 
  var description = req.body.description;
  var subject = req.body.subject;
  var level = req.body.level;
 
  if (!description) return res.status(400).json({ error: "Descripcion requerida" });
 
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
        max_tokens: 300,
        system: "You are an expert at writing precise prompts for AI image generation. Reply with ONLY the image generation prompt in English, nothing else.",
        messages: [{ role: "user", content: "Create a detailed educational image prompt for: " + description + ". Subject: " + (subject || "education") + ". Professional quality illustration, no text." }],
      }),
    });
 
    if (!claudeRes.ok) throw new Error("Error con Claude");
    var claudeData = await claudeRes.json();
    var optimizedPrompt = claudeData.content.filter(function(b){return b.type==="text";}).map(function(b){return b.text;}).join("").trim();
 
    var imgRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: "gpt-image-2",
        prompt: optimizedPrompt,
        n: 1,
        size: "1024x1024",
        quality: "low",
        output_format: "jpeg",
        output_compression: 60,
      }),
    });
 
    if (!imgRes.ok) {
      var errData = await imgRes.json().catch(function(){return{};});
      return res.status(imgRes.status).json({ error: errData.error ? errData.error.message : "Error de OpenAI" });
    }
 
    var imgData = await imgRes.json();
    var item = imgData.data[0];
 
    if (item.url) {
      return res.status(200).json({ url: item.url });
    } else if (item.b64_json) {
      var buffer = Buffer.from(item.b64_json, "base64");
      res.setHeader("Content-Type", "image/jpeg");
      return res.status(200).end(buffer);
    } else {
      throw new Error("No se recibio imagen en la respuesta");
    }
 
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
 