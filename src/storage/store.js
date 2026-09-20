// LocalStorage manager for NOVA Virtual Assistant

const STORAGE_KEYS = {
  SETTINGS: 'nova_settings',
  NOTES: 'nova_notes',
  HISTORY: 'nova_history'
};

const DEFAULT_SETTINGS = {
  assistantName: 'NOVA',
  geminiApiKey: import.meta.env?.VITE_GEMINI_API_KEY || '',
  geminiModel: 'gemini-3.8-flash',
  backupModel: 'gemini-3.1-flash-lite',
  agentRouterKey: import.meta.env?.VITE_AGENT_ROUTER_KEY || '',
  voiceURI: '',
  speechRate: 1.0,
  speechPitch: 1.0,
  soundEffects: true,
  autoListen: false,
  wakeWord: 'nova'
};

export const store = {
  getSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  },

  saveSettings(newSettings) {
    const updated = { ...this.getSettings(), ...newSettings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  },

  getNotes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.NOTES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  addNote(text) {
    const notes = this.getNotes();
    const newNote = {
      id: Date.now().toString(),
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString()
    };
    notes.unshift(newNote);
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
    return newNote;
  },

  deleteNote(id) {
    const notes = this.getNotes().filter(n => n.id !== id);
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
    return notes;
  },

  clearNotes() {
    localStorage.removeItem(STORAGE_KEYS.NOTES);
    return [];
  },

  getHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  addHistory(item) {
    const history = this.getHistory();
    history.push({
      ...item,
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    // Keep last 60 entries
    if (history.length > 60) history.shift();
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  },

  clearHistory() {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  }
};
