import { THREE, keyLight, makeRenderer, studio } from './kit.js';
import { buildSultan } from './sultan.js';
import { buildHall, buildPalace } from './palace.js';

const q = new URLSearchParams(location.search);
const what = q.get('scene') || 'sultan';
const w = +(q.get('w') || 900);
const h = +(q.get('h') || 1200);
const scene = new THREE.Scene();
let camera;

if (what === 'palace' || what === 'hall') {
  const renderer = makeRenderer(w, h, false);
  studio(scene, renderer, 0.18);
  renderer.toneMappingExposure = 0.9;
  camera = what === 'palace' ? buildPalace(scene) : buildHall(scene);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
} else {
  const renderer = makeRenderer(w, h, true);
  studio(scene, renderer, 0.5);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x5a4a7a, 0.45));
  keyLight(scene, 0xfff0dc, 2.2, [-3.5, 6, 6], 4);
  const rim = new THREE.DirectionalLight(0x8fb6ff, 2.2);
  rim.position.set(4, 4, -5);
  scene.add(rim);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.38 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  {
    const s = buildSultan(q.get('mood') || 'idle');
    s.rotation.y = +(q.get('turn') || 0);
    scene.add(s);
    camera = new THREE.PerspectiveCamera(26, w / h, 0.1, 100);
    camera.position.set(0, 2.2, 9.8);
    camera.lookAt(0, 1.6, 0);
  }
  renderer.render(scene, camera);
}
window.__done = true;
