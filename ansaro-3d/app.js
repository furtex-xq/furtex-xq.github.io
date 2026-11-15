import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { COLLECTIONS, MODELS, RENDERS, CATEGORIES } from './data.js?v=2';
import { rigModel, animateRig } from './anim.js?v=3';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { studioEnvironment, upgradeMaterial, detailSpace, detailToView } from './look.js?v=6';

const $ = s => document.querySelector(s);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = () => innerWidth <= 760;
const ease = { outBack: t => { const c = 1.5; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }, inCubic: t => t * t * t, inOut: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 };

/* ================= рендерер и сцена ================= */
const canvas = $('#stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
/* качество подстраивается под устройство: 2 — всё, 1 — без AO, 0 — экономный */
let tier = /[?&]q=(\d)/.test(location.search) ? +location.search.match(/[?&]q=(\d)/)[1] : (mobile() ? 1 : 2);
const DPR = () => Math.min(devicePixelRatio, [1, mobile() ? 1.5 : 1.5, 2][tier]);
renderer.setPixelRatio(DPR());
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // тень обновляем через кадр

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = studioEnvironment(renderer);
scene.environmentIntensity = 0.6;

const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.05, 200);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.07;
controls.enablePan = false; controls.minDistance = 3.2; controls.maxDistance = 14;
controls.minPolarAngle = 0.35; controls.maxPolarAngle = 1.62;
controls.target.set(0, 1.12, 0);

const accent = new THREE.Color('#ffc24a');
const accentTarget = new THREE.Color('#ffc24a');

/* фон: тёмный градиент со свечением цвета модели */
const bgMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { uAccent: { value: accent } },
  vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 uAccent; varying vec3 vP;
    void main(){
      float h = vP.y * .5 + .5;
      vec3 top = vec3(.020,.018,.034), bottom = vec3(.006,.005,.010);
      vec3 c = mix(bottom, top, smoothstep(.15,.85,h));
      float horizon = exp(-pow((vP.y-.06)*5.0,2.0));
      c += uAccent * horizon * .03;
      gl_FragColor = vec4(c,1.0);
    }`
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(80, 48, 24), bgMat);
scene.add(sky);

/* свечение за моделью */
function radialTex(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([p, a]) => gr.addColorStop(p, `rgba(255,255,255,${a})`));
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex([[0, .55], [.35, .18], [1, 0]]), color: accent, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .2 }));
halo.scale.set(6.5, 6.5, 1); halo.position.set(0, 1.3, -2.2); halo.renderOrder = -2;
scene.add(halo);

/* пьедестал */
const ped = new THREE.Group(); scene.add(ped);
const pedMat = new THREE.MeshPhysicalMaterial({ color: 0x0d0b14, metalness: .35, roughness: .32, clearcoat: 1, clearcoatRoughness: .12 });
const pedTop = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.42, 0.16, 96), pedMat);
pedTop.position.y = 0.08; pedTop.receiveShadow = true; ped.add(pedTop);
const pedBase = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.7, 0.1, 96), pedMat);
pedBase.position.y = -0.05; pedBase.receiveShadow = true; ped.add(pedBase);
const ringMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: accent, emissiveIntensity: 2.4, toneMapped: true });
const ring = new THREE.Mesh(new THREE.TorusGeometry(1.395, 0.012, 12, 160), ringMat);
ring.rotation.x = Math.PI / 2; ring.position.y = 0.162; ped.add(ring);
const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.69, 0.008, 10, 160), ringMat);
ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.0; ped.add(ring2);

/* пол: мягкая тень + световое пятно */
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: .45 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -0.1; floor.receiveShadow = true; scene.add(floor);
const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: radialTex([[0, .22], [.4, .05], [1, 0]]), color: accent, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
pool.rotation.x = -Math.PI / 2; pool.position.y = -0.095; scene.add(pool);

/* свет: ключевой, контровые цвета модели, заполняющий */
const key = new THREE.DirectionalLight(0xfff3e6, 1.6);
key.position.set(-3.5, 6.5, 4.5); key.castShadow = true;
key.shadow.mapSize.set(tier === 2 ? 2048 : 1024, tier === 2 ? 2048 : 1024); key.shadow.radius = 6; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
Object.assign(key.shadow.camera, { left: -3, right: 3, top: 4, bottom: -2, near: 1, far: 20 });
scene.add(key);
const rimL = new THREE.SpotLight(accent, 34, 18, 0.55, 0.8, 1.6); rimL.position.set(-4.5, 3.6, -4); rimL.target.position.set(0, 1.1, 0); scene.add(rimL, rimL.target);
const rimR = new THREE.SpotLight(accent, 26, 18, 0.55, 0.8, 1.6); rimR.position.set(4.8, 2.6, -3.5); rimR.target.position.set(0, 1.1, 0); scene.add(rimR, rimR.target);
const top = new THREE.SpotLight(0xffffff, 16, 14, 0.42, 0.9, 1.5); top.position.set(0, 7, 1.2); top.target.position.set(0, 0.6, 0); scene.add(top, top.target);
const fill = new THREE.DirectionalLight(0x9fb4ff, 0.35); fill.position.set(4, 2, 5); scene.add(fill);

/* пылинки в цвете модели */
const DUST = mobile() ? 90 : 200;
const dustGeo = new THREE.BufferGeometry();
const dpos = new Float32Array(DUST * 3), dspd = new Float32Array(DUST);
for (let i = 0; i < DUST; i++) {
  const r = 1.2 + Math.random() * 3.2, a = Math.random() * Math.PI * 2;
  dpos[i * 3] = Math.cos(a) * r; dpos[i * 3 + 1] = Math.random() * 4.2; dpos[i * 3 + 2] = Math.sin(a) * r - 0.6;
  dspd[i] = 0.06 + Math.random() * 0.16;
}
dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.035, map: radialTex([[0, 1], [.3, .5], [1, 0]]), color: accent, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
scene.add(dust);

/* постобработка: свечение неона */
const composer = new EffectComposer(renderer);
composer.setPixelRatio(DPR());
composer.addPass(new RenderPass(scene, camera));
/* мягкие тени в щелях и углублениях (только на компьютере) */
let gtao = null;
if (tier === 2 && !/[?&]noao/.test(location.search)) {
  gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  gtao.blendIntensity = 0.85;
  gtao.updateGtaoMaterial({ radius: 0.18, distanceExponent: 1.5, thickness: 1.2, scale: 1.0, samples: 8 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 8 });
  composer.addPass(gtao);
}
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.42, 0.45, 1.25);
// свечение считаем в половинном разрешении — на вид то же, а в 4 раза дешевле
const bloomSize = bloom.setSize.bind(bloom); bloom.setSize = (w, h) => bloomSize(Math.ceil(w / 2), Math.ceil(h / 2));
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ================= модели ================= */
const draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/libs/draco/gltf/');
const loader = new GLTFLoader().setDRACOLoader(draco);
const cache = new Map();
function load(id) {
  if (!cache.has(id)) cache.set(id, loader.loadAsync(`models/${id}.glb?v=1`).then(g => {
    g.scene.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      const up = m => { const n = upgradeMaterial(m); if (n.transparent) { n.depthWrite = false; o.castShadow = false; } if (n.transmission > 0) o.castShadow = false; return n; };
      o.material = Array.isArray(o.material) ? o.material.map(up) : up(o.material);
    });
    return g.scene;
  }).catch(e => { cache.delete(id); throw e; }));
  return cache.get(id);
}
const HEIGHT = 2.15;
function fit(src) {
  const obj = src.clone(true);
  // рамка по заметным деталям: мелкие улетевшие частицы не уменьшают модель
  const all = new THREE.Box3().setFromObject(obj), diag = all.getSize(new THREE.Vector3()).length();
  const box = new THREE.Box3(); obj.updateMatrixWorld(true);
  obj.traverse(o => { if (o.isMesh) { const b = new THREE.Box3().setFromObject(o); if (b.getSize(new THREE.Vector3()).length() > diag * 0.06) box.union(b); } });
  if (box.isEmpty()) box.copy(all);
  const size = box.getSize(new THREE.Vector3());
  const s = Math.min(HEIGHT / Math.max(size.y, 1e-6), 1.85 / Math.max(size.x, size.z, 1e-6));
  obj.scale.setScalar(s);
  box.min.multiplyScalar(s); box.max.multiplyScalar(s);
  const c = box.getCenter(new THREE.Vector3());
  obj.position.set(-c.x, 0.165 - box.min.y, -c.z);
  const g = new THREE.Group(); g.add(obj); g.rotation.y = Math.PI; // перед модели Roblox смотрит в −Z
  g.userData.h = box.max.y - box.min.y;
  g.userData.rig = rigModel(obj, size.y);
  return g;
}

/* ================= состояние и интерфейс ================= */
let filter = 'all';
let cat = null;
let catModels = MODELS.slice();
let list = MODELS.slice();
let idx = 0;
let current = null, leaving = null;
let spin = true, play = false, playT = 0, interacted = false;
const PLAY_SEC = 6.5;

const tabs = $('#tabs');
const strip = $('#strip');
tabs.onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  filter = b.dataset.k;
  tabs.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  list = filter === 'all' ? catModels.slice() : catModels.filter(m => m.col === filter);
  strip.querySelectorAll('.thumb').forEach(t => t.classList.toggle('hide', filter !== 'all' && t.dataset.col !== filter));
  show(0, true);
};

/* ---------- категории ---------- */
const catOf = m => CATEGORIES.find(c => c.cols.includes(m.col)) || CATEGORIES[0];
const SOON_ICON = '<svg viewBox="0 0 24 24"><path d="M3 16v-3l2-5h11l3 5h2v3h-2M3 16h2m4 0h6"/><circle cx="7" cy="16.5" r="2"/><circle cx="17" cy="16.5" r="2"/></svg>';
const catsEl = $('#cats');
catsEl.innerHTML = CATEGORIES.map(c => {
  const ms = MODELS.filter(m => c.cols.includes(m.col)), n = ms.length;
  const cover = n ? (MODELS.find(m => m.id === c.cover) || ms[0]) : null;
  return `<button class="cat" data-c="${c.id}" style="--c:${cover ? cover.accent : '#8a83a3'}" ${n ? '' : 'disabled'}>
    <span class="n">${n ? n + ' ' + plural(n, 'модель', 'модели', 'моделей') : 'скоро'}</span>
    <span class="pic">${cover ? `<img src="thumbs/${cover.id}.webp" alt="">` : SOON_ICON}</span>
    <b>${c.name}</b><small>${c.note || ''}</small></button>`;
}).join('');
function plural(n, a, b, c) { const d = n % 10, h = n % 100; return d === 1 && h !== 11 ? a : d >= 2 && d <= 4 && (h < 12 || h > 14) ? b : c; }
catsEl.onclick = e => { const b = e.target.closest('.cat'); if (b && !b.disabled) openCategory(CATEGORIES.find(c => c.id === b.dataset.c)); };

function openCategory(c, startId) {
  cat = c;
  catModels = MODELS.filter(m => c.cols.includes(m.col));
  filter = 'all'; list = catModels.slice();
  const cols = c.cols.filter(k => catModels.some(m => m.col === k));
  tabs.innerHTML = cols.length > 1 ? [['all', 'Все']].concat(cols.map(k => [k, COLLECTIONS[k] || k])).map(([k, v]) => `<button data-k="${k}" class="${k === 'all' ? 'on' : ''}">${v}</button>`).join('') : `<button class="on" data-k="all">${c.name}</button>`;
  strip.innerHTML = catModels.map(m => `<button class="thumb" role="option" data-id="${m.id}" data-col="${m.col}" title="${m.name}"><img src="thumbs/${m.id}.webp" alt="${m.name}" loading="lazy" width="68" height="68"></button>`).join('');
  const i = startId ? Math.max(0, list.findIndex(m => m.id === startId)) : 0;
  startShow();
  show(i, true);
}
strip.onclick = e => {
  const b = e.target.closest('.thumb'); if (!b) return;
  const i = list.findIndex(m => m.id === b.dataset.id); if (i >= 0) { stopPlay(); show(i); }
};

function setAccent(hex) {
  accentTarget.set(hex);
  document.documentElement.style.setProperty('--accent', hex);
}
function pad(n) { return String(n).padStart(2, '0'); }

const info = $('#info');
function writeInfo(m) {
  $('#iCol').textContent = COLLECTIONS[m.col] || '';
  $('#iRar').textContent = m.rarity || '';
  $('#iRar').style.display = m.rarity ? '' : 'none';
  $('#iName').textContent = m.name;
  $('#iEn').textContent = m.en ? m.en.replace(/([a-z])([A-Z])/g, '$1 $2') : '';
  $('#iDesc').textContent = m.desc || '';
  $('#cNow').textContent = pad(idx + 1); $('#cAll').textContent = pad(list.length);
}

let token = 0;
async function show(i, force) {
  if (!list.length) return;
  i = (i + list.length) % list.length;
  if (i === idx && current && !force) return;
  idx = i;
  const m = list[idx];
  const my = ++token;
  if ($('#intro').classList.contains('gone')) location.replace('#' + m.id);
  strip.querySelectorAll('.thumb').forEach(t => {
    const on = t.dataset.id === m.id; t.classList.toggle('on', on);
    if (on) t.scrollIntoView({ inline: 'center', block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' });
  });
  info.classList.add('out');
  if (current) { leaving = { g: current, t: 0 }; current = null; }
  $('#loader').classList.add('on');
  let src;
  try { src = await load(m.id); } catch (e) { $('#loader').classList.remove('on'); return; }
  if (my !== token) return;
  $('#loader').classList.remove('on');
  const wait = () => leaving ? new Promise(r => setTimeout(r, 40)).then(wait) : null;
  await wait();
  if (my !== token) return;
  const g = fit(src); if (m.id === "treasurechest") g.rotation.y = 0; g.userData.t = 0; g.userData.base = g.rotation.y;
  // шейдеры компилируем заранее, чтобы смена модели не дёргалась
  try { await renderer.compileAsync(g, camera, scene); } catch (e) {}
  if (my !== token) return;
  g.scale.setScalar(0.001);
  scene.add(g); current = g; shadowDirty = 2;
  setAccent(m.accent || '#ffc24a');
  writeInfo(m); info.classList.remove('out');
  playT = 0;
  // заранее грузим соседей
  [1, -1].forEach(d => load(list[(idx + d + list.length) % list.length].id).catch(() => {}));
}
const next = () => show(idx + 1), prev = () => show(idx - 1);
$('#next').onclick = () => { stopPlay(); next(); };
$('#prev').onclick = () => { stopPlay(); prev(); };
addEventListener('keydown', e => {
  if (!$('#lightbox').hidden) { if (e.key === 'Escape') closeLB(); if (e.key === 'ArrowRight') lbStep(1); if (e.key === 'ArrowLeft') lbStep(-1); return; }
  if (!$('#intro').classList.contains('gone')) return;
  if (e.key === 'ArrowRight') { stopPlay(); next(); } if (e.key === 'ArrowLeft') { stopPlay(); prev(); }
});

const bSpin = $('#bSpin'), bPlay = $('#bPlay');
bSpin.onclick = () => { spin = !spin; bSpin.classList.toggle('on', spin); bSpin.setAttribute('aria-pressed', spin); };
function stopPlay() { play = false; bPlay.classList.remove('on'); bPlay.setAttribute('aria-pressed', 'false'); }
bPlay.onclick = () => { play = !play; playT = 0; bPlay.classList.toggle('on', play); bPlay.setAttribute('aria-pressed', play); };

$('#bFull').onclick = () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); };
function openPicker() { stopPlay(); history.replaceState(null, "", location.pathname + location.search); $("#intro").classList.remove("gone"); }
$('#home').onclick = e => { e.preventDefault(); openPicker(); };
$('#bCats').onclick = openPicker;

function startShow() { $('#intro').classList.add('gone'); }

const hint = $('#hint');
['pointerdown', 'wheel'].forEach(ev => canvas.addEventListener(ev, () => { if (!interacted) { interacted = true; setTimeout(() => hint.classList.add('gone'), 1200); } stopPlay(); }, { passive: true }));

/* ---------- рендеры ---------- */
const lb = $('#lightbox'), lbGrid = $('#lbGrid'), lbView = $('#lbView');
let lbI = 0;
lbGrid.innerHTML = RENDERS.map((r, i) => `<button data-i="${i}"><img src="renders/${r.id}-s.webp" alt="${r.name}" loading="lazy"><span>${r.name}</span></button>`).join('');
lbGrid.onclick = e => { const b = e.target.closest('button'); if (b) openImg(+b.dataset.i); };
function openImg(i) { lbI = (i + RENDERS.length) % RENDERS.length; const r = RENDERS[lbI]; $('#lbImg').src = `renders/${r.id}.webp`; $('#lbImg').alt = r.name; $('#lbCap').textContent = r.name; lbView.hidden = false; }
function lbStep(d) { if (!lbView.hidden) openImg(lbI + d); }
function closeLB() { if (!lbView.hidden) { lbView.hidden = true; return; } lb.hidden = true; }
$('#bRenders').onclick = () => { stopPlay(); lb.hidden = false; };
$('#lbClose').onclick = () => { lbView.hidden = true; lb.hidden = true; };
$('#lbPrev').onclick = () => lbStep(-1); $('#lbNext').onclick = () => lbStep(1);
lbView.onclick = e => { if (e.target === lbView) lbView.hidden = true; };

/* ---------- камера под размер экрана ---------- */
function frame() {
  const h = HEIGHT + 0.6, v = THREE.MathUtils.degToRad(camera.fov) / 2;
  const hf = Math.atan(Math.tan(v) * camera.aspect);
  const dist = Math.max(h / 2 / Math.tan(v), 1.75 / Math.tan(hf)) * (mobile() ? 1.3 : 1.28);
  const ty = mobile() ? 1.42 : 1.15;
  controls.target.set(0, ty, 0);
  camera.position.set(0, ty + dist * 0.16, dist);
  controls.update();
}
frame();
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setPixelRatio(DPR()); renderer.setSize(innerWidth, innerHeight);
  composer.setPixelRatio(DPR()); composer.setSize(innerWidth, innerHeight); bloom.setSize(innerWidth, innerHeight);
  frame();
});

/* ---------- цикл ---------- */
const clock = new THREE.Clock();
const _dS = new THREE.Matrix4(), _dV = new THREE.Matrix4(), _dI = new THREE.Matrix4();
let time = 0, frameN = 0, shadowDirty = 2;
let perfT = 0, perfN = 0, perfWait = 2.5;
function adapt(dt) {
  // через пару секунд после старта меряем кадр и при тормозах снижаем качество
  if (tier === 0 || /[?&]q=/.test(location.search) || document.hidden) return;
  if (perfWait > 0) { perfWait -= dt; return; }
  perfT += dt; perfN++;
  if (perfT < 2) return;
  const fps = perfN / perfT; perfT = 0; perfN = 0;
  if (fps < 40) setTier(tier - 1);
}
function setTier(t) {
  tier = Math.max(0, t);
  if (gtao && tier < 2) gtao.enabled = false;
  bloom.enabled = tier > 0;
  if (tier < 2) { key.shadow.mapSize.set(1024, 1024); key.shadow.map?.dispose(); key.shadow.map = null; shadowDirty = 2; }
  renderer.setPixelRatio(DPR()); composer.setPixelRatio(DPR()); composer.setSize(innerWidth, innerHeight);
  perfWait = 1.5;
  if (fpsEl) fpsEl.dataset.tier = tier;
}
const fpsEl = /[?&]fps/.test(location.search) ? Object.assign(document.body.appendChild(document.createElement('div')), { style: 'position:fixed;left:8px;bottom:8px;z-index:99;font:12px monospace;color:#9f9;background:#000a;padding:4px 6px;border-radius:6px' }) : null;
let fpsAcc = 0, fpsCnt = 0;
function tick() {
  requestAnimationFrame(tick);
  if (document.hidden || !lb.hidden) { clock.getDelta(); return; }
  const menu = !$('#intro').classList.contains('gone');
  frameN++;
  if (menu && frameN % 2) return; // под меню хватает 30 кадров
  const dt = Math.min(clock.getDelta(), 0.05); time += dt;
  if (!menu) adapt(dt);
  if (fpsEl) { fpsAcc += dt; fpsCnt++; if (fpsAcc > 0.5) { fpsEl.textContent = Math.round(fpsCnt / fpsAcc) + ' fps · q' + tier; fpsAcc = 0; fpsCnt = 0; } }
  accent.lerp(accentTarget, 1 - Math.pow(0.02, dt));
  halo.material.color.copy(accent); pool.material.color.copy(accent); dust.material.color.copy(accent);
  rimL.color.copy(accent); rimR.color.copy(accent); ringMat.emissive.copy(accent);

  if (leaving) {
    leaving.t += dt / 0.32;
    const k = 1 - ease.inCubic(Math.min(leaving.t, 1));
    leaving.g.scale.setScalar(Math.max(k, 0.001)); leaving.g.rotation.y += dt * 6 * (1 - k);
    if (leaving.t >= 1) { scene.remove(leaving.g); leaving = null; }
  }
  if (current) {
    const u = current.userData; u.t = Math.min(u.t + dt / 0.75, 1);
    current.scale.setScalar(Math.max(ease.outBack(u.t), 0.001));
    if (spin && !REDUCED) current.rotation.y += dt * 0.42;
    current.position.y = REDUCED ? 0 : Math.sin(time * 1.3) * 0.035 + 0.02;
  }
  ring.material.emissiveIntensity = 2.0 + Math.sin(time * 2) * 0.5;
  const p = dustGeo.attributes.position;
  for (let i = 0; i < DUST; i++) {
    let y = p.array[i * 3 + 1] + dspd[i] * dt; if (y > 4.4) y = 0;
    p.array[i * 3 + 1] = y; p.array[i * 3] += Math.sin(time * 0.6 + i) * 0.0009;
  }
  p.needsUpdate = true;
  if (play) { playT += dt; if (playT > PLAY_SEC) { playT = 0; next(); } }
  if (!REDUCED) { if (current) animateRig(current.userData.rig, time); if (leaving) animateRig(leaving.g.userData.rig, time); }
  if (current) {
    current.updateMatrixWorld();
    const s = current.scale.x;
    detailSpace.value.copy(current.matrixWorld).invert().premultiply(_dS.makeScale(s, s, s));
  }
  controls.update();
  camera.updateMatrixWorld();
  _dV.copy(camera.matrixWorldInverse).multiply(_dI.copy(detailSpace.value).invert());
  detailToView.value.setFromMatrix4(_dV);
  if (shadowDirty > 0 || frameN % 2 === 0) { renderer.shadowMap.needsUpdate = true; if (shadowDirty > 0) shadowDirty--; }
  composer.render();
}

/* ---------- старт ---------- */
const fromHash = MODELS.find(m => '#' + m.id === location.hash);
if (fromHash) openCategory(catOf(fromHash), fromHash.id);
else {
  // за меню крутится обложка первой категории
  cat = CATEGORIES[0]; catModels = MODELS.filter(m => cat.cols.includes(m.col)); list = catModels.slice();
  show(Math.max(0, list.findIndex(m => m.id === cat.cover)), true);
}
setTier(tier);
tick();
