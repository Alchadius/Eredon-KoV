const { app, BrowserWindow, protocol, ipcMain, shell, net } = require('electron');
const path = require('path'), fs = require('fs'), https = require('https'), crypto = require('crypto');
const { pathToFileURL } = require('url');

const REPO = 'Alchadius/Eredon-KoV';
const RAW = 'https://raw.githubusercontent.com/' + REPO + '/main/game/';
const RELEASES = 'https://github.com/' + REPO + '/releases/latest';

protocol.registerSchemesAsPrivileged([{ scheme: 'kov', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);

const bundledDir = () => app.isPackaged ? path.join(process.resourcesPath, 'game') : path.join(__dirname, '..', 'game');
const userDir = () => path.join(app.getPath('userData'), 'game');
function readVer(dir) { try { return JSON.parse(fs.readFileSync(path.join(dir, 'version.json'), 'utf8')); } catch (e) { return null; } }
function cmp(a, b) { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0 ? 1 : -1; } return 0; }
function activeDir() {
  const b = readVer(bundledDir()), u = readVer(userDir());
  if (u && fs.existsSync(path.join(userDir(), 'game.html')) && (!b || cmp(u.ver, b.ver) >= 0)) return userDir();
  return bundledDir();
}
function fetchBuf(url, n) {
  return new Promise((res, rej) => {
    if ((n || 0) > 5) return rej(new Error('redirects'));
    const req = https.get(url, { headers: { 'User-Agent': 'EredonKoV/' + app.getVersion(), 'Cache-Control': 'no-cache' } }, r => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) { r.resume(); return res(fetchBuf(r.headers.location, (n || 0) + 1)); }
      if (r.statusCode !== 200) { r.resume(); return rej(new Error('HTTP ' + r.statusCode)); }
      const c = []; r.on('data', d => c.push(d)); r.on('end', () => res(Buffer.concat(c)));
    });
    req.on('error', rej); req.setTimeout(20000, () => req.destroy(new Error('timeout')));
  });
}
let remote = null, win = null;
ipcMain.handle('kov:shellVersion', () => app.getVersion());
ipcMain.handle('kov:check', async () => {
  const cur = readVer(activeDir()) || { ver: '0.0.0' };
  try {
    remote = JSON.parse((await fetchBuf(RAW + 'version.json?t=' + Date.now())).toString('utf8'));
    const shellOld = remote.shell && cmp(app.getVersion(), remote.shell) < 0;
    return { available: cmp(remote.ver, cur.ver) > 0 || shellOld, latest: remote.ver, current: cur.ver, shellOutdated: !!shellOld };
  } catch (e) { return { available: false, error: 'Could not check for updates (offline?).', current: cur.ver }; }
});
ipcMain.handle('kov:apply', async () => {
  try {
    if (!remote) remote = JSON.parse((await fetchBuf(RAW + 'version.json?t=' + Date.now())).toString('utf8'));
    if (remote.shell && cmp(app.getVersion(), remote.shell) < 0) { shell.openExternal(RELEASES); return { error: 'A new installer is needed. The download page was opened in your browser.', manual: 1 }; }
    const tmp = userDir() + '.tmp'; fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
    for (const name of Object.keys(remote.files)) {
      if (!/^[A-Za-z0-9._-]+$/.test(name)) throw new Error('bad file name');
      const buf = await fetchBuf(RAW + name + '?t=' + Date.now());
      if (crypto.createHash('sha256').update(buf).digest('hex') !== remote.files[name]) throw new Error('Download was corrupted. Try again.');
      fs.writeFileSync(path.join(tmp, name), buf);
    }
    fs.writeFileSync(path.join(tmp, 'version.json'), JSON.stringify({ ver: remote.ver }));
    fs.rmSync(userDir(), { recursive: true, force: true }); fs.renameSync(tmp, userDir());
    setTimeout(() => { if (win) win.loadURL('kov://game/game.html'); }, 400);
    return { ok: 1 };
  } catch (e) { return { error: 'Update failed: ' + (e.message || e), manual: 1 }; }
});

function createWindow() {
  win = new BrowserWindow({ width: 1280, height: 800, minWidth: 900, minHeight: 600, backgroundColor: '#0b0710', title: 'Eredon KoV', autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('kov://')) e.preventDefault(); });
  win.loadURL('kov://game/game.html');
  win.on('closed', () => { win = null; });
}
const lock = app.requestSingleInstanceLock();
if (!lock) app.quit(); else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    protocol.handle('kov', req => {
      const u = new URL(req.url); let rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'game.html';
      const base = activeDir(), full = path.normalize(path.join(base, rel));
      if (!full.startsWith(base) || !fs.existsSync(full)) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(full).toString());
    });
    createWindow();
    app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
  });
  app.on('window-all-closed', () => app.quit());
}
