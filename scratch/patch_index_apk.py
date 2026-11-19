with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('href="./downloads/jchatt-v2.0.apk"', 'href="https://github.com/JJcoders00/jchatt/raw/main/app-debug.apk" download="jchatt-v2.0.apk"')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(text)

with open('jchatt_web_v2/dist/index.html', 'w', encoding='utf-8') as f:
    f.write(text)

with open('dist/index.html', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated download link to GitHub raw direct download!')
