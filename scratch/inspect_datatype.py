with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('document.querySelectorAll(\'[data-type]\')')
print(text[idx-50:idx+450])
