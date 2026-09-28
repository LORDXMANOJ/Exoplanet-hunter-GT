/**
 * Exoplanet Hunter - Real NASA Kepler/TESS Datasets & Synthetic Generators
 */

// Generate realistic light curves based on transit physics (Mandel & Agol transit model approximation)
export function generateTransitLightCurve({
  id = 'KEPLER-10b',
  name = 'Kepler-10 b',
  mission = 'Kepler',
  targetId = 'KIC 11904151',
  sector = 'Q1-Q4',
  totalDays = 10,
  cadenceMinutes = 30, // Kepler long cadence
  period = 0.8375, // days
  t0 = 0.25, // initial transit time
  transitDepth = 0.00165, // ~165 ppm (0.00165 normalized flux)
  durationHours = 1.8, // hours
  noiseLevel = 0.00035, // Gaussian noise
  stellarVariability = 0.0002, // low frequency stellar oscillation
  hasTransit = true,
  isBinary = false,
  isStellarNoise = false,
  description = 'Confirmed rocky exoplanet orbiting a sun-like star in Draco.'
}) {
  const durationDays = durationHours / 24;
  const numPoints = Math.floor((totalDays * 24 * 60) / cadenceMinutes);
  const time = [];
  const rawFlux = [];
  const fluxErr = [];

  for (let i = 0; i < numPoints; i++) {
    const t = (i * cadenceMinutes) / (60 * 24);
    time.push(t);

    // Baseline normalized flux = 1.0
    let flux = 1.0;

    // Stellar low-frequency baseline variability / spot rotation
    if (stellarVariability > 0) {
      flux += Math.sin(t * 0.85) * stellarVariability * 0.7;
      flux += Math.cos(t * 1.6) * stellarVariability * 0.3;
    }

    if (hasTransit) {
      // Calculate phase relative to period
      const phase = ((t - t0) % period + period) % period;
      const distFromCenter = Math.min(phase, period - phase);

      if (distFromCenter < durationDays / 2) {
        // Limb-darkened transit profile (rounded bottom U-shape)
        const x = distFromCenter / (durationDays / 2); // 0 at center, 1 at edge
        // Limb darkening factor: quadratic limb darkening approximation
        const limbFactor = 1 - 0.2 * (x * x);
        const dip = transitDepth * Math.sqrt(Math.max(0, 1 - x * x * 0.85)) * limbFactor;
        flux -= dip;
      }
    } else if (isBinary) {
      // Eclipsing Binary: primary deep V-shaped eclipse + secondary shallow eclipse
      const phase = ((t - t0) % period + period) % period;
      const dist1 = Math.min(phase, period - phase);
      const dist2 = Math.abs(phase - period / 2);

      // Primary V-shaped eclipse
      if (dist1 < durationDays / 2) {
        const x = dist1 / (durationDays / 2);
        const dip = transitDepth * (1 - x); // V-shape
        flux -= dip;
      }
      // Secondary eclipse at phase 0.5
      if (dist2 < durationDays / 2) {
        const x = dist2 / (durationDays / 2);
        const dip = transitDepth * 0.45 * (1 - x);
        flux -= dip;
      }
    } else if (isStellarNoise) {
      // Flare or active pulsating star (Delta Scuti type)
      flux += Math.sin(t * 7.5) * 0.0035 + Math.cos(t * 12.3) * 0.002;
      // Occasional flare peak
      if (Math.abs(t - 4.2) < 0.25) {
        const flareAge = (t - 4.15);
        if (flareAge > 0) {
          flux += 0.012 * Math.exp(-flareAge * 15);
        }
      }
    }

    // Add random photometric noise
    const noise = (Math.random() - 0.5) * 2 * noiseLevel;
    const finalFlux = flux + noise;

    rawFlux.push(finalFlux);
    fluxErr.push(noiseLevel * 0.85);
  }

  return {
    id,
    name,
    mission,
    targetId,
    sector,
    time,
    rawFlux,
    fluxErr,
    truePeriod: period,
    trueDepth: transitDepth,
    trueDuration: durationHours,
    hasTransit,
    isBinary,
    isStellarNoise,
    description
  };
}

// Pre-packaged catalog of NASA Kepler / TESS and false-positive benchmark targets
export const PRESET_TARGETS = [
  {
    id: 'kepler-10b',
    name: 'Kepler-10 b',
    mission: 'NASA Kepler',
    targetId: 'KIC 11904151',
    sector: 'Quarter 1',
    type: 'Confirmed Exoplanet (Super-Earth)',
    badgeClass: 'badge-exoplanet',
    period: 0.8375,
    transitDepth: 0.00165,
    durationHours: 1.82,
    noiseLevel: 0.0003,
    stellarVariability: 0.00015,
    hasTransit: true,
    starRadius: 1.06, // Solar radii
    planetRadius: 1.47, // Earth radii
    equilibriumTemp: 1833, // Kelvin
    description: 'First confirmed rocky exoplanet discovered by Kepler. Ultra-short period super-Earth with distinct, sharp periodic transit dips.'
  },
  {
    id: 'kepler-90i',
    name: 'Kepler-90 i',
    mission: 'NASA Kepler',
    targetId: 'KIC 11442793',
    sector: 'Quarter 5-8',
    type: 'Confirmed Exoplanet (Google ML Discovery)',
    badgeClass: 'badge-exoplanet',
    period: 1.445, // Adjusted for 10-day viewing window
    transitDepth: 0.0028,
    durationHours: 2.4,
    noiseLevel: 0.00045,
    stellarVariability: 0.00025,
    hasTransit: true,
    starRadius: 1.2,
    planetRadius: 1.32,
    equilibriumTemp: 709,
    description: 'The 8th planet in the Kepler-90 star system, identified using machine learning neural networks searching weak signals.'
  },
  {
    id: 'toi-700d',
    name: 'TOI-700 d',
    mission: 'NASA TESS',
    targetId: 'TIC 150428135',
    sector: 'Sector 11',
    type: 'Habitable Zone Candidate',
    badgeClass: 'badge-exoplanet',
    period: 2.15, // Window scaled for demonstration
    transitDepth: 0.0042,
    durationHours: 3.1,
    noiseLevel: 0.0005,
    stellarVariability: 0.0002,
    hasTransit: true,
    starRadius: 0.42,
    planetRadius: 1.14,
    equilibriumTemp: 269,
    description: 'First Earth-sized habitable zone planet discovered by NASA TESS. Host star is a quiet M-dwarf in Dorado.'
  },
  {
    id: 'trappist-1e',
    name: 'TRAPPIST-1 e',
    mission: 'NASA TESS & Spitzer',
    targetId: 'TIC 278892590',
    sector: 'Sector 27',
    type: 'Temperate Terrestrial Exoplanet',
    badgeClass: 'badge-exoplanet',
    period: 1.62,
    transitDepth: 0.0055,
    durationHours: 2.2,
    noiseLevel: 0.00055,
    stellarVariability: 0.00018,
    hasTransit: true,
    starRadius: 0.12,
    planetRadius: 0.92,
    equilibriumTemp: 251,
    description: 'One of the most promising potentially habitable Earth-sized worlds, orbiting an ultra-cool red dwarf star with high transit depth.'
  },
  {
    id: 'wasp-12b',
    name: 'WASP-12 b',
    mission: 'NASA TESS / Ground',
    targetId: 'TIC 389444540',
    sector: 'Sector 19',
    type: 'Hot Jupiter (Ultra-Deep Transit)',
    badgeClass: 'badge-hotjupiter',
    period: 1.09,
    transitDepth: 0.0142, // ~1.4% dip
    durationHours: 2.9,
    noiseLevel: 0.0006,
    stellarVariability: 0.0003,
    hasTransit: true,
    starRadius: 1.63,
    planetRadius: 19.3,
    equilibriumTemp: 2500,
    description: 'A tidally disrupted Hot Jupiter with massive transit depth, easily detectable with high signal-to-noise ratio.'
  },
  {
    id: 'koi-123-binary',
    name: 'KOI-123 (Eclipsing Binary)',
    mission: 'NASA Kepler',
    targetId: 'KIC 09840294',
    sector: 'Quarter 3',
    type: 'False Positive (Eclipsing Binary)',
    badgeClass: 'badge-falsepositive',
    period: 2.4,
    transitDepth: 0.038, // 3.8% dip
    durationHours: 4.8,
    noiseLevel: 0.0005,
    stellarVariability: 0.0004,
    hasTransit: false,
    isBinary: true,
    starRadius: 1.1,
    planetRadius: 0,
    equilibriumTemp: 0,
    description: 'Two stars mutually orbiting each other. Shows alternating deep primary and secondary V-shaped dips. A classic false positive.'
  },
  {
    id: 'stellar-flare-target',
    name: 'TIC 4209144 (Active Star / Flares)',
    mission: 'NASA TESS',
    targetId: 'TIC 4209144',
    sector: 'Sector 5',
    type: 'Non-Transit (Stellar Flaring & Pulsations)',
    badgeClass: 'badge-falsepositive',
    period: 3.5,
    transitDepth: 0,
    durationHours: 0,
    noiseLevel: 0.0008,
    stellarVariability: 0.004,
    hasTransit: false,
    isStellarNoise: true,
    starRadius: 0.85,
    planetRadius: 0,
    equilibriumTemp: 0,
    description: 'Strongly active M-dwarf star with magnetic reconnection flares and multi-mode stellar pulsations. No planetary transit signature.'
  },
  {
    id: 'instrumental-noise',
    name: 'KIC 8923019 (Pure Noise Baseline)',
    mission: 'NASA Kepler',
    targetId: 'KIC 8923019',
    sector: 'Quarter 12',
    type: 'Non-Transit (Instrumental Noise Floor)',
    badgeClass: 'badge-falsepositive',
    period: 2.0,
    transitDepth: 0,
    durationHours: 0,
    noiseLevel: 0.0018,
    stellarVariability: 0.0001,
    hasTransit: false,
    starRadius: 1.0,
    planetRadius: 0,
    equilibriumTemp: 0,
    description: 'Quiet star dominated by detector thermal noise and pointing jitter. Zero periodic transit dips detected.'
  }
];

// Parser for user-uploaded CSV / TSV text
export function parseCSVLightCurve(csvText, filename = 'custom_light_curve.csv') {
  const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 5) {
    throw new Error('CSV file contains insufficient data (less than 5 rows).');
  }

  // Detect delimiter
  const firstLine = lines[0];
  const delimiter = firstLine.includes(',') ? ',' : (firstLine.includes('\t') ? '\t' : (firstLine.includes(';') ? ';' : ' '));

  let headerIndex = -1;
  let timeCol = -1;
  let fluxCol = -1;
  let errCol = -1;

  // Check header
  const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (h.includes('time') || h === 't' || h.includes('bjd') || h.includes('date')) timeCol = i;
    if (h.includes('flux') || h === 'f' || h.includes('mag') || h.includes('brightness')) fluxCol = i;
    if (h.includes('err') || h.includes('error') || h.includes('unc')) errCol = i;
  }

  let startRow = 1;
  // If first row was purely numeric, assume no header and default col 0 = time, col 1 = flux
  if (timeCol === -1 || fluxCol === -1) {
    const parts = firstLine.split(delimiter).map(v => parseFloat(v.trim()));
    if (!isNaN(parts[0]) && !isNaN(parts[1])) {
      timeCol = 0;
      fluxCol = 1;
      errCol = parts.length > 2 ? 2 : -1;
      startRow = 0;
    } else {
      throw new Error(`Could not automatically detect 'time' and 'flux' columns in CSV header: ${headers.join(', ')}`);
    }
  }

  const time = [];
  const rawFlux = [];
  const fluxErr = [];

  for (let i = startRow; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(c => c.trim());
    if (cols.length <= Math.max(timeCol, fluxCol)) continue;

    const t = parseFloat(cols[timeCol]);
    const f = parseFloat(cols[fluxCol]);
    const err = errCol !== -1 ? parseFloat(cols[errCol]) : 0.0005;

    if (!isNaN(t) && !isNaN(f)) {
      time.push(t);
      rawFlux.push(f);
      fluxErr.push(isNaN(err) ? 0.0005 : err);
    }
  }

  if (time.length < 10) {
    throw new Error('Not enough valid numeric data points found in CSV file.');
  }

  // Normalize time relative to start (t - t[0])
  const t0 = time[0];
  const relTime = time.map(t => +(t - t0).toFixed(5));

  return {
    id: 'user-upload-' + Date.now(),
    name: filename.replace(/\.[^/.]+$/, ''),
    mission: 'Custom Upload',
    targetId: 'USER_FILE_' + Math.floor(Math.random() * 89999 + 10000),
    sector: 'Custom',
    time: relTime,
    rawFlux,
    fluxErr,
    truePeriod: null,
    trueDepth: null,
    trueDuration: null,
    hasTransit: null,
    description: `User-provided dataset with ${time.length} observational points.`
  };
}
