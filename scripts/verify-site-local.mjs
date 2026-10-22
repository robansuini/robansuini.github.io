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
  if (probe) {
    return {
      ok: false,
      reason: `Something already serves http://${HOST}:${PORT}/ (HTTP ${probe.status}). Pick another VERIFY_SITE_PORT.`,
    };
  }
  return { ok: true };
}

function startServer(cwd) {
  return spawn('python3', ['-m', 'http.server', String(PORT), '--bind', HOST], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function attachServerFailureHandlers(server) {
  let spawnError = null;
  let earlyExit = null;
  let stderr = '';
  let serverReady = false;

  server.on('error', (err) => {
    spawnError = err;
  });
  server.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });
  server.on('exit', (code, signal) => {
    if (!serverReady && code !== null && code !== 0) {
      earlyExit = { code, signal, stderr };
    }
  });

  const markReady = () => {
    serverReady = true;
  };

  return {
    assertHealthy() {
      if (spawnError) {
        throw new Error(`Failed to start python3 http.server: ${spawnError.message}`);
      }
      if (earlyExit) {
        const detail = earlyExit.stderr.trim() || `exit code ${earlyExit.code}`;
        throw new Error(`python3 http.server exited before ready (${detail})`);
      }
    },
    markReady,
  };
}

async function waitForServer(server, maxMs = 8000) {
  const health = attachServerFailureHandlers(server);
  const deadline = Date.now() + maxMs;

  while (Date.now() < deadline) {
    health.assertHealthy();

    try {
      const res = await fetchText(`http://${HOST}:${PORT}/`);
      if (res.status === 200) {
        health.markReady();
        return res;
      }
    } catch {
      // connection refused while starting
    }
    await delay(200);
  }

  health.assertHealthy();
  throw new Error(`Server did not return HTTP 200 on http://${HOST}:${PORT}/ within ${maxMs}ms`);
}

async function runNodeVerify(cwd) {
  const child = spawn('npm', ['run', 'verify'], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return new Promise((resolve, reject) => {
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

  try {
    const homepage = await waitForServer(server);
    await writeFile(`${EVIDENCE_DIR}/homepage-snippet.txt`, homepage.body.slice(0, 2000));

    const verify = await runNodeVerify(repoRoot);
    await writeFile(`${EVIDENCE_DIR}/npm-verify.log`, `${verify.stdout}\n${verify.stderr}`);

    if (verify.code !== 0) {
      console.error('npm run verify failed');
      console.error(verify.stderr || verify.stdout);
      process.exitCode = verify.code ?? 1;
      return;
    }
    if (!homepage.body.includes('<title>Roberto Ansuini')) {
      console.error('Homepage title check failed');
      process.exitCode = 1;
      return;
    }
    console.log(`Verification OK. Evidence: ${EVIDENCE_DIR}`);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    server.kill('SIGTERM');
  }
}

main();
