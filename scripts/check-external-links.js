#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ANCHOR_TAG_REGEX = /<a\b[^>]*>/gi;
const ATTRIBUTE_REGEX = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const REQUIRED_REL_TOKENS = ['noopener', 'noreferrer'];

function resolveHtmlPath(rawPath) {
  if (!rawPath) {
    return path.join(process.cwd(), 'index.html');
  }

  return path.resolve(process.cwd(), rawPath);
}

function readHtmlFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function extractAnchorTags(html) {
  const anchors = [];
  let match;

  while ((match = ANCHOR_TAG_REGEX.exec(html)) !== null) {
    anchors.push({
      tag: match[0],
      index: match.index,
    });
  }

  return anchors;
}

function parseAttributes(tag) {
  const attributes = new Map();
  const rawAttributes = tag
    .replace(/^<a\b/i, '')
    .replace(/>$/, '')
    .trim();

  let match;
  while ((match = ATTRIBUTE_REGEX.exec(rawAttributes)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    attributes.set(name, value);
  }

  return attributes;
}

function buildLineStarts(text) {
  const lineStarts = [0];

  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '\n') {
      lineStarts.push(i + 1);
    }
  }

  return lineStarts;
}

function getLineAndColumn(index, lineStarts) {
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lineStarts[mid] <= index) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const lineIndex = Math.max(high, 0);
  return {
    line: lineIndex + 1,
    column: index - lineStarts[lineIndex] + 1,
  };
}

function parseRelTokens(relValue) {
  return new Set(
    relValue
      .split(/\s+/)
      .map(token => token.trim().toLowerCase())
      .filter(Boolean),
  );
}

function validateAnchor(anchor, lineStarts) {
  const attributes = parseAttributes(anchor.tag);
  const target = attributes.get('target')?.toLowerCase();

  if (target !== '_blank') {
    return null;
  }

  const position = getLineAndColumn(anchor.index, lineStarts);
  const rel = attributes.get('rel');

  if (!rel) {
    return {
      reason: 'missing rel attribute',
      tag: anchor.tag,
      ...position,
    };
  }

  const relTokens = parseRelTokens(rel);
  const missingTokens = REQUIRED_REL_TOKENS.filter(token => !relTokens.has(token));

  if (missingTokens.length > 0) {
    return {
      reason: `rel is missing required tokens: ${missingTokens.join(', ')}`,
      tag: anchor.tag,
      ...position,
    };
  }

  return null;
}

function validateHtml(html) {
  const anchors = extractAnchorTags(html);
  const lineStarts = buildLineStarts(html);

  return anchors
    .map(anchor => validateAnchor(anchor, lineStarts))
    .filter(Boolean);
}

function reportFailures(failures, filePath) {
  console.error(`External link safety check failed for ${filePath}.`);

  for (const failure of failures) {
    console.error(
      `- ${failure.reason} @ line ${failure.line}, col ${failure.column}: ${failure.tag}`,
    );
  }
}

function main() {
  const filePath = resolveHtmlPath(process.argv[2]);

  let html;
  try {
    html = readHtmlFile(filePath);
  } catch (error) {
    console.error(`Failed to read HTML file: ${filePath}`);
    console.error(error.message);
    process.exit(1);
  }

  const failures = validateHtml(html);
  if (failures.length > 0) {
    reportFailures(failures, filePath);
    process.exit(1);
  }

  console.log(`External link safety check passed for ${filePath}.`);
}

main();
