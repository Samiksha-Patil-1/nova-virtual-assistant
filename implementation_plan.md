# Implementation Plan - Futuristic Web AI Virtual Assistant (NOVA)

Build a futuristic, voice-enabled web virtual assistant equipped with an interactive glowing canvas orb visualizer, real-time speech-to-text, natural voice synthesis, hybrid intelligence (offline instant system commands + Google Gemini AI brain), and productivity tools (timers, weather, notes, web launch).

## Proposed Architecture & Features

```
+--------------------------------------------------------------------------+
|                     FUTURISTIC WEB AI ASSISTANT                          |
+--------------------------------------------------------------------------+
|  [Header] Status Indicator | System Clock | Settings Modal | Mode Switch |
+--------------------------------------------------------------------------+
|                                                                          |
|                  +------------------------------------+                  |
|                  |    DYNAMIC REACTIVE AUDIO ORB      |                  |
|                  |     (Canvas Particle Visualizer)   |                  |
|                  +------------------------------------+                  |
|                   Status: IDLE | LISTENING | THINKING | SPEAKING         |
|                                                                          |
|  +--------------------------------------------------------------------+  |
|  |                 TRANSCRIPT & CONVERSATION FEED                     |  |
|  |  * User voice/text bubbles                                         |  |
|  |  * Assistant responses with Markdown & Voice Replay                |  |
|  |  * Action Cards (Weather, Timers, Math, Search results)            |  |
|  +--------------------------------------------------------------------+  |
|                                                                          |
|  +--------------------------------------------------------------------+  |
|  |  Quick Action Chips: [Timer 3m] [Weather] [YouTube] [Math] [AI]    |  |
|  |  [ Mic Push/Continuous ]  [ Type command...              ]  [ Send]|  |
|  +--------------------------------------------------------------------+  |
|                                                                          |
|  [Side Panels / Drawers]                                                 |
|  * Settings: Gemini API Key, Voice picker, Pitch, Rate, Sound FX toggle  |
|  * Productivity Tools: Live Timers, Local Notes, Real-time Weather       |
+--------------------------------------------------------------------------+
```

### 1. Visual & Audio Experience
- **Interactive Holographic Canvas Orb**:
  - Multi-ring particle visualizer rendering on HTML5 canvas.
  - Dynamically modulates frequency, radius, and glow based on assistant state (`IDLE`, `LISTENING`, `PROCESSING`, `SPEAKING`).
  - Web Audio API synthesizer for high-tech activation chimes and acoustic sound feedback without external sound assets.
- **Voice Pipeline**:
  - `SpeechRecognition` / `webkitSpeechRecognition` for seamless hands-free or push-to-talk mic input.
  - `SpeechSynthesis` with automated natural voice selection (Google/Microsoft natural voices), pitch/rate modulation, and smart text filtering.

### 2. Hybrid Intelligence Core
- **Fast Local Command Dispatcher (Instant, zero latency, offline)**:
  - 🕒 **Time & Date**: "what time is it", "what day is today"
  - 🔍 **Web Launch & Search**: "search google for...", "play [song] on youtube", "search wikipedia for...", "open github/reddit/maps"
  - 🧮 **Instant Math & Conversions**: evaluates arithmetic, percentages, and scientific calculations
  - ⏱️ **Active Timer & Stopwatch**: "set timer for 5 minutes", "timer 30 seconds" with live ticking countdown & sound alarm
  - 🌦️ **Live Weather**: queries live weather from Open-Meteo API (free, no API key needed!)
  - 📝 **Scratchpad Notes**: "note down: ...", "show notes", stored in `localStorage`
  - 🎲 **Fun & Personality**: jokes, coin flips, dice rolls, quotes, customizable assistant name
- **Gemini AI Brain Integration**:
  - Optional user-provided Gemini API key (persisted in browser `localStorage`).
  - For open-ended questions, programming, general reasoning, creative writing, and deep conversations.
  - Built-in fallback AI responder when no API key is provided, with easy one-click API key setup modal.

### 3. Modern Design System
- Dark Cyberpunk / Sci-fi Glassmorphism (`#070a13` background, `#00f2fe` neon cyan, `#8b5cf6` electric violet, translucent glass panels with frosted blur).
- Modern typography via Google Fonts (Outfit & Space Grotesk / JetBrains Mono).
- Responsive mobile & desktop layout.

---

## User Review Required

> [!NOTE]
> - The web assistant uses the browser's native **Web Speech API** for both Speech Recognition and Speech Synthesis. This works out of the box in Google Chrome, Microsoft Edge, and Chromium-based browsers.
> - The live weather uses the free public Open-Meteo API (no key required).
> - The AI brain allows users to enter their free Google Gemini API key or use built-in smart fallback responses.

---

## Proposed Changes

### Project Setup & Structure

```
Vertual assistant/
├── index.html              # Futuristic semantic HTML5 shell
├── package.json            # Vite configuration & scripts
├── vite.config.js          # Dev server setup
├── src/
│   ├── index.css           # Glassmorphic sci-fi design system & animations
│   ├── main.js             # Application bootstrap & UI orchestrator
│   ├── audio/
│   │   ├── speech.js       # Speech-to-Text & Text-to-Speech managers
│   │   └── soundfx.js      # Web Audio API futuristic sound synthesizer
│   ├── visualizer/
│   │   └── orb.js          # Canvas holographic particle & wave orb
│   ├── ai/
│   │   ├── commands.js     # Local rule-based command engine (timer, math, weather, etc.)
│   │   └── gemini.js       # Gemini API client & intelligent conversational engine
│   └── storage/
│       └── store.js        # LocalStorage state (API keys, preferences, notes)
```

#### [NEW] [package.json](file:///c:/Users/Samiksha%20Patil/OneDrive/Desktop/Vertual%20assistant/package.json)
- Configures Vite as modern dev server and bundler.

#### [NEW] [index.html](file:///c:/Users/Samiksha%20Patil/OneDrive/Desktop/Vertual%20assistant/index.html)
- Main user interface with HUD header, glowing canvas orb container, chat transcript feed, control bar, settings drawer, and tools drawer.

#### [NEW] [src/index.css](file:///c:/Users/Samiksha%20Patil/OneDrive/Desktop/Vertual%20assistant/src/index.css)
- Complete design system with glassmorphic cards, neon glows, responsive layouts, custom scrollbars, and keyframe animations.

#### [NEW] [src/visualizer/orb.js](file:///c:/Users/Samiksha%20Patil/OneDrive/Desktop/Vertual%20assistant/src/visualizer/orb.js)
- Multi-layer canvas particle visualizer reacting to assistant states and voice energy.

#### [NEW] [src/audio/speech.js](file:///c:/Users/Samiksha%20Patil/OneDrive/Desktop/Vertual%20assistant/src/audio/speech.js)
- Speech recognition and speech synthesis handlers with natural voice detection and clean text filtering.

#### [NEW] [src/audio/soundfx.js](file:///c:/Users/Samiksha%20Patil/OneDrive/Desktop/Vertual%20assistant/src/audio/soundfx.js)
- Procedural audio cues (listening chime, reply beep, timer alert) using Web Audio API oscillators.

#### [NEW] [src/ai/commands.js](file:///c:/Users/Samiksha%20Patil/OneDrive/Desktop/Vertual%20assistant/src/ai/commands.js)
- Command matcher for time, date, web search, YouTube, math evaluation, weather fetch, timer management, and notes.

#### [NEW] [src/ai/gemini.js](file:///c:/Users/Samiksha%20Patil/OneDrive/Desktop/Vertual%20assistant/src/ai/gemini.js)
- Direct API integration with Google Gemini 2.0 / 1.5 Flash for natural conversation, code generation, and complex queries.

#### [NEW] [src/main.js](file:///c:/Users/Samiksha%20Patil/OneDrive/Desktop/Vertual%20assistant/src/main.js)
- Main application controller tying visualizer, audio, command execution, and UI together.

---

## Verification Plan

### Automated / Build Verification
- Install dependencies: `npm install`
- Validate bundling / build: `npm run build`
- Start dev server: `npm run dev`

### Manual & Interactive Verification
- Launch local browser test on dev server using `browser_subagent`.
- Verify holographic canvas orb renders and smoothly animates across `IDLE`, `LISTENING`, and `SPEAKING` states.
- Test quick action commands:
  - "what time is it" -> accurate time returned and spoken.
  - "calculate 125 * 8" -> displays 1000.
  - "weather in Paris" -> fetches real-time temperature and weather code from Open-Meteo.
  - "set timer for 10 seconds" -> active countdown timer card displays and rings alarm when finished.
  - "take a note: buy groceries" -> stored and visible in Notes drawer.
- Verify Speech Recognition activation toggle and Speech Synthesis voice controls.
- Verify Settings modal opens and allows entering Gemini API key and choosing voices.
