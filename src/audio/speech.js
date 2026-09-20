// Speech Recognition and Speech Synthesis Controller for NOVA

export class SpeechEngine {
  constructor(options = {}) {
    this.recognition = null;
    this.synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.isListening = false;
    this.isSpeaking = false;
    this.voices = [];
    this.selectedVoice = null;
    this.options = {
      onResult: () => {},
      onInterim: () => {},
      onStatusChange: () => {},
      onError: () => {},
      ...options
    };

    this.initRecognition();
    this.initVoices();
  }

  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not supported in this browser.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      this.options.onStatusChange('listening');
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (interimTranscript) {
        this.options.onInterim(interimTranscript);
      }

      if (finalTranscript) {
        this.options.onResult(finalTranscript.trim());
      }
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      this.options.onError(event.error);
      this.options.onStatusChange('idle');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.options.onStatusChange('idle');
    };
  }

  initVoices() {
    if (!this.synthesis) return;

    const load = () => {
      this.voices = this.synthesis.getVoices();
      // Auto pick high-quality natural voice if none picked
      if (!this.selectedVoice && this.voices.length > 0) {
        const preferred = this.voices.find(v => 
          (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('Jenny')) &&
          v.lang.startsWith('en')
        ) || this.voices.find(v => v.lang.startsWith('en')) || this.voices[0];
        
        this.selectedVoice = preferred;
      }
    };

    load();
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = load;
    }
  }

  getAvailableVoices() {
    return this.voices.filter(v => v.lang.startsWith('en') || v.lang.startsWith('en-'));
  }

  setVoiceByURI(uri) {
    const found = this.voices.find(v => v.voiceURI === uri);
    if (found) {
      this.selectedVoice = found;
    }
  }

  startListening() {
    if (!this.recognition) {
      this.options.onError('Speech Recognition is not supported in this browser. Please use Chrome or Edge, or type in the text box.');
      return false;
    }

    if (this.isSpeaking) {
      this.stopSpeaking();
    }

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      console.warn('Speech recognition start error:', e);
      return false;
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.options.onStatusChange('idle');
    }
  }

  cleanTextForSpeech(text) {
    if (!text) return '';
    return text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.') // remove code blocks
      .replace(/`([^`]+)`/g, '$1')                        // remove inline backticks
      .replace(/\*\*([^*]+)\*\*/g, '$1')                  // remove bold markdown
      .replace(/\*([^*]+)\*/g, '$1')                      // remove italic markdown
      .replace(/#{1,6}\s?/g, '')                          // remove headers
      .replace(/https?:\/\/\S+/g, 'link')                 // replace URLs
      .replace(/[^\w\s.,?!'-]/g, ' ')                     // remove special symbols
      .replace(/\s+/g, ' ')
      .trim();
  }

  speak(text, { rate = 1.0, pitch = 1.0, onEnd = () => {} } = {}) {
    if (!this.synthesis) {
      onEnd();
      return;
    }

    this.stopSpeaking();

    const clean = this.cleanTextForSpeech(text);
    if (!clean) {
      onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.rate = rate;
    utterance.pitch = pitch;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.options.onStatusChange('speaking');
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.options.onStatusChange('idle');
      onEnd();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.options.onStatusChange('idle');
      onEnd();
    };

    this.synthesis.speak(utterance);
  }

  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      this.options.onStatusChange('idle');
    }
  }
}
