export default async function handler(req, res) {
  // Support both Vercel serverless and Vite dev middleware
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

  // Extract user prompt from request body
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

  const userPrompt = body.prompt;

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

    const data = await response.json();
    res.status(200).json({ reply: data.response || "No response" });
  } catch (error) {
    res.status(500).json({ reply: "Error connecting to local Ollama. Ensure Ollama is running at http://localhost:11434.", error: error.message });
  }
}
