let v = '';
let justCalculated = false;
let realOpened = false;
let decoyOpened = false;

function open(target) {
  if (target === 'real') realOpened = true;
  if (target === 'decoy') decoyOpened = true;
}

function key(k) {
  if (k == 'AC') { v = ''; justCalculated = false; return; }
  if (k == '=') {
    if (v == '314159' || v.endsWith('314159')) { v = ''; justCalculated = false; return open('real'); }
    if (v == '9999' || v.endsWith('9999')) { v = ''; justCalculated = false; return open('decoy'); }
    try {
      const x = v.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
      if (/^[0-9+\-*/.%() ]+$/.test(x) && x) {
        const r = Function('return (' + x.replace(/%/g, '/100') + ')')();
        v = Number.isFinite(r) ? String(+r.toFixed(8)) : 'Error';
      }
    } catch (_) { v = 'Error'; }
    justCalculated = true;
    return;
  }
  if (k == '±') { v = v.startsWith('-') ? v.slice(1) : '-' + v; return; }
  if (v == 'Error') { v = ''; }
  // Standard calculator behavior: if user just pressed '=' and then types a digit, start fresh
  if (justCalculated && /[0-9]/.test(k)) {
    v = '';
  }
  justCalculated = false;
  v += k;
}

// Test: 7 * 8 =
key('7'); key('×'); key('8'); key('=');
console.log('Math result:', v); // 56

// Now type 314159=
'314159='.split('').forEach(k => key(k));
console.log('Is real opened after math?', realOpened); // Should be true!
