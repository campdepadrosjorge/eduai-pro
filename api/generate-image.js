// api/generate-image.js
// Genera imágenes educativas usando Hugging Face (gratuito)
 
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
 
  const { description, subject, level } = req.body;
  if (!description) return res.status(400).json({ error: "Descripción requerida" });
 
  const prompt = `Educational illustration for ${level || "school"} students about: ${description}. Subject: ${subject || "general education"}. Style: clean, professional, colorful, suitable for classroom use, clear diagram or illustration, high quality digital art, no text.`;
 
  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            width: 768,
            height: 768,
          },
        }),
      }
    );
 
    if (!response.ok) {
      const error = await response.text();
      // Modelo cargando — pedir reintento
      if (response.status === 503) {
        return res.status(503).json({
          error: "El modelo de imágenes se está iniciando. Esperá 20 segundos y volvé a intentar.",
        });
      }
      return res.status(response.status).json({ error: `Error de Hugging Face: ${error}` });
    }
 
    // La respuesta es un blob de imagen
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:image/jpeg;base64,${base64}`;
 
    return res.status(200).json({ url: dataUrl });
 
  } catch (error) {
    return res.status(500).json({ error: "Error interno: " + error.message });
  }
}
 