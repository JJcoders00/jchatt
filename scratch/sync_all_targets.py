import shutil
import os

files_to_sync = [
    ("dist/index.html", ["jchatt_web_v2/dist/index.html", "index.html"]),
    ("dist/honors.html", ["jchatt_web_v2/dist/honors.html", "honors.html"]),
]

dirs_to_sync = [
    ("dist/images/honors", ["jchatt_web_v2/dist/images/honors", "Images/honors", "public/images/honors", "jchatt_web_v2/public/images/honors"]),
]

for src, dsts in files_to_sync:
    for dst in dsts:
        os.makedirs(os.path.dirname(dst) if os.path.dirname(dst) else ".", exist_ok=True)
        shutil.copy2(src, dst)
        print(f"Copied {src} -> {dst}")

for src, dsts in dirs_to_sync:
    for dst in dsts:
        os.makedirs(dst, exist_ok=True)
        for item in os.listdir(src):
            s = os.path.join(src, item)
            d = os.path.join(dst, item)
            if os.path.isfile(s):
                shutil.copy2(s, d)
                print(f"Copied {s} -> {d}")

print("Sync completed successfully!")
