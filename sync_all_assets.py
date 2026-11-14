import shutil, os

files_to_sync = [
    'index.html',
    'styles.css',
    'js/firebase-engine.js',
    'js/web-and-app.js',
    'js/sound-engine.js',
    'js/screens-core.js',
    'js/screens-extra.js',
    'js/landing-page.js',
    'js/crypto-and-assets.js'
]

targets = [
    'jchatt_web_v2/dist',
    'dist',
    'jchatt_web_v2/android/app/src/main/assets/public',
    'android/app/src/main/assets/public'
]

for f in files_to_sync:
    for t in targets:
        dest = os.path.join(t, f)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(f, dest)
        print(f'Synced {f} -> {dest}')

# Also sync images
img_targets = [
    'jchatt_web_v2/dist/images',
    'dist/images',
    'jchatt_web_v2/android/app/src/main/assets/public/images',
    'android/app/src/main/assets/public/images'
]

for it in img_targets:
    os.makedirs(it, exist_ok=True)
    for img in ['doodle_pattern.svg', 'doodle_pattern_dark.svg']:
        src = os.path.join('images', img)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(it, img))
            print(f'Synced {img} -> {it}')

print('Full sync complete!')
