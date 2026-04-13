interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  gravity: number;
}

const MAX_PARTICLES = 80;

export class ParticleEngine {
  private particles: Particle[] = [];
  private ctx: CanvasRenderingContext2D | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private animationId: number | null = null;
  private lastTime = 0;

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.resize();
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst(x: number, y: number, baseColor: string, count = 20) {
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 5,
        color: baseColor,
        alpha: 1,
        decay: 0.015 + Math.random() * 0.01,
        gravity: 0.08,
      });
    }
    this.startLoop();
  }

  confetti(x: number, y: number, count = 30) {
    const colors = [
      "#FF69B4",
      "#4FC3F7",
      "#FFD54F",
      "#81C784",
      "#CE93D8",
      "#FFB74D",
    ];
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const speed = 3 + Math.random() * 5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        radius: 3 + Math.random() * 4,
        color: colors[i % colors.length],
        alpha: 1,
        decay: 0.012 + Math.random() * 0.008,
        gravity: 0.1,
      });
    }
    this.startLoop();
  }

  sparkle(x: number, y: number, count = 8) {
    const colors = ["#FFD54F", "#FFFFFF", "#FFB74D"];
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3,
        color: colors[i % colors.length],
        alpha: 1,
        decay: 0.025 + Math.random() * 0.015,
        gravity: 0,
      });
    }
    this.startLoop();
  }

  private startLoop() {
    if (this.animationId !== null) return;
    this.lastTime = performance.now();
    this.tick();
  }

  private tick = () => {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 16.67, 3); // cap at 3x speed
    this.lastTime = now;

    this.update(dt);
    this.draw();

    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(this.tick);
    } else {
      this.animationId = null;
    }
  };

  private update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vx *= 0.98;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private draw() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const p of this.particles) {
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  destroy() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.particles = [];
  }
}
