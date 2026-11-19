import re

def update_table_and_ux():
    path = "dist/index.html"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Comparison table min-width and sticky styling
    table_css = """
    .table-container {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      position: relative;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
    }
    .comparison-table {
      width: 100%;
      min-width: 680px;
      border-collapse: separate;
      border-spacing: 0;
    }
    .comparison-table th, .comparison-table td {
      padding: 16px 20px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    .comparison-table th:first-child,
    .comparison-table td:first-child {
      position: sticky;
      left: 0;
      background: var(--surface-card);
      z-index: 2;
      border-right: 1px solid var(--border);
      box-shadow: 3px 0 10px rgba(0, 0, 0, 0.4);
    }
    .comparison-table th:first-child {
      background: var(--surface-elevated);
      z-index: 3;
    }
    .comparison-table tr:hover td:first-child {
      background: var(--surface-hover);
    }
    .mobile-scroll-hint {
      display: none;
      font-size: 12px;
      color: var(--text-sub);
      margin-bottom: 8px;
      text-align: right;
    }
    @media (max-width: 900px) {
      .mobile-scroll-hint {
        display: block;
      }
      .comparison-table th, .comparison-table td {
        padding: 12px 14px;
        font-size: 13px;
      }
    }
"""
    # Replace existing table styling if present, or add to utility
    if '.comparison-table {' not in content:
        content = content.replace('/* Utility / Buttons */', table_css + '\n    /* Utility / Buttons */')

    # Add mobile-scroll-hint before .table-container
    if 'class="mobile-scroll-hint"' not in content:
        content = content.replace(
            '<div class="table-container">',
            '<div class="mobile-scroll-hint"><span>← Swipe horizontally to compare all apps →</span></div>\n        <div class="table-container">'
        )

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Comparison table and mobile touch improvements applied!")

if __name__ == "__main__":
    update_table_and_ux()
