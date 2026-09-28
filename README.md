# 🪐 Exoplanet Hunter AI: ML-Based Transit Detection

> **Machine Learning-Based Exoplanet Transit Detection Using NASA Kepler and TESS Light Curves**  
> An interactive astronomical analysis platform transforming the research proposal in `Exoplanet Hunter GT 2.pdf` into a fully functioning web application.

---

## 👥 Research Team & Authors

- **Srinath J K** – `RA2511051020043`
- **Vijay Kumar N** – `RA2311051020059`
- **Kavish A P** – `RA2511051020028`

---

## 🌌 Project Background & Overview

Astronomical space missions such as **NASA Kepler**, **K2**, and **TESS** generate massive amounts of continuous photometric time series (stellar brightness flux over time). When an exoplanet passes directly between its host star and the observer, it creates a periodic dip in the star's observed light curve (the **Transit Method**):

$$\text{Star } ⭐ \longleftarrow \text{ Planet } ● \longleftarrow \text{ Telescope } 🔭$$

### The Problem
Manually vetting thousands of light curves is:
- **Time-consuming**: Millions of observations must be processed.
- **Noise-sensitive**: Instrumental drifts, stellar pulsations, and flares obscure true signals.
- **Vulnerable to false positives**: Eclipsing binary star systems mimic planetary transits.
- **Difficult to automate** using simple thresholding alone.

### The Solution
**Exoplanet Hunter AI** automates detection and vetting using signal preprocessing, physical transit feature extraction, and machine learning classifiers (Random Forest, SVM, and Neural Networks) paired with an interactive observatory interface and real-time transit simulation.

---

## 🏗️ System Architecture & Workflow

```
[ 1. Data Ingestion ] ➔ [ 2. Preprocessing ] ➔ [ 3. Feature Extraction ] ➔ [ 4. ML Classification ] ➔ [ 5. Visualizer & Simulation ]
       │                         │                       │                         │                          │
  Kepler / TESS             Sigma Clipping        Transit Depth (δ)          Random Forest (Weka)       Light Curve Studio
  Custom CSV / FITS        Detrending Drift        Duration & Period (BLS)   Support Vector Machine     Phase-Folded Curve
  Synthetic Studio         Normalization (F/F0)   SNR & U-Shape Factor       Neural Network (MLP)       Limb-Darkened 2D/3D Sim
```

1. **Data Acquisition**: Real Kepler/TESS targets, custom CSV/FITS upload, and synthetic Mandel & Agol transit models.
2. **Preprocessing**: $3.5\sigma$ asymmetric outlier rejection, baseline normalization ($F/F_{\text{median}} = 1.0$), rolling median stellar detrending, and boxcar smoothing.
3. **Feature Extraction**:
   - **Transit Depth ($\delta$)**: $(\Delta F / F)$ stellar attenuation.
   - **Transit Duration ($T_{\text{dur}}$)**: Chord transit time.
   - **Transit Period ($P$)**: Automated Box Least Squares (BLS) periodogram search.
   - **Signal-to-Noise Ratio (SNR)**: $\delta / \sigma_{\text{flux}}$.
   - **Profile Shape Factor**: Evaluates flat-bottom (U-shape exoplanet) vs. sharp (V-shape binary star).
   - **Physical Radius ($R_\oplus$, $R_J$)**: Derived planet radius based on host star dimensions.
4. **Machine Learning Classifiers**:
   - **Random Forest Ensemble** (15 decision trees with feature importance weighting).
   - **Support Vector Machine (SVM)** (Margin hyperplane classifier).
   - **Deep Neural Network (MLP)** (Multi-layer perceptron with non-linear transit activation).
5. **Visual Observatory & Simulator**:
   - **Light Curve Plot**: Time vs. Flux with zoom/pan and transit dip bounding highlights.
   - **Phase-Folded Plot**: Superimposes all transit events by orbital period $P$ with binned fit curve.
   - **BLS Periodogram**: Candidate orbital period power spectrum with peak detection marker.
   - **Physical Transit Simulator**: Real-time canvas simulation of a limb-darkened host star and orbiting exoplanet silhouette with live flux attenuation readout.
   - **Scientific Report Generator**: Printable/PDF-ready formal transit discovery report.

---

## 🎯 Target Catalog

The application includes pre-packaged benchmarks from NASA archives:

| Target ID | Mission | Type | Period | Key Characteristics |
| :--- | :--- | :--- | :--- | :--- |
| **Kepler-10 b** | NASA Kepler | Confirmed Exoplanet | 0.8375 d | First rocky super-Earth discovered by Kepler ($1.47 R_\oplus$). |
| **Kepler-90 i** | NASA Kepler | Confirmed Exoplanet | 1.4450 d | 8th planet in Kepler-90 identified via deep learning neural networks. |
| **TOI-700 d** | NASA TESS | Habitable Zone Planet | 2.1500 d | First Earth-sized habitable-zone world found by TESS. |
| **TRAPPIST-1 e** | NASA TESS / Spitzer | Terrestrial Exoplanet | 1.6200 d | Earth-sized world orbiting an ultra-cool red dwarf. |
| **WASP-12 b** | NASA TESS / Ground | Hot Jupiter | 1.0900 d | Tidally distorted gas giant with deep $1.4\%$ transit dips. |
| **KOI-123** | NASA Kepler | False Positive (Binary) | 2.4000 d | Eclipsing binary star system with alternating deep V-shaped eclipses. |
| **TIC 4209144** | NASA TESS | False Positive (Flare Star) | 3.5000 d | Active flare star with magnetic flares and stellar pulsations. |
| **KIC 8923019** | NASA Kepler | Instrumental Noise Floor | 2.0000 d | Quiet star dominated by sensor thermal noise (SNR < 2). |

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` (included with Node.js)

### Installation
```bash
# Clone or navigate into the project directory
cd "c:/books/New folder (2)"

# Install dependencies
npm install
```

### Running Locally
```bash
# Start the local development server
npm run dev
```
Open **[http://localhost:3000/](http://localhost:3000/)** in your browser.

### Building for Production
```bash
npm run build
```
The optimized bundle will be generated in the `dist/` directory.

---

## 📁 Project Structure

```
├── Exoplanet Hunter GT 2.pdf    # Original presentation slide deck proposal
├── README.md                    # Project documentation (this file)
├── index.html                   # Semantic HTML5 observatory layout & modals
├── package.json                 # Project dependencies & scripts
├── assets/
│   └── exoplanet_transit.jpg    # Stellar transit visualization hero asset
└── src/
    ├── datasets.js              # NASA target catalog, CSV parser, and Mandel-Agol generator
    ├── preprocessing.js         # Sigma clipping, detrending, and normalization pipeline
    ├── feature-extraction.js    # BLS periodogram and transit feature calculation
    ├── ml-engine.js             # Random Forest, SVM, and Neural Network classifiers & training
    ├── charts.js                # Canvas plotting (Light curve, Phase-folded, Periodogram)
    ├── transit-simulator.js     # Real-time limb-darkened physical transit simulator
    ├── main.js                  # Application orchestrator, event handlers & report generator
    └── style.css                # Cosmic dark observatory design system
```

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES Modules)
- **Styling**: Vanilla CSS (CSS custom properties, glassmorphism, responsive grid)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Visualizations**: HTML5 Canvas 2D API (60 FPS rendering)
- **Effects**: `canvas-confetti` (discovery celebrations)
- **Typography**: Space Grotesk, JetBrains Mono

---

## 📚 References & Data Sources

- NASA Exoplanet Archive: [exoplanetarchive.ipac.caltech.edu](https://exoplanetarchive.ipac.caltech.edu/)
- Mikulski Archive for Space Telescopes (MAST): [archive.stsci.edu](https://archive.stsci.edu/)
- Mandel, K., & Agol, E. (2002). *Analytic Light Curves for Planetary Transit Searches*. The Astrophysical Journal.
- Kovács, G., Zucker, S., & Mazeh, T. (2002). *A box-fitting algorithm in the search for periodic transits (BLS)*. Astronomy & Astrophysics.

---

## 📄 License
Educational and research project created for academic presentation and demonstration.
