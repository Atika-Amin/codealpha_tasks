"""
Task 3 - Music Generation with AI
Step 3 & 4: Build a deep learning model (stacked LSTM) and train it
on the preprocessed note sequences.

Run after preprocess.py:  python train.py --epochs 50
"""
import argparse
import os
import pickle

from tensorflow.keras.callbacks import ModelCheckpoint
from tensorflow.keras.layers import LSTM, Activation, Dense, Dropout
from tensorflow.keras.models import Sequential

from preprocess import NOTES_PATH, build_sequences

BASE = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE, "data", "model.keras")
VOCAB_PATH = os.path.join(BASE, "data", "vocab.pkl")


def build_model(sequence_length, n_vocab):
    model = Sequential(
        [
            LSTM(256, input_shape=(sequence_length, 1), return_sequences=True),
            Dropout(0.3),
            LSTM(256),
            Dense(256),
            Dropout(0.3),
            Dense(n_vocab),
            Activation("softmax"),
        ]
    )
    model.compile(loss="categorical_crossentropy", optimizer="adam")
    return model


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--batch-size", type=int, default=64)
    args = parser.parse_args()

    with open(NOTES_PATH, "rb") as f:
        notes = pickle.load(f)

    X, y, vocab = build_sequences(notes)
    print(f"Training samples: {len(X)}  |  vocab size: {len(vocab)}")

    with open(VOCAB_PATH, "wb") as f:
        pickle.dump(vocab, f)

    model = build_model(X.shape[1], len(vocab))
    model.summary()

    checkpoint = ModelCheckpoint(MODEL_PATH, monitor="loss", save_best_only=True, verbose=1)
    model.fit(X, y, epochs=args.epochs, batch_size=args.batch_size, callbacks=[checkpoint])
    print(f"\nBest model saved to {MODEL_PATH}")


if __name__ == "__main__":
    main()
