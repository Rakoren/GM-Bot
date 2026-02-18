import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..', '..');

const ADMIN_HOST = '127.0.0.1';
const ADMIN_PORT = Number(process.env.SMOKE_ADMIN_PORT || 3901);
const BOT_HOST = '127.0.0.1';
const BOT_PORT = Number(process.env.SMOKE_BOT_PORT || 3909);

const ADMIN_HEALTH_URL = `http://${ADMIN_HOST}:${ADMIN_PORT}/healthz`;
const ADMIN_READY_URL = `http://${ADMIN_HOST}:${ADMIN_PORT}/readyz`;
const BOT_HEALTH_URL = `http://${BOT_HOST}:${BOT_PORT}/healthz`;

const START_TIMEOUT_MS = 30000;
const EXIT_TIMEOUT_MS = 15000;
const DOWN_TIMEOUT_MS = 10000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(url, timeoutMs = 1500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return { ok: res.ok, status: res.status };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForUp(url, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await request(url);
    if (res && res.ok) return;
    await sleep(300);
  }
  throw new Error(`${label} did not become healthy in ${timeoutMs}ms`);
}

async function waitForDown(url, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await request(url);
    if (!res) return;
    await sleep(250);
  }
  throw new Error(`${label} endpoint remained reachable after shutdown`);
}

function startService(name, args, env) {
  const child = spawn(process.execPath, args, {
    cwd: ROOT_DIR,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  child.stdout.on('data', chunk => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr.on('data', chunk => process.stderr.write(`[${name}] ${chunk}`));
  return child;
}

async function stopService(child, name) {
  const useIpcShutdown = process.platform === 'win32' && child.connected;
  const shutdownSignal = 'SIGTERM';
  const exit = new Promise(resolve => {
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
  if (useIpcShutdown) {
    child.send({ type: 'shutdown' });
  } else {
    child.kill(shutdownSignal);
  }
  const forced = setTimeout(() => {
    try {
      child.kill('SIGKILL');
    } catch {}
  }, EXIT_TIMEOUT_MS);
  const result = await exit;
  clearTimeout(forced);
  if (result.code !== 0) {
    throw new Error(
      `${name} exit was not clean after ${useIpcShutdown ? 'IPC shutdown' : shutdownSignal} (code=${result.code}, signal=${result.signal || 'none'})`
    );
  }
}

async function main() {
  const children = [];
  try {
    const admin = startService('admin', ['admin/server.js'], {
      ADMIN_HOST,
      ADMIN_PORT: String(ADMIN_PORT),
      ADMIN_BASE_URL: `http://${ADMIN_HOST}:${ADMIN_PORT}`,
      DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || 'smoke-client-id',
      DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET || 'smoke-client-secret',
      ADMIN_ROLE_IDS: '',
      NODE_ENV: process.env.NODE_ENV || 'development',
    });
    children.push(admin);
    await waitForUp(ADMIN_HEALTH_URL, START_TIMEOUT_MS, 'admin health');
    await waitForUp(ADMIN_READY_URL, START_TIMEOUT_MS, 'admin ready');
    await stopService(admin, 'admin');
    await waitForDown(ADMIN_HEALTH_URL, DOWN_TIMEOUT_MS, 'admin');

    const bot = startService('bot', ['index.js'], {
      BOT_HEALTH_HOST: BOT_HOST,
      BOT_HEALTH_PORT: String(BOT_PORT),
      DISCORD_TOKEN: process.env.DISCORD_TOKEN || 'smoke-discord-token',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'smoke-openai-key',
      SMOKE_TEST_MODE: 'true',
      NODE_ENV: process.env.NODE_ENV || 'development',
    });
    children.push(bot);
    await waitForUp(BOT_HEALTH_URL, START_TIMEOUT_MS, 'bot health');
    await stopService(bot, 'bot');
    await waitForDown(BOT_HEALTH_URL, DOWN_TIMEOUT_MS, 'bot');

    console.log('Smoke shutdown test OK.');
  } catch (err) {
    console.error(`Smoke shutdown test failed: ${err?.message || err}`);
    process.exitCode = 1;
  } finally {
    for (const child of children) {
      if (!child.killed) {
        try {
          child.kill('SIGKILL');
        } catch {}
      }
    }
  }
}

await main();
