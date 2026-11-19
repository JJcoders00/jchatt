with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
calc_part = text[text.find('id="calc"'):text.find('id="calc"')+1000]
print(calc_part)
