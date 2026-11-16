/* Memleket Fethi v2 — 3B modeller (three.js r128 global derleme gerekir)
   Tüm modeller +Z yönüne bakar, zemin y=0.
   Her model Bld birleştiricisiyle tek geometriye indirilir:
   grup 0 = köşe renkli sabit malzeme (VC), grup 1 = taraf rengi malzemesi (köşe gölgesi × malzeme rengi). */
(function () {
'use strict';
var MF = (window.MF = window.MF || {});
var T = window.THREE;
if (!T) { throw new Error('models.js: THREE bulunamadi'); }

/* ───────── renk paleti ───────── */
var C = {
  stone: 0xcfc6b0, stone2: 0xa9a08b, mortar: 0x877f6c, floor: 0x948b76, dirt: 0x9b8a66, cobble: 0x8a8068,
  dark: 0x1b1713, soot: 0x5a514a, shade: 0x0a1a22, skin: 0xe8b58a, hair: 0x2a1a10, white: 0xf6ecd4, red: 0xc8322c,
  gold: 0xf2b632, wood: 0x7a4a24, wood2: 0x5a3418, horse: 0x8f5a33, steel: 0xc3ced3, iron: 0x5d666c, bronze: 0xa07f3c,
  copper: 0xb8692e, navy: 0x23323d, boot: 0x3a2616, hose: 0x4a5560, leather: 0x6b4423, neutral: 0x7d8a80
};
var NEUTRAL = C.neutral;

/* ───────── yardımcılar ───────── */
function rng(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0; var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
var PI = Math.PI;
function cyl(a, c, h, s, open) { return new T.CylinderGeometry(a, c, h, s || 10, 1, !!open); }
function box(w, h, d) { return new T.BoxGeometry(w, h, d); }
/* alt yüzü olmayan kutu (yere oturan parçalar için) */
function boxU(w, h, d) { var g = new T.BoxGeometry(w, h, d), ix = Array.prototype.slice.call(g.index.array); ix.splice(18, 6); g.setIndex(ix); return g; }
function sph(r, w, h) { return new T.SphereGeometry(r, w || 10, h || 7); }
function cone(r, h, s) { return new T.ConeGeometry(r, h, s || 8, 1, true); }
function tor(r, t, arc, rs, ts) { return new T.TorusGeometry(r, t, rs || 6, ts || 16, arc || PI * 2); }
function lathe(pts, s) { return new T.LatheGeometry(pts.map(function (p) { return new T.Vector2(p[0], p[1]); }), s || 12); }
function disc(r, s) { return new T.CircleGeometry(r, s || 14); }

function Bld() { this.pos = [[], []]; this.nor = [[], []]; this.col = [[], []]; this.st = [new T.Matrix4()]; this.jit = 0; this.R = rng(1); }
Bld.prototype = {
  push: function (x, y, z, rx, ry, rz, s) {
    var m = new T.Matrix4().compose(new T.Vector3(x || 0, y || 0, z || 0), new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0)), new T.Vector3(s || 1, s || 1, s || 1));
    this.st.push(this.st[this.st.length - 1].clone().multiply(m)); return this;
  },
  pop: function () { this.st.pop(); return this; },
  /* col: sayı = sabit renk; 'c' = taraf rengi; ['c',0.8] = taraf renginin koyu tonu */
  add: function (geo, col, x, y, z, rx, ry, rz, sx, sy, sz) {
    var g = geo.index ? geo.toNonIndexed() : geo;
    var m = new T.Matrix4().compose(new T.Vector3(x || 0, y || 0, z || 0), new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0)),
      new T.Vector3(sx || 1, sy || sx || 1, sz || sx || 1));
    g.applyMatrix4(this.st[this.st.length - 1].clone().multiply(m));
    var k = typeof col === 'number' ? 0 : 1, c = k ? new T.Color().setScalar(Array.isArray(col) ? col[1] : 1) : new T.Color(col);
    if (this.jit) c.multiplyScalar(1 + (this.R() - .5) * 2 * this.jit);
    var P = g.attributes.position.array, N = g.attributes.normal.array, i;
    for (i = 0; i < P.length; i++) { this.pos[k].push(P[i]); this.nor[k].push(N[i]); }
    for (i = 0; i < P.length; i += 3) this.col[k].push(c.r, c.g, c.b);
    geo.dispose(); if (g !== geo) g.dispose(); return this;
  },
  /* iki nokta arasında ince çubuk */
  rod: function (x1, y1, z1, x2, y2, z2, r, col, seg) {
    var d = new T.Vector3(x2 - x1, y2 - y1, z2 - z1), len = d.length();
    var q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()), e = new T.Euler().setFromQuaternion(q);
    return this.add(cyl(r, r, len, seg || 5, true), col, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2, e.x, e.y, e.z);
  },
  build: function () {
    var g = new T.BufferGeometry(), n0 = this.pos[0].length / 3, n1 = this.pos[1].length / 3;
    g.setAttribute('position', new T.Float32BufferAttribute(this.pos[0].concat(this.pos[1]), 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(this.nor[0].concat(this.nor[1]), 3));
    g.setAttribute('color', new T.Float32BufferAttribute(this.col[0].concat(this.col[1]), 3));
    g.addGroup(0, n0, 0); g.addGroup(n0, n1, 1); g.computeBoundingSphere(); return g;
  }
};

/* ───────── malzemeler (taraf rengi başına önbellek) ───────── */
var VC = null, MATS = {}, FLAGM = {}, GEO = {}, INST = [];
function vc() { return VC || (VC = new T.MeshPhongMaterial({ vertexColors: true, shininess: 18, specular: 0x222222 })); }
function clanMat(hex) {
  hex = hex == null ? NEUTRAL : hex;
  return MATS[hex] || (MATS[hex] = new T.MeshPhongMaterial({ vertexColors: true, color: hex, shininess: 14, specular: 0x1a1a1a }));
}
function flagMat(hex) {
  hex = hex == null ? NEUTRAL : hex;
  return FLAGM[hex] || (FLAGM[hex] = new T.MeshPhongMaterial({ vertexColors: true, color: hex, side: T.DoubleSide, shininess: 8, specular: 0x111111 }));
}
function geo(name, fn) { return GEO[name] || (GEO[name] = fn()); }

/* ═════════════════════════ KALE ═════════════════════════ */
var WX = 3.4, WZ = 2.6, WT = .55, WH = 1.4, MH = .28, TR = .6, TH = 2.6;
var GH = 2.5, GXc = .95, GW = 1.0, GD = 1.3, GZc = 2.55, GF = 3.2;   /* kapı binası: ön yüz z=3.2 */
var KZ = -.5, KW = 1.7, KH = 4.0;                                     /* iç kale */
var GATE_Z = GF + 1.25;

/* sur parçası: world ekseninde [w0,w1] aralığı; axis 'x' (ön/arka) ya da 'z' (yan) */
function wall(b, o) {
  var R = b.R, c = (o.w0 + o.w1) / 2, L = o.w1 - o.w0, h = L / 2, s = o.s;
  var U = function (w) { return s * (w - c); };
  var gaps = (o.gaps || []).map(function (g) { var a = U(g[0]), d = U(g[1]); return { a: Math.min(a, d), b: Math.max(a, d), h: g[2] }; }).sort(function (p, q) { return p.a - q.a; });
  var cx = o.axis === 'x' ? c : o.fixed, cz = o.axis === 'x' ? o.fixed : c, i, j;
  var cl0 = U(o.clip[0]), cl1 = U(o.clip[1]), lo = Math.min(cl0, cl1), hi = Math.max(cl0, cl1);
  b.push(cx, 0, cz, 0, o.ry, 0);
  var inGap = function (u, m) { return gaps.some(function (g) { return u > g.a - m && u < g.b + m; }); };
  var cur = -h, pieces = [];
  gaps.forEach(function (g) { pieces.push([cur, g.a]); cur = g.b; }); pieces.push([cur, h]);
  pieces.forEach(function (p) {
    var len = p[1] - p[0]; if (len < .03) return; var m = (p[0] + p[1]) / 2;
    b.add(boxU(len, WH, WT), C.stone, m, WH / 2, 0);
    b.add(boxU(len, .3, WT + .14), C.stone2, m, .15, 0);
    [.55, .95, 1.25].forEach(function (y) {
      b.add(box(len, .03, .02), C.mortar, m, y, WT / 2 + .004);
      b.add(box(len, .03, .02), C.mortar, m, y, -WT / 2 - .004);
    });
    b.add(boxU(len, .03, .3), C.floor, m, WH + .015, -.03);                 /* sur yürüyüş yolu */
    b.add(boxU(len, .1, .09), C.stone2, m, WH + .05, -WT / 2 + .06);        /* iç korkuluk */
  });
  gaps.forEach(function (g) {
    var w = g.b - g.a, n = Math.max(2, Math.round(w / .28));
    for (i = 0; i < n; i++) {
      var sw = w / n, hh = g.h * (.25 + R() * .75);
      b.add(boxU(sw * .94, hh, WT * (.7 + R() * .25)), R() < .5 ? C.stone : C.stone2, g.a + sw * (i + .5), hh / 2, (R() - .5) * .1, 0, (R() - .5) * .35, 0);
    }
  });
  var n = Math.floor(L / .4), pitch = L / n;
  for (i = 0; i < n; i++) {
    var u = -h + (i + .5) * pitch, r = R(), cc = R() < .5 ? C.stone : C.stone2;
    if (u < lo || u > hi || inGap(u, .12) || r < o.miss) continue;
    b.add(boxU(.24, MH, .17), cc, u, WH + MH / 2, WT / 2 - .1);
  }
  for (u = lo + .5; u < hi - .2; u += 1.25) {
    if (inGap(u, .3)) continue;
    b.add(box(.07, .3, .04), C.dark, u, .85, WT / 2 + .006);
    b.add(box(.12, .04, .05), C.stone2, u, 1.02, WT / 2 + .008);
  }
  (o.banners || []).forEach(function (w) { var u = U(w); if (!inGap(u, .3)) banner(b, u, 1.3, WT / 2 + .03, .28, .62); });
  (o.soot || []).forEach(function (sd) { var u = U(sd[0]); b.add(box(sd[2], sd[3], .012), C.soot, u, sd[1], WT / 2 + .014); });
  b.pop();
}

/* asılı sancak: tepeden çubuğa asılı, kırlangıç kuyruklu, altın armalı */
function banner(b, x, ytop, zf, w, len) {
  b.add(cyl(.012, .012, w + .1, 4, true), C.wood, x, ytop + .02, zf, 0, 0, PI / 2);
  b.add(box(w, len, .014), 'c', x, ytop - len / 2, zf);
  b.add(cyl(w * .5774, w * .5774, .016, 3), 'c', x, ytop - len, zf, PI / 2);
  b.add(box(w + .02, .035, .02), C.gold, x, ytop - .03, zf + .003);
  b.add(box(w * .4, w * .4, .018), C.gold, x, ytop - len * .45, zf + .004, 0, 0, PI / 4);
  b.add(box(w * .2, w * .2, .02), ['c', .55], x, ytop - len * .45, zf + .006, 0, 0, PI / 4);
}
/* tepe flaması (yatay üçgen, taraf rengi) */
function pennant(b, x, y, z, len, h) {
  b.push(x, y, z, 0, 0, PI / 2);
  b.add(cyl(h * .5774, h * .5774, .012, 3), 'c', 0, 0, 0, PI / 2, 0, 0, 1, 1, len / h * 1.0);
  b.pop();
}

/* yuvarlak kule: düz, mazgallı tepe */
function tower(b, o) {
  var R = b.R, r = o.r || TR, h = o.h || TH, n = o.n || 9, mw = o.mw || .27, mh = o.mh || .3, nseg = o.seg || 14, i;
  var stone = o.stone == null ? C.stone : o.stone;
  b.push(o.x, 0, o.z, o.rx || 0, 0, o.rz || 0);
  b.add(cyl(r, r + .1, .5, nseg, true), C.stone2, 0, .25, 0);
  b.add(cyl(r, r, h, nseg, true), stone, 0, h / 2, 0);
  var ys = o.courses || [.85, 1.4, 1.95];
  ys.forEach(function (y) { if (y < h - .3) b.add(cyl(r + .012, r + .012, .035, nseg, true), C.mortar, 0, y, 0); });
  var a0 = o.slitA == null ? 0 : o.slitA;
  (o.slits || []).forEach(function (a) {
    var A = a0 + a, sy = o.slitY || 1.4;
    b.add(box(.07, .3, .04), C.dark, Math.sin(A) * (r + .005), sy, Math.cos(A) * (r + .005), 0, A, 0);
  });
  if (!o.broken) {
    b.add(cyl(r + .12, r, .2, nseg, true), C.stone2, 0, h - .1, 0);
    b.add(disc(r + .12, nseg), C.floor, 0, h + .001, 0, -PI / 2);
    for (i = 0; i < n; i++) {
      var a = i / n * PI * 2 + .2, rr = r + .07, rn = R(), cc = R() < .5 ? stone : C.stone2;
      if (rn < (o.miss || 0)) continue;
      b.add(boxU(mw, mh, .15), cc, Math.sin(a) * rr, h + mh / 2, Math.cos(a) * rr, 0, a, 0);
    }
    if (o.pennant) {
      b.add(cyl(.014, .014, .8, 4, true), C.wood, 0, h + .4, 0);
      pennant(b, .22, h + .66, 0, .46, .17);
    }
  } else {
    b.add(cyl(r + .06, r, .12, nseg, true), C.stone2, 0, h - .06, 0);
    b.add(disc(r + .06, nseg), C.soot, 0, h + .001, 0, -PI / 2);
    for (i = 0; i < 7; i++) {
      var a2 = i / 7 * PI * 2, hh = .12 + R() * .5;
      if (Math.sin(a2 + o.gapA) > .35 && Math.cos(a2 + o.gapA) > 0) hh *= .35;
      b.add(boxU(.3, hh, .17), R() < .5 ? stone : C.stone2, Math.sin(a2) * (r - .02), h + hh / 2, Math.cos(a2) * (r - .02), (R() - .5) * .25, a2, (R() - .5) * .3);
    }
  }
  b.pop();
}

/* dikdörtgen mazgal sırası (kapı binası / iç kale tepesi) */
function edgeMerlons(b, cx, cz, w, d, y, o) {
  var R = b.R, i, cw = o.cw || .21, ch = o.ch || .28, cn = o.nx || Math.max(2, Math.round(w / .32)), sn = o.nz == null ? Math.max(2, Math.round(d / .34)) : o.nz;
  var put = function (x, z, ry) {
    var rn = R(), cc = R() < .5 ? C.stone : C.stone2;
    if (rn < (o.miss || 0)) return;
    b.add(boxU(cw, ch, .16), cc, x, y + ch / 2, z, 0, ry, 0);
  };
  var ex = w / 2 - .09, ez = d / 2 - .09;
  for (i = 0; i < cn; i++) {
    var x = -w / 2 + (i + .5) * w / cn;
    if (o.front !== false) put(cx + x, cz + ez, 0);
    if (o.back !== false) put(cx + x, cz - ez, PI);
  }
  for (i = 1; i < sn - 1; i++) {
    var z = -d / 2 + (i + .5) * d / sn;
    if (o.left !== false) put(cx - ex, cz + z, -PI / 2);
    if (o.right !== false) put(cx + ex, cz + z, PI / 2);
  }
}

/* kapı binası: iki kare kule + kemerli kapı + demir ızgara + köprü */
function gatehouse(b, o) {
  var R = b.R, zc = GZc, f = GF, sx;
  for (var q = 0; q < 2; q++) {
    sx = q ? 1 : -1; var x = sx * GXc;
    b.add(boxU(GW, GH, GD), C.stone, x, GH / 2, zc);
    b.add(boxU(GW + .12, .3, GD + .12), C.stone2, x, .15, zc);
    [.55, 1.0, 1.5, 2.0].forEach(function (y) {
      b.add(box(GW, .03, .02), C.mortar, x, y, f + .004);
      b.add(box(.02, .03, GD), C.mortar, x + sx * (GW / 2 + .004), y, zc);
    });
    b.add(box(.07, .32, .04), C.dark, x, 1.3, f + .006);
    b.add(box(.07, .32, .04), C.dark, x, 2.0, f + .006);
    b.add(box(.04, .32, .07), C.dark, x + sx * (GW / 2 + .006), 1.6, zc);
    b.add(box(.04, .32, .07), C.dark, x + sx * (GW / 2 + .006), 1.6, zc + .4);
    b.add(boxU(GW, .03, GD - .1), C.floor, x, GH + .015, zc);
    edgeMerlons(b, x, zc, GW, GD, GH, { miss: q ? o.missR : o.missL, cw: .22, nx: 3, nz: 4, left: sx < 0, right: sx > 0 });
    banner(b, x, 2.32, f + .03, .3, 1.0);
    /* pennant */
    if (!o.noPennant) { b.add(cyl(.014, .014, .8, 4, true), C.wood, x, GH + .4, zc - .2); pennant(b, x + .22, GH + .66, zc - .2, .46, .17); }
  }
  /* kapı üstü köprü bloğu */
  b.add(boxU(GXc * 2 - GW, 1.95, GD), C.stone, 0, 1.95 / 2, zc);
  b.add(boxU(GXc * 2 - GW + .02, .3, GD + .12), C.stone2, 0, .15, zc);
  [.55, 1.0, 1.5].forEach(function (y) { b.add(box(.9, .03, .02), C.mortar, 0, y, f + .004); });
  b.add(boxU(.9, .03, GD - .1), C.floor, 0, 1.965, zc);
  edgeMerlons(b, 0, zc, .9, GD, 1.95, { miss: o.missL * .6, cw: .2, nx: 3, nz: 0, left: false, right: false });
  for (var i = -2; i <= 2; i++) b.add(boxU(.12, .13, .1), C.stone2, i * .2, 1.87, f + .05);   /* konsol taşları */
  /* kemerli kapı */
  var zf = f + .022;
  b.add(boxU(.9, .95, .02), C.dark, 0, .475, zf);
  b.add(disc(.45, 16), C.dark, 0, .95, zf, 0, 0, 0);
  b.add(tor(.5, .065, PI, 5, 14), C.stone2, 0, .95, f + .012);
  b.add(box(.1, .95, .08), C.stone2, -.5, .475, f + .015);
  b.add(box(.1, .95, .08), C.stone2, .5, .475, f + .015);
  var ix;
  for (ix = -3; ix <= 3; ix++) {
    var bx = ix * .13, top = .95 + Math.sqrt(Math.max(0, .45 * .45 - bx * bx)) - .03;
    b.add(box(.03, top, .03), C.iron, bx, top / 2, f + .06);
  }
  [.22, .5, .78, 1.06].forEach(function (y) {
    var hw = y > .95 ? Math.sqrt(Math.max(0, .45 * .45 - (y - .95) * (y - .95))) : .45;
    if (hw > .1) b.add(box(hw * 2, .03, .03), C.iron, 0, y, f + .075);
  });
  b.add(sph(.03, 5, 4), C.gold, 0, .26, f + .1);
  /* indirilmiş köprü + zincirler */
  b.add(boxU(.88, .05, 1.2), C.wood, 0, .03, f + .62);
  for (i = 0; i < 6; i++) b.add(box(.88, .006, .01), C.wood2, 0, .056, f + .1 + i * .2);
  b.add(box(.06, .06, 1.2), C.wood2, -.45, .05, f + .62); b.add(box(.06, .06, 1.2), C.wood2, .45, .05, f + .62);
  b.rod(-.42, 1.15, f + .04, -.42, .06, f + 1.2, .012, C.iron, 4);
  b.rod(.42, 1.15, f + .04, .42, .06, f + 1.2, .012, C.iron, 4);
}

/* iç kale: kare, köşe kulecikli, mazgallı */
function keep(b, o) {
  var R = b.R, i, y;
  var half = KW / 2;
  b.add(boxU(KW + .3, .4, KW + .3), C.stone2, 0, .2, KZ);
  b.add(boxU(KW, KH, KW), C.stone, 0, KH / 2, KZ);
  [.9, 1.5, 2.1, 2.7, 3.3, 3.8].forEach(function (yy) {
    b.add(box(KW, .03, .02), C.mortar, 0, yy, KZ + half + .004); b.add(box(KW, .03, .02), C.mortar, 0, yy, KZ - half - .004);
    b.add(box(.02, .03, KW), C.mortar, half + .004, yy, KZ); b.add(box(.02, .03, KW), C.mortar, -half - .004, yy, KZ);
  });
  [1.7, 2.6, 3.4].forEach(function (yy) {
    [-.28, .28].forEach(function (xo) {
      b.add(box(.07, .34, .04), C.dark, xo, yy, KZ + half + .006);
      b.add(box(.07, .34, .04), C.dark, xo, yy, KZ - half - .006);
      b.add(box(.04, .34, .07), C.dark, half + .006, yy, KZ + xo);
      b.add(box(.04, .34, .07), C.dark, -half - .006, yy, KZ + xo);
    });
    b.add(box(.14, .04, .05), C.stone2, 0, yy + .2, KZ + half + .01);
  });
  /* kapı */
  var zf = KZ + half + .02;
  b.add(boxU(.44, .55, .02), C.wood2, 0, .275 + .2, zf);
  b.add(disc(.22, 12), C.wood2, 0, .75 + .2, zf);
  b.add(tor(.25, .035, PI, 4, 10), C.stone2, 0, .75 + .2, zf - .005);
  b.add(boxU(.9, .2, .35), C.stone2, 0, .3, KZ + half + .17);
  b.add(boxU(.6, .1, .2), C.stone2, 0, .35 + .1, KZ + half + .1);
  banner(b, 0, 3.6, KZ + half + .035, .5, 1.35);
  banner(b, 0, 3.6, KZ - half - .035, .5, 1.35);
  /* tepe */
  b.add(boxU(KW, .03, KW), C.floor, 0, KH + .015, KZ);
  edgeMerlons(b, 0, KZ, KW, KW, KH, { miss: o.missK, cw: .2, ch: .3, nx: 4, nz: 4 });
  /* köşe kulecikleri */
  var k = 0;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
    var br = o.brokenK && o.brokenK.indexOf(k) >= 0, A = Math.atan2(c[0], c[1]);
    tower(b, { x: c[0] * half, z: KZ + c[1] * half, r: .3, h: br ? 4.15 : 4.6, n: 6, mw: .2, mh: .24, seg: 9, miss: o.missK, broken: br, gapA: 0,
      courses: [1.0, 1.9, 2.8, 3.7], slits: [A, A + .9, A - .9], slitY: 3.0, slitA: 0, pennant: k === 1 });
    k++;
  });
  /* büyük bayrak direği */
  b.add(cyl(.025, .03, 1.9, 5, true), C.wood, 0, KH + .95, KZ);
  b.add(sph(.06, 8, 6), C.gold, 0, KH + 1.92, KZ);
}

/* kırık taş yığını */
function rubble(b, cx, cz, rad, n, big) {
  var R = b.R, i;
  for (i = 0; i < n; i++) {
    var a = R() * PI * 2, d = Math.sqrt(R()) * rad, sz = .1 + R() * (big || .2), hy = sz * (.6 + R() * .6);
    var px = cx + Math.cos(a) * d, pz = cz + Math.sin(a) * d, py = hy / 2 + (d < rad * .4 && R() < .5 ? sz * .6 : 0);
    b.add(box(sz, hy, sz * (.8 + R() * .5)), R() < .3 ? C.stone2 : (R() < .5 ? C.stone : C.mortar), px, py, pz, (R() - .5) * .6, R() * PI, (R() - .5) * .6);
  }
}

function castleGeo(stage) {
  var b = new Bld(), R; b.jit = .05; b.R = R = rng(100 + stage * 31);
  var i;
  /* zemin: avlu ve kapı önü */
  b.add(boxU(WX * 2, .05, WZ * 2), C.dirt, 0, .025, 0);
  var wm = [0, .16, .45][stage], tm = [0, .16, .45][stage];
  var G = [[], [[-2.65, -1.7, .5]], [[-2.8, -1.5, .25]]][stage];
  var FR = [[], [], [[1.6, 2.7, .45]]][stage];
  var LWg = [[], [], [[-.5, 1.1, .45]]][stage];
  var BKg = [[], [], [[.6, 1.7, .3]]][stage];
  var sootFL = [[], [[-2.9, 1.2, .3, .5]], [[-3.0, 1.1, .3, .6]]][stage];
  var sootFR = [[], [], [[3.0, 1.1, .3, .6]]][stage];
  var sootLW = [[], [], [[-1.2, 1.1, .3, .6]]][stage];
  wall(b, { axis: 'x', fixed: WZ, ry: 0, s: 1, w0: -WX, w1: -GXc - GW / 2, clip: [-WX + .7, -GXc - GW / 2], gaps: G, miss: wm, banners: [-2.0], soot: sootFL });
  wall(b, { axis: 'x', fixed: WZ, ry: 0, s: 1, w0: GXc + GW / 2, w1: WX, clip: [GXc + GW / 2, WX - .7], gaps: FR, miss: wm, banners: [2.0], soot: sootFR });
  wall(b, { axis: 'x', fixed: -WZ, ry: PI, s: -1, w0: -WX, w1: WX, clip: [-WX + .7, WX - .7], gaps: BKg, miss: wm, banners: [-1.9, 1.9], soot: [] });
  wall(b, { axis: 'z', fixed: -WX, ry: -PI / 2, s: 1, w0: -WZ, w1: WZ, clip: [-WZ + .7, WZ - .7], gaps: LWg, miss: wm, banners: [-1.2, 1.5], soot: sootLW });
  wall(b, { axis: 'z', fixed: WX, ry: PI / 2, s: -1, w0: -WZ, w1: WZ, clip: [-WZ + .7, WZ - .7], gaps: [], miss: wm, banners: [-1.2, 0.2, 1.5], soot: [] });
  /* köşe kuleleri */
  var tw = [[-1, 1], [1, 1], [-1, -1], [1, -1]];
  tw.forEach(function (c, idx) {
    var A = Math.atan2(c[0], c[1]), o = { x: c[0] * WX, z: c[1] * WZ, slits: [-.7, 0, .7], slitA: A, miss: tm, pennant: true };
    if (stage === 2 && idx === 0) { o.h = 2.15; o.broken = true; o.gapA = 1; o.rx = .1; o.rz = .13; o.pennant = false; }
    else if (stage === 2 && idx === 3) { o.h = 2.3; o.broken = true; o.gapA = 3; o.pennant = false; }
    else if (stage === 1 && idx === 0) { o.miss = .35; }
    tower(b, o);
  });
  gatehouse(b, { missL: stage === 0 ? 0 : tm + .1, missR: stage === 0 ? 0 : tm, noPennant: stage === 2 });
  keep(b, { missK: stage === 0 ? 0 : tm, brokenK: stage === 2 ? [1, 2] : null });
  /* avlu yapıları: taraf renkli çatılar */
  [-1, 1].forEach(function (sx) {
    var x = sx * 2.55;
    b.add(boxU(.95, .72, 1.8), C.stone2, x, .36, -.9);
    b.add(box(1.05, .06, 1.95), 'c', x, .8, -.9, 0, 0, -sx * .0);
    b.add(box(1.0, .1, .05), ['c', .7], x, .72, .1);
    b.add(box(.34, .4, .03), C.wood2, x - sx * 0.0, .22, .0 + .0 + .015 - .0, 0, 0, 0);
  });
  /* varil, kuyu */
  [[-1.1, 1.3], [-.8, 1.55], [1.2, 1.4]].forEach(function (p) { b.add(cyl(.11, .1, .22, 8), C.wood, p[0], .13, p[1]); b.add(cyl(.112, .112, .02, 8, true), C.iron, p[0], .13, p[1]); });
  b.add(cyl(.26, .27, .3, 10, true), C.stone2, 1.2, .15, -1.4); b.add(disc(.2, 10), C.dark, 1.2, .26, -1.4, -PI / 2);
  b.add(box(.04, .5, .04), C.wood, 1.0, .55, -1.4); b.add(box(.04, .5, .04), C.wood, 1.4, .55, -1.4); b.add(box(.5, .05, .1), 'c', 1.2, .84, -1.4);
  /* hasar: taş yığınları */
  if (stage === 1) {
    rubble(b, -2.15, 3.15, .65, 14); rubble(b, -2.15, 1.95, .5, 8); rubble(b, -3.95, 3.2, .5, 6);
  } else if (stage === 2) {
    rubble(b, -2.15, 3.2, .9, 20, .26); rubble(b, -2.15, 1.9, .7, 12); rubble(b, -4.4, 3.5, .8, 10, .3);
    rubble(b, 2.15, 3.1, .65, 12); rubble(b, 2.15, 2.0, .5, 7);
    rubble(b, -3.95, .3, .7, 12); rubble(b, -2.85, .3, .5, 8);
    rubble(b, 1.15, -3.15, .6, 9); rubble(b, 1.15, -2.0, .5, 7); rubble(b, 4.0, -3.4, .65, 9, .26);
    rubble(b, .5, 3.9, .3, 5);
  }
  /* is lekeleri (kule tepeleri) */
  if (stage > 0) {
    b.add(box(.3, .45, .012), C.soot, 1.3, 2.05, GF + .016);
    b.add(box(.3, .6, .012), C.soot, 0, 3.4, KZ + KW / 2 + .016);
  }
  return b.build();
}

/* bayrak: dalgalanabilen küçük ağ */
var FLAG_W = 1.0, FLAG_H = .6, FW_SEG = 8, FH_SEG = 3;
function makeFlagGeo() {
  var g = new T.PlaneGeometry(FLAG_W, FLAG_H, FW_SEG, FH_SEG); g.translate(FLAG_W / 2, 0, 0);
  var P = g.attributes.position, n = P.count, col = new Float32Array(n * 3), i;
  g.userData = { base: new Float32Array(P.array) };
  for (i = 0; i < n; i++) {
    var y = P.getY(i), k = y < -.05 ? .78 : (y > FLAG_H / 2 - .06 ? .55 + .45 : 1);
    var edge = (y > FLAG_H / 2 - .045 || y < -FLAG_H / 2 + .045) ? .62 : 1;
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = Math.min(1, k * (edge < 1 ? .75 : 1));
  }
  g.setAttribute('color', new T.BufferAttribute(col, 3));
  return g;
}
var DOME_GEO = null, DOME_MAT_PROTO = null;

function castle(colorHex) {
  var hex = colorHex == null ? NEUTRAL : colorHex;
  var g = new T.Group(), mats = [vc(), clanMat(hex)];
  var mesh = new T.Mesh(geo('castle0', function () { return castleGeo(0); }), mats);
  g.add(mesh);
  var fgeo = makeFlagGeo(), flag = new T.Mesh(fgeo, flagMat(hex));
  flag.position.set(.03, KH + 1.55, KZ); flag.frustumCulled = false; g.add(flag);
  var dome = new T.Mesh(DOME_GEO || (DOME_GEO = new T.SphereGeometry(1, 28, 14, 0, PI * 2, 0, PI / 2)),
    new T.MeshBasicMaterial({ color: 0x27c2b3, transparent: true, opacity: .2, depthWrite: false, side: T.DoubleSide }));
  dome.scale.set(5.5, 5.4, 4.6); dome.visible = false; dome.renderOrder = 5; g.add(dome);
  var ud = g.userData, lastStage = 0;
  ud.stage = 0; ud.gate = new T.Vector3(0, 0, GATE_Z); ud.wallZ = GF; ud.height = KH + 1.9;
  ud.setDamage = function (f) {
    var st = f > .66 ? 0 : f > .33 ? 1 : f > 0 ? 2 : 3, gi = Math.min(st, 2);
    ud.stage = st; flag.visible = st < 3;
    var key = 'castle' + gi; mesh.geometry = geo(key, function () { return castleGeo(gi); });
    if (gi !== lastStage) lastStage = gi;
  };
  ud.setColor = function (h) { h = h == null ? NEUTRAL : h; mesh.material = [vc(), clanMat(h)]; flag.material = flagMat(h); };
  ud.setShield = function (on) { dome.visible = !!on; };
  var base = fgeo.userData.base, P = fgeo.attributes.position, fr = 0;
  ud.tick = function (t) {
    if (flag.visible) {
      for (var i = 0; i < P.count; i++) {
        var x = base[i * 3], y = base[i * 3 + 1], k = x / FLAG_W;
        P.setZ(i, Math.sin(x * 6.5 - t * 5) * .09 * k + Math.sin(x * 3 - t * 3.1 + y * 2) * .035 * k);
        P.setY(i, y - Math.sin(x * 6.5 - t * 5) * .012 * k);
      }
      P.needsUpdate = true; if ((fr++ & 1) === 0) fgeo.computeVertexNormals();
    }
    if (dome.visible) dome.material.opacity = .17 + .07 * Math.sin(t * 3);
  };
  ud.dispose = function () { fgeo.dispose(); dome.material.dispose(); };
  INST.push(ud);
  return g;
}

/* ═════════════════════════ BİRLİKLER ═════════════════════════ */
/* asker gövdesi (orta çağ İngiliz piyadesi); hi = ayrıntılı lider */
function fig(b, o) {
  o = o || {};
  var hi = !!o.hi, s = hi ? 10 : 6, ls = hi ? 7 : 5, k;
  if (!o.mounted) {
    for (var q = 0; q < 2; q++) {
      var x = q ? .085 : -.085;
      b.add(box(.1, .07, .21), C.boot, x, .035, .03);
      b.add(cyl(.082, .068, .3, ls, true), C.hose, x, .22, 0);
    }
  }
  b.add(lathe([[.21, .3], [.21, .42], [.15, .54], [.18, .7], [.2, .76], [.1, .83], [.001, .83]], s), 'c');
  b.add(cyl(.17, .17, .045, s, true), C.leather, 0, .52, 0);
  if (hi) { b.add(box(.1, .15, .02), C.gold, 0, .64, .195, -.1); b.add(box(.3, .5, .03), ['c', .6], 0, .55, -.2, .12); b.add(box(.04, .3, .05), C.steel, -.17, .4, -.1, .5); b.add(box(.12, .025, .04), C.gold, -.2, .53, -.1, .5); }
  for (k = -1; k <= 1; k += 2) {
    b.add(cyl(.05, .042, .3, 5, true), ['c', .75], k * .235, .63, .02, 0, 0, k * .28);
    b.add(sph(.048, 5, 4), C.skin, k * .285, .48, .04);
  }
  b.add(sph(.115, s, hi ? 7 : 5), C.skin, 0, .93, 0);
  if (hi) { for (var e = -1; e <= 1; e += 2) b.add(sph(.014, 4, 3), C.dark, e * .045, .945, .105); b.add(box(.12, .03, .03), C.hair, 0, .9, .108); }
  if (o.helm === 'great') {
    b.add(cyl(.135, .14, .24, s, true), C.steel, 0, .97, 0); b.add(disc(.135, s), C.steel, 0, 1.09, 0, -PI / 2);
    b.add(box(.14, .025, .03), C.dark, 0, .98, .135); b.add(box(.025, .12, .03), C.dark, 0, .96, .138);
    b.add(box(.04, .18, .26), 'c', 0, 1.2, -.02, -.25);
  } else {
    b.add(new T.SphereGeometry(.14, s, 3, 0, PI * 2, 0, PI / 2), C.steel, 0, .965, 0);
    b.add(cyl(.145, .22, .05, s, true), C.steel, 0, .975, 0);
    if (hi) b.add(box(.03, .1, .02), C.steel, 0, .93, .14);
  }
  if (!o.noShield) {
    b.add(box(.28, .2, .03), ['c', .92], -.3, .66, .08);
    b.add(cyl(.162, .162, .03, 3), ['c', .92], -.3, .56, .08, PI / 2);
    if (hi) { b.add(box(.04, .38, .04), C.gold, -.3, .6, .1); b.add(box(.22, .04, .04), C.gold, -.3, .66, .1); }
  }
  if (!o.noSpear) {
    b.add(cyl(.014, .014, 1.35, 4, true), C.wood, .29, .72, .07);
    b.add(cone(.04, .16, 5), C.steel, .29, 1.47, .07);
    if (hi) b.add(box(.014, .1, .22), 'c', .29, 1.28, -.05);
  }
}

function buildPiyade() { var b = new Bld(); b.push(0, 0, 0, 0, 0, 0, .8);
  b.add(cyl(.28, .28, .01, 12), C.shade, 0, .006, 0); fig(b, { hi: true, helm: 'great' });
  [[.58, -.62], [-.58, -.62]].forEach(function (p) { b.push(p[0], 0, p[1]); b.add(cyl(.28, .28, .01, 9), C.shade, 0, .006, 0); fig(b, {}); b.pop(); });
  b.pop(); return b.build(); }
function buildMilis() { var b = new Bld(); b.push(0, 0, 0, 0, 0, 0, .8); b.add(cyl(.26, .26, .01, 9), C.shade, 0, .006, 0); fig(b, {}); b.pop(); return b.build(); }

function buildSuvari() {
  var b = new Bld(), H = C.horse, x;
  b.push(0, 0, 0, 0, 0, 0, .8);
  b.add(cyl(.4, .4, .01, 14), C.shade, 0, .006, 0, 0, 0, 0, 1, 1, 1.6);
  b.add(sph(.2, 9, 6), H, 0, .68, 0, 0, 0, 0, 1, 1, 2.1); b.add(sph(.19, 7, 5), H, 0, .72, .3); b.add(sph(.2, 7, 5), H, 0, .7, -.3);
  b.add(cyl(.09, .14, .46, 7, true), H, 0, .98, .47, .6); b.add(cyl(.062, .1, .3, 7, true), H, 0, 1.19, .7, 1.95); b.add(sph(.064, 7, 5), H, 0, 1.14, .84);
  for (x = -.05; x <= .05; x += .1) b.add(cone(.03, .1, 4), H, x, 1.35, .6);
  b.add(box(.04, .42, .1), C.hair, 0, 1.05, .4, .6); b.add(box(.04, .1, .08), C.hair, 0, 1.3, .66, .3); b.add(box(.045, .14, .03), C.white, 0, 1.2, .79, 1.95 - PI / 2);
  b.add(box(.12, .12, .05), C.steel, 0, 1.31, .78, 1.95 - PI / 2);
  for (var q = 0; q < 2; q++) {
    x = q ? .11 : -.11;
    b.add(cyl(.06, .048, .3, 5, true), H, x, .46, .37, -.4); b.add(cyl(.04, .036, .28, 5, true), H, x, .2, .47, .1); b.add(cyl(.045, .052, .07, 5, true), C.hair, x, .035, .46);
    b.add(cyl(.065, .05, .3, 5, true), H, x, .46, -.36, .4); b.add(cyl(.04, .036, .28, 5, true), H, x, .2, -.47, -.12); b.add(cyl(.045, .052, .07, 5, true), C.hair, x, .035, -.45);
  }
  b.add(cyl(.05, .02, .42, 5, true), C.hair, 0, .6, -.57, .75);
  /* örtü (kaparison) */
  for (q = 0; q < 2; q++) { x = q ? .215 : -.215; b.add(box(.03, .34, .56), 'c', x, .6, -.02); b.add(box(.036, .04, .56), C.gold, x, .43, -.02); }
  b.add(box(.42, .04, .56), ['c', .82], 0, .87, -.02); b.add(box(.26, .07, .3), C.wood2, 0, .92, -.02); b.add(box(.2, .1, .05), C.wood2, 0, .97, -.17);
  for (q = 0; q < 2; q++) { x = q ? .2 : -.2; b.add(cyl(.07, .06, .32, 5, true), C.hose, x, .78, .06, -.35); b.add(box(.09, .09, .18), C.boot, x, .62, .14); }
  b.push(0, .6, -.02); fig(b, { hi: true, mounted: true, helm: 'great', noSpear: true }); b.pop();
  /* mızrak + flama */
  b.add(cyl(.018, .018, 1.9, 4, true), C.wood, .3, 1.3, .35, 1.1); b.add(cone(.045, .18, 5), C.steel, .3, 1.8, 1.27, 1.1);
  b.add(box(.015, .16, .34), 'c', .3, 1.56, 1.0, 1.1); b.add(box(.016, .035, .34), C.gold, .3, 1.63, .97, 1.1);
  b.pop(); return b.build();
}

function buildMancinikBody() {
  var b = new Bld(), i, k;
  b.add(cyl(.9, .9, .01, 14), C.shade, 0, .006, 0, 0, 0, 0, 1, 1, 1.3);
  /* alt çerçeve */
  [-.5, .5].forEach(function (x) { b.add(box(.11, .11, 1.9), C.wood, x, .32, 0); });
  [-.75, .75].forEach(function (z) { b.add(box(1.2, .1, .1), C.wood2, 0, .32, z); });
  b.add(box(.8, .03, 1.3), 'c', 0, .39, 0);
  /* A çerçeveleri */
  [-.5, .5].forEach(function (x) {
    b.rod(x, .32, -.6, x, 1.45, 0, .05, C.wood, 5); b.rod(x, .32, .6, x, 1.45, 0, .05, C.wood, 5);
    b.add(box(.12, .1, .26), C.iron, x, 1.45, 0);
    b.add(box(.08, .08, .6), C.wood2, x, .7, 0, 0, 0, 0);
  });
  b.add(cyl(.03, .03, 1.2, 6, true), C.iron, 0, 1.45, 0, 0, 0, PI / 2);
  /* tekerlekler */
  [-.64, .64].forEach(function (x) { [-.62, .62].forEach(function (z) {
    b.push(x, .3, z); b.add(tor(.28, .04, PI * 2, 5, 14), C.wood2, 0, 0, 0, 0, PI / 2, 0); b.add(tor(.31, .012, PI * 2, 4, 14), C.iron, 0, 0, 0, 0, PI / 2, 0);
    for (i = 0; i < 4; i++) b.add(box(.05, .56, .05), C.wood, 0, 0, 0, i * PI / 4, 0, 0);
    b.add(cyl(.06, .06, .12, 6, true), C.bronze, 0, 0, 0, 0, 0, PI / 2); b.pop(); }); });
  /* mühimmat yığını + varil */
  b.add(sph(.09, 6, 4), C.mortar, -.9, .09, .5); b.add(sph(.09, 6, 4), C.mortar, -.78, .09, .62); b.add(sph(.09, 6, 4), C.mortar, -.84, .26, .56);
  /* mürettebat */
  b.push(.95, 0, -.5, 0, -.5, 0, .85); fig(b, { noSpear: true, noShield: true }); b.add(cyl(.016, .016, 1.1, 4, true), C.wood, .3, .62, .1, .5); b.pop();
  /* ip */
  b.rod(.95, .6, -.35, .5, 1.1, -.55, .01, C.leather, 3);
  return b.build();
}
/* kol: pivot (0,0,0) = dingil; +y uzun kol (sapan ucu), -y kısa kol (karşı ağırlık) */
function buildMancinikArm() {
  var b = new Bld();
  b.add(cyl(.03, .055, 2.0, 6, true), C.wood, 0, .55, 0);
  [-.05, .05].forEach(function (x) { b.add(box(.02, .5, .13), C.iron, x, 0, 0); });
  [.4, 1.0, 1.45].forEach(function (y) { b.add(cyl(.062, .062, .05, 6, true), C.iron, 0, y, 0); });
  /* karşı ağırlık kasası */
  b.add(box(.42, .34, .32), C.wood2, 0, -.7, 0); b.add(box(.38, .1, .34), 'c', 0, -.58, 0);
  b.add(box(.44, .04, .34), C.iron, 0, -.86, 0); b.add(box(.44, .04, .34), C.iron, 0, -.54, 0);
  /* sapan */
  b.rod(0, 1.55, 0, 0, 1.1, 0, .012, C.leather, 3);
  b.add(box(.14, .06, .14), C.leather, 0, 1.08, 0);
  b.add(box(.016, .2, .28), 'c', 0, 1.62, 0);
  return b.build();
}

function buildMehter() {
  var b = new Bld(); b.push(0, 0, 0, 0, 0, 0, .85);
  b.add(cyl(.42, .42, .01, 14), C.shade, 0, .006, 0);
  b.add(lathe([[.3, 0], [.3, .05], [.2, .5], [.17, .62], [.21, .8], [.22, .88], [.1, .96], [.001, .96]], 12), 'c'); b.add(cyl(.306, .306, .05, 12, true), C.gold, 0, .03, 0);
  b.add(box(.05, .6, .02), C.gold, 0, .32, .245, -.17); b.add(cyl(.186, .186, .07, 12, true), C.red, 0, .62, 0);
  for (var k = -1; k <= 1; k += 2) { b.add(cyl(.056, .05, .32, 6, true), ['c', .8], k * .22, .74, .13, -1); b.add(sph(.052, 6, 5), C.skin, k * .22, .66, .27); }
  b.add(sph(.14, 10, 8), C.skin, 0, 1.1, 0); for (var e = -1; e <= 1; e += 2) b.add(sph(.02, 5, 4), C.hair, e * .05, 1.13, .125);
  b.add(box(.15, .03, .03), C.hair, 0, 1.05, .128); b.add(box(.045, .035, .03), C.skin, 0, 1.09, .14);
  b.add(sph(.21, 12, 8), C.white, 0, 1.31, 0, 0, 0, 0, 1, .82, 1); for (var i = 0; i < 6; i++) b.add(tor(.205, .012, PI, 4, 12), ['c', .9], 0, 1.31, 0, 0, i * PI / 6, 0, 1, .82, 1);
  b.add(cyl(.07, .1, .15, 8, true), C.red, 0, 1.5, 0); b.add(box(.03, .16, .02), C.gold, 0, 1.42, .2);
  b.push(0, .56, .44, .5); b.add(lathe([[.001, -.26], [.12, -.24], [.22, -.14], [.27, 0], [.28, .03]], 14), C.copper); b.add(cyl(.272, .272, .02, 14), C.white, 0, .035, 0); b.add(tor(.276, .02, PI * 2, 5, 16), C.gold, 0, .03, 0, PI / 2);
  for (i = 0; i < 8; i++) { var a = i / 8 * PI * 2; b.add(sph(.022, 5, 4), C.gold, Math.sin(a) * .25, -.07, Math.cos(a) * .25); } b.pop();
  /* sancak */
  b.push(-.52, 0, -.1); b.add(cyl(.022, .022, 2.1, 6, true), C.wood, 0, 1.05, 0); b.add(sph(.07, 8, 6), C.gold, 0, 2.13, 0); b.add(tor(.11, .03, 4.4, 5, 10), C.gold, 0, 2.31, 0, 0, 0, 2.5);
  b.add(cone(.1, .46, 6), C.red, 0, 1.8, 0, PI); b.add(cyl(.105, .105, .04, 8, true), C.gold, 0, 2.03, 0);
  b.add(box(.4, .5, .02), 'c', .23, 1.38, 0); b.add(box(.4, .04, .026), C.gold, .23, 1.12, 0); b.add(box(.4, .04, .026), C.gold, .23, 1.64, 0); b.add(tor(.07, .02, 4.4, 5, 10), C.gold, .23, 1.38, .012, 0, 0, 2.5); b.pop();
  b.pop(); return b.build();
}
var STICK_GEO = null, STICK_MAT = null, STONE_GEO = null, STONE_MAT = null;

/* basit hareket: gövdeyi (iç Group) oynatır; dış Group oyunun elindedir */
function wobble(body, t, state, a) {
  var s = Math.sin(t * a.f);
  if (state === 'walk') { body.position.set(0, Math.abs(s) * a.bob, 0); body.rotation.set(0, 0, s * a.sway); }
  else if (state === 'fight') { var l = Math.max(0, Math.sin(t * a.f * .8)); body.position.set(0, Math.abs(s) * a.bob * .3, l * a.lunge); body.rotation.set(l * a.lean, Math.sin(t * a.f * .4) * .06, 0); }
  else { body.position.set(0, Math.sin(t * 2) * .012, 0); body.rotation.set(0, 0, Math.sin(t * 1.3) * .012); }
}

function unit(type, colorHex) {
  var hex = colorHex == null ? NEUTRAL : colorHex, mats = [vc(), clanMat(hex)];
  var g = new T.Group(), body = new T.Group(); g.add(body);
  var ud = g.userData, arm = null, sticks = null;
  ud.type = type;
  var M = function (name, fn) { return new T.Mesh(geo(name, fn), mats); };
  if (type === 'piyade') { body.add(M('piyade', buildPiyade)); ud.height = 1.3; ud.anim = { f: 9, bob: .04, sway: .04, lunge: .16, lean: .16 }; }
  else if (type === 'milis') { body.add(M('milis', buildMilis)); ud.height = 1.2; ud.anim = { f: 9, bob: .04, sway: .04, lunge: .14, lean: .16 }; }
  else if (type === 'suvari') { body.add(M('suvari', buildSuvari)); ud.height = 2.0; ud.anim = { f: 12, bob: .07, sway: .0, lunge: .2, lean: -.12, pitch: .06 }; }
  else if (type === 'mancinik') {
    body.add(M('mancinikB', buildMancinikBody));
    arm = new T.Group(); arm.position.set(0, 1.45, 0); arm.add(M('mancinikA', buildMancinikArm)); body.add(arm);
    ud.height = 2.1; ud.anim = { f: 7, bob: .015, sway: .015, lunge: 0, lean: 0 };
  } else if (type === 'mehter') {
    body.add(M('mehter', buildMehter));
    STICK_GEO = STICK_GEO || cyl(.018, .03, .26, 5); STICK_MAT = STICK_MAT || new T.MeshPhongMaterial({ color: C.wood });
    sticks = [-.2, .2].map(function (x) { var s = new T.Mesh(STICK_GEO, STICK_MAT); s.position.set(x * .85, .68, .38); s.rotation.x = 1; body.add(s); return s; });
    ud.height = 2.2; ud.anim = { f: 8, bob: .03, sway: .03, lunge: .1, lean: .1 };
  } else { throw new Error('bilinmeyen birlik tipi: ' + type); }
  var A = ud.anim;
  ud.animate = function (t, state) {
    if (type === 'suvari') {
      var s = Math.sin(t * A.f);
      if (state === 'walk') { body.position.set(0, Math.abs(s) * A.bob, 0); body.rotation.set(s * A.pitch, 0, 0); }
      else if (state === 'fight') { var l = Math.max(0, Math.sin(t * 7)); body.position.set(0, l * .08, l * A.lunge); body.rotation.set(-l * .14, Math.sin(t * 3) * .05, 0); }
      else { body.position.set(0, Math.sin(t * 2) * .012, 0); body.rotation.set(Math.sin(t * 1.5) * .01, 0, 0); }
      return;
    }
    wobble(body, t, state, A);
    if (arm) {
      var rest = -1.75, thrown = .85, p;
      if (state === 'fight') {
        p = (t % 3) / 3;
        if (p < .5) arm.rotation.x = rest + Math.sin(p * 12) * .02;
        else if (p < .62) { var u = (p - .5) / .12; arm.rotation.x = rest + (thrown - rest) * (u * u * (3 - 2 * u)); }
        else { var v = Math.min(1, (p - .62) / .38); arm.rotation.x = thrown + (rest - thrown) * (v * v * (3 - 2 * v)); }
      } else arm.rotation.x = rest;
    }
    if (sticks) { var hit = state === 'idle' ? .3 : 1; sticks[0].rotation.x = 1 + Math.sin(t * 14) * .45 * hit; sticks[1].rotation.x = 1 + Math.sin(t * 14 + PI) * .45 * hit; }
  };
  ud.setColor = function (h) { mats[1] = clanMat(h); };
  ud.animate(0, 'idle');
  return g;
}

/* mancınık taşı */
function stone() {
  STONE_GEO = STONE_GEO || new T.IcosahedronGeometry(.14, 1);
  STONE_MAT = STONE_MAT || new T.MeshPhongMaterial({ color: 0x6c6a62, flatShading: true, shininess: 6 });
  return new T.Mesh(STONE_GEO, STONE_MAT);
}

/* ───────── galeri kataloğu (Türkçe metin) ───────── */
var catalog = [
  { id: 'kale', name: 'İngiliz Kalesi', trigger: 'Her şehir', desc: 'Mazgallı perde suru, dört yuvarlak köşe kulesi, kapı binası ve iç kale. Can azaldıkça sur gedikleri açılır.', make: function () { return castle(0xe8b04a); } },
  { id: 'milis', name: 'Kale Milisi', trigger: 'Otomatik (4 sn\'de bir)', desc: 'Kale kendiliğinden 3 güçlük milis çıkarır; yol hiç boş kalmaz.', make: function () { return unit('milis', 0x3ac2e8); } },
  { id: 'piyade', name: 'Piyade Bölüğü', trigger: 'Beğeni (6 güç) · 1–9 elmas', desc: 'Önde lider, arkada iki asker. İzleyicinin adını taşır; elmas arttıkça güçlenir.', make: function () { return unit('piyade', 0xe8553a); } },
  { id: 'suvari', name: 'Şövalye Süvarisi', trigger: '10–99 elmas', desc: 'İki kat hızlı, güçlü atlı şövalye; mızrağında tarafın flaması dalgalanır.', make: function () { return unit('suvari', 0x7bd44a); } },
  { id: 'mancinik', name: 'Mancınık', trigger: '100–999 elmas', desc: 'Sura menzilden taş atar; sur hasarı yüksektir. 3 saniyede bir atış yapar.', make: function () { return unit('mancinik', 0xb06ae8); } },
  { id: 'mehter', name: 'Mehter / Kral Çağrısı', trigger: '1000+ elmas', desc: '12 sn boyunca tarafın tüm hasarı +%50, 5 dalga piyade ve surlara 150 onarım.', make: function () { return unit('mehter', 0xf2b632); } },
  { id: 'kalkan', name: 'Kale Kalkanı', trigger: 'Takip', desc: 'Kendi surlarına 8 sn kalkan ve 40 onarım. Turkuaz kubbe düşman hasarını keser.', make: function () { var c = castle(0x3ac2e8); c.userData.setShield(true); return c; } }
];

function dispose() {
  Object.keys(GEO).forEach(function (k) { GEO[k].dispose(); delete GEO[k]; });
  Object.keys(MATS).forEach(function (k) { MATS[k].dispose(); delete MATS[k]; });
  Object.keys(FLAGM).forEach(function (k) { FLAGM[k].dispose(); delete FLAGM[k]; });
  if (VC) { VC.dispose(); VC = null; }
  if (DOME_GEO) { DOME_GEO.dispose(); DOME_GEO = null; }
  if (STICK_GEO) { STICK_GEO.dispose(); STICK_GEO = null; }
  if (STICK_MAT) { STICK_MAT.dispose(); STICK_MAT = null; }
  if (STONE_GEO) { STONE_GEO.dispose(); STONE_GEO = null; }
  if (STONE_MAT) { STONE_MAT.dispose(); STONE_MAT = null; }
  INST.forEach(function (u) { if (u.dispose) u.dispose(); }); INST.length = 0;
}

MF.models = { castle: castle, unit: unit, stone: stone, catalog: catalog, dispose: dispose };
})();
