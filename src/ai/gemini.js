const DEFAULT_HF_KEY = import.meta.env?.VITE_HUGGINGFACE_API_KEY || '';
const DEFAULT_GEMINI_KEY = import.meta.env?.VITE_GEMINI_API_KEY || '';
const DEFAULT_AGENT_ROUTER_KEY = import.meta.env?.VITE_AGENT_ROUTER_KEY || '';

const HF_ROUTER_ENDPOINT = 'https://router.huggingface.co/v1/chat/completions';
const DEFAULT_HF_MODEL = 'meta-llama/Llama-3.1-8B-Instruct';

// Candidate models in prioritized order for zero-failure fallback
const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'];

/**
 * Main neural query function for NOVA
 */
export async function askGemini(prompt, {
  apiKey = DEFAULT_GEMINI_KEY,
  agentRouterKey = DEFAULT_AGENT_ROUTER_KEY,
  hfApiKey = DEFAULT_HF_KEY,
  model = DEFAULT_HF_MODEL,
  history = []
} = {}) {
  // 1. Primary Route: Backend neural endpoint (/api/neural) powered by Hugging Face
  try {
    const backendRes = await fetch('/api/neural', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        history,
        model: model || DEFAULT_HF_MODEL
      })
    });

    if (backendRes.ok) {
      const data = await backendRes.json();
      const outputText = data.reply || data.text;
      if (outputText) {
        return {
          success: true,
          provider: 'Local Ollama (llama2)',
          model: data.model || 'llama2',
          text: outputText.trim(),
          speech: data.speech || extractSpeechSummary(outputText)
        };
      }
    }
  } catch (backendErr) {
    console.warn('Local /api/neural route unavailable, trying direct Hugging Face router:', backendErr);
  }

  // 2. Direct Hugging Face Router call (fallback if /api/neural is unreachable)
  const effectiveHfKey = (hfApiKey && hfApiKey.trim()) ? hfApiKey.trim() : DEFAULT_HF_KEY;
  if (effectiveHfKey) {
    try {
      const messages = [
        {
          role: 'system',
          content: `You are NOVA, an advanced futuristic AI virtual assistant.
- Answer any question with precision, intelligence, clarity, and warmth.
- Use clear Markdown formatting with bolding, bullet points, and code blocks with syntax highlighting when appropriate.
- When writing code, provide working, complete examples.
- Keep the tone charismatic, futuristic, and encouraging.`
        },
        ...history.slice(-6).map(h => ({
          role: h.sender === 'user' ? 'user' : 'assistant',
          content: h.text
        })),
        { role: 'user', content: prompt }
      ];

      const hfRes = await fetch(HF_ROUTER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${effectiveHfKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: DEFAULT_HF_MODEL,
          messages,
          max_tokens: 800,
          temperature: 0.7
        })
      });

      if (hfRes.ok) {
        const hfData = await hfRes.json();
        const text = hfData.choices?.[0]?.message?.content;
        if (text && text.trim()) {
          return {
            success: true,
            provider: 'Hugging Face (Direct Router)',
            model: DEFAULT_HF_MODEL,
            text: text.trim(),
            speech: extractSpeechSummary(text)
          };
        }
      }
    } catch (hfErr) {
      console.warn('Direct Hugging Face router error:', hfErr);
    }
  }

  // 3. Fallback: Google Gemini API
  const effectiveGeminiKey = (apiKey && apiKey.trim()) ? apiKey.trim() : DEFAULT_GEMINI_KEY;
  if (effectiveGeminiKey) {
    const contents = [
      {
        role: 'user',
        parts: [{ text: "System Directive: You are NOVA, an advanced AI virtual assistant. Answer with precision and warmth." }]
      },
      {
        role: 'model',
        parts: [{ text: "Understood. I am NOVA, online and ready to assist." }]
      }
    ];

    history.slice(-6).forEach(item => {
      contents.push({
        role: item.sender === 'user' ? 'user' : 'model',
        parts: [{ text: item.text.slice(0, 800) }]
      });
    });

    contents.push({ role: 'user', parts: [{ text: prompt }] });

    for (const m of GEMINI_MODELS) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${effectiveGeminiKey}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim()) {
            return {
              success: true,
              provider: 'Google Gemini',
              model: m,
              text: text.trim(),
              speech: extractSpeechSummary(text)
            };
          }
        }
      } catch (err) {
        console.warn(`Gemini model ${m} error:`, err);
      }
    }
  }

  // 4. Fallback: Agent Router
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
            { role: 'system', content: 'You are NOVA, an advanced AI virtual assistant.' },
            ...history.slice(-4).map(h => ({ role: h.sender === 'user' ? 'user' : 'assistant', content: h.text })),
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
            provider: 'Agent Router',
            model: 'gpt-4o-mini',
            text: text.trim(),
            speech: extractSpeechSummary(text)
          };
        }
      }
    } catch (e) {
      console.warn('Agent Router error:', e);
    }
  }

  // Final fallback
  return {
    success: false,
    text: "⚠️ **Connection Notice**: Unable to contact the neural engine. Please check your network connection.",
    speech: "Unable to reach the neural engine at this time."
  };
}

function extractSpeechSummary(fullText) {
  if (!fullText) return '';
  let clean = fullText.replace(/```[\s\S]*?```/g, 'I have generated the code on screen.');
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
