# Task 3 — Music Generation with AI 🎹

Generate original music with a deep learning model. Python (music21 + TensorFlow LSTM) does the AI work; a React app is the interface for generating, playing, and downloading MIDI tracks.

## How it maps to the task

| Requirement | Where |
|---|---|
| Collect MIDI music data | `backend/data/midi/` — drop `.mid` files here (MAESTRO, piano-midi.de, etc.) |
| Preprocess into note sequences (music21) | `backend/preprocess.py` |
| Deep learning model (LSTM) | `backend/train.py` — stacked LSTM (256→256) with dropout |
| Train the model to generate sequences | `backend/train.py`, sampling in `backend/generate.py` |
| Convert sequences to MIDI, play/save | `backend/generate.py` + play/download in the React UI |

If you haven't trained the LSTM yet, generation automatically falls back to a Markov chain built from the same preprocessed notes, so the app works end-to-end immediately.

## Run it

**Backend**
```bash
cd backend
pip install -r requirements.txt

# 1. add .mid files to data/midi/, then:
python preprocess.py

# 2. (optional but recommended) train the LSTM:
python train.py --epochs 50

# 3. start the API:
python app.py            # http://localhost:5000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

## Architecture

```
React (Vite + Tone.js playback)
   │  POST /api/generate {length, temperature}
   ▼
Flask API ──> generate.py ──> LSTM (model.keras)  or  Markov fallback
   │                              │
   ▼                              ▼
GET /api/midi/<file>  <──  music21 stream.write("midi")
```

Temperature controls sampling randomness: ~0.5 stays close to the training data, ~1.5 gets experimental.
