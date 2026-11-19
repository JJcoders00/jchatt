with open('privacy.html', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.rfind('<footer>')
if idx != -1:
    print(text[idx:])
