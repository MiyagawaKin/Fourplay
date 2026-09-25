var fs = require('fs');
var vm = require('vm');
var ALLOW = ['13', '24', '78', '91'];

function load() {
  var ctx = { console: console };
  ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(__dirname + '/fourplay.js', 'utf8'), ctx);
  return ctx.fourplay;
}

function loadPage() {
  var html = fs.readFileSync(__dirname + '/index.html', 'utf8');
  var blocks = html.match(/<script>[\s\S]*?<\/script>/g).map(function (b) {
    return b.replace(/^<script>/, '').replace(/<\/script>$/, '');
  });
  function el(id) {
    return { id: id, value: '', textContent: '', innerHTML: '', className: '', style: {}, addEventListener: function () {} };
  }
  var els = {};
  ['num', 'out', 'egg'].forEach(function (id) { els[id] = el(id); });
  var ctx = {
    console: console,
    navigator: {},
    document: { getElementById: function (id) { return els[id] || el(id); } }
  };
  ctx.self = ctx;
  vm.createContext(ctx);
  blocks.forEach(function (b, i) { vm.runInContext(b, ctx, { filename: 'block' + i + '.js' }); });
  return { ctx: ctx, els: els };
}

function offenders(expr) {
  return (String(expr).match(/\d+/g) || []).filter(function (d) { return ALLOW.indexOf(d) < 0; });
}

function pureEngine(fp) {
  var fails = [];
  var nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 24, 25, 30, 42, 50, 78, 89, 91, 100, 127, 128, 169, 200, 255, 256, 365, 512, 576, 666, 786, 999, 1000, 1024, 1234, 2024, 4096, 8281, 9999, 12345, 65536, 114514, 123456, 999999, 12345678, 999999999, 1e15];
  [-1, -42, -786, 0.5, 2.25, 1e-3].forEach(function (n) { nums.push(n); });
  var count = 0;
  ['greedy', 'linear'].forEach(function (style) {
    nums.forEach(function (n) {
      [0, 1, 3, 7, 10].forEach(function (dirty) {
        count++;
        var expr = fp(n, { style: style, dirty: dirty });
        var tag = style + ' n=' + n + ' dirty=' + dirty;
        if (typeof expr !== 'string') return fails.push(tag + ' :: 无输出');
        if (expr.indexOf('^') >= 0 || expr.indexOf('√') >= 0) fails.push(tag + ' :: 出现幂或根号 :: ' + expr);
        var bad = offenders(expr);
        if (bad.length) fails.push(tag + ' :: 越界数字 ' + bad.join(',') + ' :: ' + expr);
        if (!fp.verify(expr, n)) fails.push(tag + ' :: 验算失败 :: ' + expr);
      });
    });
  });
  [NaN, Infinity, -Infinity, 'a', '12', undefined, null].forEach(function (n) {
    if (fp(n, {}) !== '') fails.push('非法输入 ' + String(n) + ' :: ' + JSON.stringify(fp(n, {})));
  });
  [13, 24, 78, 91].forEach(function (n) {
    if (fp(n, {}) !== String(n)) fails.push('自身字面量 n=' + n + ' :: ' + fp(n, {}));
  });
  return { count: count, fails: fails };
}

function purePage(page) {
  var ctx = page.ctx, els = page.els, fails = [], count = 0;
  els.num.value = '';
  ctx.run();
  if (els.out.textContent !== '13 · 24 · 78 · 91' || els.out.className !== 'hint') fails.push('空输入 :: ' + els.out.textContent);
  ['-', '--'].forEach(function (raw) {
    els.num.value = raw;
    ctx.run();
    if (els.out.className !== 'hint') fails.push('空值 ' + JSON.stringify(raw) + ' :: ' + els.out.textContent);
  });
  ['000', '-0', '-0000'].forEach(function (raw) {
    els.num.value = raw;
    ctx.run();
    if (!ctx.fourplay.verify(els.out.textContent, 0)) fails.push('零 ' + JSON.stringify(raw) + ' :: ' + els.out.textContent);
  });
  [['abc12-3', '-123'], ['12.5', '125'], ['1e9', '19'], ['-0-7', '-7'], ['007', '7'], ['42', '42'], ['-42', '-42'], ['3 4 5', '345'], ['', ''], ['-', '-'], ['+++', '']].forEach(function (t) {
    count++;
    var got = ctx.sanitize(t[0]);
    if (got !== t[1]) fails.push('净化 ' + JSON.stringify(t[0]) + ' :: 得到 ' + JSON.stringify(got) + '，应为 ' + JSON.stringify(t[1]));
    if (/[^0-9-]/.test(got)) fails.push('净化 ' + JSON.stringify(t[0]) + ' :: 残留非法字符 ' + got);
    if (got.indexOf('-') > 0) fails.push('净化 ' + JSON.stringify(t[0]) + ' :: 负号不在首位 ' + got);
  });
  [0, 7, 13, 91, 786, 2024, 114514, 12345678, -786, 99999999999999999999].forEach(function (n) {
    count++;
    els.num.value = String(n);
    ctx.run();
    var expr = els.out.textContent;
    var tag = 'web n=' + n;
    if (!expr || els.out.className === 'err') return fails.push(tag + ' :: 页面没渲染出式子 :: ' + expr);
    if (expr.indexOf('^') >= 0 || expr.indexOf('√') >= 0) fails.push(tag + ' :: 出现幂或根号 :: ' + expr);
    var bad = offenders(expr);
    if (bad.length) fails.push(tag + ' :: 越界数字 ' + bad.join(',') + ' :: ' + expr);
    if (!ctx.fourplay.verify(expr, parseInt(String(n), 10))) fails.push(tag + ' :: 验算失败 :: ' + expr);
  });
  count++;
  els.num.value = '114514';
  ctx.run();
  var eggHtml = els.egg.innerHTML;
  if (eggHtml.indexOf('https://lab.magiconch.com/homo') < 0) fails.push('114514 彩蛋没出现 :: ' + JSON.stringify(eggHtml));
  if (eggHtml.indexOf('href="https://lab.magiconch.com/homo"') < 0) fails.push('114514 彩蛋不是链接 :: ' + eggHtml);
  if (!ctx.fourplay.verify(els.out.textContent, 114514)) fails.push('114514 正文 :: ' + els.out.textContent);
  ['114515', '11451', '11', '0'].forEach(function (raw) {
    els.num.value = raw;
    ctx.run();
    if (els.egg.innerHTML !== '') fails.push('彩蛋串台 raw=' + raw + ' :: ' + els.egg.innerHTML);
  });
  els.num.value = '';
  ctx.run();
  if (els.egg.innerHTML !== '') fails.push('清空后彩蛋没清 :: ' + els.egg.innerHTML);
  return { count: count, fails: fails };
}

var a = pureEngine(load());
var b = purePage(loadPage());
var fails = a.fails.concat(b.fails);
console.log('引擎用例 ' + a.count + ' 个，页面用例 ' + b.count + ' 个');
console.log('失败 ' + fails.length + ' 个');
fails.slice(0, 20).forEach(function (f) { console.log('  ✗ ' + f); });
process.exit(fails.length ? 1 : 0);
