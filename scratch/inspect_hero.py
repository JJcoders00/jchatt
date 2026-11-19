with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

idx_start = text.find('<section class="hero"')
if idx_start == -1: idx_start = text.find('class="hero"')
idx_end = text.find('<section id="features"')

print(text[idx_start:idx_start+2000])
