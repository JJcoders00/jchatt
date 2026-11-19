import re

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

sections = re.findall(r'<section[^>]*id=["\']([^"\']+)["\']', text)
print('Section IDs:', sections)

h2s = re.findall(r'<h2[^>]*>(.*?)</h2>', text, re.DOTALL)
print('\nH2 Headings:')
for h in h2s:
    clean = re.sub(r'<[^>]+>', '', h).strip()
    print(' -', clean)
