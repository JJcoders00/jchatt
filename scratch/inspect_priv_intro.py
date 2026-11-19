with open('privacy.html', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('<h2>1. Introduction & Statutory Context</h2>')
print(text[idx:idx+800])
