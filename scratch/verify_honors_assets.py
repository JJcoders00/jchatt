import os

images_to_check = [
    "dist/images/honors/renaissance_sky.jpg",
    "dist/images/honors/renaissance_atmosphere.jpg",
    "dist/images/honors/sree_vinayak.jpg",
    "dist/images/honors/jackson_wright.jpg",
    "dist/images/logo1.png",
]

for img in images_to_check:
    if os.path.exists(img):
        print(f"PASS: {img} exists ({os.path.getsize(img)} bytes)")
    else:
        print(f"FAIL: {img} DOES NOT EXIST!")

with open("dist/honors.html", "r", encoding="utf-8") as f:
    hon = f.read()

print("honors.html character count:", len(hon))
assert "Sree Vinayak" in hon
assert "Jackson Wright" in hon
assert "renaissance_sky.jpg" in hon
print("All assertions passed!")
