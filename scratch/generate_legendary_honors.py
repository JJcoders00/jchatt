import os

def generate_legendary_honors():
    html_content = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>The Archive of Sovereignty · Special Honors & Recognition · JChatt</title>
  <meta name="description" content="Dedicated to Sree Vinayak K. Praveen, Jackson Wright, and the cypherpunk visionaries whose ideas and craft made the all-new private JChatt messenger a reality.">
  <meta name="theme-color" content="#120805">

  <!-- OpenGraph & Twitter Cards -->
  <meta property="og:title" content="The Archive of Sovereignty · JChatt Honors">
  <meta property="og:description" content="Honoring Sree Vinayak K. Praveen, Jackson Wright, and the innovators behind sovereign private messaging.">
  <meta property="og:image" content="./images/honors/sree_vinayak.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="./images/honors/sree_vinayak.jpg">

  <link rel="icon" href="./favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;800;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,600;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

  <style>
    :root {
      --bg-dark: #120805;
      --bg-terracotta: #1c0c08;
      --bg-card: rgba(28, 14, 10, 0.72);
      --bg-card-elevated: #24110b;
      --gold-primary: #dfb15b;
      --gold-bright: #f5d488;
      --gold-muted: #9e7d3b;
      --gold-border: rgba(223, 177, 91, 0.32);
      --emerald-accent: #00a884;
      --emerald-border: rgba(0, 168, 132, 0.35);
      --text-hero: #fcf8f2;
      --text-body: #d6cbbe;
      --text-muted: #9c8e82;
      --font-display: 'Cinzel', Georgia, serif;
      --font-serif: 'Cormorant Garamond', Georgia, serif;
      --font-sans: 'Plus Jakarta Sans', -apple-system, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      background-color: var(--bg-dark);
      color: var(--text-body);
      font-family: var(--font-sans);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      overflow-x: hidden;
      min-height: 100vh;
      selection-background-color: var(--gold-primary);
    }

    ::selection {
      background: var(--gold-primary);
      color: #120805;
    }

    /* Accessibility Skip Link */
    .skip-link {
      position: absolute;
      top: -40px;
      left: 16px;
      background: var(--gold-primary);
      color: #120805;
      padding: 8px 16px;
      font-weight: 700;
      border-radius: 4px;
      z-index: 9999;
      transition: top 0.2s ease;
      text-decoration: none;
      font-size: 13px;
    }
    .skip-link:focus {
      top: 16px;
    }

    /* Atmospheric Masterpiece Masthead */
    header.site-masthead {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
      padding: max(20px, env(safe-area-inset-top)) 36px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      mix-blend-mode: normal;
      background: linear-gradient(180deg, rgba(18, 8, 5, 0.85) 0%, rgba(18, 8, 5, 0) 100%);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }

    .masthead-brand {
      display: flex;
      flex-direction: column;
      text-decoration: none;
      color: var(--text-hero);
    }

    .masthead-title {
      font-family: var(--font-display);
      font-size: 14px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--text-hero);
    }

    .masthead-subtitle {
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.18em;
      color: var(--gold-primary);
      text-transform: uppercase;
      margin-top: 2px;
    }

    .masthead-center-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      font-family: var(--font-mono);
      font-size: 11px;
      color: rgba(255, 255, 255, 0.7);
      letter-spacing: 0.15em;
    }

    .masthead-center-indicator span {
      line-height: 1;
    }

    .masthead-indicator-arrow {
      width: 1px;
      height: 14px;
      background: var(--gold-primary);
      margin: 3px 0;
      opacity: 0.8;
    }

    .masthead-actions {
      display: flex;
      align-items: center;
      gap: 18px;
    }

    .nav-text-link {
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      font-size: 12px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-family: var(--font-sans);
      transition: color 0.2s ease;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
    }
    .nav-text-link:hover {
      color: var(--gold-bright);
    }

    .oval-capsule-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 20px;
      border: 1px solid var(--gold-border);
      border-radius: 999px;
      color: var(--gold-bright);
      text-decoration: none;
      font-size: 11.5px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-family: var(--font-sans);
      font-weight: 600;
      background: rgba(28, 12, 8, 0.45);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: all 0.3s ease;
      min-height: 44px;
    }
    .oval-capsule-btn:hover {
      background: var(--gold-primary);
      color: #120805;
      border-color: var(--gold-primary);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(223, 177, 91, 0.3);
    }

    /* HERO SECTION: Fine Art Renaissance Painted Canvas */
    .hero-gallery-canvas {
      position: relative;
      width: 100%;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      padding: 140px 24px 80px;
      overflow: hidden;
      background: #140906;
    }

    .hero-painting-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
      filter: saturate(1.15) contrast(1.08) brightness(0.92);
      z-index: 1;
    }

    /* Dramatic Chiaroscuro Gradient Overlays */
    .hero-vignette {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        radial-gradient(ellipse at 50% 30%, transparent 20%, rgba(18, 8, 5, 0.55) 75%, #120805 100%),
        linear-gradient(180deg, rgba(18, 8, 5, 0.4) 0%, transparent 35%, rgba(18, 8, 5, 0.8) 85%, #120805 100%);
      z-index: 2;
      pointer-events: none;
    }

    .hero-center-monument {
      position: relative;
      z-index: 3;
      text-align: center;
      max-width: 1100px;
      margin: 0 auto 40px;
    }

    .hero-epoch-stamp {
      font-family: var(--font-display);
      font-size: 13px;
      letter-spacing: 0.35em;
      text-transform: uppercase;
      color: var(--gold-primary);
      margin-bottom: 18px;
      opacity: 0.95;
    }

    .hero-monumental-title {
      font-family: var(--font-display);
      font-size: clamp(48px, 9.5vw, 130px);
      font-weight: 400;
      line-height: 0.95;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--text-hero);
      text-shadow: 0 10px 40px rgba(0, 0, 0, 0.85), 0 2px 10px rgba(0, 0, 0, 0.6);
      margin-bottom: 24px;
    }

    .hero-monumental-title span {
      display: block;
      font-weight: 300;
      letter-spacing: 0.08em;
      font-style: italic;
      font-family: var(--font-serif);
      font-size: 0.92em;
      color: #fff9f0;
    }

    /* Metadata Footer Strip in Hero */
    .hero-meta-strip {
      position: relative;
      z-index: 3;
      width: 100%;
      max-width: 1240px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: 0.15em;
      color: rgba(255, 255, 255, 0.65);
      border-top: 1px solid rgba(223, 177, 91, 0.2);
      padding-top: 20px;
      margin-top: 20px;
    }

    .hero-meta-strip a {
      color: rgba(255, 255, 255, 0.65);
      text-decoration: none;
      transition: color 0.2s ease;
    }
    .hero-meta-strip a:hover {
      color: var(--gold-bright);
    }

    /* THE EDITORIAL MANIFESTO SECTION (REPRODUCING THE "GOOD MOVE" AESTHETIC) */
    .manifesto-section {
      position: relative;
      background: linear-gradient(180deg, #120805 0%, #1a0a06 50%, #150805 100%);
      padding: 120px 24px 140px;
      text-align: center;
      overflow: hidden;
    }

    .manifesto-section::before {
      content: '';
      position: absolute;
      top: -150px;
      left: 50%;
      transform: translateX(-50%);
      width: 800px;
      height: 400px;
      background: radial-gradient(circle, rgba(223, 177, 91, 0.14) 0%, transparent 70%);
      pointer-events: none;
    }

    .manifesto-container {
      max-width: 960px;
      margin: 0 auto;
      position: relative;
      z-index: 2;
    }

    .manifesto-lead-kicker {
      font-family: var(--font-display);
      font-size: 13px;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: var(--gold-primary);
      margin-bottom: 28px;
    }

    .manifesto-quote {
      font-family: var(--font-serif);
      font-size: clamp(34px, 5.2vw, 68px);
      font-weight: 300;
      line-height: 1.15;
      color: #fff9f0;
      letter-spacing: -0.015em;
      margin-bottom: 40px;
      text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    }

    .manifesto-quote .bold-name {
      font-weight: 600;
      font-style: normal;
      color: var(--gold-bright);
      font-family: var(--font-display);
      letter-spacing: 0.02em;
    }

    .manifesto-quote .italic-phrase {
      font-style: italic;
      color: #ede2d3;
    }

    .manifesto-action-wrap {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-top: 36px;
    }

    .manifesto-oval-btn {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 16px 36px;
      border: 1px solid rgba(223, 177, 91, 0.4);
      border-radius: 999px;
      color: #fff9f0;
      background: rgba(30, 14, 10, 0.5);
      font-size: 12px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      text-decoration: none;
      font-family: var(--font-sans);
      font-weight: 600;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }
    .manifesto-oval-btn:hover {
      background: var(--gold-primary);
      color: #120805;
      border-color: var(--gold-primary);
      transform: translateY(-3px);
      box-shadow: 0 10px 30px rgba(223, 177, 91, 0.35);
    }

    /* THE EXHIBITION GALLERIES (MUSEUM PAVILION) */
    .exhibitions-wrapper {
      position: relative;
      background-color: #140906;
      padding: 60px 24px 140px;
    }

    .exhibition-block {
      max-width: 1240px;
      margin: 0 auto 160px;
      position: relative;
    }

    .exhibition-header-strip {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 1px solid rgba(223, 177, 91, 0.25);
      padding-bottom: 18px;
      margin-bottom: 50px;
    }

    .exhibition-numeral {
      font-family: var(--font-display);
      font-size: clamp(32px, 4vw, 48px);
      color: var(--gold-primary);
      font-weight: 700;
      line-height: 1;
    }

    .exhibition-category {
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    /* Classical Fine Art Split Exhibition Layout */
    .exhibition-grid {
      display: grid;
      grid-template-columns: 1fr 1.15fr;
      gap: 60px;
      align-items: center;
    }

    .exhibition-grid.reverse {
      grid-template-columns: 1.15fr 1fr;
    }

    /* Classical Oil Portrait Museum Plinth */
    .museum-portrait-frame {
      position: relative;
      padding: 18px;
      background: linear-gradient(145deg, rgba(42, 20, 14, 0.8) 0%, rgba(20, 9, 6, 0.9) 100%);
      border: 1px solid rgba(223, 177, 91, 0.3);
      border-radius: 16px;
      box-shadow: 0 35px 80px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s ease;
    }

    .museum-portrait-frame:hover {
      transform: translateY(-6px);
      box-shadow: 0 45px 100px rgba(0, 0, 0, 0.95), 0 0 50px rgba(223, 177, 91, 0.2);
    }

    .museum-portrait-frame.emerald-plinth {
      border-color: rgba(0, 168, 132, 0.35);
    }
    .museum-portrait-frame.emerald-plinth:hover {
      box-shadow: 0 45px 100px rgba(0, 0, 0, 0.95), 0 0 50px rgba(0, 168, 132, 0.2);
    }

    .portrait-canvas-wrapper {
      position: relative;
      width: 100%;
      aspect-ratio: 1 / 1;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid rgba(0, 0, 0, 0.4);
    }

    .portrait-oil-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      filter: contrast(1.05) saturate(1.05);
      transition: transform 0.8s ease;
    }

    .museum-portrait-frame:hover .portrait-oil-img {
      transform: scale(1.03);
    }

    /* Museum Brass Caption Plaque */
    .museum-brass-plaque {
      margin-top: 18px;
      padding: 14px 18px;
      background: rgba(18, 8, 5, 0.7);
      border-top: 1px solid rgba(223, 177, 91, 0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .plaque-title {
      font-family: var(--font-display);
      font-size: 12px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--gold-bright);
      font-weight: 700;
    }

    .plaque-num {
      font-family: var(--font-mono);
      font-size: 10.5px;
      color: var(--text-muted);
      letter-spacing: 0.1em;
    }

    /* Exhibition Narrative & High Editorial Copy */
    .exhibition-narrative {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .exhibition-person-title {
      font-family: var(--font-display);
      font-size: clamp(30px, 3.8vw, 48px);
      font-weight: 600;
      color: #fff9f0;
      line-height: 1.1;
      letter-spacing: -0.01em;
    }

    .exhibition-role-tag {
      font-family: var(--font-mono);
      font-size: 12px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--gold-primary);
      display: inline-block;
      margin-bottom: 8px;
    }

    .exhibition-quote-block {
      position: relative;
      padding: 24px 28px;
      background: rgba(30, 14, 10, 0.5);
      border-left: 3px solid var(--gold-primary);
      border-radius: 0 12px 12px 0;
      margin: 10px 0;
    }

    .exhibition-quote-block.emerald-quote {
      border-left-color: var(--emerald-accent);
    }

    .exhibition-quote-text {
      font-family: var(--font-serif);
      font-size: clamp(22px, 2.2vw, 30px);
      font-style: italic;
      color: #fdf6ec;
      line-height: 1.35;
    }

    .exhibition-prose {
      font-size: 16px;
      line-height: 1.8;
      color: var(--text-body);
      font-weight: 400;
    }

    .exhibition-artifacts-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 14px;
    }

    .artifact-pill {
      font-family: var(--font-mono);
      font-size: 11.5px;
      letter-spacing: 0.05em;
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(223, 177, 91, 0.08);
      border: 1px solid rgba(223, 177, 91, 0.25);
      color: var(--gold-bright);
    }

    .artifact-pill.emerald-pill {
      background: rgba(0, 168, 132, 0.08);
      border-color: rgba(0, 168, 132, 0.25);
      color: #34d399;
    }

    /* EXHIBITION III: THE CYPHERPUNK PANTHEON ARCADE */
    .pantheon-arcade-section {
      border-top: 1px solid rgba(223, 177, 91, 0.2);
      padding-top: 100px;
      margin-top: 60px;
    }

    .pantheon-header {
      text-align: center;
      max-width: 800px;
      margin: 0 auto 60px;
    }

    .pantheon-header h3 {
      font-family: var(--font-display);
      font-size: clamp(28px, 3.5vw, 42px);
      font-weight: 600;
      color: #fff9f0;
      margin-bottom: 14px;
      letter-spacing: 0.02em;
    }

    .pantheon-header p {
      font-family: var(--font-serif);
      font-size: 20px;
      font-style: italic;
      color: var(--text-muted);
    }

    .pantheon-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
      gap: 28px;
    }

    .pantheon-card {
      background: linear-gradient(180deg, rgba(32, 16, 12, 0.6) 0%, rgba(18, 8, 5, 0.8) 100%);
      border: 1px solid rgba(223, 177, 91, 0.2);
      border-radius: 14px;
      padding: 34px 28px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .pantheon-card:hover {
      transform: translateY(-4px);
      border-color: rgba(223, 177, 91, 0.5);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
    }

    .pantheon-numeral {
      font-family: var(--font-display);
      font-size: 13px;
      letter-spacing: 0.2em;
      color: var(--gold-primary);
    }

    .pantheon-name {
      font-family: var(--font-display);
      font-size: 19px;
      color: #ffffff;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .pantheon-desc {
      font-size: 14px;
      color: var(--text-body);
      line-height: 1.65;
    }

    /* EPILOGUE CALL TO ACTION */
    .epilogue-section {
      background: radial-gradient(circle at center top, rgba(223, 177, 91, 0.15) 0%, transparent 60%), #140805;
      border-top: 1px solid rgba(223, 177, 91, 0.25);
      padding: 120px 24px 100px;
      text-align: center;
    }

    .epilogue-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .epilogue-title {
      font-family: var(--font-display);
      font-size: clamp(32px, 4.5vw, 56px);
      color: #fff9f0;
      line-height: 1.15;
      margin-bottom: 20px;
      letter-spacing: 0.02em;
    }

    .epilogue-desc {
      font-family: var(--font-serif);
      font-size: 21px;
      font-style: italic;
      color: var(--text-muted);
      margin-bottom: 40px;
    }

    .epilogue-btns {
      display: flex;
      justify-content: center;
      gap: 20px;
      flex-wrap: wrap;
    }

    .epilogue-btn-primary {
      background: var(--gold-primary);
      color: #120805;
      padding: 16px 36px;
      border-radius: 999px;
      text-decoration: none;
      font-family: var(--font-sans);
      font-size: 12.5px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      box-shadow: 0 4px 20px rgba(223, 177, 91, 0.35);
      transition: all 0.3s ease;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
    }
    .epilogue-btn-primary:hover {
      background: var(--gold-bright);
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(223, 177, 91, 0.5);
    }

    .epilogue-btn-secondary {
      background: transparent;
      color: #fff9f0;
      padding: 16px 34px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 999px;
      text-decoration: none;
      font-family: var(--font-sans);
      font-size: 12.5px;
      font-weight: 600;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      transition: all 0.3s ease;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
    }
    .epilogue-btn-secondary:hover {
      border-color: var(--gold-primary);
      color: var(--gold-bright);
      background: rgba(223, 177, 91, 0.08);
    }

    /* EDITORIAL COLOPHON FOOTER */
    footer.colophon-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      background: #0d0503;
      padding: 60px 24px 40px;
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: 0.12em;
      color: rgba(255, 255, 255, 0.55);
    }

    .colophon-container {
      max-width: 1240px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
    }

    .colophon-links {
      display: flex;
      gap: 24px;
      list-style: none;
      flex-wrap: wrap;
    }

    .colophon-links a {
      color: rgba(255, 255, 255, 0.6);
      text-decoration: none;
      transition: color 0.2s ease;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      padding: 0 4px;
    }
    .colophon-links a:hover {
      color: var(--gold-bright);
    }

    /* RESPONSIVE BREAKPOINTS (TESTED FOR 360PX TO 1440PX) */
    @media (max-width: 960px) {
      .exhibition-grid,
      .exhibition-grid.reverse {
        grid-template-columns: 1fr;
        gap: 40px;
      }
      .museum-portrait-frame {
        max-width: 440px;
        margin: 0 auto;
      }
      .masthead-center-indicator {
        display: none;
      }
    }

    @media (max-width: 680px) {
      header.site-masthead {
        padding: max(16px, env(safe-area-inset-top)) 20px 16px;
      }
      .nav-text-link {
        display: none;
      }
      .hero-meta-strip {
        flex-direction: column;
        gap: 12px;
        text-align: center;
      }
      .manifesto-quote {
        font-size: 28px;
      }
      .manifesto-action-wrap,
      .epilogue-btns {
        flex-direction: column;
        width: 100%;
      }
      .manifesto-oval-btn,
      .epilogue-btn-primary,
      .epilogue-btn-secondary {
        width: 100%;
        justify-content: center;
      }
    }
  </style>
</head>
<body>
  <a href="#exhibitions" class="skip-link">Skip to exhibitions</a>

  <!-- Masthead Navigation -->
  <header class="site-masthead">
    <a href="./index.html" class="masthead-brand">
      <span class="masthead-title">The Chronicles of JChatt</span>
      <span class="masthead-subtitle">Sovereignty Archive · MMXXVI</span>
    </a>

    <div class="masthead-center-indicator" aria-hidden="true">
      <span>I</span>
      <div class="masthead-indicator-arrow"></div>
      <span>II</span>
    </div>

    <div class="masthead-actions">
      <a href="./index.html" class="nav-text-link">Home</a>
      <a href="./whitepaper.html" class="nav-text-link">Whitepaper</a>
      <a href="https://github.com/JJcoders00/jchatt" target="_blank" rel="noopener noreferrer" class="nav-text-link">GitHub</a>
      <a href="./web" class="oval-capsule-btn">
        <span>Launch Web</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </a>
    </div>
  </header>

  <main>
    <!-- HERO CANVAS: Classical Fine Art Seascape with Monumental Type -->
    <section class="hero-gallery-canvas">
      <img src="./images/honors/renaissance_sky.jpg" alt="Renaissance Celestial Seascape" class="hero-painting-layer">
      <div class="hero-vignette" aria-hidden="true"></div>

      <div class="hero-center-monument">
        <div class="hero-epoch-stamp">Hall of Laureates &middot; Sovereign Cryptography</div>
        <h1 class="hero-monumental-title">
          The Sovereign
          <span>Architects</span>
        </h1>
      </div>

      <div class="hero-meta-strip">
        <div>CATALOGUE: JCHATT-HONORS-2026</div>
        <div>
          <a href="#exhibitions">SCROLL TO COMMENCE EXHIBITION &darr;</a>
        </div>
        <div>CURATED IN CITIZEN LIBERTY</div>
      </div>
    </section>

    <!-- EDITORIAL MANIFESTO: In the exact spirit of the Browser History 2020 masterpiece -->
    <section class="manifesto-section">
      <div class="manifesto-container">
        <div class="manifesto-lead-kicker">The Genesis of the New Standard</div>
        <p class="manifesto-quote">
          <span class="bold-name">Sree Vinayak</span> &amp; <span class="bold-name">Jackson Wright</span><br>
          <span class="italic-phrase">gave the world sovereign communication</span><br>
          free from cellular leashes and state surveillance.
        </p>
        <div class="manifesto-action-wrap">
          <a href="#exhibitions" class="manifesto-oval-btn">
            <span>Enter the Exhibition Rooms</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 13l5 5 5-5M12 4v14"/></svg>
          </a>
        </div>
      </div>
    </section>

    <!-- THE EXHIBITION GALLERIES -->
    <div class="exhibitions-wrapper" id="exhibitions">
      
      <!-- EXHIBITION 01: SREE VINAYAK K. PRAVEEN -->
      <article class="exhibition-block">
        <div class="exhibition-header-strip">
          <div class="exhibition-numeral">I</div>
          <div class="exhibition-category">THE FOUNDING VISION &middot; BIP-39 &amp; ANTI-COERCION</div>
        </div>

        <div class="exhibition-grid">
          <!-- Fine Art Museum Framed Portrait -->
          <div class="museum-portrait-frame">
            <div class="portrait-canvas-wrapper">
              <img src="./images/honors/sree_vinayak.jpg" alt="Portrait of Sree Vinayak K. Praveen" class="portrait-oil-img">
            </div>
            <div class="museum-brass-plaque">
              <span class="plaque-title">Sree Vinayak K. Praveen</span>
              <span class="plaque-num">PLINTH NO. 001</span>
            </div>
          </div>

          <!-- Exhibition Narrative & Philosophy -->
          <div class="exhibition-narrative">
            <div>
              <span class="exhibition-role-tag">Founding Ideator &middot; Privacy Visionary</span>
              <h2 class="exhibition-person-title">The Mind Behind Zero-SIM Sovereignty</h2>
            </div>

            <div class="exhibition-quote-block">
              <p class="exhibition-quote-text">
                &ldquo;True privacy cannot begin with handing over your government-linked phone number.&rdquo;
              </p>
            </div>

            <p class="exhibition-prose">
              In an era where every mainstream messaging platform mandated state-registered cellular SIM cards and uploaded user address books to corporate silos, Sree Vinayak conceptualized the breakthrough architecture of JChatt. He realized that true confidentiality cannot be achieved on top of a telecom leash.
            </p>

            <p class="exhibition-prose">
              He formulated the radical shift to 12-word BIP-39 deterministic mnemonic seed phrases, local biometric enclave vaults, and the anti-coercion calculator disguise (<code>314159=</code>) that transforms the app into an innocuous calculator under physical duress. His vision returned encrypted speech to its rightful place: sovereign human liberty.
            </p>

            <div class="exhibition-artifacts-row">
              <span class="artifact-pill">BIP-39 Zero-SIM Protocol</span>
              <span class="artifact-pill">Anti-Coercion Panic Camouflage</span>
              <span class="artifact-pill">Hardware Enclave Isolation</span>
              <span class="artifact-pill">Zero-Metadata Architecture</span>
            </div>
          </div>
        </div>
      </article>

      <!-- EXHIBITION 02: JACKSON WRIGHT -->
      <article class="exhibition-block">
        <div class="exhibition-header-strip">
          <div class="exhibition-numeral">II</div>
          <div class="exhibition-category">THE MASTER OF THE CRAFT &middot; ARCHITECTURE &amp; INTERFACE</div>
        </div>

        <div class="exhibition-grid reverse">
          <!-- Exhibition Narrative & Philosophy -->
          <div class="exhibition-narrative">
            <div>
              <span class="exhibition-role-tag" style="color: var(--emerald-accent);">Lead Engineering &middot; Interface Craftsman</span>
              <h2 class="exhibition-person-title">The Sculptor of the Human Sanctuary</h2>
            </div>

            <div class="exhibition-quote-block emerald-quote">
              <p class="exhibition-quote-text">
                &ldquo;A great security tool is useless if people struggle to use it. Craftsmanship is security.&rdquo;
              </p>
            </div>

            <p class="exhibition-prose">
              Where others saw code merely as utilitarian mechanics, Jackson Wright brought the unyielding discipline of high industrial design. Understanding that complex cryptographic primitives fail when burdened by clumsy user experiences, Jackson sculpted JChatt into an interface of effortless grace.
            </p>

            <p class="exhibition-prose">
              Through obsessive layout precision, microsecond latency tuning, tactile haptic physics, and fluid cross-viewport responsiveness, Jackson transformed high-grade mathematical encryption into an intuitive everyday sanctuary for hundreds of thousands of sovereign communicators.
            </p>

            <div class="exhibition-artifacts-row">
              <span class="artifact-pill emerald-pill">Zero-Latency State Synchronization</span>
              <span class="artifact-pill emerald-pill">Responsive Geometric Design</span>
              <span class="artifact-pill emerald-pill">Tactile Micro-Interactions</span>
              <span class="artifact-pill emerald-pill">Accessible Cryptographic UX</span>
            </div>
          </div>

          <!-- Fine Art Museum Framed Portrait -->
          <div class="museum-portrait-frame emerald-plinth">
            <div class="portrait-canvas-wrapper">
              <img src="./images/honors/jackson_wright.jpg" alt="Portrait of Jackson Wright" class="portrait-oil-img">
            </div>
            <div class="museum-brass-plaque">
              <span class="plaque-title" style="color: #34d399;">Jackson Wright</span>
              <span class="plaque-num">PLINTH NO. 002</span>
            </div>
          </div>
        </div>
      </article>

      <!-- EXHIBITION 03: THE CYPHERPUNK PANTHEON ARCADE -->
      <section class="pantheon-arcade-section">
        <div class="pantheon-header">
          <div class="exhibition-category" style="margin-bottom: 12px;">HALL OF ANCESTORS</div>
          <h3>Foundational Roots &middot; Cypherpunk Lineage</h3>
          <p>Standing on the shoulders of mathematical giants who defended human privacy with code.</p>
        </div>

        <div class="pantheon-grid">
          <div class="pantheon-card">
            <div class="pantheon-numeral">ARCADE I</div>
            <div class="pantheon-name">Satoshi &amp; BIP-39 Pioneers</div>
            <p class="pantheon-desc">For inventing non-custodial cryptographic derivation through 12-word mnemonic phrases, eliminating the need for identity registrars.</p>
          </div>

          <div class="pantheon-card">
            <div class="pantheon-numeral">ARCADE II</div>
            <div class="pantheon-name">Phil Zimmermann &amp; PGP</div>
            <p class="pantheon-desc">For establishing the immortal principle that cryptographic math is free speech and an inalienable human defense against surveillance.</p>
          </div>

          <div class="pantheon-card">
            <div class="pantheon-numeral">ARCADE III</div>
            <div class="pantheon-name">W3C &amp; WebRTC Architects</div>
            <p class="pantheon-desc">For developing direct peer-to-peer encrypted media conduits (DTLS-SRTP), enabling audio and video without telecom wiretaps.</p>
          </div>

          <div class="pantheon-card">
            <div class="pantheon-numeral">ARCADE IV</div>
            <div class="pantheon-name">The Free Software Guild</div>
            <p class="pantheon-desc">To the global community of hackers, cryptographers, and contributors who believe technology must serve human sovereignty above all.</p>
          </div>
        </div>
      </section>

    </div>

    <!-- EPILOGUE CALL TO ACTION -->
    <section class="epilogue-section">
      <div class="epilogue-container">
        <div class="exhibition-category" style="margin-bottom: 16px;">THE LIVING ARCHITECTURE</div>
        <h2 class="epilogue-title">Reclaim Your Inalienable Communication Sovereignty</h2>
        <p class="epilogue-desc">Zero phone numbers. Zero SIM cards. Client-side authenticated AES-256-GCM.</p>
        <div class="epilogue-btns">
          <a href="./web" class="epilogue-btn-primary">Launch Web Messenger &rarr;</a>
          <a href="./downloads/jchatt-v2.0.apk" class="epilogue-btn-secondary">Download Android APK (Free)</a>
        </div>
      </div>
    </section>
  </main>

  <!-- COLOPHON FOOTER -->
  <footer class="colophon-footer">
    <div class="colophon-container">
      <div>
        <p>&copy; MMXXVI JChatt &amp; JJ Coders. All rights reserved.</p>
        <p style="opacity: 0.6; margin-top: 4px;">U.S. EAR Mass-Market Cryptography Exempt &middot; IT Act 2000 &sect; 79 Safe Harbor</p>
      </div>

      <ul class="colophon-links">
        <li><a href="./index.html">Home</a></li>
        <li><a href="./web">Web App</a></li>
        <li><a href="./whitepaper.html">Whitepaper</a></li>
        <li><a href="./compliance.html">Compliance</a></li>
        <li><a href="./privacy.html">Privacy</a></li>
        <li><a href="./terms.html">Terms</a></li>
        <li><a href="https://github.com/JJcoders00/jchatt" target="_blank" rel="noopener noreferrer">Source (GitHub)</a></li>
      </ul>
    </div>
  </footer>
</body>
</html>
"""

    with open("dist/honors.html", "w", encoding="utf-8") as f:
        f.write(html_content)
    print("dist/honors.html created as an Awwwards-tier fine art masterpiece!")

if __name__ == "__main__":
    generate_legendary_honors()
