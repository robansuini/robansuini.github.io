#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const SKIP_DIRS = new Set(['.git', 'node_modules']);
const REQUIRED_REL_TOKENS = new Set(['noopener', 'noreferrer']);

function getAttributeValue(tag, attributeName) {
  const attributeRegex = new RegExp(
    `(?:^|\\s)${attributeName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\`]+))`,
    'i',
  );
  const match = tag.match(attributeRegex);
  if (!match) {
    return null;
  }

  return match[1] ?? match[2] ?? match[3] ?? '';
}

function findAnchorTags(html) {
  const tags = [];
  const anchorStartRegex = /<a\b/gi;
  let match;

  while ((match = anchorStartRegex.exec(html)) !== null) {
    const index = match.index ?? 0;
    const endIndex = findTagEnd(html, anchorStartRegex.lastIndex);
    if (endIndex === -1) {
      continue;
    }

    tags.push({
      tag: html.slice(index, endIndex + 1),
      index,
    });
    anchorStartRegex.lastIndex = endIndex + 1;
  }

  return tags;
}

function findTagEnd(html, startIndex) {
  let quote = null;

  for (let index = startIndex; index < html.length; index += 1) {
    const char = html[index];

    if (quote !== null) {
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '>') {
      return index;
    }
  }

  return -1;
}

function getBlankTargetRelFailureReason(tag) {
  const target = getAttributeValue(tag, 'target');
  if (!target || target.toLowerCase() !== '_blank') {
    return null;
  }

  const rel = getAttributeValue(tag, 'rel');
  if (rel === null) {
    return 'missing rel attribute';
  }

  if (hasRequiredRelTokens(rel)) {
    return null;
  }

  return 'rel must include both noopener and noreferrer';
}

function getLineColumn(text, index) {
  const safeIndex = Math.max(0, Math.min(index, text.length));
  const upToIndex = text.slice(0, safeIndex);
  const line = upToIndex.split('\n').length;
  const lastNewline = upToIndex.lastIndexOf('\n');
  const column = safeIndex - lastNewline;
  return { line, column };
}

function shouldSkipDirectory(entry) {
  return entry.isDirectory() && SKIP_DIRS.has(entry.name);
}

function isHtmlFile(entry) {
  return entry.isFile() && entry.name.endsWith('.html');
}

function findHtmlCommentRanges(html) {
  const ranges = [];
  let searchIndex = 0;

  while (searchIndex < html.length) {
    const start = html.indexOf('<!--', searchIndex);
    if (start === -1) {
      break;
    }

    const closeIndex = html.indexOf('-->', start + 4);
    const end = closeIndex === -1 ? html.length : closeIndex + 3;
    ranges.push({ start, end });
    searchIndex = end;
  }

  return ranges;
}

function isIndexInRanges(index, ranges) {
  return ranges.some(range => index >= range.start && index < range.end);
}

function getRelTokens(rel) {
  return new Set(
    rel
      .split(/\s+/)
      .map(token => token.trim().toLowerCase())
      .filter(Boolean),
  );
}

function hasRequiredRelTokens(rel) {
  const relTokens = getRelTokens(rel);

  for (const requiredToken of REQUIRED_REL_TOKENS) {
    if (!relTokens.has(requiredToken)) {
      return false;
    }
  }

  return true;
}

function findHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (shouldSkipDirectory(entry)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findHtmlFiles(fullPath));
      continue;
    }

    if (isHtmlFile(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

function checkHtmlFile(html, filePath) {
  const failures = [];
  const commentRanges = findHtmlCommentRanges(html);

  for (const { tag, index } of findAnchorTags(html)) {
    if (isIndexInRanges(index, commentRanges)) {
      continue;
    }

    const reason = getBlankTargetRelFailureReason(tag);

    if (reason === null) {
      continue;
    }

    const location = getLineColumn(html, index);
    failures.push({
      filePath,
      index,
      line: location.line,
      column: location.column,
      reason,
      tag,
    });
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
  findAnchorTags,
  findHtmlFiles,
  getBlankTargetRelFailureReason,
  getLineColumn,
  isHtmlFile,
  getRelTokens,
  hasRequiredRelTokens,
  run,
  shouldSkipDirectory,
};

if (require.main === module) {
  main();
}
