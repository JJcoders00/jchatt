with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.findall(r'(\.scene[^{]*\{[^}]+\}|\.float[^{]*\{[^}]+\}|\.f-id[^{]*\{[^}]+\}|\.hero-grid[^{]*\{[^}]+\})', text)
for m in matches:
    print(m)
    print('-'*40)
