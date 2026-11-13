/* Brixon — testimonials (card deck + swinging handover keys) and quote form (truck that loads as you type) */
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
   QUOTE — every completed field loads the truck; a sent request drives it off
   ===================================================================== */
function truck() {
  const canvas = document.getElementById('truckGl'), form = document.getElementById('qform');
  if (!canvas || !form) return;
  const st = stageFor(canvas, 26), { scene, camera } = st;
  scene.environmentIntensity = .7;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9a400, 1.0));
  const sun = new THREE.DirectionalLight(0xffffff, 2.3); sun.position.set(5, 11, 8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 7, bottom: -5, near: 1, far: 40 }); sun.shadow.radius = 5; sun.shadow.bias = -0.0006; scene.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 30), new THREE.ShadowMaterial({ opacity: .26 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  const M = { ink: std(INK, .55), paper: std(PAPER, .45), blue: std(B, .45), timber: std(0xb98a5a, .75), steel: std(0xbfc5ca, .35, .9), block: std(0xcfc9bc, 1), glass: std(0x10161b, .1, .6), red: std(0xd8321f, .5), bag: std(0xe2d8bf, .95) };
  const rig = new THREE.Group(); scene.add(rig);           // whole truck: moves along x
  const body = new THREE.Group(); rig.add(body);           // sprung mass: dips under load
  // chassis + bed
  box(body, M.ink, 6.2, .22, 1.5, -.1, .82, 0);
  box(body, M.timber, 4.1, .12, 2.1, -1.05, 1.0, 0);
  [-1.02, 1.02].forEach(z => box(body, M.ink, 4.1, .34, .07, -1.05, 1.22, z)); box(body, M.ink, .07, .34, 2.1, -3.08, 1.22, 0);
  box(body, M.ink, .1, 1.15, 2.1, .98, 1.58, 0); // headboard
  for (let i = 0; i < 4; i++) box(body, M.steel, .04, .9, .04, .92, 1.6, -.78 + i * .52);
  // cab
  box(body, M.paper, 1.7, 1.55, 2.0, 1.95, 1.7, 0); box(body, M.paper, .55, .7, 2.0, 3.03, 1.27, 0);
  box(body, M.glass, .06, .72, 1.7, 2.81, 2.02, 0); [-1.005, 1.005].forEach(z => box(body, M.glass, .95, .62, .03, 2.15, 2.06, z));
  box(body, M.blue, 1.72, .16, 2.02, 1.95, 1.28, 0);
  box(body, M.ink, .14, .3, 2.1, 3.33, .92, 0); [-.72, .72].forEach(z => box(body, M.paper, .05, .16, .3, 3.31, 1.26, z));
  [-.7, .7].forEach(z => box(body, M.red, .05, .14, .26, -3.2, .86, z));
  box(body, M.ink, .5, .5, .5, .35, .62, .82); // tank
  // wheels
  const wheels = [];
  [[2.25, 1], [2.25, -1], [-1.5, 1], [-1.5, -1], [-2.45, 1], [-2.45, -1]].forEach(([x, s]) => { const w = new THREE.Group(); w.position.set(x, .5, s * .95); rig.add(w);
    put(w, new THREE.CylinderGeometry(.5, .5, .34, 28), M.ink).rotation.x = Math.PI / 2; put(w, new THREE.CylinderGeometry(.24, .24, .36, 18), M.steel).rotation.x = Math.PI / 2;
    box(w, M.ink, .1, .44, .37, 0, 0, 0); wheels.push(w); });

  // cargo: slot 0 depends on the chosen service, the rest are fixed
  const bedY = 1.06, slots = [[-2.45, 0], [-1.5, .5], [-1.5, -.5], [-.45, .5], [-.45, -.5]];
  const cargo = slots.map(([x, z]) => { const g = new THREE.Group(); g.position.set(x, bedY, z); g.visible = false; body.add(g); return { g, on: false, k: 0, v: 0 }; });
  const svc = {};
  const variant = (name, build) => { const g = new THREE.Group(); build(g); g.visible = false; cargo[0].g.add(g); svc[name] = g; };
  variant('Construction Materials', g => { for (let l = 0; l < 3; l++) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) box(g, l === 2 && i ? std(Y, .5) : M.block, .5, .26, .82, -.26 + i * .52, .13 + l * .27, -.42 + j * .86); });
  variant('Hardware', g => { box(g, M.blue, 1.0, .7, 1.7, 0, .35, 0); box(g, M.ink, 1.04, .1, 1.74, 0, .52, 0); [-.5, .5].forEach(z => box(g, M.steel, .3, .08, .08, 0, .78, z)); box(g, M.steel, .06, .06, 1.1, 0, .82, 0); });
  variant('Joinery & Interiors', g => { for (let l = 0; l < 5; l++) box(g, l % 2 ? std(0xa97a4c, .7) : M.timber, 1.0, .13, 1.8, (l % 2) * .04, .07 + l * .14, 0); [-.6, .6].forEach(z => box(g, M.ink, 1.06, .74, .05, 0, .37, z)); });
  variant('Sanitaryware', g => { box(g, M.timber, 1.0, .1, 1.8, 0, .05, 0); [-.5, .5].forEach(z => { put(g, new THREE.CylinderGeometry(.34, .26, .5, 28), M.paper, 0, .35, z); put(g, new THREE.TorusGeometry(.33, .05, 10, 28), M.paper, 0, .6, z).rotation.x = Math.PI / 2; }); });
  variant('Wood materials', g => { [[-.24, .22, 0], [.24, .22, 0], [0, .62, 0]].forEach(([x, y]) => { const l = put(g, new THREE.CylinderGeometry(.22, .22, 1.8, 18), std(0x8a6a44, .9), x, y, 0); l.rotation.x = Math.PI / 2; [-.905, .905].forEach(z => put(g, new THREE.CylinderGeometry(.2, .2, .01, 18), std(0xd9b98b, .8), x, y, z).rotation.x = Math.PI / 2); }); });
  { const g = cargo[1].g; box(g, M.timber, .8, .72, .8, 0, .36, 0); [[.41, 0], [-.41, 0]].forEach(([x]) => box(g, M.ink, .02, .74, .82, x, .37, 0)); box(g, M.ink, .82, .06, .82, 0, .72, 0); }
  { const g = cargo[2].g; for (let l = 0; l < 4; l++) { const b = box(g, M.bag, .82, .19, .6, 0, .1 + l * .19, 0); b.rotation.y = l % 2 ? .12 : -.1; box(g, l % 2 ? M.blue : std(Y, .6), .2, .195, .61, 0, .1 + l * .19, 0).rotation.y = b.rotation.y; } }
  { const g = cargo[3].g; [-.2, .2].forEach((x, i) => { put(g, new THREE.CylinderGeometry(.19, .19, .78, 24), i ? M.blue : M.ink, x, .39, i ? .1 : -.1); put(g, new THREE.TorusGeometry(.195, .02, 6, 24), M.steel, x, .55, i ? .1 : -.1).rotation.x = Math.PI / 2; }); }
  { const g = cargo[4].g; box(g, M.ink, .8, .6, .8, 0, .3, 0); box(g, M.paper, .82, .12, .82, 0, .3, 0); for (let i = 0; i < 4; i++) { const p = put(g, new THREE.CylinderGeometry(.045, .045, 1.3, 12), M.steel, -.24 + i * .16, .66, 0); p.rotation.x = Math.PI / 2; } }

  // form → load
  const txt = document.getElementById('loadTxt'), bar = [...document.querySelectorAll('#loadBar i')];
  let dip = 0, dipV = 0, state = 'idle', sT = 0, x = 0;
  const read = () => {
    const f = form.elements, done = [f.service.value !== '', f.first.value.trim() !== '', f.last.value.trim() !== '', f.email.value.trim() !== '' && f.email.checkValidity(), f.phone.value.trim() !== ''];
    Object.entries(svc).forEach(([name, g]) => g.visible = name === f.service.value);
    done.forEach((d, i) => { const c = cargo[i]; if (d && !c.on) { c.k = 0; c.v = 0; } c.on = d; bar[i].classList.toggle('on', d); });
    const n = done.filter(Boolean).length;
    txt.textContent = state === 'idle' ? (n === 5 ? 'Fully loaded — ready to send' : `Loaded ${n} / 5`) : txt.textContent;
  };
  form.addEventListener('input', read); form.addEventListener('change', read);
  let prevSvc = '';
  form.elements.service.addEventListener('change', e => { if (e.target.value && prevSvc && cargo[0].on) { cargo[0].k = 0; } prevSvc = e.target.value; });
  form.addEventListener('submit', () => { if (document.getElementById('formNote').classList.contains('ok') && state === 'idle') { state = 'leave'; sT = 0; txt.textContent = 'On its way'; bar.forEach(b => b.classList.add('on')); } });
  read();

  let mx = 0, tx = 0;
  const zone = canvas.parentElement;
  zone.addEventListener('pointermove', e => { const r = zone.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - .5; });
  zone.addEventListener('pointerleave', () => tx = 0);
  zone.addEventListener('click', () => { dipV -= 1.6; }); // honk-bounce

  st.run((dt, t) => {
    // cargo drops in with a small bounce and shoves the suspension
    cargo.forEach(c => {
      if (c.on) { const before = c.k; c.k = Math.min(1, c.k + dt * 2.4); if (before < .62 && c.k >= .62) dipV -= 1.5; } else c.k = Math.max(0, c.k - dt * 4);
      const k = c.k, fall = k < .62 ? Math.pow(k / .62, 2) : 1, b = k < .62 ? 0 : Math.sin((k - .62) / .38 * Math.PI) * .12;
      c.g.visible = k > .001; c.g.position.y = bedY + (c.on ? (1 - fall) * 3.4 + b : 0); c.g.scale.setScalar(c.on ? 1 : k);
      if (state !== 'idle') { c.g.position.y = bedY; c.g.scale.setScalar(1); c.g.visible = true; }
    });
    dipV += (-70 * dip - 9 * dipV) * dt; dip += dipV * dt;
    let vel = 0;
    if (state === 'leave') { sT += dt; const p = sT * sT * 9; vel = sT * 18; x = p; if (sT > 1.7) { state = 'return'; sT = 0; cargo.forEach(c => { c.on = false; c.k = 0; }); x = -24; } }
    else if (state === 'return') { sT += dt; const k = clamp(sT / 1.6), e = 1 - Math.pow(1 - k, 3); vel = (1 - k) * 22; x = -24 * (1 - e); cargo.forEach(c => c.g.visible = false);
      if (k >= 1) { state = 'idle'; x = 0; read(); } }
    rig.position.x = x;
    wheels.forEach(w => w.rotation.z -= vel * dt * 2);
    body.position.y = dip * .12 + (reduce ? 0 : Math.sin(t * 31) * .004);
    body.rotation.z = dip * .015 + (state === 'leave' ? Math.min(.03, sT * .05) : 0);
    mx += (tx - mx) * .06;
    const az = .62 + mx * .5, R = 11 * Math.max(1, 1.9 / st.aspect);
    camera.position.set(Math.sin(az) * R, 3.3, Math.cos(az) * R); camera.lookAt(-.1, 1.2, 0);
  });
}

deck(); keys(); truck();
