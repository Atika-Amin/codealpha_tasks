"""
Task 3 - Music Generation with AI
Step 1 & 2: Collect MIDI data and preprocess it into note sequences using music21.

run:  python preprocess.py
"""
import glob
import os
import pickle

import numpy as np
from music21 import converter, instrument, note, chord

DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "midi")
NOTES_PATH = os.path.join(os.path.dirname(__file__), "data", "notes.pkl")
SEQUENCE_LENGTH = 50


def extract_notes():
    """Parse every MIDI file and flatten it into a list of note/chord tokens."""
    notes = []
    files = glob.glob(os.path.join(DATA_DIR, "**", "*.mid*"), recursive=True)
    if not files:
        raise SystemExit(f"No MIDI files found in {DATA_DIR}. Add some .mid files first.")

    for path in files:
        print(f"Parsing {os.path.basename(path)} ...")
        try:
            midi = converter.parse(path)
        except Exception as e:
            print(f"  skipped ({e})")
            continue

        try:
            parts = instrument.partitionByInstrument(midi)
            elements = parts.parts[0].recurse() if parts else midi.flatten().notes
        except Exception:
            elements = midi.flatten().notes

        for el in elements:
            if isinstance(el, note.Note):
                notes.append(str(el.pitch))            
            elif isinstance(el, chord.Chord):
                notes.append(".".join(str(n) for n in el.normalOrder))  

    os.makedirs(os.path.dirname(NOTES_PATH), exist_ok=True)
    with open(NOTES_PATH, "wb") as f:
        pickle.dump(notes, f)
    print(f"\nExtracted {len(notes)} tokens ({len(set(notes))} unique) -> {NOTES_PATH}")
    return notes


def build_sequences(notes, sequence_length=SEQUENCE_LENGTH):
    """Turn the token list into (input sequence -> next note) training pairs."""
    vocab = sorted(set(notes))
    note_to_int = {n: i for i, n in enumerate(vocab)}

    inputs, targets = [], []
    for i in range(len(notes) - sequence_length):
        seq_in = notes[i : i + sequence_length]
        seq_out = notes[i + sequence_length]
        inputs.append([note_to_int[n] for n in seq_in])
        targets.append(note_to_int[seq_out])

    n_vocab = len(vocab)
    X = np.reshape(inputs, (len(inputs), sequence_length, 1)) / float(n_vocab)
    y = np.eye(n_vocab)[targets]  # one-hot
    return X, y, vocab


if __name__ == "__main__":
    extract_notes()
