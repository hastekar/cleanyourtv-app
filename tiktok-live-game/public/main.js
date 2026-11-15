import * as THREE from 'three';
import { loadCharacters } from './characters.js';

const CFG = window.GAME_CONFIG;
const W = 1080, H = 1920, TAU = Math.PI * 2;
const R_IN = 6.4, R_MID = 11.5, R_OUT = 17;       // yürüyüş halkaları (birim ≈ metre)
const START_A = Math.PI * 0.25;                    // şavt başlangıç çizgisi
const KAABA = { w: 4.6, h: 5.8 };
const params = new URLSearchParams(location.search);
const DEMO = params.has('demo');
// Adres çubuğundan geçici ayar: ?crowd=20&shadows=0 (yavaş bilgisayarda denemek için)
if (params.has('crowd')) CFG.backgroundCrowd = +params.get('crowd');
if (params.has('shadows')) CFG.shadows = params.get('shadows') !== '0';
const DEMO_COUNT = params.has('players') ? +params.get('players') : 25;
const COMMENT_JOIN = CFG.joinMode === 'comment';
const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, "Noto Sans", sans-serif';

const now = () => performance.now() / 1000;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const tiers = [...CFG.giftTiers].sort((a, b) => a.min - b.min);

// ====================== 3B SAHNE ======================
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true });
const RS = +(new URLSearchParams(location.search).get('scale') || window.GAME_CONFIG.renderScale || 1);
renderer.setSize(W * RS, H * RS, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = !!CFG.shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060a14);
scene.fog = new THREE.Fog(0x060a14, 90, 210);
const camera = new THREE.PerspectiveCamera(50, W / H, 0.5, 400);

scene.add(new THREE.HemisphereLight(0xcfdcff, 0x4a3c28, 1.0));
scene.add(new THREE.AmbientLight(0xffffff, 0.25));
const sun = new THREE.DirectionalLight(0xfff1d6, 2.0);
sun.position.set(18, 42, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 5, far: 90 });
sun.shadow.bias = -0.0004;
scene.add(sun);
const nurLight = new THREE.PointLight(0xffdf90, 0, 60, 1.4);
nurLight.position.set(0, KAABA.h + 4, 0);
scene.add(nurLight);

function canvasTex(w, h, paint) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// --- zemin (mermer mataf) ---
const floorTex = canvasTex(1024, 1024, (g, w) => {
  const c = w / 2, grd = g.createRadialGradient(c, c, 60, c, c, c);
  grd.addColorStop(0, '#fbf8f0'); grd.addColorStop(1, '#e6dfd0');
  g.fillStyle = grd; g.fillRect(0, 0, w, w);
  g.strokeStyle = 'rgba(140,125,95,0.35)'; g.lineWidth = 2;
  for (let r = 70; r < c; r += 34) { g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke(); }
  g.strokeStyle = 'rgba(140,125,95,0.16)';
  for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; g.beginPath(); g.moveTo(c + Math.cos(a) * 70, c + Math.sin(a) * 70); g.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c); g.stroke(); }
});
const floor = new THREE.Mesh(new THREE.CircleGeometry(22.5, 96), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55, metalness: 0.05 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const outer = new THREE.Mesh(new THREE.CircleGeometry(160, 64), new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 1 }));
outer.rotation.x = -Math.PI / 2; outer.position.y = -0.05; scene.add(outer);

// başlangıç çizgisi
const startLine = new THREE.Mesh(new THREE.PlaneGeometry(18.6, 0.28), new THREE.MeshBasicMaterial({ color: 0x25b877, transparent: true, opacity: 0.85 }));
startLine.rotation.x = -Math.PI / 2; startLine.rotation.z = -START_A;
startLine.position.set(Math.cos(START_A) * 12.8, 0.02, Math.sin(START_A) * 12.8);
scene.add(startLine);

// --- Kâbe ---
function kaabaSide(door) {
  return canvasTex(512, 640, (g, w, h) => {
    g.fillStyle = '#0b0b0e'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 6) { g.fillStyle = `rgba(255,255,255,${0.012 + (x % 18 === 0 ? 0.02 : 0)})`; g.fillRect(x, 0, 2, h); }
    const by = h * 0.2, bh = h * 0.12;
    g.fillStyle = '#c9a441'; g.fillRect(0, by, w, bh);
    g.fillStyle = '#7d611c'; g.fillRect(0, by + 6, w, 4); g.fillRect(0, by + bh - 10, w, 4);
    g.strokeStyle = '#5a4410'; g.lineWidth = 5; g.lineCap = 'round';
    for (let x = 22; x < w - 20; x += 46) {                // kuşak üstü soyut hat motifi
      g.beginPath(); g.moveTo(x, by + bh * 0.68); g.quadraticCurveTo(x + 14, by + bh * 0.2, x + 30, by + bh * 0.62); g.stroke();
      g.beginPath(); g.arc(x + 16, by + bh * 0.33, 2.5, 0, TAU); g.stroke();
    }
    g.fillStyle = '#b8922f';
    for (let i = 0; i < 4; i++) { const x = w * (0.14 + i * 0.24); g.beginPath(); g.roundRect(x - 34, by + bh + 26, 68, 34, 10); g.fill(); }
    if (door) {
      g.fillStyle = '#d8b24a'; g.fillRect(w * 0.56, h * 0.52, w * 0.27, h * 0.4);
      g.fillStyle = '#a9832a'; g.fillRect(w * 0.585, h * 0.545, w * 0.22, h * 0.35);
      g.strokeStyle = '#e8cd78'; g.lineWidth = 4; g.strokeRect(w * 0.6, h * 0.56, w * 0.19, h * 0.32);
      g.beginPath(); g.moveTo(w * 0.695, h * 0.56); g.lineTo(w * 0.695, h * 0.88); g.stroke();
    }
  });
}
const sideMat = (door) => new THREE.MeshStandardMaterial({ map: kaabaSide(door), roughness: 0.85 });
const topMat = new THREE.MeshStandardMaterial({ color: 0x1a1b20, roughness: 0.9 });
const sidePlain = sideMat(false);
const kaaba = new THREE.Mesh(new THREE.BoxGeometry(KAABA.w, KAABA.h, KAABA.w), [sideMat(true), sidePlain, topMat, topMat, sidePlain, sidePlain]);
kaaba.position.y = KAABA.h / 2 + 0.35; kaaba.castShadow = true; scene.add(kaaba);
const marble = new THREE.MeshStandardMaterial({ color: 0xe9e2d2, roughness: 0.5 });
const plinth = new THREE.Mesh(new THREE.BoxGeometry(KAABA.w + 0.5, 0.35, KAABA.w + 0.5), marble);
plinth.position.y = 0.175; plinth.receiveShadow = true; scene.add(plinth);
const hatim = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.22, 8, 28, Math.PI), marble);
hatim.rotation.x = Math.PI / 2; hatim.rotation.z = Math.PI; hatim.scale.z = 3.2; hatim.position.set(0, 0.6, -KAABA.w / 2 - 0.2);
hatim.castShadow = true; scene.add(hatim);
const kaabaBox = new THREE.Box3(new THREE.Vector3(-KAABA.w / 2, 0, -KAABA.w / 2), new THREE.Vector3(KAABA.w / 2, KAABA.h + 0.35, KAABA.w / 2));

// --- revaklar (çevre kemerler) ---
{
  const stone = new THREE.MeshStandardMaterial({ color: 0xe2d6bd, roughness: 0.7 });
  const GAP = 0.9;   // öndeki açıklığın yarı açısı (radyan)
  const N = 60, colGeo = new THREE.BoxGeometry(0.7, 3.4, 0.7);
  const cols = new THREE.InstancedMesh(colGeo, stone, N * 2);
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe2a0 }), N);
  const m = new THREE.Matrix4();
  for (let i = 0; i < N; i++) {
    const a = i / N * TAU, x = Math.cos(a) * 23.2, z = Math.sin(a) * 23.2;
    if (Math.sin(a) > 0.62) { m.makeScale(0, 0, 0); cols.setMatrixAt(i, m); cols.setMatrixAt(N + i, m); lamps.setMatrixAt(i, m); continue; }   // ön taraf açık
    m.makeRotationY(-a).setPosition(x, 1.7, z); cols.setMatrixAt(i, m);
    m.makeRotationY(-a).setPosition(x, 6.0, z); cols.setMatrixAt(N + i, m);
    m.makeTranslation(Math.cos(a) * 22.7, 3.1, Math.sin(a) * 22.7); lamps.setMatrixAt(i, m);
  }
  scene.add(cols, lamps);
  for (const y of [3.85, 8.1]) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(23.6, 23.6, 0.9, 96, 1, true, GAP, TAU - 2 * GAP), new THREE.MeshStandardMaterial({ color: 0xd6c8a8, roughness: 0.7, side: THREE.DoubleSide }));
    beam.position.y = y; scene.add(beam);
  }
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(26.5, 26.5, 8.5, 96, 1, true, GAP, TAU - 2 * GAP), new THREE.MeshStandardMaterial({ color: 0xb59f74, roughness: 0.9, side: THREE.BackSide, emissive: 0x3a2a10, emissiveIntensity: 0.6 }));
  wall.position.y = 4.25; scene.add(wall);
  const roof = new THREE.Mesh(new THREE.RingGeometry(23.2, 27.5, 96, 1, -Math.PI / 2 + GAP, TAU - 2 * GAP), new THREE.MeshStandardMaterial({ color: 0xcdbf9f, roughness: 0.8, side: THREE.DoubleSide }));
  roof.rotation.x = -Math.PI / 2; roof.position.y = 8.55; scene.add(roof);
  // minareler
  const tipMat = new THREE.MeshBasicMaterial({ color: 0xfff0c0 });
  for (const a of [-0.35, -1.15, -1.99, -2.79]) {   // minareler arkada
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.0, 24, 12), stone); shaft.position.y = 12;
    const balc = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.0, 0.8, 12), stone); balc.position.y = 17;
    const balc2 = balc.clone(); balc2.position.y = 22.5;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.85, 3.2, 12), new THREE.MeshStandardMaterial({ color: 0xc9a441, roughness: 0.4, metalness: 0.6 })); cap.position.y = 25.6;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), tipMat); tip.position.y = 27.4;
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.5, 12), tipMat); glow.position.y = 21.8;
    g.add(shaft, balc, balc2, cap, tip, glow);
    g.position.set(Math.cos(a) * 29, 0, Math.sin(a) * 29); scene.add(g);
  }
}

// --- yıldızlar ve nur parçacıkları ---
function pointsCloud(n, place, mat) {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) place(pos, i * 3);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, mat);
}
scene.add(pointsCloud(700, (p, i) => {
  const a = rand(0, TAU), e = rand(0.08, 1.5);
  p[i] = Math.cos(a) * Math.cos(e) * 190; p[i + 1] = Math.sin(e) * 190; p[i + 2] = Math.sin(a) * Math.cos(e) * 190;
}, new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 })));
const nurPts = pointsCloud(900, (p, i) => {
  const a = rand(0, TAU), r = Math.sqrt(Math.random()) * 21;
  p[i] = Math.cos(a) * r; p[i + 1] = rand(0, 26); p[i + 2] = Math.sin(a) * r;
}, new THREE.PointsMaterial({ color: 0xffe08a, size: 0.32, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
nurPts.visible = false; scene.add(nurPts);

// --- figürler (erkek/kadın 3B modeller: characters.js) ---
const chars = await loadCharacters(scene);
const GEO = {
  ring: new THREE.RingGeometry(0.5, 0.66, 24),
  beam: new THREE.CylinderGeometry(0.5, 0.5, 7, 14, 1, true),
};
const MAT = {
  beam: new THREE.MeshBasicMaterial({ color: 0xffd45e, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  gold: new THREE.MeshBasicMaterial({ color: 0xffcc44, side: THREE.DoubleSide }),
};
function buildFigure(w) {
  const ch = chars.create({ female: w.female, pace: w.pace });
  const g = ch.group;
  g.userData = { ch };
  if (w.color) {
    const ring = new THREE.Mesh(GEO.ring, new THREE.MeshBasicMaterial({ color: w.color, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04;
    const beam = new THREE.Mesh(GEO.beam, MAT.beam); beam.position.y = 3.5; beam.visible = false;
    g.add(ring, beam);
    Object.assign(g.userData, { ring, beam, ringMat: ring.material, baseColor: new THREE.Color(w.color) });
  }
  scene.add(g);
  return g;
}

// ====================== OYUN DURUMU ======================
const players = new Map();
const crowd = [];
const toasts = [], sparks = [];
let banner = null, nurUntil = 0, totalTawaf = 0;
let status = { connected: false, text: DEMO ? 'Demo modu' : 'Sunucuya bağlanıyor…' };
const RING_COLORS = ['#3fb6a8', '#e0a03a', '#d86a8c', '#6f9ae0', '#9a7fe0', '#62b56b', '#e07b4f'];
const hashStr = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

function makeWalker(extra) {
  const w = Object.assign({ a: rand(0, TAU), r: rand(R_IN + 1, R_OUT + 2.5), travel: 0, phase: rand(0, TAU), pace: rand(0.85, 1.15), female: Math.random() < 0.45, npc: true }, extra);
  if (w.lane === undefined) w.lane = w.r;
  w.fig = buildFigure(w);
  return w;
}
for (let i = 0; i < CFG.backgroundCrowd; i++) crowd.push(makeWalker({}));

function removePlayer(p) {
  scene.remove(p.fig); p.fig.userData.ringMat?.dispose();
  for (const g of p.group) scene.remove(g.fig);
  players.delete(p.id);
}

/** Oyuncuyu döndürür; yoksa ve canJoin ise meydana alır. */
function ensure(user, t, canJoin) {
  let p = players.get(user.id);
  if (p) { p.lastActive = t; if (user.name) p.name = user.name; return p; }
  if (!canJoin) return null;
  if (players.size >= CFG.maxPlayers) {
    let oldest = null;
    for (const q of players.values()) if (!oldest || q.lastActive < oldest.lastActive) oldest = q;
    if (oldest) removePlayer(oldest);
  }
  const h = hashStr(user.id);
  p = makeWalker({
    id: user.id, name: user.name || user.id, npc: false,
    a: START_A + rand(0.05, 0.4), lane: rand(R_IN + 3, R_OUT - 0.5), r: R_OUT + 4,
    color: RING_COLORS[h % RING_COLORS.length], female: (h >> 3) % 100 < 45,   // TikTok cinsiyet bilgisi vermez: kullanıcıya göre sabit, rastgele

    laps: 0, tawafs: 0, lastActive: t, goldUntil: 0, speedUntil: 0, innerUntil: 0, groupUntil: 0, innerLane: 0, group: [], img: null,
  });
  if (user.avatar) { const im = new Image(); im.onload = () => { p.img = im; }; im.src = user.avatar; }
  players.set(p.id, p);
  toast(`${p.name} tavafa katıldı`, '#bfe8d2');
  return p;
}

function toast(text, color) { toasts.push({ text, color: color || '#fff', t: now() }); if (toasts.length > 4) toasts.shift(); }

const _v = new THREE.Vector3();
function screenOf(x, y, z) {
  _v.set(x, y, z).project(camera);
  return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, ok: _v.z < 1 && _v.z > -1 };
}
function burst(p, n, color) {
  const s = screenOf(p.fig.position.x, 1.9, p.fig.position.z);
  if (!s.ok) return;
  for (let i = 0; i < n; i++) sparks.push({ x: s.x, y: s.y, vx: rand(-110, 110), vy: rand(-230, -50), t: now(), life: rand(0.7, 1.5), color });
}

// ---------- TikTok olayları ----------
function onEvent(ev) {
  const t = now();
  if (ev.type === 'status') { status = ev; return; }
  if (!ev.user || !ev.user.id) return;
  if (ev.type === 'chat') {
    const kw = (CFG.joinKeyword || '').toLocaleLowerCase('tr');
    const okWord = !kw || (ev.comment || '').toLocaleLowerCase('tr').includes(kw);
    ensure(ev.user, t, COMMENT_JOIN && okWord);
  } else if (ev.type === 'like') {
    const p = ensure(ev.user, t, COMMENT_JOIN);
    if (p) p.speedUntil = Math.max(p.speedUntil, t) + Math.min(10, 2 + (ev.likes || 1) * 0.3);
  } else if (ev.type === 'follow' || ev.type === 'share') {
    const p = ensure(ev.user, t, COMMENT_JOIN);
    if (!p) return;
    p.goldUntil = Math.max(p.goldUntil, t) + 45;
    toast(`${p.name} ${ev.type === 'follow' ? 'takip etti' : 'yayını paylaştı'} · altın isim`, '#ffd97a');
  } else if (ev.type === 'gift') {
    const isNew = !players.has(ev.user.id);
    const p = ensure(ev.user, t, true);
    const coins = ev.coins || 1;
    let tier = tiers[0];
    for (const g of tiers) if (coins >= g.min) tier = g;
    applyTier(p, tier, t);
    if (!(isNew && tier === tiers[0])) toast(`${tier.icon} ${p.name} → ${tier.label}`, '#ffd97a');
  }
}

function applyTier(p, tier, t) {
  const add = (k) => { p[k] = Math.max(p[k], t) + tier.seconds; };
  burst(p, 16, '#ffd97a');
  add('goldUntil');                                   // her hediye altın isim verir
  if (tier.effect === 'speed') add('speedUntil');
  if (['inner', 'group', 'nur'].includes(tier.effect)) { add('innerUntil'); focusOn(p, t, 9); }
  if (tier.effect === 'group' || tier.effect === 'nur') {
    add('groupUntil');
    for (let i = p.group.length; i < 8; i++) {
      p.group.push(makeWalker({ dA: (Math.floor(i / 2) + 1) * 0.085 * (i % 2 ? 1 : -1) + rand(-0.02, 0.02), dR: rand(-0.9, 0.9), r: p.r, a: p.a }));
    }
  }
  if (tier.effect === 'nur') {
    nurUntil = Math.max(nurUntil, t) + tier.seconds;
    add('speedUntil');
    banner = { title: p.name, sub: 'meydana nur yağdırdı ✨', t, life: 7 };
    shot.until = 0;                                   // nur yağarken geniş açı
  }
}

// ---------- simülasyon ----------
function stepWalker(w, dt, mul) {
  const lin = (TAU * R_MID / CFG.lapSeconds) * w.pace * mul;
  const dA = lin / Math.max(w.r, 4) * dt;
  w.a -= dA; w.travel += dA;                           // saat yönünün tersine
  w.phase += dt * 6.5 * mul;
  w.r += (w.lane - w.r) * Math.min(1, dt * 0.9);
}
function poseFigure(w) {
  const f = w.fig;
  f.position.set(Math.cos(w.a) * w.r, 0, Math.sin(w.a) * w.r);
  f.rotation.y = Math.atan2(Math.sin(w.a), -Math.cos(w.a));
}

function update(dt, t) {
  const nur = t < nurUntil, nm = nur ? 1.35 : 1;
  chars.update(dt);
  for (const w of crowd) { stepWalker(w, dt, nm); poseFigure(w); }
  for (const p of [...players.values()]) {
    if (t - p.lastActive > CFG.idleMinutes * 60) { removePlayer(p); continue; }
    const inner = t < p.innerUntil, gold = t < p.goldUntil;
    if (inner && !p.innerLane) p.innerLane = rand(R_IN + 0.2, R_IN + 2.2);
    if (!inner) p.innerLane = 0;
    const lane = p.lane; if (inner) p.lane = p.innerLane;
    const before = Math.floor(p.travel / TAU);
    stepWalker(p, dt, (t < p.speedUntil ? 2.1 : 1) * nm);
    p.lane = lane;
    if (Math.floor(p.travel / TAU) > before) {
      p.laps++;
      if (p.laps % CFG.lapsPerTawaf === 0) {
        p.tawafs++; totalTawaf++;
        burst(p, 40, '#8fe3b4');
        toast(`🕋 ${p.name} tavafını tamamladı`, '#8fe3b4');
        if (!banner || t - banner.t > banner.life) banner = { title: p.name, sub: `${p.tawafs}. tavafını tamamladı · Allah kabul etsin`, t, life: 5 };
      }
    }
    poseFigure(p);
    const u = p.fig.userData;
    u.ch.setFast(t < p.speedUntil);
    u.beam.visible = gold;
    u.ringMat.color.copy(gold ? MAT.gold.color : u.baseColor);
    u.ring.scale.setScalar(gold ? 1.25 + Math.sin(t * 5) * 0.12 : 1);
    if (t > p.groupUntil && p.group.length) { for (const g of p.group) scene.remove(g.fig); p.group.length = 0; }
    for (const g of p.group) {
      g.a = p.a + g.dA * (R_MID / Math.max(p.r, 5)); g.r = Math.max(R_IN, p.r + g.dR); g.phase += dt * 6.5;
      poseFigure(g);
    }
  }
  // nur efekti
  nurPts.visible = nur;
  nurLight.intensity = nur ? 900 + Math.sin(t * 3) * 200 : 0;
  if (nur) {
    const pos = nurPts.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) { let y = pos.getY(i) - dt * (3 + (i % 5)); if (y < 0) y += 26; pos.setY(i, y); }
    pos.needsUpdate = true;
  }
  startLine.material.opacity = 0.65 + 0.2 * Math.sin(t * 2);
}

// ---------- kamera ----------
const shot = { id: null, until: 0, next: now() + (CFG.closeShotEvery || 1e9) };
const camPos = new THREE.Vector3(0, 46, 62), camLook = new THREE.Vector3(0, 0, 0);
const wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();
let orbit = 0, snapCam = false;
function focusOn(p, t, secs) { shot.near = 1; shot.id = p.id; shot.until = t + secs; shot.next = shot.until + (CFG.closeShotEvery || 1e9); }

function updateCamera(dt, t) {
  orbit += dt * 0.07;
  if (CFG.closeShotEvery && t > shot.next && players.size && t > nurUntil) {
    const list = [...players.values()].sort((a, b) => b.lastActive - a.lastActive).slice(0, 8);
    focusOn(list[Math.floor(Math.random() * list.length)], t, 9);
  }
  const target = t < shot.until ? players.get(shot.id) : null;
  if (target) {
    const ca = Math.cos(target.a), sa = Math.sin(target.a), r = target.r;
    // oyuncunun önünde ve dışında: arkada Kâbe görünsün
    const n = shot.near || 1;                         // (test için yakınlık çarpanı)
    wantPos.set(ca * (r + 6.5 * n) + sa * 8 * n, 1.2 + 3.4 * n, sa * (r + 6.5 * n) - ca * 8 * n);
    wantLook.set(ca * (r - 1.5), 1.3, sa * (r - 1.5));
  } else {
    const o = Math.sin(orbit) * 0.75;                 // açık ön taraftan sağa sola süzül
    wantPos.set(Math.sin(o) * 62, 46, Math.cos(o) * 62);
    wantLook.set(0, 0.5, 0);
  }
  const k = snapCam ? 1 : 1 - Math.exp(-dt * 1.6); snapCam = false;
  camPos.lerp(wantPos, k); camLook.lerp(wantLook, k);
  camera.position.copy(camPos); camera.lookAt(camLook);
  camera.updateMatrixWorld();
}

// ====================== HUD (2B katman) ======================
const hud = document.getElementById('hud').getContext('2d');
const rrect = (x, y, w, h, r) => { hud.beginPath(); hud.roundRect(x, y, w, h, r); };
const ray = new THREE.Ray(), _hit = new THREE.Vector3(), _head = new THREE.Vector3();

function drawTags(t) {
  const tags = [];
  for (const p of players.values()) {
    _head.set(p.fig.position.x, 2.15, p.fig.position.z);
    const dist = _head.distanceTo(camera.position);
    const s = screenOf(_head.x, _head.y, _head.z);
    if (!s.ok || s.x < -40 || s.x > W + 40 || s.y < 560 || s.y > 1380) continue;
    ray.origin.copy(camera.position); ray.direction.copy(_head).sub(camera.position).normalize();
    if (ray.intersectBox(kaabaBox, _hit) && _hit.distanceTo(camera.position) < dist) continue;   // Kâbe'nin arkasında
    tags.push({ p, s, dist, gold: t < p.goldUntil });
  }
  // kalabalıkta okunaklı kalsın: altın isimliler + yakındakiler + son etkileşenler
  tags.sort((a, b) => (b.gold - a.gold) || (a.dist - b.dist) * 0.02 + (b.p.lastActive - a.p.lastActive));
  const shown = tags.slice(0, 34).sort((a, b) => b.dist - a.dist);
  hud.textAlign = 'center'; hud.lineJoin = 'round';
  for (const { p, s, dist, gold } of shown) {
    const hr = clamp(560 / dist, 15, 46), y = s.y - hr;
    if (gold) { hud.beginPath(); hud.arc(s.x, y, hr + 7 + Math.sin(t * 5) * 2, 0, TAU); hud.fillStyle = 'rgba(255,205,80,0.4)'; hud.fill(); }
    hud.save(); hud.beginPath(); hud.arc(s.x, y, hr, 0, TAU); hud.clip();
    if (p.img) hud.drawImage(p.img, s.x - hr, y - hr, hr * 2, hr * 2);
    else {
      hud.fillStyle = p.color; hud.fillRect(s.x - hr, y - hr, hr * 2, hr * 2);
      hud.fillStyle = '#fff'; hud.font = `700 ${Math.round(hr * 1.15)}px ${FONT}`; hud.textBaseline = 'middle';
      hud.fillText((p.name[0] || '?').toLocaleUpperCase('tr'), s.x, y + 1);
    }
    hud.restore();
    hud.beginPath(); hud.arc(s.x, y, hr, 0, TAU); hud.strokeStyle = gold ? '#ffcf4d' : '#fff'; hud.lineWidth = 3; hud.stroke();
    const name = p.name.length > 14 ? p.name.slice(0, 13) + '…' : p.name;
    const txt = `${name} · ${p.laps % CFG.lapsPerTawaf}/${CFG.lapsPerTawaf}`;
    hud.font = `700 ${Math.round(clamp(hr * 1.2, 19, 34) + (gold ? 3 : 0))}px ${FONT}`; hud.textBaseline = 'bottom';
    hud.lineWidth = 5; hud.strokeStyle = 'rgba(8,12,16,0.85)'; hud.strokeText(txt, s.x, y - hr - 5);
    hud.fillStyle = gold ? '#ffd766' : '#fff'; hud.fillText(txt, s.x, y - hr - 5);
  }
}

function panel(x, y, w, h) {
  rrect(x, y, w, h, 18); hud.fillStyle = 'rgba(10,18,24,0.84)'; hud.fill();
  hud.strokeStyle = 'rgba(201,164,65,0.5)'; hud.lineWidth = 2; hud.stroke();
}

function drawHud(t) {
  hud.clearRect(0, 0, W, H);
  drawTags(t);
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i], age = t - s.t;
    if (age > s.life) { sparks.splice(i, 1); continue; }
    hud.globalAlpha = 1 - age / s.life;
    hud.beginPath(); hud.arc(s.x + s.vx * age, s.y + s.vy * age + 170 * age * age, 5, 0, TAU); hud.fillStyle = s.color; hud.fill();
  }
  hud.globalAlpha = 1;

  const top = hud.createLinearGradient(0, 0, 0, 620);
  top.addColorStop(0, 'rgba(5,8,13,0.95)'); top.addColorStop(0.75, 'rgba(5,8,13,0.55)'); top.addColorStop(1, 'rgba(5,8,13,0)');
  hud.fillStyle = top; hud.fillRect(0, 0, W, 620);
  const bot = hud.createLinearGradient(0, 1330, 0, 1620);
  bot.addColorStop(0, 'rgba(5,8,13,0)'); bot.addColorStop(1, 'rgba(5,8,13,0.96)');
  hud.fillStyle = bot; hud.fillRect(0, 1330, W, 590);

  hud.textBaseline = 'middle'; hud.textAlign = 'center';
  hud.font = `800 46px ${FONT}`; hud.fillStyle = '#e9c96a'; hud.fillText(`🕋 ${CFG.title}`, 540, 215);
  hud.font = `600 26px ${FONT}`; hud.fillStyle = '#cfd8dc';
  hud.fillText(`${players.size} kişi tavafta · ${totalTawaf} tavaf tamamlandı`, 540, 262);

  const best = [...players.values()].sort((a, b) => b.laps - a.laps).slice(0, 5);
  panel(24, 300, 440, 262);
  hud.textAlign = 'left'; hud.font = `800 24px ${FONT}`; hud.fillStyle = '#e9c96a'; hud.fillText('EN ÇOK ŞAVT', 46, 330);
  hud.font = `600 25px ${FONT}`;
  best.forEach((p, i) => {
    const y = 372 + i * 40;
    hud.fillStyle = i === 0 ? '#ffd766' : '#eef2f3'; hud.textAlign = 'left';
    hud.fillText(`${i + 1}.  ${p.name.length > 16 ? p.name.slice(0, 15) + '…' : p.name}`, 46, y);
    hud.textAlign = 'right'; hud.fillText(String(p.laps), 440, y);
  });
  if (!best.length) { hud.fillStyle = '#8a979d'; hud.fillText('İlk katılan sen ol!', 46, 372); }

  panel(484, 300, 572, 262);
  hud.textAlign = 'left'; hud.font = `800 24px ${FONT}`; hud.fillStyle = '#e9c96a'; hud.fillText('HEDİYE ETKİLERİ', 506, 330);
  hud.font = `600 24px ${FONT}`;
  tiers.slice(0, 5).forEach((g, i) => {
    const y = 372 + i * 40;
    hud.textAlign = 'left'; hud.fillStyle = '#eef2f3'; hud.fillText(`${g.icon}  ${g.label}`, 506, y);
    hud.textAlign = 'right'; hud.fillStyle = '#ffd766'; hud.fillText(`${g.min}+ jeton`, 1034, y);
  });

  const hy = 1410;
  rrect(540 - 300, hy - 34, 600, 68, 34); hud.fillStyle = 'rgba(10,18,24,0.9)'; hud.fill();
  hud.strokeStyle = '#2aa870'; hud.lineWidth = 3; hud.stroke();
  hud.textAlign = 'center'; hud.font = `700 32px ${FONT}`; hud.fillStyle = '#fff';
  hud.fillText(COMMENT_JOIN ? '💬 Yorum yaz, tavafa katıl' : '🎁 Hediye gönder, tavafa katıl', 540, hy + 2);
  hud.font = `600 22px ${FONT}`; hud.fillStyle = '#9fb0b6';
  hud.fillText('Tavaftakiler için  ❤️ Beğen: hızlan  ·  ➕ Takip et / paylaş: altın isim', 540, hy + 66);

  let ty = 612;
  for (const m of toasts) {
    const age = t - m.t; if (age > 6) continue;
    hud.globalAlpha = Math.min(1, age * 4) * Math.min(1, (6 - age) * 2); hud.font = `700 26px ${FONT}`;
    const tw = hud.measureText(m.text).width + 44;
    rrect(540 - tw / 2, ty - 22, tw, 44, 22); hud.fillStyle = 'rgba(10,18,24,0.85)'; hud.fill();
    hud.fillStyle = m.color; hud.fillText(m.text, 540, ty + 1);
    hud.globalAlpha = 1; ty += 52;
  }

  if (banner && t - banner.t < banner.life) {
    const age = t - banner.t;
    hud.globalAlpha = Math.min(1, age * 3) * Math.min(1, (banner.life - age) * 2);
    rrect(90, 1220, 900, 120, 26); hud.fillStyle = 'rgba(14,60,44,0.94)'; hud.fill();
    hud.strokeStyle = '#e9c96a'; hud.lineWidth = 3; hud.stroke();
    hud.font = `800 42px ${FONT}`; hud.fillStyle = '#ffd766'; hud.fillText(banner.title.slice(0, 24), 540, 1260);
    hud.font = `600 27px ${FONT}`; hud.fillStyle = '#fff'; hud.fillText(banner.sub, 540, 1306);
    hud.globalAlpha = 1;
  }
  if (!status.connected && !DEMO) {
    hud.font = `600 22px ${FONT}`; hud.fillStyle = '#ff9a8a';
    hud.fillText(`● ${status.text}`, 540, 1530);
  }
}

// ====================== DÖNGÜ ======================
let last = now();
function frame() {
  const t = now(), dt = Math.min(0.1, t - last); last = t;
  update(dt, t); updateCamera(dt, t);
  renderer.render(scene, camera);
  drawHud(t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- sunucu bağlantısı ----------
function connect() {
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  ws.onmessage = (m) => { try { onEvent(JSON.parse(m.data)); } catch (e) { console.error(e); } };
  ws.onclose = () => { status = { connected: false, text: 'Sunucu bağlantısı yok, yeniden deneniyor…' }; setTimeout(connect, 3000); };
}

// ---------- demo / test ----------
const NAMES = ['Emir', 'Hilal', 'Zeynep', 'Ahmet', 'Ayşe', 'Mehmet Ali', 'Fatma', 'Yusuf', 'Elif', 'Ömer', 'Meryem', 'Halit', 'Esma', 'Ceren', 'Mustafa', 'Hatice', 'İbrahim', 'Sümeyye', 'Bilal', 'Rabia', 'Hamza', 'Büşra', 'Enes', 'Kübra', 'Yağmur'];
function fakeUser() { const n = NAMES[Math.floor(Math.random() * NAMES.length)] + (Math.random() < 0.5 ? '' : Math.floor(rand(1, 99))); return { id: n, name: n, avatar: '' }; }
function randomExisting() { const a = [...players.values()]; return a.length ? { id: a[Math.floor(Math.random() * a.length)].id } : fakeUser(); }
function fakeGift(coins, fresh) { onEvent({ type: 'gift', user: fresh ? fakeUser() : randomExisting(), coins }); }

if (DEMO) {
  for (let i = 0; i < DEMO_COUNT; i++) {
    const p = ensure(fakeUser(), now(), true);
    p.travel = rand(0, TAU * 6); p.laps = Math.floor(p.travel / TAU); p.a = START_A - p.travel; p.r = p.lane;
  }
  toasts.length = 0;
  setInterval(() => {
    const x = Math.random();
    if (x < 0.35) fakeGift(1, true);
    else if (x < 0.65) onEvent({ type: 'like', user: randomExisting(), likes: 5 });
    else if (x < 0.82) fakeGift(1);
    else if (x < 0.91) fakeGift(5);
    else if (x < 0.96) fakeGift(20);
    else if (x < 0.992) fakeGift(99);
    else fakeGift(500);
  }, 1500);
} else {
  connect();
}

// Yayın öncesi test tuşları: J = yeni katılımcı (1 jetonluk hediye), 1-5 = hediye kademeleri
addEventListener('keydown', (e) => {
  if (e.key === 'j' || e.key === 'J') fakeGift(1, true);
  const i = '12345'.indexOf(e.key);
  if (i >= 0 && tiers[i]) fakeGift(tiers[i].min);
});
window.__game = { onEvent, players, closeUp(i = 0, secs = 600, near = 1) { const p = [...players.values()][i]; if (p) { focusOn(p, now(), secs); snapCam = true; shot.near = near; } return p && p.female; } };
