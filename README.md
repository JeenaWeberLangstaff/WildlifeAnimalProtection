Wildlife Poaching Detection

AI-powered conservation monitoring system for real-time threat detection in African wildlife reserves using acoustic classification.

Overview

This project uses audio classification to detect potential poaching threats through environmental sound monitoring. The system classifies acoustic signals into six categories and provides real-time alerts to rangers. Currently in active development with a planned migration from Edge Impulse to PyTorch with Wav2Vec2 fine-tuning.

Features


Real-time Audio Monitoring — Continuous classification of environmental sounds
Audio Upload — Classify pre-recorded audio files
Location Tracking — Tag detections with GPS coordinates
Threat Alerts — Visual indicators when gunshots or suspicious sounds detected
Edge Deployment — Lightweight model runs on low-power devices


Tech Stack

Frontend: React, Vite

Machine Learning: Edge Impulse, TensorFlow Lite, MFCC + MFE feature extraction

Audio Processing: FFmpeg

Dataset

330 total samples across 6 classes, 68/32 train/test split

ClassTrainingTestTotalDescriptionFootsteps662086Human movement on various terrainGunshots731790Rifle shots at medium-to-far distanceNatural Elements48856Rain, wind (non-threatening ambient sounds)Thunder20424Separated from natural elements to reduce gunshot confusionVehicles20727Ranger and poacher vehicle soundsWildlife331447Animal vocalizations (elephants, lions, birds)

Original dataset (5 classes, 223 samples):

ClassSamplesGunshots38Footsteps55Wildlife55Natural Elements40Thunder35

Model Performance

Experiment Comparison

ModelWindowFeaturesClassesINT8 AccuracyImpulse #1 (baseline)1000msMFCC582.7%Impulse #2800msMFCC572.6%Impulse #3 (current)1000msMFCC + MFE677.7%

Current Model: Impulse #3

MFCC + MFE features, 1000ms window, 16KHz, 6 classes, 100 training cycles

MetricValueOverall Accuracy77.7%ROC-AUC0.95Weighted Precision0.79Weighted Recall0.78Weighted F1 Score0.78

Per-Class Results:

ClassAccuracyF1 ScoreFootsteps84.2%0.82Gunshots74.4%0.56Natural Elements67.4%0.70Thunder78.5%0.79Vehicles41.6%0.50Wildlife89.3%0.92

Original Model: Impulse #1

MFCC features, 1000ms window, 16KHz, 5 classes, 100 training cycles

ClassAccuracyF1 ScoreFootsteps78.5%0.74Gunshots50.0%0.64Natural Elements79.9%0.80Thunder82.0%0.81Wildlife89.6%0.91

Key Findings

Thunder Separation: Initially grouped with natural elements, causing severe gunshot confusion (18.9% accuracy). Separating thunder into its own class improved gunshot detection from 18.9% to 50% in the original model and 74.4% in the current model.

Gunshot Detection Improvement: Switching from MFCC to MFCC + MFE features and expanding the gunshot dataset from 38 to 90 samples improved gunshot detection from 50% to 74.4%, despite adding a more complex 6-class problem.

Vehicles Class: Added to improve real-world deployment accuracy. Currently shows 41.6% accuracy due to acoustic similarity with gunshots. More training data needed — 27 total samples is insufficient for this class.

Window Size Impact: 1000ms windows consistently outperform 800ms windows, with a ~10 percentage point accuracy difference observed across experiments (Impulse #1 vs Impulse #2).

Distant Gunshot Challenge: Adding distant/reverberant gunshot recordings decreased accuracy — highly echoing shots sound acoustically similar to thunder. Mid-distance recordings with minimal reverb perform better.

Technical Details

Audio Processing

All audio samples processed with silence removal and standardization:

bashffmpeg -i input.mp3 -af "silenceremove=stop_periods=-1:stop_duration=0.3:stop_threshold=-50dB" -ar 16000 output.wav

MFCC Parameters (Impulse #1 and #3)

ParameterValueNumber of coefficients13Frame length0.02sFrame stride0.02sFilter number32FFT length256Frequency range0–8000 Hz

MFE Parameters (Impulse #3)

ParameterValueFrame length0.02sFrame stride0.01sFilter number40FFT length256Frequency range0–8000 Hz

Neural Network Architecture

Input features
    ↓
Reshape
    ↓
1D Conv/Pool (8 filters, kernel 3)
    ↓
Dropout (0.25)
    ↓
1D Conv/Pool (16 filters, kernel 3)
    ↓
Dropout (0.25)
    ↓
Flatten
    ↓
Output (6 classes)

Getting Started

Prerequisites


Node.js (v18+)
npm or yarn
FFmpeg


Installation

bash# Clone the repository
git clone https://github.com/JeenaWeberLangstaff/AnimalProtection.git

# Navigate to project directory
cd AnimalProtection

# Install dependencies
npm install

# Start development server
npm run dev

The dashboard will be available at http://localhost:5173

Build for Production

bashnpm run build

Project Structure

AnimalProtection/
├── src/
│   ├── components/
│   ├── App.jsx
│   └── main.jsx
├── public/
├── model/                  # Edge Impulse exported model
├── audio-samples/          # Training data
│   ├── gunshots/
│   ├── footsteps/
│   ├── wildlife/
│   ├── natural-elements/
│   ├── thunder/
│   └── vehicles/
├── index.html
├── vite.config.js
└── package.json

Roadmap

Phase 2: PyTorch Migration (In Progress)


Export dataset from Edge Impulse as WAV files
Fine-tune Wav2Vec2 pretrained model on conservation audio dataset
Train in Google Colab without compute time limits
Target: 90%+ gunshot detection accuracy


Phase 3: Deployment


Live microphone input
SMS/email alert notifications to rangers
Detection history log with timestamps
Map visualization of detections
Multi-sensor network support
Audio-visual fusion (camera integration)
Animal distress call and snare detection


Data Sources

Wildlife Sounds: Free Animal Sounds, Zapsplat, SoundDino, African Wild Dog Sound, ElevenLabs

Gunshot Sounds: Epidemic Sound, GFX Sounds, Freesound (moosegravy)

Author

Jeena Weber Langstaff


---

*Developed for the Edge Impulse Hackathon 2025*
