"""
Task 3 - Music Generation with AI
Step 4 & 5: Generate new note sequences with the trained LSTM and
convert them back to a playable MIDI file.

"""
import os
import pickle
import random
import time
from collections import defaultdict

import numpy as np
from music21 import chord, instrument, note, stream

from preprocess import NOTES_PATH, SEQUENCE_LENGTH

BASE = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE, "data", "model.keras")
VOCAB_PATH = os.path.join(BASE, "data", "vocab.pkl")
OUTPUT_DIR = os.path.join(BASE, "output")


def load_notes():
    with open(NOTES_PATH, "rb") as f:
        return pickle.load(f)


# ---------------------------------------------------------------- LSTM path
def generate_with_lstm(length=200, temperature=1.0):
    from tensorflow.keras.models import load_model

    model = load_model(MODEL_PATH)
    with open(VOCAB_PATH, "rb") as f:
        vocab = pickle.load(f)
    int_to_note = dict(enumerate(vocab))
    note_to_int = {n: i for i, n in int_to_note.items()}
    n_vocab = len(vocab)

    notes = load_notes()
    start = random.randint(0, len(notes) - SEQUENCE_LENGTH - 1)
    pattern = [note_to_int[n] for n in notes[start : start + SEQUENCE_LENGTH]]

    output = []
    for _ in range(length):
        x = np.reshape(pattern, (1, len(pattern), 1)) / float(n_vocab)
        preds = model.predict(x, verbose=0)[0]

        # temperature sampling
        preds = np.log(preds + 1e-9) / max(temperature, 0.05)
        preds = np.exp(preds) / np.sum(np.exp(preds))
        idx = np.random.choice(range(n_vocab), p=preds)

        output.append(int_to_note[idx])
        pattern = pattern[1:] + [idx]
    return output


# ------------------------------------------------------------ Markov fallback
def generate_with_markov(length=200, order=2):
    notes = load_notes()
    chains = defaultdict(list)
    for i in range(len(notes) - order):
        chains[tuple(notes[i : i + order])].append(notes[i + order])

    state = random.choice(list(chains.keys()))
    output = list(state)
    for _ in range(length - order):
        nxt = random.choice(chains.get(state, [random.choice(notes)]))
        output.append(nxt)
        state = tuple(output[-order:])
    return output


# ----------------------------------------------------------------- MIDI out
def sequence_to_midi(prediction_output, filename=None):
    """Convert generated tokens back into a MIDI file (Step 5)."""
    offset = 0.0
    parts = []
    for token in prediction_output:
        if ("." in token) or token.isdigit():  
            pitches = [note.Note(int(p)) for p in token.split(".")]
            for p in pitches:
                p.storedInstrument = instrument.Piano()
            el = chord.Chord(pitches)
        else:  # single note like "C4"
            el = note.Note(token)
            el.storedInstrument = instrument.Piano()
        el.offset = offset
        parts.append(el)
        offset += 0.5

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filename = filename or f"generated_{int(time.time())}.mid"
    path = os.path.join(OUTPUT_DIR, filename)
    stream.Stream(parts).write("midi", fp=path)
    return path


def generate(length=200, temperature=1.0):
    """Try LSTM first; fall back to Markov if no trained model exists."""
    if os.path.exists(MODEL_PATH) and os.path.exists(VOCAB_PATH):
        tokens, method = generate_with_lstm(length, temperature), "lstm"
    else:
        tokens, method = generate_with_markov(length), "markov (train the LSTM for better results)"
    path = sequence_to_midi(tokens)
    return path, method, len(tokens)


if __name__ == "__main__":
    path, method, n = generate()
    print(f"Generated {n} notes with {method} -> {path}")
