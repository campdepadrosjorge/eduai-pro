/ api/generate-image.js
// Paso 1: Claude genera un prompt detallado para imagen
// Paso 2: Hugging Face FLUX.1-schnell genera la imagen
 
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
 
  const { description, subject, level } = req.body;
  if (!description) return res.status(400).json({ error: "Descripción requerida" });
 
  try {
    // ── PASO 1: Claude genera el prompt optimizado ──────────────
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
        system: `You are an expert at writing precise, detailed prompts for AI image generation models. 
Your prompts must be in English, highly specific, and optimized for educational illustrations.
Reply with ONLY the image generation prompt, nothing else. No explanations, no quotes.`,
        messages: [{
          role: "user",
          content: `Create a detailed image generation prompt for an educational illustration.
Subject: ${subject || "general education"}
Level: ${level || "school"}
Content to illustrate: ${description}
 
The image should be:
- Educational and appropriate for classroom use
- Clear, detailed and visually accurate
- Professional quality illustration or diagram
- No text overlays or labels in the image itself
 
Write only the prompt in English, highly detailed, describing exactly what should appear in the image.`,
        }],
      }),
    });
 
    if (!claudeRes.ok) {
      throw new Error("Error generando el prompt con Claude");
    }
 
    const claudeData = await claudeRes.json();
    const optimizedPrompt = claudeData.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("")
      .trim();
 
    // ── PASO 2: HuggingFace genera la imagen ────────────────────
  const hfRes = await fetch(
      "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HF_API_KEY}`,
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
        return res.status(503).json({ error: "El generador de imágenes se está iniciando. Esperá 20 segundos y volvé a intentar." });
      }
      return res.status(500).json({ error: `Error de Hugging Face (${hfRes.status}). Intentá de nuevo.` });
    }

    const contentType = hfRes.headers.get("content-type") || "";
    if (!contentType.includes("image")) {
      return res.status(500).json({ error: "Hugging Face no devolvió una imagen. Intentá de nuevo." });
    }

    const arrayBuffer = await hfRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    return res.status(200).json({ url: dataUrl, prompt_used: optimizedPrompt });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
 
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
 