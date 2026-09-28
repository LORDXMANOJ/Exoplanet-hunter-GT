/**
 * Exoplanet Hunter - Real-Time Physical Planetary Transit Simulator
 * Visualizes the stellar disk with limb darkening and an exoplanet transiting in real-time,
 * synchronized with light curve flux dip tracking.
 */

export class TransitSimulator {
  constructor(canvasElement, onPhaseUpdate = null) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.onPhaseUpdate = onPhaseUpdate;

    this.isPlaying = true;
    this.phase = 0.15; // 0 to 1
    this.speed = 0.08; // cycles per second
    this.starType = 'G-Type'; // Solar yellow-orange
    this.starRadiusRatio = 1.0;
    this.planetRadiusRatio = 0.18; // visually pleasant default
    this.impactParameter = 0.2; // 0 = centered, 1 = grazing edge
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
    planetRadius = 1.4, // Earth radii or ratio
    starRadius = 1.0,
    transitDepth = 0.005,
    hasTransit = true,
    speed = 0.08
  }) {
    this.hasTransit = hasTransit;
    this.transitDepth = transitDepth;
    this.speed = speed;

    // Scale planet visual radius between 0.08 and 0.32 of star radius
    const visualRatio = Math.max(0.08, Math.min(0.35, Math.sqrt(Math.max(0.001, transitDepth)) * 3.2));
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

    // Deep space background
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h));
    bgGrad.addColorStop(0, '#0d131f');
    bgGrad.addColorStop(1, '#05070c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Distant background star particles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const seedPoints = [
      [w * 0.12, h * 0.18, 1.2],
      [w * 0.88, h * 0.22, 0.8],
      [w * 0.25, h * 0.85, 1.0],
      [w * 0.78, h * 0.82, 1.4],
      [w * 0.08, h * 0.65, 0.9],
      [w * 0.92, h * 0.55, 1.1]
    ];
    for (const [sx, sy, sr] of seedPoints) {
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    const starX = w / 2;
    const starY = h / 2;
    const starR = Math.min(w, h) * 0.34;

    // 1. Outer Stellar Corona Glow
    const coronaGrad = ctx.createRadialGradient(starX, starY, starR * 0.8, starX, starY, starR * 1.55);
    coronaGrad.addColorStop(0, 'rgba(255, 185, 40, 0.45)');
    coronaGrad.addColorStop(0.4, 'rgba(255, 120, 20, 0.18)');
    coronaGrad.addColorStop(0.8, 'rgba(255, 70, 0, 0.05)');
    coronaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = coronaGrad;
    ctx.beginPath();
    ctx.arc(starX, starY, starR * 1.55, 0, Math.PI * 2);
    ctx.fill();

    // Subtle animated solar flares
    const flareCount = 6;
    for (let i = 0; i < flareCount; i++) {
      const angle = (i * (Math.PI * 2 / flareCount)) + (time * 0.0003);
      const flareLen = starR * (1.08 + Math.sin(time * 0.002 + i) * 0.04);
      const fx = starX + Math.cos(angle) * flareLen;
      const fy = starY + Math.sin(angle) * flareLen;

      ctx.beginPath();
      ctx.arc(fx, fy, starR * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 160, 50, 0.08)';
      ctx.fill();
    }

    // 2. Star Disk with Realistic Limb Darkening
    // Center is hot & bright (#FFF8E7 / #FFD56B), outer limb is darker (#E65100 / #BF360C)
    const starGrad = ctx.createRadialGradient(
      starX - starR * 0.15,
      starY - starR * 0.15,
      starR * 0.05,
      starX,
      starY,
      starR
    );
    starGrad.addColorStop(0, '#FFFCE6'); // Core radiance
    starGrad.addColorStop(0.2, '#FFE57F');
    starGrad.addColorStop(0.65, '#FFA000');
    starGrad.addColorStop(0.92, '#E65100'); // Limb darkening edge
    starGrad.addColorStop(1.0, '#BF360C');

    ctx.beginPath();
    ctx.arc(starX, starY, starR, 0, Math.PI * 2);
    ctx.fillStyle = starGrad;
    ctx.shadowColor = '#FF9800';
    ctx.shadowBlur = 35;
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    // 3. Orbit Path Line
    const orbitWidth = w * 0.88;
    const orbitY = starY + starR * this.impactParameter;

    ctx.save();
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(starX - orbitWidth / 2, orbitY);
    ctx.lineTo(starX + orbitWidth / 2, orbitY);
    ctx.stroke();
    ctx.restore();

    // 4. Calculate Planet Transit Position
    // Phase 0.0 to 1.0:
    // Transit happens across center between phase 0.25 to 0.75
    // Let's map phase so planet moves from Left to Right:
    // Left edge = starX - orbitWidth / 2, Right edge = starX + orbitWidth / 2
    const planetX = (starX - orbitWidth / 2) + this.phase * orbitWidth;
    const planetY = orbitY;
    const planetR = Math.max(6, starR * this.planetRadiusRatio);

    // Is planet currently in front of the star disk?
    const distToCenter = Math.hypot(planetX - starX, planetY - starY);
    const isInTransit = distToCenter < (starR + planetR);

    // Draw Exoplanet
    if (this.hasTransit) {
      // Planet silhouette
      ctx.save();
      ctx.beginPath();
      ctx.arc(planetX, planetY, planetR, 0, Math.PI * 2);

      if (isInTransit) {
        // Deep black silhouette with backlit atmospheric rim
        ctx.fillStyle = '#06070a';
        ctx.fill();

        // Atmosphere halo rim illuminated by host star
        ctx.strokeStyle = 'rgba(79, 172, 254, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // Out of transit: illuminated by side star shine
        const planetGrad = ctx.createRadialGradient(
          planetX - planetR * 0.3,
          planetY - planetR * 0.3,
          planetR * 0.1,
          planetX,
          planetY,
          planetR
        );
        planetGrad.addColorStop(0, '#3a4b63');
        planetGrad.addColorStop(1, '#0e1219');
        ctx.fillStyle = planetGrad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Status overlay text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`TRANSIT STATUS: ${isInTransit ? 'IN OCCULTATION (TRANSIT ACTIVE)' : 'OUT OF TRANSIT'}`, 16, 24);
    ctx.fillText(`PHASE: ${this.phase.toFixed(3)} | ORBIT SPEED: ${this.speed.toFixed(2)}x`, 16, 40);

    if (isInTransit) {
      ctx.fillStyle = '#00F2FE';
      ctx.fillText(`FLUX ATTENUATION: -${(this.transitDepth * 100).toFixed(3)}%`, 16, 56);
    }
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
