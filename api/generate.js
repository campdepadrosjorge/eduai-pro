const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(identifier) {
  if (!identifier) return true;
  const now = Date.now();
  const userLimits = rateLimitMap.get(identifier) || [];
  const recent = userLimits.filter(t => now - t < RATE_LIMIT_WINDOW);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  rateLimitMap.set(identifier, recent);
  return true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { system, messages, maxTokens = 4000, useSearch = false, stream = false } = req.body;

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Demasiadas solicitudes. Espera un minuto antes de continuar." });
  }
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "messages requeridos" });

  const body = {
    model: "claude-opus-4-6",
    max_tokens: maxTokens,
    system: system || "Sos un asistente experto.",
    messages,
    stream,
  };

  if (useSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }

  try {
    let response;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "web-search-2025-03-05",
        },
        body: JSON.stringify(body),
      });
      
      if (response.status !== 429) break;
      
      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    if (!stream) {
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: data.error?.message || "Error de API" });
      return res.status(200).json(data);
    }

    // Streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") { res.write("data: [DONE]\n\n"); continue; }
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
              res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
            }
          } catch(e) {}
        }
      }
    }
    res.end();

  } catch (error) {
    if (!stream) return res.status(500).json({ error: "Error interno: " + error.message });
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}