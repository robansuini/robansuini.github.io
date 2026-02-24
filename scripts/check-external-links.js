#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.join(process.cwd(), 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const anchorTagRegex = /<a\b[^>]*>/gi;
const targetBlankRegex = /\btarget\s*=\s*(["'])_blank\1/i;
const relRegex = /\brel\s*=\s*(["'])(.*?)\1/i;

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
      index: match.index,
      reason: 'rel must include both noopener and noreferrer',
      tag,
    });
  }
}

if (failures.length > 0) {
  console.error('External link safety check failed.');
  for (const failure of failures) {
    console.error(`- ${failure.reason} @ index ${failure.index}: ${failure.tag}`);
  }
  process.exit(1);
}

console.log('External link safety check passed.');
