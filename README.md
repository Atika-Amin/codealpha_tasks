# CodeAlpha — AI/ML Internship Projects

A portfolio of four full-stack AI/ML projects built during a CodeAlpha
internship. Each task lives in its own self-contained subfolder with its
own README, setup instructions, and (where relevant) architecture diagram
— nothing here is shared between tasks, so any one of them can be run,
graded, or reused entirely on its own.

## Tasks

| | Task | What it does | Stack |
|---|---|---|---|
| ✅ | **[Task 1 — Language Translation Tool](./CodeAlpha_LanguageTranslationTool)** | Translates text between languages via a translation API, with source/target language selection, copy-to-clipboard, and text-to-speech. | React (Vite) · Flask · LibreTranslate / Google Translate |
| ✅ | **[Task 2 — Chatbot for FAQs](./CodeAlpha_ChatbotForFAQs)** | Matches a user's question to the closest FAQ using NLP preprocessing and cosine similarity, with a full chat UI and low-confidence detection for out-of-scope questions. | React (Vite) · Flask · NLTK · scikit-learn (TF-IDF) |
| ✅ | **[Task 3 — Music Generation with AI](./CodeAlpha_MusicGenerationWithAI)** | Trains an LSTM on MIDI data to generate new music sequences, with a Markov-chain fallback and in-browser playback. | React (Vite) · Flask · music21 · TensorFlow/Keras · Tone.js |
| ✅ | **[Task 4 — Object Detection and Tracking](./CodeAlpha_ObjectDetectionAndTracking)** | Real-time object detection and multi-object tracking on a webcam or uploaded video, with live annotated stream and per-class stats. | React (Vite) · Flask · OpenCV · YOLOv8 · ByteTrack |

*(Folder names above assume `Task1_LanguageTranslationTool`,
`Task2_FAQChatbot`, `Task3_MusicGenerationWithAI`,
`Task4_ObjectDetectionTracking` — update the links if your actual folder
names differ.)*

## Repository structure

```
CodeAlpha/
├── README.md                          (this file)
├── CodeAlpha_LanguageTranslationTool/
│   ├── README.md
│   ├── backend/                       Flask API + translation provider
│   └── frontend/                      React UI
├── CodeAlpha_ChatbotForFAQs/
│   ├── README.md
│   ├── backend/                       Flask API + NLTK/TF-IDF matcher
│   └── frontend/                      React chat UI
├── CodeAlpha_MusicGenerationWithAI/
│   ├── README.md
│   ├── backend/                       Flask API + LSTM model + music21
│   └── frontend/                      React UI + Tone.js playback
└── CodeAlpha_ObjectDetectionAndTracking/
    ├── README.md
    ├── backend/                       Flask API + YOLOv8 + ByteTrack
    └── frontend/                      React UI + live stream
```

## Common conventions across all four

- **Python handles all AI/ML and NLP processing** — nothing is
  reimplemented in the browser. React handles the UI only.
- **Each task is a Vite-scaffolded React frontend talking to its own
  Flask API** over a small number of REST endpoints, kept independent per
  task rather than sharing a backend.
- **Every task's own README** documents its architecture, a
  requirement-to-file mapping table, and full setup steps — start there
  for anything task-specific.
- **No task requires a paid account to run**, though a couple document
  optional paid-tier upgrades (e.g. Task 1's Google Cloud Translate /
  Azure Translator options) for anyone who wants them later.

## Running a task

Each subfolder is independent — `cd` into the one you want, and follow
its own README's setup section (typically: create a Python venv, `pip
install -r requirements.txt` for the backend; `npm install` for the
frontend; run both, then open the frontend's local URL).
