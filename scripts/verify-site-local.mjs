#!/usr/bin/env node
/**
 * Local verification helper for agents. Used by .cursor/skills/verify-site/SKILL.md
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const RUN_ID = process.env.VERIFY_SITE_RUN_ID ?? `run-${Date.now()}`;
const PORT = Number(process.env.VERIFY_SITE_PORT ?? '8765');
const HOST = '127.0.0.1';
const EVIDENCE_DIR = `/tmp/verify-site-${RUN_ID}`;

async function fetchText(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') });
        });
      })
      .on('error', reject);
  });
}

async function doctor() {
  const probe = await fetchText(`http://${HOST}:${PORT}/`).catch(() => null);
  if (probe && probe.status === 200) {
    return { ok: false, reason: `Something already serves http://${HOST}:${PORT}/ (status ${probe.status}). Pick another VERIFY_SITE_PORT.` };
  }
  return { ok: true };
}

function startServer(cwd) {
  const child = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', HOST], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return child;
}

async function waitForServer(maxMs = 8000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetchText(`http://${HOST}:${PORT}/`);
      if (res.status === 200) {
        return res;
      }
    } catch {
      // retry
    }
    await delay(200);
  }
  throw new Error(`Server did not become ready on http://${HOST}:${PORT}/ within ${maxMs}ms`);
}

async function runNodeVerify() {
  const child = spawn('npm', ['run', 'verify'], { stdio: ['ignore', 'pipe', 'pipe'], shell: true });
  const out = await new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d;
    });
    child.stderr.on('data', (d) => {
      stderr += d;
    });
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
    child.on('error', reject);
  });
  return out;
}

async function main() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  await mkdir(EVIDENCE_DIR, { recursive: true });

  const doctorResult = await doctor();
  if (!doctorResult.ok) {
    console.error(doctorResult.reason);
    process.exit(2);
  }

  const server = startServer(repoRoot);
  let homepage;
  try {
    homepage = await waitForServer();
    await writeFile(`${EVIDENCE_DIR}/homepage-snippet.txt`, homepage.body.slice(0, 2000));
    const verify = await runNodeVerify();
    await writeFile(`${EVIDENCE_DIR}/npm-verify.log`, `${verify.stdout}\n${verify.stderr}`);
    if (verify.code !== 0) {
      console.error('npm run verify failed');
      console.error(verify.stderr || verify.stdout);
      process.exit(verify.code ?? 1);
    }
    if (!homepage.body.includes('<title>Roberto Ansuini')) {
      console.error('Homepage title check failed');
      process.exit(1);
    }
    console.log(`Verification OK. Evidence: ${EVIDENCE_DIR}`);
  } finally {
    server.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
