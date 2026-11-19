import re

def polish_index_html():
    path = "dist/index.html"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Update Google Fonts link to include JetBrains Mono 800 and drop unused 300
    old_font = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap'
    new_font = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap'
    content = content.replace(old_font, new_font)

    # 2. Add Twitter Card meta tags if missing
    if '<meta name="twitter:card"' not in content:
        twitter_meta = """    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="JChatt | Sovereign End-to-End Encrypted Private Messenger">
    <meta name="twitter:description" content="No phone numbers. No SIM cards. Zero metadata retention. BIP-39 mnemonic identity with direct peer-to-peer encryption.">
    <meta name="twitter:image" content="./images/mockups/promo_banner_1024x500.png">
"""
        content = re.sub(r'(<meta property="og:image"[^>]+>)', r'\1\n' + twitter_meta, content)

    # 3. Elevate --text-sub to #8292a4 for WCAG AA contrast compliance
    content = content.replace('--text-sub: #64748b;', '--text-sub: #8292a4;')

    # 4. Refine mobile fluid clamp on hero title & subtitle
    content = content.replace(
        'font-size: clamp(38px, 4.8vw, 56px);\n    line-height: 1.12;\n    letter-spacing: -0.03em;',
        'font-size: clamp(28px, 4.5vw, 54px);\n    line-height: 1.16;\n    letter-spacing: -0.025em;'
    )

    # 5. Add styling for <code> tags
    code_css = """
    code {
      font-family: var(--font-mono);
      font-size: 0.88em;
      background: rgba(0, 168, 132, 0.12);
      color: var(--emerald);
      padding: 2px 7px;
      border-radius: 5px;
      border: 1px solid rgba(0, 168, 132, 0.25);
      font-weight: 600;
    }
"""
    if 'code {' not in content:
        content = content.replace('/* Utility / Buttons */', code_css + '\n    /* Utility / Buttons */')

    # 6. Tactile chamfer on buttons
    content = content.replace(
        'box-shadow: 0 4px 14px var(--emerald-glow);',
        'box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 4px 14px var(--emerald-glow);'
    )
    content = content.replace(
        'box-shadow: 0 4px 14px var(--gold-glow);',
        'box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 4px 14px var(--gold-glow);'
    )

    # 7. Add specular top-light rails to .bento-card
    bento_specular = """
    .bento-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
      opacity: 0.6;
      transition: all 0.3s ease;
      pointer-events: none;
    }
    .bento-card:hover::before {
      background: linear-gradient(90deg, transparent, var(--emerald), transparent);
      opacity: 1;
    }
"""
    if '.bento-card::before' not in content:
        content = content.replace('.bento-card:hover {', bento_specular + '\n    .bento-card:hover {')

    # 8. Comparison Table Sticky First Column on Mobile
    sticky_col_css = """
    .matrix-table th:first-child,
    .matrix-table td:first-child {
      position: sticky;
      left: 0;
      background: var(--surface-card);
      z-index: 2;
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.35);
    }
    .matrix-table tr:hover td:first-child {
      background: var(--surface-hover);
    }
"""
    if '.matrix-table th:first-child' not in content:
        content = content.replace('.matrix-table td {', sticky_col_css + '\n    .matrix-table td {')

    # 9. Mobile Header Compact Launch CTA
    mobile_btn_css = """
    .mobile-header-launch {
      display: none;
      padding: 7px 14px;
      font-size: 13px;
      font-weight: 600;
      color: #070a0e;
      background: var(--emerald);
      border-radius: 999px;
      text-decoration: none;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 2px 8px var(--emerald-glow);
    }
    @media (max-width: 900px) {
      .mobile-header-launch {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
    }
"""
    if '.mobile-header-launch' not in content:
        content = content.replace('/* Mobile Overrides */', mobile_btn_css + '\n    /* Mobile Overrides */')

    # Insert mobile-header-launch in <header>
    if 'class="mobile-header-launch"' not in content:
        content = content.replace(
            '<div class="nav-actions">',
            '<a href="./web" class="mobile-header-launch"><span>Launch</span> →</a>\n      <div class="nav-actions">'
        )

    # 10. Width/height and lazy loading on spotlight mini avatars
    content = content.replace(
        '<img src="./images/honors/sree_vinayak.jpg" alt="Sree Vinayak K. Praveen" class="avatar-mini">',
        '<img src="./images/honors/sree_vinayak.jpg" alt="Sree Vinayak K. Praveen" class="avatar-mini" width="32" height="32" loading="lazy">'
    )
    content = content.replace(
        '<img src="./images/honors/jackson_wright.jpg" alt="Jackson Wright" class="avatar-mini">',
        '<img src="./images/honors/jackson_wright.jpg" alt="Jackson Wright" class="avatar-mini" width="32" height="32" loading="lazy">'
    )

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("dist/index.html polished successfully!")

def polish_honors_html():
    path = "dist/honors.html"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Update Google Fonts link
    old_font = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap'
    new_font = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap'
    content = content.replace(old_font, new_font)

    # 2. Token Normalization
    content = content.replace('--surface-elevated: #131b24;', '--surface-elevated: #16202c;')
    content = content.replace('--surface-hover: #1a2532;', '--surface-hover: #1c2938;')
    content = content.replace('--text-sub: #64748b;', '--text-sub: #8292a4;')

    # 3. Add aria-label="Verified Contributor" to verified badges
    content = content.replace(
        '<span class="verified-badge" title="Visionary Contributor">★</span>',
        '<span class="verified-badge" title="Visionary Contributor" aria-label="Verified Contributor">★</span>'
    )
    content = content.replace(
        '<span class="verified-badge" title="Lead Engineering Contributor">★</span>',
        '<span class="verified-badge" title="Lead Engineering Contributor" aria-label="Verified Contributor">★</span>'
    )

    # 4. Fluid typography for Hero and CTA in honors
    content = content.replace(
        'font-size: clamp(34px, 5vw, 52px);\n    line-height: 1.15;',
        'font-size: clamp(26px, 4.2vw, 48px);\n    line-height: 1.18;'
    )
    content = content.replace(
        '.cta-card h3 {\n    font-size: 28px;',
        '.cta-card h3 {\n    font-size: clamp(22px, 3.5vw, 30px);'
    )

    # 5. Tag item font size floor
    content = content.replace('font-size: 11.5px;', 'font-size: 12.5px;')

    # 6. Tactile chamfer on buttons
    content = content.replace(
        'box-shadow: 0 4px 14px var(--emerald-glow);',
        'box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 4px 14px var(--emerald-glow);'
    )
    content = content.replace(
        'box-shadow: 0 4px 16px var(--gold-glow);',
        'box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 4px 16px var(--gold-glow);'
    )

    # 7. Add mobile-header-launch in <header>
    mobile_btn_css = """
    .mobile-header-launch {
      display: none;
      padding: 7px 14px;
      font-size: 13px;
      font-weight: 600;
      color: #070a0e;
      background: var(--emerald);
      border-radius: 999px;
      text-decoration: none;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 2px 8px var(--emerald-glow);
    }
    @media (max-width: 900px) {
      .mobile-header-launch {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
    }
"""
    if '.mobile-header-launch' not in content:
        content = content.replace('/* Mobile Overrides */', mobile_btn_css + '\n    /* Mobile Overrides */')

    if 'class="mobile-header-launch"' not in content:
        content = content.replace(
            '<div class="nav-actions">',
            '<a href="./web" class="mobile-header-launch"><span>Launch</span> →</a>\n      <div class="nav-actions">'
        )

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("dist/honors.html polished successfully!")

if __name__ == "__main__":
    polish_index_html()
    polish_honors_html()
