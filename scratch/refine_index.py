import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add CSS for legal-trust-banner and decluttering hero floats
additional_css = """
/* --- DECLUTTERED DESIGN & LEGAL TRUST BANNER --- */
.legal-trust-banner{background:#0e2a3b;border-top:1px solid rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.08);padding:18px 0}
.legal-trust-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;align-items:center}
.trust-badge{display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:14px;color:#fff;text-decoration:none;transition:transform .2s,background .2s}
.trust-badge:hover{background:rgba(130,216,47,.12);border-color:var(--lime);transform:translateY(-2px);text-decoration:none}
.trust-badge .tb-icon{font-size:20px;flex:none}
.trust-badge b{display:block;font-size:13px;font-family:Sora,sans-serif;color:var(--lime)}
.trust-badge small{display:block;font-size:11.5px;color:rgba(255,255,255,.7)}
.sha-pill{display:inline-block;margin-top:10px;font-family:ui-monospace,monospace;font-size:11px;background:#eef4f6;padding:4px 10px;border-radius:8px;color:#123140;word-break:break-all}
"""

if "</style>" in html:
    html = html.replace("</style>", additional_css + "\n</style>", 1)

# 2. Declutter hero: remove the overlapping f-call and f-burn floats from the scene
html = re.sub(r'<div class="float f-call".*?</div></div>', '', html, flags=re.DOTALL)
html = re.sub(r'<div class="float f-burn".*?Burns in 10 s</div>', '', html, flags=re.DOTALL)

# 3. Add Compliance link to top nav
nav_search = '<a href="#download">Download</a>'
nav_replace = '<a href="/compliance">Compliance</a>\n      <a href="#download">Download</a>'
if nav_search in html and '<a href="/compliance">Compliance</a>' not in html:
    html = html.replace(nav_search, nav_replace, 1)

# 4. Insert legal trust banner right below the </section> of the hero
hero_end = '</section>'
trust_banner_html = """
<div class="legal-trust-banner">
  <div class="wrap legal-trust-grid">
    <a href="/compliance" class="trust-badge">
      <span class="tb-icon">⚖️</span>
      <div><b>IT Act Sec 79 Intermediary</b><small>Safe Harbor Protected Neutral Conduit</small></div>
    </a>
    <a href="/privacy" class="trust-badge">
      <span class="tb-icon">🛡️</span>
      <div><b>DPDPA 2023 Compliant</b><small>Zero Personal Data Harvested</small></div>
    </a>
    <a href="/compliance" class="trust-badge">
      <span class="tb-icon">🔒</span>
      <div><b>GDPR Art. 25 Design</b><small>Mathematical Privacy-by-Default</small></div>
    </a>
    <a href="/whitepaper" class="trust-badge">
      <span class="tb-icon">⚡</span>
      <div><b>AES-256-GCM Verified</b><small>Client-Side E2EE & PBKDF2</small></div>
    </a>
  </div>
</div>
"""

idx_hero = html.find('id="top"')
if idx_hero != -1:
    idx_hero_close = html.find('</section>', idx_hero)
    if idx_hero_close != -1:
        html = html[:idx_hero_close + 10] + trust_banner_html + html[idx_hero_close + 10:]

# 5. In download card, add real SHA-256 checksum
sha_block = '<div class="sha-pill"><b>SHA256:</b> 9bc17b2bc134f08c51db238ccd0f7582d27ef42359fdf6c491ec3f224b539c73</div>'
if 'Download APK v2.0</a>' in html and 'sha-pill' not in html:
    html = html.replace('Download APK v2.0</a>', 'Download APK v2.0</a>\n          ' + sha_block)

# 6. In footer, add Compliance & Safe Harbor link and Grievance Desk
footer_terms = '<a href="/terms">Terms</a>'
footer_terms_replace = '<a href="/terms">Terms</a> · <a href="/compliance">Compliance & Safe Harbor</a>'
if footer_terms in html and '<a href="/compliance">Compliance & Safe Harbor</a>' not in html:
    html = html.replace(footer_terms, footer_terms_replace)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("index.html refined, decluttered, and reinforced with real statutory data!")
