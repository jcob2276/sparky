from transformers import AutoTokenizer
tok = AutoTokenizer.from_pretrained('microsoft/deberta-v3-base')
dtok = AutoTokenizer.from_pretrained('distilbert-base-uncased')
w = 'manipulation'
w_zw = 'mani\u200bpulation'
w_homo = 'm\u0430nipul\u0430tion'
print('DeBERTa clean:', tok.tokenize(w))
print('DeBERTa zwsp: ', tok.tokenize(w_zw))
print('DeBERTa homo: ', tok.tokenize(w_homo))
print('Distil clean:', dtok.tokenize(w))
print('Distil zwsp: ', dtok.tokenize(w_zw))
print('Distil homo: ', dtok.tokenize(w_homo))
