with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

idx_scene = text.find('class="scene"')
print(text[idx_scene:idx_scene+1800])
