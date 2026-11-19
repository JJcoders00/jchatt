with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('id="vReal"')
print(text[idx-50:idx+400])
