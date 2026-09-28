/**
 * Exoplanet Hunter - Interactive Astronomical Plotting
 * High-performance canvas-based charting for light curves, phase folding, and BLS periodogram.
 */

export class LightCurveChart {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');

    this.time = [];
    this.flux = [];
    this.transitRegions = [];
    this.period = null;

    // Viewport & zoom state
    this.minTime = 0;
    this.maxTime = 10;
    this.minFlux = 0.98;
    this.maxFlux = 1.02;

    this.defaultMinTime = 0;
    this.defaultMaxTime = 10;
    this.defaultMinFlux = 0.98;
    this.defaultMaxFlux = 1.02;

    this.hoverPoint = null;
    this.simTrackerPhase = null;

    this.padding = { top: 30, right: 30, bottom: 45, left: 65 };

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.attachEvents();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
    this.render();
  }

  attachEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (
        mouseX >= this.padding.left &&
        mouseX <= this.width - this.padding.right &&
        mouseY >= this.padding.top &&
        mouseY <= this.height - this.padding.bottom &&
        this.time.length > 0
      ) {
        // Convert mouseX to time
        const plotW = this.width - this.padding.left - this.padding.right;
        const tVal = this.minTime + ((mouseX - this.padding.left) / plotW) * (this.maxTime - this.minTime);

        // Find nearest point
        let nearestIdx = 0;
        let minDist = Infinity;
        for (let i = 0; i < this.time.length; i++) {
          const d = Math.abs(this.time[i] - tVal);
          if (d < minDist) {
            minDist = d;
            nearestIdx = i;
          }
        }

        this.hoverPoint = {
          time: this.time[nearestIdx],
          flux: this.flux[nearestIdx],
          x: this.timeToX(this.time[nearestIdx]),
          y: this.fluxToY(this.flux[nearestIdx])
        };
      } else {
        this.hoverPoint = null;
      }
      this.render();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoverPoint = null;
      this.render();
    });
  }

  setData(time, flux, transitRegions = [], period = null) {
    this.time = time || [];
    this.flux = flux || [];
    this.transitRegions = transitRegions || [];
    this.period = period;

    if (this.time.length > 0 && this.flux.length > 0) {
      this.minTime = Math.min(...this.time);
      this.maxTime = Math.max(...this.time);

      const fMin = Math.min(...this.flux);
      const fMax = Math.max(...this.flux);
      const pad = Math.max(0.003, (fMax - fMin) * 0.15);

      this.minFlux = Math.max(0.85, fMin - pad);
      this.maxFlux = Math.min(1.15, fMax + pad);

      this.defaultMinTime = this.minTime;
      this.defaultMaxTime = this.maxTime;
      this.defaultMinFlux = this.minFlux;
      this.defaultMaxFlux = this.maxFlux;
    }

    this.render();
  }

  resetZoom() {
    this.minTime = this.defaultMinTime;
    this.maxTime = this.defaultMaxTime;
    this.minFlux = this.defaultMinFlux;
    this.maxFlux = this.defaultMaxFlux;
    this.render();
  }

  zoomIn() {
    const timeCenter = (this.minTime + this.maxTime) / 2;
    const timeSpan = (this.maxTime - this.minTime) * 0.65;
    this.minTime = Math.max(this.defaultMinTime, timeCenter - timeSpan / 2);
    this.maxTime = Math.min(this.defaultMaxTime, timeCenter + timeSpan / 2);
    this.render();
  }

  setSimTrackerPhase(phase) {
    this.simTrackerPhase = phase;
    this.render();
  }

  timeToX(t) {
    const plotW = this.width - this.padding.left - this.padding.right;
    return this.padding.left + ((t - this.minTime) / (this.maxTime - this.minTime)) * plotW;
  }

  fluxToY(f) {
    const plotH = this.height - this.padding.top - this.padding.bottom;
    return this.padding.top + (1 - (f - this.minFlux) / (this.maxFlux - this.minFlux)) * plotH;
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    if (w <= 0 || h <= 0) return;

    // Background
    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, w, h);

    const plotX = this.padding.left;
    const plotY = this.padding.top;
    const plotW = w - this.padding.left - this.padding.right;
    const plotH = h - this.padding.top - this.padding.bottom;

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;

    // Horizontal grid & Y-axis labels
    const numYGrid = 5;
    ctx.fillStyle = '#8b9bb4';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= numYGrid; i++) {
      const fVal = this.minFlux + (i / numYGrid) * (this.maxFlux - this.minFlux);
      const y = this.fluxToY(fVal);
      ctx.beginPath();
      ctx.moveTo(plotX, y);
      ctx.lineTo(plotX + plotW, y);
      ctx.stroke();
      ctx.fillText(fVal.toFixed(4), plotX - 10, y);
    }

    // Vertical grid & X-axis labels
    const numXGrid = 6;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let i = 0; i <= numXGrid; i++) {
      const tVal = this.minTime + (i / numXGrid) * (this.maxTime - this.minTime);
      const x = this.timeToX(tVal);
      ctx.beginPath();
      ctx.moveTo(x, plotY);
      ctx.lineTo(x, plotY + plotH);
      ctx.stroke();
      ctx.fillText(tVal.toFixed(1) + 'd', x, plotY + plotH + 8);
    }

    // Axis Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '12px "Space Grotesk", sans-serif';
    ctx.fillText('Time (Days)', plotX + plotW / 2, h - 14);

    ctx.save();
    ctx.translate(16, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Normalized Stellar Flux', 0, 0);
    ctx.restore();

    // Baseline reference line at Flux = 1.0000
    if (this.minFlux <= 1.0 && this.maxFlux >= 1.0) {
      const base1Y = this.fluxToY(1.0);
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.35)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(plotX, base1Y);
      ctx.lineTo(plotX + plotW, base1Y);
      ctx.stroke();
      ctx.restore();
    }

    if (this.time.length === 0 || this.flux.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No Light Curve Data Loaded', plotX + plotW / 2, plotY + plotH / 2);
      return;
    }

    // Highlight detected transit dips with glowing background windows
    for (const region of this.transitRegions) {
      const tStart = this.time[region.startIndex];
      const tEnd = this.time[region.endIndex];
      const x1 = Math.max(plotX, this.timeToX(tStart));
      const x2 = Math.min(plotX + plotW, this.timeToX(tEnd));
      const wRegion = Math.max(4, x2 - x1);

      ctx.fillStyle = 'rgba(0, 242, 254, 0.12)';
      ctx.fillRect(x1, plotY, wRegion, plotH);

      ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
      ctx.strokeRect(x1, plotY, wRegion, plotH);
    }

    // Plot Data Points & Trend Line
    ctx.save();
    ctx.beginPath();
    ctx.rect(plotX, plotY, plotW, plotH);
    ctx.clip();

    // Draw connecting curve
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    let started = false;

    for (let i = 0; i < this.time.length; i++) {
      const t = this.time[i];
      if (t < this.minTime || t > this.maxTime) continue;
      const x = this.timeToX(t);
      const y = this.fluxToY(this.flux[i]);

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Draw individual flux point dots
    ctx.fillStyle = '#60a5fa';
    for (let i = 0; i < this.time.length; i++) {
      const t = this.time[i];
      if (t < this.minTime || t > this.maxTime) continue;
      const x = this.timeToX(t);
      const y = this.fluxToY(this.flux[i]);

      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Transit dips marker dots in electric cyan
    for (const region of this.transitRegions) {
      for (let i = region.startIndex; i <= region.endIndex; i++) {
        const x = this.timeToX(this.time[i]);
        const y = this.fluxToY(this.flux[i]);
        ctx.fillStyle = '#00f2fe';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // If simulator tracker phase is active, draw live animated vertical scanner
    if (this.simTrackerPhase !== null && this.period) {
      // Map phase to active transit periods in view
      const tSpan = this.maxTime - this.minTime;
      const p = this.period;
      const activeTransitTimes = [];
      for (let t = Math.floor(this.minTime / p) * p; t <= this.maxTime + p; t += p) {
        activeTransitTimes.push(t);
      }

      for (const tTransit of activeTransitTimes) {
        // Shift by phase around transit center
        const tPos = tTransit + (this.simTrackerPhase - 0.5) * (p * 0.3);
        if (tPos >= this.minTime && tPos <= this.maxTime) {
          const sx = this.timeToX(tPos);
          ctx.strokeStyle = '#ff9800';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx, plotY);
          ctx.lineTo(sx, plotY + plotH);
          ctx.stroke();

          // Glowing pulse dot
          ctx.fillStyle = '#ff9800';
          ctx.beginPath();
          ctx.arc(sx, plotY + 12, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Hover Tooltip
    if (this.hoverPoint) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(this.hoverPoint.x, plotY);
      ctx.lineTo(this.hoverPoint.x, plotY + plotH);
      ctx.moveTo(plotX, this.hoverPoint.y);
      ctx.lineTo(plotX + plotW, this.hoverPoint.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Point circle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.hoverPoint.x, this.hoverPoint.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Render tooltip box outside clip
    if (this.hoverPoint) {
      const tipText1 = `Time: ${this.hoverPoint.time.toFixed(4)} d`;
      const tipText2 = `Flux: ${this.hoverPoint.flux.toFixed(5)}`;
      const boxW = 145;
      const boxH = 46;
      let boxX = this.hoverPoint.x + 12;
      let boxY = this.hoverPoint.y - 25;

      if (boxX + boxW > w - 10) boxX = this.hoverPoint.x - boxW - 12;
      if (boxY < plotY + 5) boxY = plotY + 5;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(tipText1, boxX + 10, boxY + 8);
      ctx.fillText(tipText2, boxX + 10, boxY + 24);
    }
  }
}

/**
 * Phase-Folded Light Curve Chart (folds time series by orbital period P)
 */
export class PhaseFoldedChart {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.padding = { top: 25, right: 25, bottom: 40, left: 60 };
    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
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

  render(time, flux, period) {
    if (!this.width || !this.height) this.resize();
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, w, h);

    if (!time || !flux || time.length === 0 || !period || period <= 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Run Analysis to Generate Phase-Folded Curve', w / 2, h / 2);
      return;
    }

    const plotX = this.padding.left;
    const plotY = this.padding.top;
    const plotW = w - this.padding.left - this.padding.right;
    const plotH = h - this.padding.top - this.padding.bottom;

    // Fold phases into range [-0.5, 0.5] centered at transit minimum
    const points = [];
    for (let i = 0; i < time.length; i++) {
      let phase = (time[i] % period) / period;
      if (phase > 0.5) phase -= 1.0;
      points.push({ phase, flux: flux[i] });
    }
    points.sort((a, b) => a.phase - b.phase);

    const fMin = Math.min(...points.map(p => p.flux));
    const fMax = Math.max(...points.map(p => p.flux));
    const pad = Math.max(0.002, (fMax - fMin) * 0.15);
    const minF = Math.max(0.85, fMin - pad);
    const maxF = Math.min(1.15, fMax + pad);

    const phaseToX = ph => plotX + ((ph + 0.5) / 1.0) * plotW;
    const fluxToY = f => plotY + (1 - (f - minF) / (maxF - minF)) * plotH;

    // Grid & labels
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#8b9bb4';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';

    for (let ph = -0.5; ph <= 0.51; ph += 0.25) {
      const x = phaseToX(ph);
      ctx.beginPath();
      ctx.moveTo(x, plotY);
      ctx.lineTo(x, plotY + plotH);
      ctx.stroke();
      ctx.fillText(ph.toFixed(2), x, plotY + plotH + 8);
    }

    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const fVal = minF + (i / 4) * (maxF - minF);
      const y = fluxToY(fVal);
      ctx.beginPath();
      ctx.moveTo(plotX, y);
      ctx.lineTo(plotX + plotW, y);
      ctx.stroke();
      ctx.fillText(fVal.toFixed(4), plotX - 8, y + 3);
    }

    // Draw phase-folded points
    ctx.fillStyle = 'rgba(96, 165, 250, 0.45)';
    for (const p of points) {
      const x = phaseToX(p.phase);
      const y = fluxToY(p.flux);
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Binned average curve (reveals clean transit U-profile)
    const numBins = 40;
    const bins = Array.from({ length: numBins }, () => []);
    for (const p of points) {
      const bIdx = Math.min(numBins - 1, Math.floor((p.phase + 0.5) * numBins));
      bins[bIdx].push(p.flux);
    }

    ctx.strokeStyle = '#00F2FE';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let binStarted = false;
    for (let i = 0; i < numBins; i++) {
      if (bins[i].length === 0) continue;
      const ph = -0.5 + (i + 0.5) / numBins;
      const avgF = bins[i].reduce((s, v) => s + v, 0) / bins[i].length;
      const x = phaseToX(ph);
      const y = fluxToY(avgF);
      if (!binStarted) {
        ctx.moveTo(x, y);
        binStarted = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Axis titles
    ctx.fillStyle = '#64748b';
    ctx.font = '11px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Orbital Phase (Folded at P = ${period.toFixed(4)} days)`, plotX + plotW / 2, h - 8);
  }
}

/**
 * BLS Periodogram Chart (Period vs Detection Power)
 */
export class PeriodogramChart {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.padding = { top: 25, right: 25, bottom: 40, left: 55 };
    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
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

  render(spectrum = [], bestPeriod = 0, bestPower = 0) {
    if (!this.width || !this.height) this.resize();
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, w, h);

    if (!spectrum || spectrum.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BLS Periodogram Generated Post-Analysis', w / 2, h / 2);
      return;
    }

    const plotX = this.padding.left;
    const plotY = this.padding.top;
    const plotW = w - this.padding.left - this.padding.right;
    const plotH = h - this.padding.top - this.padding.bottom;

    const minP = spectrum[0].period;
    const maxP = spectrum[spectrum.length - 1].period;
    const maxPower = Math.max(10, Math.max(...spectrum.map(s => s.power)) * 1.15);

    const pToX = p => plotX + ((p - minP) / (maxP - minP)) * plotW;
    const pToY = pow => plotY + (1 - pow / maxPower) * plotH;

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#8b9bb4';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';

    for (let p = Math.ceil(minP); p <= maxP; p++) {
      const x = pToX(p);
      ctx.beginPath();
      ctx.moveTo(x, plotY);
      ctx.lineTo(x, plotY + plotH);
      ctx.stroke();
      ctx.fillText(p + 'd', x, plotY + plotH + 8);
    }

    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const powVal = (i / 4) * maxPower;
      const y = pToY(powVal);
      ctx.beginPath();
      ctx.moveTo(plotX, y);
      ctx.lineTo(plotX + plotW, y);
      ctx.stroke();
      ctx.fillText(powVal.toFixed(0), plotX - 8, y + 3);
    }

    // Spectrum Area & Line
    const grad = ctx.createLinearGradient(0, plotY, 0, plotY + plotH);
    grad.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
    grad.addColorStop(1, 'rgba(168, 85, 247, 0.02)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(pToX(spectrum[0].period), plotY + plotH);
    for (const pt of spectrum) {
      ctx.lineTo(pToX(pt.period), pToY(pt.power));
    }
    ctx.lineTo(pToX(spectrum[spectrum.length - 1].period), plotY + plotH);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pToX(spectrum[0].period), pToY(spectrum[0].power));
    for (const pt of spectrum) {
      ctx.lineTo(pToX(pt.period), pToY(pt.power));
    }
    ctx.stroke();

    // Mark peak detection
    if (bestPeriod > 0) {
      const peakX = pToX(bestPeriod);
      const peakY = pToY(bestPower);

      ctx.strokeStyle = '#00F2FE';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(peakX, plotY);
      ctx.lineTo(peakX, plotY + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#00F2FE';
      ctx.beginPath();
      ctx.arc(peakX, peakY, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '11px "Space Grotesk", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Peak: ${bestPeriod.toFixed(3)} d`, peakX + 8, peakY - 6);
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '11px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Candidate Orbital Period (Days) - BLS Power Spectrum', plotX + plotW / 2, h - 8);
  }
}
