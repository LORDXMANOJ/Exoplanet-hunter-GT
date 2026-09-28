/**
 * Exoplanet Hunter - Data Preprocessing Pipeline
 * Handles NaN cleaning, sigma-clipping outlier removal, normalization, and detrending/smoothing.
 */

export function runPreprocessingPipeline(time, rawFlux, options = {}) {
  const {
    removeNaNs = true,
    sigmaClipping = true,
    sigmaThreshold = 3.5, // 3.5 standard deviations
    normalize = true,
    detrend = true,
    detrendWindow = 25, // window size for rolling baseline
    smooth = false,
    smoothWindow = 5
  } = options;

  let cleanTime = [];
  let cleanFlux = [];

  // Step 1: Handle Missing Values / NaNs
  for (let i = 0; i < time.length; i++) {
    const t = time[i];
    const f = rawFlux[i];
    if (t !== null && !isNaN(t) && f !== null && !isNaN(f) && isFinite(t) && isFinite(f)) {
      cleanTime.push(t);
      cleanFlux.push(f);
    }
  }

  // Step 2: Normalization (divide by median to place baseline at 1.0)
  let normFlux = [...cleanFlux];
  if (normalize && normFlux.length > 0) {
    const sorted = [...normFlux].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    if (median > 0) {
      normFlux = normFlux.map(f => f / median);
    }
  }

  // Step 3: Outlier rejection via Sigma-clipping
  // Note: For exoplanet transits, we don't want to clip the negative transit dips,
  // so we apply asymmetrical clipping (clip high positive flares and extreme > 6 sigma spikes, while preserving dips)
  let filteredTime = [];
  let filteredFlux = [];
  let outliersCount = 0;

  if (sigmaClipping) {
    // Calculate mean and standard deviation
    const mean = normFlux.reduce((acc, v) => acc + v, 0) / normFlux.length;
    const variance = normFlux.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / normFlux.length;
    const stdDev = Math.sqrt(variance);

    for (let i = 0; i < normFlux.length; i++) {
      const diff = normFlux[i] - mean;
      // High positive flare spike (> sigmaThreshold * stdDev) or absurdly deep single artifact (> 8 * stdDev)
      if (diff > sigmaThreshold * stdDev || diff < -8 * stdDev) {
        outliersCount++;
      } else {
        filteredTime.push(cleanTime[i]);
        filteredFlux.push(normFlux[i]);
      }
    }
  } else {
    filteredTime = cleanTime;
    filteredFlux = normFlux;
  }

  // Step 4: Detrending (flatten low-frequency stellar drift and instrument ramps)
  let detrendedFlux = [...filteredFlux];
  if (detrend && detrendedFlux.length > detrendWindow * 2) {
    // Rolling median baseline estimator
    const halfWin = Math.floor(detrendWindow / 2);
    const baseline = [];

    for (let i = 0; i < detrendedFlux.length; i++) {
      const start = Math.max(0, i - halfWin);
      const end = Math.min(detrendedFlux.length, i + halfWin + 1);
      const windowSlice = detrendedFlux.slice(start, end).sort((a, b) => a - b);
      // Use 75th percentile of window to estimate out-of-transit stellar baseline
      const pIdx = Math.floor(windowSlice.length * 0.75);
      baseline.push(windowSlice[pIdx]);
    }

    // Divide flux by baseline to detrend
    for (let i = 0; i < detrendedFlux.length; i++) {
      if (baseline[i] > 0) {
        detrendedFlux[i] = detrendedFlux[i] / baseline[i];
      }
    }
  }

  // Step 5: Smoothing (noise reduction)
  let processedFlux = [...detrendedFlux];
  if (smooth && smoothWindow > 1) {
    const halfWin = Math.floor(smoothWindow / 2);
    for (let i = halfWin; i < processedFlux.length - halfWin; i++) {
      let sum = 0;
      for (let j = -halfWin; j <= halfWin; j++) {
        sum += detrendedFlux[i + j];
      }
      processedFlux[i] = sum / (halfWin * 2 + 1);
    }
  }

  // Preprocessing stats
  const meanVal = processedFlux.reduce((a, b) => a + b, 0) / processedFlux.length;
  const varianceVal = processedFlux.reduce((a, b) => a + Math.pow(b - meanVal, 2), 0) / processedFlux.length;
  const stdDevVal = Math.sqrt(varianceVal);

  return {
    time: filteredTime,
    flux: processedFlux,
    stats: {
      initialPoints: rawFlux.length,
      finalPoints: filteredFlux.length,
      outliersRemoved: outliersCount,
      mean: meanVal,
      stdDev: stdDevVal,
      variance: varianceVal
    }
  };
}
