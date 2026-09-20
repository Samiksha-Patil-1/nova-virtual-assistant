// Backend neural endpoint for NOVA Virtual Assistant
// Powered by Hugging Face Inference API / Router

const HUGGINGFACE_ENDPOINT = 'https://router.huggingface.co/v1/chat/completions';
const DEFAULT_MODEL = 'meta-llama/Llama-3.1-8B-Instruct';

/**
 * Execute neural inference request to Hugging Face
 */
export async function queryHuggingFace({
  prompt,
  history = [],
  model = DEFAULT_MODEL,
  apiKey = process.env.HUGGINGFACE_API_KEY
}) {
  const systemInstruction = `You are NOVA, an advanced futuristic AI virtual assistant.
- Answer any question with clarity, intelligence, and a friendly tone.
- Use clear Markdown formatting with bolding and bullet points when appropriate.
- Keep responses focused and articulate so they sound natural when spoken.`;

  const messages = [
    { role: 'system', content: systemInstruction }
  ];

  // Add recent history for conversational continuity
  if (Array.isArray(history)) {
    history.slice(-6).forEach((item) => {
      messages.push({
        role: item.sender === 'user' ? 'user' : 'assistant',
        content: item.text
      });
    });
  }

  messages.push({
    role: 'user',
    content: prompt
  });

  const response = await fetch(HUGGINGFACE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 800,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Hugging Face API returned ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || 'No response generated from Hugging Face model.';

  return {
    success: true,
    model,
    text,
    speech: extractSpeechSnippet(text)
  };
}

/**
 * Clean spoken snippet for voice synthesis
 */
function extractSpeechSnippet(fullText) {
  if (!fullText) return '';
  let clean = fullText.replace(/```[\s\S]*?```/g, 'Code block omitted.');
  clean = clean.replace(/`([^`]+)`/g, '$1');
  clean = clean.replace(/#{1,6}\s?/g, '');
  clean = clean.replace(/\*\*([^*]+)\*\*/g, '$1');
  clean = clean.replace(/\*([^*]+)\*/g, '$1');
  clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  const sentences = clean.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 0);
  let summary = '';
  for (const s of sentences) {
    if ((summary + ' ' + s).length < 280) {
      summary += (summary ? ' ' : '') + s;
    } else {
      break;
    }
  }
  return summary || sentences[0] || clean.slice(0, 200);
}

/**
 * Standard serverless / Node.js HTTP request handler (Vercel, Netlify, Express, Vite middleware)
 */
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const parsed = body ? JSON.parse(body) : {};
      const prompt = parsed.prompt || parsed.question || (parsed.messages ? parsed.messages[parsed.messages.length - 1]?.content : '');

      if (!prompt) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing prompt in request body.' }));
        return;
      }

      const result = await queryHuggingFace({
        prompt,
        history: parsed.history,
        model: parsed.model || DEFAULT_MODEL,
        apiKey: process.env.HUGGINGFACE_API_KEY
      });

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error('Hugging Face backend error:', err);
      res.writeHead(500, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}
