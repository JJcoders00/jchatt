with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
sections = re.findall(r'<section\s+id="([^"]+)"[^>]*>(.*?)</section>', text, re.DOTALL)
for sid, scontent in sections:
    print(f"=== SECTION #{sid} ({len(scontent)} chars) ===")
    lines = [l.strip() for l in scontent.splitlines() if l.strip()]
    for l in lines[:6]:
        print("  ", l[:100])
