/* Brixon — about figure: a house mid-renovation (repainting, re-roofing, glazing), looping */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const holder = document.getElementById('aboutArt');
if (holder) init();

function init() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const out = t => 1 - Math.pow(1 - t, 3);

  holder.innerHTML = '';
  const canvas = document.createElement('canvas'); holder.append(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
  scene.environmentIntensity = .5;
  const camera = new THREE.PerspectiveCamera(30, .8, 1, 200);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a2026, .75));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.5); sun.position.set(9, 14, 10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 50 }); sun.shadow.radius = 5; sun.shadow.bias = -0.0006; sun.shadow.normalBias = .03; scene.add(sun);
  const rim = new THREE.DirectionalLight(0x4aa3e8, 1.3); rim.position.set(-10, 5, -8); scene.add(rim);

  const Y = 0xffc60a, B = 0x1b74bd, INK = 0x1a2026;
  const std = (color, roughness = .8, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const M = { old: std(0x9c958a, 1), fresh: std(0xf3f0e8, .7), ink: std(INK, .6), timber: std(0xb98a5a, .7), tile: std(0x2b3640, .5, .1), yellow: std(Y, .5), steel: std(0xbfc5ca, .35, .9), blue: std(B, .5), block: std(0xcfc9bc, 1) };
  const world = new THREE.Group(); scene.add(world);
  const put = (g, geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const box = (g, m, w, h, d, x, y, z) => put(g, new THREE.BoxGeometry(w, h, d), m, x, y, z);
  const tube = (g, m, r, a, b) => { // cylinder between two points
    const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), o = put(g, new THREE.CylinderGeometry(r, r, A.distanceTo(Bv), 8), m);
    o.position.copy(A).add(Bv).multiplyScalar(.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), Bv.clone().sub(A).normalize()); return o; };

  /* ground */
  const pad = put(world, new THREE.CylinderGeometry(8.2, 8.2, .12, 72), std(0x1d242b, 1), 0, -.06, 0); pad.castShadow = false;
  const ring = put(world, new THREE.TorusGeometry(8.2, .025, 6, 120), new THREE.MeshBasicMaterial({ color: Y }), 0, .01, 0); ring.rotation.x = Math.PI / 2; ring.castShadow = false;

  /* house shell */
  const W = 6, D = 4.4, H = 3.2, RISE = 1.8, hd = D / 2;
  box(world, M.old, W, H, D, 0, H / 2, 0);
  box(world, M.block, W + .5, .22, D + .5, 0, .11, 0);
  { const s = new THREE.Shape(); s.moveTo(-hd, 0); s.lineTo(hd, 0); s.lineTo(0, RISE); s.closePath();
    [-1, 1].forEach(sd => { const geo = new THREE.ExtrudeGeometry(s, { depth: .14, bevelEnabled: false }); geo.translate(0, 0, -.07); geo.rotateY(Math.PI / 2); put(world, geo, sd > 0 ? M.fresh : M.old, sd * (W / 2 - .07), H, 0); }); }
  // finished faces: right side wall and the lower band of the front
  box(world, M.fresh, .03, H - .22, D, W / 2 + .012, H / 2 + .11, 0);
  box(world, M.fresh, W, 1.5, .03, 0, .75 + .11, hd + .012);
  // the band being painted: grows left → right
  const paint = put(world, new THREE.BoxGeometry(1, H - 1.61, .03).translate(.5, 0, 0), M.fresh, -W / 2, 1.61 + (H - 1.61) / 2, hd + .012);
  // door + porch
  box(world, M.ink, 1.12, 2.22, .06, 1.5, 1.22, hd + .03); box(world, M.timber, .96, 2.08, .08, 1.5, 1.16, hd + .05); box(world, M.yellow, .05, .26, .08, 1.14, 1.2, hd + .1);
  box(world, M.block, 1.7, .16, .8, 1.5, .08, hd + .55);
  // side window: opening, frame, and a pane that slides in
  box(world, M.ink, .05, 1.3, 1.8, W / 2 + .03, 1.9, 0);
  [[1.3, .08, 0, .69], [1.3, .08, 0, -.69]].forEach(([, , , dy]) => box(world, M.fresh, .1, .09, 1.96, W / 2 + .06, 1.9 + dy, 0));
  [-.94, .94].forEach(z => box(world, M.fresh, .1, 1.47, .09, W / 2 + .06, 1.9, z));
  const glass = box(world, new THREE.MeshPhysicalMaterial({ color: 0x8fd0f0, roughness: .05, metalness: .2, transparent: true, opacity: .55, envMapIntensity: 2 }), .05, 1.28, 1.78, W / 2 + .08, 1.9, 0);
  box(glass, M.ink, .07, 1.28, .05, 0, 0, 0);

  /* roof */
  const TH = Math.atan(RISE / hd), SL = Math.hypot(hd, RISE) + .5, RW = W + .8;
  const front = new THREE.Group(); front.position.set(0, H + RISE + .04, 0); front.rotation.x = TH; world.add(front);
  const back = new THREE.Group(); back.position.copy(front.position); back.rotation.x = -TH; world.add(back);
  box(front, M.timber, RW, .08, SL, 0, 0, SL / 2); box(back, M.timber, RW, .08, SL, 0, 0, -SL / 2);
  box(back, M.tile, RW + .04, .08, SL + .02, 0, .08, -SL / 2);
  for (let i = 0; i < 9; i++) box(front, M.ink, .05, .04, SL - .1, -RW / 2 + .4 + i * (RW - .8) / 8, .06, SL / 2); // battens
  const tiles = [], NR = 6, NC = 10;
  for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) {
    const cc = r % 2 ? NC - 1 - c : c;
    const t = box(front, (r * 3 + cc) % 13 === 0 ? M.blue : M.tile, RW / NC - .035, .075, SL / NR - .03, -RW / 2 + (cc + .5) * RW / NC, .1, SL - (r + .5) * SL / NR);
    t.rotation.x = -.06; tiles.push(t);
  }
  const ridge = box(world, M.ink, RW + .06, .12, .36, 0, H + RISE + .2, 0);

  /* scaffold along the front */
  const xs = [-3.35, -1.12, 1.12, 3.35], z0 = hd + .4, z1 = hd + 1.25, L1 = 1.55, L2 = 3.05, TOP = 4.1;
  const sc = new THREE.Group(); world.add(sc);
  xs.forEach(x => [z0, z1].forEach(z => { tube(sc, M.steel, .04, [x, 0, z], [x, TOP, z]); box(sc, M.ink, .2, .04, .2, x, .02, z); }));
  [L1, L2, TOP - .1].forEach(y => { [z0, z1].forEach(z => tube(sc, M.steel, .032, [xs[0], y, z], [xs[3], y, z])); xs.forEach(x => tube(sc, M.steel, .032, [x, y, z0], [x, y, z1])); });
  [L1, L2].forEach(y => box(sc, M.timber, xs[3] - xs[0] + .1, .06, z1 - z0 - .06, 0, y + .06, (z0 + z1) / 2));
  for (let i = 0; i < 3; i++) { tube(sc, M.yellow, .026, [xs[i], .1, z1], [xs[i + 1], L1, z1]); tube(sc, M.yellow, .026, [xs[i + 1], L1, z1], [xs[i], L2, z1]); }
  [L1 + 1, L2 + .95].forEach(y => tube(sc, M.yellow, .026, [xs[0], y, z1], [xs[3], y, z1])); // guard rails

  /* painter on the first lift */
  const painter = new THREE.Group(); painter.position.set(0, L1 + .09, (z0 + z1) / 2 + .1); world.add(painter);
  box(painter, M.ink, .3, .62, .2, 0, .31, 0); box(painter, M.yellow, .4, .54, .26, 0, .89, 0); box(painter, M.ink, .41, .07, .27, 0, .82, 0);
  put(painter, new THREE.SphereGeometry(.15, 18, 14), std(0xd9ae8a, .8), 0, 1.31, 0);
  const hat = put(painter, new THREE.SphereGeometry(.175, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.fresh, 0, 1.34, 0); hat.scale.y = .8;
  put(painter, new THREE.CylinderGeometry(.21, .21, .025, 20), M.fresh, 0, 1.345, -.04);
  const arm = new THREE.Group(); arm.position.set(.16, 1.06, -.1); painter.add(arm);
  box(arm, M.yellow, .11, .11, .46, 0, 0, -.2);
  const pole = put(arm, new THREE.CylinderGeometry(.018, .018, 1, 6).translate(0, .5, 0), M.steel, 0, 0, -.42);
  const roller = put(arm, new THREE.CylinderGeometry(.075, .075, .34, 16), M.fresh, 0, 1, -.42); roller.rotation.z = Math.PI / 2;

  /* hoist lifting tiles to the roof */
  box(sc, M.yellow, 1.5, .1, .1, xs[3] + .55, TOP + .05, z1);
  const HX = xs[3] + 1.05, rope = put(world, new THREE.CylinderGeometry(.014, .014, 1, 6).translate(0, -.5, 0), M.ink, HX, TOP, z1); rope.castShadow = false;
  const load = new THREE.Group(); load.position.set(HX, 1, z1); world.add(load);
  box(load, M.timber, .9, .08, .7, 0, 0, 0); for (let i = 0; i < 4; i++) box(load, i === 3 ? M.blue : M.tile, .76, .09, .56, (i % 2) * .03, .09 + i * .095, 0);
  [-.4, .4].forEach(x => { tube(load, M.ink, .01, [x, .04, .3], [0, .95, 0]); tube(load, M.ink, .01, [x, .04, -.3], [0, .95, 0]); });

  /* site props */
  const mixer = new THREE.Group(); mixer.position.set(3.2, 0, 5.4); mixer.rotation.y = -.5; world.add(mixer);
  box(mixer, M.ink, .9, .08, .6, 0, .5, 0); [-.35, .35].forEach(x => { tube(mixer, M.ink, .03, [x, .5, .25], [x, 0, .35]); tube(mixer, M.ink, .03, [x, .5, -.25], [x, .14, -.3]); });
  [-.4, .4].forEach(x => { const w = put(mixer, new THREE.CylinderGeometry(.16, .16, .08, 18), M.ink, x, .16, -.3); w.rotation.z = Math.PI / 2; });
  const drumAxis = new THREE.Group(); drumAxis.position.set(0, .95, 0); drumAxis.rotation.x = -.85; mixer.add(drumAxis);
  const drum = new THREE.Group(); drumAxis.add(drum);
  put(drum, new THREE.CylinderGeometry(.3, .48, .5, 24), M.yellow, 0, .28, 0); put(drum, new THREE.CylinderGeometry(.48, .36, .42, 24), M.yellow, 0, -.18, 0);
  put(drum, new THREE.TorusGeometry(.485, .035, 8, 28), M.ink, 0, .03, 0).rotation.x = Math.PI / 2; box(drum, M.ink, .06, .5, .06, .44, .2, 0);
  for (let l = 0; l < 3; l++) for (let i = 0; i < 3 - l; i++) box(world, l === 1 && i === 0 ? M.yellow : M.block, .8, .36, .4, -4.3 + i * .84 + l * .42, .18 + l * .37, 5.2);
  [[-2.6, 5.6, B, 1], [-2.1, 5.9, Y, .75]].forEach(([x, z, c, k]) => { put(world, new THREE.CylinderGeometry(.2 * k, .2 * k, .44 * k, 20), std(c, .4), x, .22 * k, z); put(world, new THREE.CylinderGeometry(.21 * k, .21 * k, .03, 20), M.steel, x, .45 * k, z); });
  // ladder against the left gable
  { const ld = new THREE.Group(); ld.position.set(-W / 2 - 1.25, 0, -.4); ld.rotation.z = -.3; world.add(ld);
    [-.25, .25].forEach(z => tube(ld, M.timber, .035, [0, 0, z], [0, 4.5, z])); for (let i = 1; i < 12; i++) tube(ld, M.timber, .025, [0, i * .37, -.25], [0, i * .37, .25]); }

  /* interaction + loop */
  let mx = 0, my = 0, tx = 0, ty = 0, drag = false, lx = 0, dragAz = 0;
  const zone = holder.closest('.frame') || holder;
  zone.addEventListener('pointermove', e => { const r = zone.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - .5; ty = (e.clientY - r.top) / r.height - .5; });
  zone.addEventListener('pointerleave', () => { tx = ty = 0; });
  zone.addEventListener('pointerdown', e => { drag = true; lx = e.clientX; });
  addEventListener('pointermove', e => { if (drag) { dragAz -= (e.clientX - lx) * .008; lx = e.clientX; } }, { passive: true });
  addEventListener('pointerup', () => drag = false); addEventListener('pointercancel', () => drag = false);

  let aspect = .8;
  const resize = () => { const w = holder.clientWidth, h = holder.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); aspect = w / h; camera.aspect = aspect; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(holder); resize();

  let on = false, last = 0, T = 0;
  new IntersectionObserver(([e]) => { const was = on; on = e.isIntersecting; if (on && !was) { last = performance.now(); requestAnimationFrame(frame); } }, { rootMargin: '80px' }).observe(holder);
  function frame(now) {
    if (!on) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now; T += dt;
    const cyc = T % 15;
    const p = reduce ? .62 : cyc < 10.5 ? ease(cyc / 10.5) : cyc < 13.5 ? 1 : 1 - ease((cyc - 13.5) / 1.5);

    // repaint: the fresh band follows the roller across the wall
    paint.scale.x = Math.max(.001, p * W);
    const fx = -W / 2 + p * W;
    painter.position.x = clamp(fx - .16, xs[0] + .35, xs[3] - .35);
    const stroke = reduce ? .5 : .5 + .5 * Math.sin(T * 5.2), working = p > .005 && p < .995 ? 1 : 0;
    const ry = .25 + stroke * .62 * working;
    roller.position.y = ry; pole.scale.y = Math.max(.05, ry); arm.rotation.x = -.15 + stroke * .1;
    roller.rotation.x = T * 9 * working;

    // re-roof: tiles land course by course, ridge cap goes on last
    const n = tiles.length, head = p * (n + 6);
    tiles.forEach((t, i) => { const k = out(clamp((head - i) / 6)); t.visible = k > 0; t.position.y = .1 + (1 - k) * 1.1; t.scale.setScalar(.6 + .4 * k); });
    const rk = out(clamp((p - .93) / .07)); ridge.visible = rk > 0; ridge.position.y = H + RISE + .2 + (1 - rk) * .9;

    // glazing: the pane slides into the side opening
    const gk = out(clamp((p - .35) / .2)); glass.visible = p > .3; glass.position.x = W / 2 + .08 + (1 - gk) * 2.2; glass.material.opacity = .55 * clamp((p - .3) / .08);

    // hoist cycles between the ground and the top lift; mixer keeps turning
    const hy = reduce ? 2.4 : 1.9 + Math.sin(T * .7) * 1.45; load.position.y = hy; rope.scale.y = TOP - hy - .95; load.rotation.y = Math.sin(T * .5) * .25;
    if (!reduce) drum.rotation.y = T * 2.2;

    mx += (tx - mx) * .06; my += (ty - my) * .06; if (!drag) dragAz *= .97;
    const az = .72 + (reduce ? 0 : Math.sin(T * .22) * .16) + mx * .45 + dragAz, el = .3 - my * .14, R = Math.max(18.5, 19.6 / aspect);
    camera.position.set(Math.sin(az) * Math.cos(el) * R, 2.2 + Math.sin(el) * R, Math.cos(az) * Math.cos(el) * R);
    camera.lookAt(-.2, 2.35, .7);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
}
