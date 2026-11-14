// The palace at dusk and the throne hall, as 3D scenes.
import { THREE, ball, gold, keyLight, lathe, mat, mesh } from './kit.js';

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function duskSky() {
  return canvasTexture(1024, 2048, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0b0730');
    g.addColorStop(0.35, '#3a1672');
    g.addColorStop(0.56, '#b0447e');
    g.addColorStop(0.68, '#ff9a57');
    g.addColorStop(0.76, '#ffd58a');
    g.addColorStop(1, '#ffd58a');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const r = rng(11);
    for (let k = 0; k < 420; k++) {
      const y = r() * h * 0.5;
      c.globalAlpha = (0.3 + r() * 0.7) * (1 - y / (h * 0.55));
      c.fillStyle = '#fff';
      c.beginPath();
      c.arc(r() * w, y, 0.6 + r() * 1.8, 0, 7);
      c.fill();
    }
    c.globalAlpha = 1;
    const mx = w * 0.76, my = h * 0.2, mr = 86;
    const halo = c.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 3.4);
    halo.addColorStop(0, 'rgba(255,240,190,.5)');
    halo.addColorStop(1, 'rgba(255,240,190,0)');
    c.fillStyle = halo;
    c.fillRect(0, 0, w, h * 0.5);
    const m = document.createElement('canvas');
    m.width = m.height = mr * 2 + 4;
    const mc = m.getContext('2d');
    mc.fillStyle = '#fff4cf';
    mc.beginPath();
    mc.arc(mr + 2, mr + 2, mr, 0, 7);
    mc.fill();
    mc.globalCompositeOperation = 'destination-out';
    mc.beginPath();
    mc.arc(mr + 40, mr - 12, mr * 0.86, 0, 7);
    mc.fill();
    c.drawImage(m, mx - mr - 2, my - mr - 2);
  });
}

/** Glazed tile pattern for domes and friezes. */
function tiles(base, line, dot) {
  const t = canvasTexture(256, 256, (c, w) => {
    c.fillStyle = base;
    c.fillRect(0, 0, w, w);
    c.strokeStyle = line;
    c.lineWidth = 7;
    for (const [x, y] of [[0, 0], [128, 128], [-128, 128], [128, -128], [0, 256], [256, 0]]) {
      c.beginPath();
      c.moveTo(x + 64, y);
      c.lineTo(x + 128, y + 64);
      c.lineTo(x + 64, y + 128);
      c.lineTo(x, y + 64);
      c.closePath();
      c.stroke();
    }
    c.fillStyle = dot;
    for (const [x, y] of [[64, 64], [192, 192], [192, 64], [64, 192]]) {
      c.beginPath();
      c.arc(x, y, 13, 0, 7);
      c.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function checker(a, b, n = 8) {
  const t = canvasTexture(512, 512, (c, w) => {
    const s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      c.fillStyle = (x + y) % 2 ? a : b;
      c.fillRect(x * s, y * s, s, s);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function archShape(w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(-w / 2, h - w / 2);
  s.absarc(0, h - w / 2, w / 2, Math.PI, 0, true);
  s.lineTo(w / 2, 0);
  s.closePath();
  return s;
}

function arch(w, h, material, pos, depth = 0.12) {
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(archShape(w, h), { depth, bevelEnabled: false }), material);
  m.position.set(...pos);
  m.castShadow = m.receiveShadow = true;
  return m;
}

const glow = (color, intensity) => new THREE.MeshStandardMaterial({ color: 0x331a00, emissive: color, emissiveIntensity: intensity, roughness: 0.6 });

function dome(r, material, pos, G) {
  const g = new THREE.Group();
  g.position.set(...pos);
  g.add(mesh(new THREE.CylinderGeometry(r * 0.96, r * 1.0, r * 0.45, 48), mat(0xf1dcc0, { roughness: 0.8, clearcoat: 0 })));
  const pts = [];
  for (let k = 0; k <= 24; k++) {
    const a = (k / 24) * Math.PI * 0.5;
    pts.push([Math.cos(a) * r * (1 + 0.1 * Math.sin(a * 2)), r * 0.22 + Math.sin(a) * r * 1.12]);
  }
  g.add(lathe(pts, material));
  g.add(mesh(new THREE.TorusGeometry(r * 0.99, r * 0.05, 12, 64), G, [0, r * 0.23, 0], [1, 1, 1], [Math.PI / 2, 0, 0]));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.03, r * 0.05, r * 0.5, 12), G, [0, r * 1.55, 0]));
  g.add(ball(r * 0.1, G, [0, r * 1.45, 0]));
  g.add(ball(r * 0.07, G, [0, r * 1.82, 0]));
  return g;
}

function minaret(h, r, pos, wallMat, capMat, G) {
  const g = new THREE.Group();
  g.position.set(...pos);
  g.add(mesh(new THREE.CylinderGeometry(r * 0.82, r, h, 32), wallMat, [0, h / 2, 0]));
  for (const f of [0.55, 0.8]) {
    g.add(mesh(new THREE.CylinderGeometry(r * 1.5, r * 1.05, r * 0.5, 32), wallMat, [0, h * f, 0]));
    g.add(mesh(new THREE.TorusGeometry(r * 1.5, r * 0.09, 10, 40), G, [0, h * f + r * 0.28, 0], [1, 1, 1], [Math.PI / 2, 0, 0]));
  }
  g.add(mesh(new THREE.ConeGeometry(r * 1.05, r * 4.2, 32), capMat, [0, h + r * 2.1, 0]));
  g.add(ball(r * 0.28, G, [0, h + r * 4.3, 0]));
  return g;
}

export function buildPalace(scene) {
  scene.background = duskSky();
  scene.fog = new THREE.Fog(0x6a2f7a, 34, 120);
  const G = gold({ roughness: 0.3 });
  const wall = mat(0xe7b98c, { roughness: 0.85, clearcoat: 0 });
  const wallDark = mat(0xc98f62, { roughness: 0.9, clearcoat: 0 });
  const tb = tiles('#1f55c4', '#ffd35c', '#7fe0ff');
  tb.repeat.set(10, 4);
  const blue = new THREE.MeshPhysicalMaterial({ map: tb, roughness: 0.22, clearcoat: 1 });
  const tt = tiles('#0f9a96', '#ffd35c', '#eafcff');
  tt.repeat.set(8, 3);
  const tealRoof = new THREE.MeshPhysicalMaterial({ map: tt, roughness: 0.22, clearcoat: 1 });
  const tf = tiles('#1f55c4', '#ffffff', '#ffd35c');
  tf.repeat.set(16, 1);
  const frieze = new THREE.MeshPhysicalMaterial({ map: tf, roughness: 0.3, clearcoat: 0.8 });
  const win = glow(0xffa030, 1.5);

  scene.add(new THREE.HemisphereLight(0x7a6cff, 0x3a2050, 0.75));
  keyLight(scene, 0xff9a55, 2.1, [-18, 10, 14], 40);
  const rim = new THREE.DirectionalLight(0x6d7dff, 1.4);
  rim.position.set(14, 12, -6);
  scene.add(rim);

  // terrace floor
  const tex = checker('#e9d9f2', '#7a55b8');
  tex.repeat.set(30, 30);
  const floor = mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.25, clearcoat: 0.6 }), [0, 0, 0], [1, 1, 1], [-Math.PI / 2, 0, 0]);
  scene.add(floor);
  // reflecting pool with a gold rim, leading to the gate
  scene.add(mesh(new THREE.BoxGeometry(4.6, 0.22, 20), wall, [0, 0.11, 2]));
  scene.add(mesh(new THREE.BoxGeometry(3.9, 0.02, 19.3), new THREE.MeshPhysicalMaterial({ color: 0x1687a8, roughness: 0.04, metalness: 0.4, clearcoat: 1, emissive: 0x0a3a66, emissiveIntensity: 0.5 }), [0, 0.225, 2]));
  for (const s of [-1, 1]) scene.add(mesh(new THREE.BoxGeometry(0.12, 0.06, 20), G, [s * 2.3, 0.25, 2]));

  // main block and wings
  const P = new THREE.Group();
  P.position.z = -16;
  scene.add(P);
  P.add(mesh(new THREE.BoxGeometry(15, 8, 8), wall, [0, 4, 0]));
  P.add(mesh(new THREE.BoxGeometry(16, 0.5, 9), wallDark, [0, 8.2, 0]));
  P.add(mesh(new THREE.BoxGeometry(15.1, 0.9, 8.1), frieze, [0, 7.3, 0]));
  for (let k = 0; k < 13; k++) P.add(mesh(new THREE.BoxGeometry(0.7, 0.7, 0.5), wall, [-7.2 + k * 1.2, 8.8, 4.1]));
  for (const s of [-1, 1]) {
    P.add(mesh(new THREE.BoxGeometry(9, 5.6, 7), wall, [s * 11.6, 2.8, 0.4]));
    P.add(mesh(new THREE.BoxGeometry(9.6, 0.4, 7.6), wallDark, [s * 11.6, 5.8, 0.4]));
    P.add(dome(2.5, tealRoof, [s * 11.6, 6.4, 0.4], G));
    for (let k = 0; k < 3; k++) {
      P.add(arch(1.3, 2.9, G, [s * (8.9 + k * 2.7), 1.5, 3.86], 0.1));
      P.add(arch(1.05, 2.65, win, [s * (8.9 + k * 2.7), 1.5, 3.92], 0.1));
    }
  }
  P.add(dome(5.2, blue, [0, 9.5, 0], G));
  for (const s of [-1, 1]) P.add(dome(1.7, blue, [s * 5.6, 8.8, 2.4], G));
  // gate and upper windows
  P.add(arch(4.6, 6.4, G, [0, 0, 3.98], 0.2));
  P.add(arch(4.0, 6.0, glow(0xff9a30, 1.3), [0, 0, 4.1], 0.14));
  P.add(arch(2.6, 4.8, G, [0, 0, 4.2], 0.1));
  P.add(arch(2.2, 4.5, glow(0xffd070, 2.2), [0, 0, 4.3], 0.1));
  for (const s of [-1, 1]) for (const x of [3.9, 6.0]) {
    P.add(arch(1.25, 3.0, G, [s * x, 3.6, 3.98], 0.1));
    P.add(arch(1.0, 2.75, win, [s * x, 3.6, 4.05], 0.1));
  }
  // steps
  for (let k = 0; k < 4; k++) P.add(mesh(new THREE.BoxGeometry(8.4 - k * 0.8, 0.22, 2.6 - k * 0.5), wallDark, [0, 0.11 + k * 0.22, 5.6 - k * 0.3]));
  // minarets
  for (const s of [-1, 1]) {
    P.add(minaret(15, 0.75, [s * 8.2, 0, 3.2], wall, blue, G));
    P.add(mesh(new THREE.BoxGeometry(9.1, 0.7, 7.1), frieze, [s * 11.6, 5.1, 0.4]));
    P.add(minaret(19, 0.85, [s * 17.6, 0, -1.5], wall, tealRoof, G));
  }
  // garden: cypress trees and lantern posts along the pool
  const leaf = mat(0x1f6b45, { roughness: 0.9, clearcoat: 0 });
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) {
    const z = 9 - k * 3.6;
    scene.add(ball(1, leaf, [s * 4.6, 2.7, z], [0.62, 2.3, 0.62]));
    scene.add(mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.5, 10), mat(0x5a3a1e), [s * 4.6, 0.25, z]));
    if (k % 2 === 0) {
      scene.add(mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.7, 10), G, [s * 3.1, 0.85, z + 1.8]));
      scene.add(ball(0.2, glow(0xffb040, 2.2), [s * 3.1, 1.85, z + 1.8]));
      const p = new THREE.PointLight(0xffb040, 9, 9, 2);
      p.position.set(s * 3.1, 1.9, z + 1.8);
      scene.add(p);
    }
  }
  const gate = new THREE.PointLight(0xffb050, 90, 30, 2);
  gate.position.set(0, 3, -9);
  scene.add(gate);
  // fountain in the pool
  const marble = mat(0xf3e6d2, { roughness: 0.3, clearcoat: 0.7 });
  const water = new THREE.MeshPhysicalMaterial({ color: 0x7fe6ff, roughness: 0.05, transparent: true, opacity: 0.55, emissive: 0x2aa0d0, emissiveIntensity: 0.6 });
  scene.add(mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.5, 40), marble, [0, 0.45, 5]));
  scene.add(mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.6, 20), marble, [0, 1.3, 5]));
  scene.add(mesh(new THREE.CylinderGeometry(0.95, 0.3, 0.3, 40), marble, [0, 2.1, 5]));
  scene.add(mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.9, 16), G, [0, 2.6, 5]));
  scene.add(ball(0.2, G, [0, 3.15, 5]));
  scene.add(mesh(new THREE.ConeGeometry(0.9, 1.3, 32, 1, true), water, [0, 1.55, 5]));
  scene.add(mesh(new THREE.ConeGeometry(1.45, 0.9, 32, 1, true), water, [0, 0.95, 5]));
  // flower beds
  const r = rng(5);
  for (const s of [-1, 1]) for (let k = 0; k < 46; k++) {
    const col = [0xe3243f, 0xff7a1a, 0xffd23f, 0xff6fb5][Math.floor(r() * 4)];
    scene.add(ball(0.16 + r() * 0.1, mat(col, { roughness: 0.6 }), [s * (5.6 + r() * 2.4), 0.2, 11 - r() * 22]));
  }
  const cam = new THREE.PerspectiveCamera(52, 9 / 16, 0.1, 400);
  cam.position.set(0, 3.4, 30);
  cam.lookAt(0, 9.5, -16);
  return cam;
}

export function buildHall(scene) {
  scene.background = new THREE.Color(0x06262e);
  scene.fog = new THREE.Fog(0x06262e, 18, 46);
  const G = gold({ roughness: 0.28 });
  const wall = mat(0x12707a, { roughness: 0.7, clearcoat: 0.1 });
  const marble = mat(0xf3ead8, { roughness: 0.25, clearcoat: 0.8 });
  scene.add(new THREE.HemisphereLight(0x9fe8ff, 0x402018, 0.9));
  keyLight(scene, 0xffd9a0, 2.2, [-6, 14, 10], 16);

  const tex = checker('#f3ead8', '#b3122a', 6);
  tex.repeat.set(7, 12);
  scene.add(mesh(new THREE.PlaneGeometry(26, 44), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.18, clearcoat: 0.9 }), [0, 0, -6], [1, 1, 1], [-Math.PI / 2, 0, 0]));
  // carpet runner
  scene.add(mesh(new THREE.BoxGeometry(4.4, 0.06, 30), mat(0x8c1228, { roughness: 0.95, clearcoat: 0 }), [0, 0.03, -4]));
  for (const s of [-1, 1]) scene.add(mesh(new THREE.BoxGeometry(0.22, 0.07, 30), G, [s * 2.0, 0.035, -4]));
  // back wall with a great arch and tiled panels
  scene.add(mesh(new THREE.BoxGeometry(26, 20, 1), wall, [0, 10, -20]));
  scene.add(arch(8.6, 12.4, G, [0, 0, -19.5], 0.3));
  scene.add(arch(7.8, 11.8, glow(0x1fd0c8, 0.9), [0, 0, -19.3], 0.2));
  scene.add(arch(6.2, 10.4, glow(0xffc866, 1.8), [0, 0, -19.15], 0.15));
  for (const s of [-1, 1]) {
    scene.add(arch(2.6, 7.2, G, [s * 8.2, 2, -19.5], 0.25));
    scene.add(arch(2.2, 6.8, glow(0xffb640, 1.5), [s * 8.2, 2, -19.35], 0.2));
    // side walls
    scene.add(mesh(new THREE.BoxGeometry(1, 20, 40), wall, [s * 12.6, 10, -4]));
    for (let k = 0; k < 5; k++) {
      const z = 6 - k * 5.6;
      scene.add(mesh(new THREE.CylinderGeometry(0.52, 0.6, 9.6, 32), marble, [s * 9.6, 4.8, z]));
      scene.add(mesh(new THREE.CylinderGeometry(0.85, 0.55, 0.7, 32), G, [s * 9.6, 9.9, z]));
      scene.add(mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.6, 32), G, [s * 9.6, 0.3, z]));
    }
  }
  // throne on a dais
  for (let k = 0; k < 3; k++) scene.add(mesh(new THREE.CylinderGeometry(4.4 - k * 0.7, 4.6 - k * 0.7, 0.32, 48), marble, [0, 0.16 + k * 0.32, -15.5]));
  scene.add(mesh(new THREE.BoxGeometry(3.2, 1.2, 2.2), mat(0xb3122a, { roughness: 0.9, clearcoat: 0 }), [0, 1.56, -15.8]));
  scene.add(arch(3.4, 5.6, G, [0, 0.96, -17.1], 0.5));
  scene.add(arch(2.8, 5.0, mat(0xb3122a, { roughness: 0.9, clearcoat: 0 }), [0, 0.96, -16.75], 0.2));
  for (const s of [-1, 1]) {
    scene.add(mesh(new THREE.BoxGeometry(0.5, 1.2, 2.3), G, [s * 1.85, 2.0, -15.8]));
    scene.add(ball(0.36, G, [s * 1.85, 2.9, -14.8]));
  }
  // hanging lamps
  for (const [x, y, z] of [[-5, 11, -6], [5, 11, -6], [0, 13, -11], [-5, 11, 2], [5, 11, 2]]) {
    scene.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 9, 6), G, [x, y + 4.9, z]));
    scene.add(mesh(new THREE.OctahedronGeometry(0.6), glow(0xffc24d, 4), [x, y, z], [0.8, 1.2, 0.8]));
    scene.add(mesh(new THREE.TorusGeometry(0.5, 0.06, 8, 24), G, [x, y, z], [1, 1, 1], [Math.PI / 2, 0, 0]));
    const p = new THREE.PointLight(0xffb850, 60, 22, 2);
    p.position.set(x, y - 0.4, z);
    scene.add(p);
  }
  const cam = new THREE.PerspectiveCamera(50, 9 / 16, 0.1, 200);
  cam.position.set(0, 6.4, 15);
  cam.lookAt(0, 6.6, -18);
  return cam;
}
