// Shared 3D toolkit: renderer, lighting, materials and small modelling helpers.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export { THREE };

export function makeRenderer(w, h, alpha) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);
  return renderer;
}

export function studio(scene, renderer, intensity = 0.55) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = intensity;
}

/** Glossy "toy" material. */
export const mat = (color, o = {}) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.42, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.3, ...o });
export const gold = (o = {}) => new THREE.MeshPhysicalMaterial({ color: 0xffc233, roughness: 0.22, metalness: 1, clearcoat: 0.6, ...o });
export const gem = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.05, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02, emissive: color, emissiveIntensity: 0.35, flatShading: true });
export const cloth = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.62, sheen: 0.35, sheenRoughness: 0.6, sheenColor: color, ...o });

export function mesh(geo, material, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos);
  m.scale.set(...scale);
  m.rotation.set(...rot);
  m.castShadow = m.receiveShadow = true;
  return m;
}
export const ball = (r, material, pos, scale, rot) => mesh(new THREE.SphereGeometry(r, 48, 36), material, pos, scale, rot);

/** A rounded limb between two points. */
export function limb(a, b, r, material) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 12, 24), material);
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  m.castShadow = m.receiveShadow = true;
  return m;
}

export function lathe(points, material, segments = 64, phiStart = 0, phiLength = Math.PI * 2) {
  const m = new THREE.Mesh(new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments, phiStart, phiLength), material);
  m.castShadow = m.receiveShadow = true;
  return m;
}

export function keyLight(scene, color, intensity, pos, size = 6) {
  const l = new THREE.DirectionalLight(color, intensity);
  l.position.set(...pos);
  l.castShadow = true;
  l.shadow.mapSize.set(2048, 2048);
  l.shadow.camera.left = l.shadow.camera.bottom = -size;
  l.shadow.camera.right = l.shadow.camera.top = size;
  l.shadow.camera.near = 0.5;
  l.shadow.camera.far = 80;
  l.shadow.bias = -0.0004;
  l.shadow.radius = 6;
  scene.add(l);
  return l;
}
