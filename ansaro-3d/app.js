import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { COLLECTIONS, MODELS, CLIENTS } from './data.js?v=11';
const CATEGORIES = CLIENTS;
import { LANG, EN, setLang, t, tr, PRICES, STEPS, PAYMENT, CONTACTS, colName, catText, modelName, modelSub, modelDesc, rarity, renderName, nModels } from './lang.js?v=3';
import { rigModel, animateRig } from './anim.js?v=3';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { studioEnvironment, upgradeMaterial, detailSpace, detailToView } from './look.js?v=6';

const $ = s => document.querySelector(s);
const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ================= язык ================= */
document.documentElement.lang = LANG;
document.title = t('title');
document.querySelectorAll('[data-t]').forEach(e => { e.textContent = t(e.dataset.t); });
document.querySelectorAll('[data-ta]').forEach(e => { e.setAttribute('aria-label', t(e.dataset.ta)); e.title = t(e.dataset.ta); });
document.querySelectorAll('[data-lang]').forEach(b => {
  b.classList.toggle('on', b.dataset.lang === LANG); b.setAttribute('aria-pressed', b.dataset.lang === LANG);
  b.onclick = () => { if (b.dataset.lang !== LANG) setLang(b.dataset.lang); };
});
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
      // палитровые модели (имя материала *_Mat) рисуем как есть: детализация шейдером портит их цвета
      const up = m => { if (/_Mat(\.\d+)?$/.test(m.name || '')) { m.envMapIntensity = 0.8; return m; } const n = upgradeMaterial(m); if (n.transparent) { n.depthWrite = false; o.castShadow = false; } if (n.transmission > 0) o.castShadow = false; return n; };
      if (!/[?&]raw/.test(location.search)) o.material = Array.isArray(o.material) ? o.material.map(up) : up(o.material);
    });
    return g.scene;
  }).catch(e => { cache.delete(id); throw e; }));
  return cache.get(id);
}
const HEIGHT = 2.15;
function fit(src, fitW = 1.85) {
  const obj = src.clone(true);
  // рамка по заметным деталям: мелкие улетевшие частицы не уменьшают модель
  const all = new THREE.Box3().setFromObject(obj), diag = all.getSize(new THREE.Vector3()).length();
  const box = new THREE.Box3(); obj.updateMatrixWorld(true);
  obj.traverse(o => { if (o.isMesh) { const b = new THREE.Box3().setFromObject(o); if (b.getSize(new THREE.Vector3()).length() > diag * 0.06) box.union(b); } });
  if (box.isEmpty()) box.copy(all);
  const size = box.getSize(new THREE.Vector3());
  const s = Math.min(HEIGHT / Math.max(size.y, 1e-6), fitW / Math.max(size.x, size.z, 1e-6));
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

/* ---------- клиенты: карточка = заказ, отзыв, каталог его моделей ---------- */
const catOf = m => CATEGORIES.find(c => c.cols.includes(m.col)) || CATEGORIES[0];
const clientModels = c => MODELS.filter(m => c.cols.includes(m.col));
const clientTitle = c => (c.unpaid ? (EN ? 'Order: ' : 'Заказ ') + c.name : c.name);
const clientRenders = c => c.order.renders.map(([rid, en, ru]) => ({ id: rid, name: EN ? en : ru }));
function openClientCatalog(c) {
  if (clientModels(c).length) return openCategory(c);
  closePanels(); fillLB(clientRenders(c), clientTitle(c)); lb.hidden = false;
}
$('#clients').innerHTML = CATEGORIES.map(c => `
  <article class="client">
    <button class="cl-pic" data-act="catalog" data-c="${c.id}"><img src="renders/${c.cover}-s.webp" alt="" loading="lazy">${c.tag ? `<span class="cl-tag">${esc(tr(c.tag))}</span>` : ''}</button>
    <div class="cl-body">
      <div class="cl-top"><h3>${esc(clientTitle(c))}</h3><span class="cl-n"><b>${c.count}</b> ${nModels(c.count).replace(/^\d+ /, '')}${c.total ? ` · <em>${esc(c.total)}</em>` : ''}</span></div>
      <p>${esc(tr(c.order.short))}</p>
      ${c.review ? `<button class="cl-quote" data-act="review" data-c="${c.id}"><span class="rv-stars">${'★'.repeat(c.review.stars || 5)}</span><q>${esc(tr(c.review.text))}</q></button>` : ''}
      <div class="cl-acts">
        <button class="cl-btn" data-act="order" data-c="${c.id}">${t('order')}</button>
        <button class="cl-btn" data-act="review" data-c="${c.id}">${t('review')}</button>
        <button class="cl-btn main" data-act="catalog" data-c="${c.id}">${t('catalog')}</button>
      </div>
    </div>
  </article>`).join('');
$('#clients').onclick = e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const c = CATEGORIES.find(x => x.id === b.dataset.c);
  if (b.dataset.act === 'catalog') openClientCatalog(c);
  if (b.dataset.act === 'order') openOrder(c.id);
  if (b.dataset.act === 'review') openReview(c.id);
};

function openCategory(c, startId) {
  cat = c;
  closePanels();
  catModels = clientModels(c);
  filter = 'all'; list = catModels.slice();
  const cols = c.cols.filter(k => catModels.some(m => m.col === k));
  const cname = c.name;
  tabs.innerHTML = cols.length > 1 ? [['all', t('all')]].concat(cols.map(k => [k, colName(k, COLLECTIONS)])).map(([k, v]) => `<button data-k="${k}" class="${k === 'all' ? 'on' : ''}">${esc(v)}</button>`).join('') : `<button class="on" data-k="all">${esc(cname)}</button>`;
  strip.innerHTML = catModels.map(m => `<button class="thumb" role="option" data-id="${m.id}" data-col="${m.col}" title="${esc(modelName(m))}"><img src="thumbs/${m.id}.webp" alt="${esc(modelName(m))}" loading="lazy" width="68" height="68"></button>`).join('');
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
  $('#iCol').textContent = colName(m.col, COLLECTIONS);
  $('#iRar').textContent = rarity(m) || '';
  $('#iRar').style.display = m.rarity ? '' : 'none';
  $('#iName').textContent = modelName(m);
  $('#iEn').textContent = modelSub(m);
  $('#iEn').style.display = modelSub(m) ? '' : 'none';
  $('#iDesc').textContent = modelDesc(m);
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
  const g = fit(src, m.fitW); if (m.id === "treasurechest") g.rotation.y = 0; g.userData.t = 0; g.userData.base = g.rotation.y;
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
  if (e.key === 'Escape' && $('#lightbox').hidden && openPanel) { closePanels(); return; }
  if (!$('#lightbox').hidden) { if (e.key === 'Escape') closeLB(); if (e.key === 'ArrowRight') lbStep(1); if (e.key === 'ArrowLeft') lbStep(-1); return; }
  if (!$('#intro').classList.contains('gone') || openPanel) return;
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
$('#bOrder').onclick = () => { if (cat) openOrder(cat.id); };

function startShow() { $('#intro').classList.add('gone'); }

const hint = $('#hint');
['pointerdown', 'wheel'].forEach(ev => canvas.addEventListener(ev, () => { if (!interacted) { interacted = true; setTimeout(() => hint.classList.add('gone'), 1200); } stopPlay(); }, { passive: true }));

/* ---------- рендеры ---------- */
const lb = $('#lightbox'), lbGrid = $('#lbGrid'), lbView = $('#lbView');
let lbI = 0, lbList = [];
function fillLB(items, title) {
  lbList = items; $('#lbTitle').textContent = title || t('renders');
  lbGrid.innerHTML = items.map((r, i) => `<button data-i="${i}"><img src="renders/${r.id}-s.webp" alt="${esc(r.name)}" loading="lazy"><span>${esc(r.name)}</span></button>`).join('');
}
lbGrid.onclick = e => { const b = e.target.closest('button'); if (b) openImg(+b.dataset.i); };
function openImg(i) { lbI = (i + lbList.length) % lbList.length; const r = lbList[lbI]; $('#lbImg').src = `renders/${r.id}.webp`; $('#lbImg').alt = r.name; $('#lbCap').textContent = r.name; lbView.hidden = false; }
function lbStep(d) { if (!lbView.hidden) openImg(lbI + d); }
function closeLB() { if (!lbView.hidden) { lbView.hidden = true; return; } lb.hidden = true; }

$('#lbClose').onclick = () => { lbView.hidden = true; lb.hidden = true; };
$('#lbPrev').onclick = () => lbStep(-1); $('#lbNext').onclick = () => lbStep(1);
lbView.onclick = e => { if (e.target === lbView) lbView.hidden = true; };

/* ---------- заказ, отзыв, цены ---------- */
const panels = { order: $('#pOrder'), review: $('#pReview'), pricing: $('#pPricing') };
let openPanel = null;
function showPanel(k) {
  stopPlay();
  Object.entries(panels).forEach(([n, p]) => { p.hidden = n !== k; });
  openPanel = k; panels[k].scrollTop = 0;
}
function closePanels() { Object.values(panels).forEach(p => { p.hidden = true; }); openPanel = null; }
document.querySelectorAll('[data-close]').forEach(b => { b.onclick = closePanels; });
Object.values(panels).forEach(p => p.addEventListener('click', e => { if (e.target === p) closePanels(); }));
document.addEventListener('click', e => {
  const b = e.target.closest('[data-open]'); if (!b) return;
  if (b.dataset.open === 'pricing') showPanel('pricing');
});
$('#oBack').onclick = () => { closePanels(); openPicker(); };

function openOrder(id) {
  const c = CATEGORIES.find(x => x.id === id); if (!c) return;
  const o = c.order, ms = clientModels(c);
  const rs = o.renders.map(([rid, en, ru]) => ({ id: rid, name: EN ? en : ru }));
  $('#oDetail').innerHTML = `
    <div class="od-hero"><img src="renders/${c.cover}.webp" alt=""></div>
    <div class="od-main">
      <p class="od-client">${esc(clientTitle(c))}${c.tag ? ` · ${esc(tr(c.tag))}` : ''}</p>
      <h3>${esc(tr(o.title))}</h3>
      <p class="od-short">${esc(tr(o.short))}</p>
      <dl class="od-facts">
        <div><dt>${t('fCount')}</dt><dd>${c.count}</dd></div>
        ${c.total ? `<div><dt>${t('fTotal')}</dt><dd>${esc(c.total)}</dd></div>` : ''}
        <div><dt>${t('fStatus')}</dt><dd>${t('st_' + o.status)}</dd></div>
        <div><dt>${t('fFormat')}</dt><dd>${esc(tr(o.format))}</dd></div>
      </dl>
      <h5>${t('ordered')}</h5>
      <ul class="od-items">${tr(o.items).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="od-btns">${ms.length ? `<button class="btn-primary sm" data-view="0">${t('catalog')} · 3D</button>` : `<button class="btn-primary sm" data-r="0">${t('renders')}</button>`}<button class="btn-ghost sm" data-rv>${t('review')}</button></div>
    </div>
    ${ms.length ? `<section class="od-sec"><div class="od-sec-h"><h5>${t('models3d')} · ${ms.length}</h5></div>
      <div class="od-models">${ms.map((m, i) => `<button class="od-model" data-view="${i}"><img src="thumbs/${m.id}.webp" alt="" loading="lazy"><b>${esc(modelName(m))}</b><small>${esc(rarity(m) || '')}</small><span class="od-3d">3D</span></button>`).join('')}</div></section>` : ''}
    <section class="od-sec"><div class="od-sec-h"><h5>${t('renders')} · ${rs.length}</h5></div>
      <div class="od-renders">${rs.map((r, i) => `<button data-r="${i}"><img src="renders/${r.id}-s.webp" alt="${esc(r.name)}" loading="lazy"><span>${esc(r.name)}</span></button>`).join('')}</div></section>`;
  $('#oDetail').onclick = e => {
    const v = e.target.closest('[data-view]');
    if (v) { openCategory(c, ms[+v.dataset.view].id); return; }
    if (e.target.closest('[data-rv]')) { openReview(c.id); return; }
    const r = e.target.closest('[data-r]');
    if (r) { fillLB(rs, tr(o.title)); lb.hidden = false; openImg(+r.dataset.r); }
  };
  showPanel('order');
}

function openReview(id) {
  const c = CATEGORIES.find(x => x.id === id); if (!c) return;
  const r = c.review;
  $('#rvBody').innerHTML = r ? `
    <figure class="rv-card">
      <div class="rv-stars" aria-label="${r.stars || 5}/5">${'★'.repeat(r.stars || 5)}</div>
      <blockquote>${esc(tr(r.text))}</blockquote>
      <figcaption><b>${esc(c.name)}</b>${r.date ? ` · ${esc(r.date)}` : ''}${r.via ? ` · ${esc(r.via)}` : ''}</figcaption>
      ${r.img ? `<img class="rv-shot" src="${r.img}" alt="">` : ''}
    </figure>
    <div class="od-btns"><button class="btn-primary sm" data-cat="${c.id}">${clientModels(c).length ? t('catalog') + ' · 3D' : t('renders')}</button><button class="btn-ghost sm" data-ord="${c.id}">${t('order')}</button></div>`
    : `<p class="rv-soon">${t('reviewSoon')}</p><div class="od-btns"><button class="btn-primary sm" data-cat="${c.id}">${clientModels(c).length ? t('catalog') + ' · 3D' : t('renders')}</button><button class="btn-ghost sm" data-ord="${c.id}">${t('order')}</button></div>`;
  $('#rvBody').onclick = e => {
    if (e.target.closest('[data-cat]')) openClientCatalog(c);
    if (e.target.closest('[data-ord]')) openOrder(c.id);
  };
  showPanel('review');
}

$('#prBody').innerHTML = `
  <div class="pr-cards">${PRICES.map(p => `<div class="pr-card"><b>${esc(tr(p.name))}</b><small>${esc(tr(p.note))}</small><div class="pr-price">${esc(tr(p.price))}<span>≈ ${p.robux}</span></div></div>`).join('')}</div>
  <p class="pr-note">${t('prNote')}</p>
  <div class="pr-cols">
    <div><h5>${t('howTitle')}</h5><ol class="pr-steps">${STEPS.map(x => `<li>${esc(tr(x))}</li>`).join('')}</ol></div>
    <div><h5>${t('pay')}</h5><p>${esc(tr(PAYMENT))}</p>
      <h5>${t('contact')}</h5>
      <div class="pr-contacts">${CONTACTS.map(c => c.href
        ? `<a class="contact" href="${c.href}" target="_blank" rel="noopener"><small>${c.k}</small><b>${esc(c.v)}</b></a>`
        : `<button class="contact" data-copy="${esc(c.v)}"><small>${c.k}</small><b>${esc(c.v)}</b><i>${t('copy')}</i></button>`).join('')}</div>
    </div>
  </div>`;
$('#prBody').onclick = e => {
  const b = e.target.closest('[data-copy]'); if (!b) return;
  navigator.clipboard?.writeText(b.dataset.copy).then(() => { b.querySelector('i').textContent = t('copied'); setTimeout(() => { b.querySelector('i').textContent = t('copy'); }, 1600); }).catch(() => {});
};
if (location.hash === '#pricing') showPanel('pricing');
const fromLink = location.hash.match(/^#(order|review|catalog)-(\w+)$/);
if (fromLink) ({ order: openOrder, review: openReview, catalog: id => { const c = CATEGORIES.find(x => x.id === id); if (c) openClientCatalog(c); } })[fromLink[1]](fromLink[2]);

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
  if (document.hidden || !lb.hidden || openPanel) { clock.getDelta(); return; }
  const menu = !$('#intro').classList.contains('gone');
  frameN++;
  if (menu) { clock.getDelta(); return; } // главная статичная, сцену не рисуем
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
// главная статичная: 3D грузится только при открытии каталога
setTier(tier);
tick();
