/* Memleket Fethi v3 - orneklemeli (instanced) birlikler.  three.js r128 (global) gerekir.
   MF.units: TYPES, createArmy({max,quality}), preview(type,hex), info.
   Tum modeller +Z'ye bakar, ayak tabani y=0. Her parca tek BufferGeometry (position, normal, color, aTeam),
   yerel orijini eklem noktasidir. Taraf rengi: renk = mix(koseRengi, tarafRengi, aTeam).
   yaw: Y ekseninde radyan (three.js standardi, +z -> +x).  phase: radyan (0..2PI). k: 'fire' ve 'die' ilerlemesi 0..1. */
(function () {
'use strict';
var MF = (window.MF = window.MF || {});
var T = window.THREE;
if (!T) { throw new Error('units.js: THREE bulunamadi'); }
var PI = Math.PI, sin = Math.sin, cos = Math.cos, abs = Math.abs, max = Math.max, min = Math.min;

var K = { steel: 0xaab6be, steelD: 0x6f7f8a, steelL: 0xdfe8ee, leather: 0x6b4226, cloth: 0x2b2f3a, skin: 0xe0a878, gold: 0xf2b632,
  wood: 0x8a5a2e, woodD: 0x5a3a1c, bronze: 0xa9782f, linen: 0xc9b48a, iron: 0x3c424a, white: 0xeeeadc, horse: 0x6a4026,
  horseD: 0x2a1b14, hoof: 0x2a2420, copper: 0xb8692e, black: 0x15161a };

/* ───────── geometri yardimcilari ───────── */
function cyl(rt, rb, h, s, open) { return new T.CylinderGeometry(rt, rb, h, s || 8, 1, !!open); }
function box(w, h, d) { return new T.BoxGeometry(w, h, d); }
function sph(r, w, h) { return new T.SphereGeometry(r, w || 6, h || 4); }
function cone(r, h, s, open) { return new T.ConeGeometry(r, h, s || 5, 1, !!open); }
var UPV = new T.Vector3(0, 1, 0), _v = new T.Vector3(), _q = new T.Quaternion(), _m = new T.Matrix4(), _e = new T.Euler(), _s = new T.Vector3(), _p = new T.Vector3();
/* p1'den p2'ye koniklesen cubuk: r1 p1'de, r2 p2'de */
function rodGeo(p1, p2, r1, r2, seg, open) {
  _v.set(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]); var len = _v.length();
  var g = new T.CylinderGeometry(r2, r1, len, seg || 6, 1, !!open);
  _q.setFromUnitVectors(UPV, _v.normalize()); g.applyMatrix4(_m.makeRotationFromQuaternion(_q));
  g.translate((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2); return g;
}

function Bld(pv, H) { this.P = []; this.N = []; this.C = []; this.A = []; this.st = [new T.Matrix4()]; this.pv = pv || [0, 0, 0]; this.H = H || 1; this.J = []; }
Bld.prototype = {
  push: function (x, y, z, rx, ry, rz) {
    _m.compose(_p.set(x || 0, y || 0, z || 0), _q.setFromEuler(_e.set(rx || 0, ry || 0, rz || 0)), _s.set(1, 1, 1));
    this.st.push(this.st[this.st.length - 1].clone().multiply(_m)); return this;
  },
  pop: function () { this.st.pop(); return this; },
  joint: function (x, y, z, r, s) { this.J.push([x, y, z, r, s]); return this; },
  /* col: sayi=sabit renk; 't'=taraf rengi; ['t',a]=taraf rengi a oraninda (koyu ton); [hex,a]=hex ile taraf karisimi */
  add: function (geo, col, x, y, z, rx, ry, rz, sx, sy, sz) {
    var g = geo.index ? geo.toNonIndexed() : geo;
    sx = sx == null ? 1 : sx; sy = sy == null ? sx : sy; sz = sz == null ? sx : sz;
    _m.compose(_p.set(x || 0, y || 0, z || 0), _q.setFromEuler(_e.set(rx || 0, ry || 0, rz || 0)), _s.set(sx, sy, sz));
    g.applyMatrix4(_m.premultiply(this.st[this.st.length - 1]));
    var bc = 0, ta = 0;
    if (typeof col === 'number') { bc = col; } else if (col === 't') { ta = 1; } else if (col[0] === 't') { ta = col[1]; } else { bc = col[0]; ta = col[1]; }
    var c = new T.Color(bc), P = g.attributes.position.array, N = g.attributes.normal.array, i, n = P.length;
    for (i = 0; i < n; i++) { this.P.push(P[i]); this.N.push(N[i]); }
    for (i = 0; i < n; i += 3) { this.C.push(c.r, c.g, c.b); this.A.push(ta); }
    geo.dispose(); if (g !== geo) g.dispose(); return this;
  },
  limb: function (p1, p2, r1, r2, col, seg, open) { return this.add(rodGeo(p1, p2, r1, r2, seg, open == null ? true : open), col); },
  build: function () {
    var n = this.P.length / 3, i, j, H = this.H, pv = this.pv, P = this.P, C = this.C, A = this.A;
    for (i = 0; i < n; i++) {
      var y = P[i * 3 + 1], gy = max(0, min(1, y / H)), cm = .68 + .36 * gy, tm = .6 + .4 * gy;
      for (j = 0; j < this.J.length; j++) {
        var J = this.J[j], dx = P[i * 3] - J[0], dy = y - J[1], dz = P[i * 3 + 2] - J[2], d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < J[3]) { var f = 1 - J[4] * (1 - d / J[3]); cm *= f; tm *= f; }
      }
      C[i * 3] *= cm; C[i * 3 + 1] *= cm; C[i * 3 + 2] *= cm; A[i] = min(1, A[i] * tm);
    }
    for (i = 0; i < n; i++) { P[i * 3] -= pv[0]; P[i * 3 + 1] -= pv[1]; P[i * 3 + 2] -= pv[2]; }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(P, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(this.N, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(C, 3));
    g.setAttribute('aTeam', new T.Float32BufferAttribute(A, 1));
    g.computeBoundingSphere(); return g;
  }
};

/* ═════════════════════ MODELLER ═════════════════════ */
/* ortak govde: kafa, zirh, kalkan/kilic parcalari. y ofseti (binici icin) b.push ile verilir. */
function shieldKite(b, x, y, z) {
  b.add(box(.31, .2, .05), 't', x, y + .1, z);
  b.add(cyl(.18, .18, .05, 3), 't', x, y - .0, z, PI / 2, 0, 0, 1, 1, 1);
  b.add(box(.32, .045, .058), K.gold, x, y + .06, z);
  b.add(box(.045, .26, .058), K.gold, x, y - .02, z);
}
function paul(b, x, y, col) { b.add(sph(.105, 6, 3), col || K.steel, x, y, 0, 0, 0, 0, 1, .85, 1); }

/* piyade / komutan (komutan = great helm, tuy, pelerin, sanca, halka) */
var PV_INF = [[0, .26, 0], [.25, .54, 0], [-.25, .54, 0], [.1, .26, 0], [-.1, .26, 0]];
function infantryGeos(comm) {
  var G = [], b, pv = PV_INF;
  /* 0 govde+kafa */
  b = new Bld(pv[0], 1.05);
  b.add(cyl(.19, .165, .3, 8, true), ['t', .95], 0, .43, 0, 0, 0, 0, 1, 1, .8);
  b.add(cyl(.17, .22, .14, 8, true), ['t', .9], 0, .31, 0, 0, 0, 0, 1, 1, .85);
  b.add(cyl(.222, .226, .035, 8, true), K.gold, 0, .243, 0, 0, 0, 0, 1, 1, .85);
  if (!comm) {
    b.add(sph(.19, 8, 5), K.steel, 0, .79, 0, 0, 0, 0, 1, .95, 1.02);
    b.add(cyl(.2, .205, .04, 8, true), K.steelD, 0, .7, 0, 0, 0, 0, 1, 1, 1.02);
    b.add(box(.2, .035, .04), K.black, 0, .76, .178);
    b.add(box(.16, .1, .06), K.skin, 0, .655, .14);
    b.add(box(.05, .1, .3), 't', 0, .985, 0);
  } else {
    b.add(cyl(.175, .185, .36, 8), K.steel, 0, .8, 0, 0, 0, 0, 1, 1, 1.02);
    b.add(box(.22, .035, .04), K.black, 0, .83, .19);
    b.add(box(.03, .34, .035), K.gold, 0, .8, .19);
    b.add(box(.05, .06, .04), K.black, .06, .74, .19); b.add(box(.05, .06, .04), K.black, -.06, .74, .19);
    b.add(cyl(.19, .19, .03, 8, true), K.gold, 0, .62, 0, 0, 0, 0, 1, 1, 1.02);
    b.add(sph(.18, 8, 4), K.steel, 0, .97, 0, 0, 0, 0, 1, .55, 1);
    b.add(sph(.05, 5, 3), K.gold, 0, 1.06, 0);
    b.add(box(.07, .32, .14), 't', 0, 1.15, -.04, .18, 0, 0);
    b.add(box(.06, .16, .26), 't', 0, 1.0, -.1, -.35, 0, 0);
  }
  b.joint(0, .27, 0, .1, .35);
  G.push(b.build());
  /* 1 sol kol + kalkan (+x) */
  b = new Bld(pv[1], 1.05);
  paul(b, .25, .54, comm ? K.gold : K.steel);
  b.limb([.25, .54, 0], [.28, .29, .05], .07, .06, K.steelD, 6);
  b.add(sph(.08, 5, 4), K.leather, .28, .26, .07);
  shieldKite(b, .33, .39, .17);
  b.joint(.25, .54, 0, .08, .25);
  G.push(b.build());
  /* 2 sag kol + kilic (-x) */
  b = new Bld(pv[2], 1.05);
  paul(b, -.25, .54, comm ? K.gold : K.steel);
  b.limb([-.25, .54, 0], [-.28, .29, .05], .07, .06, K.steelD, 6);
  b.add(sph(.08, 5, 4), K.leather, -.28, .26, .07);
  b.push(-.28, .26, .07);
  b.add(box(.2, .035, .045), K.gold, 0, .1, .07, -.95, 0, 0);
  b.add(box(.08, .035, .46), K.steelL, 0, .23, .26, -.95, 0, 0);
  b.add(sph(.045, 4, 3), K.gold, 0, -.02, -.02);
  b.pop();
  b.joint(-.25, .54, 0, .08, .25);
  G.push(b.build());
  /* 3,4 bacaklar */
  [1, -1].forEach(function (sg, idx) {
    b = new Bld(pv[3 + idx], 1.05); var x = sg * .1;
    b.limb([x, .27, 0], [x, .12, .01], .088, .078, K.cloth, 6);
    b.limb([x, .2, .0], [x, .09, .02], .085, .075, K.steel, 6);
    b.add(box(.16, .11, .27), K.leather, x, .055, .05);
    b.joint(x, .26, 0, .08, .3);
    G.push(b.build());
  });
  if (comm) {
    /* 5 pelerin (omuzlarda eklem) */
    b = new Bld([0, .58, -.15], 1.05);
    b.add(box(.36, .26, .03), 't', 0, .44, -.17, .06, 0, 0);
    b.add(box(.46, .24, .03), ['t', .85], 0, .19, -.2, .12, 0, 0);
    b.add(box(.4, .045, .06), K.gold, 0, .585, -.15);
    G.push(b.build());
    /* 6 sirt sancagi */
    b = new Bld([0, .5, -.2], 1.5);
    b.add(cyl(.013, .013, .98, 5, true), K.wood, 0, .98, -.2);
    b.add(sph(.04, 5, 4), K.gold, 0, 1.5, -.2);
    b.add(box(.012, .25, .32), 't', 0, 1.34, -.2 - .17);
    b.add(box(.016, .04, .34), K.gold, 0, 1.46, -.2 - .17);
    G.push(b.build());
    /* 7 halka */
    b = new Bld([0, 0, 0], 1);
    var rg = new T.RingGeometry(.43, .58, 16); b.add(rg, 't', 0, .025, 0, -PI / 2, 0, 0);
    G.push(b.build());
  }
  return G;
}

/* ince asker: milis (kukuleta, mizrak, yuvarlak kalkan) ve topcu eri (kasket, onluk, harbi) */
var PV_SLIM = [[0, .26, 0], [.21, .52, 0], [-.21, .52, 0], [.085, .26, 0], [-.085, .26, 0]];
function slimGeos(kind) {
  var G = [], b, pv = PV_SLIM, mil = kind === 'milis';
  b = new Bld(pv[0], 1.0);
  b.add(cyl(.17, .15, .3, 7, true), mil ? K.linen : K.cloth, 0, .42, 0, 0, 0, 0, 1, 1, .8);
  b.add(cyl(.15, .185, .1, 7, true), mil ? K.linen : K.leather, 0, .3, 0, 0, 0, 0, 1, 1, .85);
  if (mil) {
    b.add(box(.075, .42, .02), 't', .02, .43, .125, 0, 0, .75);
    b.add(box(.3, .035, .2), 't', 0, .33, 0, 0, 0, 0, 1, 1, .85);
    b.add(sph(.17, 6, 4), ['t', .6], 0, .78, -.01, 0, 0, 0, 1.04, 1, 1.05);
    b.add(box(.15, .13, .06), K.skin, 0, .72, .12);
  } else {
    b.add(box(.2, .26, .03), K.leather, 0, .36, .13);
    b.add(box(.3, .045, .2), 't', 0, .36, 0, 0, 0, 0, 1, 1, .85);
    b.add(sph(.17, 7, 5), K.skin, 0, .77, 0, 0, 0, 0, 1, .97, 1);
    b.add(sph(.18, 7, 4), 't', 0, .81, -.01, 0, 0, 0, 1, .75, 1.02);
    b.add(box(.2, .035, .22), 't', 0, .81, .12);
    b.add(box(.17, .03, .03), K.cloth, 0, .74, .165);
  }
  b.joint(0, .27, 0, .1, .35);
  G.push(b.build());
  b = new Bld(pv[1], 1.0);   /* sol kol */
  b.limb([.21, .52, 0], [.24, .27, .05], .06, .052, mil ? ['t', .6] : K.cloth, 6);
  b.add(sph(.065, 5, 3), K.skin, .24, .245, .07);
  if (mil) {
    b.add(cyl(.17, .17, .05, 8), K.wood, .3, .36, .15, PI / 2, 0, 0);
    b.add(cyl(.065, .05, .04, 5), 't', .3, .36, .185, PI / 2, 0, 0);
  }
  b.joint(.21, .52, 0, .07, .25);
  G.push(b.build());
  b = new Bld(pv[2], 1.0);   /* sag kol */
  b.limb([-.21, .52, 0], [-.24, .27, .05], .06, .052, mil ? ['t', .6] : K.cloth, 6);
  b.add(sph(.065, 5, 3), K.skin, -.24, .245, .07);
  if (mil) {
    b.limb([-.24, .245, .07 - .08], [-.24, .245 + .62, .07 + .8], .022, .018, K.wood, 5);   /* mizrak */
    b.limb([-.24, .245 + .6, .07 + .78], [-.24, .245 + .8, .07 + 1.0], .045, .003, K.steelL, 5, false);
  } else {
    b.limb([-.24, .245, .07 - .45], [-.24, .245, .07 + .8], .021, .021, K.wood, 5);   /* harbi */
    b.add(cyl(.05, .05, .12, 6), K.iron, -.24, .245, .07 + .83, PI / 2, 0, 0);
  }
  b.joint(-.21, .52, 0, .07, .25);
  G.push(b.build());
  [1, -1].forEach(function (sg, idx) {
    b = new Bld(pv[3 + idx], 1.0); var x = sg * .085;
    b.limb([x, .27, 0], [x, .1, .01], .072, .064, mil ? K.linen : K.cloth, 6);
    b.add(box(.13, .1, .23), K.leather, x, .05, .045);
    b.joint(x, .26, 0, .07, .3);
    G.push(b.build());
  });
  return G;
}

/* mehter: davulcu */
function drummerGeos() {
  var G = [], b, pv = PV_INF;
  b = new Bld(pv[0], 1.1);
  b.add(cyl(.2, .17, .32, 8, true), ['t', .9], 0, .42, 0, 0, 0, 0, 1, 1, .85);
  b.add(cyl(.18, .24, .18, 8, true), K.white, 0, .29, 0, 0, 0, 0, 1, 1, .9);
  b.add(box(.32, .04, .22), K.gold, 0, .385, 0, 0, 0, 0, 1, 1, .85);
  b.add(sph(.16, 7, 5), K.skin, 0, .75, 0, 0, 0, 0, 1, .95, 1);
  b.add(sph(.2, 8, 5), K.white, 0, .86, -.01, 0, 0, 0, 1, .82, 1.02);   /* sarik */
  b.add(cyl(.2, .205, .07, 8, true), 't', 0, .79, 0, 0, 0, 0, 1, 1, 1.02);
  b.add(box(.14, .035, .05), K.black, 0, .72, .15);                      /* biyik */
    /* kos */
  b.add(cyl(.22, .19, .3, 10), K.copper, 0, .32, .33);
  b.add(cyl(.222, .222, .03, 10, true), K.gold, 0, .47, .33);
  b.add(cyl(.234, .27, .17, 10, true), 't', 0, .27, .33);
  b.add(new T.CircleGeometry(.21, 10), K.linen, 0, .472, .33, -PI / 2, 0, 0);
  b.joint(0, .27, 0, .1, .35);
  G.push(b.build());
  [1, -1].forEach(function (sg, idx) {
    b = new Bld(pv[1 + idx], 1.1); var x = sg * .25;
    b.add(sph(.1, 6, 4), K.white, x, .54, 0, 0, 0, 0, 1, .85, 1);
    b.limb([x, .54, 0], [x * 1.05, .27, .04], .07, .06, K.white, 6);
    b.add(sph(.07, 5, 4), K.skin, x * 1.05, .245, .06);
    b.limb([x * 1.05, .245, .06], [x * 1.05, .245, .06 - .24], .02, .02, K.wood, 4);
    b.add(sph(.065, 5, 4), K.bronze, x * 1.05, .245, .06 - .26);
    b.add(box(.07, .05, .02), 't', x * 1.05, .3, .06);
    b.joint(x, .54, 0, .08, .25);
    G.push(b.build());
  });
  [1, -1].forEach(function (sg, idx) {
    b = new Bld(pv[3 + idx], 1.1); var x = sg * .1;
    b.limb([x, .27, 0], [x, .11, .01], .1, .085, ['t', .8], 7);
    b.add(box(.16, .1, .26), K.leather, x, .05, .05);
    b.joint(x, .26, 0, .08, .3);
    G.push(b.build());
  });
  return G;
}
/* mehter: sancaktar */
function bearerGeos() {
  var G = [], b, pv = PV_INF;
  b = new Bld(pv[0], 1.1);
  b.add(cyl(.19, .165, .3, 8, true), ['t', .95], 0, .43, 0, 0, 0, 0, 1, 1, .8);
  b.add(cyl(.17, .22, .14, 8, true), ['t', .9], 0, .31, 0, 0, 0, 0, 1, 1, .85);
  b.add(cyl(.222, .226, .035, 8, true), K.gold, 0, .243, 0, 0, 0, 0, 1, 1, .85);
  b.add(box(.3, .035, .2), K.leather, 0, .395, 0, 0, 0, 0, 1, 1, .8);
  b.add(sph(.17, 7, 5), K.skin, 0, .76, 0, 0, 0, 0, 1, .95, 1);
  b.add(cone(.19, .3, 8), K.steel, 0, .94, 0);
  b.add(cyl(.19, .195, .05, 8, true), K.gold, 0, .8, 0);
  b.add(sph(.04, 4, 3), K.gold, 0, 1.1, 0);
  b.add(box(.13, .03, .04), K.black, 0, .7, .15);
  b.joint(0, .27, 0, .1, .35);
  G.push(b.build());
  b = new Bld(pv[1], 1.1);   /* sol kol: gerideki el */
  b.add(sph(.1, 6, 4), K.steel, .25, .54, 0, 0, 0, 0, 1, .85, 1);
  b.limb([.25, .54, 0], [-.08, .43, .17], .07, .06, K.steelD, 6);
  b.add(sph(.075, 5, 4), K.leather, -.1, .43, .19);
  b.joint(.25, .54, 0, .08, .25);
  G.push(b.build());
  b = new Bld(pv[2], 1.1);   /* sag kol + direk */
  b.add(sph(.1, 6, 4), K.steel, -.25, .54, 0, 0, 0, 0, 1, .85, 1);
  b.limb([-.25, .54, 0], [-.14, .55, .2], .07, .06, K.steelD, 6);
  b.add(sph(.075, 5, 4), K.leather, -.16, .56, .21);
  b.add(cyl(.024, .024, 2.2, 5, true), K.wood, -.16, 1.0, .21);
  b.add(sph(.065, 5, 4), K.gold, -.16, 2.13, .21);
  b.add(cone(.05, .16, 5), K.gold, -.16, 2.26, .21);
  b.add(cyl(.06, .06, .03, 6, true), K.gold, -.16, 1.76, .21);
  b.joint(-.25, .54, 0, .08, .25);
  G.push(b.build());
  [1, -1].forEach(function (sg, idx) {
    b = new Bld(pv[3 + idx], 1.1); var x = sg * .1;
    b.limb([x, .27, 0], [x, .12, .01], .088, .078, K.cloth, 6);
    b.limb([x, .2, 0], [x, .09, .02], .085, .075, K.leather, 6);
    b.add(box(.16, .11, .27), K.leather, x, .055, .05);
    b.joint(x, .26, 0, .08, .3);
    G.push(b.build());
  });
  /* 5 bayrak (direkte) */
  b = new Bld([-.16, 1.88, .21], 2.4);
  b.add(box(.012, .62, .72), 't', -.16, 1.55, .21 - .38);
  b.add(box(.016, .05, .74), K.gold, -.16, 1.88, .21 - .38);
  b.add(box(.016, .05, .74), K.gold, -.16, 1.23, .21 - .38);
  b.add(box(.018, .22, .22), K.gold, -.16, 1.55, .21 - .38, PI / 4, 0, 0);
  b.add(box(.02, .1, .1), ['t', .6], -.16, 1.55, .21 - .38, PI / 4, 0, 0);
  G.push(b.build());
  return G;
}

/* suvari: [at, on bacaklar, arka bacaklar, binici, mizrak kolu] */
var PV_HORSE = [[0, .85, 0], [0, .78, .38], [0, .8, -.4], [0, 1.2, -.03], [-.25, 1.45, 0]];
function horseGeos() {
  var G = [], b, pv = PV_HORSE, H = 2.1, hx;
  b = new Bld(pv[0], H);
  b.add(sph(.32, 8, 6), K.horse, 0, .85, 0, 0, 0, 0, .98, 1.0, 1.75);
  b.add(sph(.2, 6, 4), K.steel, 0, .92, .5, 0, 0, 0, 1.1, 1.1, .8);      /* gogus zirhi */
  b.limb([0, .98, .42], [0, 1.2, .62], .2, .15, K.horse, 7);
  b.limb([0, 1.2, .62], [0, 1.45, .74], .15, .125, K.horse, 7);
  b.add(box(.05, .5, .12), K.horseD, 0, 1.3, .55, .62, 0, 0);               /* yele */
  b.limb([0, 1.5, .78], [0, 1.28, 1.0], .12, .085, K.horse, 7, false);      /* kafa */
  b.add(box(.12, .05, .3), K.steelL, 0, 1.42, .95, .85, 0, 0);              /* alinlik */
  b.add(cone(.03, .1, 4, true), K.horseD, .06, 1.58, .72, -.2, 0, 0); b.add(cone(.03, .1, 4, true), K.horseD, -.06, 1.58, .72, -.2, 0, 0);
  b.limb([0, 1.05, -.52], [0, .85, -.7], .07, .06, K.horseD, 6); b.limb([0, .85, -.7], [0, .5, -.76], .06, .035, K.horseD, 6);
  b.add(cyl(.34, .34, .8, 8, true), 't', 0, .85, 0, PI / 2, 0, 0, .98, 1, 1.0);
  [1, -1].forEach(function (sg) {
    b.add(box(.14, .14, .02), K.gold, sg * .346, .74, .0, 0, 0, PI / 4);
    b.add(box(.05, .05, .024), ['t', .55], sg * .346, .74, 0, 0, 0, PI / 4);
    b.add(box(.02, .05, .78), K.gold, sg * .3, .52, 0, 0, 0, -sg * .3);
  });
  b.add(box(.3, .06, .34), K.leather, 0, 1.19, 0);
  b.joint(0, .85, 0, .3, .15);
  G.push(b.build());
  [[1, 2], [-1, 3]].forEach(function () { });
  /* on bacaklar */
  b = new Bld(pv[1], H);
  [1, -1].forEach(function (sg) {
    hx = sg * .17;
    b.limb([hx, .78, .38], [hx, .48, .42], .1, .075, K.horse, 6);
    b.limb([hx, .48, .42], [hx, .14, .4], .06, .05, K.horse, 6);
    b.add(box(.13, .11, .15), K.hoof, hx, .055, .41);
  });
  b.joint(0, .78, .38, .15, .3);
  G.push(b.build());
  b = new Bld(pv[2], H);
  [1, -1].forEach(function (sg) {
    hx = sg * .17;
    b.limb([hx, .82, -.4], [hx, .5, -.52], .12, .075, K.horse, 6);
    b.limb([hx, .5, -.52], [hx, .14, -.44], .06, .05, K.horse, 6);
    b.add(box(.13, .11, .15), K.hoof, hx, .055, -.43);
  });
  b.joint(0, .82, -.4, .15, .3);
  G.push(b.build());
  /* binici: govde + kafa + kalkan kolu */
  b = new Bld(pv[3], H);
  b.push(0, .94, -.03);
  b.add(cyl(.19, .165, .3, 8, true), ['t', .95], 0, .43, 0, 0, 0, 0, 1, 1, .8);
  b.add(cyl(.17, .21, .12, 8, true), ['t', .9], 0, .31, 0, 0, 0, 0, 1, 1, .85);
  b.add(cyl(.212, .216, .03, 8, true), K.gold, 0, .255, 0, 0, 0, 0, 1, 1, .85);
  b.add(cyl(.175, .185, .36, 8), K.steel, 0, .8, 0, 0, 0, 0, 1, 1, 1.02);
  b.add(box(.22, .035, .04), K.black, 0, .83, .19);
  b.add(box(.03, .34, .035), K.gold, 0, .8, .19);
  b.add(cyl(.19, .19, .03, 8, true), K.gold, 0, .62, 0, 0, 0, 0, 1, 1, 1.02);
  b.add(box(.07, .3, .14), 't', 0, 1.14, -.04, .18, 0, 0);
  b.add(box(.06, .15, .26), 't', 0, 1.0, -.1, -.35, 0, 0);
  paul(b, -.25, .54, K.steel);
  /* sol kol + kalkan */
  paul(b, .25, .54, K.steel);
  b.limb([.25, .54, 0], [.29, .31, .06], .07, .06, K.steelD, 6);
  b.add(sph(.08, 5, 4), K.leather, .29, .28, .08);
  shieldKite(b, .34, .4, .17);
  b.pop();
  /* bacaklar (atin yanlarinda) */
  [1, -1].forEach(function (sg) {
    b.limb([sg * .15, 1.2, 0], [sg * .35, .98, .08], .09, .08, K.cloth, 6);
    b.add(box(.13, .11, .24), K.leather, sg * .37, .9, .12, .0, 0, 0);
  });
  b.joint(0, 1.2, -.03, .12, .3);
  G.push(b.build());
  /* mizrak kolu */
  b = new Bld(pv[4], H);
  var D = new T.Vector3(0, .24, .97).normalize(), Hh = new T.Vector3(-.3, 1.2, .1), a, c, tp = [], pt = function (t) { return [Hh.x + D.x * t, Hh.y + D.y * t, Hh.z + D.z * t]; };
  paul(b, -.25, 1.48, K.steel);
  b.limb([-.25, 1.48, 0], [Hh.x, Hh.y, Hh.z], .07, .06, K.steelD, 6);
  b.add(sph(.08, 5, 4), K.leather, Hh.x, Hh.y, Hh.z);
  b.limb(pt(-.6), pt(1.7), .026, .02, K.wood, 5);
  b.limb(pt(.55), pt(.85), .032, .032, 't', 5);
  b.limb(pt(.85), pt(1.1), .032, .032, K.white, 5);
  b.limb(pt(1.1), pt(1.35), .032, .032, 't', 5);
  b.limb(pt(1.68), pt(1.96), .05, .004, K.steelL, 5, false);
  a = pt(1.5); b.add(box(.012, .13, .38), 't', a[0], a[1] - .07, a[2] - .12, -.24, 0, 0);
  b.joint(-.25, 1.48, 0, .08, .25);
  G.push(b.build());
  return G;
}

/* top: [kundak, namlu, tekerlek cifti] */
var PV_CAN = [[0, 0, 0], [0, .62, 0], [0, .3, 0]];
function cannonGeos() {
  var G = [], b;
  b = new Bld(PV_CAN[0], 1.5);
  [1, -1].forEach(function (sg) { b.add(box(.1, .2, 1.1), K.wood, sg * .2, .5, -.05); b.add(box(.04, .06, 1.0), K.iron, sg * .26, .5, -.05); });
  b.add(box(.18, .1, .95), K.woodD, 0, .29, -.62, -.45, 0, 0);
  b.add(box(.95, .07, .08), K.woodD, 0, .3, .0);
  b.add(box(.3, .06, .08), K.woodD, 0, .45, .35);
  b.add(box(.5, .045, .5), 't', 0, .625, -.46);
  [1, -1].forEach(function (sg) { b.add(box(.04, .22, .5), ['t', .85], sg * .25, .52, -.46); });
  b.add(box(.16, .03, .06), K.gold, 0, .648, -.2);
  b.add(cyl(.014, .014, .9, 5, true), K.wood, .0, 1.05, -.85);
  b.add(box(.012, .17, .42), 't', 0, 1.36, -.85 - .22);
  b.add(cyl(.17, .17, .32, 8), K.wood, .72, .2, -.3);
  b.add(cyl(.175, .175, .04, 8, true), K.bronze, .72, .12, -.3); b.add(cyl(.175, .175, .04, 8, true), K.bronze, .72, .28, -.3);
  [[-.72, .07, 0], [-.58, .07, .15], [-.86, .07, .15], [-.72, .07, .3], [-.72, .2, .12], [-.58, .07, .45]].forEach(function (p) { b.add(sph(.1, 5, 4), K.iron, p[0], p[1] + .02, p[2] - .1); });
  G.push(b.build());
  b = new Bld(PV_CAN[1], 1.5);
  b.limb([0, .62, -.4], [0, .62, .7], .17, .12, K.iron, 10, false);
  [[-.25, .178], [.15, .155], [.55, .135]].forEach(function (z) { b.limb([0, .62, z[0] - .05], [0, .62, z[0] + .05], z[1], z[1], K.bronze, 10); });
  b.add(cyl(.145, .125, .08, 10, true), K.bronze, 0, .62, .68, PI / 2, 0, 0);
  b.add(sph(.07, 6, 4), K.bronze, 0, .62, -.46);
  b.add(cyl(.045, .045, .52, 6), K.bronze, 0, .62, .0, 0, 0, PI / 2);
  G.push(b.build());
  b = new Bld(PV_CAN[2], 1.5);
  [1, -1].forEach(function (sg) {
    var x = sg * .45;
    b.add(cyl(.3, .3, .07, 10), K.wood, x, .3, 0, 0, 0, PI / 2);
    b.add(cyl(.315, .315, .08, 10, true), K.iron, x, .3, 0, 0, 0, PI / 2);
    for (var i = 0; i < 3; i++) b.add(box(.09, .56, .035), K.woodD, x + sg * .035, .3, 0, i * PI / 3, 0, 0);
    b.add(cyl(.07, .07, .14, 6), K.bronze, x + sg * .03, .3, 0, 0, 0, PI / 2);
  });
  b.add(cyl(.03, .03, .96, 5, true), K.iron, 0, .3, 0, 0, 0, PI / 2);
  G.push(b.build());
  return G;
}

/* ═════════════════════ ANIMASYON ═════════════════════ */
function mset(o, oo, rx, ry, rz, tx, ty, tz) {
  var cx = cos(rx), sx = sin(rx), cy = cos(ry), sy = sin(ry), cz = cos(rz), sz = sin(rz);
  o[oo] = cy * cz + sy * sx * sz; o[oo + 1] = -cy * sz + sy * sx * cz; o[oo + 2] = sy * cx; o[oo + 3] = tx;
  o[oo + 4] = cx * sz; o[oo + 5] = cx * cz; o[oo + 6] = -sx; o[oo + 7] = ty;
  o[oo + 8] = -sy * cz + cy * sx * sz; o[oo + 9] = sy * sz + cy * sx * cz; o[oo + 10] = cy * cx; o[oo + 11] = tz;
}
var _mt = new Float64Array(12);
function mmul(o, oo, a, ao, b, bo) {
  for (var r = 0; r < 3; r++) {
    var a0 = a[ao + r * 4], a1 = a[ao + r * 4 + 1], a2 = a[ao + r * 4 + 2], a3 = a[ao + r * 4 + 3];
    _mt[r * 4] = a0 * b[bo] + a1 * b[bo + 4] + a2 * b[bo + 8];
    _mt[r * 4 + 1] = a0 * b[bo + 1] + a1 * b[bo + 5] + a2 * b[bo + 9];
    _mt[r * 4 + 2] = a0 * b[bo + 2] + a1 * b[bo + 6] + a2 * b[bo + 10];
    _mt[r * 4 + 3] = a0 * b[bo + 3] + a1 * b[bo + 7] + a2 * b[bo + 11] + a3;
  }
  for (var i = 0; i < 12; i++) o[oo + i] = _mt[i];
}
/* o = T(p+d) * R * T(-p) */
function about(o, rx, ry, rz, px, py, pz, dx, dy, dz) {
  mset(o, 0, rx, ry, rz, 0, 0, 0);
  o[3] = px + dx - (o[0] * px + o[1] * py + o[2] * pz); o[7] = py + dy - (o[4] * px + o[5] * py + o[6] * pz); o[11] = pz + dz - (o[8] * px + o[9] * py + o[10] * pz);
}
function scl(o, s) { o[0] *= s; o[1] *= s; o[2] *= s; o[4] *= s; o[5] *= s; o[6] *= s; o[8] *= s; o[9] *= s; o[10] *= s; }
var LOC = new Float64Array(12 * 10), Gd = new Float64Array(12), Gb = new Float64Array(12), Gl = new Float64Array(12), Gx = new Float64Array(12), Gy = new Float64Array(12), TM = new Float64Array(12);
function setP(i, G, pv, rx, ry, rz, ox, oy, oz) { mset(TM, 0, rx, ry, rz, pv[0] + ox, pv[1] + oy, pv[2] + oz); mmul(LOC, i * 12, G, 0, TM, 0); }
function ease(x) { return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x); }
function fr(x) { return x - Math.floor(x); }
/* oluş: Gd (devrilme) -> p (0..1 devrilme), q (0..1 gomulme) */
function dieG(k, px, pz) {
  var p = ease(k / .6), q = k > .6 ? (k - .6) / .4 : 0;
  about(Gd, -p * 1.5, 0, 0, 0, 0, pz == null ? -.05 : pz, 0, -q * .8 + sin(p * PI) * .05, 0); scl(Gd, 1 - q * .5);
  return [p, q];
}
function ident(o) { mset(o, 0, 0, 0, 0, 0, 0, 0); }

/* iki ayakli: c = {pv:[...], sp, aL,aR,zL,zR, kind} */
function biped(c) {
  var pv = c.pv, kd = c.kind, hipY = pv[3][1];
  return function (st, t, ph, k) {
    var w = t * c.sp + ph, s = sin(w), cw = cos(w);
    var bob = 0, lean = 0, lL = 0, lR = 0, aL = c.aL, aR = c.aR, zL = c.zL, zR = c.zR, oLz = 0, oRz = 0, oRy = 0, p = 0, q = 0, f, a, u, pulse = 0;
    if (st === 'die') { var pq = dieG(k); p = pq[0]; q = pq[1]; } else { ident(Gd); }
    if (st === 'walk') {
      lL = s * .61; lR = -s * .61; aL = c.aL - s * .44 * (c.swL == null ? 1 : c.swL); aR = c.aR + s * .44 * (c.swR == null ? 1 : c.swR);
      bob = abs(cw) * .05; lean = .07;
      if (kd === 'mil') { aR = -.12 + s * .12; oRz = .05; }
      if (kd === 'drum') { var bL = max(0, sin(t * 8 + ph)); aL = -1.5 - .4 * bL; aR = -1.5 - .4 * max(0, -sin(t * 8 + ph)); }
      if (kd === 'flag') { aL = c.aL; aR = c.aR; }
    } else if (st === 'idle') {
      bob = sin(t * 2.1 + ph) * .012; aL += sin(t * 2.1 + ph) * .04; aR -= sin(t * 2.1 + ph) * .04;
      if (kd === 'drum') { var bI = max(0, sin(t * 4 + ph)); aL = -1.5 - .35 * bI; aR = -1.5 - .35 * max(0, -sin(t * 4 + ph)); }
    } else if (st === 'fight') {
      f = fr(t * 1.7 + ph / 6.2832);
      if (f < .45) { u = f / .45; a = .2 - 2.12 * (1 - (1 - u) * (1 - u)); }
      else if (f < .6) { u = (f - .45) / .15; a = -1.92 + 2.27 * u * u; }
      else { u = (f - .6) / .4; a = .35 - .15 * u; }
      pulse = (f > .4 && f < .8) ? sin((f - .4) / .4 * PI) : 0;
      lean = .1 + .2 * pulse; bob = pulse * .04;
      lL = .32 + .15 * pulse; lR = -.32 - .1 * pulse;
      aL = c.fL == null ? -1.2 + sin(t * 5 + ph) * .08 : c.fL; aR = a;
      if (kd === 'mil') { aR = .45; oRz = -.05 + .3 * pulse; aL = -.4; zR = .08; }
      if (kd === 'drum') { var bF = max(0, sin(t * 14 + ph)); aL = -1.5 - .4 * bF; aR = -1.5 - .4 * max(0, -sin(t * 14 + ph)); lL = lR = 0; lean = .05; zR = c.zR; }
      if (kd === 'flag') { aR = c.aR + sin(t * 6 + ph) * .1; aL = c.aL; lL = .2; lR = -.2; }
    } else if (st === 'fire') {
      var tp = k < .4 ? k / .4 : 1 - (k - .4) / .6;
      aL = -1.0; aR = -1.1; oLz = oRz = (tp - .4) * .4; lean = .12 + .18 * tp; lL = .3; lR = -.3; zL = -.2; zR = .2; bob = tp * .02;
    } else if (st === 'die') {
      aL = c.aL - p * 1.8; aR = c.aR - p * 1.4; lL = .3 * p; lR = -.25 * p; zL = c.zL + p * .5; zR = c.zR - p * .6;
      if (kd === 'drum') { aL = -1.2 - p * 1.5; aR = -1.2 - p * 1.0; }
    }
    /* gruplar */
    about(Gb, lean, 0, 0, 0, hipY, 0, 0, bob, 0); mmul(Gb, 0, Gd, 0, Gb, 0);
    mset(Gl, 0, 0, 0, 0, 0, bob, 0); mmul(Gl, 0, Gd, 0, Gl, 0);
    setP(0, Gb, pv[0], 0, 0, 0, 0, 0, 0);
    setP(1, Gb, pv[1], aL, 0, zL, 0, 0, oLz);
    setP(2, Gb, pv[2], aR, oRy, zR, 0, 0, oRz);
    setP(3, Gl, pv[3], lL, 0, 0, 0, 0, 0);
    setP(4, Gl, pv[4], lR, 0, 0, 0, 0, 0);
    if (c.n > 5) {
      if (kd === 'inf') {   /* komutan: pelerin, sanca, halka */
        var ca = .16 + (st === 'walk' ? .32 * abs(s) + .05 : st === 'fight' ? .3 + .2 * pulse : 0) + sin(t * 5 + ph) * .05 + (st === 'die' ? p * .5 : 0);
        setP(5, Gb, [0, .58, -.15], ca, 0, 0, 0, 0, 0);
        setP(6, Gb, [0, .5, -.2], sin(t * 4 + ph) * .04 + (st === 'walk' ? s * .05 : 0), sin(t * 3.1 + ph) * .1, 0, 0, 0, 0);
        mset(LOC, 7 * 12, 0, 0, 0, 0, 0, 0); scl(LOC.subarray ? LOC.subarray(84, 96) : LOC, st === 'die' ? max(0, 1 - k * 3) : 1);
      } else if (kd === 'flag') {
        setP(5, Gb, c.pv[5], sin(t * 3 + ph) * .05, sin(t * 7 + ph) * .22 + .1, 0, 0, 0, 0);
      }
    }
    return q;
  };
}

/* suvari */
function horsePose(st, t, ph, k) {
  var pv = PV_HORSE, w = t * 10 + ph, s = sin(w), cw = cos(w), bob = 0, pitch = 0, fl = 0, hl = 0, lean = 0, thr = 0, lrx = -.02, p = 0, q = 0, roll = 0, f, pulse = 0;
  ident(Gd);
  if (st === 'walk') { fl = s * .8; hl = -s * .8; bob = abs(cw) * .06; pitch = s * .1; lean = .1; lrx = -.05 + sin(w * 2) * .03; }
  else if (st === 'idle') { pitch = sin(t * 1.6 + ph) * .03; bob = sin(t * 2.1 + ph) * .008; }
  else if (st === 'fight') {
    f = fr(t * 1.4 + ph / 6.2832); pulse = f < .5 ? sin(f / .5 * PI) : 0;
    pitch = -.22 * (.5 + .5 * sin(f * 2 * PI - 1)); bob = .05 * pulse; fl = -.9 * (.5 + .5 * sin(f * 2 * PI)) ; hl = .25; lean = .18 * pulse; thr = pulse; lrx = -.1;
  } else if (st === 'die') {
    var dq = dieG(k, 0, 0); p = dq[0]; q = dq[1];
    about(Gd, 0, 0, p * 1.45, 0, 0, 0, p * .35, -q * 1.1 + sin(p * PI) * .08, 0); scl(Gd, 1 - q * .5);
    fl = p * .7; hl = -p * .5; lean = -p * .6; lrx = -p * .6;
  }
  about(Gx, pitch, 0, 0, 0, .85, -.4, 0, bob, 0); mmul(Gx, 0, Gd, 0, Gx, 0);
  about(Gy, lean, 0, 0, 0, 1.2, 0, 0, 0, 0); mmul(Gy, 0, Gx, 0, Gy, 0);
  setP(0, Gx, pv[0], 0, 0, 0, 0, 0, 0);
  setP(1, Gx, pv[1], fl, 0, 0, 0, 0, 0);
  setP(2, Gx, pv[2], hl, 0, 0, 0, 0, 0);
  setP(3, Gy, pv[3], 0, 0, 0, 0, 0, 0);
  setP(4, Gy, pv[4], lrx - thr * .1, 0, 0, 0, -thr * .02, thr * .45 - .05);
  return q;
}
/* top */
function cannonPose(st, t, ph, k) {
  var pv = PV_CAN, rec = 0, wr = 0, p = 0, q = 0, dy = 0, rxc = 0;
  ident(Gd);
  if (st === 'walk') { wr = t * 7 + ph; }
  else if (st === 'fire') { rec = k < .1 ? k / .1 : Math.pow(1 - (k - .1) / .9, 2); wr = -rec * .5; }
  else if (st === 'die') { var pq = dieG(k, 0, -.9); p = pq[0]; q = pq[1]; mset(Gd, 0, 0, 0, 0, 0, -q * .9, 0); scl(Gd, 1 - q * .4); }
  mset(Gx, 0, 0, 0, 0, 0, 0, -rec * .06); mmul(Gx, 0, Gd, 0, Gx, 0);
  about(Gy, p * .45, 0, 0, 0, .3, -1.0, 0, -p * .12, 0); mmul(Gy, 0, Gx, 0, Gy, 0);
  setP(0, Gy, pv[0], 0, 0, 0, 0, 0, 0);
  setP(1, Gy, pv[1], -.1 - .08 * rec + p * .5, 0, 0, 0, -p * .22, -rec * .27);
  setP(2, Gx, pv[2], wr + p * .5, 0, p * .35, 0, -p * .06, 0);
  return q;
}

function bipedCfg(pv, extra) {
  var c = { pv: pv, sp: 9, aL: -.3, aR: -.05, zL: .1, zR: -.12, n: 5, kind: 'inf' }; for (var k in extra) c[k] = extra[k]; return c;
}

/* ═════════════════════ TANIMLAR ═════════════════════ */
var TYPES = ['milis', 'piyade', 'komutan', 'suvari', 'topcu', 'topcuEr', 'davulcu', 'sancaktar'];
var DEF = null;
function ensure() {
  if (DEF) return;
  DEF = {};
  DEF.piyade = { geos: infantryGeos(false), scale: 1, head: 1.12, shadow: [.42, .42], pose: biped(bipedCfg(PV_INF, { fL: null })) };
  var pvC = PV_INF.concat([[0, .58, -.15], [0, .5, -.2], [0, 0, 0]]);
  DEF.komutan = { geos: infantryGeos(true), scale: 1.25, head: 1.38, shadow: [.52, .52], pose: biped(bipedCfg(pvC, { n: 8 })) };
  DEF.milis = { geos: slimGeos('milis'), scale: 1, head: 1.0, shadow: [.36, .36], pose: biped(bipedCfg(PV_SLIM, { kind: 'mil', aL: -.35, aR: .3, zL: .08, zR: -.12 })) };
  DEF.topcuEr = { geos: slimGeos('gun'), scale: 1, head: 1.0, shadow: [.36, .36], pose: biped(bipedCfg(PV_SLIM, { kind: 'gun', aL: -.5, aR: -.5, zL: .05, zR: -.05 })) };
  DEF.davulcu = { geos: drummerGeos(), scale: 1, head: 1.08, shadow: [.5, .5], pose: biped(bipedCfg(PV_INF, { kind: 'drum', aL: -1.5, aR: -1.5, zL: -.25, zR: .25 })) };
  var pvB = PV_INF.concat([[-.16, 1.88, .21]]);
  DEF.sancaktar = { geos: bearerGeos(), scale: 1, head: 2.45, shadow: [.4, .4], pose: biped(bipedCfg(pvB, { kind: 'flag', n: 6, aL: -.55, aR: -.15, zL: -.1, zR: 0, swL: 0, swR: 0 })) };
  DEF.suvari = { geos: horseGeos(), scale: 1, head: 2.35, shadow: [.52, .95], pose: horsePose };
  DEF.topcu = { geos: cannonGeos(), scale: 1, head: 1.0, shadow: [.7, 1.0], pose: cannonPose };
  TYPES.forEach(function (n) { var d = DEF[n]; d.np = d.geos.length; d.tris = 0; d.geos.forEach(function (g) { d.tris += g.attributes.position.count / 3; }); });
}

/* ═════════════════════ MALZEME ═════════════════════ */
var GRAD = null;
function gradTex() {
  if (GRAD) return GRAD;
  var t = new T.DataTexture(new Uint8Array([78, 135, 185]), 3, 1, T.LuminanceFormat);
  t.minFilter = T.NearestFilter; t.magFilter = T.NearestFilter; t.generateMipmaps = false; t.unpackAlignment = 1; t.needsUpdate = true;
  return (GRAD = t);
}
function makeMat(instanced, low, teamHex) {
  var m = new T.MeshToonMaterial({ vertexColors: true, gradientMap: gradTex() });
  if (!low) m.defines = { MF_RIM: '' };
  var uTeam = { value: new T.Color(teamHex == null ? 0xffffff : teamHex) };
  m.userData.uTeam = uTeam;
  m.onBeforeCompile = function (sh) {
    if (!instanced) sh.uniforms.uTeam = uTeam;
    sh.vertexShader = sh.vertexShader
      .replace('#include <color_pars_vertex>', '#include <color_pars_vertex>\nattribute float aTeam;\nvarying float vTeam;' + (instanced ? '' : '\nuniform vec3 uTeam;'))
      .replace('#include <color_vertex>', 'vTeam = aTeam;\nvColor = mix(color.rgb, ' + (instanced ? 'instanceColor.rgb' : 'uTeam') + ', aTeam);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <color_pars_fragment>', '#include <color_pars_fragment>\nvarying float vTeam;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor * vTeam * 0.22;')
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n#ifdef MF_RIM\nfloat mfRim = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 2.4);\nreflectedLight.indirectDiffuse += vec3(1.0, 0.72, 0.42) * mfRim * 0.3;\n#endif');
  };
  m.customProgramCacheKey = function () { return 'mfu' + (instanced ? 1 : 0) + (low ? 1 : 0); };
  return m;
}
var SHTEX = null;
function shadowTex() {
  if (SHTEX) return SHTEX;
  var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d');
  var g = x.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, 'rgba(0,0,0,0.62)'); g.addColorStop(.55, 'rgba(0,0,0,0.38)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  SHTEX = new T.CanvasTexture(c); return SHTEX;
}

/* ═════════════════════ ORDU ═════════════════════ */
function createArmy(o) {
  ensure(); o = o || {};
  var low = o.quality === 'dusuk', cap = o.max || (low ? 160 : 320), group = new T.Group(), mat = makeMat(true, low), tn = {}, total = 0, time = 0;
  var white = new T.Color(1, 1, 1), stats = { soldiers: 0, drawCalls: 0, triangles: 0 };
  TYPES.forEach(function (name) {
    var d = DEF[name], meshes = [], pa = [], ca = [];
    d.geos.forEach(function (g) {
      var m = new T.InstancedMesh(g, mat, cap); m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.setColorAt(0, white); m.instanceColor.setUsage(T.DynamicDrawUsage);
      m.frustumCulled = false; m.count = 0; m.visible = false; m.name = name; group.add(m); meshes.push(m); pa.push(m.instanceMatrix.array); ca.push(m.instanceColor.array);
    });
    tn[name] = { d: d, meshes: meshes, pa: pa, ca: ca, n: 0 };
  });
  var sg = new T.PlaneGeometry(1.6, 1.6); sg.rotateX(-PI / 2);
  var smat = new T.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  var sm = new T.InstancedMesh(sg, smat, cap); sm.instanceMatrix.setUsage(T.DynamicDrawUsage); sm.frustumCulled = false; sm.count = 0; sm.visible = false; sm.renderOrder = -1; group.add(sm);
  var sa = sm.instanceMatrix.array, sn = 0, W = new Float64Array(12), R = new Float64Array(12);
  var api = {
    object: group,
    begin: function (t) { time = t || 0; total = 0; sn = 0; for (var n in tn) tn[n].n = 0; },
    add: function (type, hex, x, z, yaw, scale, state, phase, kk) {
      var e = tn[type]; if (!e || total >= cap) return false;
      var d = e.d, sc = (scale == null ? 1 : scale) * d.scale, cy = cos(yaw || 0) * sc, sy = sin(yaw || 0) * sc, i = e.n, q = d.pose(state, time, phase || 0, kk || 0), p, j, o16;
      W[0] = cy; W[1] = 0; W[2] = sy; W[3] = x; W[4] = 0; W[5] = sc; W[6] = 0; W[7] = 0; W[8] = -sy; W[9] = 0; W[10] = cy; W[11] = z;
      var r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
      for (p = 0; p < d.np; p++) {
        mmul(R, 0, W, 0, LOC, p * 12);
        var a = e.pa[p]; o16 = i * 16;
        a[o16] = R[0]; a[o16 + 1] = R[4]; a[o16 + 2] = R[8]; a[o16 + 3] = 0;
        a[o16 + 4] = R[1]; a[o16 + 5] = R[5]; a[o16 + 6] = R[9]; a[o16 + 7] = 0;
        a[o16 + 8] = R[2]; a[o16 + 9] = R[6]; a[o16 + 10] = R[10]; a[o16 + 11] = 0;
        a[o16 + 12] = R[3]; a[o16 + 13] = R[7]; a[o16 + 14] = R[11]; a[o16 + 15] = 1;
        var c = e.ca[p]; c[i * 3] = r; c[i * 3 + 1] = g; c[i * 3 + 2] = b;
      }
      var sh = d.shadow, ss = max(.001, 1 - q * 1.2), kx = sc * sh[0] * ss, kz = sc * sh[1] * ss, so = sn * 16;
      var syw = sin(yaw || 0), cyw = cos(yaw || 0);
      sa[so] = cyw * kx; sa[so + 1] = 0; sa[so + 2] = -syw * kx; sa[so + 3] = 0;
      sa[so + 4] = 0; sa[so + 5] = 1; sa[so + 6] = 0; sa[so + 7] = 0;
      sa[so + 8] = syw * kz; sa[so + 9] = 0; sa[so + 10] = cyw * kz; sa[so + 11] = 0;
      sa[so + 12] = x; sa[so + 13] = .03; sa[so + 14] = z; sa[so + 15] = 1;
      sn++; e.n++; total++; return true;
    },
    end: function () {
      var dc = 0, tr = 0, n, e, p, m;
      for (n in tn) {
        e = tn[n];
        for (p = 0; p < e.meshes.length; p++) {
          m = e.meshes[p]; m.count = e.n; m.visible = e.n > 0;
          if (e.n > 0) {
            m.instanceMatrix.updateRange.offset = 0; m.instanceMatrix.updateRange.count = e.n * 16; m.instanceMatrix.needsUpdate = true;
            m.instanceColor.updateRange.offset = 0; m.instanceColor.updateRange.count = e.n * 3; m.instanceColor.needsUpdate = true;
            dc++; tr += e.n * (e.d.geos[p].attributes.position.count / 3);
          }
        }
      }
      sm.count = sn; sm.visible = sn > 0;
      if (sn > 0) { sm.instanceMatrix.updateRange.offset = 0; sm.instanceMatrix.updateRange.count = sn * 16; sm.instanceMatrix.needsUpdate = true; dc++; tr += sn * 2; }
      stats.soldiers = total; stats.drawCalls = dc; stats.triangles = tr;
    },
    headHeight: function (type) { var d = DEF[type]; return d ? d.head * d.scale : 1.2; },
    stats: function () { return { soldiers: stats.soldiers, drawCalls: stats.drawCalls, triangles: stats.triangles }; },
    dispose: function () {
      group.children.slice().forEach(function (m) { group.remove(m); if (m.dispose) m.dispose(); });
      mat.dispose(); smat.dispose(); sg.dispose();
    }
  };
  return api;
}

/* ═════════════════════ GALERI ═════════════════════ */
var PM = {};
function previewMat(hex) { return PM[hex] || (PM[hex] = makeMat(false, false, hex)); }
function buildEntry(type, hex, ox, oz, ry) {
  var d = DEF[type], mat = previewMat(hex), root = new T.Group(), meshes = [];
  root.position.set(ox || 0, 0, oz || 0); root.rotation.y = ry || 0;
  d.geos.forEach(function (g) { var m = new T.Mesh(g, mat); m.matrixAutoUpdate = false; root.add(m); meshes.push(m); });
  return { d: d, root: root, meshes: meshes };
}
function preview(type, hex) {
  ensure();
  var grp = new T.Group(), es = [], H;
  if (type === 'mehter') { es.push(buildEntry('davulcu', hex, -.5, 0)); es.push(buildEntry('sancaktar', hex, .5, 0)); H = 2.5; }
  else if (type === 'topcu') { es.push(buildEntry('topcu', hex, 0, 0)); es.push(buildEntry('topcuEr', hex, .95, .35, -.5)); es.push(buildEntry('topcuEr', hex, -.95, .35, .5)); H = 1.6; }
  else { if (!DEF[type]) throw new Error('units.preview: bilinmeyen tip ' + type); es.push(buildEntry(type, hex, 0, 0)); H = DEF[type].head * DEF[type].scale; }
  es.forEach(function (e) { grp.add(e.root); });
  var sc = type === 'komutan' ? 1.25 : 1;
  grp.userData.height = H;
  grp.userData.animate = function (t, state, k) {
    es.forEach(function (e, idx) {
      e.d.pose(state || 'idle', t || 0, idx * 1.3, k || 0);
      var s = e.d === DEF.komutan ? 1.25 : 1;
      for (var p = 0; p < e.meshes.length; p++) {
        var L = LOC, o = p * 12, m = e.meshes[p].matrix;
        m.set(L[o] * s, L[o + 1] * s, L[o + 2] * s, L[o + 3] * s, L[o + 4] * s, L[o + 5] * s, L[o + 6] * s, L[o + 7] * s, L[o + 8] * s, L[o + 9] * s, L[o + 10] * s, L[o + 11] * s, 0, 0, 0, 1);
        e.meshes[p].matrixWorldNeedsUpdate = true;
      }
    });
  };
  grp.userData.animate(0, 'idle', 0);
  return grp;
}

var INFO = {
  milis: { name: 'Milis', trigger: 'Kale çıkışı (pasif)', desc: 'Kapıdan kendiliğinden çıkan hafif halk askeri. Kukuletalı, kısa mızraklı ve ahşap kalkanlı; ucuz ama sayıca kalabalık.' },
  piyade: { name: 'Piyade', trigger: 'Beğeni ve 1–9 elmas', desc: 'Sallet miğferli, zincir zırhlı, uçurtma kalkanlı ve kılıçlı ağır yaya asker. Cephenin omurgası.' },
  komutan: { name: 'Komutan', trigger: 'İzleyicinin kendi karakteri', desc: 'Her izleyici bölüğünün lideri. Kapalı miğfer, yüksek sorguç, pelerin ve sırtında sancak taşır; piyadeden bir boy büyüktür.' },
  suvari: { name: 'Süvari', trigger: '10–99 elmas', desc: 'Örtülü savaş atı üstünde uzun mızraklı, flamalı atlı. Hızlı hücumla cepheyi yarar.' },
  topcu: { name: 'Topçu', trigger: '100–999 elmas', desc: 'Bronz kuşaklı bombard topu ve iki topçu eri. Menzilde durur, üç saniyede bir surlara gülle atar.' },
  mehter: { name: 'Mehter', trigger: '1000+ elmas', desc: 'Davulcu ve sancaktardan oluşan mehter takımı. Askerlerin moralini yükseltir, ayaklarının altında halka parlar.' }
};

MF.units = { TYPES: TYPES, createArmy: createArmy, preview: preview, info: INFO };
})();
