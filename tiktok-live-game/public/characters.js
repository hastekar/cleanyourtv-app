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

const COAT_COLORS = [0xe9e1d2, 0xd8cdbb, 0xcfd6dc, 0xc3cdbd, 0xdccfd3, 0x2a2c33, 0x2a2c33];   // Türk hacı kafilelerinin açık renk pardösüleri + siyah
const SCARF_FOR = { 0x2a2c33: [0x2a2c33, 0xf3f0ea] };
const HAIR_COLORS = [0x17110d, 0x17110d, 0x2a1d14, 0x3a2a1e, 0x8d8a86, 0xc9c6c1];

const load = (url) => new Promise((res, rej) => new GLTFLoader().load(url, res, undefined, rej));
const clothCache = new Map();
function cloth(color) {
  if (!clothCache.has(color)) clothCache.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.92, side: THREE.DoubleSide }));
  return clothCache.get(color);
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

/** Halkalardan oluşan kumaş tüpü (etek, pelerin). rings: [{y, rx, rz, z}] yukarıdan aşağı. */
function tube(rings, boneIdx, seg = 22) {
  const pos = [], idx = [];
  rings.forEach((r) => {
    for (let s = 0; s <= seg; s++) { const a = s / seg * Math.PI * 2; pos.push(Math.sin(a) * r.rx, r.y, Math.cos(a) * r.rz + (r.z || 0)); }
  });
  for (let r = 0; r < rings.length - 1; r++) for (let s = 0; s < seg; s++) {
    const a = r * (seg + 1) + s, b = a + seg + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return skinTo(g, boneIdx);
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
  g.setAttribute('position', pos); g.setAttribute('normal', nor);
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
  if (female) {
    const bare = /^(Head|hand_|index|middle|pinky|ring|thumb|foot|ball)/;
    G.coat = shell(geo, (i) => !bare.test(dom[i]), 0.013);
    G.skinGeo = shell(geo, (i) => /^(Head|neck|lowerarm|hand_|index|middle|pinky|ring|thumb|calf|foot|ball)/.test(dom[i]), 0);
    G.skirt = tube([
      { y: pelvis.y + 0.16, rx: 0.165, rz: 0.13 }, { y: pelvis.y - 0.02, rx: 0.215, rz: 0.17, z: -0.01 },
      { y: pelvis.y - 0.45, rx: 0.27, rz: 0.32, z: 0.05 }, { y: 0.07, rx: 0.33, rz: 0.44, z: 0.06 },
    ], bi('pelvis'));
    const hh = head.y1 - head.y0, hd = head.z1 - head.z0;
    const face = (x, y, z) => (z - head.z0) / hd > 0.6 && (y - head.y0) / hh > 0.1 && (y - head.y0) / hh < 0.72 && Math.abs(x) < 0.072;
    G.hijab = shell(geo, (i, x, y, z) => dom[i] === 'neck_01' || (dom[i] === 'Head' && !face(x, y, z)), 0.016);
    G.cape = tube([
      { y: head.y0 + 0.005, rx: 0.07, rz: 0.075, z: -0.02 }, { y: arm.y + 0.02, rx: 0.215, rz: 0.14, z: 0 },
      { y: arm.y - 0.16, rx: 0.25, rz: 0.17, z: 0.01 },
    ], bi('spine_03'));
  } else {
    // rida: sol omuzdan sağ koltuk altına çapraz örtü (sağ omuz açık)
    G.wrap = shell(geo, (i, x, y) => {
      const b = dom[i], sx = x * L;
      if (b === 'clavicle_l' || b === 'upperarm_l') return true;
      if (!isSpine(b) && b !== 'clavicle_r' && b !== 'upperarm_r') return false;
      return y > pelvis.y - 0.05 && (sx > 0.11 || y <= arm.y + 0.01 + 0.8 * sx);
    }, 0.014);
    // izar: belden baldıra
    G.skirt = tube([
      { y: pelvis.y + 0.15, rx: 0.185, rz: 0.15 }, { y: pelvis.y + 0.08, rx: 0.2, rz: 0.165 },
      { y: pelvis.y - 0.4, rx: 0.26, rz: 0.31, z: 0.05 }, { y: 0.3, rx: 0.3, rz: 0.4, z: 0.07 },
    ], bi('pelvis'));
    G.skinGeo = shell(geo, (i) => !/^(pelvis|thigh)/.test(dom[i]), 0);
    G.hair = extras.hair.map((h) => h.geometry);
    G.beard = extras.beard.geometry;
  }
  // Türk bayraklı boyun çantası
  const pz = chestZ + (female ? 0.075 : 0.03);
  const pouch = new THREE.BoxGeometry(0.11, 0.14, 0.02); pouch.translate(0, arm.y - (female ? 0.24 : 0.2), pz);
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
  const WHITE = 0xf6f4ee;

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
      const coat = pick(COAT_COLORS), scarf = pick(SCARF_FOR[coat] || [coat, WHITE, WHITE]);
      add(G.coat, cloth(coat)); add(G.skirt, cloth(coat), true);
      add(G.hijab, cloth(scarf)); add(G.cape, cloth(scarf));
    } else {
      add(G.wrap, cloth(WHITE), true); add(G.skirt, cloth(WHITE), true);
      const hc = pick(HAIR_COLORS);
      if (Math.random() < 0.88) add(pick(G.hair), hairMats.get(hc));
      if (Math.random() < 0.6) add(G.beard, hairMats.get(hc));
    }
    add(G.pouch, pouchMats);
    group.scale.setScalar((isF ? 0.95 : 1) * (0.96 + Math.random() * 0.08));
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
