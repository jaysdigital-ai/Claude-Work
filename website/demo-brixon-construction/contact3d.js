/* Brixon — testimonials (card deck + swinging handover keys) and the quote form (a glass tower that rises as you fill it in) */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const Y = 0xffc60a, B = 0x1b74bd, INK = 0x1a2026, PAPER = 0xf1eee6;
const std = (color, roughness = .6, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
const put = (g, geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
const box = (g, m, w, h, d, x, y, z) => put(g, new THREE.BoxGeometry(w, h, d), m, x, y, z);

function stageFor(canvas, fov) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
  const camera = new THREE.PerspectiveCamera(fov, 1, .1, 200);
  const box = canvas.parentElement;
  const st = { renderer, scene, camera, aspect: 1, on: false };
  const resize = () => { const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); st.aspect = w / h; camera.aspect = st.aspect; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(box); resize();
  st.run = frame => {
    let last = 0;
    const loop = now => { if (!st.on) return; const dt = Math.min(.05, (now - last) / 1000); last = now; frame(dt, now / 1000); renderer.render(scene, camera); requestAnimationFrame(loop); };
    new IntersectionObserver(([e]) => { const was = st.on; st.on = e.isIntersecting; if (st.on && !was) { last = performance.now(); requestAnimationFrame(loop); } }, { rootMargin: '80px' }).observe(box);
  };
  return st;
}

/* =====================================================================
   TESTIMONIALS — a deck you flick through; the keys swing with every card
   ===================================================================== */
let kick = () => {};
function deck() {
  const el = document.getElementById('voiceDeck');
  if (!el) return;
  const cards = [...el.querySelectorAll('.vcard')], n = cards.length, now = document.getElementById('voiceNow');
  let front = 0, busy = false, auto = true;
  cards.forEach((c, i) => { const tag = document.createElement('span'); tag.className = 'mono vcard-no'; tag.textContent = `${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`; c.prepend(tag); });
  const layout = () => { cards.forEach((c, i) => { c.dataset.pos = (i - front + n) % n; }); now.textContent = String(front + 1).padStart(2, '0'); };
  const go = dir => {
    if (busy) return; busy = true;
    const leaving = cards[front];
    if (dir > 0) {
      leaving.classList.add(reduce ? 'x' : 'out'); kick(1);
      setTimeout(() => { front = (front + 1) % n; leaving.classList.remove('out'); leaving.classList.add('snap'); layout(); requestAnimationFrame(() => requestAnimationFrame(() => { leaving.classList.remove('snap'); busy = false; })); }, reduce ? 0 : 420);
    } else {
      front = (front - 1 + n) % n; const incoming = cards[front]; kick(-1);
      incoming.classList.add('snap', 'out'); layout();
      requestAnimationFrame(() => requestAnimationFrame(() => { incoming.classList.remove('snap', 'out'); setTimeout(() => busy = false, 420); }));
    }
  };
  const user = dir => { auto = false; go(dir); };
  document.getElementById('voiceNext').addEventListener('click', () => user(1));
  document.getElementById('voicePrev').addEventListener('click', () => user(-1));
  el.addEventListener('keydown', e => { if (e.key === 'ArrowRight') user(1); if (e.key === 'ArrowLeft') user(-1); });

  // front card: tilt under the cursor, drag to throw
  let sx = 0, dx = 0, dragging = false;
  el.addEventListener('pointermove', e => {
    const c = cards[front], r = el.getBoundingClientRect();
    if (dragging) { dx = e.clientX - sx; c.style.setProperty('--dx', dx + 'px'); c.style.setProperty('--dr', dx * .04 + 'deg'); return; }
    if (!fine || reduce) return;
    c.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 12 + 'deg'); c.style.setProperty('--rx', (.5 - (e.clientY - r.top) / r.height) * 9 + 'deg');
  });
  const rest = c => ['--ry', '--rx', '--dr'].forEach(p => c.style.setProperty(p, '0deg')) || c.style.setProperty('--dx', '0px');
  el.addEventListener('pointerleave', () => { if (!dragging) rest(cards[front]); });
  el.addEventListener('pointerdown', e => { if (busy) return; dragging = true; sx = e.clientX; dx = 0; cards[front].classList.add('grab'); el.setPointerCapture(e.pointerId); });
  const up = () => { if (!dragging) return; dragging = false; const c = cards[front]; c.classList.remove('grab'); const d = dx; rest(c); if (Math.abs(d) > 70) user(d < 0 ? 1 : -1); else if (Math.abs(d) < 6) user(1); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);

  let seen = false;
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; if (seen) el.classList.add('in'); }, { threshold: .3 }).observe(el);
  setInterval(() => { if (auto && seen && !document.hidden && !reduce) go(1); }, 5200);
  layout();
}

function keys() {
  const canvas = document.getElementById('keyGl');
  if (!canvas) return;
  const st = stageFor(canvas, 30), { scene, camera } = st;
  scene.environmentIntensity = 1.1;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc8b8, .9));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.3); sun.position.set(3, 5, 7); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -5, near: 1, far: 30 }); sun.shadow.radius = 7; sun.shadow.bias = -0.001; scene.add(sun);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: .2 })); wall.position.z = -.55; wall.receiveShadow = true; scene.add(wall);

  const steel = std(0xc9cfd3, .22, 1), brass = std(0xd9a514, .28, .9), yl = std(Y, .4, .1), ink = std(INK, .5);
  const rig = new THREE.Group(); rig.position.y = 2.7; scene.add(rig);
  const pin = put(scene, new THREE.CylinderGeometry(.09, .09, .5, 20), ink, 0, 2.7, -.3); pin.rotation.x = Math.PI / 2;
  put(scene, new THREE.CylinderGeometry(.16, .16, .05, 24), ink, 0, 2.7, -.04).rotation.x = Math.PI / 2;
  const ring = put(rig, new THREE.TorusGeometry(.5, .04, 12, 56), steel, 0, -.5, 0);
  const hang = (rotY, z) => { const g = new THREE.Group(); g.position.set(0, -1, z); g.rotation.y = rotY; rig.add(g); return g; };

  // key
  const key = hang(.25, .07);
  { const bow = new THREE.Shape(); bow.absarc(0, -.5, .56, 0, Math.PI * 2, false); const hole = new THREE.Path(); hole.absarc(0, -.28, .17, 0, Math.PI * 2, true); bow.holes.push(hole);
    put(key, new THREE.ExtrudeGeometry(bow, { depth: .12, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 3, curveSegments: 36 }).translate(0, 0, -.06), brass);
    const bl = new THREE.Shape(); [[-.13, -1], [.13, -1], [.13, -1.5], [.26, -1.6], [.13, -1.72], [.13, -1.95], [.3, -2.08], [.13, -2.2], [.13, -2.45], [.24, -2.55], [.13, -2.68], [.13, -2.95], [0, -3.1], [-.13, -2.95]].forEach(([x, y], i) => bl[i ? 'lineTo' : 'moveTo'](x, y)); bl.closePath();
    put(key, new THREE.ExtrudeGeometry(bl, { depth: .08, bevelEnabled: true, bevelSize: .012, bevelThickness: .012, bevelSegments: 1 }).translate(0, 0, -.04), brass);
    box(key, std(0xb8870c, .35, .9), .05, 1.7, .1, 0, -2, 0); }
  // house tag
  const tag = hang(-.3, -.07);
  { const h = new THREE.Shape(); [[-.62, -1.75], [.62, -1.75], [.62, -.85], [0, -.2], [-.62, -.85]].forEach(([x, y], i) => h[i ? 'lineTo' : 'moveTo'](x, y)); h.closePath();
    const hole = new THREE.Path(); hole.absarc(0, -.52, .12, 0, Math.PI * 2, true); h.holes.push(hole);
    put(tag, new THREE.ExtrudeGeometry(h, { depth: .12, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 3 }).translate(0, 0, -.06), yl);
    box(tag, ink, .3, .52, .2, 0, -1.48, 0); box(tag, ink, .26, .22, .2, -.3, -1.05, 0); box(tag, ink, .26, .22, .2, .3, -1.05, 0); }

  // three pendulums (ring, key, tag) with different lengths so they clatter out of phase
  const P = [{ o: rig, a: 0, v: 0, k: 9, c: 1.1 }, { o: key, a: .16, v: 0, k: 15, c: 1.3 }, { o: tag, a: -.22, v: 0, k: 21, c: 1.0 }];
  const rest = [0, .16, -.22];
  kick = d => { if (reduce) return; P[0].v += d * 2.6; P[1].v += d * 4.2; P[2].v -= d * 3.6; };
  let lx = null, mx = 0, tx = 0;
  const zone = canvas.parentElement;
  zone.addEventListener('pointermove', e => { const r = zone.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - .5; if (lx !== null && !reduce) { const d = clamp((e.clientX - lx) * .012, -.5, .5); P[0].v += d; P[1].v += d * 1.6; P[2].v -= d * 1.3; } lx = e.clientX; });
  zone.addEventListener('pointerleave', () => { lx = null; tx = 0; });
  zone.addEventListener('click', e => { if (!e.target.closest('button')) kick(Math.random() > .5 ? 1.4 : -1.4); });

  st.run((dt, t) => {
    P.forEach((p, i) => { const drive = reduce ? 0 : Math.sin(t * (.7 + i * .23) + i) * .25;
      p.v += (-p.k * Math.sin(p.a - rest[i]) - p.c * p.v + drive) * dt; p.a += p.v * dt; p.o.rotation.z = p.a; });
    ring.rotation.y = Math.sin(t * .5) * .3;
    mx += (tx - mx) * .06;
    const R = 9.6 * Math.max(1, .78 / st.aspect) * (st.aspect > 1.1 ? 1.3 : 1);
    camera.position.set(mx * 3.2, .9, R); camera.lookAt(0, .55, 0);
  });
}
/* =====================================================================
   QUOTE — a glass tower rises one storey for every detail you complete
   ===================================================================== */
function tower() {
  const canvas = document.getElementById('towerGl'), form = document.getElementById('qform');
  if (!canvas || !form) return;
  const st = stageFor(canvas, 27), { scene, camera, renderer } = st;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  scene.environmentIntensity = .8;
  scene.add(new THREE.HemisphereLight(0x9fb8d0, 0x0a0d10, .55));
  const key = new THREE.DirectionalLight(0xffe4bd, 2.8); key.position.set(8, 16, 10); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -12, right: 12, top: 24, bottom: -6, near: 1, far: 70 }); key.shadow.radius = 6; key.shadow.bias = -0.0005; key.shadow.normalBias = .03; scene.add(key);
  const rim = new THREE.DirectionalLight(0x5aa9ff, 2.4); rim.position.set(-10, 7, -9); scene.add(rim);
  const glow = new THREE.PointLight(0xffc60a, 0, 28, 1.6); scene.add(glow);

  const W = 3.6, D = 3.0, H = 3.2, NL = 5, TW = .1;
  const concrete = std(0xcdc8bc, .85), core = std(0x39434b, .8), dark = std(0x10161b, .4, .8), spandrel = std(0x1c2833, .3, .7), steel = std(0xc3c9ce, .3, 1);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

  // ground: shadow catcher, plinth and a site-plan target
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.ShadowMaterial({ opacity: .5 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -.35; floor.receiveShadow = true; scene.add(floor);
  const ring = (r, o) => { const m = new THREE.Mesh(new THREE.RingGeometry(r, r + .035, 160), new THREE.MeshBasicMaterial({ color: Y, transparent: true, opacity: o, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = -.34; scene.add(m); return m; };
  ring(5.8, .38); ring(8.2, .2); ring(11, .1);
  const pulse = ring(5.8, 0);
  box(scene, std(0x182026, .45, .35), 5.8, .35, 5.1, 0, -.175, 0);
  box(scene, std(Y, .4, 0, { emissive: Y, emissiveIntensity: .7 }), 5.82, .025, 5.12, 0, -.02, 0).castShadow = false;

  // the storeys
  const L = [];
  for (let i = 0; i < NL; i++) {
    const g = new THREE.Group(); g.position.y = i * H; g.rotation.y = i * TW; scene.add(g);
    const FH = H - .22;
    const ghostMat = new THREE.LineBasicMaterial({ color: Y, transparent: true, opacity: .42, depthWrite: false });
    const ghost = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W + .56, H, D + .56)), ghostMat); ghost.position.y = H / 2; g.add(ghost);
    const slab = box(g, concrete, W + .56, .22, D + .56, 0, .11, 0);
    const fr = new THREE.Group(); fr.position.y = .22; g.add(fr);
    box(fr, spandrel, W + .03, .46, D + .03, 0, .23, 0);
    box(fr, core, 1.1, FH, 1.1, .55, FH / 2, -.35);
    box(fr, dark, W + .05, .07, D + .05, 0, FH - .035, 0);
    for (let k = 0; k <= 4; k++) [-1, 1].forEach(s => box(fr, dark, .06, FH, .06, -W / 2 + k * W / 4, FH / 2, s * (D / 2 + .02)));
    for (let k = 1; k < 3; k++) [-1, 1].forEach(s => box(fr, dark, .06, FH, .06, s * (W / 2 + .02), FH / 2, -D / 2 + k * D / 3));
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x6fb0e6, roughness: .05, metalness: .25, transparent: true, opacity: 0, envMapIntensity: 2.4, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
    const glass = put(fr, new THREE.BoxGeometry(W, FH - .46, D), glassMat, 0, .46 + (FH - .46) / 2, 0); glass.castShadow = false; glass.receiveShadow = false;
    const lightMat = new THREE.MeshStandardMaterial({ color: 0x2a2f33, emissive: 0xffd9a0, emissiveIntensity: 0, roughness: .6 });
    box(fr, lightMat, W - .5, .04, D - .5, 0, FH - .14, 0).castShadow = false;
    L.push({ g, fr, slab, glass, glassMat, ghostMat, lightMat, p: 0, lit: 0 });
  }

  // crown: roof, edge light, plant room and a beacon mast
  const crown = new THREE.Group(); crown.position.y = NL * H; crown.rotation.y = (NL - 1) * TW; scene.add(crown);
  const roof = box(crown, concrete, W + .56, .26, D + .56, 0, .13, 0);
  const edgeMat = std(Y, .4, 0, { emissive: Y, emissiveIntensity: 1.3 });
  const edge = new THREE.Group(); edge.position.y = .26; crown.add(edge);
  [-1, 1].forEach(s => { box(edge, edgeMat, W + .56, .08, .07, 0, .04, s * (D / 2 + .25)); box(edge, edgeMat, .07, .08, D + .56, s * (W / 2 + .25), .04, 0); });
  box(crown, dark, 1.5, .55, 1.1, -.9, .55, .5);
  const mast = new THREE.Group(); mast.position.set(.9, .26, -.5); crown.add(mast);
  put(mast, new THREE.CylinderGeometry(.04, .055, 3.2, 12), steel, 0, 1.6, 0);
  const beaconMat = std(Y, .3, 0, { emissive: Y, emissiveIntensity: 2 });
  const beacon = put(mast, new THREE.SphereGeometry(.12, 16, 12), beaconMat, 0, 3.3, 0); beacon.castShadow = false;
  let crownK = 0;

  // drifting dust in the light
  const NP = 90, pp = new Float32Array(NP * 3), pv = new Float32Array(NP);
  for (let i = 0; i < NP; i++) { const a = Math.random() * Math.PI * 2, r = 3.2 + Math.random() * 8; pp.set([Math.cos(a) * r, Math.random() * 24 - 1, Math.sin(a) * r], i * 3); pv[i] = .12 + Math.random() * .3; }
  const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  scene.add(new THREE.Points(pgeo, new THREE.PointsMaterial({ color: Y, size: .1, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending })));

  // form state -> how many storeys stand
  const bar = [...document.querySelectorAll('#towerBar i')], txt = document.getElementById('towerTxt'), cnt = document.getElementById('towerCount');
  const MSG = ['Start your brief and watch it rise', 'Foundations laid', 'Frame going up', 'Facade taking shape', 'Almost topped out', 'Topped out. Ready to send'];
  let n = 0, state = 'idle', sT = 0, flash = 0;
  const render = () => {
    const k = state === 'sent' ? NL : n;
    bar.forEach((b, i) => b.classList.toggle('on', i < k));
    cnt.textContent = k;
    txt.textContent = state === 'sent' ? 'Request received. Your project is on our desk.' : MSG[n];
    form.classList.toggle('ready', state === 'idle' && n === NL);
  };
  const read = () => {
    if (state === 'sent') return;
    const f = form.elements;
    n = [f.service.value !== '', f.first.value.trim() !== '', f.last.value.trim() !== '', f.email.value.trim() !== '' && f.email.checkValidity(), f.phone.value.replace(/\D/g, '').length >= 7].filter(Boolean).length;
    render();
  };
  form.addEventListener('input', read); form.addEventListener('change', read);
  form.addEventListener('quote:sent', () => { state = 'sent'; sT = 0; flash = 1; render(); });
  form.addEventListener('quote:reset', () => { state = 'idle'; read(); });
  read();

  let mx = 0, tx = 0;
  const zone = canvas.parentElement;
  zone.addEventListener('pointermove', e => { const r = zone.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - .5; });
  zone.addEventListener('pointerleave', () => tx = 0);
  zone.addEventListener('click', () => { flash = 1; });

  st.run((dt, t) => {
    if (state === 'sent') sT += dt;
    const shown = state === 'sent' ? NL : n;
    L.forEach((lv, i) => {
      const target = i < shown ? 1 : 0, rate = reduce ? 99 : (target ? .85 : 1.7), was = lv.p;
      lv.p += clamp(target - lv.p, -rate * dt, rate * dt);
      if (was < .02 && lv.p >= .02) flash = 1;
      const p = lv.p, slabK = easeOut(smooth(0, .4, p)), frK = easeOut(smooth(.22, .72, p)), glK = smooth(.55, .95, p), lgK = smooth(.8, 1, p);
      lv.slab.visible = p > .001; lv.slab.position.y = .11 + (1 - slabK) * 1.8;
      lv.fr.visible = p > .23; lv.fr.scale.y = Math.max(.001, frK);
      lv.glass.visible = glK > .001; lv.glassMat.opacity = .3 * glK;
      lv.ghostMat.opacity = .42 * (1 - smooth(0, .5, p));
      lv.lit += (lgK * (shown === NL ? 3.4 : 1.6) - lv.lit) * Math.min(1, dt * 3);
      lv.lightMat.emissiveIntensity = lv.lit;
    });

    const crownTarget = shown === NL && L[NL - 1].p > .95 ? 1 : 0;
    crownK += clamp(crownTarget - crownK, -dt * 1.6, dt * 1.2);
    const ck = easeOut(crownK);
    crown.visible = crownK > .001; roof.position.y = .13 + (1 - ck) * 1.6; edge.scale.set(1, Math.max(.001, ck), 1);
    mast.scale.y = Math.max(.001, easeOut(smooth(.35, 1, crownK))); beaconMat.emissiveIntensity = crownK > .8 ? (Math.sin(t * 4) > .3 ? 2.6 : .3) : 0;

    flash = Math.max(0, flash - dt * 1.3);
    glow.position.set(4.5, Math.max(1.2, (shown - .4) * H), 6);
    glow.intensity = flash * 110 + (state === 'sent' ? 18 : 0);
    const pk = state === 'sent' ? (sT % 2.4) / 2.4 : 1;
    pulse.scale.setScalar(1 + pk * 1.9); pulse.material.opacity = state === 'sent' && sT < 7.2 ? (1 - pk) * .75 : 0;

    const pa = pgeo.attributes.position;
    for (let i = 0; i < NP; i++) { let y = pa.getY(i) + pv[i] * dt; if (y > 23) y = -1; pa.setY(i, y); }
    pa.needsUpdate = true;

    mx += (tx - mx) * .05;
    const orbit = (reduce ? 0 : Math.sin(t * .17) * .28) + (state === 'sent' ? easeOut(clamp(sT / 3.5)) * 1.1 : 0);
    const az = .62 + orbit + mx * .55;
    const R = 43 * Math.max(1, .95 / st.aspect) * (1 + (state === 'sent' ? .07 * easeOut(clamp(sT / 3)) : 0));
    camera.position.set(Math.sin(az) * R, 5, Math.cos(az) * R); camera.lookAt(0, 8.6, 0);
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (cw && ch) { if (st.aspect > 1.25) camera.setViewOffset(cw, ch, -cw * .2, ch * .03, cw, ch); else camera.setViewOffset(cw, ch, 0, ch * .085, cw, ch); }
  });
}

deck(); keys(); tower();
