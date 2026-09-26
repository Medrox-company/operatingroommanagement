import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// Visual QA only: this captures the synthetic AppStorePreview, not the signed iOS app.
const baseUrl = process.env.ORM_PREVIEW_URL ?? 'http://127.0.0.1:5174/';
const outputDir = process.env.ORM_PREVIEW_OUTPUT ?? join(process.cwd(), 'docs/app-store/screenshots-preview');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profileDir = await mkdtemp(join(tmpdir(), 'orm-screenshot-chrome-'));

const shots = [
  { name: 'iphone-01-prehled', screen: 'overview', width: 414, height: 896, scale: 3 },
  { name: 'iphone-02-detail-salu', screen: 'detail', width: 414, height: 896, scale: 3 },
  { name: 'iphone-03-rozpis', screen: 'timeline', width: 414, height: 896, scale: 3 },
  { name: 'iphone-04-statistiky', screen: 'statistics', width: 414, height: 896, scale: 3 },
  { name: 'iphone-05-svetly-rezim', screen: 'overview-light', width: 414, height: 896, scale: 3 },
  { name: 'ipad-01-prehled', screen: 'overview', width: 1032, height: 1376, scale: 2 },
  { name: 'ipad-02-rozpis', screen: 'timeline', width: 1032, height: 1376, scale: 2 },
  { name: 'ipad-03-statistiky', screen: 'statistics', width: 1032, height: 1376, scale: 2 },
  { name: 'ipad-landscape-01-prehled', screen: 'overview', width: 1376, height: 1032, scale: 2 },
  { name: 'ipad-landscape-02-rozpis', screen: 'timeline', width: 1376, height: 1032, scale: 2 },
  { name: 'ipad-landscape-03-statistiky', screen: 'statistics', width: 1376, height: 1032, scale: 2 },
];

const chrome = spawn(chromePath, [
  '--headless=new', '--no-first-run', '--no-default-browser-check',
  '--disable-background-networking', '--disable-extensions',
  '--remote-debugging-port=0', `--user-data-dir=${profileDir}`, 'about:blank',
], { stdio: 'ignore' });

try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      port = Number((await readFile(join(profileDir, 'DevToolsActivePort'), 'utf8')).split('\n')[0]);
      if (port) break;
    } catch { /* Chrome has not started yet. */ }
    await delay(100);
  }
  if (!port) throw new Error('Chrome debugging port did not become available');

  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((target) => target.type === 'page');
  if (!page) throw new Error('Chrome page target not found');

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const response = JSON.parse(event.data);
    const item = pending.get(response.id);
    if (!item) return;
    pending.delete(response.id);
    if (response.error) item.reject(new Error(response.error.message));
    else item.resolve(response.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await mkdir(outputDir, { recursive: true });
  for (const shot of shots) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: shot.width,
      height: shot.height,
      deviceScaleFactor: shot.scale,
      mobile: true,
      screenWidth: shot.width,
      screenHeight: shot.height,
    });
    const url = new URL(baseUrl);
    url.searchParams.set('screen', shot.screen);
    await send('Page.navigate', { url: url.toString() });

    let dimensions;
    for (let attempt = 0; attempt < 100; attempt++) {
      const state = await send('Runtime.evaluate', {
        expression: `JSON.stringify({ready: document.querySelector('[data-screen="${shot.screen}"]') !== null && document.fonts.status === 'loaded', width: innerWidth, height: innerHeight, contentWidth: document.documentElement.scrollWidth})`,
        returnByValue: true,
      });
      if (state.result.value) dimensions = JSON.parse(state.result.value);
      if (dimensions?.ready) break;
      await delay(100);
    }
    if (!dimensions?.ready || dimensions.width !== shot.width || dimensions.height !== shot.height || dimensions.contentWidth > shot.width) {
      throw new Error(`${shot.name}: invalid layout ${JSON.stringify(dimensions)}`);
    }
    const { data } = await send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false,
    });
    const file = join(outputDir, `${shot.name}.png`);
    await writeFile(file, Buffer.from(data, 'base64'));
    process.stdout.write(`${file}\n`);
  }
  socket.close();
} finally {
  chrome.kill('SIGTERM');
}
