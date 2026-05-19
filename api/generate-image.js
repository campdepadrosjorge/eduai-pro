export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { description, subject, level } = req.body;
  if (!description) return res.status(400).json({ error: "Descripcion requerida" });

  try {
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
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
        messages: [{
          role: "user",
          content: "Create a detailed image generation prompt for: " + description + ". Subject: " + (subject || "education") + ". Level: " + (level || "school") + ". Educational illustration, no text in image, professional quality.",
        }],
      }),
    });

    if (!claudeRes.ok) throw new Error("Error con Claude");

    const claudeData = await claudeRes.json();
    const optimizedPrompt = claudeData.content.filter(function(b) { return b.type === "text"; }).map(function(b) { return b.text; }).join("").trim();

    const hfRes = await fetch(
      "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + process.env.HF_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: optimizedPrompt,
          parameters: { width: 768, height: 768 },
        }),
      }
    );

    if (!hfRes.ok) {
      if (hfRes.status === 503) {
        return res.status(503).json({ error: "El generador se esta iniciando. Esperá 20 segundos e intentá de nuevo." });
      }
      return res.status(500).json({ error: "Error de Hugging Face (" + hfRes.status + "). Intentá de nuevo." });
    }

    const contentType = hfRes.headers.get("content-type") || "";
    if (!contentType.includes("image")) {
      return res.status(500).json({ error: "No se recibio imagen. Intentá de nuevo." });
    }

    const arrayBuffer = await hfRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = "data:image/jpeg;base64," + base64;

    return res.status(200).json({ url: dataUrl, prompt_used: optimizedPrompt });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}