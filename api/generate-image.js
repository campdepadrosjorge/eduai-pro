// api/generate-image.js
// Genera imágenes educativas con DALL-E 3 (OpenAI)
// Requiere: OPENAI_API_KEY en las variables de entorno de Vercel

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { description, subject, level } = req.body;
  if (!description) return res.status(400).json({ error: "Descripción requerida" });

  // Prompt enriquecido para contenido educativo
  const prompt = `Educational illustration for ${level || "school"} students about: ${description}. 
Subject: ${subject || "general education"}.
Style: clean, professional educational diagram or illustration, clear and informative, 
suitable for classroom use, no text overlays, bright and engaging colors, 
high quality digital art.`;

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Error de OpenAI API",
        detail: JSON.stringify(data),
      });
    }

    return res.status(200).json({
      url: data.data[0].url,
      revised_prompt: data.data[0].revised_prompt,
    });
  } catch (error) {
    return res.status(500).json({ error: "Error interno: " + error.message });
  }
}
