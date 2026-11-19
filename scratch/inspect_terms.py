with open('terms.html', 'r', encoding='utf-8') as f:
    text = f.read()

print('terms.html length:', len(text))
print(text[:1500])
