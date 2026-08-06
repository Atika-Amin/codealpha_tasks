"""
Task 2 - FAQ matching engine.

Preprocesses text with NLTK (tokenize, strip punctuation, remove
stopwords, lemmatize), then represents FAQ questions and the user's
question as TF-IDF vectors and finds the best match by cosine similarity.

To swap NLTK for spaCy instead, replace `preprocess()` below with e.g.:

    import spacy
    _nlp = spacy.load("en_core_web_sm")

    def preprocess(text):
        doc = _nlp(text.lower())
        return [tok.lemma_ for tok in doc if not tok.is_stop and tok.is_alpha]

Nothing else in this file (or app.py) needs to change — TfidfVectorizer
just needs `preprocess` to keep returning a list of cleaned tokens.
"""
import json
import string

import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# (data path on nltk.data, package name to download if missing)
_REQUIRED_NLTK_DATA = [
    ("tokenizers/punkt_tab", "punkt_tab"),
    ("tokenizers/punkt", "punkt"),
    ("corpora/stopwords", "stopwords"),
    ("corpora/wordnet", "wordnet"),
    ("corpora/omw-1.4", "omw-1.4"),
]


def _ensure_nltk_data():
    """Downloads NLTK's corpora/models on first run only; no-op after that."""
    for path, package in _REQUIRED_NLTK_DATA:
        try:
            nltk.data.find(path)
        except LookupError:
            nltk.download(package, quiet=True)


_ensure_nltk_data()

_lemmatizer = WordNetLemmatizer()
_stopwords = set(stopwords.words("english"))
_punct_table = str.maketrans("", "", string.punctuation)


def preprocess(text):
    """Lowercase -> strip punctuation -> tokenize -> drop stopwords -> lemmatize."""
    cleaned = text.lower().translate(_punct_table)
    tokens = word_tokenize(cleaned)
    return [
        _lemmatizer.lemmatize(tok)
        for tok in tokens
        if tok.strip() and tok not in _stopwords
    ]


class FAQMatcher:
    # Cosine similarity is 0-1. Below this, the closest FAQ is probably not
    # actually relevant, so the bot should say it isn't sure rather than
    # confidently hand back a wrong answer.
    LOW_CONFIDENCE_THRESHOLD = 0.2

    def __init__(self, faqs_path):
        with open(faqs_path, "r", encoding="utf-8") as f:
            self.faqs = json.load(f)

        if not self.faqs:
            raise ValueError(f"No FAQs found in {faqs_path}")

        questions = [faq["question"] for faq in self.faqs]
        # tokenizer=preprocess plugs our NLTK pipeline into TF-IDF's own
        # vectorization step; token_pattern=None silences sklearn's warning
        # that its default regex tokenizer is being overridden on purpose.
        self.vectorizer = TfidfVectorizer(tokenizer=preprocess, lowercase=False, token_pattern=None)
        self.question_vectors = self.vectorizer.fit_transform(questions)

    def match(self, user_question):
        query_vector = self.vectorizer.transform([user_question])
        scores = cosine_similarity(query_vector, self.question_vectors)[0]

        best_idx = int(scores.argmax())
        best_score = float(scores[best_idx])
        best_faq = self.faqs[best_idx]

        return {
            "answer": best_faq["answer"],
            "matchedQuestion": best_faq["question"],
            "category": best_faq.get("category"),
            "confidence": round(best_score, 4),
            "lowConfidence": best_score < self.LOW_CONFIDENCE_THRESHOLD,
        }

    def all_questions(self):
        return [
            {"question": faq["question"], "category": faq.get("category")}
            for faq in self.faqs
        ]
