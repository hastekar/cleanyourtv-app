// Memleket Fethi köprü sunucusu
// TikTok LIVE olaylarını okur, oyunun anladığı sade JSON'a çevirir ve WebSocket ile tarayıcıya yollar.
// Kullanım:  node server.js <tiktok_kullanici_adi> [port]
// OBS tarayıcı kaynağı:  http://localhost:8787/?obs=1
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { TikTokLiveConnection, WebcastEvent } = require('tiktok-live-connector');

const uniqueId = process.argv[2];
const port = Number(process.argv[3] || 8787);
if (!uniqueId) {
  console.error('Kullanım: node server.js <tiktok_kullanici_adi> [port]');
  process.exit(1);
}

// Oyun dosyası gövde parçası olarak tutulur; burada tam bir HTML belgesine sarılır.
const page = () =>
  '<!doctype html><html lang="tr"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '<style>body{margin:0}[hidden]{display:none!important}</style></head><body>' +
  fs.readFileSync(path.join(__dirname, 'memleket-fethi.html'), 'utf8') +
  '</body></html>';

// /js/ altındaki oyun dosyaları statik sunulur (yol atlatma korumalı).
const JS_DIR = path.join(__dirname, 'js');
const TYPES = { '.js': 'application/javascript; charset=utf-8', '.map': 'application/json; charset=utf-8' };
function serveJs(pathname, res) {
  let rel;
  try { rel = decodeURIComponent(pathname.slice('/js/'.length)); } catch (_) { res.writeHead(400); res.end(); return; }
  const file = path.resolve(JS_DIR, rel);
  if (rel.includes('\0') || (file !== JS_DIR && !file.startsWith(JS_DIR + path.sep))) { res.writeHead(403); res.end(); return; }
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type) { res.writeHead(404); res.end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/js/')) { serveJs(url.pathname, res); return; }
  if (url.pathname !== '/') { res.writeHead(404); res.end(); return; }
  if (!url.searchParams.has('ws')) {
    url.searchParams.set('ws', `ws://localhost:${port}`);
    url.searchParams.set('sim', '0');
    res.writeHead(302, { Location: url.pathname + url.search });
    res.end();
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(page());
});

const wss = new WebSocketServer({ server });
const send = (obj) => {
  const msg = JSON.stringify(obj);
  for (const c of wss.clients) if (c.readyState === 1) c.send(msg);
};

const who = (d) => {
  const u = d.user || d;
  const pic = u.profilePicture?.url?.[0] || u.profilePicture?.urls?.[0] || u.profilePictureUrl || '';
  return { uid: String(u.uniqueId || u.userId || ''), name: u.nickname || u.uniqueId || 'misafir', pic };
};

function attach(conn) {
  conn.on(WebcastEvent.CHAT, (d) => send({ type: 'chat', ...who(d), comment: d.comment || '' }));
  conn.on(WebcastEvent.LIKE, (d) => send({ type: 'like', ...who(d), count: d.likeCount || 1 }));
  conn.on(WebcastEvent.GIFT, (d) => {
    const g = d.giftDetails || d;
    // Seri hediyelerde yalnızca seri bittiğinde say; aksi halde aynı hediye iki kez işlenir.
    if (g.giftType === 1 && !d.repeatEnd) return;
    send({ type: 'gift', ...who(d), diamonds: g.diamondCount || d.diamondCount || 1, repeat: d.repeatCount || 1, giftName: g.giftName || '' });
  });
  conn.on(WebcastEvent.FOLLOW, (d) => send({ type: 'follow', ...who(d) }));
  conn.on(WebcastEvent.SHARE, (d) => send({ type: 'share', ...who(d) }));
  conn.on(WebcastEvent.MEMBER, (d) => send({ type: 'member', ...who(d) }));
  conn.on(WebcastEvent.ROOM_USER, (d) => send({ type: 'roomUser', viewers: d.viewerCount || 0 }));
  conn.on(WebcastEvent.STREAM_END, () => { console.log('Yayın bitti.'); });
  conn.on('disconnected', () => { console.log('Bağlantı koptu.'); connect(1); });
}

// Üstel geri çekilme ile en fazla 5 deneme, sonra 60 sn'de bir.
async function connect(attempt) {
  const conn = new TikTokLiveConnection(uniqueId);
  attach(conn);
  try {
    const state = await conn.connect();
    console.log(`@${uniqueId} yayınına bağlandı (oda ${state.roomId}).`);
  } catch (err) {
    const wait = attempt <= 5 ? Math.min(30, 2 ** attempt) + Math.random() : 60;
    console.error(`Bağlanılamadı: ${err.message || err}. ${Math.round(wait)} sn sonra yeniden denenecek.`);
    setTimeout(() => connect(attempt + 1), wait * 1000);
  }
}

server.listen(port, () => {
  console.log(`Oyun: http://localhost:${port}/   (OBS için sonuna ?obs=1 ekle)`);
  connect(1);
});
