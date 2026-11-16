// Erkek ve kadın hacı karakterleri.
// Gövde modelleri ve yürüme animasyonu: Quaternius, CC0 (bkz. models/LICENSE.txt).
// İhram, pardösü, başörtüsü ve Türk bayraklı boyun çantası burada, modelin üstüne kodla giydirilir.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const IDENT = new THREE.Matrix4();
const NORMAL_RIGS = 5;                 // farklı adım fazlarına sahip ortak iskeletler
const BASE_TIMESCALE = 1.12;
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Kadın pardösüsü: Türk hac kafilelerinin canlı/pastel tonları. scarf: başörtüsü seçenekleri, band: yüz çevresindeki iç bone rengi.
const CREAM = 0xf4efe3, WHITE = 0xf6f4ee;
const COATS = [
  { coat: 0x9a86c9, scarf: [0xd9cff0, CREAM, 0xd9cff0] },     // lila
  { coat: 0x1fa3a0, scarf: [0x9fe0db, CREAM, 0x9fe0db] },     // turkuaz
  { coat: 0xd88a9d, scarf: [0xf7d3dc, CREAM, 0xf7d3dc] },     // gül kurusu
  { coat: 0x86a982, scarf: [0xcfe3c9, CREAM, 0xcfe3c9] },     // adaçayı
  { coat: 0xc9a77a, scarf: [CREAM, 0xe8d6b8], band: 0x8a6a45 },   // kum/bej
  { coat: 0x2b3f7a, scarf: [0xb9c6ee, CREAM, 0xb9c6ee] },     // lacivert
  { coat: 0x24252b, scarf: [0x24252b, WHITE] },                // siyah
  { coat: 0xb0536a, scarf: [0xf0c4d0, CREAM] },                // koyu gül
];
const HAIR_COLORS = [0x17110d, 0x17110d, 0x2a1d14, 0x3a2a1e, 0x8d8a86, 0xc9c6c1];

const load = (url) => new Promise((res, rej) => new GLTFLoader().load(url, res, undefined, rej));
const clothCache = new Map();
function cloth(color) {
  if (!clothCache.has(color)) clothCache.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.92, side: THREE.DoubleSide }));
  return clothCache.get(color);
}

const bandCache = new Map();
/** Yüz çerçevesindeki bant: aydınlıkta parlak kalsın diye hafif kendinden ışıklı. */
function bandMat(color) {
  if (!bandCache.has(color)) bandCache.set(color, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.45, roughness: 0.9, side: THREE.DoubleSide }));
  return bandCache.get(color);
}

function flagTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#e30a17'; g.fillRect(0, 0, 128, 160);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(52, 80, 30, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#e30a17'; g.beginPath(); g.arc(60, 80, 24, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 6 : 15, a = -Math.PI / 2 + i * Math.PI / 5 + 0.3; g.lineTo(88 + Math.cos(a) * r, 80 + Math.sin(a) * r); }
  g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Tüm köşeleri tek kemiğe bağlı (rijit) parça için skin öznitelikleri ekler. */
function skinTo(geo, boneIdx) {
  const n = geo.attributes.position.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { si[i * 4] = boneIdx; sw[i * 4] = 1; }
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  return geo;
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));
/** a->b aralığında 0..1 yumuşak geçiş (a>b ise ters yön). */
const sm = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

/** [[kemik, ağırlık], ...] listesinden en büyük 4 ağırlığı normalize ederek skin öznitelik dizilerine yazar. */
function putWeights(si, sw, i, list) {
  const l = list.filter((e) => e[1] > 1e-4).sort((p, q) => q[1] - p[1]).slice(0, 4);
  let tot = 0; for (const e of l) tot += e[1];
  for (let k = 0; k < 4; k++) { si[i * 4 + k] = l[k] ? l[k][0] : 0; sw[i * 4 + k] = l[k] ? l[k][1] / tot : 0; }
}

/**
 * Halkalardan kumaş: rings = [{y, rx, rz, cz, gap}] yukarıdan aşağı. gap>0 ise halka önde (yüz tarafı) açıktır:
 * açıklık kenarı halkalar boyunca düzgün bir oval çizer. weightFn(x, y, z) -> [[kemik, ağırlık], ...]
 */
function loft(rings, seg, weightFn) {
  const pos = [], idx = [], si = new Uint16Array(rings.length * (seg + 1) * 4), sw = new Float32Array(si.length);
  rings.forEach((r, ri) => {
    const g = r.gap || 0;
    for (let s = 0; s <= seg; s++) {
      const a = g + (Math.PI * 2 - 2 * g) * s / seg, x = Math.sin(a) * r.rx, z = Math.cos(a) * r.rz + (r.cz || 0);
      putWeights(si, sw, pos.length / 3, weightFn(x, r.y, z));
      pos.push(x, r.y, z);
    }
  });
  for (let r = 0; r < rings.length - 1; r++) for (let s = 0; s < seg; s++) {
    const a = r * (seg + 1) + s, b = a + seg + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  // kapalı halkalardaki dikiş (önde) için normalleri birleştir
  const nor = g.attributes.normal;
  rings.forEach((r, ri) => {
    if (r.gap) return;
    const a = ri * (seg + 1), b = a + seg, v = new THREE.Vector3(nor.getX(a) + nor.getX(b), nor.getY(a) + nor.getY(b), nor.getZ(a) + nor.getZ(b)).normalize();
    nor.setXYZ(a, v.x, v.y, v.z); nor.setXYZ(b, v.x, v.y, v.z);
  });
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  return g;
}

/** Noktalar ızgarası (rows x cols) -> skinli şerit/yüzey. pts: düz [x,y,z] dizisi. */
function sheet(pts, rows, cols, weightFn) {
  const pos = [], idx = [], si = new Uint16Array(pts.length * 4), sw = new Float32Array(si.length);
  pts.forEach((p, i) => { pos.push(p[0], p[1], p[2]); putWeights(si, sw, i, weightFn(p[0], p[1], p[2])); });
  for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
    const a = r * cols + c, b = a + cols; idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  return g;
}

/** Konumu aynı olan köşeleri birlikte işleyerek komşu ortalamasıyla yumuşatır (kas kabartısını kumaşa çevirir). */
function relax(geo, iters, k) {
  const P = geo.attributes.position, key = (i) => `${Math.round(P.getX(i) * 2e3)},${Math.round(P.getY(i) * 2e3)},${Math.round(P.getZ(i) * 2e3)}`;
  const gid = new Map(), g = new Int32Array(P.count), members = [];
  for (let i = 0; i < P.count; i++) { const kk = key(i); if (!gid.has(kk)) { gid.set(kk, members.length); members.push([]); } g[i] = gid.get(kk); members[g[i]].push(i); }
  const nb = members.map(() => new Set()), idx = geo.index.array;
  for (let t = 0; t < idx.length; t += 3) for (let a = 0; a < 3; a++) { const u = g[idx[t + a]], v = g[idx[t + (a + 1) % 3]]; if (u !== v) { nb[u].add(v); nb[v].add(u); } }
  const rep = members.map((m) => m[0]);
  for (let it = 0; it < iters; it++) {
    const np = members.map((m, gi) => {
      const r = rep[gi]; if (!nb[gi].size) return [P.getX(r), P.getY(r), P.getZ(r)];
      let x = 0, y = 0, z = 0; for (const n of nb[gi]) { const q = rep[n]; x += P.getX(q); y += P.getY(q); z += P.getZ(q); }
      const c = nb[gi].size; return [P.getX(r) + (x / c - P.getX(r)) * k, P.getY(r) + (y / c - P.getY(r)) * k, P.getZ(r) + (z / c - P.getZ(r)) * k];
    });
    members.forEach((m, gi) => { for (const i of m) P.setXYZ(i, np[gi][0], np[gi][1], np[gi][2]); });
  }
  geo.computeVertexNormals();
}

/** Gövde ağının seçilen bölgesini normal yönünde şişirerek vücuda oturan, iskeletle hareket eden giysi üretir. */
function shell(geo, keep, offset) {
  const src = geo.attributes.position, nor = geo.attributes.normal, pos = src.clone();
  const kept = new Uint8Array(src.count);
  for (let i = 0; i < src.count; i++) {
    pos.setXYZ(i, src.getX(i) + nor.getX(i) * offset, src.getY(i) + nor.getY(i) * offset, src.getZ(i) + nor.getZ(i) * offset);
    kept[i] = keep(i, src.getX(i), src.getY(i), src.getZ(i)) ? 1 : 0;
  }
  const idx = geo.index.array, out = [];
  for (let i = 0; i < idx.length; i += 3) if (kept[idx[i]] && kept[idx[i + 1]] && kept[idx[i + 2]]) out.push(idx[i], idx[i + 1], idx[i + 2]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', pos); g.setAttribute('normal', nor.clone());
  if (geo.attributes.uv) g.setAttribute('uv', geo.attributes.uv);
  g.setAttribute('skinIndex', geo.attributes.skinIndex); g.setAttribute('skinWeight', geo.attributes.skinWeight);
  g.setIndex(out);
  return g;
}

function buildClip(tracksJson, pelvisRest) {
  const tracks = [];
  for (const t of tracksJson) {
    if (t.path === 'rotation') tracks.push(new THREE.QuaternionKeyframeTrack(`${t.bone}.quaternion`, t.times, t.values));
    else if (t.path === 'translation') {
      // animasyon kaynağıyla model arasındaki kalça yüksekliği farkını gider (ayaklar yere bassın)
      const v = t.values.slice(), n = v.length / 3, mean = [0, 0, 0];
      for (let i = 0; i < v.length; i++) mean[i % 3] += v[i] / n;
      const rest = [pelvisRest.x, pelvisRest.y, pelvisRest.z];
      for (let i = 0; i < v.length; i++) v[i] += rest[i % 3] - mean[i % 3];
      tracks.push(new THREE.VectorKeyframeTrack(`${t.bone}.position`, t.times, v));
    }
  }
  return new THREE.AnimationClip('walk', -1, tracks);
}

function prepareGender(gltf, female, walkJson, rigRoot, extras) {
  gltf.scene.updateMatrixWorld(true);
  const meshes = []; gltf.scene.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
  const byMat = (s) => meshes.find((m) => m.material.name.includes(s));
  const body = byMat('Superhero'), eyes = byMat('Eyes'), brows = byMat('Hair');
  const bones = body.skeleton.bones, bi = (n) => bones.findIndex((b) => b.name === n);
  const wp = (n) => bones[bi(n)].getWorldPosition(new THREE.Vector3());
  const geo = body.geometry, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, P = geo.attributes.position;

  // her köşenin baskın kemiği
  const dom = new Array(P.count);
  for (let i = 0; i < P.count; i++) {
    let best = 0, bw = -1;
    for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } }
    dom[i] = bones[best].name;
  }
  const arm = wp('upperarm_l'), pelvis = wp('pelvis'), L = Math.sign(arm.x) || 1;   // L: sol tarafın x yönü
  const head = { y0: 9, y1: -9, z0: 9, z1: -9 };
  for (let i = 0; i < P.count; i++) if (dom[i] === 'Head') {
    head.y0 = Math.min(head.y0, P.getY(i)); head.y1 = Math.max(head.y1, P.getY(i));
    head.z0 = Math.min(head.z0, P.getZ(i)); head.z1 = Math.max(head.z1, P.getZ(i));
  }
  let chestZ = 0;
  for (let i = 0; i < P.count; i++) if (dom[i] === 'spine_03' && Math.abs(P.getX(i)) < 0.05) chestZ = Math.max(chestZ, P.getZ(i));

  const G = { female, bodyGeo: geo, eyesGeo: eyes.geometry, browsGeo: brows.geometry };
  body.material.roughness = 0.75; body.material.metalness = 0; body.material.vertexColors = false;
  if (female) body.material.color.setRGB(1.3, 1.27, 1.25);   // kadın ten dokusunu erkekle aynı açıklığa getir
  G.bodyMat = body.material; G.eyesMat = eyes.material;
  G.browMat = new THREE.MeshStandardMaterial({ color: 0x1c140f, roughness: 1, side: THREE.DoubleSide });

  const isSpine = (b) => b === 'spine_01' || b === 'spine_02' || b === 'spine_03' || b === 'pelvis';
  const B = (n) => bi(n);
  const side = (x) => sm(-0.2, 0.2, x * L);                    // 0: sağ taraf .. 1: sol taraf
  const footY = 0.0;
  // gövde ön/arka yüzeyi (y'ye göre), kollar ve baş hariç
  const torsoZ = (y) => {
    let f = -9, k = 9;
    for (let i = 0; i < P.count; i++) if (Math.abs(P.getY(i) - y) < 0.02 && Math.abs(P.getX(i)) < 0.11 && !/^(Head|upperarm|lowerarm|hand_|index|middle|pinky|ring|thumb)/.test(dom[i])) { f = Math.max(f, P.getZ(i)); k = Math.min(k, P.getZ(i)); }
    return { front: f, back: k };
  };
  /** Pelvis + sol/sağ uyluk + baldır arasında harmanlanan ağırlıklar: yürüyen bacaklar kumaşı da hareket ettirir. */
  const legBlend = (x, y, z) => {
    const sL = side(x), leg = sm(pelvis.y + 0.02, pelvis.y - 0.3, y) * 0.9;           // bacağın payı
    const kneeY = wp('calf_l').y, calf = sm(kneeY + 0.1, kneeY - 0.25, y) * 0.8;     // diz altında baldıra kay
    const out = [[B('pelvis'), 1 - leg]];
    out.push([B('thigh_l'), leg * sL * (1 - calf)], [B('thigh_r'), leg * (1 - sL) * (1 - calf)]);
    out.push([B('calf_l'), leg * sL * calf], [B('calf_r'), leg * (1 - sL) * calf]);
    return out;
  };
  /** Gövde+kalça+bacak için tam ağırlık fonksiyonu (pardösü ve izar). */
  const bodyCloth = (x, y, z) => {
    const y3 = wp('spine_03').y, y2 = wp('spine_02').y, y1 = wp('spine_01').y;
    const w3 = sm(y2 + 0.02, y3 + 0.02, y), w2 = (1 - w3) * sm(y1 - 0.02, y2 + 0.02, y), wP = 1 - w3 - w2;
    const leg = legBlend(x, y, z);
    const out = [[B('spine_03'), w3], [B('spine_02'), w2]];
    for (const e of leg) out.push([e[0], e[1] * wP]);
    return out;
  };
  const head0 = { cy: (head.y0 + head.y1) / 2, H: head.y1 - head.y0, cz: (head.z0 + head.z1) / 2, hz: (head.z1 - head.z0) / 2, hx: 0 };
  for (let i = 0; i < P.count; i++) if (dom[i] === 'Head') head0.hx = Math.max(head0.hx, Math.abs(P.getX(i)));

  let slim = geo;
  if (female) {
    const bare = /^(Head|neck|lowerarm|hand_|index|middle|pinky|ring|thumb|foot|ball)/;
    G.skinGeo = shell(geo, (i, x, y) => bare.test(dom[i]) || (dom[i] === 'calf_l' || dom[i] === 'calf_r') && y < 0.2, 0);
    G.sleeves = shell(geo, (i) => /^(upperarm|lowerarm)/.test(dom[i]), 0.026);
    // ----- pardösü: omuzdan bilek üstüne kadar tek parça, A kesim, vücuda oturmaz
    const hem = footY + 0.08;
    G.coat = loft([
      { y: arm.y - 0.01, rx: 0.17, rz: 0.13, cz: 0.0 }, { y: arm.y - 0.1, rx: 0.19, rz: 0.145, cz: 0.0 },
      { y: pelvis.y + 0.2, rx: 0.19, rz: 0.15, cz: -0.01 }, { y: pelvis.y + 0.05, rx: 0.235, rz: 0.19, cz: -0.03 },
      { y: pelvis.y - 0.2, rx: 0.3, rz: 0.24, cz: -0.02 }, { y: pelvis.y - 0.5, rx: 0.35, rz: 0.3, cz: 0 },
      { y: hem, rx: 0.39, rz: 0.35, cz: 0.0 },
    ], 26, bodyCloth);
    // ----- başörtüsü: kafatasından geniş bir kukuleta + önde oval yüz açıklığı + omuzlara dökülen örtü
    const H = head0.H, y0 = head.y0, pad = 0.032, hxw = head0.hx + pad, hzw = head0.hz + pad;
    const tcen = 0.42, thalf = 0.37, GMAX = 0.92, TOP = 1.07;
    const gapAt = (t) => { const u = (t - tcen) / thalf; return Math.abs(u) < 1 ? GMAX * Math.sqrt(1 - u * u) : 0; };
    const hood = [TOP, 1.09, 1.03, 0.96, 0.9, 0.84, 0.78, 0.72, 0.66, 0.6, 0.54, 0.48, 0.42, 0.36, 0.3, 0.24, 0.18, 0.12, 0.06, 0.0, -0.06].map((t) => {
      const e = Math.max(0, (t - 0.55) / (TOP - 0.55)), s = Math.sqrt(Math.max(0, 1 - e * e)), lo = Math.max(0, (0.55 - t) / 0.6);
      return { t, y: y0 + t * H, rx: hxw * s * (1 - 0.16 * lo), rz: (hzw + 0.012) * s * (1 - 0.1 * lo), cz: head0.cz - 0.012 * e - 0.006 * lo, gap: gapAt(t) };
    });
    const ay = arm.y;
    const mantle = [
      { y: ay + 0.062, rx: 0.14, rz: 0.14, cz: -0.03 }, { y: ay + 0.03, rx: 0.2, rz: 0.16, cz: -0.025 },
      { y: ay - 0.04, rx: 0.255, rz: 0.18, cz: -0.015 }, { y: ay - 0.13, rx: 0.275, rz: 0.2, cz: -0.015 },
    ];
    const rings = hood.concat(mantle);
    const yHeadW = y0 + 0.5 * H, yNeck = wp('neck_01').y;
    const scarfW = (x, y) => {
      const wh = sm(y0 - 0.02, y0 + 0.07, y), r = 1 - wh, wS = r * sm(yNeck, ay - 0.02, y);
      return [[B('Head'), wh], [B('neck_01'), r - wS], [B('spine_03'), wS]];
    };
    G.scarf = loft(rings, 30, scarfW);
    // yüz çerçevesindeki ince iç bant (bone): açıklık kenarının üst yarısı boyunca
    const edge = (r, sgn) => { const a = sgn > 0 ? r.gap : Math.PI * 2 - r.gap; return new THREE.Vector3(Math.sin(a) * r.rx, r.y, Math.cos(a) * r.rz + r.cz); };
    const up = hood.filter((r) => r.t >= 0.36 && r.gap > 0).sort((p, q) => p.t - q.t);
    const top = hood.find((r) => r.t > 0.75 && r.gap === 0) || hood[5];
    const path = up.map((r) => edge(r, 1)).concat([edge({ ...top, gap: 0 }, 1)], up.slice().reverse().map((r) => edge(r, -1)));
    const yc = y0 + 0.37 * H, pts = [];
    for (const e of path) {
      const dx = -e.x, dy = yc - e.y, l = Math.hypot(dx, dy) || 1;
      pts.push([e.x, e.y, e.z], [e.x + dx / l * 0.02, e.y + dy / l * 0.02, e.z - 0.012]);
    }
    G.band = sheet(pts, path.length, 2, () => [[B('Head'), 1]]);
    // pouch için örtü yüzeyi (ön)
    G.mantleFront = (y) => { for (let i = 0; i < mantle.length - 1; i++) { const a = mantle[i], b = mantle[i + 1]; if (y <= a.y && y >= b.y) { const t = (a.y - y) / (a.y - b.y); return a.cz + a.rz + (b.cz + b.rz - a.cz - a.rz) * t; } } return mantle[mantle.length - 1].cz + mantle[mantle.length - 1].rz; };
  } else {
    // erkek: gövdeyi biraz inceltilmiş ("kaslı süper kahraman" görünümü azaltılır)
    slim = geo.clone();
    const sp = slim.attributes.position, sn = slim.attributes.normal;
    for (let i = 0; i < sp.count; i++) {
      const b = dom[i], k = /^(upperarm|lowerarm|clavicle)/.test(b) ? 0.02 : /^(spine|pelvis)/.test(b) ? 0.014 : /^(thigh|calf)/.test(b) ? 0.006 : 0;
      if (k) sp.setXYZ(i, sp.getX(i) - sn.getX(i) * k, sp.getY(i) - sn.getY(i) * k, sp.getZ(i) - sn.getZ(i) * k);
    }
    // rida: sol omuzdan sağ koltuk altına çapraz örtü (sağ omuz açık); kalın/bol
    G.wrap = shell(slim, (i, x, y) => {
      const b = dom[i];
      if (b === 'clavicle_l' || b === 'upperarm_l') return true;
      return isSpine(b) && y > pelvis.y - 0.05;
    }, 0.024);
    // çapraz kenar: çizginin üstündeki köşeleri çizgiye indir (pürüzsüz diyagonal kenar), sonra kumaş gibi yumuşat
    { const wp_ = G.wrap.attributes.position;
      for (let i = 0; i < wp_.count; i++) {
        const x = wp_.getX(i), y = wp_.getY(i), z = wp_.getZ(i), sx = x * L;
        // önde çapraz çizgi, arkada sırt tamamen örtülü (omuz hizasına kadar)
        const back = sm(chestZ * 0.25, -0.04, z), line = (arm.y - 0.03 + 0.85 * sx) * (1 - back) + (arm.y + 0.05) * back;
        if (sx < 0.12 && y > line && y > arm.y - 0.45) wp_.setY(i, line);
      }
      relax(G.wrap, 3, 0.5);
    }
    // izar: belden baldıra, bacaklarla harmanlı skin
    G.skirt = loft([
      { y: pelvis.y + 0.13, rx: 0.19, rz: 0.16, cz: -0.02 }, { y: pelvis.y + 0.05, rx: 0.215, rz: 0.18, cz: -0.02 },
      { y: pelvis.y - 0.2, rx: 0.25, rz: 0.225, cz: 0.0 }, { y: pelvis.y - 0.5, rx: 0.255, rz: 0.27, cz: -0.02 },
      { y: 0.3, rx: 0.25, rz: 0.31, cz: -0.04 },
    ], 24, bodyCloth);
    // omuzdan sırta sarkan kumaş ucu: sol omuz üstünden aşağı, sırtı boyunca
    const shoulderTop = (X) => { let m = -9; for (let i = 0; i < P.count; i++) if (Math.abs(P.getX(i) * L - X) < 0.02 && /^(clavicle_l|spine|upperarm_l)/.test(dom[i])) m = Math.max(m, P.getY(i)); return m; };
    const yb = pelvis.y + 0.2, pts = [], cols = [0.05, 0.1, 0.15], rows = 6;
    const w3 = (y) => (y > arm.y - 0.12 ? [[B('spine_03'), 1]] : [[B('spine_03'), sm(wp('spine_02').y, wp('spine_03').y, y)], [B('spine_02'), 1 - sm(wp('spine_02').y, wp('spine_03').y, y)]]);
    for (let r = 0; r < rows; r++) for (const X of cols) {
      const top = shoulderTop(X) + 0.03, bz = torsoZ(top - 0.06).back - 0.036, f = r / (rows - 1);
      if (r === 0) pts.push([L * X, top - 0.025, 0.0]);
      else if (r === 1) pts.push([L * X, top - 0.015, -0.05]);
      else { const y = top - 0.05 - (top - 0.05 - yb) * ((r - 2) / (rows - 3)); pts.push([L * (X + 0.012 * f), y, torsoZ(Math.min(y, top - 0.06)).back - 0.036 - 0.01 * f]); }
    }
    G.tail = sheet(pts, rows, cols.length, (x, y) => w3(y));
    G.skinGeo = shell(slim, (i) => !/^(pelvis|thigh)/.test(dom[i]), 0);
    G.hair = extras.hair.map((h) => h.geometry);
    G.beard = extras.beard.geometry;
  }
  // Türk bayraklı boyun çantası: kıyafetin ÜSTÜNDE, göğüs üstü seviyesinde
  const pouchY = female ? arm.y - 0.075 : arm.y - 0.2;
  const pz = (female ? G.mantleFront(pouchY) : chestZ + 0.045) + 0.014;
  const pouch = new THREE.BoxGeometry(0.09, 0.115, 0.018); pouch.translate(0, pouchY, pz);
  G.pouch = skinTo(pouch, bi('spine_03'));
  // ortak iskeletler: karakterler bunlara "detached" bağlanır, böylece yüzlerce karakter birkaç animasyonla yürür
  const clip = buildClip(walkJson, bones[bi('pelvis')].position);
  G.rigs = [];
  for (let i = 0; i <= NORMAL_RIGS; i++) {
    const root = cloneSkinned(gltf.scene);
    let skeleton = null; const drop = [];
    root.traverse((o) => { if (o.isSkinnedMesh) { skeleton = skeleton || o.skeleton; drop.push(o); } });
    drop.forEach((o) => o.removeFromParent());
    rigRoot.add(root);
    const mixer = new THREE.AnimationMixer(root), act = mixer.clipAction(clip);
    const fast = i === NORMAL_RIGS;
    act.timeScale = fast ? BASE_TIMESCALE * 1.75 : BASE_TIMESCALE * (0.86 + 0.07 * i);
    act.time = Math.random() * clip.duration; act.play();
    G.rigs.push({ skeleton, mixer });
  }
  return G;
}

export async function loadCharacters(scene) {
  const [male, female, buzz, parted, beard, walk] = await Promise.all([
    load('models/male.gltf'), load('models/female.gltf'), load('models/Hair_Buzzed.gltf'),
    load('models/Hair_SimpleParted.gltf'), load('models/Hair_Beard.gltf'), fetch('models/walk.json').then((r) => r.json()),
  ]);
  const skinned = (g) => { let m = null; g.scene.traverse((o) => { if (o.isSkinnedMesh) m = o; }); return m; };
  const rigRoot = new THREE.Group(); scene.add(rigRoot);
  const extras = { hair: [skinned(buzz), skinned(parted)], beard: skinned(beard) };
  const M = prepareGender(male, false, walk.Walk_Loop, rigRoot, extras);
  const F = prepareGender(female, true, walk.Walk_Loop, rigRoot, extras);
  const tex = flagTexture();
  const red = new THREE.MeshStandardMaterial({ color: 0xc40d18, roughness: 0.8 });
  const flag = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
  const pouchMats = [red, red, red, red, flag, red];
  const hairMats = new Map(HAIR_COLORS.map((c) => [c, new THREE.MeshStandardMaterial({ color: c, roughness: 1, side: THREE.DoubleSide })]));

  function create({ female: isF, pace = 1 }) {
    const G = isF ? F : M, group = new THREE.Group(), parts = [];
    const rigIdx = Math.max(0, Math.min(NORMAL_RIGS - 1, Math.round((pace - 0.85) / 0.075)));
    const add = (geo, mat, shadow) => {
      const m = new THREE.SkinnedMesh(geo, mat);
      m.bindMode = THREE.DetachedBindMode; m.bind(G.rigs[rigIdx].skeleton, IDENT);
      m.castShadow = !!shadow; m.frustumCulled = false;
      group.add(m); parts.push(m);
    };
    add(G.skinGeo, G.bodyMat); add(G.eyesGeo, G.eyesMat); add(G.browsGeo, G.browMat);
    if (isF) {
      const c = pick(COATS), scarf = pick(c.scarf), bandCol = c.band || (scarf === CREAM || scarf === WHITE ? c.coat : WHITE);
      add(G.coat, cloth(c.coat), true); add(G.sleeves, cloth(c.coat));
      add(G.scarf, cloth(scarf)); add(G.band, bandMat(bandCol));
    } else {
      add(G.wrap, cloth(WHITE), true); add(G.skirt, cloth(WHITE), true); add(G.tail, bandMat(WHITE));
      const hc = pick(HAIR_COLORS);
      if (Math.random() < 0.88) add(pick(G.hair), hairMats.get(hc));
      if (Math.random() < 0.6) add(G.beard, hairMats.get(hc));
    }
    add(G.pouch, pouchMats);
    group.scale.setScalar((isF ? 0.93 : 1) * (0.96 + Math.random() * 0.08));
    let fast = false;
    return {
      group,
      setFast(v) {
        if (v === fast) return; fast = v;
        const sk = G.rigs[v ? NORMAL_RIGS : rigIdx].skeleton;
        for (const m of parts) m.skeleton = sk;
      },
    };
  }

  return { create, update(dt) { for (const G of [M, F]) for (const r of G.rigs) r.mixer.update(dt); } };
}
