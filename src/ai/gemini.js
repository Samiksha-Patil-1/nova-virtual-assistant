// Multi-Model Intelligent AI Brain for NOVA (Gemini 3.8 Flash + Gemini 3.1 Flash Lite + Agent Router)

const DEFAULT_GEMINI_KEY = import.meta.env?.VITE_GEMINI_API_KEY || '';
const DEFAULT_AGENT_ROUTER_KEY = import.meta.env?.VITE_AGENT_ROUTER_KEY || '';

// Candidate models in prioritized order for zero-failure fallback
const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'];

export async function askGemini(prompt, {
  apiKey = DEFAULT_GEMINI_KEY,
  agentRouterKey = DEFAULT_AGENT_ROUTER_KEY,
  model = 'gemini-3.8-flash',
  history = []
} = {}) {
  const effectiveKey = (apiKey && apiKey.trim()) ? apiKey.trim() : DEFAULT_GEMINI_KEY;

  // System instruction for the assistant
  const systemInstructionText = `You are NOVA, an advanced, highly capable, and articulate AI virtual assistant.
- Answer ANY question the user asks with precision, intelligence, clarity, and warmth.
- Whether the question is about science, history, coding, math, general advice, creative writing, or daily life, provide a helpful and comprehensive response.
- Use clear Markdown formatting with bolding, bullet points, and code blocks with syntax highlighting when appropriate.
- When writing code, provide working, complete examples.
- Keep the tone charismatic, futuristic, and encouraging.`;

  // Build conversation history contents
  const contents = [
    {
      role: 'user',
      parts: [{ text: `System Directive: ${systemInstructionText}` }]
    },
    {
      role: 'model',
      parts: [{ text: "Understood. I am NOVA, online and ready to answer any question or assist with any task." }]
    }
  ];

  // Append recent chat history (last 8 messages) for conversational context
  const recentHistory = history.slice(-8);
  recentHistory.forEach(item => {
    if (item.sender === 'user') {
      contents.push({ role: 'user', parts: [{ text: item.text }] });
    } else if (item.sender === 'nova') {
      // Strip markdown headers from context to keep prompt compact
      contents.push({ role: 'model', parts: [{ text: item.text.slice(0, 1000) }] });
    }
  });

  // Append current prompt
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  // List of models to attempt (requested model first, followed by fallbacks)
  const modelsToTry = [model, ...GEMINI_MODELS.filter(m => m !== model)];

  for (const m of modelsToTry) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${effectiveKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1200
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
          return {
            success: true,
            model: m,
            text: text.trim(),
            speech: extractSpeechSummary(text)
          };
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        console.warn(`Gemini model ${m} returned ${response.status}:`, errData.error?.message);
        // Continue to fallback model if this one is experiencing high demand or not found
      }
    } catch (err) {
      console.warn(`Gemini model ${m} fetch error:`, err);
    }
  }

  // If Gemini models encountered issues, try Agent Router (tk3 key) if configured
  const effectiveRouterKey = (agentRouterKey && agentRouterKey.trim()) ? agentRouterKey.trim() : DEFAULT_AGENT_ROUTER_KEY;
  if (effectiveRouterKey) {
    try {
      const routerRes = await fetch('https://agentrouter.org/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${effectiveRouterKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemInstructionText },
            ...history.slice(-6).map(h => ({
              role: h.sender === 'user' ? 'user' : 'assistant',
              content: h.text
            })),
            { role: 'user', content: prompt }
          ]
        })
      });

      if (routerRes.ok) {
        const rData = await routerRes.json();
        const text = rData.choices?.[0]?.message?.content;
        if (text && text.trim()) {
          return {
            success: true,
            model: 'AgentRouter (tk3)',
            text: text.trim(),
            speech: extractSpeechSummary(text)
          };
        }
      }
    } catch (e) {
      console.warn('Agent Router fallback error:', e);
    }
  }

  // Fallback if all network endpoints fail
  return {
    success: false,
    text: `⚠️ **Connection Notice**: I experienced a temporary network issue contacting the neural brain. Please check your internet connection or try asking again in a moment.`,
    speech: `I had a temporary connection issue. Please try asking again in a moment.`
  };
}

// Clean and extract a punchy, pleasant spoken summary so the assistant doesn't read 50 lines of code aloud
function extractSpeechSummary(fullText) {
  if (!fullText) return '';

  // Remove code blocks completely for speech
  let clean = fullText.replace(/```[\s\S]*?```/g, 'I have generated the code snippet for you on screen.');
  clean = clean.replace(/`([^`]+)`/g, '$1');
  clean = clean.replace(/#{1,6}\s?/g, '');
  clean = clean.replace(/\*\*([^*]+)\*\*/g, '$1');
  clean = clean.replace(/\*([^*]+)\*/g, '$1');
  clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Split into sentences
  const sentences = clean.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 0);
  if (sentences.length <= 2) {
    return clean.slice(0, 350);
  }

  // Take the first 2-3 sentences (up to ~280 characters) for conversational voice
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
