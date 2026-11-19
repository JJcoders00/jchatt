with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
styles = re.findall(r'<style>(.*?)</style>', text, re.DOTALL)
print('Styles length:', len(styles[0]) if styles else 0)

# Check hero section
hero = re.findall(r'<header[^>]*>.*?</header>', text, re.DOTALL)
print('Header length:', len(hero[0]) if hero else 0)

main = re.findall(r'<main[^>]*>(.*?)</main>', text, re.DOTALL)
print('Main content length:', len(main[0]) if main else 0)
