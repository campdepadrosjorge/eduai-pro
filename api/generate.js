// api/generate.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { system, messages, maxTokens = 4000, useSearch = false } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "messages requeridos" });

  try {
    const body = {
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system: system || "Sos un asistente experto.",
      messages,
    };

    if (useSearch) {
      body.tools = [{ type: "web_search_20250305", name: "web_search" }];
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || "Error de API" });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Error interno: " + error.message });
  }
}