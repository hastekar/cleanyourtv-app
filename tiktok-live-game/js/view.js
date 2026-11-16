/* Memleket Fethi v2 - gorunum: sahne, kamera, HUD, kopru baglantisi.
   Gerekir: three.js r128 (global), MF.data, MF.models, MF.game. Modul yok. */
(function(){
'use strict';
var MF = window.MF, THREE = window.THREE;
function $(s){ return document.querySelector(s); }
function el(tag, cls, txt){ var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
var statusEl = $('#status');
if (!THREE || !MF || !MF.game || !MF.models){ if (statusEl) statusEl.textContent = '3B kütüphanesi yüklenemedi. İnternet bağlantısını kontrol et.'; return; }

/* ───────────── ayarlar ───────────── */
var Q = new URLSearchParams(location.search);
var CFG = {
  round: +Q.get('tur') || 180,
  ws: Q.get('ws') || '',
  sim: Q.get('sim') !== '0',
  obs: Q.get('obs') === '1' || location.hash === '#obs',
  low: Q.get('kalite') === 'dusuk'
};
var REDUCED = false; try { REDUCED = matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (_) {}
var stage = $('#stage'), labelsEl = $('#labels'), hudTop = $('#hudtop');
if (CFG.obs) stage.classList.add('obs');
var D = MF.data, P = D.P;

/* ───────────── oyun ───────────── */
var storage = {
  get: function(k){ try { return localStorage.getItem(k); } catch (_) { return null; } },
  set: function(k, v){ try { localStorage.setItem(k, v); } catch (_) {} }
};
var g = MF.game.create({ round: CFG.round, storage: storage });
var S = g.state, RANKS = MF.game.RANKS;
var simOn = CFG.sim && !CFG.ws;

/* ───────────── three: sahne ───────────── */
var renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('#gl'), antialias: !CFG.low, alpha: false, powerPreference: 'high-performance' });
} catch (err){ if (statusEl) statusEl.textContent = 'WebGL başlatılamadı.'; return; }
var PR = CFG.low ? 1 : Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(PR);
var FOG = 0xa9c7cf;
renderer.setClearColor(FOG, 1);
var scene = new THREE.Scene();
scene.fog = new THREE.Fog(FOG, 70, 190);
var camera = new THREE.PerspectiveCamera(40, 9 / 16, 1, 320);
var world = new THREE.Group(); scene.add(world);
var galGroup = new THREE.Group(); galGroup.visible = false; scene.add(galGroup);

scene.add(new THREE.HemisphereLight(0xe6f0f6, 0x56683a, .95));
var sun = new THREE.DirectionalLight(0xfff0d0, .85); sun.position.set(-9, 18, 15); scene.add(sun);

/* birlestirici: ayri geometrileri tek koseli-renkli geometriye indirir */
function Merger(){ this.p = []; this.n = []; this.c = []; }
Merger.prototype.add = function(geo, mat, color, jitter){
  var gg = geo.index ? geo.toNonIndexed() : geo.clone();
  gg.applyMatrix4(mat);
  var pa = gg.attributes.position.array, na = gg.attributes.normal.array, col = new THREE.Color(color);
  var k = 1 + (jitter || 0) * (Math.random() - .5);
  for (var i = 0; i < pa.length; i++){ this.p.push(pa[i]); this.n.push(na[i]); }
  for (var j = 0; j < pa.length / 3; j++) this.c.push(Math.min(1, col.r * k), Math.min(1, col.g * k), Math.min(1, col.b * k));
  gg.dispose();
};
Merger.prototype.mesh = function(){
  var gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
  gg.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
  gg.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
  return new THREE.Mesh(gg, new THREE.MeshLambertMaterial({ vertexColors: true }));
};
var _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
function mat(x, y, z, sx, sy, sz, ry){ _e.set(0, ry || 0, 0); _q.setFromEuler(_e); return _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy == null ? sx : sy, sz == null ? sx : sz)); }

var seed = 20240611;
function rnd(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }

var CZ = 7.2;            // kale merkezleri z = -CZ (uzak) ve +CZ (yakin)
var WALL = 3.2, GATEZ = 4.45, LANEZ = CZ - WALL - .3;
(function buildGround(){
  var gr = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshLambertMaterial({ color: 0x5f9340 }));
  gr.rotation.x = -Math.PI / 2; world.add(gr);
  var M = new Merger();
  var flat = new THREE.BoxGeometry(1, 1, 1);
  // yol ve kenarlari
  M.add(flat, mat(0, .03, 0, 5.8, .05, 13.6), 0x9b7b50, .1);
  M.add(flat, mat(-3.05, .035, 0, .6, .05, 13.6), 0x7d6140, .15);
  M.add(flat, mat(3.05, .035, 0, .6, .05, 13.6), 0x7d6140, .15);
  M.add(flat, mat(-1.2, .06, 0, .22, .04, 13), 0x846747, .1);
  M.add(flat, mat(1.2, .06, 0, .22, .04, 13), 0x846747, .1);
  for (var i = 0; i < 14; i++) M.add(flat, mat((rnd() - .5) * 4.6, .07, (rnd() - .5) * 11, .5 + rnd() * .5, .03, .3 + rnd() * .4, rnd() * 3), 0xb39366, .2);
  // kale tabanlari (koyu cim)
  [-CZ, CZ].forEach(function(z){ M.add(flat, mat(0, .025, z, 10.6, .05, 8.8), 0x58853b, .08); });
  // cim yamalari
  var disc = new THREE.CylinderGeometry(1, 1, .02, 9);
  for (var k = 0; k < (CFG.low ? 8 : 16); k++) M.add(disc, mat((rnd() - .5) * 70, .02, (rnd() - .5) * 60, 1.5 + rnd() * 2.5, 1, 1.2 + rnd() * 2, rnd() * 3), rnd() < .6 ? 0x558a38 : 0x679748, .06);
  // agac ve kaya obekleri
  var trunk = new THREE.CylinderGeometry(.13, .18, 1, 5), cone = new THREE.ConeGeometry(1, 1, 7), ball = new THREE.IcosahedronGeometry(1, 0), rock = new THREE.IcosahedronGeometry(1, 0);
  function ok(x, z){ return Math.abs(x) > 7.2 && z < 8.5; }
  function tree(x, z, s){
    if (rnd() < .6){
      M.add(trunk, mat(x, .5 * s, z, s, s, s), 0x6b4a2a, .2);
      M.add(cone, mat(x, 1.55 * s, z, 1.0 * s, 1.9 * s, 1.0 * s, rnd() * 3), 0x2f6a35, .25);
      M.add(cone, mat(x, 2.45 * s, z, .75 * s, 1.5 * s, .75 * s, rnd() * 3), 0x387a3d, .25);
    } else {
      M.add(trunk, mat(x, .55 * s, z, s, 1.1 * s, s), 0x6b4a2a, .2);
      M.add(ball, mat(x, 1.7 * s, z, .95 * s, .85 * s, .95 * s, rnd() * 3), rnd() < .5 ? 0x5c9a3a : 0x6aa845, .25);
    }
  }
  var nCl = CFG.low ? 9 : 20, tries = 0;
  while (nCl > 0 && tries++ < 200){
    var cx = (rnd() - .5) * 60, cz = (rnd() - .5) * 44 - 12;
    if (Math.abs(cx) < 9.5 || cz > 6) continue;
    nCl--;
    var nt = 3 + ((rnd() * (CFG.low ? 3 : 5)) | 0);
    for (var t = 0; t < nt; t++){ var x = cx + (rnd() - .5) * 6, z = cz + (rnd() - .5) * 6; if (ok(x, z)) tree(x, z, .9 + rnd() * .7); }
    if (rnd() < .6){ var rx = cx + (rnd() - .5) * 5, rz = cz + (rnd() - .5) * 5; if (ok(rx, rz)) M.add(rock, mat(rx, .3, rz, .5 + rnd() * .5, .35 + rnd() * .3, .5 + rnd() * .5, rnd() * 3), 0x8a8b86, .2); }
  }
  // yolun iki yaninda birkac kaya ve cali
  for (var q = 0; q < (CFG.low ? 6 : 14); q++){
    var sgn = rnd() < .5 ? -1 : 1, rx2 = sgn * (3.6 + rnd() * 1.6), rz2 = (rnd() - .5) * 10;
    M.add(rock, mat(rx2, .15, rz2, .22 + rnd() * .22, .16 + rnd() * .12, .22 + rnd() * .2, rnd() * 3), 0x8d8e88, .2);
    if (rnd() < .5) M.add(ball, mat(rx2 + sgn * .8, .3, rz2 + .5, .45, .3, .45, rnd() * 3), 0x4f8a38, .2);
  }
  world.add(M.mesh());
})();

/* kaleler */
var castles = [null, null], castleCol = [-1, -1], castleSt = [-1, -1], castleSh = [null, null];
function makeCastle(side){
  var c = MF.models.castle(D.colorHex(S.sides[side].id || 34));
  c.position.set(0, 0, side === 0 ? -CZ : CZ);
  c.rotation.y = side === 0 ? 0 : Math.PI;
  world.add(c); castles[side] = c;
}
makeCastle(0); makeCastle(1);
var CH = castles[0].userData.height || 6;

/* ───────────── efektler: toz, parlama, tas ───────────── */
var spriteTex = (function(){
  var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 2, 32, 32, 31);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.5, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); var t = new THREE.CanvasTexture(c); return t;
})();
var fxPool = [], FXN = CFG.low ? 8 : 14;
for (var fi = 0; fi < FXN; fi++){
  var spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex, transparent: true, depthWrite: false, fog: false }));
  spr.visible = false; world.add(spr); fxPool.push({ s: spr, life: 0, max: 1, vy: 0, grow: 1, base: 1, op: 1 });
}
function fx(kind, x, y, z, size){
  var f = null, i;
  for (i = 0; i < fxPool.length; i++) if (fxPool[i].life <= 0){ f = fxPool[i]; break; }
  if (!f) return;
  var m = f.s.material;
  if (kind === 'flash'){ m.color.setHex(0xffe6a0); m.blending = THREE.AdditiveBlending; f.max = .28; f.vy = 0; f.grow = 1.6; f.op = 1; }
  else { m.color.setHex(0xcdbb9d); m.blending = THREE.NormalBlending; f.max = .9 + Math.random() * .3; f.vy = .9 + Math.random() * .5; f.grow = 2.3; f.op = .75; }
  m.needsUpdate = true;
  f.life = f.max; f.base = size; f.s.position.set(x, y, z); f.s.scale.set(size, size, 1); f.s.visible = true;
}
function updateFx(dt){
  for (var i = 0; i < fxPool.length; i++){
    var f = fxPool[i]; if (f.life <= 0) continue;
    f.life -= dt;
    if (f.life <= 0){ f.s.visible = false; continue; }
    var k = 1 - f.life / f.max;
    f.s.position.y += f.vy * dt; var sc = f.base * (1 + (f.grow - 1) * k); f.s.scale.set(sc, sc, 1);
    f.s.material.opacity = f.op * (1 - k) * (1 - k * .3);
  }
}
var stones = [];
function wallPoint(side){ return side === 0 ? -(CZ - WALL) : (CZ - WALL); }
function impact(side, x, dmg, big){
  var z = wallPoint(side);
  var sz = Math.min(2.4, .8 + dmg * .05);
  fx('flash', x, 1.3, z + (side === 0 ? .25 : -.25), sz);
  fx('dust', x + (Math.random() - .5), .7, z + (side === 0 ? .3 : -.3), sz * 1.1);
  if (big) fx('dust', x + (Math.random() - .5) * 2, 1, z + (side === 0 ? .3 : -.3), sz * 1.4);
  shake(Math.min(.38, .03 + dmg * .008));
}
var lastHitT = [0, 0];
var pendingShot = null;

/* ───────────── kamera ───────────── */
var CAM = { yaw: 0, elev: 0, D: 40, ty: 1.6, dbg: {} };
var shakeAmp = 0, push = null, T = 0, W = 1, H = 1, portrait = true;
function shake(a){ if (!REDUCED) shakeAmp = Math.min(.5, Math.max(shakeAmp, a)); }
function camPose(yaw, Dist, tz, jx, jy){
  var el = CAM.elev, ty = CAM.ty;
  camera.position.set(Dist * Math.sin(yaw) * Math.cos(el) + (jx || 0), ty + Dist * Math.sin(el) + (jy || 0), tz + Dist * Math.cos(yaw) * Math.cos(el));
  camera.lookAt(0, ty, tz);
}
var CORN = [];
(function(){
  [[-1, -CZ, 1], [1, CZ, -1]].forEach(function(c){
    [-4.3, 4.3].forEach(function(x){ [-3.4, GATEZ + .1].forEach(function(lz){ [0, CH].forEach(function(y){ CORN.push(new THREE.Vector3(x, y, c[1] + lz * c[2])); }); }); });
  });
})();
function cssPct(name, def){ try { var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)); return isFinite(v) ? v / 100 : def; } catch (_) { return def; } }
function fit(){
  W = stage.clientWidth || 1; H = stage.clientHeight || 1;
  renderer.setSize(W, H, false);
  var aspect = W / H; portrait = aspect < 1;
  var safeBottom = cssPct('--safe-bottom', .36);
  var bandTop, bandBottom, sideM;
  var hb = hudTop.getBoundingClientRect().bottom;
  if (portrait){ bandTop = Math.max(.24 * H, hb + .004 * H); bandBottom = (1 - safeBottom) * H - .008 * H; sideM = .05; CAM.yaw = Q.get('yaw') != null ? +Q.get('yaw') : .1; CAM.elev = 33 * Math.PI / 180; CAM.D = 42; }
  else { bandTop = Math.max(hb + .015 * H, .2 * H); bandBottom = (1 - safeBottom) * H + .01 * H; sideM = .1; CAM.yaw = .62; CAM.elev = 29 * Math.PI / 180; CAM.D = 46; }
  if (bandBottom - bandTop < .2 * H){ bandTop = .24 * H; bandBottom = .64 * H; }
  camera.clearViewOffset(); camera.fov = 40; camera.aspect = aspect; camera.updateProjectionMatrix();
  camPose(CAM.yaw, CAM.D, 0, 0, 0); camera.updateMatrixWorld(true);
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  var mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9, v = new THREE.Vector3();
  CORN.forEach(function(c){ v.copy(c).applyMatrix4(camera.matrixWorldInverse); var tx = v.x / -v.z, ty = v.y / -v.z; mnx = Math.min(mnx, tx); mxx = Math.max(mxx, tx); mny = Math.min(mny, ty); mxy = Math.max(mxy, ty); });
  var bandN = (bandBottom - bandTop) / H * 2, availW = 2 * (1 - 2 * sideM);
  var t = Math.max((mxy - mny) / bandN, (mxx - mnx) / (aspect * availW));
  camera.fov = 2 * Math.atan(t) * 180 / Math.PI; camera.updateProjectionMatrix();
  var cy = (mxy + mny) / 2 / t, cx = (mxx + mnx) / 2 / (t * aspect);
  var wantY = 1 - (bandTop + bandBottom) / H, wantX = 0;
  var syPx = (wantY - cy) * H / 2, sxPx = (wantX - cx) * W / 2;      // icerigi kaydirilacak piksel (yukari / saga +)
  camera.setViewOffset(W, H, -sxPx, syPx, W, H);
  bandTopPx = bandTop;
  CAM.dbg = { fov: camera.fov, D: CAM.D, bandTop: bandTop / H, bandBottom: bandBottom / H, aspect: aspect };
  // uzak/yakin kale genislik orani
  camera.updateMatrixWorld(true);
  var pr = function(x, y, z){ v.set(x, y, z).project(camera); return v.x; };
  var fw = Math.abs(pr(4.3, 0, -CZ + 2) - pr(-4.3, 0, -CZ + 2)), nw = Math.abs(pr(4.3, 0, CZ - 2) - pr(-4.3, 0, CZ - 2));
  CAM.dbg.ratio = fw / nw;
}

/* ───────────── birlikler ───────────── */
var UNITSCALE = { piyade: 2.0, milis: 1.9, suvari: 1.8, mancinik: 1.5, mehter: 1.7 };
var PRIO = { mehter: 5, mancinik: 4, suvari: 3, piyade: 2, milis: 0 };
var ents = {}, entList = [];
function measure(obj){
  var calls = 0, tris = 0;
  obj.traverse(function(o){
    if (!o.isMesh) return;
    var ge = o.geometry, n = (ge.index ? ge.index.count : ge.attributes.position.count) / 3; tris += n;
    calls += Array.isArray(o.material) ? Math.max(1, ge.groups.length) : 1;
  });
  return { calls: calls, tris: tris };
}
g.on('spawn', function(u){
  var obj;
  try { obj = MF.models.unit(u.type, D.colorHex(S.sides[u.side].id)); } catch (err){ return; }
  var sc = UNITSCALE[u.type] || 1.5; obj.scale.setScalar(sc);
  var m = measure(obj);
  var e = { u: u, obj: obj, calls: m.calls, tris: m.tris, sc: sc, sink: -1, vis: true, born: T };
  ents[u.id] = e; entList.push(e); world.add(obj);
  placeUnit(e, 0);
});
g.on('remove', function(u, reason){
  var e = ents[u.id]; if (!e) return;
  if (reason === 'dead' || reason === 'defeat') { e.sink = 0; e.sinkDelay = reason === 'defeat' ? Math.random() * .8 : 0; }
  else dropEnt(e);
});
function dropEnt(e){
  delete ents[e.u.id]; var i = entList.indexOf(e); if (i >= 0) entList.splice(i, 1);
  world.remove(e.obj);
  e.obj.traverse(function(o){ if (o.isMesh && o.userData && o.userData.own) o.geometry.dispose(); });
}
function placeUnit(e, t){
  var u = e.u, s = u.side;
  var z = s === 0 ? -LANEZ + 2 * LANEZ * u.pos : LANEZ - 2 * LANEZ * u.pos;
  e.obj.position.x = u.lane * 2.4; e.obj.position.z = z;
  e.obj.rotation.y = s === 0 ? 0 : Math.PI;
  e.obj.userData.animate(t + u.id * .37, u.state);
}

var CALL_BUDGET = CFG.low ? 70 : 108, TRI_BUDGET = CFG.low ? 40000 : 62000;
function updateUnits(dt){
  var i, e, list = entList;
  for (i = list.length - 1; i >= 0; i--){
    e = list[i];
    if (e.sink >= 0){
      if (e.sinkDelay > 0){ e.sinkDelay -= dt; continue; }
      e.sink += dt; var k = e.sink / .7; e.obj.position.y = -k * 1.2; e.obj.rotation.x = k * .9;
      if (k >= 1) dropEnt(e);
      continue;
    }
    placeUnit(e, T);
  }
  // cizim butcesi: onemli birlikler once
  var arr = entList.slice().sort(function(a, b){
    var pa = (PRIO[a.u.type] || 0) * 10 + (a.u.user ? 6 : 0) + (a.sink >= 0 ? -20 : 0) + (a.u.id % 7) * .01;
    var pb = (PRIO[b.u.type] || 0) * 10 + (b.u.user ? 6 : 0) + (b.sink >= 0 ? -20 : 0) + (b.u.id % 7) * .01;
    return pb - pa;
  });
  var calls = 0, tris = 0;
  for (i = 0; i < arr.length; i++){
    e = arr[i];
    var fits = calls + e.calls <= CALL_BUDGET && tris + e.tris <= TRI_BUDGET;
    e.obj.visible = fits; if (fits){ calls += e.calls; tris += e.tris; }
  }
}

/* ───────────── olaylar: sahne tarafi ───────────── */
g.on('wallHit', function(side, dmg, by){
  if (by && by.type === 'mancinik' && pendingShot && pendingShot.u === by){ pendingShot.dmg = dmg; pendingShot = null; return; }
  if (T - lastHitT[side] < .35) { shake(Math.min(.2, dmg * .004)); return; }
  lastHitT[side] = T;
  impact(side, by ? by.lane * 2.4 : 0, dmg, false);
});
g.on('shot', function(u, side){
  var e = ents[u.id]; if (!e) return;
  var st = MF.models.stone(); st.scale.setScalar(2.2); world.add(st);
  var from = new THREE.Vector3(e.obj.position.x, 3.2, e.obj.position.z);
  var tx = Math.max(-2.6, Math.min(2.6, e.obj.position.x * .7 + (Math.random() - .5) * 1.5));
  var to = new THREE.Vector3(tx, 1.4, wallPoint(side) + (side === 0 ? .15 : -.15));
  var s = { m: st, from: from, to: to, t: 0, dur: .95, side: side, u: u, dmg: 18 };
  if (stones.length > 6){ var o = stones.shift(); world.remove(o.m); }
  stones.push(s); pendingShot = s; sound('cannonShot');
});
function updateStones(dt){
  for (var i = stones.length - 1; i >= 0; i--){
    var s = stones[i]; s.t += dt; var k = Math.min(1, s.t / s.dur);
    s.m.position.set(s.from.x + (s.to.x - s.from.x) * k, s.from.y + (s.to.y - s.from.y) * k + Math.sin(k * Math.PI) * 5, s.from.z + (s.to.z - s.from.z) * k);
    s.m.rotation.x += dt * 9; s.m.rotation.z += dt * 6;
    if (k >= 1){ impact(s.side, s.to.x, s.dmg || 18, true); sound('thudHit'); world.remove(s.m); stones.splice(i, 1); }
  }
}
g.on('stage', function(side, st){
  push = { side: side, t: 0 };
  var z = wallPoint(side);
  for (var i = 0; i < 4; i++) fx('dust', (i - 1.5) * 1.6, 1.4, z + (side === 0 ? .3 : -.3), 2.2 + Math.random());
  fx('flash', 0, 1.6, z, 3.2); shake(.3);
});

/* ───────────── HUD ───────────── */
var elTip = $('#tip'), elQue = $('#que'), elTimer = $('#timer'), elX2 = $('#x2'), elTug = $('#tug').firstChild, elFeed = $('#feed'), elBanner = $('#banner'), elCard = $('#card');
var sd = [$('#s0'), $('#s1')];
var sdE = sd.map(function(n){ return { chip: n.querySelector('.nm i'), name: n.querySelector('.nm b'), hp: n.querySelector('.hp strong'), bar: n.querySelector('.bar i'), bdg: n.querySelector('.bdg') }; });
var sup = [$('#sup0'), $('#sup1')];
var cache = {};
function setT(node, v, key){ key = key || node; if (node._v !== v){ node._v = v; node.textContent = v; } }
function pad2(n){ return (n < 10 ? '0' : '') + n; }
function plate(id){ return pad2(id) + ' ' + (P[id] ? P[id].name : ''); }
function upper(s){ return String(s).replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase(); }
function fmtN(n){ return Math.ceil(n).toLocaleString('tr-TR'); }
function fmtT(s){ s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + pad2(s % 60); }

function avatar(user, cls){
  var a = el('span', 'av' + (cls ? ' ' + cls : ''));
  var col = D.css(user && user.home ? user.home : (user && user.side != null && S.sides[user.side] ? S.sides[user.side].id : 34));
  a.style.setProperty('--c', col);
  var pic = user && user.pic;
  if (pic && /^https?:\/\//i.test(pic)) a.style.backgroundImage = 'url("' + pic.replace(/["'\\()\s]/g, '') + '")';
  else a.textContent = ((user && user.name) || '?').slice(0, 1).toLocaleUpperCase('tr');
  return a;
}

var TIPS = [
  ['Yoruma ', 'plakanı', ' yaz: kendi ilinin tarafında savaşırsın'],
  ['Beğen: ', 'asker', ' gönder (6 beğeni = 1 bölük)'],
  ['1-9 elmas: ', 'piyade', ' bölüğü hemen çıkar'],
  ['10+ elmas: ', 'şövalye süvarisi', ' (2 kat hızlı)'],
  ['100+ elmas: ', 'mancınık', ' sura taş yağdırır'],
  ['1000+ elmas: ', 'MEHTER', ': 12 sn +%50 hasar'],
  ['', 'Takip', ' et: kendi surlarına kalkan'],
  ['Yoruma ', 'ben', ' yaz: rütbe kartın ekrana gelsin'],
  ['Başka il plakası yaz: ', 'sıradaki rakibe', ' oy ver']
];
var tipI = 0, tipT = 0;
function showTip(){
  var t = TIPS[tipI % TIPS.length]; elTip.textContent = '';
  elTip.appendChild(document.createTextNode(t[0])); elTip.appendChild(el('b', '', t[1])); elTip.appendChild(document.createTextNode(t[2]));
  elTip.classList.remove('sw'); void elTip.offsetWidth; elTip.classList.add('sw');
}

var supKey = ['', ''];
function renderSup(i){
  var s = S.sides[i], key = s.id + '|' + s.top.map(function(t){ return t.user.id + ':' + t.pts + ':' + (t.user.pic ? 1 : 0); }).join(',');
  if (key === supKey[i]) return; supKey[i] = key;
  var box = sup[i]; box.textContent = '';
  var h = el('h4', '', plate(s.id)); box.appendChild(h);
  for (var r = 0; r < 3; r++){
    var t = s.top[r], row = el('div', 'sr' + (t ? '' : ' e'));
    if (t){ row.appendChild(avatar(t.user)); row.appendChild(el('span', '', t.user.name)); row.appendChild(el('em', '', String(t.pts))); }
    else { row.appendChild(el('span', 'av')); row.lastChild.style.opacity = .35; row.appendChild(el('span', '', 'boş')); row.appendChild(el('em', '', '')); }
    box.appendChild(row);
  }
}

function badge(cls, txt){ return el('span', cls, txt); }
var bdgKey = ['', ''];
function renderBadges(i){
  var s = S.sides[i], arr = [];
  if (s.revenge) arr.push(['', 'İNTİKAM ×1.5']);
  if (s.shield > 0) arr.push(['sh', 'KALKAN ' + Math.ceil(s.shield)]);
  if (s.buff > 0) arr.push(['bf', 'MEHTER +%50 ' + Math.ceil(s.buff)]);
  if (S.champion.id === s.id && S.champion.streak >= 2) arr.push(['st', '★ ' + S.champion.streak + ' MAÇ']);
  var key = arr.map(function(a){ return a[1]; }).join('|');
  if (key === bdgKey[i]) return; bdgKey[i] = key;
  var b = sdE[i].bdg; b.textContent = '';
  arr.forEach(function(a){ b.appendChild(badge(a[0], a[1])); });
}

function updateHud(dt){
  var s0 = S.sides[0], s1 = S.sides[1], i;
  for (i = 0; i < 2; i++){
    var s = S.sides[i], e = sdE[i], col = D.css(s.id);
    if (sd[i]._col !== col){ sd[i]._col = col; sd[i].style.setProperty('--sc', col); sup[i].style.setProperty('--sc', col); stage.style.setProperty('--c' + i, col); }
    setT(e.chip, pad2(s.id)); setT(e.name, upper(s.name)); e.name.className = s.name.length > 9 ? 'long' : '';
    setT(e.hp, fmtN(s.hp));
    var pct = s.maxHp > 0 ? Math.max(0, s.hp) / s.maxHp : 0; var tr = 'scaleX(' + pct.toFixed(3) + ')'; if (e.bar._v !== tr){ e.bar._v = tr; e.bar.style.transform = tr; }
    renderBadges(i); renderSup(i);
  }
  var tot = s0.hp + s1.hp, share = tot > 0 ? s0.hp / tot * 100 : 50; var w = share.toFixed(1) + '%'; if (elTug._v !== w){ elTug._v = w; elTug.style.width = w; }
  setT(elTimer, fmtT(S.phase === 'play' ? S.timeLeft : (S.phase === 'intro' ? g.tune.round : 0)));
  var ot = S.phase === 'play' && S.overtime;
  elTimer.classList.toggle('hot', S.phase === 'play' && S.doubleDmg);
  elTimer.classList.toggle('ot', ot);
  var x2 = S.phase === 'play' && (S.doubleDmg || ot); setT(elX2, ot ? 'UZATMA' : '×2 HASAR'); if (elX2.hidden === x2) elX2.hidden = !x2;
  // ipucu + sirada
  tipT += dt; if (tipT >= 4 || !elTip._i){ tipT = 0; elTip._i = 1; tipI++; showTip(); }
  var q = S.queue[0], qk = q ? q.id + ':' + q.votes : '';
  if (elQue._k !== qk){
    elQue._k = qk; elQue.textContent = '';
    elQue.appendChild(document.createTextNode('Sıradaki rakip: '));
    if (q){ elQue.appendChild(el('b', '', plate(q.id))); elQue.appendChild(document.createTextNode(' · ' + q.votes + ' oy')); }
    else elQue.appendChild(el('b', '', 'oyla! Yoruma plaka yaz'));
  }
  // giris / tören
  var intro = S.phase === 'intro';
  if ($('#intro').hidden === intro) $('#intro').hidden = !intro;
  if (intro){
    var ic = $('#icd'), n = String(Math.max(1, Math.ceil(g.tune.intro - S.phaseT))); setT(ic, n);
    var a0 = $('#i0'), a1 = $('#i1'), k0 = s0.id + '|' + s1.id;
    if (a0._k !== k0){ a0._k = k0;
      [a0, a1].forEach(function(a, ix){ var s = S.sides[ix]; a.textContent = ''; a.style.setProperty('--sc', D.css(s.id)); a.style.color = D.css(s.id);
        a.appendChild(el('i', '', pad2(s.id))); a.appendChild(document.createTextNode(upper(s.name))); }); }
  }
  var endShow = S.phase === 'end' && endBuilt; if ($('#endc').hidden === endShow) $('#endc').hidden = !endShow;
  stage.classList.toggle('ph-intro', intro); stage.classList.toggle('ph-end', endShow);
}

/* afis */
var bq = [], bBusy = false;
function pump(){
  if (bBusy || !bq.length) return;
  var b = bq.shift(); bBusy = true;
  elBanner.textContent = '';
  var d = el('div', '', b.big); if (b.small) d.appendChild(el('small', '', b.small));
  if (b.side != null && S.sides[b.side]) d.style.setProperty('--c', D.css(S.sides[b.side].id));
  elBanner.appendChild(d);
  setTimeout(function(){ elBanner.textContent = ''; bBusy = false; pump(); }, 2600);
}
g.on('banner', function(b){
  if (/^SIRADAKİ KUŞATMA/.test(b.big)) return;     // giris panosu gosteriyor
  bq.push(b); if (bq.length > 3) bq.shift(); pump();
});

/* akis: en cok 3 satir */
g.on('feed', function(f){
  var d = el('div', 'fi', f.text);
  if (f.side != null && S.sides[f.side]) d.style.setProperty('--c', D.css(S.sides[f.side].id));
  elFeed.appendChild(d);
  while (elFeed.children.length > 3) elFeed.removeChild(elFeed.firstChild);
  setTimeout(function(){ d.classList.add('out'); setTimeout(function(){ if (d.parentNode) d.parentNode.removeChild(d); }, 650); }, 8000);
});

/* rutbe karti */
var cq = [], cBusy = false;
function cardPump(){
  if (cBusy || !cq.length) return;
  var c = cq.shift(), u = c.user; cBusy = true;
  elCard.textContent = '';
  elCard.style.setProperty('--c', D.css(u.home || (u.side != null ? S.sides[u.side].id : 34)));
  elCard.appendChild(avatar(u));
  elCard.appendChild(el('h3', '', u.name));
  elCard.appendChild(el('div', 'r', RANKS[u.rank || 0] || ''));
  elCard.appendChild(el('p', '', (u.home && P[u.home] ? plate(u.home) : 'plakanı yaz') + ' · ' + (u.life || 0) + ' puan'));
  elCard.appendChild(el('p', 'w', c.why || ''));
  elCard.hidden = false; elCard.style.animation = 'none'; void elCard.offsetWidth; elCard.style.animation = '';
  setTimeout(function(){ elCard.hidden = true; cBusy = false; cardPump(); }, 3500);
}
g.on('card', function(c){ cq.push(c); if (cq.length > 3) cq.shift(); cardPump(); });

/* tören */
var endBuilt = false;
g.on('matchEnd', function(r){
  var w = r.winner, s = S.sides[w], box = $('#endc'); box.textContent = ''; box.style.setProperty('--sc', D.css(s.id));
  box.appendChild(el('h2', '', 'KUŞATMAYI KAZANAN'));
  box.appendChild(el('div', 'w', pad2(s.id) + ' ' + upper(s.name)));
  if (r.fatih){
    var fa = el('div', 'fa'); fa.appendChild(avatar(r.fatih));
    var tx = el('div'); tx.appendChild(el('small', '', 'FATİH')); tx.appendChild(el('b', '', r.fatih.name)); fa.appendChild(tx); box.appendChild(fa);
  }
  var ol = el('ol');
  s.top.forEach(function(t, i){ var li = el('li'); li.appendChild(el('b', '', String(i + 1))); li.appendChild(avatar(t.user)); li.appendChild(el('span', '', t.user.name)); li.appendChild(el('em', '', t.pts + ' puan')); ol.appendChild(li); });
  box.appendChild(ol);
  var c = S.champion;
  box.appendChild(el('p', '', c.id === s.id && c.streak >= 2 ? '★ ' + s.name + ' ' + c.streak + ' maçtır yenilmiyor' : (c.streak === 1 ? s.name + ' şampiyonu devirdi!' : s.name + ' şampiyon')));
  box.appendChild(el('p', 's', 'Sıradaki kuşatma birazdan: yoruma plaka yaz, rakibe oy ver'));
  endBuilt = true; paintMap();
});
g.on('phase', function(p){
  if (p === 'intro'){
    endBuilt = false; paintMap();
    for (var i = 0; i < 2; i++){ var id = S.sides[i].id; if (castleCol[i] !== id){ castleCol[i] = id; castles[i].userData.setColor(D.colorHex(id)); } }
  }
});

/* konusma balonlari */
var bubs = [];
g.on('bubble', function(b){
  var d = el('div', 'bub', b.text); labelsEl.appendChild(d);
  bubs.push({ el: d, user: b.user, t: 0 });
  while (bubs.length > 4){ var o = bubs.shift(); if (o.el.parentNode) o.el.parentNode.removeChild(o.el); }
});

/* isim etiketleri: en cok 14, kullanicili birlikler */
var tagPool = [], tagMap = {}, tagT = 0, TAGMAX = 14, FULLTAGS = 5;
function getTag(){
  var t = tagPool.pop();
  if (!t){ t = el('div', 'tag'); t._av = null; }
  return t;
}
function buildTag(e){
  var u = e.u.user, t = getTag(); t.textContent = '';
  t.appendChild(avatar(u)); t.appendChild(el('span', '', u.name)); t.appendChild(el('small', '', RANKS[u.rank || 0] || ''));
  t._off = 1; t.style.visibility = 'hidden'; labelsEl.appendChild(t); return t;
}
function syncTags(){
  var cand = [], seenU = {};
  for (var i = 0; i < entList.length; i++){ var e = entList[i]; if (e.u.user && e.sink < 0 && e.obj.visible) cand.push(e); }
  cand.sort(function(a, b){ return b.u.born - a.u.born; });
  var keep = {}, n = 0;
  for (var c = 0; c < cand.length && n < TAGMAX; c++){ var uid = cand[c].u.user.id; if (seenU[uid]) continue; seenU[uid] = 1; keep[cand[c].u.id] = cand[c]; cand[c].full = n < FULLTAGS; n++; }
  for (var id in tagMap) if (!keep[id]){ var t = tagMap[id]; if (t.parentNode) t.parentNode.removeChild(t); tagPool.push(t); delete tagMap[id]; }
  for (var id2 in keep){ if (!tagMap[id2]) tagMap[id2] = buildTag(keep[id2]); var tg = tagMap[id2]; if (tg._full !== keep[id2].full){ tg._full = keep[id2].full; tg.classList.toggle('mini', !tg._full); tg._w = 0; } }
}
var V = new THREE.Vector3();
function place(node, x, y, z){
  V.set(x, y, z).project(camera);
  var off = V.z > 1 || Math.abs(V.x) > 1.1 || Math.abs(V.y) > 1.1;
  if (off){ if (!node._off){ node._off = 1; node.style.visibility = 'hidden'; } return; }
  if (node._off){ node._off = 0; node.style.visibility = ''; }
  node.style.transform = 'translate(' + ((V.x * .5 + .5) * W).toFixed(1) + 'px,' + ((-V.y * .5 + .5) * H).toFixed(1) + 'px) translate(-50%,-100%)';
}
var placed = [], bandTopPx = 0;
function projXY(x, y, z){ V.set(x, y, z).project(camera); return V.z > 1 || Math.abs(V.x) > 1.1 || Math.abs(V.y) > 1.1 ? null : [(V.x * .5 + .5) * W, (-V.y * .5 + .5) * H]; }
function putTag(node, xy, avoid){
  if (!xy){ if (!node._off){ node._off = 1; node.style.visibility = 'hidden'; } return; }
  if (node._off){ node._off = 0; node.style.visibility = ''; }
  var x = xy[0], y = xy[1];
  if (avoid){
    var w = node._w || (node._w = node.offsetWidth || 60), h = node._h || (node._h = node.offsetHeight || 20);
    for (var tries = 0; tries < 8; tries++){
      var hit = false;
      for (var i = 0; i < placed.length; i++){ var r = placed[i];
        if (Math.abs(x - r[0]) < (w + r[2]) / 2 && y > r[1] - r[3] - 1 && y - h < r[1] + 1){ y = r[1] - r[3] - 2; hit = true; break; } }
      if (!hit) break;
    }
    if (y - h < bandTopPx){ if (!node._off){ node._off = 1; node.style.visibility = 'hidden'; } return; }
    placed.push([x, y, w, h]);
  }
  node.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-100%)';
}
function updateLabels(dt){
  tagT -= dt; if (tagT <= 0){ tagT = .3; syncTags(); }
  placed.length = 0;
  var order = [];
  for (var id in tagMap){ var e = ents[id]; if (e) order.push(e); }
  order.sort(function(a, b){ return b.obj.position.z * (b.u.side ? 1 : 1) - a.obj.position.z; });
  // ekranda alttakiler (kameraya yakin, buyuk z) once yerlesir
  for (var k = 0; k < order.length; k++){
    var en = order[k], o = en.obj;
    putTag(tagMap[en.u.id], projXY(o.position.x, o.position.y + (o.userData.height || 1.3) * en.sc + .15, o.position.z), true);
  }
  for (var i = bubs.length - 1; i >= 0; i--){
    var b = bubs[i]; b.t += dt;
    if (b.t > 3.6){ if (b.el.parentNode) b.el.parentNode.removeChild(b.el); bubs.splice(i, 1); continue; }
    var tgt = null;
    for (var j = entList.length - 1; j >= 0; j--) if (entList[j].u.user === b.user && entList[j].sink < 0){ tgt = entList[j]; break; }
    var xy;
    if (tgt) xy = projXY(tgt.obj.position.x, (tgt.obj.userData.height || 1.3) * tgt.sc + .9, tgt.obj.position.z);
    else { var sd2 = b.user.side == null ? 1 : b.user.side; xy = projXY(0, 3.2, sd2 === 0 ? -(CZ - GATEZ) : (CZ - GATEZ)); }
    putTag(b.el, xy, false);
  }
}

/* fetih haritasi */
var mapCv = $('#mapcv'), mapCtx = mapCv.getContext('2d'), mapImg = mapCtx.createImageData(330, 150);
function paintMap(){
  var gr = D.grid, cell = gr.cell, px = mapImg.data, ow = S.owners, i;
  var colCache = {};
  for (i = 0; i < cell.length; i++){
    var c = cell[i], o = i * 4;
    if (c < 0){ px[o] = 10; px[o + 1] = 30; px[o + 2] = 42; px[o + 3] = 120; continue; }
    var id = D.IL[c].id, own = ow[id], hex = own ? D.colorHex(own) : 0x56666b;
    var cc = colCache[hex] || (colCache[hex] = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]);
    px[o] = cc[0]; px[o + 1] = cc[1]; px[o + 2] = cc[2]; px[o + 3] = 255;
  }
  mapCtx.putImageData(mapImg, 0, 0);
  for (var s = 0; s < 2; s++){
    var p = P[S.sides[s].id]; if (!p) continue;
    var x = (p.x + gr.pw / 2) / gr.pw * gr.W, y = (p.z + gr.ph / 2) / gr.ph * gr.H;
    mapCtx.beginPath(); mapCtx.arc(x, y, 8, 0, 6.2832); mapCtx.fillStyle = '#fff'; mapCtx.fill();
    mapCtx.beginPath(); mapCtx.arc(x, y, 5, 0, 6.2832); mapCtx.fillStyle = D.css(S.sides[s].id); mapCtx.fill();
  }
}

/* ───────────── ses ───────────── */
var soundOn = false, actx = null;
function thump(f, len, vol, delay){
  if (!soundOn) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    var o = actx.createOscillator(), gn = actx.createGain(), t = actx.currentTime + (delay || 0);
    o.frequency.setValueAtTime(f * 2, t); o.frequency.exponentialRampToValueAtTime(f, t + len);
    gn.gain.setValueAtTime(vol || .5, t); gn.gain.exponentialRampToValueAtTime(.001, t + len + .15);
    o.connect(gn); gn.connect(actx.destination); o.start(t); o.stop(t + len + .2);
  } catch (_) {}
}
function say(txt){ if (!soundOn || !window.speechSynthesis) return; try { var u = new SpeechSynthesisUtterance(txt); u.lang = 'tr-TR'; speechSynthesis.speak(u); } catch (_) {} }
var SFX = {
  intro: [[90, .25, .5, 0], [90, .25, .5, .35]], start: [[80, .2, .6, 0], [80, .2, .6, .25], [60, .4, .7, .5]],
  victory: [[220, .25, .5, 0], [330, .25, .5, .2], [440, .4, .5, .4]], rankup: [[440, .1, .3, 0], [660, .15, .3, .12]],
  combo: [[160, .08, .4, 0], [200, .08, .4, .1]], cannon: [[55, .4, .7, 0]], cannonShot: [[70, .25, .5, 0]], thudHit: [[45, .3, .6, 0]],
  horse: [[140, .06, .35, 0], [140, .06, .35, .15]], shield: [[500, .15, .3, 0], [700, .2, .3, .1]],
  mehter: [[60, .3, .7, 0], [90, .15, .5, .3], [90, .15, .5, .45], [60, .3, .7, .6]],
  stage: [[50, .5, .8, 0]], last30: [[100, .15, .5, 0], [100, .15, .5, .3], [100, .15, .5, .6]], revenge: [[75, .3, .6, 0], [55, .4, .6, .25]]
};
function sound(n){ var a = SFX[n]; if (!a) return; for (var i = 0; i < a.length; i++) thump(a[i][0], a[i][1], a[i][2], a[i][3]); }
g.on('sfx', sound);
g.on('say', say);

/* ───────────── galeri ───────────── */
var galOn = false, galI = 0, galObj = null;
function galShow(i){
  var cat = MF.models.catalog; galI = (i + cat.length) % cat.length;
  if (galObj){ galGroup.remove(galObj); if (galObj.userData.dispose) galObj.userData.dispose(); galObj = null; }
  var e = cat[galI]; galObj = e.make(); galGroup.add(galObj);
  var bb = new THREE.Box3().setFromObject(galObj), sp = bb.getBoundingSphere(new THREE.Sphere());
  galObj.position.sub(new THREE.Vector3(sp.center.x, 0, sp.center.z)); sp.center.x = 0; sp.center.z = 0;
  var vf = 36 * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect), dist = sp.radius / Math.sin(Math.min(vf, hf) / 2) * 1.05;
  camera.fov = 36; camera.updateProjectionMatrix();
  camera.position.set(dist * .45, sp.center.y + dist * .38, dist * .8); camera.lookAt(0, sp.center.y, 0);
  $('#gal-name').textContent = e.name; $('#gal-trig').textContent = e.trigger; $('#gal-desc').textContent = e.desc;
}
function galToggle(on){
  galOn = on; stage.classList.toggle('gal', on); $('#gal').hidden = !on; galGroup.visible = on; world.visible = !on;
  if (on){ camera.clearViewOffset(); galShow(galI); } else { if (galObj){ galGroup.remove(galObj); if (galObj.userData.dispose) galObj.userData.dispose(); galObj = null; } fit(); }
}

/* ───────────── test dugmeleri, demo, baglanti ───────────── */
var TESTER = { uid: 'yayinci', name: 'Yayıncı', pic: '' };
function testEvent(k){
  var plateIn = parseInt($('#test-plate').value, 10);
  if (plateIn >= 1 && plateIn <= 81) g.onEvent({ type: 'chat', uid: TESTER.uid, name: TESTER.name, comment: String(plateIn) });
  var e = { uid: TESTER.uid, name: TESTER.name, pic: '' };
  if (k === 'like20'){ e.type = 'like'; e.count = 20; }
  else if (k === 'follow') e.type = 'follow';
  else { e.type = 'gift'; e.diamonds = +k.slice(1); e.giftName = 'Test'; e.repeat = 1; }
  g.onEvent(e);
}
Array.prototype.forEach.call(document.querySelectorAll('[data-t]'), function(b){ b.onclick = function(){ testEvent(b.getAttribute('data-t')); }; });
var bSim = $('#b-sim'); bSim.setAttribute('aria-pressed', String(simOn));
bSim.onclick = function(){ simOn = !simOn; bSim.setAttribute('aria-pressed', String(simOn)); statusEl.textContent = simOn ? 'Demo modu' : (wsOk ? 'Canlı yayına bağlı' : 'Demo kapalı'); };
$('#b-snd').onclick = function(e){ soundOn = !soundOn; e.currentTarget.setAttribute('aria-pressed', String(soundOn)); if (soundOn) thump(80, .15, .5); };
$('#b-gal').onclick = function(){ galToggle(!galOn); };
$('#gal-close').onclick = function(){ galToggle(false); };
$('#gal-prev').onclick = function(){ galShow(galI - 1); };
$('#gal-next').onclick = function(){ galShow(galI + 1); };
document.addEventListener('keydown', function(ev){
  if (ev.key === 'h' && !/INPUT/.test((ev.target || {}).tagName || '')) stage.classList.toggle('obs');
  else if (ev.key === 'Escape' && galOn) galToggle(false);
});

var ws = null, wsTry = 0, wsOk = false;
function connect(){
  if (!CFG.ws) return; statusEl.textContent = 'Bağlanıyor…';
  try { ws = new WebSocket(CFG.ws); } catch (_) { return retry(); }
  ws.onopen = function(){ wsTry = 0; wsOk = true; simOn = false; bSim.setAttribute('aria-pressed', 'false'); statusEl.textContent = 'Canlı yayına bağlı'; };
  ws.onmessage = function(m){ try { g.onEvent(JSON.parse(m.data)); } catch (_) {} };
  ws.onclose = function(){ wsOk = false; retry(); };
  ws.onerror = function(){ try { ws.close(); } catch (_) {} };
}
function retry(){
  wsTry++; var wait = Math.min(30, Math.pow(2, Math.min(wsTry, 5))) + Math.random();
  statusEl.textContent = 'Bağlantı koptu, ' + Math.round(wait) + ' sn sonra yeniden denenecek';
  setTimeout(connect, wait * 1000);
}
if (CFG.ws) connect(); else statusEl.textContent = simOn ? 'Demo modu' : 'Demo kapalı';

/* ───────────── dongu ───────────── */
var last = 0, botAcc = 0, hudAcc = 0, fitDone = 0;
function frame(now){
  requestAnimationFrame(frame);
  var dt = last ? Math.min(1, (now - last) / 1000) : .016; last = now;
  T += dt;
  var left = dt; while (left > 0){ var sdt = Math.min(.05, left); g.step(sdt); left -= sdt; }
  if (simOn){ botAcc += dt; var n = 0; while (botAcc >= .2 && n++ < 6){ botAcc -= .2; g.botTick(); } if (botAcc > 1) botAcc = 0; }
  if (!galOn){
    updateUnits(dt); updateStones(dt); updateFx(dt);
    // kale: hasar, kalkan, bayrak
    for (var i = 0; i < 2; i++){
      var s = S.sides[i], c = castles[i];
      c.userData.setDamage(s.maxHp > 0 ? Math.max(0, s.hp) / s.maxHp : 0);
      var sh = s.shield > 0; if (castleSh[i] !== sh){ castleSh[i] = sh; c.userData.setShield(sh); }
      if (castleCol[i] !== s.id){ castleCol[i] = s.id; c.userData.setColor(D.colorHex(s.id)); }
      c.userData.tick(T);
    }
    // kamera
    var yaw = CAM.yaw + (REDUCED ? 0 : Math.sin(T * .35) * .022), Dist = CAM.D, tz = 0, jx = 0, jy = 0;
    if (push){
      push.t += dt; var k = push.t / 2; if (k >= 1) push = null;
      else { var p = Math.sin(Math.min(1, k) * Math.PI); p = Math.min(1, p * 1.6); Dist *= 1 - .2 * p; tz = (push.side === 0 ? -1 : 1) * 4.2 * p; }
    }
    if (shakeAmp > .002){ jx = (Math.random() - .5) * shakeAmp; jy = (Math.random() - .5) * shakeAmp; shakeAmp *= Math.exp(-dt * 6); } else shakeAmp = 0;
    camPose(yaw, Dist, tz, jx, jy); camera.updateMatrixWorld(true);
    updateLabels(dt);
  } else {
    if (galObj){ galObj.rotation.y += dt * .6; if (galObj.userData.tick) galObj.userData.tick(T); if (galObj.userData.animate) galObj.userData.animate(T, 'walk'); }
  }
  hudAcc += dt; if (hudAcc >= .05){ updateHud(hudAcc); hudAcc = 0; }
  if (fitDone < 3 && T > .3 + fitDone * .8){ fitDone++; if (!galOn) fit(); }
  renderer.render(scene, camera);
}

window.addEventListener('resize', function(){ if (!galOn) fit(); else { renderer.setSize(stage.clientWidth, stage.clientHeight, false); camera.aspect = stage.clientWidth / stage.clientHeight; camera.updateProjectionMatrix(); galShow(galI); } });
try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ if (!galOn) fit(); }); } catch (_) {}
fit(); paintMap();
requestAnimationFrame(frame);

window.MemleketFethi = {
  onEvent: function(e){ g.onEvent(e); },
  state: function(){ return g.state; },
  info: function(){ return renderer.info.render; },
  game: g,
  debug: function(){ return { cam: CAM.dbg, units: entList.length, visible: entList.filter(function(e){ return e.obj.visible; }).length, tags: Object.keys(tagMap).length }; }
};
})();
