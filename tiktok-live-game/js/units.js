/* Memleket Fethi v4 - 1915 Canakkale donemi askerler, orneklemeli (instanced).  three.js r128 (global) gerekir.
   MF.units: TYPES, createArmy({max,quality}), preview(type,hex), info.
   Tum modeller +Z'ye bakar, ayak tabani y=0, boy ~1.0 (6.5 kafa). Parcalar tek BufferGeometry:
   position, normal, color, aTeam (takim rengi maskesi), aShade (pisirilmis golge, carpan).
   Renk = mix(koseRengi, tarafRengi, aTeam) * aShade.
   yaw: Y ekseninde radyan (+z -> +x).  phase: radyan (0..2PI).  k: 'fire' / 'die' ilerlemesi 0..1.
   Ek: 'fight' durumunda k>0.5 verilirse yakin temas (sungu hamlesi). */
(function () {
'use strict';
var MF = (window.MF = window.MF || {});
var T = window.THREE;
if (!T) { throw new Error('units.js: THREE bulunamadi'); }
var PI = Math.PI, sin = Math.sin, cos = Math.cos, abs = Math.abs, max = Math.max, min = Math.min, sqrt = Math.sqrt;

var K = { coat: 0x8a8460, pants: 0x5d5a44, puttee: 0xb7ab8a, boot: 0x2e2620, leather: 0x6b4226, wood: 0x6a4326, steel: 0x3a3f45,
  skin: 0xd9a57a, skinD: 0xc08860, hair: 0x2a1c14, brass: 0xd6b25a, fur: 0x34261d, fez: 0xa8322a, canvas: 0xa59c78, blanket: 0x7a6a55,
  horse: 0x6e4a2f, mane: 0x24180f, hoof: 0x2a2420, copper: 0x9a5a2a, linen: 0xd9cfae, gun: 0x5f6652, gunD: 0x3b3f36, black: 0x18181a, blade: 0xaab4bb };

/* ───────── geometri yardimcilari ───────── */
function cyl(rt, rb, h, s, open) { return new T.CylinderGeometry(rt, rb, h, s || 8, 1, !!open); }
function box(w, h, d) { return new T.BoxGeometry(w, h, d); }
function sph(r, w, h) { return new T.SphereGeometry(r, w || 6, h || 4); }
var UPV = new T.Vector3(0, 1, 0), _v = new T.Vector3(), _q = new T.Quaternion(), _m = new T.Matrix4(), _e = new T.Euler(), _s = new T.Vector3(), _p = new T.Vector3();
function rodGeo(p1, p2, r1, r2, seg, open) {
  _v.set(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]); var len = _v.length();
  var g = new T.CylinderGeometry(r2, r1, len, seg || 6, 1, !!open);
  _q.setFromUnitVectors(UPV, _v.normalize()); g.applyMatrix4(_m.makeRotationFromQuaternion(_q));
  g.translate((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2); return g;
}

function Bld(pv, H) { this.P = []; this.N = []; this.C = []; this.A = []; this.S = []; this.pv = pv || [0, 0, 0]; this.H = H || 1.05; this.J = []; }
Bld.prototype = {
  joint: function (x, y, z, r, s) { this.J.push([x, y, z, r, s]); return this; },
  mark: function () { return this.S.length; },
  mod: function (m, fn) { for (var i = m; i < this.S.length; i++) this.S[i] *= fn(this.P[i * 3], this.P[i * 3 + 1], this.P[i * 3 + 2]); return this; },
  /* col: sayi = sabit renk; 't' = taraf rengi; [hex, a] = hex ile taraf karisimi (a = oran) */
  add: function (geo, col, x, y, z, rx, ry, rz, sx, sy, sz) {
    var g = geo.index ? geo.toNonIndexed() : geo;
    sx = sx == null ? 1 : sx; sy = sy == null ? sx : sy; sz = sz == null ? sx : sz;
    _m.compose(_p.set(x || 0, y || 0, z || 0), _q.setFromEuler(_e.set(rx || 0, ry || 0, rz || 0)), _s.set(sx, sy, sz));
    g.applyMatrix4(_m);
    var bc = 0, ta = 0;
    if (typeof col === 'number') { bc = col; } else if (col === 't') { ta = 1; } else { bc = col[0]; ta = col[1]; }
    var c = new T.Color(bc), P = g.attributes.position.array, N = g.attributes.normal.array, i, n = P.length;
    for (i = 0; i < n; i++) { this.P.push(P[i]); this.N.push(N[i]); }
    for (i = 0; i < n; i += 3) { this.C.push(c.r, c.g, c.b); this.A.push(ta); this.S.push(1); }
    geo.dispose(); if (g !== geo) g.dispose(); return this;
  },
  limb: function (p1, p2, r1, r2, col, seg, open) { return this.add(rodGeo(p1, p2, r1, r2, seg, open == null ? true : open), col); },
  build: function () {
    var n = this.P.length / 3, i, j, H = this.H, pv = this.pv, P = this.P, S = this.S;
    for (i = 0; i < n; i++) {
      var y = P[i * 3 + 1], gy = max(0, min(1, y / H)), sh = S[i] * (.58 + .42 * gy);
      for (j = 0; j < this.J.length; j++) {
        var J = this.J[j], dx = P[i * 3] - J[0], dy = y - J[1], dz = P[i * 3 + 2] - J[2], d = sqrt(dx * dx + dy * dy + dz * dz);
        if (d < J[3]) sh *= 1 - J[4] * (1 - d / J[3]);
      }
      S[i] = sh;
    }
    for (i = 0; i < n; i++) { P[i * 3] -= pv[0]; P[i * 3 + 1] -= pv[1]; P[i * 3 + 2] -= pv[2]; }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(P, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(this.N, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(this.C, 3));
    g.setAttribute('aTeam', new T.Float32BufferAttribute(this.A, 1));
    g.setAttribute('aShade', new T.Float32BufferAttribute(S, 1));
    g.computeBoundingSphere(); return g;
  }
};

/* ═════════════════════ ISKELET ═════════════════════ */
var HIPX = .07, HIPY = .52, L1 = .24, L2 = .28, SHX = .15, SHY = .79, UA = .15, FA = .21;
var COAT = [K.coat, .4], PANT = [K.pants, .15];
function foldFn(x, y, z) { var th = Math.atan2(x, z), s = sin(th * 7 + .6); return 1 - .22 * s * s * (s > 0 ? 1 : .3); }

/* ───────── ortak uzuvlar ───────── */
function armUpperGeo() {
  var b = new Bld([SHX, SHY, 0]);
  b.add(sph(.062, 5, 3), COAT, SHX, SHY, 0, 0, 0, 0, 1, .9, 1);
  b.limb([SHX, SHY, 0], [SHX, SHY - UA, 0], .057, .047, COAT, 6);
  b.limb([SHX, .71, 0], [SHX, .675, 0], .06, .06, 't', 6);   /* pazubent */
  b.joint(SHX, SHY - UA, 0, .06, .3);
  return b.build();
}
function armLowerGeo() {
  var b = new Bld([SHX, SHY - UA, 0]);
  b.limb([SHX, SHY - UA, 0], [SHX, SHY - UA - FA + .04, 0], .048, .041, COAT, 6);
  b.add(sph(.042, 4, 3), K.skin, SHX, SHY - UA - FA, 0, 0, 0, 0, 1, 1.05, 1.1);
  return b.build();
}
function thighGeo(baggy) {
  var b = new Bld([HIPX, HIPY, 0]);
  if (baggy) b.limb([HIPX, HIPY, 0], [HIPX, HIPY - L1, 0], .085, .062, PANT, 7);
  else b.limb([HIPX, HIPY, 0], [HIPX, HIPY - L1, 0], .068, .056, PANT, 6);
  return b.build();
}
function shinGeo(boots) {
  var b = new Bld([HIPX, HIPY - L1, 0]), kn = HIPY - L1, m;
  if (boots) {
    b.limb([HIPX, kn, 0], [HIPX, .07, 0], .058, .047, K.boot, 6);
    b.add(box(.075, .07, .17), K.boot, HIPX, .035, .035);
  } else {
    m = b.mark();
    b.limb([HIPX, kn, 0], [HIPX, .1, 0], .056, .043, K.puttee, 6);
    b.mod(m, function (x, y) { var s = sin(y * 95); return 1 - .16 * s * s; });
    b.add(box(.075, .075, .17), K.boot, HIPX, .037, .035);
  }
  b.joint(HIPX, kn, 0, .06, .3);
  return b.build();
}

/* ───────── govdeler ───────── */
function torsoGeo(kind) {
  var b = new Bld([0, HIPY, 0]), m = b.mark();
  b.add(cyl(.128, .122, .27, 8), COAT, 0, .675, 0, 0, 0, 0, 1, 1, .7);
  b.mod(m, foldFn);
  b.add(cyl(.062, .066, .032, 8, true), COAT, 0, .82, 0);
  b.add(box(.07, .012, .07), 't', SHX - .02, SHY + .02, 0, 0, 0, -.25); b.add(box(.07, .012, .07), 't', -SHX + .02, SHY + .02, 0, 0, 0, .25);   /* apolet */
  b.add(cyl(.131, .131, .034, 7, true), K.leather, 0, .575, 0, 0, 0, 0, 1, 1, .7);
  b.joint(0, .56, 0, .1, .25);
  if (kind === 'p') {
    b.add(box(.07, .055, .032), K.leather, .07, .6, .088); b.add(box(.07, .055, .032), K.leather, -.07, .6, .088);   /* fislikler */
    b.add(box(.03, .4, .012), K.leather, -.01, .68, .09, 0, 0, .62);   /* capraz kayis */
    b.add(cyl(.036, .036, .3, 5), K.blanket, 0, .77, -.1, 0, 0, PI / 2);   /* sarili battaniye */
  } else if (kind === 'm') {
    b.add(box(.034, .42, .012), K.leather, 0, .68, .09, 0, 0, .6); b.add(box(.034, .42, .012), K.leather, 0, .68, .092, 0, 0, -.6);
    b.add(box(.075, .05, .02), K.leather, .06, .63, .1); b.add(box(.075, .05, .02), K.leather, -.06, .63, .1);
  } else {   /* subay: Sam Browne + tabanca kilifi */
    b.add(box(.03, .4, .012), K.leather, -.01, .68, .09, 0, 0, .62);
    b.add(box(.045, .11, .065), K.leather, -.15, .5, .03);
    b.add(box(.012, .27, .01), K.black, 0, .675, .088);
  }
  return b.build();
}
function skirtGeo(kind) {
  var b = new Bld([0, .58, 0]), m = b.mark();
  if (kind === 'p') {
    b.add(cyl(.128, .225, .32, 12, true), COAT, 0, .42, 0, 0, 0, 0, 1, 1, .82);
    b.mod(m, foldFn);
    b.add(box(.022, .2, .032), K.gunD, .135, .45, .0, 0, 0, -.22);   /* kilic/sungu kilifi */
  } else {
    b.add(cyl(.128, .185, .2, 12, true), COAT, 0, .48, 0, 0, 0, 0, 1, 1, .8);
    b.mod(m, foldFn);
  }
  b.joint(0, .58, 0, .09, .3);
  return b.build();
}

/* ───────── basliklar ───────── */
var HC = .895;
function face(b, v, beard) {
  b.add(sph(.07, 6, 3), K.skin, 0, HC, .005, 0, 0, 0, .92, 1.1, 1);
  b.add(box(.09, .012, .014), K.hair, 0, HC + .02, .067);   /* kas golgesi */
  b.add(box(.066, .014, .02), K.hair, 0, HC - .033, .067);   /* biyik */
  if (beard) b.add(box(.07, .05, .034), K.hair, 0, HC - .066, .044);
}
function kabalak(b) {
  b.add(sph(.085, 6, 3), K.pants, 0, .935, .005, 0, 0, 0, 1, .85, 1.05);
  b.add(cyl(.09, .112, .02, 6, true), K.pants, 0, .925, .01);
  b.add(cyl(.0875, .09, .026, 6, true), 't', 0, .95, .005);
}
function kalpak(b) {
  b.add(cyl(.074, .082, .11, 7, true), K.fur, 0, .985, 0, .08, 0, 0);
  b.add(new T.CircleGeometry(.074, 7), 't', 0, 1.04, .005, -PI / 2 + .08, 0, 0);
  b.add(box(.034, .024, .012), 't', 0, .97, .083);
}
function fez(b) {
  b.add(cyl(.052, .066, .09, 7, true), K.fez, 0, .975, 0);
  b.add(new T.CircleGeometry(.052, 7), K.fez, 0, 1.02, 0, -PI / 2, 0, 0);
  b.add(box(.012, .06, .012), 't', .05, 1.0, .0, 0, 0, -.5);
}
function headGeo(hat, v, whistle) {
  var b = new Bld([0, .8, 0], 1.1);
  face(b, v, v === 1);
  if (v === 2) { b.add(box(.07, .018, .02), K.hair, 0, HC - .06, .06); }
  if (hat === 'kb') kabalak(b); else if (hat === 'kp') kalpak(b); else fez(b);
  if (whistle) b.add(box(.02, .014, .02), K.brass, 0, HC - .055, .08);
  b.joint(0, .82, 0, .06, .3);
  return b.build();
}

/* ───────── aletler ───────── */
function rifleGeo() {
  var b = new Bld([0, 0, 0], 1.0);
  b.add(box(.034, .07, .17), K.wood, 0, -.012, -.1, .1, 0, 0);
  b.add(box(.032, .04, .34), K.wood, 0, 0, .17);
  b.add(cyl(.011, .011, .54, 5, true), K.steel, 0, .017, .24, PI / 2, 0, 0);
  b.add(box(.012, .018, .17), K.blade, 0, .017, .61);
  return b.build();
}
function pistolGeo() {
  var b = new Bld([0, 0, 0], 1.0);
  b.add(box(.026, .02, .12), K.steel, 0, .02, .05);
  b.add(box(.024, .06, .03), K.wood, 0, -.02, -.01, .25, 0, 0);
  return b.build();
}
function sabreGeo() {
  var b = new Bld([0, 0, 0], 1.0);
  b.add(box(.014, .016, .1), K.leather, 0, 0, -.05);
  b.add(box(.07, .012, .02), K.brass, 0, 0, .01);
  b.add(box(.012, .035, .42), K.blade, 0, .004, .24, -.03, 0, 0);
  b.add(box(.012, .035, .36), K.blade, 0, -.012, .62, -.1, 0, 0);
  return b.build();
}
function carbineGeo() {
  var b = new Bld([0, HIPY, 0], 1.0);
  b.add(box(.03, .06, .17), K.wood, -.07, .7, -.14, -.9, 0, .0);
  b.add(cyl(.011, .011, .5, 5, true), K.steel, -.07, .84, -.26, -.9 + PI / 2, 0, 0);
  return b.build();
}
function shellGeo() {
  var b = new Bld([0, 0, 0], 1.0);
  b.add(cyl(.036, .036, .17, 5), K.brass, 0, 0, 0, PI / 2, 0, 0);
  b.add(cyl(.001, .036, .07, 5, true), K.gunD, 0, 0, .12, PI / 2, 0, 0);
  return b.build();
}
function sticksGeo() {
  var b = new Bld([0, 0, 0], 1.0);
  b.add(cyl(.01, .01, .2, 5, true), K.wood, 0, 0, .06, PI / 2, 0, 0);
  b.add(sph(.03, 4, 3), K.leather, 0, 0, .17);
  return b.build();
}
function poleGeo() {
  var b = new Bld([0, 0, 0], 2);
  b.add(cyl(.013, .013, 1.9, 5, true), K.wood, 0, 0, .65, PI / 2, 0, 0);
  b.add(sph(.03, 5, 4), K.brass, 0, 0, 1.62);
  b.add(cyl(.001, .02, .1, 4, true), K.brass, 0, 0, 1.69, PI / 2, 0, 0);
  return b.build();
}
function flagGeo() {   /* kutup yerel +z; kumas +x'e dogru */
  var b = new Bld([0, 0, 0], 2);
  b.add(box(.15, .012, .34), 't', .075, 0, 1.4, 0, 0, 0);
  b.add(box(.15, .012, .34), 't', .22, .02, 1.4, 0, .0, .12);
  b.add(box(.15, .012, .34), 't', .36, .0, 1.4, 0, 0, -.1);
  b.add(box(.45, .014, .035), K.brass, .22, .0, 1.575);
  return b.build();
}
function drumGeo() {
  var b = new Bld([0, HIPY, 0], 1.0);
  b.add(cyl(.17, .15, .15, 9), K.copper, 0, .58, .2, .55, 0, 0);
  b.add(new T.CircleGeometry(.165, 9), K.linen, 0, .63 + .02, .245, -PI / 2 + .55, 0, 0);
  b.add(cyl(.175, .162, .06, 9, true), 't', 0, .568, .19, .55, 0, 0);
  b.add(box(.03, .3, .012), K.leather, .07, .76, .1, .2, 0, .15); b.add(box(.03, .3, .012), K.leather, -.07, .76, .1, .2, 0, -.15);
  return b.build();
}
function ringGeo() {
  var b = new Bld([0, 0, 0], 1.0);
  b.add(new T.RingGeometry(.3, .4, 18), 't', 0, .02, 0, -PI / 2, 0, 0);
  return b.build();
}

/* ───────── at ───────── */
var PV_HORSE = [0, .85, 0], PV_FORE = [0, .78, .38], PV_HIND = [0, .8, -.4];
function horseGeo() {
  var b = new Bld(PV_HORSE, 1.7);
  b.add(sph(.32, 8, 6), K.horse, 0, .85, 0, 0, 0, 0, .98, 1.0, 1.75);
  b.limb([0, .98, .42], [0, 1.2, .62], .2, .15, K.horse, 7);
  b.limb([0, 1.2, .62], [0, 1.45, .74], .15, .125, K.horse, 7);
  b.add(box(.05, .5, .12), K.mane, 0, 1.3, .55, .62, 0, 0);
  b.limb([0, 1.5, .78], [0, 1.28, 1.0], .12, .085, K.horse, 7, false);
  b.add(box(.02, .05, .26), K.leather, .062, 1.4, .93, .85, 0, 0); b.add(box(.02, .05, .26), K.leather, -.062, 1.4, .93, .85, 0, 0);
  b.add(cyl(.03, .02, .1, 4, true), K.mane, .06, 1.58, .72, -.2, 0, 0); b.add(cyl(.03, .02, .1, 4, true), K.mane, -.06, 1.58, .72, -.2, 0, 0);
  b.limb([0, 1.05, -.52], [0, .85, -.7], .07, .06, K.mane, 6); b.limb([0, .85, -.7], [0, .5, -.76], .06, .035, K.mane, 6);
  b.add(box(.46, .03, .5), 't', 0, 1.17, -.02);                      /* eyer altı belleme */
  [1, -1].forEach(function (sg) { b.add(box(.03, .26, .46), 't', sg * .25, 1.05, -.02, 0, 0, sg * .35); });
  b.add(box(.3, .06, .36), K.leather, 0, 1.2, -.02);
  b.add(box(.02, .36, .06), K.leather, .31, .88, .04); b.add(box(.02, .36, .06), K.leather, -.31, .88, .04);
  b.joint(0, .85, 0, .3, .15);
  return b.build();
}
function legsGeo(pv, z0, back) {
  var b = new Bld(pv, 1.7), hx, sg;
  [1, -1].forEach(function (sg) {
    hx = sg * .17; var s = back ? -1 : 1;
    if (!back) { b.limb([hx, .78, z0], [hx, .48, z0 + .04], .1, .075, K.horse, 6); b.limb([hx, .48, z0 + .04], [hx, .14, z0 + .02], .06, .05, K.horse, 6); b.add(box(.13, .11, .15), K.hoof, hx, .055, z0 + .03); }
    else { b.limb([hx, .82, z0], [hx, .5, z0 - .12], .12, .075, K.horse, 6); b.limb([hx, .5, z0 - .12], [hx, .14, z0 - .04], .06, .05, K.horse, 6); b.add(box(.13, .11, .15), K.hoof, hx, .055, z0 - .03); }
  });
  b.joint(0, pv[1], pv[2], .15, .3);
  return b.build();
}

/* ───────── top (75 mm sahra topu) ───────── */
var PV_BARREL = [0, .64, 0], PV_AXLE = [0, .4, 0];
function gunCarGeo() {
  var b = new Bld([0, 0, 0], 1.2);
  b.add(box(1.0, .05, .06), K.gunD, 0, .4, 0);
  [1, -1].forEach(function (sg) {
    b.limb([sg * .09, .46, -.1], [sg * .3, .05, -1.25], .036, .03, K.gun, 6);
    b.add(box(.1, .025, .2), K.gunD, sg * .3, .03, -1.25);
  });
  b.add(cyl(.085, .085, .6, 8, true), K.gunD, 0, .61, .0, PI / 2, 0, 0);
  b.add(box(.62, .4, .026), [K.gun, .35], 0, .84, .3);
  b.add(box(.62, .06, .03), 't', 0, 1.01, .3);
  [1, -1].forEach(function (sg) { b.add(box(.1, .36, .02), [K.gun, .35], sg * .33, .82, .25, 0, sg * .5, 0); });
  b.add(box(.32, .22, .24), K.wood, .72, .15, -.25); b.add(box(.33, .03, .25), K.brass, .72, .27, -.25);
  b.add(box(.5, .05, .06), K.gunD, 0, .52, .0);
  return b.build();
}
function gunBarrelGeo() {
  var b = new Bld(PV_BARREL, 1.2);
  b.limb([0, .64, -.3], [0, .64, .95], .052, .034, K.steel, 8, false);
  b.add(cyl(.045, .045, .12, 8, true), K.gunD, 0, .64, .93, PI / 2, 0, 0);
  b.add(box(.12, .12, .16), K.gunD, 0, .64, -.32);
  b.add(cyl(.02, .02, .7, 6, true), K.brass, 0, .74, .2, PI / 2, 0, 0);
  return b.build();
}
function gunWheelsGeo() {
  var b = new Bld(PV_AXLE, 1.2);
  [1, -1].forEach(function (sg) {
    var x = sg * .5;
    b.add(cyl(.4, .4, .06, 12, true), K.wood, x, .4, 0, 0, 0, PI / 2);
    b.add(cyl(.405, .405, .035, 12, true), K.gunD, x, .4, 0, 0, 0, PI / 2);
    for (var i = 0; i < 3; i++) b.add(box(.04, .78, .045), K.wood, x, .4, 0, i * PI / 3, 0, 0);
    b.add(cyl(.065, .065, .13, 8), K.gunD, x, .4, 0, 0, 0, PI / 2);
  });
  return b.build();
}

/* flas */
function flashGeo() {
  var out = [], uvs = [], i, g, geos = [];
  var a = new T.PlaneGeometry(.5, .16); a.rotateY(PI / 2);
  var c = new T.PlaneGeometry(.5, .16); c.rotateY(PI / 2); c.rotateZ(PI / 2);
  [a, c].forEach(function (p) { p.translate(0, 0, .22); g = p.toNonIndexed(); for (i = 0; i < g.attributes.position.array.length; i++) out.push(g.attributes.position.array[i]); for (i = 0; i < g.attributes.uv.array.length; i++) uvs.push(g.attributes.uv.array[i]); });
  var r = new T.BufferGeometry();
  r.setAttribute('position', new T.Float32BufferAttribute(out, 3)); r.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); return r;
}

/* ═════════════════════ MATEMATIK ═════════════════════ */
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
function about(o, rx, ry, rz, px, py, pz, dx, dy, dz) {
  mset(o, 0, rx, ry, rz, 0, 0, 0);
  o[3] = px + dx - (o[0] * px + o[1] * py + o[2] * pz); o[7] = py + dy - (o[4] * px + o[5] * py + o[6] * pz); o[11] = pz + dz - (o[8] * px + o[9] * py + o[10] * pz);
}
function scl(o, oo, s) { o[oo] *= s; o[oo + 1] *= s; o[oo + 2] *= s; o[oo + 4] *= s; o[oo + 5] *= s; o[oo + 6] *= s; o[oo + 8] *= s; o[oo + 9] *= s; o[oo + 10] *= s; }
function ease(x) { return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x); }
function fr(x) { return x - Math.floor(x); }
function lerp(a, b, t) { return a + (b - a) * t; }
function hash1(p) { return fr(sin(p * 12.9898 + 78.233) * 43758.5453); }
function hash2(p) { return fr(sin(p * 7.131 + 3.17) * 9619.37); }
function ident(o, oo) { mset(o, oo, 0, 0, 0, 0, 0, 0); }

var NS = 17, LOC = new Float64Array(12 * NS), FL = { on: 0, slot: 7, mz: .62, size: .2 };
var Gd = new Float64Array(12), Gt = new Float64Array(12), Gl = new Float64Array(12), Gh = new Float64Array(12), Mp = new Float64Array(12), Mq = new Float64Array(12), TM = new Float64Array(12);

function basisSet(o, oo, yx, yy, yz, hx, hy, hz, tx, ty, tz) {
  var l = sqrt(yx * yx + yy * yy + yz * yz) || 1; yx /= l; yy /= l; yz /= l;
  var d = hx * yx + hy * yy + hz * yz, zx = hx - d * yx, zy = hy - d * yy, zz = hz - d * yz, zl = sqrt(zx * zx + zy * zy + zz * zz);
  if (zl < 1e-5) { zx = 0; zy = 0; zz = 1; d = yz; zx -= d * yx; zy -= d * yy; zz -= d * yz; zl = sqrt(zx * zx + zy * zy + zz * zz) || 1; }
  zx /= zl; zy /= zl; zz /= zl;
  var xx = yy * zz - yz * zy, xy = yz * zx - yx * zz, xz = yx * zy - yy * zx;
  o[oo] = xx; o[oo + 1] = yx; o[oo + 2] = zx; o[oo + 3] = tx;
  o[oo + 4] = xy; o[oo + 5] = yy; o[oo + 6] = zy; o[oo + 7] = ty;
  o[oo + 8] = xz; o[oo + 9] = yz; o[oo + 10] = zz; o[oo + 11] = tz;
}
/* iki kemikli kol: (sx,sy,sz) omuz -> (tx,ty,tz) el hedefi, h* dirsek ipucu */
function ik(iU, iL, sx, sy, sz, tx, ty, tz, hx, hy, hz) {
  var dx = tx - sx, dy = ty - sy, dz = tz - sz, d = sqrt(dx * dx + dy * dy + dz * dz), rch = (UA + FA) * .995;
  if (d < .08) d = .08;
  var kk = d > rch ? rch / d : 1; dx *= kk; dy *= kk; dz *= kk; d = d > rch ? rch : d;
  var ux = dx / d, uy = dy / d, uz = dz / d, a = (UA * UA - FA * FA + d * d) / (2 * d), h = sqrt(max(0, UA * UA - a * a));
  var dt = hx * ux + hy * uy + hz * uz, px = hx - dt * ux, py = hy - dt * uy, pz = hz - dt * uz, pl = sqrt(px * px + py * py + pz * pz) || 1;
  px /= pl; py /= pl; pz /= pl;
  var ex = sx + ux * a + px * h, ey = sy + uy * a + py * h, ez = sz + uz * a + pz * h;
  basisSet(LOC, iU * 12, -(ex - sx), -(ey - sy), -(ez - sz), px, py, pz, sx, sy, sz);
  basisSet(LOC, iL * 12, -(sx + dx - ex), -(sy + dy - ey), -(sz + dz - ez), px, py, pz, ex, ey, ez);
}
/* bacak: kalca (sg*HIPX, hy), a = ileri aci, flex = diz bukme, sp = dis aciklik */
function setLeg(iT, iS, sg, hy, a, flex, sp) {
  var sps = sin(sp), cps = cos(sp), dxv = sg * sps, dyv = -cps * cos(a), dzv = cps * sin(a);
  mset(LOC, iT * 12, -a, 0, sg * sp, sg * HIPX, hy, 0);
  mset(LOC, iS * 12, -(a - flex), 0, sg * sp * .5, sg * HIPX + L1 * dxv, hy + L1 * dyv, L1 * dzv);
}
function hide(i) { for (var j = 0; j < 12; j++) LOC[i * 12 + j] = 0; }
function applyG(slots, G) { for (var i = 0; i < slots.length; i++) mmul(LOC, slots[i] * 12, G, 0, LOC, slots[i] * 12); }
var TS = [0, 1, 2, 3, 4, 5, 6, 7, 12, 13], LS = [8, 9, 10, 11];

/* ═════════════════════ YAYA POZLARI ═════════════════════ */
/* kind: 'p' piyade, 'm' milis, 'k' komutan, 'g' topcu neferi, 'd' davulcu, 's' sancaktar */
function human(kind) {
  return function (st, t, ph, k) {
    var hv = hash1(ph), kneel = hash2(ph) > .5, side = hv > .5 ? 1 : -1;
    var w = t * 10 + ph, s = sin(w), cw = cos(w), f, r = 0, bolt = 0, u;
    var aL = 0, fL = .05, aR = 0, fR = .05, sp = .04, hy = -1, lean = 0, twist = 0, hp = 0, hyw = 0, skr = 0, q = 0, p1 = 0, p2 = 0;
    var px = -.16, py = .5, pz = .08, pyw = 0, ppt = 1.45, prl = 0, rx0 = 0, ry0 = -.01, rz0 = 0, lx0 = 0, ly0 = -.035, lz0 = .3, ox = 0, oy = 0, oz = 0;
    var propOn = true, freeL = false, flx = 0, fly = 0, flz = 0, freeR = false, frx = 0, fry = 0, frz = 0, hint = -.45, bounce = 0;
    FL.on = 0;
    if (kind === 'g' && st === 'fight') { st = 'fire'; k = fr(t * .5 + ph / 6.2832); }
    if (kind === 'k') { lx0 = 0; ly0 = 0; lz0 = 0; }
    if (kind === 's') { ppt = 1.3; lz0 = .32; ly0 = 0; ry0 = 0; }
    if (st === 'walk') {
      var amp = kind === 'g' ? .45 : kind === 'd' ? .5 : .66;
      aL = amp * s; aR = -amp * s; fL = .12 + .85 * max(0, cw); fR = .12 + .85 * max(0, -cw);
      lean = kind === 'd' ? .04 : .14; twist = .1 * s; hp = -lean * .8; skr = -.12 + .22 * sin(2 * w + .5);
      px = -.07; py = .64 + .012 * cos(2 * w); pz = .22; pyw = .55 - twist; ppt = .75; ry0 = -.015;
      if (kind === 'k') { px = -.13; py = .6; pz = .3; pyw = 0; ppt = .15; freeL = true; flx = .2; fly = .6 + .08 * s; flz = .06 - .1 * s; }
      if (kind === 'g') { propOn = false; freeR = true; freeL = true; frx = -.1; fry = .66; frz = .3; flx = .1; fly = .66; flz = .3; }
      if (kind === 'd') { propOn = true; }
      if (kind === 's') { px = -.12; py = .62; pz = .2; pyw = 0; ppt = 1.3 + .05 * s; }
    } else if (st === 'idle') {
      lean = .02 * sin(t * 2 + ph); hy = HIPY; skr = .02 * sin(t * 2 + ph);
      if (kind === 'p' || kind === 'm') { freeL = true; flx = .17; fly = .52; flz = .06; }
      if (kind === 'g') { propOn = false; freeR = true; freeL = true; frx = -.15; fry = .5; frz = .15; flx = .15; fly = .5; flz = .15; }
      if (kind === 'k') { px = -.15; py = .55; pz = .12; ppt = -.2; freeL = true; flx = .17; fly = .55; flz = .06; }
      if (kind === 'd') { px = -.16; py = .5; pz = .08; }
    } else if (st === 'fight' || (st === 'fire' && kind !== 'g')) {
      f = fr(t / 1.6 + ph / 6.2832);
      var close = (st === 'fight' && k > .5 && (kind === 'p' || kind === 'm'));
      if (kind === 'g') { /* fight -> fire dongusu */ }
      if (kind === 'd') {
        var bd = max(0, sin(t * 14 + ph));
        aL = .3; aR = -.25; lean = .05; hy = -1; fL = .1; fR = .1; twist = 0; propOn = true;
      } else if (kind === 's') {
        aL = .3; aR = -.3; lean = .08; px = -.12; py = .62; pz = .2; ppt = 1.3 + .1 * sin(t * 4 + ph); pyw = 0;
      } else if (close) {
        var th = fr(t * 1.4 + ph / 6.2832), tz = th < .35 ? -ease(th / .35) * .06 : th < .5 ? -.06 + ease((th - .35) / .15) * .3 : .24 - ease((th - .5) / .5) * .24;
        aL = .7; fL = .75; aR = -.45; fR = .15; lean = .2 + tz * .5; twist = .3; hp = -.1; hy = -1;
        px = -.06; py = .62; pz = .26 + tz; pyw = -.3; ppt = .12; ox = 0;
      } else {
        r = f < .14 ? (1 - f / .14) * (1 - f / .14) : 0;
        if (f < .055) { FL.on = 1 - f / .055; FL.slot = 7; FL.mz = kind === 'k' ? .12 : .57; FL.size = kind === 'k' ? .2 : .4; }
        u = f > .16 ? min(1, (f - .16) / .34) : 0; bolt = sin(u * PI);
        if (kneel && kind !== 'k') { aL = 1.35; fL = 1.35; aR = -.12; fR = 1.33; hy = .33; lean = .13 - .04 * r; sp = .1; }
        else { aL = .32; fL = .12; aR = -.3; fR = .12; lean = .06 - .03 * r; sp = .06; }
        twist = .32; hyw = -twist * .75; hp = .1 + .06 * r;
        px = -.075 - .012 * bolt; py = .735 - .05 * bolt + .004 * sin(t * 2 + ph); pz = .2 - .055 * r; pyw = -twist - .03; ppt = .03 + .07 * r - .12 * bolt; prl = .85 * bolt;
        oz = -.025 - .07 * sin(u * PI * 2); oy = .012;
        if (kind === 'k') { px = -.09; py = .74; pz = .27; freeL = true; flx = .1; fly = .98; flz = .2; ppt = .06 + .1 * r; pyw = -twist; rx0 = 0; ry0 = 0; }
        if (kind === 'g') { }
      }
    } else if (st === 'fire' && kind === 'g') {
      /* topcu nefer: mermi surer, sonra kulak kapatir */
      aL = .35; fL = .6; aR = .2; fR = .5; lean = .12; hy = -1;
      if (k < .5) { u = k / .5; propOn = true; px = 0; py = .58; pz = .3 + .12 * sin(u * PI); pyw = 0; ppt = 0; rx0 = 0; ry0 = 0; lz0 = .02; ly0 = 0; lx0 = .08; rx0 = -.05; lean = .15 + .1 * sin(u * PI); }
      else { propOn = false; freeR = true; freeL = true; frx = -.09; fry = .86; frz = .02; flx = .09; fly = .86; flz = .02; lean = .18; hp = .2; }
    } else if (st === 'die') {
      p1 = ease(k / .35); p2 = k > .35 ? ease((k - .35) / .4) : 0; q = k > .75 ? (k - .75) / .25 : 0;
      aL = lerp(0, 1.35, p1); fL = lerp(.05, 1.35, p1); aR = lerp(0, -.12, p1); fR = lerp(.05, 1.33, p1); sp = .1 * p1; hy = lerp(HIPY, .33, p1);
      lean = .5 * p1 - .15 * p2; hp = .3 * p1; twist = .3 * p2 * side;
      px = lerp(-.075, -.1 - .15 * p2, p1); py = lerp(.7, .5 - .2 * p2, p1); pz = lerp(.2, .35, p1); pyw = 0; ppt = lerp(.1, -.4, p1); prl = 1.2 * p2; ox = oy = oz = 0;
      freeR = true; freeL = true; frx = -.18 - .12 * p2; fry = .66 + .1 * p2; frz = .18 - .1 * p2; flx = .18 + .12 * p2; fly = .6 + .2 * p2; flz = .12 - .05 * p2;
      if (kind === 'g' || kind === 'd' || kind === 's') propOn = false;
    }
    /* bacaklar */
    if (st === 'die') { ident(Gd, 0); about(Gd, 0, 0, side * p2 * 1.45, 0, 0, 0, 0, -q * .6, 0); scl(Gd, 0, 1 - q * .4); } else ident(Gd, 0);
    var dL = L1 * cos(aL) + L2 * cos(aL - fL), dR = L1 * cos(aR) + L2 * cos(aR - fR);
    if (hy < 0) hy = max(dL, dR);
    setLeg(8, 10, 1, hy, aL, fL, sp); setLeg(9, 11, -1, hy, aR, fR, sp);
    /* govde grubu */
    about(Gt, lean, twist, 0, 0, HIPY, 0, 0, hy - HIPY, 0); mmul(Gt, 0, Gd, 0, Gt, 0);
    mset(LOC, 0, 0, 0, 0, 0, HIPY, 0);
    mset(LOC, 12, hp, hyw, 0, 0, .8, 0);
    mset(LOC, 24, skr, 0, 0, 0, .58, 0);
    /* alet */
    mset(Mp, 0, -ppt, pyw, prl, px, py, pz);
    var Rx = Mp[3] + Mp[0] * rx0 + Mp[1] * (ry0 + oy) + Mp[2] * (rz0 + oz), Ry = Mp[7] + Mp[4] * rx0 + Mp[5] * (ry0 + oy) + Mp[6] * (rz0 + oz), Rz = Mp[11] + Mp[8] * rx0 + Mp[9] * (ry0 + oy) + Mp[10] * (rz0 + oz);
    var Lx = Mp[3] + Mp[0] * lx0 + Mp[1] * ly0 + Mp[2] * lz0, Ly = Mp[7] + Mp[4] * lx0 + Mp[5] * ly0 + Mp[6] * lz0, Lz = Mp[11] + Mp[8] * lx0 + Mp[9] * ly0 + Mp[10] * lz0;
    if (propOn) { for (var j = 0; j < 12; j++) LOC[84 + j] = Mp[j]; } else hide(7);
    if (freeR) { Rx = frx; Ry = fry; Rz = frz; }
    if (freeL) { Lx = flx; Ly = fly; Lz = flz; }
    if (kind === 'k' && !freeL) { Lx = .17; Ly = .5; Lz = .1; }
    if (kind === 'd') {
      var bdd = (st === 'walk' ? max(0, sin(t * 8 + ph)) : st === 'fight' ? max(0, sin(t * 14 + ph)) : max(0, sin(t * 4 + ph))), bdl = (st === 'walk' ? max(0, -sin(t * 8 + ph)) : st === 'fight' ? max(0, -sin(t * 14 + ph)) : max(0, -sin(t * 4 + ph)));
      if (st === 'die') { bdd = bdl = 0; }
      Rx = -.09; Ry = .65 + .15 * bdd; Rz = .27 - .04 * bdd; Lx = .09; Ly = .65 + .15 * bdl; Lz = .27 - .04 * bdl;
      mset(LOC, 84, -(-.7 + .9 * bdd), 0, 0, Rx, Ry, Rz); mset(LOC, 156, -(-.7 + .9 * bdl), 0, 0, Lx, Ly, Lz);
      if (st === 'die') { hide(7); hide(13); }
      mset(LOC, 144, 0, 0, 0, 0, HIPY, 0);
    }
    if (kind === 's') {
      if (propOn) { mset(TM, 0, 0, 0, .12 * sin(t * 5 + ph) + (st === 'walk' ? .08 * s : 0), 0, 0, 0); mmul(LOC, 144, Mp, 0, TM, 0); } else hide(12);
    }
    /* kollar */
    ik(3, 4, SHX, SHY, 0, Lx, Ly, Lz, .5, -1, -.35); ik(5, 6, -SHX, SHY, 0, Rx, Ry, Rz, -.5, -1, -.35);
    applyG(TS, Gt); applyG(LS, Gd);
    if (kind === 'k') { mset(LOC, 144, 0, 0, 0, 0, 0, 0); scl(LOC, 144, st === 'die' ? max(0, 1 - k * 3) : 1); }
    return q;
  };
}

/* ═════════════════════ SUVARI ═════════════════════ */
function cavPose(st, t, ph, k) {
  var hv = hash1(ph), side = hv > .5 ? 1 : -1, w = t * 10 + ph, s = sin(w), cw = cos(w), bob = 0, pitch = 0, fl = 0, hl = 0, lean = .2, q = 0, p = 0, f, u, slash = 0;
  var px = -.2, py = .62, pz = .16, pyw = -.1, ppt = 1.0, prl = 0, freeR = false;
  FL.on = 0; ident(Gd, 0);
  if (st === 'walk') { fl = s * .8; hl = -s * .8; bob = abs(cw) * .06; pitch = s * .08; lean = .25; py = .62 + .015 * s; }
  else if (st === 'idle') { pitch = sin(t * 1.6 + ph) * .03; bob = sin(t * 2.1 + ph) * .008; lean = .05; }
  else if (st === 'fight') {
    f = fr(t * 1.1 + ph / 6.2832);
    if (f < .35) { u = ease(f / .35); py = .62 + .25 * u; pz = .1; pyw = -.7 * u; ppt = 1.0 + .6 * u; px = -.28; }
    else if (f < .55) { u = (f - .35) / .2; slash = sin(u * PI * .5); px = lerp(-.28, 0, u); py = lerp(.87, .7, u); pz = lerp(.1, .4, u); pyw = lerp(-.7, .9, u); ppt = lerp(1.6, .15, u); }
    else { u = ease((f - .55) / .45); px = lerp(0, -.2, u); py = lerp(.7, .62, u); pz = lerp(.4, .16, u); pyw = lerp(.9, -.1, u); ppt = lerp(.15, 1.0, u); }
    pitch = -.24 * sin(min(1, f / .5) * PI); bob = .05 * sin(f * PI); fl = -.9 * sin(min(1, f / .5) * PI); hl = .25; lean = .12 + .25 * slash + .1 * sin(f * PI * 2);
  } else if (st === 'die') {
    p = ease(k / .6); q = k > .6 ? (k - .6) / .4 : 0;
    about(Gd, 0, 0, side * p * 1.45, 0, 0, 0, side * p * .1, -q * 1.1 + sin(p * PI) * .08, 0); scl(Gd, 0, 1 - q * .5);
    fl = p * .7; hl = -p * .5; lean = -p * .6; freeR = true;
  }
  about(LOC, pitch, 0, 0, 0, .85, -.4, 0, bob, 0); for (var i = 0; i < 12; i++) Gh[i] = LOC[i];
  mmul(Gh, 0, Gd, 0, Gh, 0);                                   /* at grubu */
  mset(LOC, 14 * 12, 0, 0, 0, 0, .85, 0); mset(LOC, 15 * 12, fl, 0, 0, PV_FORE[0], PV_FORE[1], PV_FORE[2]); mset(LOC, 16 * 12, hl, 0, 0, PV_HIND[0], PV_HIND[1], PV_HIND[2]);
  for (i = 14; i <= 16; i++) mmul(LOC, i * 12, Gh, 0, LOC, i * 12);
  mset(TM, 0, 0, 0, 0, 0, .68, -.03); mmul(Gl, 0, Gh, 0, TM, 0);     /* binici kalcasi */
  about(Gt, lean, 0, 0, 0, HIPY, 0, 0, .68, -.03); mmul(Gt, 0, Gh, 0, Gt, 0);
  /* binici */
  mset(LOC, 0, 0, 0, 0, 0, HIPY, 0); mset(LOC, 12, .05 + .1 * slash, 0, 0, 0, .8, 0); mset(LOC, 24, .15, 0, 0, 0, .58, 0);
  mset(Mp, 0, -ppt, pyw, prl, px, py, pz); for (i = 0; i < 12; i++) LOC[84 + i] = Mp[i];
  mset(LOC, 144, 0, 0, 0, 0, HIPY, 0);
  var Rx = Mp[3] - Mp[1] * .01, Ry = Mp[7] - Mp[5] * .01, Rz = Mp[11] - Mp[9] * .01;
  if (freeR) { Rx = -.2 - .1 * p; Ry = .9 + .2 * p; Rz = .1; }
  ik(3, 4, SHX, SHY, 0, .1, .7, .3, .5, -1, -.35); ik(5, 6, -SHX, SHY, 0, Rx, Ry, Rz, -.5, -1, -.35);
  applyG(TS, Gt);
  setLeg(8, 10, 1, HIPY, .9, .85, .7); setLeg(9, 11, -1, HIPY, .9, .85, .7);
  applyG(LS, Gl);
  return q;
}

/* ═════════════════════ TOP ═════════════════════ */
function gunPose(st, t, ph, k) {
  var rec = 0, wr = 0, p = 0, q = 0;
  ident(Gd, 0);
  if (st === 'walk') wr = t * 7 + ph;
  else if (st === 'fire') { rec = k < .1 ? k / .1 : Math.pow(1 - (k - .1) / .9, 2); wr = -rec * .4; FL.on = k < .06 ? 1 - k / .06 : 0; FL.slot = 1; FL.mz = 1.0; FL.size = 1.4; }
  else if (st === 'die') { p = ease(k / .6); q = k > .6 ? (k - .6) / .4 : 0; about(Gd, -p * .0, 0, 0, 0, 0, 0, 0, -q * .9, 0); scl(Gd, 0, 1 - q * .4); }
  if (st !== 'fire') FL.on = 0;
  mset(Gl, 0, 0, 0, 0, 0, 0, 0); about(Gh, p * .45, 0, 0, 0, .3, -1.0, 0, -p * .12, 0); mmul(Gh, 0, Gd, 0, Gh, 0);
  mset(TM, 0, 0, 0, 0, 0, 0, -rec * .06); mmul(Gt, 0, Gh, 0, TM, 0);
  mset(LOC, 0, 0, 0, 0, 0, 0, 0); mmul(LOC, 0, Gt, 0, LOC, 0);
  mset(LOC, 12, -.08 * rec + p * .4, 0, 0, 0, PV_BARREL[1] - p * .22, -rec * .27); mmul(LOC, 12, Gt, 0, LOC, 12);
  mset(LOC, 24, wr + p * .5, 0, p * .3, 0, .4 - p * .06, 0); mmul(LOC, 24, Gd, 0, LOC, 24);
  return q;
}

/* ═════════════════════ TANIMLAR ═════════════════════ */
var TYPES = ['milis', 'piyade', 'komutan', 'suvari', 'topcu', 'topcuEr', 'davulcu', 'sancaktar'];
var POOL = null, DEF = null;
function V(keys, pick) { return { v: keys, pick: pick || keys.map(function (_, i) { return i; }) }; }
function ensure() {
  if (DEF) return;
  var B = {
    armU: armUpperGeo, armL: armLowerGeo, thigh: function () { return thighGeo(false); }, thighM: function () { return thighGeo(true); },
    shinP: function () { return shinGeo(false); }, shinB: function () { return shinGeo(true); },
    torsoP: function () { return torsoGeo('p'); }, torsoM: function () { return torsoGeo('m'); }, torsoK: function () { return torsoGeo('k'); },
    skirtP: function () { return skirtGeo('p'); }, skirtK: function () { return skirtGeo('k'); },
    hP0: function () { return headGeo('kb', 0); }, hP1: function () { return headGeo('kb', 1); }, hP2: function () { return headGeo('kb', 2); },
    hM0: function () { return headGeo('kp', 0); }, hM1: function () { return headGeo('fz', 0); }, hM2: function () { return headGeo('kp', 1); },
    hK0: function () { return headGeo('kp', 0, true); }, hK1: function () { return headGeo('kp', 1, true); },
    rifle: rifleGeo, pistol: pistolGeo, sabre: sabreGeo, carbine: carbineGeo, shell: shellGeo, sticks: sticksGeo, pole: poleGeo, flag: flagGeo, drum: drumGeo, ring: ringGeo,
    horse: horseGeo, foreL: function () { return legsGeo(PV_FORE, .38, false); }, hindL: function () { return legsGeo(PV_HIND, -.4, true); },
    gunCar: gunCarGeo, gunBarrel: gunBarrelGeo, gunWheels: gunWheelsGeo
  };
  POOL = {};
  Object.keys(B).forEach(function (k) { var g = B[k](); POOL[k] = { key: k, geo: g, tris: g.attributes.position.count / 3, mult: 1 }; });
  function S(map) { var a = []; for (var i = 0; i < NS; i++) a.push(null); for (var k in map) a[k] = map[k]; return a; }
  var arms = { 3: 'armU', 4: 'armL', 5: 'armU', 6: 'armL' }, legsP = { 8: 'thigh', 9: 'thigh', 10: 'shinP', 11: 'shinP' }, legsB = { 8: 'thigh', 9: 'thigh', 10: 'shinB', 11: 'shinB' };
  function mix(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  DEF = {};
  DEF.piyade = { slots: S(mix(mix(arms, legsP), { 0: 'torsoP', 1: V(['hP0', 'hP1', 'hP2']), 2: 'skirtP', 7: 'rifle' })), scale: 1, head: 1.12, shadow: [.34, .34], pose: human('p') };
  DEF.milis = { slots: S(mix(mix(arms, { 8: 'thighM', 9: 'thighM', 10: 'shinP', 11: 'shinP' }), { 0: 'torsoM', 1: V(['hM0', 'hM1', 'hM2']), 7: 'rifle' })), scale: 1, head: 1.1, shadow: [.32, .32], pose: human('m') };
  DEF.komutan = { slots: S(mix(mix(arms, legsB), { 0: 'torsoK', 1: V(['hK0', 'hK1']), 2: 'skirtK', 7: 'pistol', 12: 'ring' })), scale: 1.12, head: 1.13, shadow: [.4, .4], pose: human('k') };
  DEF.topcuEr = { slots: S(mix(mix(arms, legsP), { 0: 'torsoP', 1: V(['hP0', 'hP1', 'hP2']), 2: 'skirtP', 7: 'shell' })), scale: 1, head: 1.12, shadow: [.34, .34], pose: human('g') };
  DEF.davulcu = { slots: S(mix(mix(arms, legsP), { 0: 'torsoP', 1: V(['hM0', 'hM1', 'hM2'], [0, 2]), 2: 'skirtP', 7: 'sticks', 12: 'drum', 13: 'sticks' })), scale: 1, head: 1.1, shadow: [.4, .4], pose: human('d') };
  DEF.sancaktar = { slots: S(mix(mix(arms, legsP), { 0: 'torsoP', 1: V(['hP0', 'hP1', 'hP2']), 2: 'skirtP', 7: 'pole', 12: 'flag' })), scale: 1, head: 1.12, shadow: [.34, .34], pose: human('s') };
  DEF.suvari = { slots: S(mix(mix(arms, legsB), { 0: 'torsoP', 1: V(['hM0', 'hM1', 'hM2'], [0, 2]), 2: 'skirtP', 7: 'sabre', 12: 'carbine', 14: 'horse', 15: 'foreL', 16: 'hindL' })), scale: 1, head: 1.95, shadow: [.5, .95], pose: cavPose };
  DEF.topcu = { slots: S({ 0: 'gunCar', 1: 'gunBarrel', 2: 'gunWheels' }), scale: 1, head: 1.1, shadow: [.75, 1.1], pose: gunPose };
  TYPES.forEach(function (n) {
    var d = DEF[n], cnt = {}; d.tris = 0; d.draw = 0;
    d.slots.forEach(function (e) { if (!e) return; var k = typeof e === 'string' ? e : e.v[0]; cnt[k] = (cnt[k] || 0) + 1; d.tris += POOL[k].tris; });
    d.slots.forEach(function (e) { if (!e) return; var ks = typeof e === 'string' ? [e] : e.v; ks.forEach(function (k) { POOL[k].mult = max(POOL[k].mult, cnt[ks[0]] || 1); }); });
  });
}

/* ═════════════════════ MALZEME ═════════════════════ */
var GRAD = null;
function gradTex() {
  if (GRAD) return GRAD;
  var t = new T.DataTexture(new Uint8Array([52, 80, 130, 185, 215]), 5, 1, T.LuminanceFormat);
  t.minFilter = T.LinearFilter; t.magFilter = T.LinearFilter; t.generateMipmaps = false; t.unpackAlignment = 1; t.needsUpdate = true;
  return (GRAD = t);
}
function makeMat(instanced, low, teamHex) {
  var m = new T.MeshToonMaterial({ vertexColors: true, gradientMap: gradTex() });
  if (!low) m.defines = { MF_RIM: '' };
  var uTeam = { value: new T.Color(teamHex == null ? 0xffffff : teamHex) };
  m.onBeforeCompile = function (sh) {
    if (!instanced) sh.uniforms.uTeam = uTeam;
    sh.vertexShader = sh.vertexShader
      .replace('#include <color_pars_vertex>', '#include <color_pars_vertex>\nattribute float aTeam;\nattribute float aShade;\nvarying float vTeam;' + (instanced ? '' : '\nuniform vec3 uTeam;'))
      .replace('#include <color_vertex>', 'vTeam = aTeam;\nvColor = mix(color.rgb, ' + (instanced ? 'instanceColor.rgb' : 'uTeam') + ', aTeam) * aShade;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <color_pars_fragment>', '#include <color_pars_fragment>\nvarying float vTeam;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor * vTeam * vTeam * 0.2;')
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n#ifdef MF_RIM\nfloat mfRim = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 2.6);\nreflectedLight.indirectDiffuse += vec3(1.0, 0.78, 0.5) * mfRim * 0.22;\n#endif');
  };
  m.customProgramCacheKey = function () { return 'mfv4' + (instanced ? 1 : 0) + (low ? 1 : 0); };
  return m;
}
var SHTEX = null, FLTEX = null;
function canvasTex(draw) { var c = document.createElement('canvas'); c.width = c.height = 64; draw(c.getContext('2d')); return new T.CanvasTexture(c); }
function shadowTex() {
  return SHTEX || (SHTEX = canvasTex(function (x) {
    var g = x.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, 'rgba(0,0,0,0.6)'); g.addColorStop(.55, 'rgba(0,0,0,0.36)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  }));
}
function flashTex() {
  return FLTEX || (FLTEX = canvasTex(function (x) {
    var g = x.createRadialGradient(32, 32, 1, 32, 32, 31); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(.3, 'rgba(255,200,90,0.9)'); g.addColorStop(.7, 'rgba(255,120,30,0.35)'); g.addColorStop(1, 'rgba(255,80,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  }));
}

/* ═════════════════════ ORDU ═════════════════════ */
function createArmy(o) {
  ensure(); o = o || {};
  var low = o.quality === 'dusuk', cap = o.max || (low ? 140 : 280), group = new T.Group(), mat = makeMat(true, low), pools = {}, total = 0, time = 0;
  var white = new T.Color(1, 1, 1), stats = { soldiers: 0, drawCalls: 0, triangles: 0 }, keys = Object.keys(POOL);
  keys.forEach(function (k) {
    var P = POOL[k], c = cap * P.mult, m = new T.InstancedMesh(P.geo, mat, c);
    m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.setColorAt(0, white); m.instanceColor.setUsage(T.DynamicDrawUsage);
    m.frustumCulled = false; m.count = 0; m.visible = false; m.name = k; group.add(m);
    pools[k] = { mesh: m, pa: m.instanceMatrix.array, ca: m.instanceColor.array, n: 0, cap: c, tris: P.tris };
  });
  var sg = new T.PlaneGeometry(1.6, 1.6); sg.rotateX(-PI / 2);
  var smat = new T.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  var sm = new T.InstancedMesh(sg, smat, cap); sm.instanceMatrix.setUsage(T.DynamicDrawUsage); sm.frustumCulled = false; sm.count = 0; sm.visible = false; sm.renderOrder = -1; group.add(sm);
  var fg = flashGeo(), fmat = new T.MeshBasicMaterial({ map: flashTex(), transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, color: 0xffffff });
  var fm = new T.InstancedMesh(fg, fmat, cap); fm.instanceMatrix.setUsage(T.DynamicDrawUsage); fm.frustumCulled = false; fm.count = 0; fm.visible = false; fm.renderOrder = 5; group.add(fm);
  var sa = sm.instanceMatrix.array, fa = fm.instanceMatrix.array, sn = 0, fn = 0, W = new Float64Array(12), R = new Float64Array(12);
  var api = {
    object: group,
    begin: function (t) { time = t || 0; total = 0; sn = 0; fn = 0; for (var n in pools) pools[n].n = 0; },
    add: function (type, hex, x, z, yaw, scale, state, phase, kk) {
      var d = DEF[type]; if (!d || total >= cap) return false;
      phase = phase || 0; var hv = hash1(phase), sc = (scale == null ? 1 : scale) * d.scale * (type === 'topcu' ? 1 : 1 + (hv - .5) * .08);
      var cy = cos(yaw || 0) * sc, sy = sin(yaw || 0) * sc, q = d.pose(state, time, phase, kk || 0), p, i;
      W[0] = cy; W[1] = 0; W[2] = sy; W[3] = x; W[4] = 0; W[5] = sc; W[6] = 0; W[7] = 0; W[8] = -sy; W[9] = 0; W[10] = cy; W[11] = z;
      var r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
      for (p = 0; p < NS; p++) {
        var e = d.slots[p]; if (!e) continue;
        var P = pools[typeof e === 'string' ? e : e.v[e.pick[Math.floor(hv * e.pick.length) % e.pick.length]]]; i = P.n; if (i >= P.cap) continue;
        mmul(R, 0, W, 0, LOC, p * 12);
        var a = P.pa, o16 = i * 16;
        a[o16] = R[0]; a[o16 + 1] = R[4]; a[o16 + 2] = R[8]; a[o16 + 3] = 0; a[o16 + 4] = R[1]; a[o16 + 5] = R[5]; a[o16 + 6] = R[9]; a[o16 + 7] = 0;
        a[o16 + 8] = R[2]; a[o16 + 9] = R[6]; a[o16 + 10] = R[10]; a[o16 + 11] = 0; a[o16 + 12] = R[3]; a[o16 + 13] = R[7]; a[o16 + 14] = R[11]; a[o16 + 15] = 1;
        var c = P.ca; c[i * 3] = r; c[i * 3 + 1] = g; c[i * 3 + 2] = b; P.n++;
        if (p === FL.slot && FL.on > 0 && fn < cap) {
          var fs = FL.size * (.65 + .35 * FL.on), fo = fn * 16, mz = FL.mz;
          fa[fo] = R[0] * fs; fa[fo + 1] = R[4] * fs; fa[fo + 2] = R[8] * fs; fa[fo + 3] = 0; fa[fo + 4] = R[1] * fs; fa[fo + 5] = R[5] * fs; fa[fo + 6] = R[9] * fs; fa[fo + 7] = 0;
          fa[fo + 8] = R[2] * fs; fa[fo + 9] = R[6] * fs; fa[fo + 10] = R[10] * fs; fa[fo + 11] = 0;
          fa[fo + 12] = R[3] + R[2] * mz; fa[fo + 13] = R[7] + R[6] * mz; fa[fo + 14] = R[11] + R[10] * mz; fa[fo + 15] = 1; fn++;
        }
      }
      var sh = d.shadow, ss = max(.001, 1 - q * 1.2), kx = sc * sh[0] * ss, kz = sc * sh[1] * ss, so = sn * 16, syw = sin(yaw || 0), cyw = cos(yaw || 0);
      sa[so] = cyw * kx; sa[so + 1] = 0; sa[so + 2] = -syw * kx; sa[so + 3] = 0; sa[so + 4] = 0; sa[so + 5] = 1; sa[so + 6] = 0; sa[so + 7] = 0;
      sa[so + 8] = syw * kz; sa[so + 9] = 0; sa[so + 10] = cyw * kz; sa[so + 11] = 0; sa[so + 12] = x; sa[so + 13] = .03; sa[so + 14] = z; sa[so + 15] = 1;
      sn++; total++; return true;
    },
    end: function () {
      var dc = 0, tr = 0, n, P, m;
      for (n in pools) {
        P = pools[n]; m = P.mesh; m.count = P.n; m.visible = P.n > 0;
        if (P.n > 0) {
          m.instanceMatrix.updateRange.offset = 0; m.instanceMatrix.updateRange.count = P.n * 16; m.instanceMatrix.needsUpdate = true;
          m.instanceColor.updateRange.offset = 0; m.instanceColor.updateRange.count = P.n * 3; m.instanceColor.needsUpdate = true;
          dc++; tr += P.n * P.tris;
        }
      }
      sm.count = sn; sm.visible = sn > 0;
      if (sn > 0) { sm.instanceMatrix.updateRange.offset = 0; sm.instanceMatrix.updateRange.count = sn * 16; sm.instanceMatrix.needsUpdate = true; dc++; tr += sn * 2; }
      fm.count = fn; fm.visible = fn > 0;
      if (fn > 0) { fm.instanceMatrix.updateRange.offset = 0; fm.instanceMatrix.updateRange.count = fn * 16; fm.instanceMatrix.needsUpdate = true; dc++; tr += fn * 8; }
      stats.soldiers = total; stats.drawCalls = dc; stats.triangles = tr;
    },
    headHeight: function (type) { var d = DEF[type]; return d ? d.head * d.scale : 1.2; },
    stats: function () { return { soldiers: stats.soldiers, drawCalls: stats.drawCalls, triangles: stats.triangles }; },
    dispose: function () {
      group.children.slice().forEach(function (m) { group.remove(m); if (m.dispose) m.dispose(); });
      mat.dispose(); smat.dispose(); fmat.dispose(); sg.dispose(); fg.dispose();
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
  d.slots.forEach(function (e, i) {
    if (!e) { meshes.push(null); return; }
    var k = typeof e === 'string' ? e : e.v[e.pick[0]], m = new T.Mesh(POOL[k].geo, mat); m.matrixAutoUpdate = false; root.add(m); meshes.push(m);
  });
  return { d: d, root: root, meshes: meshes };
}
function preview(type, hex) {
  ensure();
  var grp = new T.Group(), es = [], H;
  if (type === 'mehter') { es.push(buildEntry('davulcu', hex, -.45, 0)); es.push(buildEntry('sancaktar', hex, .45, 0)); H = 1.3; }
  else if (type === 'topcu') { es.push(buildEntry('topcu', hex, 0, 0)); es.push(buildEntry('topcuEr', hex, 1.0, -.3, -.4)); es.push(buildEntry('topcuEr', hex, -1.0, -.3, .4)); H = 1.2; }
  else { if (!DEF[type]) throw new Error('units.preview: bilinmeyen tip ' + type); es.push(buildEntry(type, hex, 0, 0)); H = DEF[type].head * DEF[type].scale; }
  es.forEach(function (e) { grp.add(e.root); });
  grp.userData.height = H;
  grp.userData.animate = function (t, state, k, phase) {
    es.forEach(function (e, idx) {
      e.d.pose(state || 'idle', t || 0, phase != null ? phase : idx * 1.9 + .4, k || 0);
      var s = e.d.scale;
      for (var p = 0; p < NS; p++) {
        var me = e.meshes[p]; if (!me) continue; var o = p * 12, m = me.matrix;
        m.set(LOC[o] * s, LOC[o + 1] * s, LOC[o + 2] * s, LOC[o + 3] * s, LOC[o + 4] * s, LOC[o + 5] * s, LOC[o + 6] * s, LOC[o + 7] * s, LOC[o + 8] * s, LOC[o + 9] * s, LOC[o + 10] * s, LOC[o + 11] * s, 0, 0, 0, 1);
        me.matrixWorldNeedsUpdate = true;
      }
    });
  };
  grp.userData.animate(0, 'idle', 0);
  return grp;
}

var INFO = {
  milis: { name: 'Kuvayı Milliye neferi', trigger: 'Kale çıkışı (pasif)', desc: 'Kapıdan kendiliğinden çıkan gönüllü millî kuvvet. Kalpak ya da fes, kısa ceket, bol pantolon ve çapraz fişeklikle tüfeğini kuşanır.' },
  piyade: { name: 'Piyade neferi', trigger: 'Beğeni ve 1–9 elmas', desc: 'Kabalak başlıklı, uzun kaputlu, dolaklı ve süngülü Mauser taşıyan Mehmetçik. Cephenin omurgası.' },
  komutan: { name: 'Subay', trigger: 'İzleyicinin kendi karakteri', desc: 'Her izleyici bölüğünün lideri. Kalpaklı subay; düdüğüyle birliğini toplar, tabancasıyla ileri atılır. Ayağında takım renginde halka parlar.' },
  suvari: { name: 'Süvari', trigger: '10–99 elmas', desc: 'Kalpaklı, omzunda çıplak kılıç ve sırtında karabina bulunan atlı. Hızlı hücumla cepheyi yarar, kılıç savurur.' },
  topcu: { name: 'Sahra topu', trigger: '100–999 elmas', desc: '75 mm kalkanlı sahra topu ve iki topçu neferi. Menzilde durur, üç saniyede bir surlara gülle atar.' },
  mehter: { name: 'Mehter', trigger: '1000+ elmas', desc: 'Boynunda büyük davulla davulcu ve dalgalanan sancağıyla sancaktar. Askerlerin morali yükselir.' }
};

MF.units = { TYPES: TYPES, createArmy: createArmy, preview: preview, info: INFO };
})();
