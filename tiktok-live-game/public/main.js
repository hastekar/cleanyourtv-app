import * as THREE from 'three';
import { loadCharacters } from './characters.js';

const CFG = window.GAME_CONFIG;
const W = 1080, H = 1920, TAU = Math.PI * 2;
const R_IN = 10.6, R_OUT = 19, R_MID = (R_IN + R_OUT) / 2;       // yürüyüş halkaları (birim ≈ metre)
const START_A = Math.PI * 0.25;                    // şavt başlangıç çizgisi
const KAABA = { w: 9, h: 11 };                    // insanlara göre gerçek oranında
const params = new URLSearchParams(location.search);
const DEMO = params.has('demo') || !!window.GAME_DEMO;
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
const camera = new THREE.PerspectiveCamera(80, W / H, 0.3, 400);   // geniş açı: Kâbe ve kalabalık ekranın orta bandına (TikTok arayüzünün dışında kalan kısım) sığsın

scene.add(new THREE.HemisphereLight(0xcfdcff, 0x4a3c28, 1.0));
scene.add(new THREE.AmbientLight(0xffffff, 0.25));
const sun = new THREE.DirectionalLight(0xfff1d6, 2.0);
sun.position.set(20, 46, 16);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -29, right: 29, top: 29, bottom: -29, near: 5, far: 100 });
sun.shadow.bias = -0.0004;
scene.add(sun);
const nurLight = new THREE.PointLight(0xffdf90, 0, 60, 1.4);
nurLight.position.set(0, KAABA.h + 4, 0);
scene.add(nurLight);

function canvasTex(w, h, paint) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

// --- zemin (mermer mataf) ---
const floorTex = canvasTex(2048, 2048, (g, w) => {
  const c = w / 2, grd = g.createRadialGradient(c, c, 60, c, c, c);
  grd.addColorStop(0, '#eee8da'); grd.addColorStop(1, '#cfc7b2');
  g.fillStyle = grd; g.fillRect(0, 0, w, w);
  g.strokeStyle = 'rgba(150,132,96,0.30)'; g.lineWidth = 4;     // geniş ve yumuşak çizgiler: yatık bakışta tırtıklanmasın
  for (let r = 80; r < c; r += 52) { g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke(); }
  g.strokeStyle = 'rgba(150,132,96,0.12)'; g.lineWidth = 3;
  for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; g.beginPath(); g.moveTo(c + Math.cos(a) * 80, c + Math.sin(a) * 80); g.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c); g.stroke(); }
});
const floor = new THREE.Mesh(new THREE.CircleGeometry(26.5, 96), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5, metalness: 0.05 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const outer = new THREE.Mesh(new THREE.CircleGeometry(160, 64), new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 1 }));
outer.rotation.x = -Math.PI / 2; outer.position.y = -0.05; scene.add(outer);

// başlangıç çizgisi (Hacerülesved köşesinden dışarı)
const startLine = new THREE.Mesh(new THREE.PlaneGeometry(19.5, 0.3), new THREE.MeshBasicMaterial({ color: 0x25b877, transparent: true, opacity: 0.85 }));
startLine.rotation.x = -Math.PI / 2; startLine.rotation.z = -START_A;
startLine.position.set(Math.cos(START_A) * 16.6, 0.02, Math.sin(START_A) * 16.6);
scene.add(startLine);

// --- Kâbe ---
const GOLD = '#d9b24c', GOLD_D = '#8a6a1c', GOLD_L = '#f3d98a';
function kiswah(door) {
  return canvasTex(1024, 1280, (g, w, h) => {
    g.fillStyle = '#08080a'; g.fillRect(0, 0, w, h);
    // jakarlı dokuma: zikzak şeritler
    g.strokeStyle = 'rgba(255,255,255,0.045)'; g.lineWidth = 5;
    for (let y = -40; y < h; y += 46) { g.beginPath(); for (let x = 0; x <= w; x += 64) g.lineTo(x, y + ((x / 64) % 2 ? 40 : 0)); g.stroke(); }
    // hizam (altın kuşak)
    const by = h * 0.24, bh = h * 0.115;
    g.fillStyle = GOLD_D; g.fillRect(0, by - 10, w, bh + 20);
    g.fillStyle = '#0b0b0d'; g.fillRect(0, by, w, bh);
    g.fillStyle = GOLD; g.fillRect(0, by - 16, w, 8); g.fillRect(0, by + bh + 8, w, 8);
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let x = 30; x < w - 40; x += 118) {             // kuşak içi: hat sanatını andıran akıcı altın motifler
      g.strokeStyle = GOLD; g.lineWidth = 11;
      g.beginPath(); g.moveTo(x, by + bh * 0.72); g.bezierCurveTo(x + 18, by + bh * 0.1, x + 44, by + bh * 0.95, x + 62, by + bh * 0.3); g.stroke();
      g.beginPath(); g.moveTo(x + 50, by + bh * 0.8); g.quadraticCurveTo(x + 86, by + bh * 0.95, x + 100, by + bh * 0.42); g.stroke();
      g.lineWidth = 8; g.beginPath(); g.moveTo(x + 78, by + bh * 0.16); g.lineTo(x + 78, by + bh * 0.62); g.stroke();
      g.fillStyle = GOLD_L; g.beginPath(); g.arc(x + 30, by + bh * 0.2, 6, 0, TAU); g.arc(x + 96, by + bh * 0.2, 5, 0, TAU); g.fill();
    }
    // kuşak altı: kandil biçimli ve dikdörtgen altın işlemeler
    for (let i = 0; i < 5; i++) {
      const x = w * (0.1 + i * 0.2), y = by + bh + 70;
      g.fillStyle = GOLD_D; g.beginPath(); g.roundRect(x - 78, y - 6, 156, 76, 18); g.fill();
      g.fillStyle = '#0b0b0d'; g.beginPath(); g.roundRect(x - 68, y + 4, 136, 56, 12); g.fill();
      g.strokeStyle = GOLD; g.lineWidth = 7; g.beginPath(); g.moveTo(x - 50, y + 42); g.bezierCurveTo(x - 20, y + 4, x + 14, y + 62, x + 50, y + 20); g.stroke();
      if (i % 2) { g.fillStyle = GOLD; g.beginPath(); g.ellipse(x, y + 150, 30, 44, 0, 0, TAU); g.fill(); g.fillStyle = '#0b0b0d'; g.beginPath(); g.ellipse(x, y + 150, 19, 32, 0, 0, TAU); g.fill(); }
    }
    g.fillStyle = GOLD_D; g.fillRect(0, h - 26, w, 10);
    if (door) {                                          // kapı örtüsü (sitare)
      const dx = w * 0.56, dw = w * 0.3, dy = h * 0.46, dh = h * 0.5;
      g.fillStyle = GOLD; g.fillRect(dx, dy, dw, dh);
      g.fillStyle = '#0b0b0d'; g.fillRect(dx + 14, dy + 14, dw - 28, dh - 28);
      g.strokeStyle = GOLD; g.lineWidth = 8;
      for (let k = 0; k < 4; k++) { const yy = dy + 50 + k * 60; g.beginPath(); g.roundRect(dx + 36, yy, dw - 72, 40, 12); g.stroke(); }
      g.beginPath(); g.arc(dx + dw / 2, dy + dh * 0.62, dw * 0.3, Math.PI, 0); g.stroke();
    }
  });
}
const kMat = (door) => { const t = kiswah(door); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, emissive: 0x6b5520, emissiveMap: t, emissiveIntensity: 0.55 }); };
const kTop = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.95 });
const kPlain = kMat(false);
const marble = new THREE.MeshStandardMaterial({ color: 0xece5d6, roughness: 0.45 });
const goldMat = new THREE.MeshStandardMaterial({ color: 0xd9b24c, roughness: 0.3, metalness: 0.85, emissive: 0x7a5a14, emissiveIntensity: 0.6 });
const BASE = 0.8, HW = KAABA.w / 2;
const kaaba = new THREE.Mesh(new THREE.BoxGeometry(KAABA.w, KAABA.h, KAABA.w), [kPlain, kPlain, kTop, kTop, kMat(true), kPlain]);
kaaba.position.y = KAABA.h / 2 + BASE; kaaba.castShadow = true; scene.add(kaaba);
// şazervan: eğimli mermer kaide
const shadh = new THREE.Mesh(new THREE.CylinderGeometry((HW + 0.08) * Math.SQRT2, (HW + 0.75) * Math.SQRT2, BASE, 4), marble);
shadh.rotation.y = Math.PI / 4; shadh.position.y = BASE / 2; shadh.receiveShadow = true; scene.add(shadh);
// altın kapı (yerden yüksekte, Hacerülesved köşesine yakın)
const door = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.3, 0.16), goldMat);
door.position.set(HW * 0.42, BASE + 2.2 + 1.65, HW + 0.05); scene.add(door);
const doorIn = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.9, 0.2), new THREE.MeshStandardMaterial({ color: 0xb8902e, roughness: 0.35, metalness: 0.8, emissive: 0x5a4210, emissiveIntensity: 0.5 }));
doorIn.position.copy(door.position); scene.add(doorIn);
// Hacerülesved: köşede gümüş çerçeve içinde kara taş (köşe çaprazına bakar)
{
  const silver = new THREE.MeshStandardMaterial({ color: 0xdfe3e8, roughness: 0.25, metalness: 0.9 });
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.14, 24), silver); plate.rotation.x = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.09, 8, 28), silver); rim.position.z = 0.05;
  const rock = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.55 }));
  rock.scale.set(0.9, 1.15, 0.5); rock.position.z = 0.08;
  g.add(plate, rim, rock);
  g.rotation.y = Math.PI / 4; g.position.set(HW + 0.1, BASE + 1.5, HW + 0.1); scene.add(g);
}
// altın oluk (mizab) ve Hatim (yarım daire duvar)
const mizab = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 2.4), goldMat);   // çatı kenarından Hatim'e doğru hafif eğimli oluk
mizab.position.set(0, BASE + KAABA.h + 0.02, -HW - 1.0); mizab.rotation.x = -0.14; scene.add(mizab);
{
  const sh = new THREE.Shape();                           // yarım halka duvar, Kâbe'nin kapı karşısındaki (−z) yüzünde
  sh.absarc(0, 0, 4.7, 0, Math.PI, false); sh.absarc(0, 0, 4.0, Math.PI, 0, true);
  const hatim = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 1.3, bevelEnabled: false, curveSegments: 40 }), marble);
  hatim.rotation.x = -Math.PI / 2; hatim.position.set(0, 0, -HW - 0.2);
  hatim.castShadow = true; hatim.receiveShadow = true; scene.add(hatim);
}
// Makam-ı İbrahim
{
  const m = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.5, 8), marble); base.position.y = 0.25;
  const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.5, 8), goldMat); cage.position.y = 1.25;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.58, 12, 8, 0, TAU, 0, Math.PI / 2), goldMat); dome.position.y = 2.0;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 6), goldMat); tip.position.y = 2.8;
  m.add(base, cage, dome, tip); m.position.set(HW * 0.3, 0, HW + 3.6); scene.add(m);
}
const kaabaBox = new THREE.Box3(new THREE.Vector3(-HW, 0, -HW), new THREE.Vector3(HW, KAABA.h + BASE, HW));

// --- revaklar (çevre kemerler) ve minareler ---
{
  const stoneM = new THREE.MeshStandardMaterial({ color: 0xe2d6bd, roughness: 0.7 });
  const N = 72, RC = 27.6;
  const cols = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 4.2, 0.8), stoneM, N * 2);
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.26, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe2a0 }), N);
  const m = new THREE.Matrix4();
  for (let i = 0; i < N; i++) {
    const a = i / N * TAU, x = Math.cos(a) * RC, z = Math.sin(a) * RC;
    m.makeRotationY(-a).setPosition(x, 2.1, z); cols.setMatrixAt(i, m);
    m.makeRotationY(-a).setPosition(x, 7.2, z); cols.setMatrixAt(N + i, m);
    m.makeTranslation(Math.cos(a) * (RC - 0.55), 3.8, Math.sin(a) * (RC - 0.55)); lamps.setMatrixAt(i, m);
  }
  scene.add(cols, lamps);
  for (const y of [4.7, 9.8]) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(RC + 0.4, RC + 0.4, 1.0, 96, 1, true), new THREE.MeshStandardMaterial({ color: 0xd6c8a8, roughness: 0.7, side: THREE.DoubleSide }));
    beam.position.y = y; scene.add(beam);
  }
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(RC + 3.4, RC + 3.4, 10.3, 96, 1, true), new THREE.MeshStandardMaterial({ color: 0xb59f74, roughness: 0.9, side: THREE.BackSide, emissive: 0x4a3614, emissiveIntensity: 0.7 }));
  wall.position.y = 5.15; scene.add(wall);
  const roof = new THREE.Mesh(new THREE.RingGeometry(RC, RC + 4.4, 96), new THREE.MeshStandardMaterial({ color: 0xcdbf9f, roughness: 0.8, side: THREE.DoubleSide }));
  roof.rotation.x = -Math.PI / 2; roof.position.y = 10.3; scene.add(roof);
  const tipMat = new THREE.MeshBasicMaterial({ color: 0xfff0c0 });
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU + 0.52, g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 30, 12), stoneM); shaft.position.y = 15;
    const balc = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.2, 0.9, 12), stoneM); balc.position.y = 21;
    const balc2 = balc.clone(); balc2.position.y = 28;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.0, 4, 12), new THREE.MeshStandardMaterial({ color: 0xc9a441, roughness: 0.4, metalness: 0.6 })); cap.position.y = 32;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), tipMat); tip.position.y = 34.3;
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.6, 12), tipMat); glow.position.y = 27.2;
    g.add(shaft, balc, balc2, cap, tip, glow);
    g.position.set(Math.cos(a) * 33.5, 0, Math.sin(a) * 33.5); scene.add(g);
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
const dotTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,0.7)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
const nurPts = pointsCloud(900, (p, i) => {
  const a = rand(0, TAU), r = Math.sqrt(Math.random()) * 26;
  p[i] = Math.cos(a) * r; p[i + 1] = rand(0, 26); p[i + 2] = Math.sin(a) * r;
}, new THREE.PointsMaterial({ color: 0xffe08a, map: dotTex, alphaTest: 0.01, size: 0.5, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
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
  const w = Object.assign({ a: rand(0, TAU), r: rand(R_IN + 0.6, R_OUT), travel: 0, phase: rand(0, TAU), pace: rand(0.85, 1.15), female: Math.random() < 0.45, npc: true }, extra);
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
    a: START_A + rand(0.05, 0.4), lane: rand(R_IN + 3, R_OUT - 0.5), r: R_OUT + 2,
    color: RING_COLORS[h % RING_COLORS.length], female: (h >> 3) % 100 < 45,   // TikTok cinsiyet bilgisi vermez: kullanıcıya göre sabit, rastgele

    laps: 0, tawafs: 0, lastActive: t, goldUntil: 0, speedUntil: 0, innerUntil: 0, groupUntil: 0, innerLane: 0, group: [], img: null,
  });
  if (user.avatar) { const im = new Image(); im.onload = () => { p.img = im; }; im.src = user.avatar; }
  players.set(p.id, p);
  toast(`${p.name} tavafa katıldı`, '#bfe8d2');
  return p;
}

function toast(text, color) { toasts.push({ text, color: color || '#fff', t: now() }); if (toasts.length > 3) toasts.shift(); }

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
    u.beam.visible = gold && !(p.id === shot.id && t < shot.until);   // yakın çekimde ışık sütunu yüzü beyazlatmasın
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
// Kamera kalabalığın hemen dışında, baş hizasının biraz üstünde döner; aralıklarla bir oyuncuyu yakından takip eder.
const CAM_R = 24.6, CAM_H = 2.3, LOOK_Y = 6.0, CULL = 6;   // yürüyüş halkasının hemen dışı; CULL: kameraya bu kadar yakın figürler gizlenir (gövde ekranı kaplamasın)
const shot = { id: null, until: 0, next: now() + (CFG.closeShotEvery || 1e9), near: 1 };
const camPos = new THREE.Vector3(0, CAM_H, CAM_R), camLook = new THREE.Vector3(0, 1.6, 0);
const wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();
let orbitHold = false, orbit = Math.PI / 2 - 0.5, snapCam = true, shotKey = 'orbit', cutAt = -9;
function focusOn(p, t, secs) { if (orbitHold) return; shot.near = 1; shot.id = p.id; shot.until = t + secs; shot.next = shot.until + (CFG.closeShotEvery || 1e9); }

function updateCamera(dt, t) {
  if (!orbitHold) orbit += dt * 0.04;                                 // yürüyüşün tersine: yüzler kameraya doğru gelir
  if (CFG.closeShotEvery && t > shot.next && players.size && t > nurUntil) {
    const list = [...players.values()].sort((a, b) => b.lastActive - a.lastActive).slice(0, 8);
    focusOn(list[Math.floor(Math.random() * list.length)], t, 9);
  }
  const target = t < shot.until ? players.get(shot.id) : null;
  const key = target ? target.id : 'orbit';
  if (key !== shotKey) { shotKey = key; snapCam = true; cutAt = t; }   // çekim değişince kes (Kâbe'nin içinden geçmesin)
  if (target) {
    const ca = Math.cos(target.a), sa = Math.sin(target.a), r = target.r, n = shot.near || 1;
    // oyuncunun önünde ve dışında: yüzü kameraya dönük, arkada Kâbe
    // dışarıda ve hafif önde (yürüyüş yönünde), göz hizasında; oyuncu bandın ortasında ~400 px boyunda, arkada Kâbe
    const out = r + 4.0 * n, ahead = 2.4 * n;
    wantPos.set(ca * out + sa * ahead, 1.35 + 0.3 * n, sa * out - ca * ahead);
    wantLook.set(ca * r, 1.1, sa * r);
  } else {
    wantPos.set(Math.cos(orbit) * CAM_R, CAM_H, Math.sin(orbit) * CAM_R);
    wantLook.set(0, LOOK_Y, 0);
  }
  const k = snapCam ? 1 : 1 - Math.exp(-dt * (target ? 6 : 2.2)); snapCam = false;
  camPos.lerp(wantPos, k); camLook.lerp(wantLook, k);
  camera.position.copy(camPos); camera.lookAt(camLook);
  camera.updateMatrixWorld();
  // kameraya çok yakın figürleri gizle (odaktaki oyuncu hariç)
  const cull = (w) => { const f = w.fig, dx = f.position.x - camera.position.x, dz = f.position.z - camera.position.z; const c = target ? 4.5 : CULL; f.visible = w === target || dx * dx + dz * dz > c * c; };
  for (const w of crowd) cull(w);
  for (const p of players.values()) { cull(p); for (const g of p.group) cull(g); }
}

// ====================== HUD (2B katman) ======================
const hud = document.getElementById('hud').getContext('2d');
const rrect = (x, y, w, h, r) => { hud.beginPath(); hud.roundRect(x, y, w, h, r); };
const ray = new THREE.Ray(), _hit = new THREE.Vector3(), _head = new THREE.Vector3();

const BAND_TOP = 612, BAND_BOT = 1340;                 // TikTok arayüzünün dışında kalan güvenli bant
const placed = [];                                       // bu karede dolu dikdörtgenler (etiket çakışma önleme)
const overlaps = (r) => placed.some((q) => r.x < q.x + q.w && r.x + r.w > q.x && r.y < q.y + q.h && r.y + r.h > q.y);

function drawTags(t) {
  const tags = [];
  for (const p of players.values()) {
    _head.set(p.fig.position.x, 2.1, p.fig.position.z);
    const dist = _head.distanceTo(camera.position);
    const s = screenOf(_head.x, _head.y, _head.z);
    if (!p.fig.visible || !s.ok || s.x < -20 || s.x > W + 20 || s.y < BAND_TOP + 80 || s.y > 1400) continue;
    ray.origin.copy(camera.position); ray.direction.copy(_head).sub(camera.position).normalize();
    if (ray.intersectBox(kaabaBox, _hit) && _hit.distanceTo(camera.position) < dist) continue;   // Kâbe'nin arkasında
    tags.push({ p, s, dist, gold: t < p.goldUntil });
  }
  // telefonda okunaklı kalsın: altın isimliler öncelikli, sonra kameraya en yakınlar; üst üste binenler elenir
  const foc = (x) => (x.p.id === shot.id && t < shot.until ? 1 : 0);
  tags.sort((a, b) => (foc(b) - foc(a)) * 1e3 + (b.gold - a.gold) * 60 + (a.dist - b.dist));
  hud.textAlign = 'center'; hud.lineJoin = 'round';
  const shown = [];
  for (const tg of tags) {
    if (shown.length >= 8) break;
    const { p, s, dist } = tg;
    const hr = clamp(600 / dist, 30, 48), fs = Math.round(clamp(hr * 0.95, 36, 44));
    const name = p.name.length > 12 ? p.name.slice(0, 11) + '…' : p.name;
    tg.txt = `${name} · ${p.laps % CFG.lapsPerTawaf}/${CFG.lapsPerTawaf}`;
    hud.font = `800 ${fs}px ${FONT}`;
    const tw = hud.measureText(tg.txt).width + 14, bw = Math.max(tw, hr * 2 + 14);
    tg.hr = hr; tg.fs = fs;
    tg.x = clamp(s.x, bw / 2 + 8, W - bw / 2 - 8);
    tg.y = s.y - 6 - hr;                                  // avatar merkezi: başın hemen üstü
    const rect = { x: tg.x - bw / 2, y: tg.y - hr - fs - 14, w: bw, h: hr * 2 + fs + 20 };
    const dy = Math.max(0, BAND_TOP - rect.y);            // üst panele değiyorsa biraz aşağı it (kafaya hafif biner)
    if (dy <= 70) { rect.y += dy; tg.y += dy; }
    if (rect.y < BAND_TOP || rect.y + rect.h > BAND_BOT + 60 || overlaps(rect)) continue;
    placed.push(rect); shown.push(tg);
  }
  shown.sort((a, b) => b.dist - a.dist);
  for (const { p, x, y, hr, fs, txt, gold } of shown) {
    if (gold) { hud.beginPath(); hud.arc(x, y, hr + 8 + Math.sin(t * 5) * 2, 0, TAU); hud.fillStyle = 'rgba(255,205,80,0.45)'; hud.fill(); }
    hud.save(); hud.beginPath(); hud.arc(x, y, hr, 0, TAU); hud.clip();
    if (p.img) hud.drawImage(p.img, x - hr, y - hr, hr * 2, hr * 2);
    else {
      hud.fillStyle = p.color; hud.fillRect(x - hr, y - hr, hr * 2, hr * 2);
      hud.fillStyle = '#fff'; hud.font = `700 ${Math.round(hr * 1.15)}px ${FONT}`; hud.textBaseline = 'middle';
      hud.fillText((p.name[0] || '?').toLocaleUpperCase('tr'), x, y + 1);
    }
    hud.restore();
    hud.beginPath(); hud.arc(x, y, hr, 0, TAU); hud.strokeStyle = gold ? '#ffcf4d' : '#fff'; hud.lineWidth = 4; hud.stroke();
    hud.font = `800 ${fs}px ${FONT}`; hud.textBaseline = 'bottom';
    hud.lineWidth = 7; hud.strokeStyle = 'rgba(8,12,16,0.9)'; hud.strokeText(txt, x, y - hr - 6);
    hud.fillStyle = gold ? '#ffd766' : '#fff'; hud.fillText(txt, x, y - hr - 6);
  }
}

function panel(x, y, w, h) {
  rrect(x, y, w, h, 18); hud.fillStyle = 'rgba(10,18,24,0.84)'; hud.fill();
  hud.strokeStyle = 'rgba(201,164,65,0.5)'; hud.lineWidth = 2; hud.stroke();
}

function drawHud(t) {
  hud.clearRect(0, 0, W, H);
  placed.length = 0;
  const bannerOn = banner && t - banner.t < banner.life;
  const live = toasts.filter((m) => t - m.t < 6).slice(-2);
  if (bannerOn) placed.push({ x: 90, y: 636, w: 900, h: 130 });
  live.forEach((m, i) => placed.push({ x: 140, y: 1330 - (live.length - 1 - i) * 60 - 52, w: 800, h: 56 }));
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
  hud.font = `800 56px ${FONT}`; hud.fillStyle = '#e9c96a'; hud.fillText(`🕋 ${CFG.title}`, 540, 208);
  hud.font = `600 30px ${FONT}`; hud.fillStyle = '#cfd8dc';
  hud.fillText(`${players.size} kişi tavafta · ${totalTawaf} tavaf tamamlandı`, 540, 262);

  const best = [...players.values()].sort((a, b) => b.laps - a.laps).slice(0, 4);
  panel(20, 296, 462, 304);
  hud.textAlign = 'left'; hud.font = `800 28px ${FONT}`; hud.fillStyle = '#e9c96a'; hud.fillText('EN ÇOK ŞAVT', 44, 334);
  hud.font = `700 32px ${FONT}`;
  best.forEach((p, i) => {
    const y = 394 + i * 52;
    hud.fillStyle = i === 0 ? '#ffd766' : '#eef2f3'; hud.textAlign = 'left';
    hud.fillText(`${i + 1}. ${p.name.length > 13 ? p.name.slice(0, 12) + '…' : p.name}`, 44, y);
    hud.textAlign = 'right'; hud.fillText(String(p.laps), 458, y);
  });
  if (!best.length) { hud.fillStyle = '#8a979d'; hud.fillText('İlk katılan sen ol!', 44, 394); }

  panel(498, 296, 562, 304);
  hud.textAlign = 'left'; hud.font = `800 28px ${FONT}`; hud.fillStyle = '#e9c96a'; hud.fillText('HEDİYE · JETON', 522, 334);
  hud.font = `700 30px ${FONT}`;
  tiers.slice(0, 5).forEach((g, i) => {
    const y = 386 + i * 44;
    hud.textAlign = 'left'; hud.fillStyle = '#eef2f3'; hud.fillText(`${g.icon} ${g.label}`, 522, y);
    hud.textAlign = 'right'; hud.fillStyle = '#ffd766'; hud.fillText(`${g.min}+`, 1036, y);
  });

  const hy = 1410;
  rrect(540 - 350, hy - 40, 700, 80, 40); hud.fillStyle = 'rgba(10,18,24,0.9)'; hud.fill();
  hud.strokeStyle = '#2aa870'; hud.lineWidth = 3; hud.stroke();
  hud.textAlign = 'center'; hud.font = `800 38px ${FONT}`; hud.fillStyle = '#fff';
  hud.fillText(COMMENT_JOIN ? '💬 Yorum yaz, tavafa katıl' : '🎁 Hediye gönder, tavafa katıl', 540, hy + 2);
  hud.font = `600 27px ${FONT}`; hud.fillStyle = '#b9c6cb';
  hud.fillText('❤️ Beğen: hızlan  ·  ➕ Takip et: altın isim', 540, hy + 76);

  live.forEach((m, i) => {                              // bildirimler: bandın alt kenarında, en yenisi en altta
    const age = t - m.t, ty = 1330 - (live.length - 1 - i) * 60 - 26;
    hud.textAlign = 'center'; hud.textBaseline = 'middle';
    hud.globalAlpha = Math.min(1, age * 4) * Math.min(1, (6 - age) * 2); hud.font = `700 31px ${FONT}`;
    const txt = m.text.length > 34 ? m.text.slice(0, 33) + '…' : m.text;
    const tw = Math.min(980, hud.measureText(txt).width + 44);
    rrect(540 - tw / 2, ty - 26, tw, 52, 26); hud.fillStyle = 'rgba(10,18,24,0.88)'; hud.fill();
    hud.fillStyle = m.color; hud.fillText(txt, 540, ty + 1);
    hud.globalAlpha = 1;
  });

  if (bannerOn) {
    const age = t - banner.t;
    hud.globalAlpha = Math.min(1, age * 3) * Math.min(1, (banner.life - age) * 2);
    rrect(90, 640, 900, 120, 26); hud.fillStyle = 'rgba(14,60,44,0.94)'; hud.fill();
    hud.strokeStyle = '#e9c96a'; hud.lineWidth = 3; hud.stroke();
    hud.textAlign = 'center'; hud.textBaseline = 'middle';
    hud.font = `800 42px ${FONT}`; hud.fillStyle = '#ffd766'; hud.fillText(banner.title.slice(0, 22), 540, 680);
    hud.font = `600 28px ${FONT}`; hud.fillStyle = '#fff'; hud.fillText(banner.sub.length > 44 ? banner.sub.slice(0, 43) + '…' : banner.sub, 540, 730);
    hud.globalAlpha = 1;
  }
  const fade = 1 - (t - cutAt) / 0.45;                   // çekim değişiminde kısa kararma
  if (fade > 0) { hud.fillStyle = `rgba(5,8,13,${fade})`; hud.fillRect(0, 0, W, H); }
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
window.__game = { onEvent, players, setOrbit(a, hold = true) { orbit = a; orbitHold = hold; snapCam = true; shot.until = 0; cutAt = -9; }, setCfg(k, v) { CFG[k] = v; }, closeUp(i = 0, secs = 600, near = 1) { orbitHold = false; const p = [...players.values()][i]; if (p) { focusOn(p, now(), secs); snapCam = true; shot.near = near; } return p && p.female; } };
