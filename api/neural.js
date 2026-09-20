export default async function handler(req, res) {
  // Enable CORS
  if (res.setHeader) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (req.method === 'OPTIONS') {
    if (res.status) return res.status(200).end();
    res.statusCode = 200;
    return res.end();
  }

  // Response helpers for both Vercel serverless and Vite dev middleware
  if (!res.status) {
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
  }
  if (!res.json) {
    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return res;
    };
  }

  // Extract user prompt from body
  let body = req.body;
  if (!body) {
    body = await new Promise((resolve) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => {
        try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); }
      });
    });
  }

  const userPrompt = body.prompt || body.question || (typeof body === 'string' ? body : '');

  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama2",
        prompt: userPrompt,
        stream: false
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return res.status(response.status).json({
        reply: `Ollama error (${response.status}): ${errText || 'Model failed to respond.'}`
      });
    }

    const data = await response.json();
    res.status(200).json({ reply: data.response || "No response" });
  } catch (error) {
    console.error("Local Ollama connection error:", error);
    res.status(500).json({
      reply: "⚠️ Unable to connect to local Ollama at http://localhost:11434. Please ensure the Ollama application is running on your machine.",
      error: error.message
    });
  }
}
