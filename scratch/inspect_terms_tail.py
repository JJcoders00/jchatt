with open('terms.html', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('<h2>5. Disclaimer of Warranties</h2>')
if idx != -1:
    print(text[idx:])
