let v = '';
function show() {
  // console.log('v:', v);
}
let realOpened = false;
let decoyOpened = false;
function open(target) {
  if (target === 'real') realOpened = true;
  if (target === 'decoy') decoyOpened = true;
}

function key(k) {
  if (k == 'AC') { v = ''; return show(); }
  if (k == '=') {
    if (v == '314159') { v = ''; show(); return open('real'); }
    if (v == '9999') { v = ''; show(); return open('decoy'); }
    try {
      const x = v.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
      if (/^[0-9+\-*/.%() ]+$/.test(x) && x) {
        const r = Function('return (' + x.replace(/%/g, '/100') + ')')();
        v = Number.isFinite(r) ? String(+r.toFixed(8)) : 'Error';
      }
    } catch (_) { v = 'Error'; }
    return show();
  }
  if (k == '±') { v = v.startsWith('-') ? v.slice(1) : '-' + v; return show(); }
  if (v == 'Error') v = '';
  v += k;
  show();
}

// Test 7 * 8 =
key('7');
key('×');
key('8');
key('=');
console.log('Result of 7 × 8 =:', v);

// Test 314159=
'314159='.split('').forEach(k => key(k));
console.log('Is real opened?', realOpened);
