const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  checkHtmlFile,
  findAnchorTags,
  findHtmlFiles,
  getBlankTargetRelFailureReason,
  getLineColumn,
  getRelTokens,
  hasRequiredRelTokens,
  isHtmlFile,
  run,
  shouldSkipDirectory,
} = require('./check-external-links.js');

function getAttributeValue(tag, attributeName) {
  const attributeRegex = new RegExp(`\\b${attributeName}\\s*=\\s*"([^"]*)"`, 'i');
  return tag.match(attributeRegex)?.[1] ?? null;
}

test('getLineColumn returns 1-based line/column', () => {
  const text = 'first\nsecond\nthird';
  assert.deepEqual(getLineColumn(text, 0), { line: 1, column: 1 });
  assert.deepEqual(getLineColumn(text, 8), { line: 2, column: 3 });
  assert.deepEqual(getLineColumn(text, text.length), { line: 3, column: 6 });
});

test('file discovery predicates identify scannable html files and skipped directories', () => {
  assert.equal(shouldSkipDirectory(dirent('.git', 'directory')), true);
  assert.equal(shouldSkipDirectory(dirent('node_modules', 'directory')), true);
  assert.equal(shouldSkipDirectory(dirent('.well-known', 'directory')), false);
  assert.equal(shouldSkipDirectory(dirent('.git', 'file')), false);

  assert.equal(isHtmlFile(dirent('index.html', 'file')), true);
  assert.equal(isHtmlFile(dirent('index.HTML', 'file')), false);
  assert.equal(isHtmlFile(dirent('docs.html', 'directory')), false);
});

test('findAnchorTags returns tag text and source indexes', () => {
  const html = '<main><a href="/">home</a><p>text</p><a href="/about">about</a></main>';

  assert.deepEqual(findAnchorTags(html), [
    { tag: '<a href="/">', index: 6 },
    { tag: '<a href="/about">', index: 37 },
  ]);
});

test('findAnchorTags preserves quoted greater-than characters inside attributes', () => {
  const html = '<a href="https://example.com?q=1>0" aria-label="1 > 0">math</a>';

  assert.deepEqual(findAnchorTags(html), [
    { tag: '<a href="https://example.com?q=1>0" aria-label="1 > 0">', index: 0 },
  ]);
});

test('getBlankTargetRelFailureReason ignores non-blank targets', () => {
  assert.equal(getBlankTargetRelFailureReason('<a href="/local">local</a>'), null);
  assert.equal(getBlankTargetRelFailureReason('<a href="/local" target="_self">local</a>'), null);
});

test('getBlankTargetRelFailureReason validates required rel tokens', () => {
  assert.equal(
    getBlankTargetRelFailureReason('<a href="https://example.com" target="_blank">bad</a>'),
    'missing rel attribute',
  );
  assert.equal(
    getBlankTargetRelFailureReason(
      '<a href="https://example.com" target="_blank" rel="noopener external">bad</a>',
    ),
    'rel must include both noopener and noreferrer',
  );
  assert.equal(
    getBlankTargetRelFailureReason(
      '<a href="https://example.com" target="_BLANK" rel="NOOPENER noreferrer external">ok</a>',
    ),
    null,
  );
});

test('getRelTokens normalizes whitespace, duplicates, and case', () => {
  assert.deepEqual([...getRelTokens('  NoOpener  noreferrer noopener  ')], [
    'noopener',
    'noreferrer',
  ]);
});

test('hasRequiredRelTokens requires noopener and noreferrer', () => {
  assert.equal(hasRequiredRelTokens('noopener noreferrer'), true);
  assert.equal(hasRequiredRelTokens('external noreferrer noopener'), true);
  assert.equal(hasRequiredRelTokens('noopener'), false);
  assert.equal(hasRequiredRelTokens('noreferrer'), false);
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

test('checkHtmlFile ignores prefixed target attributes', () => {
  const html = '<a href="https://example.com" data-target="_blank">ok</a>';
  const failures = checkHtmlFile(html, 'index.html');

  assert.equal(failures.length, 0);
});

test('checkHtmlFile ignores prefixed rel attributes', () => {
  const html =
    '<a href="https://example.com" target="_blank" data-rel="noopener noreferrer">bad</a>';
  const failures = checkHtmlFile(html, 'index.html');

  assert.equal(failures.length, 1);
  assert.equal(failures[0].reason, 'missing rel attribute');
});

test('checkHtmlFile fails for unquoted target=_blank when rel is missing', () => {
  const html = '<a href="https://example.com" target=_blank>bad</a>';
  const failures = checkHtmlFile(html, 'index.html');

  assert.equal(failures.length, 1);
  assert.equal(failures[0].reason, 'missing rel attribute');
});

test('checkHtmlFile ignores data-target attributes', () => {
  const html = '<a href="https://example.com" data-target="_blank">ok</a>';
  const failures = checkHtmlFile(html, 'index.html');

  assert.equal(failures.length, 0);
});

test('checkHtmlFile does not treat data-rel as rel', () => {
  const html =
    '<a href="https://example.com" target="_blank" data-rel="noopener noreferrer">bad</a>';
  const failures = checkHtmlFile(html, 'index.html');

  assert.equal(failures.length, 1);
  assert.equal(failures[0].reason, 'missing rel attribute');
});

test('checkHtmlFile fails for single-quoted target=_blank when rel is missing', () => {
  const html = "<a href='https://example.com' target='_blank'>bad</a>";
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

test('checkHtmlFile passes for single-quoted target=_blank with valid rel tokens', () => {
  const html = "<a href='https://example.com' target='_blank' rel='noopener noreferrer'>ok</a>";
  const failures = checkHtmlFile(html, 'index.html');

  assert.equal(failures.length, 0);
});

test('site social links have explicit accessible labels', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const socialLinks = html.match(/<div class="social-links">([\s\S]*?)<\/div>/);

  assert.ok(socialLinks, 'expected social links block to exist');

  const socialAnchorTags = [...socialLinks[1].matchAll(/<a\b[^>]*>/g)].map(match => match[0]);
  assert.deepEqual(
    socialAnchorTags.map(tag => getAttributeValue(tag, 'aria-label')),
    [
      'Follow Roberto Ansuini on X',
      'Connect with Roberto Ansuini on LinkedIn',
      'View Roberto Ansuini on GitHub',
    ],
  );
});

test('checkHtmlFile ignores unsafe anchors inside HTML comments', () => {
  const html = '<!-- <a href="https://example.com" target="_blank">commented out</a> -->';
  const failures = checkHtmlFile(html, 'index.html');

  assert.equal(failures.length, 0);
});

test('checkHtmlFile still reports unsafe anchors after HTML comments', () => {
  const html = '<!-- <a href="https://safe-to-ignore.com" target="_blank">ignore</a> -->\n<a href="https://example.com" target="_blank">bad</a>';
  const failures = checkHtmlFile(html, 'index.html');

  assert.equal(failures.length, 1);
  assert.equal(failures[0].reason, 'missing rel attribute');
  assert.equal(failures[0].line, 2);
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

test('findHtmlFiles returns nested html files and skips internal directories', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'link-check-find-'));

  try {
    fs.mkdirSync(path.join(tempDir, 'nested'));
    fs.mkdirSync(path.join(tempDir, '.git'));

    fs.writeFileSync(path.join(tempDir, 'index.html'), '', 'utf8');
    fs.writeFileSync(path.join(tempDir, 'notes.txt'), '', 'utf8');
    fs.writeFileSync(path.join(tempDir, 'nested', 'page.html'), '', 'utf8');
    fs.writeFileSync(path.join(tempDir, '.git', 'ignored.html'), '', 'utf8');

    assert.deepEqual(
      findHtmlFiles(tempDir).map(filePath => path.relative(tempDir, filePath)).sort(),
      ['index.html', path.join('nested', 'page.html')],
    );
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

function dirent(name, type) {
  return {
    name,
    isDirectory: () => type === 'directory',
    isFile: () => type === 'file',
  };
}
