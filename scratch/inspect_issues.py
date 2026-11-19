with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
calc_html = re.findall(r'<div[^>]*id="calc"[^>]*>.*?</div>\s*</div>', text, re.DOTALL)
print('Calc buttons found:')
if calc_html:
    buttons = re.findall(r'<button[^>]*data-k="([^"]*)"[^>]*>(.*?)</button>', calc_html[0])
    for k, label in buttons:
        print(f"data-k='{k}' label='{label}'")

print('\n--- Privacy Policy text search ---')
with open('privacy.html', 'r', encoding='utf-8') as f:
    ptext = f.read()
print('Has DPDPA 2023:', 'DPDPA 2023' in ptext)
print('Has GDPR:', 'GDPR' in ptext)
print('Has phone matches:', re.findall(r'.{0,30}phone.{0,30}', ptext, re.IGNORECASE)[:5])
