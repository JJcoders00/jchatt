import re

uploaded_path = r"C:\Users\jomet\.gemini\antigravity\brain\13e0be15-0669-4013-a057-991a68222973\.user_uploaded\media_1794844749620_d4b4d9ea.html"
with open(uploaded_path, "r", encoding="utf-8") as f:
    html = f.read()

hrefs = sorted(set(re.findall(r'href=["\']([^"\']+)["\']', html)))
print("HREFS:")
for h in hrefs:
    print(" ", h)

srcs = sorted(set(re.findall(r'src=["\']([^"\']+)["\']', html)))
print("\nSRCS:")
for s in srcs:
    print(" ", s)
