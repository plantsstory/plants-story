// Tests for pure utility functions (no DOM/browser dependencies)
// Run: node --test tests/utils.test.js

var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('fs');

// Extract individual pure functions from app-core.js source
var src = fs.readFileSync(__dirname + '/../wireframe/js/app-core.js', 'utf8');

function extractFunction(name) {
  // Match: function name(...) { ... } with balanced braces
  var re = new RegExp('function ' + name + '\\s*\\([^)]*\\)\\s*\\{');
  var m = re.exec(src);
  if (!m) throw new Error('Function ' + name + ' not found');
  var start = m.index;
  var depth = 0;
  var end = start;
  for (var i = m.index + m[0].length - 1; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  return src.substring(start, end);
}

// Build a minimal eval context with just the functions we need
var code = [
  extractFunction('escHtml'),
  extractFunction('isValidInternalPath'),
  extractFunction('skeletonCards'),
  'var _rateLimits = {};',
  extractFunction('rateLimit'),
  'return { escHtml: escHtml, isValidInternalPath: isValidInternalPath, skeletonCards: skeletonCards, rateLimit: rateLimit };'
].join('\n');

var utils = new Function(code)();

// --- escHtml tests ---

test('escHtml: escapes HTML special characters', function() {
  assert.equal(utils.escHtml('<script>alert("xss")</script>'),
    '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
});

test('escHtml: handles ampersand', function() {
  assert.equal(utils.escHtml('a & b'), 'a &amp; b');
});

test('escHtml: handles single quotes', function() {
  assert.equal(utils.escHtml("it's"), 'it&#39;s');
});

test('escHtml: returns empty string for null/undefined', function() {
  assert.equal(utils.escHtml(null), '');
  assert.equal(utils.escHtml(undefined), '');
  assert.equal(utils.escHtml(''), '');
});

test('escHtml: handles number 0', function() {
  assert.equal(utils.escHtml(0), '0');
});

test('escHtml: passes through safe strings', function() {
  assert.equal(utils.escHtml('Monstera deliciosa'), 'Monstera deliciosa');
});

// --- isValidInternalPath tests ---

test('isValidInternalPath: accepts valid paths', function() {
  assert.equal(utils.isValidInternalPath('/'), true);
  assert.equal(utils.isValidInternalPath('/genus/monstera'), true);
  assert.equal(utils.isValidInternalPath('/cultivar/Monstera%20Thai'), true);
});

test('isValidInternalPath: rejects protocol injection', function() {
  assert.equal(utils.isValidInternalPath('https://evil.com'), false);
  assert.equal(utils.isValidInternalPath('javascript:alert(1)'), false);
});

test('isValidInternalPath: rejects double slashes', function() {
  assert.equal(utils.isValidInternalPath('//evil.com'), false);
  assert.equal(utils.isValidInternalPath('/foo//bar'), false);
});

test('isValidInternalPath: rejects null/empty', function() {
  assert.equal(utils.isValidInternalPath(null), false);
  assert.equal(utils.isValidInternalPath(''), false);
  assert.equal(utils.isValidInternalPath(undefined), false);
});

// --- skeletonCards tests ---

test('skeletonCards: generates correct number of cards', function() {
  var html = utils.skeletonCards(3);
  var count = (html.match(/<div class="skeleton-card">/g) || []).length;
  assert.equal(count, 3);
});

test('skeletonCards: returns empty string for 0', function() {
  assert.equal(utils.skeletonCards(0), '');
});

// --- rateLimit tests ---

test('rateLimit: allows first call', function() {
  assert.equal(utils.rateLimit('test-action-1', 1000), true);
});

test('rateLimit: blocks rapid second call', function() {
  utils.rateLimit('test-action-2', 1000);
  assert.equal(utils.rateLimit('test-action-2', 1000), false);
});

test('rateLimit: allows different actions', function() {
  utils.rateLimit('test-action-3a', 1000);
  assert.equal(utils.rateLimit('test-action-3b', 1000), true);
});
