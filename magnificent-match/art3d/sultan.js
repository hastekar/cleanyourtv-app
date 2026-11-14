// The Sultan as a 3D model built from primitives. Returns a group standing on y = 0.
import { THREE, ball, cloth, gem, gold, lathe, limb, mat, mesh } from './kit.js';

export function buildSultan(mood = 'idle') {
  const g = new THREE.Group();
  const red = cloth(0xb00a24, { clearcoat: 0.35, clearcoatRoughness: 0.4 });
  const redDark = cloth(0x8f081d, { clearcoat: 0.3 });
  const skin = mat(0xf0a878, { roughness: 0.5, clearcoat: 0.2 });
  const white = cloth(0xf4f2ff, { roughness: 0.5 });
  const fur = new THREE.MeshPhysicalMaterial({ color: 0xfff7ea, roughness: 1, sheen: 1, sheenColor: 0xffffff });
  const brown = mat(0x3a1c0a, { roughness: 0.65, clearcoat: 0.15 });
  const teal = cloth(0x057f7d, { clearcoat: 0.4 });
  const G = gold();

  // slippers with curled toes
  for (const s of [-1, 1]) {
    g.add(ball(0.22, G, [s * 0.3, 0.1, 0.62], [0.85, 0.45, 1.5]));
    g.add(mesh(new THREE.TorusGeometry(0.1, 0.04, 12, 24, Math.PI * 1.4), G, [s * 0.3, 0.24, 0.93], [1, 1, 1], [0, Math.PI / 2, -0.4]));
    g.add(ball(0.2, red, [s * 0.44, 1.26, 0.0], [1.05, 1, 1]));
  }

  // kaftan
  const profile = [[0.0, 0.02], [0.66, 0.02], [0.69, 0.08], [0.64, 0.4], [0.55, 0.8], [0.5, 1.02], [0.47, 1.2], [0.4, 1.34], [0.24, 1.43], [0, 1.45]];
  g.add(lathe(profile, red));
  g.add(lathe([[0.675, 0.02], [0.705, 0.08], [0.675, 0.24], [0.65, 0.26]], G)); // hem
  g.add(lathe(profile.map(([r, y]) => [r + 0.012, y]).slice(2, 9), G, 16, -0.17, 0.34)); // front band
  for (const [y, r] of [[0.42, 0.65], [0.6, 0.61], [0.76, 0.57], [1.14, 0.495]]) g.add(ball(0.042, gem(0xe3243f), [0, y, r]));
  // hem rubies
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2 + 0.22;
    g.add(ball(0.035, gem(0xe3243f), [Math.sin(a) * 0.695, 0.15, Math.cos(a) * 0.695]));
  }
  // sash
  g.add(mesh(new THREE.TorusGeometry(0.515, 0.085, 20, 64), teal, [0, 0.93, 0], [1, 1, 1.15], [Math.PI / 2, 0, 0]));
  g.add(mesh(new THREE.BoxGeometry(0.2, 0.2, 0.06), G, [0, 0.93, 0.56]));
  g.add(ball(0.055, gem(0x18c46a), [0, 0.93, 0.6]));

  // arms folded over the belly
  for (const s of [-1, 1]) {
    g.add(limb([s * 0.43, 1.27, 0.02], [s * 0.52, 0.98, 0.3], 0.155, red));
    g.add(limb([s * 0.52, 0.98, 0.3], [s * 0.15, 0.98, 0.56], 0.14, redDark));
    g.add(mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.1, 32), G, [s * 0.2, 0.98, 0.535], [1, 1, 1], [0, s * 0.6, Math.PI / 2]));
    g.add(ball(0.125, skin, [s * 0.07, 1.0 - (s > 0 ? 0 : 0.03), 0.62], [1.1, 0.85, 0.9]));
  }
  g.add(ball(0.035, gem(0xe3243f), [0.1, 1.06, 0.72]));

  // fur collar
  g.add(mesh(new THREE.TorusGeometry(0.34, 0.14, 20, 64), fur, [0, 1.36, 0.02], [1.12, 1, 1.05], [Math.PI / 2, 0, 0]));
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + 0.35;
    g.add(ball(0.028, mat(0x2b1d12, { roughness: 1, clearcoat: 0 }), [Math.sin(a) * 0.5, 1.37, 0.02 + Math.cos(a) * 0.47], [1, 0.6, 1.6], [0, a, 0]));
  }

  // head
  const head = new THREE.Group();
  head.position.y = 1.95;
  head.add(ball(0.42, skin, [0, 0, 0], [1, 0.97, 0.95]));
  for (const s of [-1, 1]) head.add(ball(0.1, skin, [s * 0.41, 0, 0], [0.6, 1, 0.8]));
  head.add(ball(0.065, skin, [0, -0.02, 0.4], [1, 0.95, 1]));
  for (const s of [-1, 1]) head.add(ball(0.09, new THREE.MeshPhysicalMaterial({ color: 0xff7a6a, transparent: true, opacity: 0.4, roughness: 0.8 }), [s * 0.25, -0.07, 0.3], [1, 0.7, 0.5]));
  // beard wraps the jaw; moustache sits on it
  head.add(ball(0.4, brown, [0, -0.27, 0.03], [1.07, 1.05, 1.0]));
  head.add(ball(0.2, brown, [0, -0.6, 0.16], [1.1, 1, 0.9]));
  for (const s of [-1, 1]) {
    head.add(ball(0.1, brown, [s * 0.1, -0.13, 0.4], [1.5, 0.6, 0.6], [0, 0, -s * 0.3]));
    head.add(ball(0.06, brown, [s * 0.24, -0.15, 0.36], [1.2, 0.8, 0.7], [0, 0, s * 0.5]));
    head.add(ball(0.035, brown, [s * 0.3, -0.11, 0.34]));
  }
  // mouth
  const lip = mat(0x8a1422, { roughness: 0.4 });
  if (mood === 'sad') head.add(mesh(new THREE.TorusGeometry(0.06, 0.018, 8, 20, Math.PI), lip, [0, -0.33, 0.43], [1, 1, 1], [0.2, 0, 0]));
  else {
    head.add(ball(0.075, lip, [0, -0.27, 0.4], [1.15, mood === 'happy' ? 0.95 : 0.5, 0.5]));
    head.add(ball(0.05, mat(0xffffff, { roughness: 0.2 }), [0, -0.245, 0.425], [1.3, 0.35, 0.4]));
  }
  // eyes
  const eyeWhite = mat(0xffffff, { roughness: 0.08, clearcoat: 1 });
  for (const s of [-1, 1]) {
    const e = new THREE.Group();
    e.position.set(s * 0.145, 0.07, 0.35);
    e.rotation.y = s * 0.2;
    if (mood === 'happy') e.add(mesh(new THREE.TorusGeometry(0.06, 0.018, 8, 20, Math.PI), mat(0x2a180a), [0, -0.02, 0.05]));
    else {
      e.add(ball(0.085, eyeWhite, [0, 0, 0], [1, 1.12, 0.6]));
      e.add(mesh(new THREE.SphereGeometry(0.092, 32, 16, 0, Math.PI * 2, 0, Math.PI * (mood === 'sad' ? 0.42 : 0.3)), skin, [0, 0.004, 0.002], [1, 1.12, 0.62]));
      e.add(ball(0.056, mat(0x7a4416, { roughness: 0.1, clearcoat: 1 }), [0.005 * s, mood === 'sad' ? -0.015 : 0, 0.043], [1, 1, 0.45]));
      e.add(ball(0.03, mat(0x120600, { roughness: 0.05, clearcoat: 1 }), [0.005 * s, mood === 'sad' ? -0.015 : 0, 0.058], [1, 1, 0.4]));
      e.add(ball(0.014, new THREE.MeshBasicMaterial({ color: 0xffffff }), [0.022, 0.03, 0.068]));
    }
    head.add(e);
    const tilt = mood === 'sad' ? -0.35 : mood === 'happy' ? 0.15 : 0.12;
    head.add(limb([s * 0.06, 0.2 + (mood === 'sad' ? 0.035 : 0), 0.4], [s * 0.25, 0.2 + tilt * 0.12, 0.34], 0.032, brown));
  }
  g.add(head);

  // turban
  const turban = new THREE.Group();
  turban.position.y = 2.5;
  turban.add(ball(0.6, white, [0, 0.05, 0], [1, 0.74, 1]));
  turban.add(mesh(new THREE.TorusGeometry(0.47, 0.15, 24, 64), white, [0, -0.14, 0], [1, 1, 1], [Math.PI / 2, 0, 0]));
  const folds = [[0.5, 0.09, 0.0, 0.3], [0.52, 0.085, 0.09, -0.34], [0.5, 0.08, 0.17, 0.38], [0.44, 0.075, 0.25, -0.3], [0.36, 0.07, 0.32, 0.26]];
  for (const [r, t, y, tilt] of folds) turban.add(mesh(new THREE.TorusGeometry(r, t, 20, 64), white, [0, y - 0.02, 0], [1, 1, 1], [Math.PI / 2 + tilt * 0.35, tilt, 0]));
  turban.add(ball(0.2, red, [0, 0.5, -0.02], [1, 1.25, 1]));
  // jewel and feather
  turban.add(mesh(new THREE.OctahedronGeometry(0.19), G, [0, 0.06, 0.6], [0.82, 1.2, 0.3]));
  turban.add(mesh(new THREE.OctahedronGeometry(0.13), gem(0x18c46a), [0, 0.06, 0.64], [0.82, 1.2, 0.45]));
  turban.add(ball(0.05, gem(0xe3243f), [0, -0.2, 0.62]));
  const feather = new THREE.Group();
  feather.position.set(0.02, 0.28, 0.5);
  feather.rotation.set(-0.28, 0, -0.1);
  feather.add(ball(0.3, cloth(0x05706e, { clearcoat: 0.6 }), [0, 0.3, 0], [0.42, 1.25, 0.14]));
  feather.add(limb([0, 0, 0.03], [0, 0.62, 0.03], 0.012, G));
  feather.add(ball(0.045, gem(0x18c46a), [0, 0.68, 0.02]));
  turban.add(feather);
  g.add(turban);
  return g;
}
