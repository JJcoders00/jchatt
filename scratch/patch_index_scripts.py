import os

files = [
    'index.html',
    'dist/index.html',
    'jchatt_web_v2/index.html',
    'jchatt_web_v2/dist/index.html',
    'jchatt_web_v2/public/index.html',
    'android/app/src/main/assets/public/index.html',
    'jchatt_web_v2/android/app/src/main/assets/public/index.html'
]

target_find = '<script src="./js/web-and-app.js"></script>'
target_replace = '<script src="./js/landing-page.js"></script>\n  <script src="./js/web-and-app.js"></script>'

for fp in files:
    if os.path.exists(fp):
        with open(fp, 'r', encoding='utf-8') as f:
            c = f.read()
        if 'landing-page.js' not in c:
            if target_find in c:
                c = c.replace(target_find, target_replace)
                with open(fp, 'w', encoding='utf-8') as f:
                    f.write(c)
                print('Added landing-page.js to', fp)
            else:
                print('Could not find web-and-app.js tag in', fp)
        else:
            print('Already present in', fp)
