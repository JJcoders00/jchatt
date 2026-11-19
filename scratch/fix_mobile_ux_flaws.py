def fix_mobile_ux():
    # 1. dist/index.html
    with open("dist/index.html", "r", encoding="utf-8") as f:
        idx = f.read()

    # Fix .faq-grid minmax from 460px to 280px
    idx = idx.replace('grid-template-columns: repeat(auto-fit, minmax(460px, 1fr));', 'grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));')

    # Fix .honors-banner mini-honoree wrapper wrap
    idx = idx.replace('display: flex;\n      align-items: center;\n      gap: 16px;', 'display: flex;\n      align-items: center;\n      gap: 16px;\n      flex-wrap: wrap;')

    # Fix footer link touch targets
    idx = idx.replace('.footer-links a {\n      color: var(--text-sub);', '.footer-links a {\n      display: inline-block;\n      padding: 6px 4px;\n      min-height: 36px;\n      color: var(--text-sub);')

    with open("dist/index.html", "w", encoding="utf-8") as f:
        f.write(idx)

    # 2. dist/honors.html
    with open("dist/honors.html", "r", encoding="utf-8") as f:
        hon = f.read()

    # Fix .tribute-grid minmax
    hon = hon.replace('grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));', 'grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));')
    hon = hon.replace('grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));', 'grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));')

    # Fix footer link touch targets
    hon = hon.replace('.footer-links a {\n      color: var(--text-sub);', '.footer-links a {\n      display: inline-block;\n      padding: 6px 4px;\n      min-height: 36px;\n      color: var(--text-sub);')

    with open("dist/honors.html", "w", encoding="utf-8") as f:
        f.write(hon)

    print("Mobile UX flaws successfully patched!")

if __name__ == "__main__":
    fix_mobile_ux()
