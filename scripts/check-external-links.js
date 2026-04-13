#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const SKIP_DIRS = new Set(['.git', 'node_modules']);

const anchorTagRegex = /<a\b[^>]*>/gi;

function getAttributeValue(tag, attributeName) {
  const attributeRegex = new RegExp(
    `\\b${attributeName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\`]+))`,
    'i',
  );
  const match = tag.match(attributeRegex);
  if (!match) {
    return null;
  }

  return match[1] ?? match[2] ?? match[3] ?? '';
}

function getLineColumn(text, index) {
  const safeIndex = Math.max(0, Math.min(index, text.length));
  const upToIndex = text.slice(0, safeIndex);
  const line = upToIndex.split('\n').length;
  const lastNewline = upToIndex.lastIndexOf('\n');
  const column = safeIndex - lastNewline;
  return { line, column };
}

function findHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findHtmlFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }

  return files;
}

function checkHtmlFile(html, filePath) {
  const failures = [];
  let match;

  while ((match = anchorTagRegex.exec(html)) !== null) {
    const tag = match[0];

    const target = getAttributeValue(tag, 'target');
    if (!target || target.toLowerCase() !== '_blank') {
      continue;
    }

    const location = getLineColumn(html, match.index);

    const rel = getAttributeValue(tag, 'rel');
    if (rel === null) {
      failures.push({
        filePath,
        index: match.index,
        line: location.line,
        column: location.column,
        reason: 'missing rel attribute',
        tag,
      });
      continue;
    }

    const relTokens = new Set(
      rel
        .split(/\s+/)
        .map(token => token.trim().toLowerCase())
        .filter(Boolean),
    );

    if (!relTokens.has('noopener') || !relTokens.has('noreferrer')) {
      failures.push({
        filePath,
        index: match.index,
        line: location.line,
        column: location.column,
        reason: 'rel must include both noopener and noreferrer',
        tag,
      });
    }
  }

  return failures;
}

function run(rootDir = process.cwd()) {
  const htmlFiles = findHtmlFiles(rootDir).sort();
  if (htmlFiles.length === 0) {
    return {
      ok: false,
      htmlFileCount: 0,
      failures: [],
      message: 'No HTML files found to validate.',
    };
  }

  const failures = [];
  for (const filePath of htmlFiles) {
    const html = fs.readFileSync(filePath, 'utf8');
    anchorTagRegex.lastIndex = 0;
    failures.push(...checkHtmlFile(html, path.relative(rootDir, filePath)));
  }

  if (failures.length > 0) {
    return {
      ok: false,
      htmlFileCount: htmlFiles.length,
      failures,
      message: 'External link safety check failed.',
    };
  }

  return {
    ok: true,
    htmlFileCount: htmlFiles.length,
    failures: [],
    message: `External link safety check passed (${htmlFiles.length} HTML file(s) scanned).`,
  };
}

function main() {
  const result = run();

  if (!result.ok) {
    console.error(result.message);
    for (const failure of result.failures) {
      const line = failure.line ?? '?';
      const column = failure.column ?? '?';
      console.error(
        `- ${failure.reason} in ${failure.filePath}:${line}:${column} (index ${failure.index}): ${failure.tag}`,
      );
    }
    process.exit(1);
  }

  console.log(result.message);
}

module.exports = {
  checkHtmlFile,
  findHtmlFiles,
  getLineColumn,
  run,
};

if (require.main === module) {
  main();
}
