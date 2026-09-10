from transformers import AutoTokenizer, AutoModelForSequenceClassification
try:
    name = "microsoft/deberta-v3-base"
    tok = AutoTokenizer.from_pretrained(name)
    m = AutoModelForSequenceClassification.from_pretrained(name, num_labels=2)
    print("DeBERTa-v3 OK!")
except Exception as e:
    print(f"DeBERTa error: {e}")
