// Holographic Canvas Visualizer Orb for NOVA

export class VisualizerOrb {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = 'idle'; // 'idle', 'listening', 'thinking', 'speaking'
    this.audioData = new Uint8Array(64);
    this.analyser = null;
    this.animationId = null;

    // Dimensions
    this.width = canvas.width;
    this.height = canvas.height;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    this.baseRadius = Math.min(this.width, this.height) * 0.22;

    // Mouse parallax
    this.mouseX = this.centerX;
    this.mouseY = this.centerY;
    this.targetMouseX = this.centerX;
    this.targetMouseY = this.centerY;

    // Animation physics
    this.time = 0;
    this.pulse = 0;
    this.particles = [];
    this.initParticles(75);

    this.bindEvents();
    this.resize();
  }

  initParticles(count) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = this.baseRadius * (0.6 + Math.random() * 1.2);
      this.particles.push({
        angle,
        distance,
        speed: (Math.random() - 0.5) * 0.015,
        size: Math.random() * 2.5 + 1,
        opacity: Math.random() * 0.7 + 0.3,
        orbitRadius: (Math.random() - 0.5) * 20
      });
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.targetMouseX = e.clientX - rect.left;
      this.targetMouseY = e.clientY - rect.top;
    });
    this.canvas.addEventListener('mouseleave', () => {
      this.targetMouseX = this.centerX;
      this.targetMouseY = this.centerY;
    });
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const size = Math.min(rect.width || 380, 420);
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;

    this.ctx.scale(dpr, dpr);
    this.width = size;
    this.height = size;
    this.centerX = size / 2;
    this.centerY = size / 2;
    this.baseRadius = size * 0.24;
  }

  setState(state) {
    this.state = state;
  }

  setAnalyser(analyser) {
    this.analyser = analyser;
    if (analyser) {
      this.audioData = new Uint8Array(analyser.frequencyBinCount);
    }
  }

  start() {
    if (!this.animationId) {
      this.render();
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  getPalette() {
    switch (this.state) {
      case 'listening':
        return {
          core: ['#00f2fe', '#4facfe', '#000'],
          ring1: '#00f2fe',
          ring2: '#7000ff',
          glow: 'rgba(0, 242, 254, 0.4)',
          particle: '#00f2fe'
        };
      case 'thinking':
        return {
          core: ['#f6d365', '#fda085', '#000'],
          ring1: '#ff9a44',
          ring2: '#fc6076',
          glow: 'rgba(253, 160, 133, 0.45)',
          particle: '#f6d365'
        };
      case 'speaking':
        return {
          core: ['#f72585', '#7209b7', '#000'],
          ring1: '#ec4899',
          ring2: '#00f2fe',
          glow: 'rgba(236, 72, 153, 0.45)',
          particle: '#f472b6'
        };
      case 'idle':
      default:
        return {
          core: ['#00f2fe', '#0072ff', '#000'],
          ring1: '#00c6ff',
          ring2: '#5b21b6',
          glow: 'rgba(0, 198, 255, 0.25)',
          particle: '#38bdf8'
        };
    }
  }

  render() {
    this.animationId = requestAnimationFrame(() => this.render());
    this.time += 0.025;

    // Smooth mouse parallax
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;
    const offsetX = (this.mouseX - this.centerX) * 0.08;
    const offsetY = (this.mouseY - this.centerY) * 0.08;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Audio frequency energy calculation
    let audioEnergy = 0;
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.audioData);
      let sum = 0;
      for (let i = 0; i < 32; i++) {
        sum += this.audioData[i];
      }
      audioEnergy = sum / (32 * 255);
    } else if (this.state === 'speaking') {
      audioEnergy = 0.25 + Math.sin(this.time * 8) * 0.2 + Math.cos(this.time * 12) * 0.15;
    } else if (this.state === 'listening') {
      audioEnergy = 0.15 + Math.sin(this.time * 5) * 0.1;
    }

    const palette = this.getPalette();
    const cx = this.centerX + offsetX;
    const cy = this.centerY + offsetY;

    // Dynamic radius
    const breathing = Math.sin(this.time * 1.5) * 4;
    const currentRadius = this.baseRadius + breathing + audioEnergy * 35;

    // 1. Ambient outer aura
    const auraGrad = ctx.createRadialGradient(cx, cy, currentRadius * 0.2, cx, cy, currentRadius * 2.2);
    auraGrad.addColorStop(0, palette.glow);
    auraGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, currentRadius * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // 2. Waveform node ring
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.time * 0.2);

    const wavePoints = 48;
    ctx.beginPath();
    for (let i = 0; i <= wavePoints; i++) {
      const angle = (i / wavePoints) * Math.PI * 2;
      const waveFreq = this.state === 'thinking' ? 12 : 6;
      const waveAmp = (this.state === 'idle' ? 3 : 8) + audioEnergy * 25;
      const waveOffset = Math.sin(angle * waveFreq + this.time * 3) * waveAmp;
      const r = currentRadius * 1.15 + waveOffset;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = palette.ring1;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 16;
    ctx.shadowColor = palette.ring1;
    ctx.stroke();
    ctx.restore();

    // 3. Counter-rotating inner technical orbital ring
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-this.time * 0.4);
    ctx.setLineDash([8, 12, 2, 12]);
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius * 0.88, 0, Math.PI * 2);
    ctx.strokeStyle = palette.ring2;
    ctx.lineWidth = 1.8;
    ctx.shadowBlur = 10;
    ctx.shadowColor = palette.ring2;
    ctx.stroke();
    ctx.restore();

    // 4. Orbiting particles
    ctx.save();
    ctx.translate(cx, cy);
    this.particles.forEach((p) => {
      p.angle += p.speed * (this.state === 'thinking' ? 3.5 : 1);
      const r = p.distance + Math.sin(this.time + p.angle * 2) * p.orbitRadius;
      const px = Math.cos(p.angle) * r;
      const py = Math.sin(p.angle) * r;

      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fillStyle = palette.particle;
      ctx.globalAlpha = p.opacity;
      ctx.shadowBlur = 8;
      ctx.shadowColor = palette.particle;
      ctx.fill();
    });
    ctx.restore();

    // 5. High-tech Core Plasma Sphere
    const coreGrad = ctx.createRadialGradient(
      cx - currentRadius * 0.25,
      cy - currentRadius * 0.25,
      currentRadius * 0.05,
      cx,
      cy,
      currentRadius * 0.72
    );
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.3, palette.core[0]);
    coreGrad.addColorStop(0.7, palette.core[1]);
    coreGrad.addColorStop(1, 'rgba(5, 7, 18, 0.95)');

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, currentRadius * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.shadowBlur = 24;
    ctx.shadowColor = palette.ring1;
    ctx.fill();

    // Core glass ring highlight
    ctx.beginPath();
    ctx.arc(cx - currentRadius * 0.15, cy - currentRadius * 0.15, currentRadius * 0.35, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}
