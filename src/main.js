// Main Orchestrator for NOVA Virtual Assistant
import './index.css';
import { VisualizerOrb } from './visualizer/orb.js';
import { soundfx } from './audio/soundfx.js';
import { SpeechEngine } from './audio/speech.js';
import { store } from './storage/store.js';
import { processLocalCommand } from './ai/commands.js';
import { askGemini } from './ai/gemini.js';

class NovaAssistant {
  constructor() {
    this.settings = store.getSettings();
    this.activeTimers = [];
    this.history = [];
    this.voiceEnabled = true;

    this.initDOM();
    this.initVisualizer();
    this.initAudio();
    this.initEventListeners();
    this.startSystemClock();
    this.renderNotes();
    this.applySettingsToUI();
  }

  initDOM() {
    this.dom = {
      orbCanvas: document.getElementById('orbCanvas'),
      statusDot: document.getElementById('statusDot'),
      statusText: document.getElementById('statusText'),
      stageCaption: document.getElementById('stageCaption'),
      systemClock: document.getElementById('systemClock'),
      assistantTitle: document.getElementById('assistantTitle'),
      btnToggleSpeech: document.getElementById('btnToggleSpeech'),
      audioBars: document.querySelectorAll('.audio-bar'),
      chatFeed: document.getElementById('chatFeed'),
      btnClearChat: document.getElementById('btnClearChat'),
      quickChipsBar: document.getElementById('quickChipsBar'),
      btnMic: document.getElementById('btnMic'),
      cmdForm: document.getElementById('cmdForm'),
      cmdInput: document.getElementById('cmdInput'),
      btnSend: document.getElementById('btnSend'),
      // Settings Drawer
      btnSettings: document.getElementById('btnSettings'),
      settingsDrawer: document.getElementById('settingsDrawer'),
      btnCloseSettings: document.getElementById('btnCloseSettings'),
      inputApiKey: document.getElementById('inputApiKey'),
      selectModel: document.getElementById('selectModel'),
      inputAgentRouterKey: document.getElementById('inputAgentRouterKey'),
      inputAssistantName: document.getElementById('inputAssistantName'),
      selectVoice: document.getElementById('selectVoice'),
      rangeRate: document.getElementById('rangeRate'),
      rateVal: document.getElementById('rateVal'),
      rangePitch: document.getElementById('rangePitch'),
      pitchVal: document.getElementById('pitchVal'),
      checkSoundFx: document.getElementById('checkSoundFx'),
      btnSaveSettings: document.getElementById('btnSaveSettings'),
      // Tools Drawer
      btnTools: document.getElementById('btnTools'),
      toolsDrawer: document.getElementById('toolsDrawer'),
      btnCloseTools: document.getElementById('btnCloseTools'),
      timersList: document.getElementById('timersList'),
      notesList: document.getElementById('notesList'),
      inputNewNote: document.getElementById('inputNewNote'),
      btnAddNote: document.getElementById('btnAddNote'),
      btnClearAllNotes: document.getElementById('btnClearAllNotes')
    };
  }

  initVisualizer() {
    this.orb = new VisualizerOrb(this.dom.orbCanvas);
    this.orb.start();
  }

  initAudio() {
    soundfx.setEnabled(this.settings.soundEffects);

    this.speech = new SpeechEngine({
      onStatusChange: (status) => this.handleStatusChange(status),
      onInterim: (text) => {
        this.dom.stageCaption.textContent = `Hearing: "${text}"...`;
      },
      onResult: (text) => {
        if (text) {
          this.dom.stageCaption.textContent = 'COMMAND RECEIVED';
          this.processUserInput(text);
        }
      },
      onError: (err) => {
        console.warn('Speech Engine Notice:', err);
        this.handleStatusChange('idle');
      }
    });

    // Populate voices once loaded
    setTimeout(() => this.populateVoiceList(), 500);
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => this.populateVoiceList();
    }
  }

  populateVoiceList() {
    const voices = this.speech.getAvailableVoices();
    if (!voices.length) return;

    this.dom.selectVoice.innerHTML = '<option value="">Default System Voice</option>';
    voices.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      if (this.settings.voiceURI && v.voiceURI === this.settings.voiceURI) {
        opt.selected = true;
        this.speech.setVoiceByURI(v.voiceURI);
      }
      this.dom.selectVoice.appendChild(opt);
    });
  }

  handleStatusChange(status) {
    this.orb.setState(status);

    this.dom.statusDot.className = 'status-dot';
    this.dom.btnMic.classList.remove('active');

    switch (status) {
      case 'listening':
        this.dom.statusDot.classList.add('listening');
        this.dom.statusText.textContent = 'LISTENING...';
        this.dom.stageCaption.textContent = 'LISTENING TO YOUR VOICE...';
        this.dom.btnMic.classList.add('active');
        this.animateAudioBars(true);
        break;
      case 'thinking':
        this.dom.statusDot.classList.add('thinking');
        this.dom.statusText.textContent = 'PROCESSING...';
        this.dom.stageCaption.textContent = 'ANALYZING QUERY...';
        this.animateAudioBars(true);
        break;
      case 'speaking':
        this.dom.statusDot.classList.add('speaking');
        this.dom.statusText.textContent = 'SPEAKING...';
        this.dom.stageCaption.textContent = `${this.settings.assistantName.toUpperCase()} RESPONDING...`;
        this.animateAudioBars(true);
        break;
      case 'idle':
      default:
        this.dom.statusText.textContent = 'SYSTEM READY';
        this.dom.stageCaption.textContent = 'CLICK ORB OR MIC TO TALK';
        this.animateAudioBars(false);
        break;
    }
  }

  animateAudioBars(active) {
    this.dom.audioBars.forEach((bar, index) => {
      if (active) {
        const height = Math.floor(Math.random() * 20) + 4;
        bar.style.height = `${height}px`;
      } else {
        bar.style.height = '4px';
      }
    });
  }

  startSystemClock() {
    const update = () => {
      const now = new Date();
      this.dom.systemClock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    update();
    setInterval(update, 1000);
  }

  initEventListeners() {
    // Microphone button
    this.dom.btnMic.addEventListener('click', () => {
      this.toggleListening();
    });

    // Tap orb canvas to trigger listening
    this.dom.orbCanvas.addEventListener('click', () => {
      this.toggleListening();
    });

    // Form submit
    this.dom.cmdForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = this.dom.cmdInput.value.trim();
      if (val) {
        this.processUserInput(val);
        this.dom.cmdInput.value = '';
      }
    });

    // Quick chips
    this.dom.quickChipsBar.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (chip && chip.dataset.cmd) {
        soundfx.playClick();
        this.processUserInput(chip.dataset.cmd);
      }
    });

    // Voice speech mute/unmute toggle
    this.dom.btnToggleSpeech.addEventListener('click', () => {
      this.voiceEnabled = !this.voiceEnabled;
      soundfx.playClick();
      if (this.voiceEnabled) {
        this.dom.btnToggleSpeech.innerHTML = '🔊 <span>Voice ON</span>';
        this.dom.btnToggleSpeech.style.borderColor = 'var(--border-glow)';
      } else {
        this.speech.stopSpeaking();
        this.dom.btnToggleSpeech.innerHTML = '🔇 <span>Voice OFF</span>';
        this.dom.btnToggleSpeech.style.borderColor = 'rgba(239, 68, 68, 0.4)';
      }
    });

    // Clear chat
    this.dom.btnClearChat.addEventListener('click', () => {
      soundfx.playClick();
      this.clearChatFeed();
    });

    // Settings Drawer
    this.dom.btnSettings.addEventListener('click', () => {
      soundfx.playClick();
      this.dom.settingsDrawer.classList.add('open');
    });

    this.dom.btnCloseSettings.addEventListener('click', () => {
      soundfx.playClick();
      this.dom.settingsDrawer.classList.remove('open');
    });

    this.dom.rangeRate.addEventListener('input', (e) => {
      this.dom.rateVal.textContent = `${e.target.value}x`;
    });

    this.dom.rangePitch.addEventListener('input', (e) => {
      this.dom.pitchVal.textContent = e.target.value;
    });

    this.dom.btnSaveSettings.addEventListener('click', () => {
      soundfx.playSuccess();
      this.savePreferences();
      this.dom.settingsDrawer.classList.remove('open');
    });

    // Tools Drawer
    this.dom.btnTools.addEventListener('click', () => {
      soundfx.playClick();
      this.dom.toolsDrawer.classList.add('open');
    });

    this.dom.btnCloseTools.addEventListener('click', () => {
      soundfx.playClick();
      this.dom.toolsDrawer.classList.remove('open');
    });

    // Add note
    this.dom.btnAddNote.addEventListener('click', () => this.handleAddNewNote());
    this.dom.inputNewNote.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleAddNewNote();
    });

    this.dom.btnClearAllNotes.addEventListener('click', () => {
      soundfx.playClick();
      store.clearNotes();
      this.renderNotes();
    });

    // Close drawers when clicking backdrop
    [this.dom.settingsDrawer, this.dom.toolsDrawer].forEach((drawer) => {
      drawer.addEventListener('click', (e) => {
        if (e.target === drawer) {
          drawer.classList.remove('open');
        }
      });
    });

    // Keyboard shortcut: Space when not typing in input opens mic
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && document.activeElement !== this.dom.cmdInput && document.activeElement !== this.dom.inputApiKey && document.activeElement !== this.dom.inputNewNote) {
        e.preventDefault();
        this.toggleListening();
      }
    });
  }

  toggleListening() {
    if (this.speech.isListening) {
      soundfx.playDeactivation();
      this.speech.stopListening();
    } else {
      soundfx.playActivation();
      const started = this.speech.startListening();
      if (!started) {
        this.appendMessage('assistant', '⚠️ Microphone access is not supported or was blocked. You can type commands into the prompt bar below.');
      }
    }
  }

  async processUserInput(input) {
    if (!input || !input.trim()) return;
    const text = input.trim();

    // 1. Append user message
    this.appendMessage('user', text);
    this.history.push({ sender: 'user', text });

    // 2. Try fast local command
    this.handleStatusChange('thinking');
    const localResult = await processLocalCommand(text, {
      assistantName: this.settings.assistantName,
      store
    });

    if (localResult) {
      // Local command handled
      soundfx.playSuccess();

      // If timer command, start active timer
      if (localResult.type === 'timer' && localResult.data) {
        this.startTimer(localResult.data.seconds, localResult.data.label);
      }

      // If note added, refresh notes drawer
      if (localResult.type === 'note_added') {
        this.renderNotes();
      }

      this.appendMessage('assistant', localResult.text);
      this.history.push({ sender: 'nova', text: localResult.text });

      // Speak response if voice is enabled
      if (this.voiceEnabled) {
        this.speech.speak(localResult.speech || localResult.text, {
          rate: this.settings.speechRate,
          pitch: this.settings.speechPitch
        });
      } else {
        this.handleStatusChange('idle');
      }
      return;
    }

    // 3. Forward to Gemini AI Brain (with fallback to secondary models and Agent Router)
    const geminiRes = await askGemini(text, {
      apiKey: this.settings.geminiApiKey,
      agentRouterKey: this.settings.agentRouterKey,
      model: this.settings.geminiModel,
      history: this.history
    });

    soundfx.playSuccess();
    this.appendMessage('assistant', geminiRes.text);
    this.history.push({ sender: 'nova', text: geminiRes.text });

    if (this.voiceEnabled) {
      this.speech.speak(geminiRes.speech || geminiRes.text, {
        rate: this.settings.speechRate,
        pitch: this.settings.speechPitch
      });
    } else {
      this.handleStatusChange('idle');
    }
  }

  startTimer(seconds, label) {
    const timerId = Date.now().toString();
    const timerObj = {
      id: timerId,
      label,
      remaining: seconds,
      total: seconds,
      interval: null
    };

    timerObj.interval = setInterval(() => {
      timerObj.remaining -= 1;
      this.renderTimers();

      if (timerObj.remaining <= 0) {
        clearInterval(timerObj.interval);
        this.activeTimers = this.activeTimers.filter(t => t.id !== timerId);
        soundfx.playAlert();
        this.appendMessage('assistant', `⏰ **Timer Finished!** Your **${label}** timer is complete!`);
        this.speech.speak(`Timer alert! Your ${label} timer is finished!`);
        this.renderTimers();
      }
    }, 1000);

    this.activeTimers.push(timerObj);
    this.renderTimers();
  }

  renderTimers() {
    if (this.activeTimers.length === 0) {
      this.dom.timersList.innerHTML = '<p style="font-size: 0.82rem; color: var(--text-muted);">No active timers. Say <em>"timer for 5 minutes"</em> to start one.</p>';
      return;
    }

    this.dom.timersList.innerHTML = this.activeTimers.map(t => {
      const m = Math.floor(t.remaining / 60);
      const s = t.remaining % 60;
      const fmt = `${m}:${s < 10 ? '0' : ''}${s}`;
      return `
        <div class="timer-active-card">
          <div>
            <div style="font-size: 0.82rem; color: var(--text-secondary);">${t.label}</div>
            <div class="timer-countdown">${fmt}</div>
          </div>
          <button class="btn-bubble-action" onclick="window.nova.cancelTimer('${t.id}')">Cancel</button>
        </div>
      `;
    }).join('');
  }

  cancelTimer(id) {
    const found = this.activeTimers.find(t => t.id === id);
    if (found) {
      clearInterval(found.interval);
      this.activeTimers = this.activeTimers.filter(t => t.id !== id);
      this.renderTimers();
      soundfx.playClick();
    }
  }

  handleAddNewNote() {
    const text = this.dom.inputNewNote.value.trim();
    if (text) {
      store.addNote(text);
      this.dom.inputNewNote.value = '';
      soundfx.playSuccess();
      this.renderNotes();
    }
  }

  deleteNote(id) {
    store.deleteNote(id);
    soundfx.playClick();
    this.renderNotes();
  }

  renderNotes() {
    const notes = store.getNotes();
    if (notes.length === 0) {
      this.dom.notesList.innerHTML = '<p style="font-size: 0.82rem; color: var(--text-muted);">No notes saved. Click above to add one.</p>';
      return;
    }

    this.dom.notesList.innerHTML = notes.map(n => `
      <div class="note-item">
        <div>
          <div class="note-item-text">${this.escapeHTML(n.text)}</div>
          <div class="note-item-time">${n.date} at ${n.timestamp}</div>
        </div>
        <button class="btn-delete-note" onclick="window.nova.deleteNote('${n.id}')" title="Delete note">✕</button>
      </div>
    `).join('');
  }

  appendMessage(sender, text) {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${sender}`;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const senderName = sender === 'user' ? 'YOU' : this.settings.assistantName.toUpperCase();

    // Format basic Markdown into HTML
    const formattedHtml = this.renderMarkdown(text);

    bubble.innerHTML = `
      <div class="bubble-meta">
        <span>${sender === 'user' ? '👤' : '🤖'} ${senderName}</span>
        <span>${time}</span>
      </div>
      <div class="bubble-content">
        ${formattedHtml}
      </div>
      ${sender === 'assistant' ? `
        <div class="bubble-actions">
          <button class="btn-bubble-action btn-speak" title="Replay voice">🔊 Speak</button>
          <button class="btn-bubble-action btn-copy" title="Copy to clipboard">📋 Copy</button>
        </div>
      ` : ''}
    `;

    // Hook bubble actions
    if (sender === 'assistant') {
      const speakBtn = bubble.querySelector('.btn-speak');
      const copyBtn = bubble.querySelector('.btn-copy');

      speakBtn.addEventListener('click', () => {
        soundfx.playClick();
        this.speech.speak(text, {
          rate: this.settings.speechRate,
          pitch: this.settings.speechPitch
        });
      });

      copyBtn.addEventListener('click', () => {
        soundfx.playClick();
        navigator.clipboard.writeText(text);
        copyBtn.textContent = '✓ Copied';
        setTimeout(() => copyBtn.textContent = '📋 Copy', 1500);
      });
    }

    this.dom.chatFeed.appendChild(bubble);
    this.dom.chatFeed.scrollTop = this.dom.chatFeed.scrollHeight;
  }

  renderMarkdown(text) {
    if (!text) return '';
    let parsed = this.escapeHTML(text);

    // Code blocks
    parsed = parsed.replace(/```([a-z]*)\n([\s\S]*?)```/gi, (_, lang, code) => {
      return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Inline code
    parsed = parsed.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers
    parsed = parsed.replace(/^### (.*$)/gim, '<h3 style="color: var(--cyan-neon); margin: 8px 0 4px 0;">$1</h3>');
    parsed = parsed.replace(/^## (.*$)/gim, '<h2 style="color: var(--cyan-neon); margin: 8px 0 4px 0;">$1</h2>');
    parsed = parsed.replace(/^# (.*$)/gim, '<h1 style="color: var(--cyan-neon); margin: 8px 0 4px 0;">$1</h1>');

    // Bold & italic
    parsed = parsed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    parsed = parsed.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Markdown links [text](url)
    parsed = parsed.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1 ↗</a>');

    // Bullet points
    parsed = parsed.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
    parsed = parsed.replace(/(<li>.*<\/li>)/gims, '<ul style="margin: 6px 0 6px 18px;">$1</ul>');

    // Paragraph linebreaks
    parsed = parsed.replace(/\n\n/g, '</p><p>');
    parsed = parsed.replace(/\n/g, '<br/>');

    return `<p>${parsed}</p>`;
  }

  escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  clearChatFeed() {
    this.dom.chatFeed.innerHTML = `
      <div class="message-bubble assistant">
        <div class="bubble-meta">
          <span>🤖 ${this.settings.assistantName.toUpperCase()}</span>
          <span>SYSTEM</span>
        </div>
        <div class="bubble-content">
          <p>Chat feed cleared. Ready for your next command!</p>
        </div>
      </div>
    `;
    this.history = [];
  }

  applySettingsToUI() {
    this.dom.inputApiKey.value = this.settings.geminiApiKey || '';
    this.dom.inputAgentRouterKey.value = this.settings.agentRouterKey || '';
    this.dom.selectModel.value = this.settings.geminiModel || 'gemini-3.8-flash';
    this.dom.inputAssistantName.value = this.settings.assistantName || 'NOVA';
    this.dom.rangeRate.value = this.settings.speechRate || 1.0;
    this.dom.rateVal.textContent = `${this.dom.rangeRate.value}x`;
    this.dom.rangePitch.value = this.settings.speechPitch || 1.0;
    this.dom.pitchVal.textContent = this.dom.rangePitch.value;
    this.dom.checkSoundFx.checked = !!this.settings.soundEffects;

    this.dom.assistantTitle.innerHTML = `${this.escapeHTML(this.settings.assistantName)} <span style="font-size: 0.65em; opacity: 0.75; font-family: var(--font-mono); color: var(--cyan-neon);">v2.0</span>`;
  }

  savePreferences() {
    const updated = {
      geminiApiKey: this.dom.inputApiKey.value.trim(),
      agentRouterKey: this.dom.inputAgentRouterKey.value.trim(),
      geminiModel: this.dom.selectModel.value,
      assistantName: this.dom.inputAssistantName.value.trim() || 'NOVA',
      voiceURI: this.dom.selectVoice.value,
      speechRate: parseFloat(this.dom.rangeRate.value),
      speechPitch: parseFloat(this.dom.rangePitch.value),
      soundEffects: this.dom.checkSoundFx.checked
    };

    this.settings = store.saveSettings(updated);
    soundfx.setEnabled(this.settings.soundEffects);
    if (this.settings.voiceURI) {
      this.speech.setVoiceByURI(this.settings.voiceURI);
    }
    this.dom.assistantTitle.innerHTML = `${this.escapeHTML(this.settings.assistantName)} <span style="font-size: 0.65em; opacity: 0.75; font-family: var(--font-mono); color: var(--cyan-neon);">v2.0</span>`;
  }
}

// Instantiate and expose globally for inline card buttons
window.addEventListener('DOMContentLoaded', () => {
  window.nova = new NovaAssistant();
});
