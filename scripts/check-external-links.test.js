const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { checkHtmlFile, getLineColumn, run } = require('./check-external-links.js');

test('getLineColumn returns 1-based line/column', () => {
  const text = 'first\nsecond\nthird';
  assert.deepEqual(getLineColumn(text, 0), { line: 1, column: 1 });
  assert.deepEqual(getLineColumn(text, 8), { line: 2, column: 3 });
  assert.deepEqual(getLineColumn(text, text.length), { line: 3, column: 6 });
});

test('checkHtmlFile passes when target=_blank includes noopener noreferrer', () => {
  const html = '<a href="https://example.com" target="_blank" rel="noopener noreferrer">ok</a>';
  const failures = checkHtmlFile(html, 'index.html');
  assert.equal(failures.length, 0);
});

test('checkHtmlFile fails when rel attribute is missing', () => {
  const html = '<main>\n  <a href="https://example.com" target="_blank">bad</a>\n</main>';
  const failures = checkHtmlFile(html, 'index.html');

  assert.equal(failures.length, 1);
  assert.equal(failures[0].reason, 'missing rel attribute');
  assert.equal(failures[0].filePath, 'index.html');
  assert.equal(failures[0].line, 2);
  assert.equal(failures[0].column, 3);
});

test('checkHtmlFile fails for unquoted target=_blank when rel is missing', () => {
  const html = '<a href="https://example.com" target=_blank>bad</a>';
  const failures = checkHtmlFile(html, 'index.html');

  assert.equal(failures.length, 1);
  assert.equal(failures[0].reason, 'missing rel attribute');
});

test('checkHtmlFile fails when rel misses required tokens', () => {
  const html = '<a href="https://example.com" target="_blank" rel="noopener">bad</a>';
  const failures = checkHtmlFile(html, 'index.html');

  assert.equal(failures.length, 1);
  assert.equal(failures[0].reason, 'rel must include both noopener and noreferrer');
});

test('checkHtmlFile passes for unquoted target=_blank with valid rel tokens', () => {
  const html = '<a href="https://example.com" target=_blank rel="noopener noreferrer">ok</a>';
  const failures = checkHtmlFile(html, 'index.html');

  assert.equal(failures.length, 0);
});

test('run scans nested html files and reports file count on success', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'link-check-pass-'));

  try {
    fs.mkdirSync(path.join(tempDir, 'nested'));
    fs.writeFileSync(
      path.join(tempDir, 'index.html'),
      '<a href="https://a.com" target="_blank" rel="noopener noreferrer">A</a>',
      'utf8',
    );
    fs.writeFileSync(
      path.join(tempDir, 'nested', 'page.html'),
      '<a href="https://b.com" target="_blank" rel="noreferrer noopener">B</a>',
      'utf8',
    );

    const result = run(tempDir);
    assert.equal(result.ok, true);
    assert.equal(result.htmlFileCount, 2);
    assert.equal(result.failures.length, 0);
    assert.match(result.message, /2 HTML file\(s\) scanned/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('run scans hidden web dirs but skips internal directories', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'link-check-hidden-'));

  try {
    fs.mkdirSync(path.join(tempDir, '.well-known'));
    fs.mkdirSync(path.join(tempDir, '.git'));
    fs.mkdirSync(path.join(tempDir, 'node_modules'));

    fs.writeFileSync(
      path.join(tempDir, 'index.html'),
      '<a href="https://a.com" target="_blank" rel="noopener noreferrer">A</a>',
      'utf8',
    );
    fs.writeFileSync(
      path.join(tempDir, '.well-known', 'security.html'),
      '<a href="https://b.com" target="_blank" rel="noopener noreferrer">B</a>',
      'utf8',
    );

    fs.writeFileSync(
      path.join(tempDir, '.git', 'ignored.html'),
      '<a href="https://bad.com" target="_blank">bad</a>',
      'utf8',
    );
    fs.writeFileSync(
      path.join(tempDir, 'node_modules', 'ignored.html'),
      '<a href="https://bad.com" target="_blank">bad</a>',
      'utf8',
    );

    const result = run(tempDir);
    assert.equal(result.ok, true);
    assert.equal(result.htmlFileCount, 2);
    assert.equal(result.failures.length, 0);
    assert.match(result.message, /2 HTML file\(s\) scanned/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('run returns failure when no html files are present', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'link-check-empty-'));

  try {
    const result = run(tempDir);
    assert.equal(result.ok, false);
    assert.equal(result.htmlFileCount, 0);
    assert.equal(result.failures.length, 0);
    assert.equal(result.message, 'No HTML files found to validate.');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
