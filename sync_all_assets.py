import os, shutil

def sync_assets():
    files_to_sync = [
        'index.html',
        'web.html',
        'privacy.html',
        'terms.html',
        'whitepaper.html',
        'favicon.svg',
        'favicon.png',
        'manifest.json',
        'sw.js',
        'styles.css',
        'js/firebase-engine.js',
        'js/web-and-app.js',
        'js/sound-engine.js',
        'js/screens-core.js',
        'js/screens-extra.js',
        'js/landing-page.js',
        'js/crypto-and-assets.js'
    ]

    all_targets = [
        'jchatt_web_v2/dist',
        'dist',
        'jchatt_web_v2/android/app/src/main/assets/public',
        'android/app/src/main/assets/public'
    ]

    print("--- Syncing individual files ---")
    for f in files_to_sync:
        if not os.path.exists(f):
            print(f"[SKIP] Source file not found: {f}")
            continue
        for t in all_targets:
            dest = os.path.join(t, f)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.copy2(f, dest)

    # Directories for all targets: images, vendor
    for d in ['images', 'vendor']:
        if not os.path.exists(d): continue
        for t in all_targets:
            dest_dir = os.path.join(t, d)
            os.makedirs(dest_dir, exist_ok=True)
            for root, _, files in os.walk(d):
                rel_path = os.path.relpath(root, d)
                target_sub = dest_dir if rel_path == '.' else os.path.join(dest_dir, rel_path)
                os.makedirs(target_sub, exist_ok=True)
                for file in files:
                    shutil.copy2(os.path.join(root, file), os.path.join(target_sub, file))

    # Downloads directory: ONLY for web hosting targets (NOT inside the APK!)
    web_targets = ['jchatt_web_v2/dist', 'dist']
    if os.path.exists('downloads'):
        for wt in web_targets:
            dest_dir = os.path.join(wt, 'downloads')
            os.makedirs(dest_dir, exist_ok=True)
            for file in os.listdir('downloads'):
                shutil.copy2(os.path.join('downloads', file), os.path.join(dest_dir, file))
            print(f"Synced downloads/ -> {dest_dir}/")

    print("\n✅ All assets synced cleanly!")

if __name__ == '__main__':
    sync_assets()
