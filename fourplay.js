(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.fourplay = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BASE = [13, 24, 78, 91];

  var LITERALS = {
    12: '((91-78)-(91÷13-78÷13))',
    10: '((24-13)-(91÷13-78÷13))',
    9: '((91÷13)+(91÷13-78÷13)+(91÷13-78÷13))',
    8: '((91÷13)+(91÷13-78÷13))',
    5: '((78÷13)-(91÷13-78÷13))',
    4: '((78÷13)-((91-78)-(24-13)))',
    3: '((24×13)÷(91+13))',
    2: '((91-78)-(24-13))',
    8281: '(91×91)',
    7098: '(78×91)',
    6084: '(78×78)',
    2184: '(24×91)',
    1872: '(24×78)',
    1183: '(13×91)',
    1014: '(13×78)',
    576: '(24×24)',
    312: '(13×24)',
    206: '(13+24+78+91)',
    169: '(13×13)',
    115: '(91+24)',
    102: '(91+24-13)',
    91: '91',
    89: '(78+24-13)',
    78: '78',
    67: '(91-24)',
    65: '(78-13)',
    54: '(78-24)',
    24: '24',
    13: '13',
    11: '(24-13)',
    7: '(91÷13)',
    6: '(78÷13)',
    1: '(91÷13-78÷13)',
    0: '(91-78-13)'
  };

  var ZEROS = [
    '(91-78-13)', '(13-13)', '(91-91)', '(24-24)', '(78-78)',
    '(13×13-13×13)', '(78÷13-78÷13)'
  ];

  var ONES = [
    '(91÷13-78÷13)', '(24÷24)', '(13÷13)', '(78÷78)', '(91÷91)',
    '(13×13÷13÷13)', '(78×78÷78÷78)'
  ];

  var WEIGHT = { '×': 2, '÷': 2, '+': 1, '-': 1 };

  function keysDesc() {
    var out = [];
    for (var k in LITERALS) if (Object.prototype.hasOwnProperty.call(LITERALS, k)) out.push(Number(k));
    out.sort(function (a, b) { return b - a; });
    return out;
  }

  function egcd(a, b) {
    if (b === 0) return [a, 1, 0];
    var r = egcd(b, a % b);
    return [r[0], r[2], r[1] - Math.floor(a / b) * r[2]];
  }

  function solveCoeffs(n, limit) {
    limit = limit || 40;
    var g = egcd(BASE[0], BASE[1]), gcd = g[0], x13 = g[1], y24 = g[2];
    var best = null, bestKey = null;
    for (var d = -limit; d <= limit; d++) {
      for (var c = -limit; c <= limit; c++) {
        var rem = n - BASE[3] * d - BASE[2] * c;
        if (rem % gcd !== 0) continue;
        var k = rem / gcd, a0 = x13 * k, b0 = y24 * k;
        var t0 = Math.round((BASE[0] * b0 - BASE[1] * a0) / (BASE[0] * BASE[0] + BASE[1] * BASE[1]));
        for (var j = -1; j <= 1; j++) {
          var a = a0 + BASE[1] * (t0 + j), b = b0 - BASE[0] * (t0 + j);
          if (Math.abs(a) > limit || Math.abs(b) > limit) continue;
          var cost = Math.abs(a) + Math.abs(b) + Math.abs(c) + Math.abs(d);
          var nz = (a ? 1 : 0) + (b ? 1 : 0) + (c ? 1 : 0) + (d ? 1 : 0);
          var key = cost * 10 + nz;
          if (bestKey === null || key < bestKey) { bestKey = key; best = [a, b, c, d]; }
        }
      }
    }
    if (best) return best;
    return directSolve(n);
  }

  function directSolve(n) {
    var d = Math.round(n / BASE[3]);
    var rem = n - BASE[3] * d;
    var g = egcd(BASE[0], BASE[1]);
    var a = g[1] * rem, b = g[2] * rem;
    var t = Math.round((BASE[0] * b - BASE[1] * a) / (BASE[0] * BASE[0] + BASE[1] * BASE[1]));
    a += BASE[1] * t;
    b -= BASE[0] * t;
    return [a, b, 0, d];
  }

  function amount(v) {
    if (v < 0) v = -v;
    if (v === 0) return '(13-13)';
    if (LITERALS[v]) return LITERALS[v];
    return greedy(v, 0);
  }

  function buildLinear(coeffs) {
    var parts = [];
    for (var i = 0; i < coeffs.length; i++) {
      if (!coeffs[i]) continue;
      var coef = Math.abs(coeffs[i]);
      var body = coef === 1 ? String(BASE[i]) : '(' + amount(coef) + ')×' + BASE[i];
      parts.push((coeffs[i] < 0 ? '-' : '+') + body);
    }
    if (!parts.length) return '(13-13)';
    var out = parts[0].charAt(0) === '+' ? parts[0].slice(1) : parts[0];
    for (var j = 1; j < parts.length; j++) out += parts[j];
    return out;
  }

  function greedy(n, depth) {
    if (LITERALS[n]) return LITERALS[n];
    depth = depth || 0;
    if (depth > 24) return null;
    var keys = keysDesc().filter(function (k) { return k >= 2 && k <= n; });
    if (!keys.length) return null;
    var base = keys[0];
    var q = Math.floor(n / base), r = n % base;
    var qs = greedy(q, depth + 1);
    if (qs === null) return null;
    var out = q === 1 ? LITERALS[base] : LITERALS[base] + '×(' + qs + ')';
    if (r > 0) {
      var rs = greedy(r, depth + 1);
      if (rs === null) return null;
      out += '+(' + rs + ')';
    }
    return out;
  }

  function decorate(expr, layers) {
    var out = '(' + expr + ')';
    for (var i = 0; i < layers; i++) {
      if (i % 2 === 0) out = out + '×' + ONES[i % ONES.length];
      else out = '(' + out + ')+' + ZEROS[i % ZEROS.length];
    }
    return out;
  }

  function finisher(expr) {
    var guard = 0;
    while (guard++ < 50 && /[×÷]\([^+\-()]+\)/.test(expr)) {
      expr = expr.replace(/([×÷])\(([^+\-()]+)\)/, '$1$2');
    }
    guard = 0;
    while (guard++ < 50 && /\+\([^()]+\)/.test(expr)) {
      expr = expr.replace(/\+\(([^()]+)\)/, '+$1');
    }
    if (/^\([^()]+\)$/.test(expr)) expr = expr.replace(/^\(([^()]+)\)$/, '$1');
    return expr;
  }

  function complexity(expr) {
    var score = 0;
    for (var ch in WEIGHT) {
      if (!Object.prototype.hasOwnProperty.call(WEIGHT, ch)) continue;
      var idx = expr.indexOf(ch), count = 0;
      while (idx !== -1) { count++; idx = expr.indexOf(ch, idx + ch.length); }
      score += count * WEIGHT[ch];
    }
    var open = 0, i = expr.indexOf('(');
    while (i !== -1) { open++; i = expr.indexOf('(', i + 1); }
    return score + Math.floor(open / 2);
  }

  function stars(score) {
    var level = Math.floor(score / 7) + 1;
    if (level > 5) level = 5;
    if (level < 1) level = 1;
    return '★'.repeat(level) + '☆'.repeat(5 - level);
  }

  function verify(expr, target) {
    var js = expr.replace(/×/g, '*').replace(/÷/g, '/');
    try {
      return Math.abs(eval(js) - target) < 1e-9;
    } catch (e) {
      return false;
    }
  }

  function fourplay(n, opts) {
    opts = opts || {};
    var style = opts.style || 'greedy';
    var dirty = opts.dirty || 0;

    if (typeof n !== 'number' || Number.isNaN(n) || !isFinite(n)) return '';

    var expr = null;
    if (n < 0) {
      expr = '-(' + fourplay(-n, opts) + ')';
    } else if (!Number.isInteger(n)) {
      var s = String(n);
      if (s.indexOf('e') >= 0) return '小数太长，换个正常的';
      var parts2 = s.split('.');
      var scale = Math.pow(10, parts2[1].length);
      var scaled = Math.round(Math.abs(n) * scale);
      expr = '(' + fourplay(scaled, { style: style }) + ')÷(' + fourplay(scale, { style: style }) + ')';
    } else if (style === 'linear') {
      expr = buildLinear(solveCoeffs(n));
    } else {
      expr = greedy(n);
      if (expr === null) expr = buildLinear(solveCoeffs(n));
    }

    if (dirty > 0) expr = decorate(expr, dirty);
    expr = finisher(expr);
    return expr;
  }

  fourplay.verify = verify;
  fourplay.complexity = complexity;
  fourplay.stars = stars;
  fourplay.LITERALS = LITERALS;
  fourplay.greedy = greedy;

  return fourplay;
});
