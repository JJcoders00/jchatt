/* ===== JCHATT v2 CRYPTO, REAL QR, ICONS & BRAND ASSETS ===== */
(function (global) {
  'use strict';

  // --- 1. Pure-JS Synchronous SHA-256 (works on http:// Android WebView & https://) ---
  var K256 = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);

  function utf8Bytes(str) {
    var s = String(str == null ? '' : str);
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
    var out = [], i, c;
    for (i = 0; i < s.length; i++) {
      c = s.charCodeAt(i);
      if (c < 128) out.push(c);
      else if (c < 2048) out.push(192 | (c >> 6), 128 | (c & 63));
      else if (c < 55296 || c >= 57344) out.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
      else {
        i++;
        c = 65536 + (((c & 1023) << 10) | (s.charCodeAt(i) & 1023));
        out.push(240 | (c >> 18), 128 | ((c >> 12) & 63), 128 | ((c >> 6) & 63), 128 | (c & 63));
      }
    }
    return new Uint8Array(out);
  }

  function rotr(n, x) { return (x >>> n) | (x << (32 - n)); }

  function sha256Bytes(data) {
    var bytes = data instanceof Uint8Array ? data : utf8Bytes(data);
    var len = bytes.length;
    var bitLenHi = Math.floor((len * 8) / 4294967296);
    var bitLenLo = (len * 8) >>> 0;
    var paddedLen = Math.ceil((len + 9) / 64) * 64;
    var msg = new Uint8Array(paddedLen);
    msg.set(bytes);
    msg[len] = 0x80;
    var dv = new DataView(msg.buffer);
    dv.setUint32(paddedLen - 8, bitLenHi, false);
    dv.setUint32(paddedLen - 4, bitLenLo, false);

    var h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
    var h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    var w = new Uint32Array(64);
    for (var offset = 0; offset < paddedLen; offset += 64) {
      var i;
      for (i = 0; i < 16; i++) w[i] = dv.getUint32(offset + i * 4, false);
      for (i = 16; i < 64; i++) {
        var s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
        var s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      var a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (i = 0; i < 64; i++) {
        var S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
        var ch = (e & f) ^ ((~e) & g);
        var temp1 = (h + S1 + ch + K256[i] + w[i]) >>> 0;
        var S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var temp2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + temp1) >>> 0;
        d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
      }
      h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
    }
    var out = new Uint8Array(32);
    var odv = new DataView(out.buffer);
    odv.setUint32(0, h0, false); odv.setUint32(4, h1, false);
    odv.setUint32(8, h2, false); odv.setUint32(12, h3, false);
    odv.setUint32(16, h4, false); odv.setUint32(20, h5, false);
    odv.setUint32(24, h6, false); odv.setUint32(28, h7, false);
    return out;
  }

  function sha256(str) {
    var b = sha256Bytes(str);
    var hex = '';
    for (var i = 0; i < b.length; i++) hex += (b[i] < 16 ? '0' : '') + b[i].toString(16);
    return hex;
  }

  // Symmetric stream seal/open for device pairing codes (encrypted in-browser before RTDB)
  function sealJson(obj, secretKey) {
    var plain = utf8Bytes(JSON.stringify(obj));
    var out = new Uint8Array(plain.length);
    var keyBlock = null;
    for (var i = 0; i < plain.length; i++) {
      if (i % 32 === 0) keyBlock = sha256Bytes(secretKey + ':' + (i / 32));
      out[i] = plain[i] ^ keyBlock[i % 32];
    }
    var bin = '';
    for (var j = 0; j < out.length; j++) bin += String.fromCharCode(out[j]);
    return btoa(bin);
  }

  function openJson(b64, secretKey) {
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    var keyBlock = null;
    for (var i = 0; i < bin.length; i++) {
      if (i % 32 === 0) keyBlock = sha256Bytes(secretKey + ':' + (i / 32));
      out[i] = bin.charCodeAt(i) ^ keyBlock[i % 32];
    }
    var text = typeof TextDecoder !== 'undefined'
      ? new TextDecoder().decode(out)
      : decodeURIComponent(escape(String.fromCharCode.apply(null, out)));
    return JSON.parse(text);
  }

  // --- 2. Handle, Passphrase & Safety Number Helpers ---
  var WORDS = [
    'amber', 'anchor', 'atlas', 'birch', 'breeze', 'canyon', 'cedar', 'cinder',
    'cobalt', 'comet', 'coral', 'crest', 'daisy', 'dawn', 'delta', 'drift',
    'echo', 'ember', 'falcon', 'fern', 'fjord', 'flint', 'forest', 'frost',
    'glacier', 'harbor', 'haven', 'hazel', 'horizon', 'indigo', 'island', 'ivory',
    'jasper', 'juniper', 'kestrel', 'lagoon', 'lantern', 'larch', 'laurel', 'linen',
    'lotus', 'lunar', 'maple', 'meadow', 'mist', 'moss', 'nebula', 'north',
    'oak', 'oasis', 'olive', 'onyx', 'orbit', 'osprey', 'otter', 'pebble',
    'pine', 'plume', 'polar', 'prism', 'pulse', 'quartz', 'quill', 'rain',
    'raven', 'reef', 'ridge', 'ripple', 'river', 'robin', 'sage', 'saffron',
    'sail', 'shadow', 'shell', 'sierra', 'silver', 'slate', 'snow', 'solar',
    'sparrow', 'spruce', 'star', 'stone', 'storm', 'summit', 'sunlit', 'swift',
    'thistle', 'tide', 'timber', 'topaz', 'trail', 'tulip', 'valley', 'velvet',
    'vernal', 'violet', 'wave', 'willow', 'wind', 'winter', 'wren', 'zenith'
  ];

  function randBytes(n) {
    var a = new Uint8Array(n);
    if (global.crypto && global.crypto.getRandomValues) {
      global.crypto.getRandomValues(a);
    } else {
      for (var i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256);
    }
    return a;
  }

  function generatePhrase() {
    var r = randBytes(16);
    var out = [];
    for (var i = 0; i < 12; i++) out.push(WORDS[r[i] % WORDS.length]);
    return out;
  }

  function randomHandle() {
    var adj = ['quiet', 'swift', 'moss', 'amber', 'polar', 'cobalt', 'linen', 'cedar', 'silver', 'harbor', 'dawn', 'sage'];
    var noun = ['fox', 'lynx', 'otter', 'wren', 'fern', 'ridge', 'cove', 'kite', 'spark', 'brook', 'pine', 'reed'];
    var r = randBytes(4);
    var num = ((r[2] << 8) | r[3]) % 900 + 100;
    return '@' + adj[r[0] % adj.length] + '.' + noun[r[1] % noun.length] + num;
  }

  function normalizeHandle(raw) {
    var clean = String(raw || '').trim().toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9._-]/g, '');
    if (!clean) return '';
    return '@' + clean.slice(0, 28);
  }

  function deriveCredentials(handle, phraseWords) {
    var canonH = normalizeHandle(handle);
    var canonP = Array.isArray(phraseWords)
      ? phraseWords.join(' ').trim().toLowerCase().replace(/\s+/g, ' ')
      : String(phraseWords || '').trim().toLowerCase().replace(/\s+/g, ' ');
    var hHash = sha256('jchatt:v2:handle:' + canonH);
    var pHash = sha256('jchatt:v2:secret:' + canonH + ':' + canonP);
    return {
      handle: canonH,
      handleHash: hHash.slice(0, 32),
      email: 'h_' + hHash.slice(0, 24) + '@id.jchatt.app',
      password: 'JC!v2_' + pHash.slice(0, 32)
    };
  }

  function safetyNumbers(aId, bId) {
    var pair = [String(aId || 'self'), String(bId || 'peer')].sort().join('|');
    var hex = sha256('safety:' + pair) + sha256('safety2:' + pair);
    var groups = [];
    for (var i = 0; i < 12; i++) {
      var val = parseInt(hex.slice(i * 5, i * 5 + 5), 16) % 100000;
      groups.push(String(val).padStart(5, '0'));
    }
    return groups;
  }

  // --- 3. Real Byte-Mode QR Code SVG Generator (Scannable v1-v6, EC Level L) ---
  var GF_EXP = new Uint8Array(512);
  var GF_LOG = new Uint8Array(256);
  (function initGF() {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) GF_EXP[j] = GF_EXP[j - 255];
  })();
  function gfMul(a, b) { return (a === 0 || b === 0) ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]]; }
  function rsPoly(deg) {
    var poly = [1];
    for (var i = 0; i < deg; i++) {
      var next = new Array(poly.length + 1).fill(0);
      var factor = GF_EXP[i];
      for (var j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], factor);
      }
      poly = next;
    }
    return poly;
  }
  function rsEncode(data, ecLen) {
    var gen = rsPoly(ecLen);
    var res = data.slice();
    for (var k = 0; k < ecLen; k++) res.push(0);
    for (var i = 0; i < data.length; i++) {
      var coef = res[i];
      if (coef !== 0) {
        for (var j = 0; j < gen.length; j++) res[i + j] ^= gfMul(gen[j], coef);
      }
    }
    return res.slice(data.length);
  }
  // Version 1..6 Level-L specs: [totalDataCodewords, ecPerBlock, alignCenter]
  var QR_SPEC = {
    1: [19, 7, []],
    2: [34, 10, [6, 18]],
    3: [55, 15, [6, 22]],
    4: [80, 20, [6, 26]],
    5: [108, 26, [6, 30]],
    6: [136, 18, [6, 34]] // v6 L has 2 blocks of 68 data, 18 ec
  };

  function encodeQrMatrix(text) {
    var raw = utf8Bytes(String(text || 'https://jjcodersjchatt.web.app'));
    var ver = 1;
    while (ver <= 6) {
      var cap = QR_SPEC[ver][0] - 2; // reserve 4-bit mode + 8-bit len (~2 bytes overhead)
      if (raw.length <= cap) break;
      ver++;
    }
    if (ver > 6) {
      raw = raw.slice(0, 134);
      ver = 6;
    }
    var spec = QR_SPEC[ver];
    var totalData = spec[0], ecLen = spec[1], align = spec[2];
    var bits = [];
    function pushBits(val, n) {
      for (var i = n - 1; i >= 0; i--) bits.push((val >> i) & 1);
    }
    pushBits(4, 4); // Byte mode
    pushBits(raw.length, 8);
    for (var b = 0; b < raw.length; b++) pushBits(raw[b], 8);
    pushBits(0, Math.min(4, totalData * 8 - bits.length));
    while (bits.length % 8 !== 0) bits.push(0);
    var data = [];
    for (var bi = 0; bi < bits.length; bi += 8) {
      var byteVal = 0;
      for (var k = 0; k < 8; k++) byteVal = (byteVal << 1) | bits[bi + k];
      data.push(byteVal);
    }
    var padIdx = 0;
    while (data.length < totalData) {
      data.push(padIdx % 2 === 0 ? 0xec : 0x11);
      padIdx++;
    }
    var codewords = [];
    if (ver === 6) {
      var b1 = data.slice(0, 68), b2 = data.slice(68, 136);
      var e1 = rsEncode(b1, ecLen), e2 = rsEncode(b2, ecLen);
      for (var idx = 0; idx < 68; idx++) { codewords.push(b1[idx]); codewords.push(b2[idx]); }
      for (var idx2 = 0; idx2 < ecLen; idx2++) { codewords.push(e1[idx2]); codewords.push(e2[idx2]); }
    } else {
      codewords = data.concat(rsEncode(data, ecLen));
    }

    var n = ver * 4 + 17;
    var mat = Array.from({ length: n }, function () { return new Int8Array(n).fill(-1); });
    var fn = Array.from({ length: n }, function () { return new Uint8Array(n); });
    function setFn(r, c, v) {
      if (r >= 0 && r < n && c >= 0 && c < n) { mat[r][c] = v ? 1 : 0; fn[r][c] = 1; }
    }
    function finder(r0, c0) {
      for (var dr = -1; dr <= 7; dr++) {
        for (var dc = -1; dc <= 7; dc++) {
          var r = r0 + dr, c = c0 + dc;
          if (r < 0 || r >= n || c < 0 || c >= n) continue;
          var inBox = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
          var dark = inBox && (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
          setFn(r, c, dark ? 1 : 0);
        }
      }
    }
    finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
    if (align.length === 2) {
      var cr = align[1], cc = align[1];
      for (var ar = -2; ar <= 2; ar++) {
        for (var ac = -2; ac <= 2; ac++) {
          setFn(cr + ar, cc + ac, (Math.max(Math.abs(ar), Math.abs(ac)) !== 1) ? 1 : 0);
        }
      }
    }
    for (var t = 8; t < n - 8; t++) {
      setFn(6, t, t % 2 === 0 ? 1 : 0);
      setFn(t, 6, t % 2 === 0 ? 1 : 0);
    }
    setFn(n - 8, 8, 1); // dark module
    // Reserve format strips
    for (var fi = 0; fi < 9; fi++) {
      if (!fn[8][fi]) fn[8][fi] = 2;
      if (!fn[fi][8]) fn[fi][8] = 2;
    }
    for (var fj = 0; fj < 8; fj++) {
      if (!fn[8][n - 1 - fj]) fn[8][n - 1 - fj] = 2;
      if (!fn[n - 1 - fj][8]) fn[n - 1 - fj][8] = 2;
    }

    // Place data bits with mask 0 ((r + c) % 2 === 0)
    var cwBits = [];
    for (var ci = 0; ci < codewords.length; ci++) {
      for (var cb = 7; cb >= 0; cb--) cwBits.push((codewords[ci] >> cb) & 1);
    }
    var bitPtr = 0, dirUp = true;
    for (var col = n - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      for (var step = 0; step < n; step++) {
        var r = dirUp ? (n - 1 - step) : step;
        for (var d = 0; d < 2; d++) {
          var c = col - d;
          if (fn[r][c] === 0) {
            var bit = bitPtr < cwBits.length ? cwBits[bitPtr++] : 0;
            if ((r + c) % 2 === 0) bit ^= 1; // Mask pattern 0
            mat[r][c] = bit;
          }
        }
      }
      dirUp = !dirUp;
    }

    // Format info for EC Level L (01) + Mask 0 (000) -> masked BCH = 0x77c4 (111011111000100)
    var fmtBits = 0x77c4;
    for (var m = 0; m < 15; m++) {
      var fBit = (fmtBits >> (14 - m)) & 1;
      if (m < 6) mat[8][m] = fBit;
      else if (m < 8) mat[8][m + 1] = fBit;
      else mat[8][n - 15 + m] = fBit;

      if (m < 7) mat[n - 1 - m][8] = fBit;
      else if (m < 9) mat[15 - m][8] = fBit;
      else mat[14 - m][8] = fBit;
    }
    mat[8][8] = (fmtBits >> 7) & 1;
    mat[7][8] = (fmtBits >> 6) & 1;
    mat[8][7] = (fmtBits >> 8) & 1;
    return mat;
  }

  function qrSvg(text, size) {
    var sz = size || 172;
    var mat = encodeQrMatrix(text || 'https://jjcodersjchatt.web.app');
    var n = mat.length;
    var cells = '';
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (mat[r][c] === 1) {
          cells += '<rect x="' + (c + 2) + '" y="' + (r + 2) + '" width="1" height="1"/>';
        }
      }
    }
    var vb = n + 4;
    return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 ' + vb + ' ' + vb + '" shape-rendering="crispEdges">'
      + '<rect width="' + vb + '" height="' + vb + '" fill="#fff"/>'
      + '<g fill="#0a2230">' + cells + '</g>'
      + '</svg>';
  }

  // Legacy-named wrapper keeping exact API parity
  function qr(text, size) { return qrSvg(text, size || 172); }

  // --- 4. Crisp Stroke-SVG Icons (NO emojis as UI icons!) ---
  var IC = {
    fingerprint: '<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/><path d="M16 17v2"/><path d="M20 12a8 8 0 0 0-14.77-4.14"/><path d="M6 16.5a14 14 0 0 0 .5 3.5"/>',
    chats: '<path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-2.9-.37-4.1-1.02L3 21l1.52-5.4A8.5 8.5 0 1 1 21 12Z"/>',
    updates: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/>',
    calls: '<path d="M22 16.9v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.1 5.18 2 2 0 0 1 5.11 3h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L9.1 10.9a16 16 0 0 0 4 4l1.26-1.26a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.9Z"/>',
    shield: '<path d="M12 3 4.5 6.2v5.4c0 5 3.2 8.7 7.5 10.4 4.3-1.7 7.5-5.4 7.5-10.4V6.2L12 3Z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM19 14h2v2M14 19h2v2M19 19h2v2"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M15 18 9 12l6-6"/>',
    next: '<path d="m9 18 6-6-6-6"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    dcheck: '<path d="m2 13 4 4L16 7"/><path d="m10 15 2 2 9-9"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.7"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 3h6"/>',
    flame: '<path d="M12 3s4.5 3.6 4.5 8a4.5 4.5 0 1 1-9 0c0-2.1.9-3.9 2.2-5.2.3 1.4 1.3 2.2 2.3 2.2 0-2 0-5 0-5Z"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3Z"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8"/>',
    micOff: '<path d="m2 2 20 20"/><path d="M9 9v2a3 3 0 0 0 5.12 2.12M15 9.3V6a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 10m14 0a7 7 0 0 1-.11 1.23M12 17v4M8 21h8"/>',
    send: '<path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/>',
    attach: '<path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.6 5.6l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
    cam: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3.5"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5s1.4 2 3.5 2 3.5-2 3.5-2"/><circle cx="9" cy="10" r=".8" fill="currentColor"/><circle cx="15" cy="10" r=".8" fill="currentColor"/>',
    more: '<circle cx="12" cy="5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="19" r="1.4" fill="currentColor"/>',
    pin: '<path d="m12 17 5-5-4-4V3H8v5L4 12l5 5v4l3-4Z"/>',
    star: '<polygon points="12 3 14.9 8.8 21.2 9.7 16.6 14.2 17.7 20.5 12 17.5 6.3 20.5 7.4 14.2 2.8 9.7 9.1 8.8 12 3"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    reply: '<polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>',
    forward: '<polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    bellOff: '<path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5M17 17H3s3-2 3-9a4.7 4.7 0 0 1 .3-1.7M10.3 21a1.94 1.94 0 0 0 3.4 0M2 2l20 20"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.8"/>',
    eyeOff: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.7 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a13.1 13.1 0 0 1-1.67 2.68M6.6 6.6A13.5 13.5 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M2 2l20 20"/>',
    photo: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 15-5-5L5 20"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    location: '<path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10Z"/><circle cx="12" cy="11" r="2.2"/>',
    poll: '<path d="M4 20V10M12 20V4M20 20v-7"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14a5.5 5.5 0 0 1 5 6"/>',
    userPlus: '<circle cx="9.5" cy="8" r="3.5"/><path d="M2.5 20a7 7 0 0 1 14 0M19 8v6M16 11h6"/>',
    key: '<circle cx="7.5" cy="14.5" r="4.5"/><path d="m11 11 9-9M17 5l2.5 2.5M14 8l2 2"/>',
    mask: '<path d="M3 10c0-3 4-5 9-5s9 2 9 5v2c0 4.5-4 8-9 8s-9-3.5-9-8v-2Z"/><circle cx="8.5" cy="11" r="1.4"/><circle cx="15.5" cy="11" r="1.4"/>',
    maskOff: '<path d="M4 11c2-4 14-4 16 0v2c0 3-3.5 6-8 6s-8-3-8-6Z"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/>',
    laptop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.1-14.9 1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"/>',
    palette: '<circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1"/><circle cx="14" cy="9" r="1"/><circle cx="16" cy="13" r="1"/><path d="M12 21c2 0 2-2.5 1-3.5-.7-.7.3-1.5 1.8-1.5"/>',
    archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4"/>',
    folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"/>',
    block: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6 18.4 18.4"/>',
    alert: '<path d="m12 3 9 16H3L12 3Z"/><path d="M12 10v4M12 17h.01"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/>',
    download: '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z"/>',
    wifiOff: '<path d="m2 2 20 20M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5.1-2.6M10.7 5.1A15 15 0 0 1 21 9M2 9a15 15 0 0 1 3.7-2.2M12 20h.01"/>',
    calc: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 18h2M12 18h2"/>',
    heart: '<path d="M19 14c1.5-1.5 2-3.3 2-5a5 5 0 0 0-9-3 5 5 0 0 0-9 3c0 1.7.5 3.5 2 5l7 7 7-7Z"/>',
    sparkles: '<path d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z"/><path d="M5 17l.8 1.8L7.5 19.5l-1.7.7L5 22l-.8-1.8L2.5 19.5l1.7-.7L5 17Z"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 14h2"/>',
    gamepad: '<rect x="3" y="7" width="18" height="10" rx="4"/><path d="M7 12h4M9 10v4M15.5 11h.01M17.5 13h.01"/>',
    compass: '<circle cx="12" cy="12" r="9"/><polygon points="15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5 15.5 8.5"/>',
    zap: '<polygon points="13 2 4 14 11 14 10 22 20 10 13 10 13 2"/>',
    volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    speaker: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>',
    phoneOff: '<path d="M10.7 13.3a16 16 0 0 0 6.6 3.4l1.3-1.3a2 2 0 0 1 2.1-.45c.9.34 1.8.57 2.8.7A2 2 0 0 1 22 17v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9M2 2l20 20"/>',
    layers: '<polygon points="12 3 2 8 12 13 22 8 12 3"/><polyline points="2 13 12 18 22 13"/><polyline points="2 18 12 22 22 18"/>',
    radio: '<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19.1 4.9a10 10 0 0 1 0 14.2M4.9 19.1a10 10 0 0 1 0-14.2"/>',
    watch: '<rect x="7" y="6" width="10" height="12" rx="2"/><path d="M9 6V3h6v3M9 18v3h6v-3M12 10v2l1.5 1"/>',
    activity: '<polyline points="22 12 18 12 15 20 9 4 6 12 2 12"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
    play: '<polygon points="6 4 20 12 6 20 6 4"/>',
    pause: '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
    trash2: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    cloud: '<path d="M17.5 19H7a5 5 0 0 1-.4-9.98A7 7 0 0 1 20 11.2 4.5 4.5 0 0 1 17.5 19Z"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
    bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 14h.01M15 14h.01M9 17h6"/>',
    filter: '<polygon points="22 3 2 3 10 12.5 10 19 14 21 14 12.5 22 3"/>'
  };

  function ic(name, size) {
    var s = size || 20;
    var path = IC[name] || IC.info;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }

  // --- 5. Real Workspace Brand Images & Stickers ---
  var HUMAN_AVATARS = [];
  for (var ha = 1; ha <= 24; ha++) HUMAN_AVATARS.push('./images/avatars/human/human_av_' + ha + '.png');
  var MASCOT_AVATARS = [];
  for (var ma = 1; ma <= 44; ma++) MASCOT_AVATARS.push('./images/avatars/mascot/mascot_av_' + ma + '.png');
  var MASCOT_CHARS = [];
  for (var mc = 1; mc <= 24; mc++) MASCOT_CHARS.push('./images/stickers/mascot_char_' + mc + '.png');

  var ASSETS = {
    mascotHero: './images/mascot/mascot_hero.png',
    appIcon: './images/mascot/app_icon.png',
    logoMain: './images/logo/logo_main.png',
    logoBubble: './images/logo/logo_bubble.png',
    logoCircular: './images/logo/logo_circular.png',
    logoHolding: './images/logo/logo_holding_chat.png',
    logoWind: './images/logo/logo_windblown.png',
    iconPng: './images/logo/icon.png',
    humans: HUMAN_AVATARS,
    mascots: MASCOT_AVATARS,
    chars: MASCOT_CHARS,
    stickers: [
      { id: 'wave', label: 'Wave', url: './images/stickers/sticker_wave.png' },
      { id: 'celebrate', label: 'Celebrate', url: './images/stickers/sticker_celebrate.png' },
      { id: 'laugh', label: 'Laugh', url: './images/stickers/sticker_laugh.png' },
      { id: 'secret', label: 'Secret', url: './images/stickers/sticker_secret.png' },
      { id: 'shocked', label: 'Shocked', url: './images/stickers/sticker_shocked.png' },
      { id: 'thinking', label: 'Thinking', url: './images/stickers/sticker_thinking.png' },
      { id: 'char1', label: 'Lock Bear', url: './images/stickers/mascot_char_1.png' },
      { id: 'char2', label: 'Hi-Five', url: './images/stickers/mascot_char_4.png' },
      { id: 'char3', label: 'Night Watch', url: './images/stickers/mascot_char_8.png' },
      { id: 'char4', label: 'Dash', url: './images/stickers/mascot_char_12.png' },
      { id: 'char5', label: 'Spark', url: './images/stickers/mascot_char_16.png' },
      { id: 'char6', label: 'Shield', url: './images/stickers/mascot_char_20.png' }
    ]
  };

  var BEAR = {
    happy: ASSETS.mascotHero,
    wave: './images/stickers/sticker_wave.png',
    celebrate: './images/stickers/sticker_celebrate.png',
    laugh: './images/stickers/sticker_laugh.png',
    secret: './images/stickers/sticker_secret.png',
    shocked: './images/stickers/sticker_shocked.png',
    think: './images/stickers/sticker_thinking.png',
    sleep: './images/avatars/mascot/mascot_av_12.png',
    shield: './images/logo/logo_holding_chat.png'
  };

  function mascot(mood, size, customUrl) {
    var sz = size || 88;
    var src = customUrl || BEAR[mood] || ASSETS.mascotHero;
    return '<img src="' + src + '" alt="JChatt mascot" width="' + sz + '" height="' + sz + '" style="width:' + sz + 'px;height:' + sz + 'px;object-fit:contain;display:block;flex:none" onerror="this.style.display=\'none\'"/>';
  }

  function moodSvg(mood, size) { return mascot(mood, size || 88); }

  function pickAvatar(seedStr) {
    var s = String(seedStr || '0');
    var sum = 0;
    for (var i = 0; i < s.length; i++) sum = (sum * 31 + s.charCodeAt(i)) >>> 0;
    return ASSETS.humans[sum % ASSETS.humans.length];
  }

  function face(seedOrName, size, photoUrl) {
    var sz = size || 44;
    var src = photoUrl || pickAvatar(seedOrName);
    var label = String(seedOrName || '?').replace(/^@/, '').trim();
    var initials = label.split(/[\s._-]+/).slice(0, 2).map(function (w) { return (w[0] || '').toUpperCase(); }).join('') || 'JC';
    return '<span class="av" style="width:' + sz + 'px;height:' + sz + 'px">'
      + '<img src="' + src + '" alt="' + escHtml(label) + '" loading="lazy" onerror="this.outerHTML=\'<svg viewBox=\\\'0 0 40 40\\\'><rect width=\\\'40\\\' height=\\\'40\\\' fill=\\\'#123140\\\'/><text x=\\\'20\\\' y=\\\'25\\\' text-anchor=\\\'middle\\\' fill=\\\'#82d82f\\\' font-size=\\\'14\\\' font-weight=\\\'800\\\'>' + escHtml(initials) + '</text></svg>\'"/>'
      + '</span>';
  }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // --- 6. Crisp Vector + Brand Illustrations ---
  var ILL = {
    lock: '<div style="position:relative;display:grid;place-items:center">' + mascot('happy', 150) + '<span style="position:absolute;right:-6px;bottom:4px;width:44px;height:44px;border-radius:16px;background:var(--lime);color:var(--ink);display:grid;place-items:center;box-shadow:0 4px 0 var(--lime-d)">' + ic('lock', 22) + '</span></div>',
    vanish: '<div style="position:relative;display:grid;place-items:center">' + mascot('secret', 150) + '<span style="position:absolute;right:-6px;bottom:4px;width:44px;height:44px;border-radius:16px;background:var(--ink);color:var(--lime);display:grid;place-items:center;box-shadow:0 6px 14px rgba(0,0,0,.2)">' + ic('flame', 22) + '</span></div>',
    masks: '<div style="position:relative;display:grid;place-items:center">' + mascot('wave', 150) + '<span style="position:absolute;right:-6px;bottom:4px;width:44px;height:44px;border-radius:16px;background:var(--orange);color:#fff;display:grid;place-items:center;box-shadow:0 4px 12px rgba(255,106,43,.35)">' + ic('mask', 22) + '</span></div>',
    empty: '<div style="display:grid;place-items:center">' + mascot('think', 112) + '</div>',
    shield: '<div style="display:grid;place-items:center">' + mascot('shield', 116) + '</div>',
    verified: '<div style="display:grid;place-items:center">' + mascot('celebrate', 124) + '</div>'
  };

  // --- 7. Spec Constants: Disguise, Notifications, Timers, Groups, Domains ---
  var DIS = [
    { id: 'default', name: 'JChatt', app: 'JChatt', sub: 'Visible as JChatt', ic: 'chats', bg: '#0a2230', fg: '#82d82f' },
    { id: 'calc', name: 'Calculator+', app: 'Calculator+', sub: 'Type 314159 = to unlock', ic: 'calc', bg: '#1e1e1e', fg: '#ff9f0a' },
    { id: 'notes', name: 'QuickNotes', app: 'QuickNotes', sub: 'Tap 3 times on title', ic: 'file', bg: '#fff3c4', fg: '#785000' },
    { id: 'weather', name: 'SkyCast', app: 'SkyCast Weather', sub: 'Long-press temp to unlock', ic: 'sun', bg: '#1668b2', fg: '#ffffff' },
    { id: 'clock', name: 'WorldClock', app: 'WorldClock', sub: 'Double-tap timer tab', ic: 'clock', bg: '#0f172a', fg: '#3fc26b' },
    { id: 'fit', name: 'StrideFit', app: 'StrideFit', sub: 'Tap daily step goal', ic: 'activity', bg: '#134e4a', fg: '#82d82f' }
  ];

  var NOTIF = [
    { id: 'neutral', name: 'Neutral', title: 'New update', body: 'Open app to review item' },
    { id: 'work', name: 'Work email', title: 'Calendar sync', body: 'Weekly standup notes updated' },
    { id: 'sys', name: 'System service', title: 'Background sync', body: 'Configuration refreshed' },
    { id: 'off', name: 'Hidden completely', title: '', body: 'Lock-screen previews suppressed' }
  ];

  var TIMERS = [
    { id: 'off', label: 'Off', sec: 0, sub: 'Messages stay until cleared' },
    { id: '10s', label: '10 seconds', sec: 10, sub: 'Vanishes 10 seconds after send' },
    { id: '1h', label: '1 hour', sec: 3600, sub: 'Vanishes 1 hour after read' },
    { id: '1d', label: '24 hours', sec: 86400, sub: 'Vanishes 1 day after read' },
    { id: '7d', label: '7 days', sec: 604800, sub: 'Weekly ephemeral thread' },
    { id: 'burn', label: 'Burn after reading', sec: 5, sub: 'Self-destructs 5s after viewing' }
  ];

  var DOMAINS_META = [
    ['d-family', 'Family Hub', 'Shared chores, calendars & emergency check-ins', 'heart'],
    ['d-business', 'Work Desk', 'Quiet async standups, docs & client approvals', 'layers'],
    ['d-wellness', 'Mindful Space', 'Breathwork check-ins & screen-time limits', 'sparkles'],
    ['d-learn', 'Study Circles', 'Flashcards, Pomodoro rooms & shared notes', 'book'],
    ['d-creative', 'Studio Critique', 'Lossless moodboards & timestamped feedback', 'palette'],
    ['d-world', 'Global Relay', 'Low-bandwidth auto-translation across 40+ locales', 'globe'],
    ['d-future', 'PQC Lab', 'Post-quantum ML-KEM ratchet readiness inspector', 'zap'],
    ['d-romance', 'Close Two', 'Shared anniversary vault & couple prompts', 'heart'],
    ['d-travel', 'Trip Board', 'Offline itineraries, boarding & split expenses', 'compass'],
    ['d-health', 'Vitals Log', 'Local encrypted medication & checkup notes', 'activity'],
    ['d-clinical', 'Patient Relay', 'On-device masked intake forms', 'shield'],
    ['d-fitness', 'Track Club', 'Split paces, route GPX & hydration reminders', 'activity'],
    ['d-food', 'Supper Club', 'Shared pantry lists & recipe forks', 'smile'],
    ['d-pets', 'Pet Sitter', 'Feeding logs & walk handoff cards', 'heart'],
    ['d-shopping', 'Drop Watch', 'Shared wishlists with zero ad trackers', 'wallet'],
    ['d-jobs', 'Warm Intros', 'Masked CV handoffs & referee vouching', 'user'],
    ['d-music', 'Stem Swap', 'Lossless WAV previews & BPM notes', 'volume'],
    ['d-film', 'Watch Party', 'Synced timestamps & spoiler-blur bubbles', 'video'],
    ['d-news', 'Verified Wire', 'Signed journalist dispatches over mesh', 'globe'],
    ['d-esports', 'Squad Scrims', 'Sub-20ms push-to-talk lobbies', 'gamepad'],
    ['d-legal', 'Counsel Room', 'Timestamped attestations & NDA vanish', 'lock'],
    ['d-emergency', 'SOS Beacon', 'Offline Bluetooth mesh relay & ICE card', 'alert'],
    ['d-gig', 'Shift Board', 'Quick shift swaps with private phone masks', 'clock'],
    ['d-expat', 'Expat Circle', 'Local visa notes & city arrival buddy', 'globe'],
    ['d-pride', 'Safe Spaces', 'Decoy-PIN safe community rooms', 'shield'],
    ['d-womens', 'Walk Home', 'Live expiry check-in timer for walks', 'location'],
    ['d-seniors', 'Large-Type Mode', '20pt clarity mode & scam shield alerts', 'eye'],
    ['d-kids', 'Parent Gate', 'Whitelist-only family contacts', 'users'],
    ['d-access', 'Voice Control', 'High-contrast + live captions mode', 'mic'],
    ['d-responders', 'Dispatch Mesh', 'Off-grid BLE hop diagnostics', 'radio'],
    ['d-trades', 'Field Jobs', 'Site photo markups & sign-off PDFs', 'file'],
    ['d-farm', 'Co-op Grain', 'Weather & harvest crew bulletin', 'sun'],
    ['d-home', 'House Rules', 'Bill split, Wi-Fi QR & gate pin rotation', 'key'],
    ['d-auto', 'Convoy Mode', 'Hands-free push-to-talk road groups', 'compass'],
    ['d-faith', 'Quiet Prayer', 'Silent prayer chain & outreach calendar', 'bell'],
    ['d-civic', 'Neighborhood Watch', 'Anonymous hazard report relay', 'alert'],
    ['d-hobbies', 'Maker Bench', 'STL previews & build-log threads', 'settings'],
    ['d-science', 'Lab Notebook', 'Signed bench telemetry & protocol timers', 'activity'],
    ['d-creator', 'Inner Circle', 'Paid supporter broadcasts without algorithms', 'sparkles']
  ];

  global.JCA = {
    sha256: sha256,
    sealJson: sealJson,
    openJson: openJson,
    generatePhrase: generatePhrase,
    randomHandle: randomHandle,
    normalizeHandle: normalizeHandle,
    deriveCredentials: deriveCredentials,
    safetyNumbers: safetyNumbers,
    qrSvg: qrSvg,
    qr: qr,
    IC: IC,
    ic: ic,
    ASSETS: ASSETS,
    BEAR: BEAR,
    mascot: mascot,
    moodSvg: moodSvg,
    face: face,
    pickAvatar: pickAvatar,
    escHtml: escHtml,
    ILL: ILL,
    DIS: DIS,
    NOTIF: NOTIF,
    TIMERS: TIMERS,
    DOMAINS_META: DOMAINS_META
  };
})(window);
