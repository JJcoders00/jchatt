import re

for fname in ['js/screens-core.js', 'js/screens-extra.js']:
    t = open(fname, encoding='utf-8').read()
    matches = re.findall(r'SCREENS\[["\']([^"\']+)["\']\]', t)
    print(fname, len(matches), 'screens:')
    print(matches[:30])
