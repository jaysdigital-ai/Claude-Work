/* Brixon — WebGL scenes: scroll-built tower (hero) + materials viewer */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}
function envFor(renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  return tex;
}
function whenVisible(el, cb) {
  let on = false;
  new IntersectionObserver(([e]) => { const was = on; on = e.isIntersecting; if (on && !was) cb(); }, { rootMargin: '80px' }).observe(el);
  return () => on;
}

/* =====================================================================
   HERO — a tower that assembles as you scroll
   ===================================================================== */
function hero() {
  const canvas = document.getElementById('build');
  const section = document.getElementById('hero');
  if (!canvas) return;
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  scene.environment = envFor(renderer);
  scene.environmentIntensity = .3;
  const camera = new THREE.PerspectiveCamera(24, 1, 1, 600);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xbdb6a6, .75));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.1);
  sun.position.set(38, 60, 26);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 50, bottom: -30, near: 1, far: 200 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = .04; sun.shadow.radius = 5;
  scene.add(sun);

  const M = {
    concrete: new THREE.MeshStandardMaterial({ color: 0xd6d1c5, roughness: .92 }),
    slab: new THREE.MeshStandardMaterial({ color: 0xbfb9ab, roughness: .9 }),
    plinth: new THREE.MeshStandardMaterial({ color: 0xb9b3a5, roughness: 1 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xffc60a, roughness: .55 }),
    ink: new THREE.MeshStandardMaterial({ color: 0x161b20, roughness: .6 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x1b74bd, roughness: .12, metalness: .25, transparent: true, opacity: .78, envMapIntensity: 1.6 }),
    glassLite: new THREE.MeshPhysicalMaterial({ color: 0x7fb6dc, roughness: .12, metalness: .2, transparent: true, opacity: .7, envMapIntensity: 1.6 }),
  };
  const world = new THREE.Group(); scene.add(world);
  const mesh = (geo, mat, x = 0, y = 0, z = 0, parent = world) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  };

  // ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.ShadowMaterial({ opacity: .2 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const gridH = new THREE.GridHelper(200, 80, 0x0f1316, 0x0f1316);
  gridH.material.transparent = true; gridH.material.opacity = .07; gridH.position.y = .02; scene.add(gridH);

  // building
  const BX = 4, BZ = 3, BAY = 5, FH = 3.4, FLOORS = 7;
  const W = BX * BAY, D = BZ * BAY;
  const items = []; // {m, s, d, kind, y}
  const add = (m, s, d, kind) => { items.push({ m, s, d, kind, y: m.position.y }); return m; };

  mesh(new THREE.BoxGeometry(W + 12, .5, D + 12), M.plinth, 0, .25, 0);
  mesh(new THREE.BoxGeometry(W + 1.6, .5, D + 1.6), M.slab, 0, .75, 0);
  const BASE = 1;

  const colGeo = new THREE.BoxGeometry(.6, FH, .6).translate(0, FH / 2, 0);
  const slabGeo = new THREE.BoxGeometry(W + 1.4, .38, D + 1.4);
  const panX = new THREE.BoxGeometry(BAY - .75, FH - .95, .1);
  const panZ = new THREE.BoxGeometry(.1, FH - .95, BAY - .75);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const slabs = [];
  const SPAN = .112;

  for (let f = 0; f < FLOORS; f++) {
    const y0 = BASE + f * FH, t0 = f * SPAN;
    for (let ix = 0; ix <= BX; ix++) for (let iz = 0; iz <= BZ; iz++) {
      const c = mesh(colGeo, M.concrete, -W / 2 + ix * BAY, y0, -D / 2 + iz * BAY);
      add(c, t0 + (ix + iz) * .0035, .05, 'grow');
    }
    const s = mesh(slabGeo, M.slab, 0, y0 + FH - .19, 0);
    add(s, t0 + .062, .05, 'drop'); slabs.push(items[items.length - 1]);

    const pt = .2 + f * .1, py = y0 + (FH - .38) / 2;
    const pick = () => { const r = rnd(); return r < .1 ? M.yellow : r < .38 ? M.glassLite : M.glass; };
    for (let ix = 0; ix < BX; ix++) {
      const x = -W / 2 + (ix + .5) * BAY;
      add(mesh(panX, pick(), x, py, D / 2 + .32), pt + ix * .008, .05, 'panel');
      add(mesh(panX, pick(), x, py, -D / 2 - .32), pt + ix * .008, .05, 'panel');
    }
    for (let iz = 0; iz < BZ; iz++) {
      const z = -D / 2 + (iz + .5) * BAY;
      add(mesh(panZ, pick(), W / 2 + .32, py, z), pt + .03 + iz * .008, .05, 'panel');
      add(mesh(panZ, pick(), -W / 2 - .32, py, z), pt + .03 + iz * .008, .05, 'panel');
    }
  }
  // roof
  const top = BASE + FLOORS * FH;
  add(mesh(new THREE.BoxGeometry(W + 1.4, .9, .35), M.concrete, 0, top + .45, D / 2 + .52), .9, .04, 'pop');
  add(mesh(new THREE.BoxGeometry(W + 1.4, .9, .35), M.concrete, 0, top + .45, -D / 2 - .52), .9, .04, 'pop');
  add(mesh(new THREE.BoxGeometry(.35, .9, D + 1.4), M.concrete, W / 2 + .52, top + .45, 0), .91, .04, 'pop');
  add(mesh(new THREE.BoxGeometry(.35, .9, D + 1.4), M.concrete, -W / 2 - .52, top + .45, 0), .91, .04, 'pop');
  add(mesh(new THREE.BoxGeometry(6, 2.6, 5).translate(0, 1.3, 0), M.concrete, -4, top, -2), .93, .04, 'grow');
  add(mesh(new THREE.CylinderGeometry(1.5, 1.5, 2.4, 28).translate(0, 1.2, 0), M.yellow, 5, top, 2.5), .95, .04, 'grow');

  // site props: pallets of block + pipe rack
  const blockGeo = new THREE.BoxGeometry(1.5, .7, .8);
  [[-W / 2 - 3.2, D / 2 + 2.4, 0], [W / 2 + 2.6, D / 2 + 3.2, .5], [4, D / 2 + 4, -.3]].forEach(([x, z, rot], k) => {
    const g = new THREE.Group(); g.position.set(x, .5, z); g.rotation.y = rot; world.add(g);
    for (let l = 0; l < 3 - (k % 2); l++) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++)
      mesh(blockGeo, (k === 1 && l === 1) ? M.yellow : M.concrete, i * 1.6 - .8, .35 + l * .74, j * .9 - .45, g);
  });

  // tower crane
  const crane = new THREE.Group(); crane.position.set(-W / 2 - 5, .5, -D / 2 - 3); world.add(crane);
  const MAST = 33;
  mesh(new THREE.BoxGeometry(3.4, .6, 3.4), M.slab, 0, .3, 0, crane);
  // lattice mast: 4 legs + rungs
  const leg = new THREE.BoxGeometry(.22, MAST, .22).translate(0, MAST / 2, 0);
  [[-.6, -.6], [.6, -.6], [-.6, .6], [.6, .6]].forEach(([x, z]) => mesh(leg, M.yellow, x, .6, z, crane));
  const rungX = new THREE.BoxGeometry(1.4, .14, .14), rungZ = new THREE.BoxGeometry(.14, .14, 1.4);
  for (let y = 2; y < MAST; y += 1.6) {
    mesh(rungX, M.yellow, 0, y, .6, crane); mesh(rungX, M.yellow, 0, y, -.6, crane);
    mesh(rungZ, M.yellow, .6, y, 0, crane); mesh(rungZ, M.yellow, -.6, y, 0, crane);
  }
  const jib = new THREE.Group(); jib.position.y = MAST + .6; crane.add(jib);
  mesh(new THREE.BoxGeometry(2, 1.6, 2), M.ink, 0, .6, 0, jib);
  mesh(new THREE.BoxGeometry(1.5, 1.5, 1.7), M.yellow, 1.3, -.3, 1.2, jib); // cab
  const JL = 30;
  mesh(new THREE.BoxGeometry(JL, .26, .26), M.yellow, JL / 2, 1.2, .45, jib);
  mesh(new THREE.BoxGeometry(JL, .26, .26), M.yellow, JL / 2, 1.2, -.45, jib);
  mesh(new THREE.BoxGeometry(JL * .8, .22, .22), M.yellow, JL * .4, 2.4, 0, jib);
  for (let x = 1.5; x < JL; x += 1.8) {
    mesh(new THREE.BoxGeometry(.12, .12, .9), M.yellow, x, 1.2, 0, jib);
    if (x < JL * .78) { const b = mesh(new THREE.BoxGeometry(.12, 1.35, .12), M.yellow, x, 1.8, 0, jib); b.rotation.z = (Math.round(x / 1.8) % 2 ? 1 : -1) * .5; }
  }
  mesh(new THREE.BoxGeometry(10, .3, 1), M.yellow, -5, 1.2, 0, jib);
  mesh(new THREE.BoxGeometry(3, 1.8, 1.6), M.slab, -8.2, .2, 0, jib); // counterweight
  mesh(new THREE.BoxGeometry(.3, 5, .3), M.yellow, 0, 3.6, 0, jib);
  const trolley = new THREE.Group(); jib.add(trolley);
  mesh(new THREE.BoxGeometry(1.1, .3, 1.2), M.ink, 0, .95, 0, trolley);
  const cable = mesh(new THREE.BoxGeometry(.07, 1, .07).translate(0, -.5, 0), M.ink, 0, .9, 0, trolley);
  cable.castShadow = false;
  const load = new THREE.Group(); trolley.add(load);
  mesh(new THREE.BoxGeometry(.5, .5, .5), M.ink, 0, .25, 0, load);
  mesh(new THREE.BoxGeometry(4.6, .34, 3), M.slab, 0, -.6, 0, load);

  // HUD
  const lvlEl = document.getElementById('lvl');
  const phases = [...document.querySelectorAll('#phases li')];
  let lastLvl = -1, lastPhase = -1;

  // state
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth - .5; mouse.ty = e.clientY / innerHeight - .5; }, { passive: true });
  let w = 0, h = 0, narrow = false;
  const resize = () => {
    w = canvas.clientWidth; h = canvas.clientHeight; narrow = w < 820;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (narrow) camera.setViewOffset(w, h, 0, -h * .27, w, h);
    else camera.setViewOffset(w, h, -w * (w / h < 1.3 ? .2 : .15), -h * (w / h < 1.3 ? .12 : .02), w, h);
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize); resize();

  const t0 = performance.now();
  let pSmooth = 0;
  const apply = p => {
    let lvl = 0;
    for (const it of items) {
      const k = clamp((p - it.s) / it.d), e = easeOut(k), m = it.m;
      m.visible = k > 0;
      if (it.kind === 'grow') m.scale.y = Math.max(e, .001);
      else if (it.kind === 'drop') m.position.y = it.y + (1 - e) * 7;
      else if (it.kind === 'panel') { m.scale.y = Math.max(e, .001); m.position.y = it.y + (1 - e) * 1.2; }
      else m.scale.setScalar(Math.max(e, .001));
    }
    for (const s of slabs) if (p >= s.s + s.d) lvl++;
    if (lvl !== lastLvl) { lastLvl = lvl; lvlEl.textContent = String(lvl).padStart(2, '0'); }
    const ph = p < .1 ? 0 : p < .55 ? 1 : p < .92 ? 2 : 3;
    if (ph !== lastPhase) { lastPhase = ph; phases.forEach((li, i) => li.classList.toggle('on', i === ph)); }
    return lvl;
  };

  const visible = whenVisible(section, () => requestAnimationFrame(frame));
  function frame(now) {
    if (!visible()) return;
    const t = (now - t0) / 1000;
    const intro = reduce ? 1 : easeInOut(clamp((t - .25) / 2.8));
    const sc = clamp(scrollY / Math.max(1, section.offsetHeight - innerHeight));
    const p = reduce ? 1 : intro * .34 + sc * .68;
    pSmooth += (p - pSmooth) * .12;
    const lvl = apply(pSmooth);

    // crane: jib sweeps, trolley travels, load hangs just above the working level
    jib.rotation.y = -.55 + Math.sin(t * .22) * .28 - pSmooth * .5;
    trolley.position.x = 15 + Math.sin(t * .31) * 5;
    const deckY = BASE + Math.min(lvl + 1, FLOORS) * FH + 3.5;
    const drop = Math.max(2.5, (MAST + 1.1) - deckY + Math.sin(t * .5) * 1.4);
    cable.scale.y = drop; load.position.y = .9 - drop - .5;
    load.rotation.y = Math.sin(t * .4) * .3;
    load.visible = pSmooth < .9;

    mouse.x += (mouse.tx - mouse.x) * .05; mouse.y += (mouse.ty - mouse.y) * .05;
    const a = .92 - pSmooth * .78 + mouse.x * .22;
    const R = narrow ? 178 : 128 * Math.max(1, 1.6 / camera.aspect);
    camera.position.set(Math.sin(a) * R, 24 + pSmooth * 12 - mouse.y * 6, Math.cos(a) * R);
    camera.lookAt(-2, 12.5 + pSmooth * 3.5, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
}

/* =====================================================================
   MATERIALS — procedural models, one at a time on a turntable
   ===================================================================== */
function materials() {
  const canvas = document.getElementById('mat');
  if (!canvas) return;
  const box = canvas.parentElement;
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  scene.environment = envFor(renderer);
  scene.environmentIntensity = 1.15;
  const camera = new THREE.PerspectiveCamera(28, 1, .1, 100);
  camera.position.set(0, 2.6, 11.5); camera.lookAt(0, -.5, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a2026, .5));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.4);
  key.position.set(5, 9, 6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 });
  key.shadow.radius = 6; key.shadow.bias = -0.0008;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x4aa3e8, 1.6); rim.position.set(-6, 3, -5); scene.add(rim);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(4.2, 64), new THREE.ShadowMaterial({ opacity: .45 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.6; floor.receiveShadow = true; scene.add(floor);
  const ringMesh = new THREE.Mesh(new THREE.RingGeometry(3.55, 3.58, 96), new THREE.MeshBasicMaterial({ color: 0xffc60a, transparent: true, opacity: .55 }));
  ringMesh.rotation.x = -Math.PI / 2; ringMesh.position.y = -1.59; scene.add(ringMesh);

  const std = (color, roughness = .8, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const steel = std(0xb8bec4, .32, 1);
  const galv = std(0xc9cfd3, .42, .95);
  const cement = std(0x9f9b91, 1);
  const Y = 0xffc60a, B = 0x1b74bd;
  const add = (g, geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;

  const build = {
    chb() {
      const g = new THREE.Group();
      const shape = new THREE.Shape(); shape.moveTo(-2, -1); shape.lineTo(2, -1); shape.lineTo(2, 1); shape.lineTo(-2, 1); shape.closePath();
      [-.95, .95].forEach(cx => { const hole = new THREE.Path(); const hw = .68, hd = .62, r = .16;
        hole.moveTo(cx - hw + r, -hd); hole.lineTo(cx + hw - r, -hd); hole.quadraticCurveTo(cx + hw, -hd, cx + hw, -hd + r);
        hole.lineTo(cx + hw, hd - r); hole.quadraticCurveTo(cx + hw, hd, cx + hw - r, hd); hole.lineTo(cx - hw + r, hd);
        hole.quadraticCurveTo(cx - hw, hd, cx - hw, hd - r); hole.lineTo(cx - hw, -hd + r); hole.quadraticCurveTo(cx - hw, -hd, cx - hw + r, -hd);
        shape.holes.push(hole); });
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.9, bevelEnabled: true, bevelSize: .04, bevelThickness: .04, bevelSegments: 2 });
      geo.rotateX(-Math.PI / 2); geo.translate(0, -.95, 0);
      const a = add(g, geo, cement, 0, -.62, .25);
      const b = add(g, geo, std(0x8f8b82, 1), -.5, 1.38, -.2); b.rotation.y = .32;
      a.rotation.y = -.08; g.scale.setScalar(.6); g.rotation.x = .12; return g;
    },
    nails() {
      const g = new THREE.Group();
      const one = () => { const n = new THREE.Group();
        add(n, new THREE.CylinderGeometry(.075, .075, 2.6, 16), steel);
        add(n, new THREE.ConeGeometry(.075, .32, 16), steel, 0, -1.46, 0).rotation.x = Math.PI;
        add(n, new THREE.CylinderGeometry(.24, .24, .06, 24), steel, 0, 1.33, 0);
        for (let i = 0; i < 4; i++) add(n, new THREE.TorusGeometry(.078, .012, 6, 16), steel, 0, .9 - i * .09, 0).rotation.x = Math.PI / 2;
        return n; };
      const up = one(); up.position.set(-.2, -.1, 0); up.rotation.z = .12; g.add(up);
      for (let i = 0; i < 6; i++) { const n = one(); n.rotation.set(Math.PI / 2, 0, rnd() * Math.PI * 2); n.position.set(rnd() * 2.4 - 1.2, -1.5 + i * .01, rnd() * 2 - 1); g.add(n); }
      return g;
    },
    cement() {
      const g = new THREE.Group();
      const bag = (w = 3) => { const geo = new THREE.BoxGeometry(w, .8, 1.9, 16, 4, 12), p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) { const x = p.getX(i) / 1.5, z = p.getZ(i) / .95;
          const f = Math.pow(Math.max(0, 1 - x * x * x * x), .5) * Math.pow(Math.max(0, 1 - z * z * z * z), .5);
          p.setY(i, p.getY(i) * (.25 + .75 * f)); }
        geo.computeVertexNormals(); return geo; };
      const paper = std(0xd9cfb6, .95), paper2 = std(0xcfc4a8, .95);
      [[0, -1.2, 0, 0, paper], [.15, -.52, .1, .28, paper2], [-.1, .16, -.05, -.12, paper]].forEach(([x, y, z, r, m]) => {
        const b = add(g, bag(), m, x, y, z); b.rotation.y = r;
        // printed band: same pillow profile as the bag, a hair larger, so it hugs the surface
        const band = add(g, bag(.7), std(m === paper ? B : Y, .8), x, y, z); band.rotation.y = r; band.scale.set(1, 1.03, 1.012); band.castShadow = false;
      });
      return g;
    },
    aggregates() {
      const g = new THREE.Group();
      const cols = [0x9b978e, 0xb7b2a7, 0x86827a, 0xc6c1b6, 0x77736c];
      for (let i = 0; i < 70; i++) {
        const r = Math.sqrt(rnd()) * 2.1, a = rnd() * Math.PI * 2, hgt = (1 - r / 2.1) * 1.9;
        const m = add(g, new THREE.DodecahedronGeometry(.3 + rnd() * .22, 0), std(cols[i % 5], 1, 0, { flatShading: true }), Math.cos(a) * r, -1.45 + rnd() * hgt, Math.sin(a) * r);
        m.scale.set(1, .6 + rnd() * .5, .8 + rnd() * .4); m.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6);
      }
      return g;
    },
    paint() {
      const g = new THREE.Group();
      const can = (x, z, sc, col) => { const c = new THREE.Group(); c.position.set(x, -1.6 + 1.05 * sc, z); c.scale.setScalar(sc); g.add(c);
        add(c, new THREE.CylinderGeometry(1, 1, 2.1, 56), galv);
        add(c, new THREE.CylinderGeometry(1.012, 1.012, 1.5, 56, 1, true), std(col, .45), 0, -.05, 0);
        add(c, new THREE.TorusGeometry(1, .05, 10, 56), galv, 0, 1.05, 0).rotation.x = Math.PI / 2;
        add(c, new THREE.TorusGeometry(1, .05, 10, 56), galv, 0, -1.05, 0).rotation.x = Math.PI / 2;
        add(c, new THREE.CylinderGeometry(.9, .9, .05, 48), galv, 0, 1.03, 0);
        const hd = add(c, new THREE.TorusGeometry(1.06, .028, 8, 48, Math.PI), steel, 0, .7, 0); hd.rotation.set(Math.PI, 0, 0); hd.rotation.x = Math.PI + .5;
        return c; };
      can(-.55, 0, 1, B); can(1.25, .7, .62, Y);
      return g;
    },
    wire() {
      const g = new THREE.Group();
      for (let i = 0; i < 26; i++) {
        const t = add(g, new THREE.TorusGeometry(1.55 + (rnd() - .5) * .16, .045, 8, 72), galv, (rnd() - .5) * .06, -1.25 + i * .085, (rnd() - .5) * .06);
        t.rotation.set(Math.PI / 2 + (rnd() - .5) * .07, (rnd() - .5) * .07, 0);
      }
      [0, 2.1, 4.2].forEach(a => { const tie = add(g, new THREE.TorusGeometry(1.12, .03, 6, 24), std(Y, .5), Math.cos(a) * 1.55, -.2, Math.sin(a) * 1.55); tie.rotation.y = -a; tie.scale.set(.12, 1, 1); });
      g.rotation.z = .1; return g;
    },
    glass() {
      const g = new THREE.Group();
      const mat = new THREE.MeshPhysicalMaterial({ color: 0xa9dcee, roughness: .03, metalness: 0, transparent: true, opacity: .3, envMapIntensity: 1.1, side: THREE.DoubleSide });
      const edge = std(0x4fb4a8, .2, 0, { transparent: true, opacity: .9 });
      [-.5, 0, .5].forEach((z, i) => { const pane = add(g, new THREE.BoxGeometry(2.7, 3.3, .07), mat, i * .28 - .28, .05, z); pane.rotation.x = -.09; pane.castShadow = false;
        const fr = add(g, new THREE.BoxGeometry(2.72, .05, .08), edge, i * .28 - .28, 1.7, z - .15); fr.castShadow = false; });
      add(g, new THREE.BoxGeometry(3.6, .16, 1.7), std(0x8a6a44, .9), 0, -1.52, 0);
      return g;
    },
    tiles() {
      const g = new THREE.Group();
      const tile = new THREE.BoxGeometry(2.5, .13, 2.5);
      const cer = std(0xece7dc, .18), cerB = std(B, .18), cerY = std(Y, .25);
      for (let i = 0; i < 7; i++) { const t = add(g, tile, i === 6 ? cerB : cer, (rnd() - .5) * .08, -1.53 + i * .145, (rnd() - .5) * .08); t.rotation.y = (rnd() - .5) * .1; }
      const lean = add(g, tile, cerY, 1.75, -.55, .2); lean.rotation.set(0, .2, 1.18);
      g.position.x = -.4; return g;
    },
    pipes() {
      const g = new THREE.Group();
      const L = 4.2, R = .42;
      const tube = new THREE.CylinderGeometry(R, R, L, 40, 1, true);
      const inner = new THREE.CylinderGeometry(R - .06, R - .06, L, 40, 1, true);
      const cap = new THREE.RingGeometry(R - .06, R, 40);
      const innerMat = std(0x6f767c, .6, .8, { side: THREE.BackSide });
      [[-.86, 0], [0, 0], [.86, 0], [-.43, .745], [.43, .745], [0, 1.49]].forEach(([z, y]) => {
        const p = new THREE.Group(); p.position.set(0, -1.18 + y, z); p.rotation.z = Math.PI / 2; g.add(p);
        add(p, tube, galv); add(p, inner, innerMat);
        const c1 = add(p, cap, galv, 0, L / 2, 0); c1.rotation.x = -Math.PI / 2;
        const c2 = add(p, cap, galv, 0, -L / 2, 0); c2.rotation.x = Math.PI / 2;
      });
      [-1.2, 1.2].forEach(x => add(g, new THREE.BoxGeometry(.14, .06, 2.7), std(Y, .5), x, -1.57, 0));
      g.rotation.y = .5; return g;
    },
  };

  const names = { chb: 'Concrete Hollow Blocks', nails: 'Concrete Nails', cement: 'Cement', aggregates: 'Aggregates', paint: 'Paint', wire: 'GI Wires', glass: 'Glass', tiles: 'Tiles', pipes: 'GI Pipes' };
  const keys = Object.keys(names);
  const turntable = new THREE.Group(); scene.add(turntable);
  const models = {};
  keys.forEach(k => { const m = build[k](); m.visible = false; m.userData.base = m.scale.x; m.userData.y0 = m.position.y; m.userData.a = 0; turntable.add(m); models[k] = m; });

  let current = null, switchAt = 0, auto = true, spin = 0, spinVel = 0, tilt = 0;
  const btns = [...document.querySelectorAll('#matList button')];
  const nameEl = document.getElementById('matName'), noEl = document.getElementById('matNo');
  const show = k => {
    if (k === current) return;
    current = k; switchAt = performance.now();
    btns.forEach(b => b.classList.toggle('on', b.dataset.mat === k));
    nameEl.textContent = names[k]; noEl.textContent = 'M—' + String(keys.indexOf(k) + 1).padStart(2, '0');
  };
  btns.forEach(b => {
    const pick = () => { auto = false; show(b.dataset.mat); };
    b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') pick(); });
    b.addEventListener('focus', pick); b.addEventListener('click', pick);
  });
  show('chb');
  setInterval(() => { if (auto && visible() && !document.hidden) show(keys[(keys.indexOf(current) + 1) % keys.length]); }, 3600);

  // drag to spin
  let drag = false, lx = 0;
  box.addEventListener('pointerdown', e => { drag = true; lx = e.clientX; auto = false; });
  addEventListener('pointermove', e => { if (!drag) return; spinVel = (e.clientX - lx) * .012; lx = e.clientX; });
  addEventListener('pointerup', () => drag = false); addEventListener('pointercancel', () => drag = false);
  box.addEventListener('pointermove', e => { const r = box.getBoundingClientRect(); tilt = ((e.clientY - r.top) / r.height - .5) * .25; });
  box.addEventListener('pointerleave', () => tilt = 0);

  const resize = () => { const w = box.clientWidth, h = box.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(box); resize();

  const visible = whenVisible(box, () => requestAnimationFrame(frame));
  let last = performance.now();
  function frame(now) {
    if (!visible()) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const k = reduce ? 1 : clamp((now - switchAt) / 650);
    // every model eases toward its own target, so fast switching can never leave one behind;
    // the incoming model waits until the outgoing ones have cleared the turntable
    let busy = false;
    for (const key of keys) if (key !== current && models[key].userData.a > .02) busy = true;
    for (const key of keys) {
      const m = models[key], u = m.userData, on = key === current;
      if (reduce) u.a = on ? 1 : 0;
      else if (on) { if (!busy) u.a = Math.min(1, u.a + dt * 3.2); }
      else u.a = Math.max(0, u.a - dt * 6);
      const e = on ? easeOut(u.a) : u.a * u.a;
      m.visible = u.a > .001;
      m.scale.setScalar(u.base * Math.max(e, .001));
      m.position.y = u.y0 - (on ? 0 : (1 - e) * .6);
    }
    if (!drag) spinVel += ((reduce ? 0 : .35 * dt) - spinVel) * .04;
    spin += spinVel + (1 - easeOut(k)) * .09;
    turntable.rotation.y = spin;
    turntable.rotation.x += (tilt - turntable.rotation.x) * .06;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
}

hero();
materials();
