/**
 * Exoplanet Hunter AI - Main Application Controller
 * Connects Ingestion, Preprocessing, Feature Extraction, ML Classifiers, and Visualizers.
 */

import confetti from 'canvas-confetti';
import {
  PRESET_TARGETS,
  generateTransitLightCurve,
  parseCSVLightCurve
} from './datasets.js';
import { runPreprocessingPipeline } from './preprocessing.js';
import { extractTransitFeatures } from './feature-extraction.js';
import {
  defaultClassifier,
  svmClassifier,
  neuralNetClassifier,
  getTrainingBenchmark
} from './ml-engine.js';
import {
  LightCurveChart,
  PhaseFoldedChart,
  PeriodogramChart
} from './charts.js';
import { TransitSimulator } from './transit-simulator.js';

// Application State
const state = {
  currentTarget: null,
  rawTime: [],
  rawFlux: [],
  rawFluxErr: [],
  processedTime: [],
  processedFlux: [],
  features: null,
  prediction: null,
  activeAlgorithm: 'rf', // 'rf', 'svm', 'mlp'
  activeTab: 'lightcurve',
  charts: {
    lightCurve: null,
    foldedCurve: null,
    periodogram: null
  },
  simulator: null
};

// DOM Elements
const selectPresetTarget = document.getElementById('selectPresetTarget');
const inputCsvFile = document.getElementById('inputCsvFile');
const targetTypePill = document.getElementById('targetTypePill');
const specTargetId = document.getElementById('specTargetId');
const specMission = document.getElementById('specMission');
const specStarRadius = document.getElementById('specStarRadius');
const specDataPoints = document.getElementById('specDataPoints');

const checkSigmaClipping = document.getElementById('checkSigmaClipping');
const rangeSigma = document.getElementById('rangeSigma');
const sigmaValText = document.getElementById('sigmaValText');
const checkNormalize = document.getElementById('checkNormalize');
const checkDetrend = document.getElementById('checkDetrend');
const checkSmooth = document.getElementById('checkSmooth');
const preprocStatus = document.getElementById('preprocStatus');
const btnApplyPreprocessing = document.getElementById('btnApplyPreprocessing');

const selectMLAlgorithm = document.getElementById('selectMLAlgorithm');
const rangeThreshold = document.getElementById('rangeThreshold');
const threshValText = document.getElementById('threshValText');
const headerActiveModel = document.getElementById('headerActiveModel');
const bannerAlgoLabel = document.getElementById('bannerAlgoLabel');

const predictionBanner = document.getElementById('predictionBanner');
const predictionBadge = document.getElementById('predictionBadge');
const predictionBadgeText = document.getElementById('predictionBadgeText');
const predictionTargetLabel = document.getElementById('predictionTargetLabel');
const predictionHeadline = document.getElementById('predictionHeadline');
const predictionDescription = document.getElementById('predictionDescription');
const predictionReasonList = document.getElementById('predictionReasonList');
const circleProgress = document.getElementById('circleProgress');
const confidenceValueText = document.getElementById('confidenceValueText');
const rankingScoreText = document.getElementById('rankingScoreText');

const featTransitDepth = document.getElementById('featTransitDepth');
const featTransitDuration = document.getElementById('featTransitDuration');
const featTransitPeriod = document.getElementById('featTransitPeriod');
const featSnr = document.getElementById('featSnr');
const featDipCount = document.getElementById('featDipCount');
const featMeanMinFlux = document.getElementById('featMeanMinFlux');
const featShapeFactor = document.getElementById('featShapeFactor');
const featPlanetRadius = document.getElementById('featPlanetRadius');

const btnToggleSimPlay = document.getElementById('btnToggleSimPlay');
const btnResetSimPhase = document.getElementById('btnResetSimPhase');
const rangeSimScrub = document.getElementById('rangeSimScrub');
const selectSimSpeed = document.getElementById('selectSimSpeed');

const btnZoomIn = document.getElementById('btnZoomIn');
const btnResetZoom = document.getElementById('btnResetZoom');
const btnRunFullPipeline = document.getElementById('btnRunFullPipeline');

const modalProposal = document.getElementById('modalProposal');
const btnOpenProposal = document.getElementById('btnOpenProposal');
const btnCloseProposal = document.getElementById('btnCloseProposal');

const modalSandbox = document.getElementById('modalSandbox');
const btnOpenModelSandbox = document.getElementById('btnOpenModelSandbox');
const btnCloseSandbox = document.getElementById('btnCloseSandbox');
const btnRetrainModel = document.getElementById('btnRetrainModel');

const modalSynthetic = document.getElementById('modalSynthetic');
const btnOpenSyntheticStudio = document.getElementById('btnOpenSyntheticStudio');
const btnCloseSynthetic = document.getElementById('btnCloseSynthetic');
const btnInjectSynthetic = document.getElementById('btnInjectSynthetic');

const synthPeriodRange = document.getElementById('synthPeriodRange');
const synthPeriodVal = document.getElementById('synthPeriodVal');
const synthDepthRange = document.getElementById('synthDepthRange');
const synthDepthVal = document.getElementById('synthDepthVal');
const synthDurationRange = document.getElementById('synthDurationRange');
const synthDurationVal = document.getElementById('synthDurationVal');
const synthNoiseRange = document.getElementById('synthNoiseRange');
const synthNoiseVal = document.getElementById('synthNoiseVal');

const btnExportReport = document.getElementById('btnExportReport');
const toastContainer = document.getElementById('toastContainer');

// Initialize Application
window.addEventListener('DOMContentLoaded', () => {
  initTargetSelector();
  initCharts();
  initSimulator();
  initEventListeners();
  loadTarget('kepler-10b');
});

// Setup Target Selector Options
function initTargetSelector() {
  selectPresetTarget.innerHTML = '';
  PRESET_TARGETS.forEach(target => {
    const opt = document.createElement('option');
    opt.value = target.id;
    opt.textContent = `${target.name} (${target.mission}) - ${target.type}`;
    selectPresetTarget.appendChild(opt);
  });
}

// Setup Canvas Visualizers
function initCharts() {
  const canvasLC = document.getElementById('canvasLightCurve');
  const canvasFolded = document.getElementById('canvasFoldedCurve');
  const canvasBLS = document.getElementById('canvasPeriodogram');

  state.charts.lightCurve = new LightCurveChart(canvasLC);
  state.charts.foldedCurve = new PhaseFoldedChart(canvasFolded);
  state.charts.periodogram = new PeriodogramChart(canvasBLS);
}

// Setup Physical Planetary Transit Simulator
function initSimulator() {
  const canvasSim = document.getElementById('canvasTransitSim');
  state.simulator = new TransitSimulator(canvasSim, (phase) => {
    rangeSimScrub.value = phase.toFixed(3);
    if (state.charts.lightCurve && state.features) {
      state.charts.lightCurve.setSimTrackerPhase(phase);
    }
  });
}

// Event Listeners
function initEventListeners() {
  // Preset selector
  selectPresetTarget.addEventListener('change', (e) => {
    loadTarget(e.target.value);
  });

  // Sliders
  rangeSigma.addEventListener('input', (e) => {
    sigmaValText.textContent = `${e.target.value}σ`;
  });

  rangeThreshold.addEventListener('input', (e) => {
    threshValText.textContent = `${e.target.value}%`;
    runClassification();
  });

  // Preprocessing triggers
  btnApplyPreprocessing.addEventListener('click', () => {
    runPreprocessing();
    runExtractionAndClassification();
    showToast('Applied preprocessing signal filters.');
  });

  // Algorithm selector
  selectMLAlgorithm.addEventListener('change', (e) => {
    state.activeAlgorithm = e.target.value;
    const names = {
      rf: 'Random Forest (Weka)',
      svm: 'Support Vector Machine',
      mlp: 'Neural Network (MLP)'
    };
    headerActiveModel.textContent = names[state.activeAlgorithm];
    bannerAlgoLabel.textContent = names[state.activeAlgorithm];
    runClassification();
    showToast(`Switched classifier to ${names[state.activeAlgorithm]}`);
  });

  // Run Full Pipeline
  btnRunFullPipeline.addEventListener('click', () => {
    runFullPipeline();
    showToast('Executed end-to-end detection pipeline.');
  });

  // Chart Tabs
  document.querySelectorAll('.chart-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      state.activeTab = tab;

      document.getElementById('wrapLightCurve').style.display = tab === 'lightcurve' ? 'block' : 'none';
      document.getElementById('wrapFoldedCurve').style.display = tab === 'folded' ? 'block' : 'none';
      document.getElementById('wrapPeriodogram').style.display = tab === 'periodogram' ? 'block' : 'none';

      // Trigger resize & render
      if (tab === 'lightcurve') state.charts.lightCurve.resize();
      if (tab === 'folded') {
        state.charts.foldedCurve.resize();
        if (state.features) {
          state.charts.foldedCurve.render(state.processedTime, state.processedFlux, state.features.transitPeriod);
        }
      }
      if (tab === 'periodogram') {
        state.charts.periodogram.resize();
        if (state.features) {
          state.charts.periodogram.render(state.features.blsSpectrum, state.features.transitPeriod, state.features.blsPower);
        }
      }
    });
  });

  // Chart Zoom controls
  btnZoomIn.addEventListener('click', () => state.charts.lightCurve.zoomIn());
  btnResetZoom.addEventListener('click', () => state.charts.lightCurve.resetZoom());

  // Simulator controls
  btnToggleSimPlay.addEventListener('click', () => {
    const isPlaying = state.simulator.togglePlay();
    btnToggleSimPlay.innerHTML = isPlaying
      ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> Pause`
      : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Play`;
  });

  btnResetSimPhase.addEventListener('click', () => {
    state.simulator.setPhase(0);
    rangeSimScrub.value = '0';
  });

  rangeSimScrub.addEventListener('input', (e) => {
    state.simulator.setPhase(parseFloat(e.target.value));
  });

  selectSimSpeed.addEventListener('change', (e) => {
    state.simulator.speed = parseFloat(e.target.value);
  });

  // Stepper Bar navigation
  document.querySelectorAll('.pipeline-step').forEach(step => {
    step.addEventListener('click', () => {
      document.querySelectorAll('.pipeline-step').forEach(s => s.classList.remove('active'));
      step.classList.add('active');
      const stepNum = step.dataset.step;
      if (stepNum === '1') document.getElementById('cardDataInput').scrollIntoView({ behavior: 'smooth' });
      if (stepNum === '2') document.getElementById('cardPreprocessing').scrollIntoView({ behavior: 'smooth' });
      if (stepNum === '3' || stepNum === '4') document.getElementById('cardMLClassifier').scrollIntoView({ behavior: 'smooth' });
      if (stepNum === '5') document.getElementById('canvasTransitSim').scrollIntoView({ behavior: 'smooth' });
    });
  });

  // CSV File Upload
  inputCsvFile.addEventListener('change', handleFileUpload);

  // Proposal Modal
  btnOpenProposal.addEventListener('click', () => modalProposal.classList.add('open'));
  btnCloseProposal.addEventListener('click', () => modalProposal.classList.remove('open'));

  // Model Sandbox Modal
  btnOpenModelSandbox.addEventListener('click', () => {
    updateSandboxMetrics();
    modalSandbox.classList.add('open');
  });
  btnCloseSandbox.addEventListener('click', () => modalSandbox.classList.remove('open'));

  btnRetrainModel.addEventListener('click', () => {
    const metrics = defaultClassifier.train(getTrainingBenchmark());
    updateSandboxMetrics(metrics);
    showToast(`Model retrained! Accuracy: ${metrics.accuracy}% (F1: ${metrics.f1Score}%)`);
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
  });

  // Synthetic Studio Modal
  btnOpenSyntheticStudio.addEventListener('click', () => modalSynthetic.classList.add('open'));
  btnCloseSynthetic.addEventListener('click', () => modalSynthetic.classList.remove('open'));

  synthPeriodRange.addEventListener('input', (e) => synthPeriodVal.textContent = `${e.target.value} d`);
  synthDepthRange.addEventListener('input', (e) => synthDepthVal.textContent = `${e.target.value}%`);
  synthDurationRange.addEventListener('input', (e) => synthDurationVal.textContent = `${e.target.value} hrs`);
  synthNoiseRange.addEventListener('input', (e) => synthNoiseVal.textContent = `${e.target.value}%`);

  btnInjectSynthetic.addEventListener('click', () => {
    const period = parseFloat(synthPeriodRange.value);
    const depthPercent = parseFloat(synthDepthRange.value);
    const duration = parseFloat(synthDurationRange.value);
    const noise = parseFloat(synthNoiseRange.value) / 100;

    const synthTarget = generateTransitLightCurve({
      id: 'synth-custom-' + Date.now(),
      name: `Synthetic KOI (P=${period}d)`,
      mission: 'Synthetic Generator',
      targetId: 'SYNTH_' + Math.floor(Math.random() * 89999 + 10000),
      sector: 'Simulated',
      period,
      transitDepth: depthPercent / 100,
      durationHours: duration,
      noiseLevel: noise,
      stellarVariability: 0.0002,
      hasTransit: true,
      description: `Synthetically injected Kepler-like planetary transit system.`
    });

    synthTarget.starRadius = 1.0;
    state.currentTarget = synthTarget;
    state.rawTime = [...synthTarget.time];
    state.rawFlux = [...synthTarget.rawFlux];
    state.rawFluxErr = [...synthTarget.fluxErr];

    modalSynthetic.classList.remove('open');
    updateTargetSpecs(synthTarget);
    runFullPipeline();
    showToast('Synthetic transit signal successfully injected.');
  });

  // Export Report
  btnExportReport.addEventListener('click', generateScientificReport);

  // Close modals on background click
  window.addEventListener('click', (e) => {
    if (e.target === modalProposal) modalProposal.classList.remove('open');
    if (e.target === modalSandbox) modalSandbox.classList.remove('open');
    if (e.target === modalSynthetic) modalSynthetic.classList.remove('open');
  });
}

// Load Target Light Curve
export function loadTarget(targetId) {
  const target = PRESET_TARGETS.find(t => t.id === targetId) || PRESET_TARGETS[0];
  state.currentTarget = target;

  const dataset = generateTransitLightCurve({
    id: target.id,
    name: target.name,
    mission: target.mission,
    targetId: target.targetId,
    sector: target.sector,
    period: target.period,
    transitDepth: target.transitDepth,
    durationHours: target.durationHours,
    noiseLevel: target.noiseLevel,
    stellarVariability: target.stellarVariability,
    hasTransit: target.hasTransit,
    isBinary: target.isBinary || false,
    isStellarNoise: target.isStellarNoise || false,
    description: target.description
  });

  state.rawTime = [...dataset.time];
  state.rawFlux = [...dataset.rawFlux];
  state.rawFluxErr = [...dataset.fluxErr];

  updateTargetSpecs(target);
  runFullPipeline();
}

// Update Target Spec Card
function updateTargetSpecs(target) {
  targetTypePill.textContent = target.mission;
  targetTypePill.className = `status-pill ${target.badgeClass || ''}`;
  specTargetId.textContent = target.targetId || 'N/A';
  specMission.textContent = `${target.mission} ${target.sector || ''}`;
  specStarRadius.textContent = target.starRadius ? `${target.starRadius} R☉` : '1.0 R☉';
  specDataPoints.textContent = `${state.rawTime.length} pts`;
}

// Run Preprocessing
function runPreprocessing() {
  const options = {
    sigmaClipping: checkSigmaClipping.checked,
    sigmaThreshold: parseFloat(rangeSigma.value),
    normalize: checkNormalize.checked,
    detrend: checkDetrend.checked,
    smooth: checkSmooth.checked
  };

  const result = runPreprocessingPipeline(state.rawTime, state.rawFlux, options);
  state.processedTime = result.time;
  state.processedFlux = result.flux;

  preprocStatus.textContent = `Cleaned (${result.stats.outliersRemoved} clipped)`;
}

// Run Feature Extraction & Classification
function runExtractionAndClassification() {
  // Feature extraction
  const metadata = {
    starRadius: state.currentTarget?.starRadius || 1.0
  };
  state.features = extractTransitFeatures(state.processedTime, state.processedFlux, metadata);

  // Update table
  featTransitDepth.textContent = `${state.features.transitDepth.toFixed(5)} (${state.features.transitDepthPercent}%)`;
  featTransitDuration.textContent = `${state.features.transitDurationHours} hrs`;
  featTransitPeriod.textContent = `${state.features.transitPeriod} days`;
  featSnr.textContent = state.features.snr.toFixed(1);
  featDipCount.textContent = `${state.features.numberOfDips} dips`;
  featMeanMinFlux.textContent = `${state.features.meanFlux.toFixed(4)} / ${state.features.minFlux.toFixed(4)}`;
  featShapeFactor.textContent = `${state.features.uShapeScore.toFixed(2)} (${state.features.uShapeScore >= 0.45 ? 'U-Shape' : 'V-Shape'})`;
  featPlanetRadius.textContent = `${state.features.planetRadiusEarth} R⊕ (${state.features.planetRadiusJupiter} Rⱼ)`;

  // Update simulator parameters
  state.simulator.setParams({
    planetRadius: state.features.planetRadiusEarth,
    starRadius: metadata.starRadius,
    transitDepth: state.features.transitDepth,
    hasTransit: state.features.detectedRegionsCount > 0 && state.features.transitDepth > 0.0003,
    speed: state.features.transitPeriod ? Math.max(0.04, Math.min(0.2, 0.15 / state.features.transitPeriod)) : 0.08
  });

  // Run classification
  runClassification();

  // Render active charts
  state.charts.lightCurve.setData(
    state.processedTime,
    state.processedFlux,
    state.features.transitRegions,
    state.features.transitPeriod
  );

  state.charts.foldedCurve.render(state.processedTime, state.processedFlux, state.features.transitPeriod);
  state.charts.periodogram.render(state.features.blsSpectrum, state.features.transitPeriod, state.features.blsPower);
}

// Run ML Classification
function runClassification() {
  if (!state.features) return;

  const threshold = parseFloat(rangeThreshold.value) / 100;
  const inputFeatures = {
    depth: state.features.transitDepth,
    duration: state.features.transitDurationHours,
    snr: state.features.snr,
    dips: state.features.numberOfDips,
    period: state.features.transitPeriod,
    uShape: state.features.uShapeScore,
    variance: parseFloat(state.features.fluxVariance)
  };

  let modelResult;
  if (state.activeAlgorithm === 'rf') {
    modelResult = defaultClassifier.predict(inputFeatures);
  } else if (state.activeAlgorithm === 'svm') {
    modelResult = svmClassifier.predict(inputFeatures);
  } else {
    modelResult = neuralNetClassifier.predict(inputFeatures);
  }

  // Adjust for user threshold
  const isCandidate = modelResult.rawScore >= threshold;
  state.prediction = {
    ...modelResult,
    isCandidate,
    threshold
  };

  // Update UI Banner
  predictionTargetLabel.textContent = `Target: ${state.currentTarget?.name || 'Custom Target'}`;

  if (isCandidate) {
    predictionBanner.className = 'prediction-banner candidate';
    predictionBadge.className = 'prediction-badge badge-candidate';
    predictionBadgeText.textContent = 'TRANSIT CANDIDATE';
    predictionHeadline.textContent = 'Confirmed Exoplanetary Transit Signal Detected';
    predictionDescription.textContent =
      `Periodic U-shaped flux attenuation detected with SNR of ${state.features.snr.toFixed(1)}. Profile strongly matches occultation by an orbiting exoplanetary body.`;
    circleProgress.style.stroke = 'var(--status-confirmed)';
    rankingScoreText.textContent = `Candidate Ranking: #1 [Tier-A]`;
    rankingScoreText.style.color = 'var(--status-confirmed)';

    // Trigger celebration confetti
    confetti({
      particleCount: 45,
      spread: 60,
      origin: { y: 0.6 }
    });
  } else {
    predictionBanner.className = 'prediction-banner non-candidate';
    predictionBadge.className = 'prediction-badge badge-noncandidate';
    predictionBadgeText.textContent = 'NON-TRANSIT / FALSE POSITIVE';
    predictionHeadline.textContent = 'Transit Signature Not Detected / Disqualified';
    predictionDescription.textContent =
      `Signal characteristics fail planetary occultation criteria. Profile indicates either eclipsing stellar binary, solar flare variability, or instrumental noise floor.`;
    circleProgress.style.stroke = 'var(--status-rejected)';
    rankingScoreText.textContent = `Candidate Ranking: Disqualified`;
    rankingScoreText.style.color = 'var(--status-rejected)';
  }

  // Animated circle progress
  const conf = modelResult.confidencePercent;
  confidenceValueText.textContent = `${conf.toFixed(1)}%`;
  const circumference = 2 * Math.PI * 30; // ~188.5
  const offset = circumference - (conf / 100) * circumference;
  circleProgress.style.strokeDasharray = `${circumference}`;
  circleProgress.style.strokeDashoffset = `${offset}`;

  // Explainability tags
  predictionReasonList.innerHTML = '';
  modelResult.reasons.forEach(r => {
    const tag = document.createElement('span');
    tag.className = 'reason-tag';
    tag.textContent = r;
    predictionReasonList.appendChild(tag);
  });
}

// Full Pipeline Execution
export function runFullPipeline() {
  runPreprocessing();
  runExtractionAndClassification();
}

// File Upload Handler
function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const text = event.target.result;
      const parsed = parseCSVLightCurve(text, file.name);

      state.currentTarget = parsed;
      state.rawTime = [...parsed.time];
      state.rawFlux = [...parsed.rawFlux];
      state.rawFluxErr = [...parsed.fluxErr];

      updateTargetSpecs(parsed);
      runFullPipeline();
      showToast(`Loaded "${file.name}" with ${parsed.time.length} points.`);
    } catch (err) {
      showToast(`Error parsing file: ${err.message}`, true);
    }
  };
  reader.readAsText(file);
}

// Update Sandbox Metrics
function updateSandboxMetrics(customMetrics = null) {
  const metrics = customMetrics || defaultClassifier.evaluate(getTrainingBenchmark());

  document.getElementById('metricAccuracy').textContent = `${metrics.accuracy}%`;
  document.getElementById('metricPrecision').textContent = `${metrics.precision}%`;
  document.getElementById('metricRecall').textContent = `${metrics.recall}%`;
  document.getElementById('metricF1').textContent = `${metrics.f1Score}%`;

  document.getElementById('cellTP').textContent = `${metrics.confusionMatrix.tp} (TP)`;
  document.getElementById('cellFP').textContent = `${metrics.confusionMatrix.fp} (FP)`;
  document.getElementById('cellFN').textContent = `${metrics.confusionMatrix.fn} (FN)`;
  document.getElementById('cellTN').textContent = `${metrics.confusionMatrix.tn} (TN)`;
}

// Generate Scientific Analysis Report
function generateScientificReport() {
  if (!state.features || !state.prediction) {
    showToast('Run analysis first to generate report.', true);
    return;
  }

  const reportWindow = window.open('', '_blank');
  if (!reportWindow) {
    showToast('Popup blocker prevented opening report window.', true);
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Exoplanet Transit Detection Report - ${state.currentTarget?.name}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; max-width: 850px; margin: 0 auto; line-height: 1.6; }
        h1 { color: #0284c7; border-bottom: 2px solid #0284c7; padding-bottom: 8px; }
        .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { text-align: left; padding: 10px; border-bottom: 1px solid #e2e8f0; }
        th { background: #f1f5f9; }
        .verdict-badge { display: inline-block; padding: 6px 14px; font-weight: bold; border-radius: 20px; color: white; background: ${state.prediction.isCandidate ? '#16a34a' : '#dc2626'}; }
        .print-btn { background: #0284c7; color: white; border: none; padding: 10px 18px; border-radius: 6px; font-size: 14px; cursor: pointer; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
      <h1>NASA Kepler / TESS Exoplanet Transit Analysis Report</h1>
      <p>Generated by <strong>Exoplanet Hunter AI</strong> (Project by Srinath J K, Vijay Kumar N, Kavish A P)</p>

      <div class="meta-box">
        <h3>Target Identification</h3>
        <p><strong>Target Name:</strong> ${state.currentTarget?.name}</p>
        <p><strong>Catalog ID:</strong> ${state.currentTarget?.targetId}</p>
        <p><strong>Mission / Sector:</strong> ${state.currentTarget?.mission} ${state.currentTarget?.sector || ''}</p>
        <p><strong>Total Observational Points:</strong> ${state.processedTime.length}</p>
      </div>

      <div class="meta-box">
        <h3>Machine Learning Classification</h3>
        <p><strong>Algorithm:</strong> ${state.prediction.algorithm}</p>
        <p><strong>Verdict:</strong> <span class="verdict-badge">${state.prediction.isCandidate ? 'TRANSIT CANDIDATE (CONFIRMED EXOPLANET)' : 'NON-TRANSIT / FALSE POSITIVE'}</span></p>
        <p><strong>Model Confidence:</strong> ${state.prediction.confidencePercent}%</p>
        <p><strong>Diagnostic Reasons:</strong> ${state.prediction.reasons.join('; ')}</p>
      </div>

      <h3>Extracted Transit Parameters</h3>
      <table>
        <tr><th>Feature Parameter</th><th>Value</th><th>Unit / Definition</th></tr>
        <tr><td>Transit Depth (δ)</td><td>${state.features.transitDepth} (${state.features.transitDepthPercent}%)</td><td>Stellar attenuation ratio</td></tr>
        <tr><td>Orbital Period (P)</td><td>${state.features.transitPeriod}</td><td>Days (via BLS Periodogram)</td></tr>
        <tr><td>Transit Duration</td><td>${state.features.transitDurationHours}</td><td>Hours</td></tr>
        <tr><td>Signal-to-Noise Ratio (SNR)</td><td>${state.features.snr}</td><td>Statistical significance</td></tr>
        <tr><td>Transit Dips Count</td><td>${state.features.numberOfDips}</td><td>Events in observational window</td></tr>
        <tr><td>U-Shape Profile Score</td><td>${state.features.uShapeScore}</td><td>0 = V-shape binary, 1 = U-shape planet</td></tr>
        <tr><td>Estimated Planetary Radius</td><td>${state.features.planetRadiusEarth} R⊕ (${state.features.planetRadiusJupiter} Rⱼ)</td><td>Derived from stellar radius</td></tr>
      </table>

      <footer style="margin-top: 50px; font-size: 12px; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 10px;">
        Exoplanet Hunter AI System • Automated Transit Detection Pipeline
      </footer>
    </body>
    </html>
  `;

  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();
}

// Toast notification helper
function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  if (isError) {
    toast.style.borderColor = 'var(--status-rejected)';
    toast.innerHTML = `<span style="color: var(--status-rejected); font-weight: bold;">⚠</span> ${message}`;
  } else {
    toast.innerHTML = `<span style="color: var(--brand-solar); font-weight: bold;">●</span> ${message}`;
  }
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.2s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}
