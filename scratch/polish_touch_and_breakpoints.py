def polish_touch():
    # 1. dist/index.html
    with open("dist/index.html", "r", encoding="utf-8") as f:
        idx = f.read()

    # Expand touch targets to 44px
    touch_css = """
    /* WCAG 2.2 / Apple HIG 44px Touch Targets */
    .brand-link {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
    }
    .footer-links a {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 8px 12px;
      color: var(--text-sub);
    }
    @media (max-width: 480px) {
      .hero-cta-group, .cta-buttons {
        flex-direction: column;
        width: 100%;
      }
      .hero-cta-group a, .cta-buttons a {
        width: 100%;
        justify-content: center;
        box-sizing: border-box;
      }
      .honors-banner {
        padding: 24px 18px;
      }
    }
"""
    if '/* WCAG 2.2 / Apple HIG 44px Touch Targets */' not in idx:
        idx = idx.replace('/* Utility / Buttons */', touch_css + '\n    /* Utility / Buttons */')

    with open("dist/index.html", "w", encoding="utf-8") as f:
        f.write(idx)

    # 2. dist/honors.html
    with open("dist/honors.html", "r", encoding="utf-8") as f:
        hon = f.read()

    # Unify nav collapse at 900px instead of 768px
    hon = hon.replace('@media (max-width: 768px) {\n      .honorees-grid {', '@media (max-width: 900px) {\n      .nav-links {\n        display: none;\n      }\n    }\n    @media (max-width: 768px) {\n      .honorees-grid {')
    hon = hon.replace('/* Utility / Buttons */', touch_css + '\n    /* Utility / Buttons */')

    with open("dist/honors.html", "w", encoding="utf-8") as f:
        f.write(hon)

    print("Touch targets and unified 900px breakpoints polished!")

if __name__ == "__main__":
    polish_touch()
