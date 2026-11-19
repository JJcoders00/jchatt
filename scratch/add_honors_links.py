import os

pages = ['dist/compliance.html', 'dist/privacy.html', 'dist/terms.html', 'dist/whitepaper.html']
for p in pages:
    if os.path.exists(p):
        with open(p, 'r', encoding='utf-8') as f:
            c = f.read()
        if 'honors.html' not in c:
            c = c.replace('Compliance</a>', 'Compliance</a>\n          <a href="./honors.html">Honors</a>')
            c = c.replace('<li><a href="./compliance.html">Compliance</a></li>', '<li><a href="./compliance.html">Compliance</a></li>\n          <li><a href="./honors.html">Honors</a></li>')
            with open(p, 'w', encoding='utf-8') as f:
                f.write(c)
            root_p = os.path.basename(p)
            with open(root_p, 'w', encoding='utf-8') as f:
                f.write(c)
            v2_p = os.path.join('jchatt_web_v2', p)
            with open(v2_p, 'w', encoding='utf-8') as f:
                f.write(c)
            print('Updated Honors link in', p)
print('Done updating honors links.')
