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
  low: Q.get('kalite') === 'dusuk',
  cavus: (function(){ var n = parseInt(Q.get('cavus'), 10); return n >= 1 && n <= 6 ? n : 0; })(),   // OBS adresinde ses telaffuzu: &cavus=N
  ses: Q.get('ses') === '1' || (Q.get('ses') !== '0' && (Q.get('obs') === '1' || location.hash === '#obs'))   // OBS'te arac cubugu gizli oldugundan ses kendiliginden acilir
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
var FOG = 0x3a5256;
renderer.setClearColor(FOG, 1);
var scene = new THREE.Scene();
scene.fog = new THREE.Fog(FOG, 60, 170);
var camera = new THREE.PerspectiveCamera(40, 9 / 16, 4, 260);   // yakin duzlem buyuk: derinlik hassasiyeti (titreme/z-fighting) icin
var world = new THREE.Group(); scene.add(world);
var galGroup = new THREE.Group(); galGroup.visible = false; scene.add(galGroup);

scene.add(new THREE.HemisphereLight(0xc4d4dc, 0x3c4a34, .7));
var sun = new THREE.DirectionalLight(0xffdca8, .9); sun.position.set(-10, 20, 14); scene.add(sun);

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
function mat(x, y, z, sx, sy, sz, ry, rx, rz){ _e.set(rx || 0, ry || 0, rz || 0); _q.setFromEuler(_e); return _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy == null ? sx : sy, sz == null ? sx : sz)); }

var seed = 20240611;
function rnd(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }

var CZ = 15;             // kale merkezleri z = -CZ (uzak) ve +CZ (yakin)
var WALL = 3.2, GATEZ = 4.45, ARMY = 10.2, LANEX = 4.7;   // ordu z = -ARMY..+ARMY (iki ordu ayni dunya noktasinda bulusur)
(function buildGround(){
  var gr = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshLambertMaterial({ color: 0x2f4b2d }));
  gr.rotation.x = -Math.PI / 2; world.add(gr);
  var M = new Merger();
  var flat = new THREE.BoxGeometry(1, 1, 1), disc = new THREE.CylinderGeometry(1, 1, .02, 9);
  var trunk = new THREE.CylinderGeometry(.13, .18, 1, 5), cone = new THREE.ConeGeometry(1, 1, 7), ball = new THREE.IcosahedronGeometry(1, 0), stake = new THREE.ConeGeometry(.09, 1.5, 4);
  var LOW = CFG.low;
  // cignenmis cimen seridi (alan genisligi 14 + kenar)
  M.add(flat, mat(0, .015, 0, 16, .03, 36), 0x3a4a2c, .06);            // ust .03
  for (var k = 0; k < (LOW ? 30 : 70); k++) M.add(disc, mat((rnd() - .5) * 15, .05, (rnd() - .5) * 34, .8 + rnd() * 1.8, 1, .6 + rnd() * 1.4, rnd() * 3), rnd() < .5 ? 0x4b5532 : 0x2f4129, .12);
  // genis toprak yol
  M.add(flat, mat(0, .095, 0, 9.4, .05, 33), 0x7f6845, .08);          // yol: ust .12
  M.add(flat, mat(-4.9, .125, 0, 1.0, .05, 33), 0x5e4a33, .12);     // yol kenari: ust .15
  M.add(flat, mat(4.9, .125, 0, 1.0, .05, 33), 0x5e4a33, .12);
  for (var r = -2; r <= 2; r++) if (r) M.add(flat, mat(r * 1.5, .16, 0, .2, .04, 30), 0x6a5438, .1);     // izler: ust .18
  for (var i = 0; i < (LOW ? 20 : 46); i++) M.add(flat, mat((rnd() - .5) * 8.6, .195, (rnd() - .5) * 30, .6 + rnd() * .9, .03, .3 + rnd() * .6, rnd() * 3), rnd() < .5 ? 0x93794f : 0x6c5638, .2);
  // kale tabanlari, kapi yollari ve arkadan inen patikalar
  [-CZ, CZ].forEach(function(z){ M.add(flat, mat(0, .065, z, 11, .05, 9), 0x2a4328, .08); M.add(flat, mat(0, .125, z + (z < 0 ? 4.2 : -4.2), 3.2, .05, 5), 0x7f6845, .08); });
  M.add(flat, mat(0, .035, CZ + 30, 3.2, .05, 50), 0x6d5a3d, .12);
  M.add(flat, mat(0, .035, -CZ - 30, 3.2, .05, 50), 0x6d5a3d, .12);
  // kazikli barikatlar (yol kenarlarinda, savasin onunu kapatmadan)
  function barricade(x, z, ry){
    for (var q = 0; q < 5; q++){ var ox = (q - 2) * .55; M.add(stake, mat(x + Math.cos(ry) * ox, .62, z - Math.sin(ry) * ox, 1, 1, 1, ry, -.55), 0x6b4a2a, .25); }
    M.add(flat, mat(x, .45, z, 2.9, .1, .12, ry), 0x4a3320, .2);
  }
  barricade(-6.2, -5.5, .4); barricade(6.3, 5.8, -.4); barricade(6.4, -2, 1.2); barricade(-6.4, 3.2, -1.2); barricade(-6.1, 8, .3); barricade(6.2, -8.5, -.3);
  // kirik araba
  M.add(flat, mat(-5.9, .55, 8.6 - 7.2, 1.7, .45, .95, .5, 0, .18), 0x4a3320, .2);
  M.add(flat, mat(-5.9, .85, 8.6 - 7.2, 1.5, .25, .8, .5, 0, .18), 0x5e4a33, .2);
  var wheel = new THREE.CylinderGeometry(.42, .42, .1, 8);
  M.add(wheel, mat(-6.4, .42, 1.1, 1, 1, 1, .5, 0, Math.PI / 2), 0x3a2a1a, .2);
  M.add(wheel, mat(-5.1, .3, 1.7, 1, 1, 1, 1.9, .5, Math.PI / 2 + .6), 0x3a2a1a, .2);
  // kayalar ve calilar: yalnizca alanin kenarlarinda
  var rock = new THREE.IcosahedronGeometry(1, 0);
  for (var q = 0; q < (LOW ? 8 : 22); q++){
    var sgn = rnd() < .5 ? -1 : 1, rx = sgn * (6.9 + rnd() * 2.2), rz = (rnd() - .5) * 38;
    if (rnd() < .55) M.add(rock, mat(rx, .25, rz, .35 + rnd() * .5, .25 + rnd() * .3, .35 + rnd() * .5, rnd() * 3), 0x70726e, .2);
    else M.add(ball, mat(rx, .3, rz, .6 + rnd() * .5, .4 + rnd() * .2, .6 + rnd() * .5, rnd() * 3), rnd() < .5 ? 0x35603a : 0x2c5232, .25);
  }
  // agac obekleri: alan disinda
  function tree(x, z, sc){
    if (rnd() < .65){
      M.add(trunk, mat(x, .5 * sc, z, sc, sc, sc), 0x4a3320, .2);
      M.add(cone, mat(x, 1.55 * sc, z, 1.0 * sc, 1.9 * sc, 1.0 * sc, rnd() * 3), 0x1c4332, .25);
      M.add(cone, mat(x, 2.45 * sc, z, .75 * sc, 1.5 * sc, .75 * sc, rnd() * 3), 0x24523a, .25);
    } else {
      M.add(trunk, mat(x, .55 * sc, z, sc, 1.1 * sc, sc), 0x4a3320, .2);
      M.add(ball, mat(x, 1.7 * sc, z, .95 * sc, .85 * sc, .95 * sc, rnd() * 3), rnd() < .5 ? 0x3b6a35 : 0x477a3c, .25);
    }
  }
  var nCl = LOW ? 12 : 30, tries = 0;
  while (nCl > 0 && tries++ < 300){
    var cx = (rnd() < .5 ? -1 : 1) * (10.5 + rnd() * 22), cz = (rnd() - .5) * 90;
    nCl--;
    var nt = 3 + ((rnd() * (LOW ? 3 : 5)) | 0);
    for (var t = 0; t < nt; t++){ var x = cx + (rnd() - .5) * 6, z = cz + (rnd() - .5) * 6; if (Math.abs(x) > 9) tree(x, z, .9 + rnd() * .7); }
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

/* ───────────── efektler: tek cizim cagrisi ile parcacik sistemleri ───────────── */
var PVS = 'attribute vec3 aCol; attribute vec2 sa; uniform float uScale; varying float vA; varying vec3 vC;\nvoid main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = max(sa.x * uScale / -mv.z, 0.0); vA = sa.y; vC = aCol; }';
var PFS = 'varying float vA; varying vec3 vC;\nvoid main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.12, d) * vA; if (a < 0.01) discard; gl_FragColor = vec4(vC, a); }';
function PSys(n, add){
  this.n = n; this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.sa = new Float32Array(n * 2); this.vel = new Float32Array(n * 3);
  this.life = new Float32Array(n); this.max = new Float32Array(n); this.s0 = new Float32Array(n); this.s1 = new Float32Array(n); this.a0 = new Float32Array(n); this.gr = new Float32Array(n); this.i = 0;
  var geo = new THREE.BufferGeometry();
  this.aP = new THREE.BufferAttribute(this.pos, 3); this.aC = new THREE.BufferAttribute(this.col, 3); this.aS = new THREE.BufferAttribute(this.sa, 2);
  this.aP.setUsage(THREE.DynamicDrawUsage); this.aS.setUsage(THREE.DynamicDrawUsage); this.aC.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', this.aP); geo.setAttribute('aCol', this.aC); geo.setAttribute('sa', this.aS);
  this.mat = new THREE.ShaderMaterial({ uniforms: { uScale: { value: 100 } }, vertexShader: PVS, fragmentShader: PFS, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending });
  this.pts = new THREE.Points(geo, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = 4; world.add(this.pts);
}
PSys.prototype.emit = function(x, y, z, vx, vy, vz, life, s0, s1, a0, hex, grav){
  var i = this.i++ % this.n, k = i * 3;
  this.pos[k] = x; this.pos[k + 1] = y; this.pos[k + 2] = z; this.vel[k] = vx; this.vel[k + 1] = vy; this.vel[k + 2] = vz;
  this.life[i] = this.max[i] = life; this.s0[i] = s0; this.s1[i] = s1; this.a0[i] = a0; this.gr[i] = grav || 0;
  this.col[k] = (hex >> 16 & 255) / 255; this.col[k + 1] = (hex >> 8 & 255) / 255; this.col[k + 2] = (hex & 255) / 255;
};
PSys.prototype.update = function(dt){
  var n = this.n, damp = Math.exp(-dt * 1.2);
  for (var i = 0; i < n; i++){
    var l = this.life[i];
    if (l <= 0){ this.sa[i * 2 + 1] = 0; continue; }
    l -= dt; this.life[i] = l; var k3 = i * 3;
    if (l <= 0){ this.sa[i * 2 + 1] = 0; this.sa[i * 2] = 0; continue; }
    this.vel[k3 + 1] -= this.gr[i] * dt;
    this.pos[k3] += this.vel[k3] * dt; this.pos[k3 + 1] += this.vel[k3 + 1] * dt; this.pos[k3 + 2] += this.vel[k3 + 2] * dt;
    if (this.pos[k3 + 1] < .05 && this.gr[i] > 0){ this.pos[k3 + 1] = .05; this.vel[k3 + 1] *= -.2; this.vel[k3] *= .6; this.vel[k3 + 2] *= .6; }
    this.vel[k3] *= damp; this.vel[k3 + 2] *= damp; if (!this.gr[i]) this.vel[k3 + 1] *= damp;
    var k = 1 - l / this.max[i];
    this.sa[i * 2] = this.s0[i] + (this.s1[i] - this.s0[i]) * k; this.sa[i * 2 + 1] = this.a0[i] * (1 - k) * (1 - k * .4);
  }
  this.aP.needsUpdate = true; this.aS.needsUpdate = true; this.aC.needsUpdate = true;
};
var pAdd = new PSys(CFG.low ? 160 : 260, true), pNorm = new PSys(CFG.low ? 220 : 340, false), pGlow = new PSys(CFG.low ? 60 : 130, true);
pGlow.pts.renderOrder = 1;
function ru(a, b){ return a + Math.random() * (b - a); }
function spark(x, y, z){ pAdd.emit(x, y, z, ru(-3, 3), ru(2, 5), ru(-3, 3), ru(.18, .35), .35, .1, 1, 0xffd27a, 14); }
function dust(x, y, z, size, rise){ pNorm.emit(x + ru(-.3, .3), y, z + ru(-.3, .3), ru(-.5, .5), ru(.3, 1) * (rise || 1), ru(-.5, .5), ru(.7, 1.2), size * .6, size * 1.7, .5, 0x9b8a6c, 0); }
function fx(kind, x, y, z, size){
  if (kind === 'flash'){ pAdd.emit(x, y, z, 0, 0, 0, .25, size * 1.3, size * 2.2, 1, 0xffe0a0, 0); }
  else dust(x, y, z, size, 1);
}
function updateFx(dt){
  pAdd.update(dt); pNorm.update(dt);
  var sc = renderer.getDrawingBufferSize(V2).y * .5 * camera.projectionMatrix.elements[5];
  pAdd.mat.uniforms.uScale.value = sc; pNorm.mat.uniforms.uScale.value = sc; pGlow.mat.uniforms.uScale.value = sc;
}
var V2 = new THREE.Vector2();
var stones = [];
function wallPoint(side){ return side === 0 ? -(CZ - WALL) : (CZ - WALL); }
function impact(side, x, dmg, big){
  var z = wallPoint(side), dz = side === 0 ? .3 : -.3, sz = Math.min(3, 1 + dmg * .06), i;
  fx('flash', x, 1.4, z + dz, sz);
  for (i = 0; i < (big ? 5 : 2); i++) dust(x + ru(-1, 1), .8, z + dz, sz * 1.4, 1.2);
  for (i = 0; i < (big ? 9 : 3); i++) pNorm.emit(x, 1.2, z + dz, ru(-3, 3), ru(2, 6), ru(-1, 1) * 3 + (side === 0 ? 2 : -2), ru(.6, 1.1), .35, .25, .9, 0x77736a, 16);
  shake(Math.min(.55, .04 + dmg * .01));
}
var lastHitT = [0, 0];
var pendingShot = null;

/* sur ustunden cephe hattina gorsel ok yagmuru: tek LineSegments */
var arrows = [], ARN = 14;
var arrowGeo = new THREE.BufferGeometry(); arrowGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARN * 6), 3));
var arrowMesh = new THREE.LineSegments(arrowGeo, new THREE.LineBasicMaterial({ color: 0xf0e4c4, transparent: true, opacity: .85, fog: false }));
arrowMesh.frustumCulled = false; world.add(arrowMesh);
for (var ai = 0; ai < ARN; ai++) arrows.push({ on: false, t: 0, d: 0, f: new THREE.Vector3(), to: new THREE.Vector3(), delay: 0 });
var volleyT = 4;
function volley(side, fl){
  var wz = wallPoint(side) + (side === 0 ? .4 : -.4), n = 0;
  for (var i = 0; i < ARN && n < 7; i++){ var a = arrows[i]; if (a.on) continue; n++;
    a.on = true; a.t = -Math.random() * .5; a.d = ru(1.1, 1.5);
    a.f.set(ru(-3.5, 3.5), 2.6, wz); a.to.set(ru(-5, 5), .2, fl + ru(-1.5, 1.5)); }
}
function updateArrows(dt){
  var P3 = arrowGeo.attributes.position.array;
  for (var i = 0; i < ARN; i++){
    var a = arrows[i], o = i * 6;
    if (!a.on){ P3[o] = P3[o + 1] = P3[o + 2] = P3[o + 3] = P3[o + 4] = P3[o + 5] = 0; continue; }
    a.t += dt; if (a.t < 0){ P3[o] = P3[o + 1] = P3[o + 2] = P3[o + 3] = P3[o + 4] = P3[o + 5] = 0; continue; }
    var k = a.t / a.d, k2 = Math.min(1, k + .04);
    if (k >= 1){ a.on = false; dust(a.to.x, .2, a.to.z, .9, .5); continue; }
    function at(kk, ix){ return ix === 0 ? a.f.x + (a.to.x - a.f.x) * kk : ix === 1 ? a.f.y + (a.to.y - a.f.y) * kk + Math.sin(kk * Math.PI) * 9 : a.f.z + (a.to.z - a.f.z) * kk; }
    P3[o] = at(k, 0); P3[o + 1] = at(k, 1); P3[o + 2] = at(k, 2); P3[o + 3] = at(k2, 0); P3[o + 4] = at(k2, 1); P3[o + 5] = at(k2, 2);
  }
  arrowGeo.attributes.position.needsUpdate = true;
}

/* ───────────── kamera: savas kamerasi, kale cekimleri, tanitim suzulmesi ───────────── */
var CAM = { dbg: {} };
var shakeAmp = 0, T = 0, W = 1, H = 1, aspect = .5625, portrait = true, bandTopPx = 0;
function shake(a){ if (!REDUCED) shakeAmp = Math.min(.6, Math.max(shakeAmp, a)); }
var RAD = Math.PI / 180, FIELDHALF = 7.3;
var CORN = [];
(function(){
  [[-1, -CZ, 1], [1, CZ, -1]].forEach(function(c){
    [-4.3, 4.3].forEach(function(x){ [-3.4, GATEZ + .1].forEach(function(lz){ [0, CH].forEach(function(y){ CORN.push(new THREE.Vector3(x, y, c[1] + lz * c[2])); }); }); });
  });
})();
var cur = null, camMode = '', heroSide = 0, heroUntil = 0, flAvg = 0, flTarget = 0, camV = new THREE.Vector3();
function cssPct(name, def){ try { var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)); return isFinite(v) ? v / 100 : def; } catch (_) { return def; } }
function poseCam(p, jx, jy){
  camera.fov = 2 * Math.atan(p.t) * 180 / Math.PI; camera.aspect = aspect;
  camera.position.set(p.tx + p.D * Math.sin(p.yaw) * Math.cos(p.elev) + (jx || 0), p.ty + p.D * Math.sin(p.elev) + (jy || 0), p.tz + p.D * Math.cos(p.yaw) * Math.cos(p.elev));
  camera.lookAt(p.tx, p.ty, p.tz);
  camera.setViewOffset(W, H, -(p.fx - .5) * W, -(p.fy - .5) * H, W, H);
  camera.updateMatrixWorld(true);
}
function battlePose(){
  if (portrait){ var D = 50; return { tx: 0, ty: .6, tz: flAvg, yaw: .04, elev: 52 * RAD, D: D, t: FIELDHALF / D / aspect, fx: .5, fy: .545 }; }
  var D2 = 46; return { tx: 0, ty: .6, tz: flAvg * .6, yaw: .62, elev: 36 * RAD, D: D2, t: 9 / D2, fx: .5, fy: .53 };
}
function heroPose(side){
  var D = 34, t = Math.max(7.4 / D / aspect, 7 / D);
  return { tx: 0, ty: 2.4, tz: side === 0 ? -CZ : CZ, yaw: side === 0 ? .32 : Math.PI - .32, elev: 27 * RAD, D: D, t: t, fx: .5, fy: portrait ? .64 : .54 };
}
function flyPose(p){
  var yaw = (portrait ? .5 : .9) * (1 - p) + (portrait ? -.1 : .55) * p, elev = (portrait ? 36 : 30) * RAD + (portrait ? 14 : 8) * RAD * p, D = portrait ? 85 : 80;
  var pose = { tx: 0, ty: 1.6, tz: 0, yaw: yaw, elev: elev, D: D, t: 1, fx: .5, fy: .5 };
  poseCam(pose, 0, 0);
  camera.clearViewOffset(); camera.updateMatrixWorld(true); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  var mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
  CORN.forEach(function(c){ camV.copy(c).applyMatrix4(camera.matrixWorldInverse); var tx = camV.x / -camV.z, ty = camV.y / -camV.z; mnx = Math.min(mnx, tx); mxx = Math.max(mxx, tx); mny = Math.min(mny, ty); mxy = Math.max(mxy, ty); });
  var vfrac = portrait ? .46 : .8, wfrac = .92;
  var t = Math.max((mxy - mny) / (2 * vfrac), (mxx - mnx) / (aspect * 2 * wfrac));
  var cxn = (mxx + mnx) / 2 / (t * aspect), cyn = (mxy + mny) / 2 / t, cfy = portrait ? .66 : .54;
  pose.t = t; pose.fx = (1 - cxn) / 2; pose.fy = (1 + cyn - (1 - 2 * cfy)) / 2;
  return pose;
}
var KEYS = ['tx', 'ty', 'tz', 'yaw', 'elev', 'D', 't', 'fx', 'fy'];
function wantPose(){
  var mode, pose, intro = S.phase === 'intro';
  if (intro){ mode = 'fly'; pose = flyPose(Math.min(1, S.phaseT / Math.max(1, g.tune.intro))); }
  else if (S.phase === 'end' && S.winner != null){ mode = 'hero' + S.winner; pose = heroPose(S.winner); }
  else if (heroUntil > T){ mode = 'hero' + heroSide; pose = heroPose(heroSide); }
  else { mode = 'battle'; pose = battlePose(); }
  return { mode: mode, pose: pose };
}
function updateCamera(dt){
  var w = wantPose(), p = w.pose;
  var jx = 0, jy = 0;
  if (!cur){ cur = {}; KEYS.forEach(function(k){ cur[k] = p[k]; }); camMode = w.mode; }
  var cut = REDUCED || Math.abs(cur.yaw - p.yaw) > 1 || (w.mode !== camMode && /^hero/.test(w.mode) && camMode === 'battle');
  if (w.mode !== camMode){ camMode = w.mode; }
  var k = cut || w.mode === 'fly' ? 1 : 1 - Math.exp(-dt * (w.mode === 'battle' ? 2.4 : 2.2));
  if (w.mode === 'fly' && !cut) k = 1 - Math.exp(-dt * 8);
  KEYS.forEach(function(key){ cur[key] += (p[key] - cur[key]) * k; });
  var q = {}; KEYS.forEach(function(key){ q[key] = cur[key]; });
  if (!REDUCED) q.yaw += Math.sin(T * .35) * .02;
  if (shakeAmp > .004){ jx = (Math.random() - .5) * shakeAmp; jy = (Math.random() - .5) * shakeAmp; shakeAmp *= Math.exp(-dt * 6); } else shakeAmp = 0;
  poseCam(q, jx, jy);
  flAvg += (flTarget - flAvg) * (1 - Math.exp(-dt * 1.5));
}
function fit(){
  W = stage.clientWidth || 1; H = stage.clientHeight || 1;
  renderer.setSize(W, H, false);
  aspect = W / H; portrait = aspect < 1;
  bandTopPx = (portrait ? .27 : .2) * H;
  cur = null; updateCamera(0);
}
function camDbg(){
  var vv = new THREE.Vector3(), pr = function(x, y, z){ vv.set(x, y, z).project(camera); return [vv.x, vv.y]; };
  var a = pr(-7, 0, flAvg), b = pr(7, 0, flAvg), ff = pr(0, 0, -(CZ - WALL)), nf = pr(0, 0, CZ - WALL), fy = (1 - ff[1]) / 2, ny = (1 - nf[1]) / 2;
  return { mode: camMode, fieldWidthFrac: Math.abs(b[0] - a[0]) / 2, farFrontY: fy, nearFrontY: ny, fov: camera.fov, front: flAvg };
}

/* ───────────── birlikler ───────────── */
var SC = 1.3;                       // asker olcegi (ayakta asker ~%4 ekran yuksekligi)
var army = null;
try { army = MF.units.createArmy({ max: CFG.low ? 100 : 200, quality: CFG.low ? 'dusuk' : 'yuksek' }); world.add(army.object); } catch (err){ army = null; if (statusEl) statusEl.textContent = 'Asker modeli yüklenemedi'; }
var ents = {}, entList = [], dyingN = 0, armyCap = CFG.low ? 100 : 200;
function hash(n){ n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); }
g.on('spawn', function(u){
  var e = { u: u, slots: [], gone: false, born: T, lx: 0, lz: 0, tx: 0, ty: 2, tz: 0, ok: false, fireT: -9, nAlive: 0 };
  ents[u.id] = e; entList.push(e); leaderPos(e);
  if (u.type === 'suvari') sfxA('horse');
});
g.on('remove', function(u, reason){
  var e = ents[u.id]; if (!e) return;
  if (reason === 'dead' || reason === 'defeat'){ e.gone = true; e.slots.forEach(function(sl){ if (sl.alive && !sl.dying) startDie(sl, reason === 'defeat' ? Math.random() * .6 : 0); }); }
  else dropEnt(e);
});
function dropEnt(e){
  e.slots.forEach(function(sl){ if (sl.dying) dyingN--; });
  delete ents[e.u.id]; var i = entList.indexOf(e); if (i >= 0) entList.splice(i, 1);
}
function startDie(sl, delay){
  if (dyingN >= 40){ sl.alive = false; return; }
  sl.dying = true; sl.dieT = -(delay || 0); dyingN++;
}
function leaderPos(e){
  var u = e.u;
  e.lz = u.side === 0 ? -ARMY + 2 * ARMY * u.pos : ARMY - 2 * ARMY * u.pos;
  e.lx = u.lane * LANEX;
}
function wantCount(u){
  var n = Math.max(1, u.n | 0);
  switch (u.type){
    case 'piyade': return Math.max(1, Math.min(10, Math.round(n / 3)));
    case 'milis': return Math.max(1, Math.min(3, Math.round(n / 3)));
    case 'suvari': return Math.max(1, Math.min(5, Math.round(n / 8)));
    case 'topcu': return 3;
    case 'mehter': return 2;
  }
  return 1;
}
function kindAt(u, i){
  switch (u.type){
    case 'piyade': return u.user && i === 0 ? 'komutan' : 'piyade';
    case 'topcu': return i === 0 ? 'topcu' : 'topcuEr';
    case 'mehter': return i === 0 ? 'davulcu' : 'sancaktar';
  }
  return u.type;
}
function slotTarget(u, i, total, fight, ph, out){
  var dir = u.side === 0 ? 1 : -1, x = 0, z = 0;
  if (u.type === 'topcu'){ if (i > 0){ x = (i === 1 ? -1 : 1) * 1.0; z = -dir * .9; } }
  else if (u.type === 'mehter'){ if (i > 0){ x = .9; z = -dir * .9; } }
  else if (i > 0){
    var cav = u.type === 'suvari', per = cav ? 3 : 5, sx = cav ? 1.4 : .7, rz = cav ? 2.0 : .8, j = i - 1, row = (j / per) | 0, col = j % per, cnt = Math.min(per, total - 1 - row * per);
    x = (col - (cnt - 1) / 2) * sx; z = -dir * (row + 1) * rz;
    if (fight){ x *= 1.35; z = z * .55 + dir * (.5 + ph * 1.3); }
  }
  out[0] = x * SC; out[1] = z * SC;
}
var _tg = [0, 0];
function updateArmy(dt){
  if (!army) return;
  var i, e, sl, n = entList.length, want = [], sum = 0, fixed = 0, f;
  for (i = 0; i < n; i++){ e = entList[i]; if (e.gone){ want.push(0); continue; } leaderPos(e); var c = wantCount(e.u); want.push(c); sum += c; if (e.u.type === 'topcu' || e.u.type === 'mehter') fixed += c; }
  // kapasite: komutan/lider her zaman cizilir, kalan asker orantili azalir
  var room = armyCap - dyingN - 8;
  if (sum > room){
    var leaders = 0; for (i = 0; i < n; i++) if (want[i] > 0) leaders++;
    f = Math.max(0, (room - fixed - leaders) / Math.max(1, sum - fixed - leaders));
    for (i = 0; i < n; i++){ e = entList[i]; if (!want[i] || e.u.type === 'topcu' || e.u.type === 'mehter') continue; want[i] = 1 + Math.floor((want[i] - 1) * Math.min(1, f)); }
  }
  army.begin(T);
  var a = 1 - Math.exp(-dt * 5), fightN = 0, alive = 0;
  for (i = n - 1; i >= 0; i--){
    e = entList[i]; var u = e.u, hex = D.colorHex(S.sides[u.side].id), c2 = want[i], dir = u.side === 0 ? 1 : -1, fight = u.state === 'fight' && u.type !== 'topcu' && u.type !== 'mehter';
    if (!e.gone){
      // sayiya gore canlandir / dusur
      for (var q = 0; q < c2; q++){
        sl = e.slots[q];
        if (!sl){ sl = e.slots[q] = { jx: (hash(u.id * 7 + q) - .5) * .36 * SC, jz: (hash(u.id * 13 + q) - .5) * .36 * SC, ph: hash(u.id * 3 + q) * 6.283, pr: hash(u.id + q * 5), cx: 0, cz: 0, alive: false, dying: false, dieT: 0, fresh: true }; }
        if (!sl.alive){ sl.alive = true; sl.dying = false; sl.fresh = true; }
      }
      for (q = c2; q < e.slots.length; q++){ sl = e.slots[q]; if (sl.alive && !sl.dying) startDie(sl, q * .05); }
    }
    var firing = u.type === 'topcu' || u.type === 'mehter' ? (T - e.fireT) / .8 : 2, anyAlive = false;
    for (q = 0; q < e.slots.length; q++){
      sl = e.slots[q]; if (!sl.alive) continue;
      slotTarget(u, q, Math.max(c2, 1), fight, sl.pr, _tg);
      if (sl.fresh){ sl.cx = _tg[0]; sl.cz = _tg[1]; sl.fresh = false; } else { sl.cx += (_tg[0] - sl.cx) * a; sl.cz += (_tg[1] - sl.cz) * a; }
      var x = e.lx + sl.cx + sl.jx, z = e.lz + sl.cz + sl.jz + (fight && !sl.dying ? dir * Math.sin(T * 4 + sl.ph) * .18 * SC : 0);
      x = Math.max(-7.3, Math.min(7.3, x));
      var kind = kindAt(u, q), st, k = 0;
      if (sl.dying){ sl.dieT += dt; if (sl.dieT < 0){ st = u.state === 'fight' ? 'fight' : 'walk'; } else { k = sl.dieT / .6; st = 'die'; if (k >= 1){ sl.alive = false; sl.dying = false; dyingN--; continue; } } }
      else if (u.type === 'topcu'){ if (firing >= 0 && firing < 1){ st = 'fire'; k = firing; } else st = u.state === 'walk' ? 'walk' : 'idle'; }
      else if (u.type === 'mehter') st = 'idle';
      else st = u.state === 'fight' ? 'fight' : u.state === 'walk' ? 'walk' : 'idle';
      var yaw = (dir > 0 ? 0 : Math.PI) + (fight && !sl.dying ? (sl.pr - .5) * .5 : 0);
      army.add(kind, hex, x, z, yaw, SC, st, sl.ph, k);
      anyAlive = true; alive++;
      if (q === 0){ e.tx = x; e.tz = z; e.ty = army.headHeight(kind) * SC + .15; }
    }
    e.ok = anyAlive; if (u.state === 'fight') fightN++;
    if (e.gone && !anyAlive){ dropEnt(e); }
  }
  army.end();
  armyFightShare = n ? fightN / n : 0;
}
var armyFightShare = 0;

var emRot = 0;
function emitters(dt){
  var n = entList.length, sparks = 0, fs = 0, fn = 0, i, e, u;
  for (i = 0; i < n; i++){
    e = entList[(i + emRot) % n]; u = e.u; if (e.gone || !e.ok) continue;
    if (u.state === 'fight' && u.type !== 'topcu' && u.type !== 'mehter'){
      fs += e.lz; fn++;
      if (u.pos < 1){
        if (sparks < 6 && Math.random() < dt * 2.2){ sparks++; spark(e.lx + ru(-1.2, 1.2), ru(.8, 1.8), e.lz + (u.side === 0 ? 1.2 : -1.2)); }
        if (Math.random() < dt * 1.1) dust(e.lx + ru(-1, 1), .15, e.lz, 1.6, .8);
      }
    } else if (u.state === 'walk' && (u.type === 'suvari' || u.type === 'topcu') && Math.random() < dt * 9){
      dust(e.lx, .1, e.lz + (u.side === 0 ? -1 : 1) * 1.2, u.type === 'suvari' ? 1.5 : 1.2, .6);
    }
  }
  emRot++;
  flTarget = fn ? Math.max(-5, Math.min(5, fs / fn)) : 0;
  clashN = fn;
  // mehter etkisi: ayaklarda parlayan halka
  var gi = 0, gn = pGlow.n, glowSide = [S.sides[0].buff > 0, S.sides[1].buff > 0];
  if ((glowSide[0] || glowSide[1]) && S.phase === 'play'){
    for (i = 0; i < n && gi < gn; i++){ e = entList[i]; if (e.gone || !e.ok || !glowSide[e.u.side]) continue;
      for (var q = 0; q < e.slots.length && gi < gn; q++){ var sl = e.slots[q]; if (!sl.alive || sl.dying) continue;
        var k3 = gi * 3; pGlow.pos[k3] = e.lx + sl.cx + sl.jx; pGlow.pos[k3 + 1] = .08; pGlow.pos[k3 + 2] = e.lz + sl.cz + sl.jz;
        pGlow.col[k3] = 1; pGlow.col[k3 + 1] = .72; pGlow.col[k3 + 2] = .2; pGlow.sa[gi * 2] = 2.6 + Math.sin(T * 5 + gi) * .3; pGlow.sa[gi * 2 + 1] = .5 + .2 * Math.sin(T * 6 + gi); gi++; } }
  }
  for (; gi < gn; gi++) pGlow.sa[gi * 2 + 1] = 0;
  pGlow.aP.needsUpdate = pGlow.aS.needsUpdate = pGlow.aC.needsUpdate = true;
  // ok yagmuru
  if (S.phase === 'play' && fn > 3){ volleyT -= dt; if (volleyT <= 0){ volleyT = ru(5, 8); volley(Math.random() < .5 ? 0 : 1, flAvg); } }
}
var clashN = 0;
function updateUnits(dt){ updateArmy(dt); emitters(dt); }

/* ───────────── olaylar: sahne tarafi ───────────── */
g.on('wallHit', function(side, dmg, by){
  if (by && by.type === 'topcu' && pendingShot && pendingShot.u === by){ pendingShot.dmg = dmg; pendingShot = null; return; }
  if (T - lastHitT[side] < .35) { shake(Math.min(.2, dmg * .004)); return; }
  lastHitT[side] = T;
  impact(side, by ? by.lane * LANEX : 0, dmg, false);
});
g.on('shot', function(u, side){
  var e = ents[u.id]; if (!e) return;
  var st = MF.models.stone(); st.scale.setScalar(2.4); world.add(st);
  e.fireT = T; var from = new THREE.Vector3(e.lx, 2.2, e.lz);
  var tx = Math.max(-4, Math.min(4, e.lx * .7 + (Math.random() - .5) * 2));
  var to = new THREE.Vector3(tx, 1.4, wallPoint(side) + (side === 0 ? .15 : -.15));
  var s = { m: st, from: from, to: to, t: 0, dur: 1.15, side: side, u: u, dmg: 18 };
  if (stones.length > 6){ var o = stones.shift(); world.remove(o.m); }
  stones.push(s); pendingShot = s; sfxA('cannon');
  // namlu alevi + duman
  var dz = u.side === 0 ? 1 : -1;
  pAdd.emit(from.x, 2.2, from.z + dz * 1.2, 0, 0, 0, .18, 1.2, 3.2, 1, 0xffd890, 0);
  for (var i = 0; i < 5; i++) pNorm.emit(from.x + ru(-.3, .3), 2.0, from.z + dz * ru(.8, 1.6), ru(-.6, .6), ru(.4, 1.1), dz * ru(.5, 2), ru(1.1, 1.8), 1.0, 3.6, .6, 0xb4b2ac, 0);
  shake(.12);
});
function updateStones(dt){
  for (var i = stones.length - 1; i >= 0; i--){
    var s = stones[i]; s.t += dt; var k = Math.min(1, s.t / s.dur);
    s.m.position.set(s.from.x + (s.to.x - s.from.x) * k, s.from.y + (s.to.y - s.from.y) * k + Math.sin(k * Math.PI) * 5, s.from.z + (s.to.z - s.from.z) * k);
    s.m.rotation.x += dt * 9; s.m.rotation.z += dt * 6;
    if (k >= 1){ impact(s.side, s.to.x, s.dmg || 18, true); sfxA('wall'); world.remove(s.m); stones.splice(i, 1); }
  }
}
g.on('stage', function(side, st){
  heroSide = side; heroUntil = T + 2.2;
  var z = wallPoint(side);
  for (var i = 0; i < 6; i++) dust((i - 2.5) * 1.5, 1.4, z + (side === 0 ? .3 : -.3), 2.6 + Math.random(), 1);
  fx('flash', 0, 1.6, z, 3.2); shake(.4);
});

/* ───────────── HUD ───────────── */
var elTip = $('#tip'), elQue = $('#que'), elTimer = $('#timer'), elX2 = $('#x2'), elTug = $('#tug').firstChild, elBanner = $('#banner'), elCard = $('#card');
var sd = [$('#s0'), $('#s1')];
var sdE = sd.map(function(n){ return { chip: n.querySelector('.nm i'), name: n.querySelector('.nm b'), hp: n.querySelector('.hp strong'), bar: n.querySelector('.bar i'), bdg: n.querySelector('.bdg'), t3: n.querySelector('.t3') }; });
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
  ['100+ elmas: ', 'topçu', ' sura gülle yağdırır'],
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
  var sdI = S.sides[i], key = sdI.id + '|' + sdI.top.map(function(t){ return t.user.id + ':' + t.pts + ':' + (t.user.pic ? 1 : 0); }).join(',');
  if (key === supKey[i]) return; supKey[i] = key;
  var box = sdE[i].t3; box.textContent = '';
  for (var r = 0; r < 3; r++){
    var t = sdI.top[r], ch = el('span', 'ch' + (t ? '' : ' e'));
    if (t){ ch.appendChild(avatar(t.user)); if (r === 0) ch.appendChild(el('b', '', t.user.name)); ch.appendChild(el('em', '', String(t.pts))); }
    else { ch.appendChild(el('span', 'av')); ch.lastChild.style.opacity = .35; }
    box.appendChild(ch);
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
    if (sd[i]._col !== col){ sd[i]._col = col; sd[i].style.setProperty('--sc', col); stage.style.setProperty('--c' + i, col); }
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
  if (feedHold > 0){ feedHold -= dt; if (feedHold <= 0){ elTip.classList.remove('fd'); tipT = 4; } }
  else { tipT += dt; if (tipT >= 4 || !elTip._i){ tipT = 0; elTip._i = 1; tipI++; showTip(); } }
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

/* akis: tek satirlik ipucu seridine karisir (3 sn) */
var feedHold = 0;
g.on('feed', function(f){
  if (S.phase === 'end') return;
  feedHold = 3; elTip.textContent = f.text; elTip.classList.remove('sw'); void elTip.offsetWidth; elTip.classList.add('sw');
  elTip.style.setProperty('--c', f.side != null && S.sides[f.side] ? D.css(S.sides[f.side].id) : 'var(--altın)'); elTip.classList.add('fd');
});

/* rutbe karti */
var cq = [], cBusy = false;
function cardPump(){
  if (cBusy || !cq.length) return;
  var c = cq.shift(), u = c.user; cBusy = true;
  elCard.textContent = '';
  elCard.style.setProperty('--c', D.css(u.home || (u.side != null ? S.sides[u.side].id : 34)));
  elCard.appendChild(avatar(u));
  elCard.appendChild(el('b', '', u.name));
  elCard.appendChild(el('i', '', RANKS[u.rank || 0] || ''));
  elCard.appendChild(el('span', '', (c.why || '')));
  elCard.hidden = false; elCard.style.animation = 'none'; void elCard.offsetWidth; elCard.style.animation = '';
  setTimeout(function(){ elCard.hidden = true; cBusy = false; cardPump(); }, 3000);
}
g.on('card', function(c){ cq.push(c); if (cq.length > 3) cq.shift(); cardPump(); });

/* tören */
var endBuilt = false, endMap = $('#mapend'); endMap.parentNode.removeChild(endMap);
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
  box.appendChild(endMap);
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
  for (var i = 0; i < entList.length; i++){ var e = entList[i]; if (e.u.user && !e.gone && e.ok) cand.push(e); }
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
  order.sort(function(a, b){ return b.tz - a.tz; });
  // ekranda alttakiler (kameraya yakin, buyuk z) once yerlesir
  for (var k = 0; k < order.length; k++){
    var en = order[k];
    putTag(tagMap[en.u.id], projXY(en.tx, en.ty, en.tz), true);
  }
  for (var i = bubs.length - 1; i >= 0; i--){
    var b = bubs[i]; b.t += dt;
    if (b.t > 3.6){ if (b.el.parentNode) b.el.parentNode.removeChild(b.el); bubs.splice(i, 1); continue; }
    var tgt = null;
    for (var j = entList.length - 1; j >= 0; j--) if (entList[j].u.user === b.user && !entList[j].gone && entList[j].ok){ tgt = entList[j]; break; }
    var xy;
    if (tgt) xy = projXY(tgt.tx, tgt.ty + .9, tgt.tz);
    else { var sd2 = b.user.side == null ? 1 : b.user.side; xy = projXY(0, 3.2, sd2 === 0 ? -(CZ - GATEZ) : (CZ - GATEZ)); }
    putTag(b.el, xy, false);
  }
}

/* fetih haritasi */
var mapCvs = Array.prototype.slice.call(document.querySelectorAll('.mapcv')), mapImgs = {}; mapCvs.push(endMap);
function paintMap(){
  var gr = D.grid, cell = gr.cell, ow = S.owners, i, colCache = {};
  mapCvs.forEach(function(cv){
    var ctx = cv.getContext('2d'), img = mapImgs[cv.id] || (mapImgs[cv.id] = ctx.createImageData(330, 150)), px = img.data;
    for (i = 0; i < cell.length; i++){
      var c = cell[i], o = i * 4;
      if (c < 0){ px[o] = 10; px[o + 1] = 30; px[o + 2] = 42; px[o + 3] = 120; continue; }
      var id = D.IL[c].id, own = ow[id], hex = own ? D.colorHex(own) : 0x56666b;
      var cc = colCache[hex] || (colCache[hex] = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]);
      px[o] = cc[0]; px[o + 1] = cc[1]; px[o + 2] = cc[2]; px[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    for (var s2 = 0; s2 < 2; s2++){
      var p = P[S.sides[s2].id]; if (!p) continue;
      var x = (p.x + gr.pw / 2) / gr.pw * gr.W, y = (p.z + gr.ph / 2) / gr.ph * gr.H;
      ctx.beginPath(); ctx.arc(x, y, 8, 0, 6.2832); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 5, 0, 6.2832); ctx.fillStyle = D.css(S.sides[s2].id); ctx.fill();
    }
  });
}

/* ───────────── ses: MF.audio (js/audio.js); yoksa ya da hata verirse sayfa sessiz calisir ───────────── */
var soundOn = false, AU = null, lastTrack = null, intens = 0, clashT = 0, tickN = -1, sayAt = 0;
var pronN = 1;   // cavus varyanti (1..6): adres > kayit > 1
try { var sv = parseInt(storage.get('mf2-pron'), 10); if (sv >= 1 && sv <= 6) pronN = sv; } catch (_) {}
if (CFG.cavus) pronN = CFG.cavus;
try { if (MF.audio) AU = MF.audio.create({ pron: { cavus: pronN } }); } catch (_) { AU = null; }
function au(fn){ try { if (AU) return fn(AU); } catch (_) {} }
var sfxLast = {};
function sfxA(name, o){ if (!soundOn) return; var now = T, last = sfxLast[name] || -9; if (now - last < .12) return; sfxLast[name] = now; au(function(a){ a.sfx(name, o); }); }
var SFXMAP = { start: 'horn', victory: 'cheer', rankup: 'rankup', combo: 'combo', shield: 'shield', stage: 'stage', last30: 'horn', revenge: 'horn', mehter: 'horn' };
g.on('sfx', function(n){ var m = SFXMAP[n]; if (m) sfxA(m); });
g.on('say', function(t){ if (soundOn) au(function(a){ a.say(t); }); });
var mehterUntil = 0, prevBuff = 0;
function wantTrack(){
  if (S.phase === 'intro'){ mehterUntil = 0; prevBuff = 0; return 'intro'; }
  if (S.phase === 'end'){ mehterUntil = 0; prevBuff = 0; return 'victory'; }
  // mehter etkisi 12 sn surer ama marsin tamami (16 olcu, ~21 sn) duyulsun diye parca en az 21 sn calar
  var buff = Math.max(S.sides[0].buff, S.sides[1].buff);
  if (buff > prevBuff + .5) mehterUntil = T + 21;
  prevBuff = buff;
  if (buff > 0 || T < mehterUntil) return 'mehter';
  if (S.timeLeft <= 30) return 'last30';
  var f0 = S.sides[0].hp / Math.max(1, S.sides[0].maxHp), f1 = S.sides[1].hp / Math.max(1, S.sides[1].maxHp);
  return Math.min(f0, f1) < .33 ? 'tense' : 'battle';
}
function audioTick(dt){
  if (!soundOn || !AU) return;
  var tr = wantTrack(); if (tr !== lastTrack){ lastTrack = tr; au(function(a){ a.music(tr); }); }
  intens += (Math.min(1, armyFightShare * 1.6) - intens) * (1 - Math.exp(-dt * .8)); au(function(a){ a.intensity(intens); });
  if (S.phase === 'play'){
    clashT -= dt; if (clashT <= 0 && clashN > 0){ clashT = ru(.3, .6) / Math.min(3, 1 + clashN / 6); sfxA(Math.random() < .6 ? 'sword' : 'hit', { gain: .5 }); }
    var tk = Math.ceil(S.timeLeft); if (tk <= 10 && tk > 0 && tk !== tickN){ tickN = tk; sfxA('tick'); }
  }
}
function audioStatus(){ au(function(a){ var st = a.status(); statusEl.textContent = st.voice ? 'Ses: ' + st.voice : 'Türkçe ses bulunamadı'; }); }
g.on('wallHit', function(side, dmg){ if (dmg > 6) sfxA('wall', { gain: Math.min(1, .3 + dmg / 40) }); });

/* ───────────── galeri ───────────── */
var galOn = false, galI = 0, galObj = null;
var GALCAT = (function(){
  var arr = [];
  MF.models.catalog.forEach(function(c){ if (c.id === 'kale' || c.id === 'kalkan') arr.push(c); });
  if (MF.units) ['milis', 'piyade', 'komutan', 'suvari', 'topcu', 'mehter'].forEach(function(t){
    var inf = MF.units.info[t] || {};
    arr.push({ id: t, name: inf.name || t, trigger: inf.trigger || '', desc: inf.desc || '', unit: t, make: function(){ return MF.units.preview(t, 0xe8553a); } });
  });
  return arr;
})();
function galShow(i){
  var cat = GALCAT; galI = (i + cat.length) % cat.length;
  if (galObj){ galGroup.remove(galObj); if (galObj.userData.dispose) galObj.userData.dispose(); galObj = null; }
  var e = cat[galI]; galObj = e.make(); galObj._unit = e.unit; galGroup.add(galObj);
  var bb = new THREE.Box3().setFromObject(galObj), sp = bb.getBoundingSphere(new THREE.Sphere());
  if (!isFinite(sp.radius) || sp.radius < .3) sp.radius = e.unit ? 2.2 : 8;
  galObj.position.sub(new THREE.Vector3(sp.center.x, 0, sp.center.z)); sp.center.x = 0; sp.center.z = 0;
  var vf = 36 * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect), dist = sp.radius / Math.sin(Math.min(vf, hf) / 2) * 1.1;
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
$('#b-snd').onclick = function(e){
  soundOn = !soundOn; e.currentTarget.setAttribute('aria-pressed', String(soundOn));
  au(function(a){ if (soundOn){ a.enable(); a.setMuted(false); } else { a.setMuted(true); } });
  lastTrack = null; if (soundOn) setTimeout(audioStatus, 600);
};
var bPron = $('#b-pron');
function pronLabel(){ bPron.textContent = 'Çavuş sesi ' + pronN + '/6'; }
pronLabel();
bPron.onclick = function(){
  pronN = pronN % 6 + 1;
  try { storage.set('mf2-pron', String(pronN)); } catch (_) {}
  if (!soundOn){ soundOn = true; $('#b-snd').setAttribute('aria-pressed', 'true'); au(function(a){ a.enable(); a.setMuted(false); }); lastTrack = null; setTimeout(audioStatus, 600); }
  au(function(a){ a.setPron('cavus', pronN); a.sayTest(pronN); });
  pronLabel();
};
if (CFG.ses){
  soundOn = true; $('#b-snd').setAttribute('aria-pressed', 'true');
  au(function(a){ a.enable(); a.setMuted(false); }); setTimeout(audioStatus, 900);
  // tarayici ses baslatmayi engellediyse ilk dokunus/tus ile yeniden dene
  var again = function(){ au(function(a){ a.enable(); a.setMuted(false); }); lastTrack = null; document.removeEventListener('pointerdown', again); document.removeEventListener('keydown', again); };
  document.addEventListener('pointerdown', again); document.addEventListener('keydown', again);
}
function vols(){ au(function(a){ a.setVolume({ music: $('#vol-m').value / 100, sfx: $('#vol-s').value / 100 }); }); }
$('#vol-m').oninput = vols; $('#vol-s').oninput = vols;
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
    updateUnits(dt); updateStones(dt); updateFx(dt); audioTick(dt); 
    // kale: hasar, kalkan, bayrak
    for (var i = 0; i < 2; i++){
      var s = S.sides[i], c = castles[i];
      c.userData.setDamage(s.maxHp > 0 ? Math.max(0, s.hp) / s.maxHp : 0);
      var sh = s.shield > 0; if (castleSh[i] !== sh){ castleSh[i] = sh; c.userData.setShield(sh); }
      if (castleCol[i] !== s.id){ castleCol[i] = s.id; c.userData.setColor(D.colorHex(s.id)); }
      c.userData.tick(T);
    }
    updateCamera(dt); updateArrows(dt);
    updateLabels(dt);
  } else {
    if (galObj){ galObj.rotation.y += dt * .6; if (galObj.userData.tick) galObj.userData.tick(T); if (galObj.userData.animate){ var cy = T % 9, gs = cy < 3 ? 'walk' : cy < 6 ? 'fight' : 'idle', gk = 0; if (galObj._unit === 'topcu'){ gs = 'fire'; gk = (T % 2) / 2; } try { galObj.userData.animate(T, gs, gk); } catch (_) {} } }
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
  debug: function(){ return { cam: camDbg(), units: entList.length, army: army ? army.stats() : null, tags: Object.keys(tagMap).length }; }
};
})();
