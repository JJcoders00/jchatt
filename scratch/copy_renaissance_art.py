import shutil
import os

src = r"C:\Users\jomet\.gemini\antigravity\brain\13e0be15-0669-4013-a057-991a68222973\renaissance_sublime_sunset_cliff_1795104764537.jpg"

targets = [
    "dist/images/honors/renaissance_sky.jpg",
    "jchatt_web_v2/dist/images/honors/renaissance_sky.jpg",
    "Images/honors/renaissance_sky.jpg",
    "public/images/honors/renaissance_sky.jpg",
    "jchatt_web_v2/public/images/honors/renaissance_sky.jpg",
]

for dst in targets:
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(src, dst)
    print(f"Copied to {dst}")

print("Image copied successfully!")
