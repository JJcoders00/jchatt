import os
import shutil

src = r"jchatt_web_v2/android/app/build/outputs/apk/debug/app-debug.apk"
if not os.path.exists(src):
    print(f"Error: {src} does not exist!")
    exit(1)

size_mb = os.path.getsize(src) / (1024 * 1024)
print(f"Built APK Size: {size_mb:.2f} MB")

targets = [
    r"docs/app-debug.apk",
    r"docs/Jchatt.apk",
    r"app-debug.apk",
    r"Jchatt.apk",
    r"dist/app-debug.apk",
    r"dist/Jchatt.apk",
    r"downloads/jchatt-v2.0.apk",
    r"jchatt_web_v2/dist/downloads/jchatt-v2.0.apk",
    r"dist/downloads/jchatt-v2.0.apk"
]

for t in targets:
    os.makedirs(os.path.dirname(t) if os.path.dirname(t) else ".", exist_ok=True)
    shutil.copy2(src, t)
    print(f"Copied {src} -> {t}")

print("APK distribution complete!")
