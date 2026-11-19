import os

files = [
    'jchatt_web_v2/dist/landing.html',
    'jchatt_web_v2/dist/js/landing-page.js',
    'jchatt_web_v2/public/landing.html',
    'jchatt_web_v2/public/js/landing-page.js',
    'dist/landing.html',
    'dist/js/landing-page.js',
    'scratch/duolingo_landing.html'
]

# We use the live GitHub Pages APK URL which sends Content-Type: application/vnd.android.package-archive
target_url = 'https://jjcoders00.github.io/jchatt/app-debug.apk'

for path in files:
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        new_content = content.replace('./Jchatt.apk', target_url)
        new_content = new_content.replace('href="Jchatt.apk"', f'href="{target_url}"')
        if new_content != content:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f'Successfully updated: {path}')
        else:
            print(f'No changes needed for: {path}')
