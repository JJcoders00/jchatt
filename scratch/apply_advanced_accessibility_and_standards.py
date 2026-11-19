import re

def polish_advanced():
    # --- dist/index.html ---
    with open("dist/index.html", "r", encoding="utf-8") as f:
        idx = f.read()

    # 1. Skip to content link
    if 'class="skip-link"' not in idx:
        idx = idx.replace('<body>', '<body>\n  <a href="#main-content" class="skip-link">Skip to main content</a>')
        idx = idx.replace('<main>', '<main id="main-content">')

    # Skip link CSS and focus styles
    a11y_css = """
    /* Accessibility & Focus Polish */
    .skip-link {
      position: absolute;
      top: -40px;
      left: 16px;
      background: var(--emerald);
      color: #070a0e;
      padding: 8px 16px;
      font-weight: 700;
      border-radius: 4px;
      z-index: 9999;
      transition: top 0.2s ease;
      text-decoration: none;
    }
    .skip-link:focus {
      top: 16px;
    }
    :focus-visible {
      outline: 2px solid var(--emerald);
      outline-offset: 3px;
      border-radius: var(--radius-sm);
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
    .hero-trust-caption {
      font-size: 13px;
      color: var(--text-sub);
      margin-top: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
"""
    if '.skip-link {' not in idx:
        idx = idx.replace('/* Utility / Buttons */', a11y_css + '\n    /* Utility / Buttons */')

    # 2. Add standard background-clip: text;
    idx = idx.replace('-webkit-background-clip: text;', '-webkit-background-clip: text;\n    background-clip: text;')

    # 3. Add -moz-osx-font-smoothing: grayscale;
    idx = idx.replace('-webkit-font-smoothing: antialiased;', '-webkit-font-smoothing: antialiased;\n    -moz-osx-font-smoothing: grayscale;')

    # 4. Add safe area insets to header and footer
    idx = idx.replace('padding: 16px 24px;', 'padding: max(16px, env(safe-area-inset-top)) 24px 16px 24px;')

    # 5. Add micro trust caption under hero buttons
    if 'class="hero-trust-caption"' not in idx:
        idx = idx.replace(
            '</div>\n      <div class="hero-guarantees">',
            '</div>\n      <p class="hero-trust-caption">⚡ No account creation required · Instant browser launch · Zero telemetry</p>\n      <div class="hero-guarantees">'
        )

    # 6. Add GitHub link to navigation and footer
    if 'https://github.com/JJcoders00/jchatt' not in idx:
        idx = idx.replace(
            '<a href="./whitepaper.html">Whitepaper</a>',
            '<a href="./whitepaper.html">Whitepaper</a>\n        <a href="https://github.com/JJcoders00/jchatt" target="_blank" rel="noopener noreferrer">GitHub</a>'
        )
        idx = idx.replace(
            '<li><a href="./whitepaper.html">Whitepaper (Security Spec)</a></li>',
            '<li><a href="./whitepaper.html">Whitepaper (Security Spec)</a></li>\n          <li><a href="https://github.com/JJcoders00/jchatt" target="_blank" rel="noopener noreferrer">Source Code (GitHub)</a></li>'
        )

    # 7. Update FAQ h4 to h3
    idx = idx.replace('<div class="faq-card">\n          <h4>', '<div class="faq-card">\n          <h3>')
    idx = idx.replace('</h4>\n          <p>', '</h3>\n          <p>')
    idx = idx.replace('.faq-card h4 {', '.faq-card h3 {')

    # 8. Comparison table th scopes
    idx = idx.replace('<th>Privacy Parameter</th>', '<th scope="col">Privacy Parameter</th>')
    idx = idx.replace('<th>JChatt 2.0</th>', '<th scope="col">JChatt 2.0</th>')
    idx = idx.replace('<th>Signal</th>', '<th scope="col">Signal</th>')
    idx = idx.replace('<th>Telegram</th>', '<th scope="col">Telegram</th>')
    idx = idx.replace('<th>WhatsApp</th>', '<th scope="col">WhatsApp</th>')

    # Replace parameter cells with <th scope="row">
    idx = re.sub(r'<tr>\s*<td><strong>(.*?)</strong></td>', r'<tr>\n            <th scope="row"><strong>\1</strong></th>', idx)

    # 9. Decorative SVG aria-hidden
    idx = idx.replace('<svg viewBox="0 0 24 24" class="guarantee-icon">', '<svg viewBox="0 0 24 24" class="guarantee-icon" aria-hidden="true" focusable="false">')
    idx = idx.replace('<svg viewBox="0 0 24 24" width="22" height="22">', '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">')

    with open("dist/index.html", "w", encoding="utf-8") as f:
        f.write(idx)

    # --- dist/honors.html ---
    with open("dist/honors.html", "r", encoding="utf-8") as f:
        hon = f.read()

    if 'class="skip-link"' not in hon:
        hon = hon.replace('<body>', '<body>\n  <a href="#main-content" class="skip-link">Skip to main content</a>')
        hon = hon.replace('<main>', '<main id="main-content">')

    if '.skip-link {' not in hon:
        hon = hon.replace('/* Utility / Buttons */', a11y_css + '\n    /* Utility / Buttons */')

    hon = hon.replace('-webkit-background-clip: text;', '-webkit-background-clip: text;\n    background-clip: text;')
    hon = hon.replace('-webkit-font-smoothing: antialiased;', '-webkit-font-smoothing: antialiased;\n    -moz-osx-font-smoothing: grayscale;')
    hon = hon.replace('padding: 16px 24px;', 'padding: max(16px, env(safe-area-inset-top)) 24px 16px 24px;')

    if 'https://github.com/JJcoders00/jchatt' not in hon:
        hon = hon.replace(
            '<a href="./whitepaper.html">Whitepaper</a>',
            '<a href="./whitepaper.html">Whitepaper</a>\n        <a href="https://github.com/JJcoders00/jchatt" target="_blank" rel="noopener noreferrer">GitHub</a>'
        )
        hon = hon.replace(
            '<li><a href="./whitepaper.html">Whitepaper (Security Architecture)</a></li>',
            '<li><a href="./whitepaper.html">Whitepaper (Security Architecture)</a></li>\n          <li><a href="https://github.com/JJcoders00/jchatt" target="_blank" rel="noopener noreferrer">Source Code (GitHub)</a></li>'
        )

    # Tribute card SVGs aria-hidden
    hon = hon.replace('<svg viewBox="0 0 24 24" width="22" height="22">', '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">')

    with open("dist/honors.html", "w", encoding="utf-8") as f:
        f.write(hon)

    print("Advanced polish applied to dist/index.html and dist/honors.html!")

if __name__ == "__main__":
    polish_advanced()
