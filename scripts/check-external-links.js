#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const rootDir = process.cwd();
const SKIP_DIRS = new Set(['.git', 'node_modules']);

const anchorTagRegex = /<a\b[^>]*>/gi;
const targetBlankRegex = /\btarget\s*=\s*(["'])_blank\1/i;
const relRegex = /\brel\s*=\s*(["'])(.*?)\1/i;

function findHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) {
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

    if (!targetBlankRegex.test(tag)) {
      continue;
    }

    const relMatch = tag.match(relRegex);
    if (!relMatch) {
      failures.push({
        filePath,
        index: match.index,
        reason: 'missing rel attribute',
        tag,
      });
      continue;
    }

    const relTokens = new Set(
      relMatch[2]
        .split(/\s+/)
        .map(token => token.trim().toLowerCase())
        .filter(Boolean),
    );

    if (!relTokens.has('noopener') || !relTokens.has('noreferrer')) {
      failures.push({
        filePath,
        index: match.index,
        reason: 'rel must include both noopener and noreferrer',
        tag,
      });
    }
  }

  return failures;
}

const htmlFiles = findHtmlFiles(rootDir).sort();
if (htmlFiles.length === 0) {
  console.error('No HTML files found to validate.');
  process.exit(1);
}

const failures = [];
for (const filePath of htmlFiles) {
  const html = fs.readFileSync(filePath, 'utf8');
  anchorTagRegex.lastIndex = 0;
  failures.push(...checkHtmlFile(html, path.relative(rootDir, filePath)));
}

if (failures.length > 0) {
  console.error('External link safety check failed.');
  for (const failure of failures) {
    console.error(`- ${failure.reason} in ${failure.filePath} @ index ${failure.index}: ${failure.tag}`);
  }
  process.exit(1);
}

console.log(`External link safety check passed (${htmlFiles.length} HTML file(s) scanned).`);
