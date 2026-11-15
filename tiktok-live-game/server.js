// TikTok LIVE -> oyun köprüsü.
// Kullanım:  node server.js <tiktok_kullanici_adi>
// Kullanıcı adı verilmezse sadece oyunu sunar (demo modu için: http://localhost:3000/?demo=1)

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const USERNAME = (process.argv[2] || process.env.TIKTOK_USERNAME || '').replace(/^@/, '');
const PUBLIC = path.join(__dirname, 'public');
const THREE_DIR = path.join(__dirname, 'node_modules', 'three');
const MOUNTS = { '/vendor/': path.join(THREE_DIR, 'build'), '/addons/': path.join(THREE_DIR, 'examples', 'jsm') };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg' };

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  // three.js yerel olarak sunulur (internet gerekmez)
  const mount = Object.keys(MOUNTS).find(m => urlPath.startsWith(m));
  const root = mount ? MOUNTS[mount] : PUBLIC;
  const rel = mount ? urlPath.slice(mount.length) : (urlPath === '/' ? 'index.html' : urlPath);
  const file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Bulunamadi'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });
let status = { type: 'status', connected: false, text: USERNAME ? 'Bağlanıyor…' : 'Kullanıcı adı verilmedi' };

function broadcast(msg) {
  const s = JSON.stringify(msg);
  for (const c of wss.clients) if (c.readyState === 1) c.send(s);
}
function setStatus(connected, text) {
  status = { type: 'status', connected, text };
  console.log(`[durum] ${text}`);
  broadcast(status);
}
wss.on('connection', ws => ws.send(JSON.stringify(status)));

function userOf(data) {
  const u = data.user || {};
  const pic = u.profilePicture || {};
  return {
    id: String(u.uniqueId || u.userId || u.nickname || 'anonim'),
    name: u.nickname || u.uniqueId || 'Misafir',
    avatar: (pic.url && pic.url[0]) || (pic.urls && pic.urls[0]) || u.profilePictureUrl || '',
  };
}

function connectTikTok() {
  const { TikTokLiveConnection, WebcastEvent, ControlEvent } = require('tiktok-live-connector');
  const conn = new TikTokLiveConnection(USERNAME, {
    signApiKey: process.env.EULER_API_KEY || undefined, // isteğe bağlı (eulerstream.com) – yoğun kullanımda limit için
  });
  let retryTimer = null;
  const retry = (why) => {
    if (retryTimer) return;
    setStatus(false, `${why} – 30 sn sonra tekrar denenecek`);
    retryTimer = setTimeout(() => { retryTimer = null; start(); }, 30000);
  };
  const start = () => {
    setStatus(false, `@${USERNAME} yayınına bağlanıyor…`);
    conn.connect()
      .then(() => setStatus(true, `@${USERNAME} yayınına bağlandı`))
      .catch(e => retry(`Bağlanamadı (${e && e.message ? e.message : e})`));
  };

  conn.on(WebcastEvent.CHAT, d => broadcast({ type: 'chat', user: userOf(d), comment: d.comment || '' }));
  conn.on(WebcastEvent.LIKE, d => broadcast({ type: 'like', user: userOf(d), likes: d.likeCount || 1 }));
  conn.on(WebcastEvent.FOLLOW, d => broadcast({ type: 'follow', user: userOf(d) }));
  conn.on(WebcastEvent.SHARE, d => broadcast({ type: 'share', user: userOf(d) }));
  conn.on(WebcastEvent.GIFT, d => {
    const g = d.giftDetails || {};
    // Seri (streak) hediyelerde yalnızca seri bitince say
    if (g.giftType === 1 && !d.repeatEnd) return;
    const count = d.repeatCount || 1;
    broadcast({ type: 'gift', user: userOf(d), giftName: g.giftName || 'Hediye', coins: (g.diamondCount || 1) * count, count });
  });
  conn.on(WebcastEvent.STREAM_END, () => retry('Yayın sona erdi'));
  conn.on(ControlEvent.DISCONNECTED, () => retry('Bağlantı koptu'));
  conn.on(ControlEvent.ERROR, e => console.log('[hata]', e && e.info ? e.info : e));
  start();
}

server.listen(PORT, () => {
  console.log(`Oyun:  http://localhost:${PORT}/`);
  console.log(`Demo:  http://localhost:${PORT}/?demo=1`);
  if (USERNAME) connectTikTok();
});
