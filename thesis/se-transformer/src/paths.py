from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUTPUTS = ROOT / "outputs"
MODELS = ROOT / "models"

SECONVO_DIR = DATA / "seconvo"
MENTAL_DIR = DATA / "mentalmanip"
SAFE_DIR = DATA / "safepersuasion"
SCAM_DIR = DATA / "scam_phone"
PHISH_DIR = DATA / "phishing"
REAMENT_DIR = DATA / "reament"

SECONVO_TRAIN = SECONVO_DIR / "annotated_train.json"
SECONVO_TEST = SECONVO_DIR / "annotated_test.json"
MENTAL_CSV = MENTAL_DIR / "mentalmanip_maj.csv"
SAFE_CSV = SAFE_DIR / "SafePersuasion.csv"
SCAM_TRAIN = SCAM_DIR / "agent_conversation_train.csv"
SCAM_TEST = SCAM_DIR / "agent_conversation_test.csv"
PHISH_JSON = PHISH_DIR / "texts.json"
REAMENT_JSON = REAMENT_DIR / "ReaMent.json"

CORE_TASKS = ["seconvo", "mentalmanip"]
EXTRA_TASKS = ["safepersuasion", "scam_phone", "phishing_text", "reament"]
ALL_TASKS = CORE_TASKS + EXTRA_TASKS

# Three Transformers for the thesis research chapter (promotor: 2–3 models).
TRANSFORMER_MODELS = [
    "bert-base-uncased",
    "roberta-base",
    "distilbert-base-uncased",
]
