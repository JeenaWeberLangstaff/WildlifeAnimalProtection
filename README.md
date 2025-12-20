# Wildlife Poaching Detection

AI-powered conservation monitoring system for real-time threat detection in African wildlife reserves.

## Overview

This project combines an Edge Impulse audio classification model with a React web dashboard to detect potential poaching threats through acoustic monitoring. The system classifies environmental sounds and provides real-time alerts to rangers.

## Features

- **Real-time Audio Monitoring** — Continuous classification of environmental sounds
- **Audio Upload** — Classify pre-recorded audio files
- **Location Tracking** — Tag detections with GPS coordinates
- **Threat Alerts** — Visual indicators when gunshots or suspicious sounds detected
- **Edge Deployment** — Lightweight model runs on low-power devices

## Tech Stack

**Frontend:**
- React
- Vite

**Machine Learning:**
- Edge Impulse
- TensorFlow Lite
- MFCC feature extraction

**Audio Processing:**
- FFmpeg

## Audio Classes

| Class | Samples | Description |
|-------|---------|-------------|
| Gunshots | 38 | Rifle shots at medium-to-far distance |
| Footsteps | 55 | Human movement on various terrain |
| Wildlife | 55 | Animal vocalizations (elephants, lions, birds) |
| Natural Elements | 40 | Rain, wind (non-threatening ambient sounds) |
| Thunder | 35 | Separated from natural elements to reduce gunshot confusion |

## Model Performance

| Metric | Value |
|--------|-------|
| Overall Accuracy | 82.5% |
| Gunshot Detection | 50% |
| Weighted F1 Score | 0.81 |
| Inferencing Time | 1 ms |
| RAM Usage | 12.5 KB |

### Per-Class Results

| Class | Accuracy | F1 Score |
|-------|----------|----------|
| Footsteps | 78.5% | 0.74 |
| Gunshots | 50.0% | 0.64 |
| Natural Elements | 79.9% | 0.80 |
| Thunder | 82.0% | 0.81 |
| Wildlife | 89.6% | 0.91 |

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- FFmpeg (for audio processing)

### Installation

```bash
# Clone the repository
git clone https://github.com/JeenaWeberLangstaff/AnimalProtection.git

# Navigate to project directory
cd AnimalProtection

# Install dependencies
npm install

# Start development server
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## Project Structure

```
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
│   └── thunder/
├── index.html
├── vite.config.js
└── package.json
```

## Technical Details

### Audio Processing

All audio samples processed with silence removal and standardization:

```bash
ffmpeg -i input.mp3 -af "silenceremove=stop_periods=-1:stop_duration=0.3:stop_threshold=-50dB" -ar 16000 output.wav
```

### MFCC Feature Extraction

| Parameter | Value |
|-----------|-------|
| Number of coefficients | 13 |
| Frame length | 0.02s |
| Frame stride | 0.02s |
| Filter number | 32 |
| FFT length | 256 |
| Frequency range | 0-8000 Hz |

### Neural Network Architecture

```
Input (650 features)
    ↓
Reshape (13 columns)
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
Output (5 classes)
```

### Training Configuration

- Epochs: 100
- Learning rate: 0.001
- Data augmentation: Off

## Key Findings

### Thunder Separation

Initially, thunder was grouped with natural elements, causing severe gunshot confusion (18.9% accuracy). Separating thunder into its own class improved gunshot detection to 50%.

Both gunshots and thunder produce impulsive, broadband sounds with decay characteristics. The model distinguishes them by attack shape and frequency content.

### Distant Gunshot Challenge

Adding distant/reverberant gunshot recordings decreased accuracy — highly echoing shots sound acoustically similar to thunder.

**Recommendation:** Use mid-distance recordings with minimal reverb for training. Field deployment would benefit from location-specific training data.

## Future Development

- [ ] Live microphone input
- [ ] Alert notifications (SMS/email to rangers)
- [ ] Detection history log with timestamps
- [ ] Map visualization of detections
- [ ] Multi-sensor network support
- [ ] Audio-visual fusion (camera integration)
- [ ] Animal distress call detection (snare detection)
- [ ] Expand gunshot dataset to 70-80 samples

## Data Sources

### Wildlife Sounds
- [Free Animal Sounds - Jungle Animals](https://freeanimalsounds.org/jungle-animals)
- [Zapsplat Sound Effects](https://www.zapsplat.com/sound-effect-categories/)
- [SoundDino - Cheetah](https://sounddino.com/en/effects/cheetah/)
- [African Wild Dog Sound](https://18498925-sound-effects-factory.mp3.pm/song/196381305-african-wild-dog-lycaon-pictus/)
- [ElevenLabs - Elephant](https://elevenlabs.io/sound-effects/elephant)

### Gunshot Sounds
- [Epidemic Sound - Distant Gunshots](https://www.epidemicsound.com/sound-effects/search/?term=distant%20gunshots)
- [GFX Sounds - Distant Shotgun](https://gfxsounds.com/page/7/?s=distant+shotgun)
- [Freesound - Distant gun shots with wind noise](https://freesound.org/s/435407/) by moosegravy

## Wildlife Dashboard

A web-based interface that connects to the Edge Impulse audio classification model to detect potential poaching threats in wildlife reserves.

### Dashboard Features

- **Start Monitoring** — Begin real-time audio classification
- **Upload Audio** — Classify pre-recorded audio files
- **Get My Location** — Tag detections with GPS coordinates
- **Current Detection** — Display classification results

### Running the Dashboard

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### Dashboard Tech Stack

- React
- Vite
- Edge Impulse WebAssembly SDK

## Author

**Jeena Weber Langstaff**  
University of Rhode Island  
Computer Science & Psychology

## License

MIT License — See LICENSE file for details.

---

*Developed for the Edge Impulse Hackathon 2025*
