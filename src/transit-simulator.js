/**
 * Exoplanet Hunter - Real-Time Physical Transit Simulator
 * Visualizes the stellar disk with authentic limb darkening and transiting exoplanet silhouette
 * within a calibrated optical aperture telescope monitor.
 */

export class TransitSimulator {
  constructor(canvasElement, onPhaseUpdate = null) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.onPhaseUpdate = onPhaseUpdate;

    this.isPlaying = true;
    this.phase = 0.15; // 0 to 1
    this.speed = 0.08; // cycles per second
    this.starType = 'G-Type';
    this.starRadiusRatio = 1.0;
    this.planetRadiusRatio = 0.18;
    this.impactParameter = 0.15;
    this.hasTransit = true;
    this.transitDepth = 0.005;

    this.lastTimestamp = performance.now();
    this.animationFrameId = null;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.loop = this.loop.bind(this);
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  setParams({
    planetRadius = 1.4,
    starRadius = 1.0,
    transitDepth = 0.005,
    hasTransit = true,
    speed = 0.08
  }) {
    this.hasTransit = hasTransit;
    this.transitDepth = transitDepth;
    this.speed = speed;

    const visualRatio = Math.max(0.08, Math.min(0.32, Math.sqrt(Math.max(0.001, transitDepth)) * 3.2));
    this.planetRadiusRatio = visualRatio;
  }

  setPhase(p) {
    this.phase = ((p % 1) + 1) % 1;
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    return this.isPlaying;
  }

  loop(timestamp) {
    const dt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    if (this.isPlaying) {
      this.phase = (this.phase + this.speed * dt) % 1.0;
      if (this.onPhaseUpdate) {
        this.onPhaseUpdate(this.phase);
      }
    }

    this.draw(timestamp);
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  draw(time) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    // Clean neutral dark telescope focal-plane frame
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    const starX = w / 2;
    const starY = h / 2;
    const starR = Math.min(w, h) * 0.35;

    // Subtle optical aperture crosshairs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(starX, 10);
    ctx.lineTo(starX, h - 10);
    ctx.moveTo(10, starY);
    ctx.lineTo(w - 10, starY);
    ctx.stroke();

    // 1. Stellar Corona Glow
    const coronaGrad = ctx.createRadialGradient(starX, starY, starR * 0.85, starX, starY, starR * 1.45);
    coronaGrad.addColorStop(0, 'rgba(234, 88, 12, 0.35)');
    coronaGrad.addColorStop(0.5, 'rgba(194, 65, 12, 0.12)');
    coronaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = coronaGrad;
    ctx.beginPath();
    ctx.arc(starX, starY, starR * 1.45, 0, Math.PI * 2);
    ctx.fill();

    // 2. Stellar Disk with Physical Limb Darkening
    const starGrad = ctx.createRadialGradient(
      starX - starR * 0.1,
      starY - starR * 0.1,
      starR * 0.05,
      starX,
      starY,
      starR
    );
    starGrad.addColorStop(0, '#fffbeb');   // Hot core center
    starGrad.addColorStop(0.3, '#fef08a');
    starGrad.addColorStop(0.7, '#f97316');
    starGrad.addColorStop(0.95, '#c2410c'); // Limb darkening edge
    starGrad.addColorStop(1.0, '#9a3412');

    ctx.beginPath();
    ctx.arc(starX, starY, starR, 0, Math.PI * 2);
    ctx.fillStyle = starGrad;
    ctx.fill();

    // 3. Orbit Chord
    const orbitWidth = w * 0.86;
    const orbitY = starY + starR * this.impactParameter;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(starX - orbitWidth / 2, orbitY);
    ctx.lineTo(starX + orbitWidth / 2, orbitY);
    ctx.stroke();
    ctx.restore();

    // 4. Calculate Planet Transit Position
    const planetX = (starX - orbitWidth / 2) + this.phase * orbitWidth;
    const planetY = orbitY;
    const planetR = Math.max(6, starR * this.planetRadiusRatio);

    const distToCenter = Math.hypot(planetX - starX, planetY - starY);
    const isInTransit = distToCenter < (starR + planetR);

    // Draw Planet
    if (this.hasTransit) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(planetX, planetY, planetR, 0, Math.PI * 2);

      if (isInTransit) {
        // Stark opaque planetary silhouette
        ctx.fillStyle = '#020617';
        ctx.fill();

        // Atmospheric halo
        ctx.strokeStyle = 'rgba(254, 215, 170, 0.6)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#334155';
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Telemetry text overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`STATUS: ${isInTransit ? 'TRANSIT OCCULTATION' : 'OUT-OF-TRANSIT'}`, 14, 20);
    ctx.fillText(`ORBIT PHASE: ${this.phase.toFixed(3)}`, 14, 34);

    if (isInTransit) {
      ctx.fillStyle = '#fb923c';
      ctx.fillText(`ATTENUATION: -${(this.transitDepth * 100).toFixed(3)}%`, 14, 48);
    }
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
