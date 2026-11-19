with open('privacy.html', 'r', encoding='utf-8') as f:
    text = f.read()

print('privacy.html length:', len(text))
print(text[:1200])
