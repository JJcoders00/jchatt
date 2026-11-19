with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
# Find all <section> or <div class="band"> or major blocks
blocks = re.findall(r'<(section|div)\s+(?:id="([^"]+)"|class="([^"]+)")', text)
for tag, id_attr, class_attr in blocks[:25]:
    print(f"{tag}: id='{id_attr}' class='{class_attr}'")
