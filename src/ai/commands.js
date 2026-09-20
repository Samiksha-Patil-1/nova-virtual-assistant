// Local Fast Command Dispatcher for NOVA Virtual Assistant

const JOKES = [
  "Why do programmers prefer dark mode? Because light attracts bugs!",
  "Why did the JavaScript developer wear glasses? Because they couldn't C#!",
  "There are 10 types of people in the world: those who understand binary, and those who don't.",
  "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?'",
  "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
  "Why do Java developers wear glasses? Because they don't C#!",
  "Why was the cell phone wearing glasses? It lost its contacts!",
  "Artificial intelligence is no match for natural stupidity.",
  "I would tell you a joke about UDP, but you might not get it."
];

const QUOTES = [
  "The secret of getting ahead is getting started. — Mark Twain",
  "It always seems impossible until it's done. — Nelson Mandela",
  "Code is like humor. When you have to explain it, it’s bad. — Cory House",
  "Simplicity is the soul of efficiency. — Austin Freeman",
  "The future belongs to those who prepare for it today. — Malcolm X"
];

// Helper to safely evaluate mathematical expressions
function evaluateMath(expression) {
  try {
    // Sanitize to only allow numbers, math operators, parens, and decimal points
    const sanitized = expression
      .replace(/x/gi, '*')
      .replace(/\^/g, '**')
      .replace(/percent of/gi, '* 0.01 *')
      .replace(/%/g, '* 0.01')
      .replace(/plus/gi, '+')
      .replace(/minus/gi, '-')
      .replace(/times|multiplied by/gi, '*')
      .replace(/divided by/gi, '/')
      .replace(/[^0-9+\-*/().\s]/g, '');

    if (!sanitized.trim() || !/[0-9]/.test(sanitized)) return null;

    // Use Function constructor safely on sanitized string
    const result = new Function(`'use strict'; return (${sanitized});`)();
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return Number.isInteger(result) ? result : parseFloat(result.toFixed(4));
    }
  } catch (e) {
    return null;
  }
  return null;
}

// Weather code interpreter for Open-Meteo
function interpretWeatherCode(code) {
  if (code === 0) return { desc: 'Clear skies', icon: '☀️' };
  if (code >= 1 && code <= 3) return { desc: 'Partly cloudy', icon: '⛅' };
  if (code >= 45 && code <= 48) return { desc: 'Foggy', icon: '🌫️' };
  if (code >= 51 && code <= 55) return { desc: 'Drizzle', icon: '🌦️' };
  if (code >= 61 && code <= 67) return { desc: 'Rain', icon: '🌧️' };
  if (code >= 71 && code <= 77) return { desc: 'Snowfall', icon: '❄️' };
  if (code >= 80 && code <= 82) return { desc: 'Heavy showers', icon: '🌧️' };
  if (code >= 95 && code <= 99) return { desc: 'Thunderstorm', icon: '⛈️' };
  return { desc: 'Overcast', icon: '☁️' };
}

export async function processLocalCommand(input, context = {}) {
  const text = input.trim().toLowerCase();
  const assistantName = context.assistantName || 'NOVA';

  // 1. Time
  if (/^(what('s| is) the time|tell me the time|time please|current time|what time is it)/i.test(text)) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return {
      type: 'time',
      text: `The current time is ${timeStr}.`,
      speech: `It is ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`
    };
  }

  // 2. Date
  if (/^(what('s| is) (the |today's )?date|what day is (it|today)|tell me the date)/i.test(text)) {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString(undefined, options);
    return {
      type: 'date',
      text: `Today is ${dateStr}.`,
      speech: `Today is ${dateStr}.`
    };
  }

  // 3. Calculator / Math
  const mathMatch = text.match(/^(?:calculate|what is|compute|solve)\s+(.+)$/i) || text.match(/^([0-9\s+\-*/().^%]+)$/);
  if (mathMatch) {
    const expr = mathMatch[1].replace(/what is/gi, '').trim();
    const result = evaluateMath(expr);
    if (result !== null) {
      return {
        type: 'math',
        text: `**Calculation**: \`${expr}\` = **${result}**`,
        speech: `The answer is ${result}.`
      };
    }
  }

  // 4. Timer setup: "set a timer for 5 minutes", "timer 30 seconds"
  const timerMatch = text.match(/(?:set\s+(?:a\s+)?)?timer(?:\s+for)?\s+(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)/i) ||
                     text.match(/^(\d+)\s*(seconds?|secs?|minutes?|mins?)\s+timer$/i);
  if (timerMatch) {
    const amount = parseInt(timerMatch[1], 10);
    const unit = timerMatch[2].toLowerCase();
    let seconds = amount;
    let label = `${amount} ${unit}`;

    if (unit.startsWith('m')) seconds = amount * 60;
    if (unit.startsWith('h')) seconds = amount * 3600;

    if (seconds > 0 && seconds <= 86400) {
      return {
        type: 'timer',
        data: { seconds, label },
        text: `⏳ Timer set for **${amount} ${unit}**. Countdown initiated!`,
        speech: `Setting a timer for ${amount} ${unit}.`
      };
    }
  }

  // 5. Weather via Open-Meteo API: "weather in Tokyo", "what's the weather like in New York"
  const weatherMatch = text.match(/(?:weather|forecast|temperature)(?:\s+(?:in|for|at))?\s+([a-zA-Z\s,]+)/i);
  if (weatherMatch && !text.includes('whether')) {
    const city = weatherMatch[1].trim();
    try {
      // 1. Geocode
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
      const geoData = await geoRes.json();

      if (geoData && geoData.results && geoData.results.length > 0) {
        const place = geoData.results[0];
        // 2. Fetch current weather
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
        );
        const wData = await weatherRes.json();
        const current = wData.current;
        const info = interpretWeatherCode(current.weather_code);

        const temp = Math.round(current.temperature_2m);
        const humidity = current.relative_humidity_2m;
        const wind = current.wind_speed_10m;

        return {
          type: 'weather',
          text: `### ${info.icon} Weather in **${place.name}, ${place.country}**\n- **Condition**: ${info.desc}\n- **Temperature**: ${temp}°C\n- **Humidity**: ${humidity}%\n- **Wind Speed**: ${wind} km/h`,
          speech: `In ${place.name}, it is currently ${temp} degrees Celsius with ${info.desc}.`
        };
      } else {
        return {
          type: 'weather_not_found',
          text: `Could not locate weather data for "${city}". Please verify the city name.`,
          speech: `I couldn't find the city ${city}.`
        };
      }
    } catch (e) {
      console.error('Weather fetch error:', e);
    }
  }

  // 6. Play on YouTube: "play synthwave on youtube"
  const ytMatch = text.match(/^play\s+(.+?)(?:\s+on\s+youtube)?$/i);
  if (ytMatch && (text.includes('youtube') || text.startsWith('play '))) {
    const query = ytMatch[1].replace(/on youtube/i, '').trim();
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    window.open(url, '_blank');
    return {
      type: 'youtube',
      text: `▶️ Searching and opening **${query}** on YouTube: [Open YouTube](${url})`,
      speech: `Playing ${query} on YouTube.`
    };
  }

  // 7. Search Google: "search google for..." / "google ..."
  const googleMatch = text.match(/^(?:search(?:\s+google)?\s+for|google)\s+(.+)$/i);
  if (googleMatch) {
    const query = googleMatch[1].trim();
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(url, '_blank');
    return {
      type: 'search',
      text: `🔍 Searching Google for **${query}**: [View Results](${url})`,
      speech: `Searching Google for ${query}.`
    };
  }

  // 8. Search Wikipedia: "search wikipedia for..." / "wikipedia ..."
  const wikiMatch = text.match(/^(?:search\s+wikipedia\s+for|wikipedia)\s+(.+)$/i);
  if (wikiMatch) {
    const query = wikiMatch[1].trim();
    const url = `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`;
    window.open(url, '_blank');
    return {
      type: 'wikipedia',
      text: `📚 Searching Wikipedia for **${query}**: [Read Article](${url})`,
      speech: `Searching Wikipedia for ${query}.`
    };
  }

  // 9. Open popular websites
  const openMatch = text.match(/^open\s+(github|reddit|twitter|x|chatgpt|maps|netflix|spotify)$/i);
  if (openMatch) {
    const app = openMatch[1].toLowerCase();
    const urls = {
      github: 'https://github.com',
      reddit: 'https://reddit.com',
      twitter: 'https://twitter.com',
      x: 'https://x.com',
      chatgpt: 'https://chat.openai.com',
      maps: 'https://maps.google.com',
      netflix: 'https://netflix.com',
      spotify: 'https://open.spotify.com'
    };
    const targetUrl = urls[app];
    if (targetUrl) {
      window.open(targetUrl, '_blank');
      return {
        type: 'open_app',
        text: `🚀 Launching **${app.toUpperCase()}** in a new tab.`,
        speech: `Opening ${app}.`
      };
    }
  }

  // 10. Notes management: "take a note: ...", "add note ...", "show notes", "clear notes"
  if (/^(?:take\s+(?:a\s+)?note|note\s+down|add\s+note|remember)\s*[:\s]\s*(.+)$/i.test(text)) {
    const noteText = text.replace(/^(?:take\s+(?:a\s+)?note|note\s+down|add\s+note|remember)\s*[:\s]\s*/i, '').trim();
    if (context.store) {
      context.store.addNote(noteText);
      return {
        type: 'note_added',
        text: `📝 **Note Saved**: "${noteText}"`,
        speech: `Note saved.`
      };
    }
  }

  if (/^(?:show|list|view|read)\s+(?:my\s+)?notes$/i.test(text)) {
    const notes = context.store ? context.store.getNotes() : [];
    if (notes.length === 0) {
      return {
        type: 'notes_list',
        text: `📋 You have no saved notes yet. You can say *"take a note: remember to drink water"* to add one!`,
        speech: `You don't have any notes saved yet.`
      };
    }
    const list = notes.map((n, i) => `${i + 1}. **${n.text}** *(at ${n.timestamp})*`).join('\n');
    return {
      type: 'notes_list',
      text: `### 📋 Your Saved Notes (${notes.length}):\n${list}`,
      speech: `You have ${notes.length} saved notes.`
    };
  }

  if (/^(?:clear|delete|erase)\s+(?:all\s+)?notes$/i.test(text)) {
    if (context.store) context.store.clearNotes();
    return {
      type: 'notes_cleared',
      text: `🗑️ All saved notes have been cleared.`,
      speech: `Notes cleared.`
    };
  }

  // 11. Personality & Fun
  if (/^(tell me a joke|joke please|make me laugh)/i.test(text)) {
    const joke = JOKES[Math.floor(Math.random() * JOKES.length)];
    return {
      type: 'joke',
      text: `😄 **Joke**: ${joke}`,
      speech: joke
    };
  }

  if (/^(flip a coin|toss a coin|coin toss|heads or tails)/i.test(text)) {
    const outcome = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const icon = outcome === 'Heads' ? '🪙' : '🪙';
    return {
      type: 'coin_flip',
      text: `${icon} The coin landed on: **${outcome}**!`,
      speech: `It landed on ${outcome}!`
    };
  }

  if (/^(roll a die|roll a dice|dice roll)/i.test(text)) {
    const val = Math.floor(Math.random() * 6) + 1;
    const diceIcons = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    return {
      type: 'dice_roll',
      text: `${diceIcons[val - 1]} You rolled a **${val}**!`,
      speech: `You rolled a ${val}!`
    };
  }

  if (/^(give me a quote|inspire me|motivate me|quote of the day)/i.test(text)) {
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    return {
      type: 'quote',
      text: `✨ *"${q}"*`,
      speech: q
    };
  }

  // 12. Identity & Greetings
  if (/^(who are you|what is your name|what can you do|help|who made you|who created you)/i.test(text)) {
    return {
      type: 'identity',
      text: `### 🤖 I am **${assistantName}**, your Futuristic AI Virtual Assistant!
I can help you with:
- 🎙️ **Voice & Speech**: Talk to me anytime using the microphone.
- ⏱️ **Timers & Alarms**: *"set a timer for 5 minutes"*
- 🌦️ **Real-time Weather**: *"weather in Paris"*
- 🧮 **Instant Math**: *"calculate 25 * 40"*
- 🔍 **Web Search & Launch**: *"play Daft Punk on YouTube"*, *"search google for quantum computing"*
- 📝 **Scratchpad Notes**: *"take a note: buy groceries"*
- 🧠 **AI Conversations**: Connect your free Google Gemini API key in Settings for deep reasoning, writing, and coding!`,
      speech: `I am ${assistantName}, your virtual assistant. I can handle timers, weather, calculations, web searches, and smart conversations.`
    };
  }

  if (/^(hi|hello|hey|greetings|good morning|good evening|good afternoon)/i.test(text)) {
    return {
      type: 'greeting',
      text: `👋 Greetings! How can I assist you today?`,
      speech: `Hello! How can I help you today?`
    };
  }

  // Not a local rule command
  return null;
}
