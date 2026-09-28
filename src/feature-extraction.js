/**
 * Exoplanet Hunter - Feature Extraction & BLS Periodogram
 * Extracts astronomical transit parameters required by ML classifiers as described in Slide 5 & Slide 7.
 */

export function extractTransitFeatures(time, flux, targetMetadata = {}) {
  if (!time || !flux || time.length < 10) {
    throw new Error('Insufficient data points for feature extraction.');
  }

  const n = flux.length;
  const meanFlux = flux.reduce((a, b) => a + b, 0) / n;
  const fluxVariance = flux.reduce((a, b) => a + Math.pow(b - meanFlux, 2), 0) / n;
  const fluxStdDev = Math.sqrt(fluxVariance);
  const minFlux = Math.min(...flux);

  // 1. Identify Local Dips below baseline (at least 2.5 sigma below mean)
  const dipThreshold = meanFlux - Math.max(0.0006, 2.5 * fluxStdDev);
  const dipIndices = [];
  const inDip = false;
  const transitRegions = [];

  let currentRegion = null;
  for (let i = 0; i < n; i++) {
    if (flux[i] < dipThreshold) {
      if (!currentRegion) {
        currentRegion = { startIndex: i, endIndex: i, minFlux: flux[i], minIndex: i };
      } else {
        currentRegion.endIndex = i;
        if (flux[i] < currentRegion.minFlux) {
          currentRegion.minFlux = flux[i];
          currentRegion.minIndex = i;
        }
      }
    } else {
      if (currentRegion) {
        // Ensure dip spans at least 2 points to avoid single noise spikes
        if (currentRegion.endIndex - currentRegion.startIndex >= 1) {
          transitRegions.push(currentRegion);
        }
        currentRegion = null;
      }
    }
  }
  if (currentRegion && currentRegion.endIndex - currentRegion.startIndex >= 1) {
    transitRegions.push(currentRegion);
  }

  // Calculate Transit Depth
  let transitDepth = 0;
  let transitDurationHours = 0;
  let uShapeScore = 0.5; // 0 = sharp V shape (binary), 1 = flat-bottom U shape (planetary transit)

  if (transitRegions.length > 0) {
    // Average depth across detected dips
    const depths = transitRegions.map(r => meanFlux - r.minFlux);
    transitDepth = depths.reduce((a, b) => a + b, 0) / depths.length;

    // Average duration in hours
    const durations = transitRegions.map(r => {
      const dt = time[r.endIndex] - time[r.startIndex];
      return Math.max(0.5, dt * 24); // at least 30 mins
    });
    transitDurationHours = durations.reduce((a, b) => a + b, 0) / durations.length;

    // Analyze dip profile (U-shape vs V-shape flatness at minimum)
    let totalFlatness = 0;
    for (const region of transitRegions) {
      const regionFlux = flux.slice(region.startIndex, region.endIndex + 1);
      if (regionFlux.length >= 4) {
        const bottomQuarter = region.minFlux + transitDepth * 0.25;
        const bottomPoints = regionFlux.filter(f => f <= bottomQuarter).length;
        const ratio = bottomPoints / regionFlux.length;
        totalFlatness += Math.min(1.0, ratio * 2);
      } else {
        totalFlatness += 0.5;
      }
    }
    uShapeScore = totalFlatness / transitRegions.length;
  } else {
    // If no prominent dips below threshold, estimate from minimum deviation
    transitDepth = Math.max(0, meanFlux - minFlux);
    transitDurationHours = 0;
    uShapeScore = 0.2;
  }

  // 2. BLS (Box Least Squares) Period Search
  const blsResult = runBLSPeriodogram(time, flux, {
    minPeriod: 0.5,
    maxPeriod: Math.min(6.0, (time[time.length - 1] - time[0]) / 2),
    steps: 120
  });

  const transitPeriod = blsResult.bestPeriod;
  const blsPower = blsResult.bestPower;

  // 3. Signal-to-Noise Ratio (SNR)
  const snr = fluxStdDev > 0 ? transitDepth / fluxStdDev : 0;

  // 4. Transit Dip Count (approximate expected dips = timeRange / period)
  const timeSpan = time[time.length - 1] - time[0];
  const expectedDips = transitPeriod > 0 ? Math.round(timeSpan / transitPeriod) : transitRegions.length;
  const numberOfDips = Math.max(transitRegions.length, expectedDips);

  // 5. Estimated Physical Exoplanet Radius (R_planet = R_star * sqrt(depth))
  const starRadiusSolar = targetMetadata.starRadius || 1.0;
  // 1 Solar Radius = 109.2 Earth Radii
  const planetRadiusEarth = Math.sqrt(Math.max(0, transitDepth)) * starRadiusSolar * 109.2;
  // In Jupiter Radii (1 R_jup = 11.2 R_earth)
  const planetRadiusJupiter = planetRadiusEarth / 11.209;

  return {
    transitDepth: +transitDepth.toFixed(6),
    transitDepthPercent: +(transitDepth * 100).toFixed(4),
    transitDepthPpm: Math.round(transitDepth * 1e6),
    transitDurationHours: +transitDurationHours.toFixed(2),
    transitPeriod: +transitPeriod.toFixed(4),
    meanFlux: +meanFlux.toFixed(5),
    minFlux: +minFlux.toFixed(5),
    fluxVariance: +fluxVariance.toExponential(4),
    fluxStdDev: +fluxStdDev.toFixed(6),
    snr: +snr.toFixed(2),
    numberOfDips: numberOfDips,
    detectedRegionsCount: transitRegions.length,
    uShapeScore: +uShapeScore.toFixed(2),
    blsPower: +blsPower.toFixed(2),
    blsSpectrum: blsResult.spectrum,
    planetRadiusEarth: +planetRadiusEarth.toFixed(2),
    planetRadiusJupiter: +planetRadiusJupiter.toFixed(2),
    transitRegions
  };
}

/**
 * Box Least Squares (BLS) periodogram search
 */
function runBLSPeriodogram(time, flux, options = {}) {
  const { minPeriod = 0.5, maxPeriod = 5.0, steps = 100 } = options;
  const spectrum = [];

  let bestPeriod = minPeriod;
  let bestPower = 0;
  const dP = (maxPeriod - minPeriod) / steps;

  for (let p = minPeriod; p <= maxPeriod; p += dP) {
    // Fold time by period p into phase bins [0, 1)
    const numBins = 30;
    const bins = Array.from({ length: numBins }, () => []);

    for (let i = 0; i < time.length; i++) {
      const phase = (time[i] % p) / p;
      const binIdx = Math.min(numBins - 1, Math.floor(phase * numBins));
      bins[binIdx].push(flux[i]);
    }

    // Find bin with lowest mean flux
    let minBinMean = 1.0;
    let baselineMean = 1.0;
    const binMeans = bins.map(b => b.length > 0 ? b.reduce((s, v) => s + v, 0) / b.length : 1.0);

    const minMean = Math.min(...binMeans);
    const overallMean = binMeans.reduce((a, b) => a + b, 0) / binMeans.length;

    // Detection power based on transit depth variance against baseline
    const depth = Math.max(0, overallMean - minMean);
    // Approximate power score
    const power = depth > 0 ? (depth * Math.sqrt(time.length)) / 0.005 : 0;

    spectrum.push({ period: +p.toFixed(3), power: +power.toFixed(2) });

    if (power > bestPower) {
      bestPower = power;
      bestPeriod = p;
    }
  }

  return {
    bestPeriod,
    bestPower,
    spectrum
  };
}
