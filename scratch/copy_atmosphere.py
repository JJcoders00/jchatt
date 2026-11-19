import shutil
import os

src = r"C:\Users\jomet\.gemini\antigravity\brain\13e0be15-0669-4013-a057-991a68222973\renaissance_celestial_atmosphere_1795104797872.jpg"

targets = [
    "dist/images/honors/renaissance_atmosphere.jpg",
    "jchatt_web_v2/dist/images/honors/renaissance_atmosphere.jpg",
    "Images/honors/renaissance_atmosphere.jpg",
    "public/images/honors/renaissance_atmosphere.jpg",
    "jchatt_web_v2/public/images/honors/renaissance_atmosphere.jpg",
]

for dst in targets:
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(src, dst)
    print(f"Copied to {dst}")

print("Atmosphere copied successfully!")
