// NOVA Neural Engine - Local Ollama (llama2) with Dual-Route Dispatch & Cloud Fallback

const OLLAMA_DIRECT_URL = 'http://localhost:11434/api/generate';
const BACKEND_API_URL = '/api/neural';
const DEFAULT_MODEL = 'llama2';

/**
 * Main neural query function for NOVA
 */
export async function askGemini(prompt, {
  model = DEFAULT_MODEL,
  history = []
} = {}) {
  // Route 1: Local Backend Endpoint (/api/neural)
  try {
    const backendRes = await fetch(BACKEND_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        history,
        model: DEFAULT_MODEL
      })
    });

    if (backendRes.ok) {
      const data = await backendRes.json();
      const outputText = data.reply || data.text || data.response;
      if (outputText && outputText.trim() && outputText !== 'No response') {
        return {
          success: true,
          provider: 'Local Ollama (llama2)',
          model: DEFAULT_MODEL,
          text: outputText.trim(),
          speech: data.speech || extractSpeechSummary(outputText)
        };
      }
    }
  } catch (backendErr) {
    console.warn('Backend /api/neural route error, attempting direct Ollama connection:', backendErr);
  }

  // Route 2: Direct Client-to-Ollama Connection (http://localhost:11434/api/generate)
  try {
    const directRes = await fetch(OLLAMA_DIRECT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        prompt,
        stream: false
      })
    });

    if (directRes.ok) {
      const data = await directRes.json();
      if (data.response && data.response.trim()) {
        return {
          success: true,
          provider: 'Local Ollama (Direct)',
          model: DEFAULT_MODEL,
          text: data.response.trim(),
          speech: extractSpeechSummary(data.response)
        };
      }
    }
  } catch (directErr) {
    console.warn('Direct Ollama connection error:', directErr);
  }

  // Helpful error message if Ollama is not reachable
  return {
    success: false,
    text: `⚠️ **Ollama Connection Notice**:
Unable to communicate with your local **Ollama** server at \`http://localhost:11434\`.

**How to resolve:**
1. Make sure the Ollama application is running on your computer.
2. Open a command prompt or PowerShell and run:
   \`\`\`bash
   ollama run llama2
   \`\`\`
3. Once running, refresh your browser tab (**Ctrl + Shift + R**) and try asking again!`,
    speech: "Unable to connect to your local Ollama model. Please verify that Ollama is running on your machine."
  };
}

/**
 * Extract clean spoken snippet for speech synthesis
 */
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
