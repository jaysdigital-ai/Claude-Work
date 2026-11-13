/* Brixon — animated 3D model on each product card.
   One shared WebGL renderer draws every card's scene and blits it into that card's
   2D canvas, so the cards keep their CSS 3D tilt without needing six GL contexts. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const cards = [...document.querySelectorAll('#tiltGrid .tilt')];
if (cards.length) init();

function init() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();

  const Y = 0xffc60a, B = 0x1b74bd, INK = 0x14191d, PAPER = 0xecEAE4;
  const std = (color, roughness = .5, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const steel = () => std(0xc5cbd0, .28, 1);
  const add = (g, geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  const hex = r => { const s = new THREE.Shape(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; s[k ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } s.closePath(); return s; };

  const builders = [
    /* 01 electrical — bolt with orbiting charge */
    () => {
      const g = new THREE.Group();
      const pts = [[228, 52], [146, 232], [204, 232], [174, 350], [270, 172], [210, 172]], s = new THREE.Shape();
      pts.forEach(([x, y], k) => s[k ? 'lineTo' : 'moveTo']((x - 208) / 78, -(y - 200) / 78));
      s.closePath();
      const geo = new THREE.ExtrudeGeometry(s, { depth: .42, bevelEnabled: true, bevelSize: .06, bevelThickness: .06, bevelSegments: 3 }); geo.center();
      const bolt = add(g, geo, std(Y, .3, .25, { emissive: Y, emissiveIntensity: .12 }));
      const rings = [0, 1, 2].map(k => { const r = new THREE.Group(); r.rotation.set(1.1 + k * .5, k * 1.1, 0); g.add(r);
        const t = add(r, new THREE.TorusGeometry(1.75 + k * .12, .012, 6, 90), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .32 })); t.castShadow = false;
        const e = add(r, new THREE.SphereGeometry(.085, 14, 10), new THREE.MeshBasicMaterial({ color: k === 1 ? Y : 0x8fd0ff })); e.castShadow = false; r.userData = { e, R: 1.75 + k * .12, sp: 1.6 + k * .5 }; return r; });
      return { g, tick: (t, h) => { bolt.rotation.y = t * .7; bolt.material.emissiveIntensity = .12 + h * (.25 + Math.sin(t * 14) * .2);
        rings.forEach((r, k) => { const a = t * r.userData.sp + k * 2; r.userData.e.position.set(Math.cos(a) * r.userData.R, Math.sin(a) * r.userData.R, 0); r.rotation.z = t * .2 * (k % 2 ? -1 : 1); }); } };
    },
    /* 02 structural — steel section slung from a hook */
    () => {
      const g = new THREE.Group(), rig = new THREE.Group(); rig.position.y = 2.05; g.add(rig);
      const s = new THREE.Shape(), W = .62, H = .58, T = .13, w = .07;
      [[-W, H], [W, H], [W, H - T], [w, H - T], [w, -H + T], [W, -H + T], [W, -H], [-W, -H], [-W, -H + T], [-w, -H + T], [-w, H - T], [-W, H - T]].forEach(([x, y], k) => s[k ? 'lineTo' : 'moveTo'](x, y));
      const geo = new THREE.ExtrudeGeometry(s, { depth: 3.3, bevelEnabled: true, bevelSize: .015, bevelThickness: .015, bevelSegments: 1 }); geo.center(); geo.rotateY(Math.PI / 2);
      add(rig, geo, std(PAPER, .45, .35), 0, -2.05, 0);
      const cab = std(INK, .5, .6);
      [-1, 1].forEach(sd => { const c = add(rig, new THREE.CylinderGeometry(.018, .018, 1.86, 6), cab, sd * .55, -.74, 0); c.rotation.z = sd * .64; add(rig, new THREE.BoxGeometry(.16, .1, 1.36), std(Y, .5), sd * 1.1, -1.44, 0); });
      add(rig, new THREE.TorusGeometry(.13, .04, 10, 24), std(Y, .4, .4), 0, .06, 0);
      add(rig, new THREE.CylinderGeometry(.02, .02, 1.6, 6), cab, 0, .98, 0).castShadow = false;
      return { g, tick: (t, h) => { rig.rotation.z = Math.sin(t * .9) * (.07 + h * .1); rig.rotation.x = Math.cos(t * .7) * .04; rig.rotation.y = t * .35; } };
    },
    /* 03 PPE — hard hat */
    () => {
      const g = new THREE.Group(), hat = new THREE.Group(); g.add(hat);
      const yl = std(Y, .32, .05), wh = std(PAPER, .4);
      const dome = add(hat, new THREE.SphereGeometry(1.15, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), yl); dome.scale.set(1, .86, 1.12);
      const brim = add(hat, new THREE.CylinderGeometry(1.3, 1.34, .08, 56), yl, 0, -.02, 0); brim.scale.z = 1.12;
      const peak = add(hat, new THREE.CylinderGeometry(.82, .86, .07, 40), yl, 0, -.03, 1.02); peak.scale.x = 1.25;
      [0, -.42, .42].forEach(x => { const r = add(hat, new THREE.TorusGeometry(1.16 * Math.sqrt(1 - (x / 1.15) ** 2), x ? .055 : .1, 10, 40, Math.PI), x ? yl : wh, x, 0, 0); r.rotation.y = Math.PI / 2; r.scale.set(1.12, .875, 1); });
      const band = add(hat, new THREE.TorusGeometry(1.2, .035, 8, 56), std(INK, .6), 0, .1, 0); band.rotation.x = Math.PI / 2; band.scale.y = 1.12;
      hat.position.y = .1; hat.scale.setScalar(1.15);
      return { g, tick: (t, h) => { hat.rotation.y = t * .6 + .6; hat.rotation.z = Math.sin(t * 1.1) * .08; hat.rotation.x = -.12 + Math.sin(t * .8) * .05; hat.position.y = .1 + Math.sin(t * 1.6) * .08 + h * .1; } };
    },
    /* 04 hardware — bolt threading through a nut */
    () => {
      const g = new THREE.Group(), asm = new THREE.Group(); asm.rotation.set(.35, 0, -.9); g.add(asm);
      const nutShape = hex(1.05); const hole = new THREE.Path(); hole.absarc(0, 0, .56, 0, Math.PI * 2, true); nutShape.holes.push(hole);
      const nutGeo = new THREE.ExtrudeGeometry(nutShape, { depth: .6, bevelEnabled: true, bevelSize: .07, bevelThickness: .07, bevelSegments: 3, curveSegments: 40 }); nutGeo.center(); nutGeo.rotateX(Math.PI / 2);
      const nut = add(asm, nutGeo, std(Y, .3, .85));
      const bolt = new THREE.Group(); asm.add(bolt); const st = steel();
      const headGeo = new THREE.ExtrudeGeometry(hex(.82), { depth: .42, bevelEnabled: true, bevelSize: .05, bevelThickness: .05, bevelSegments: 2 }); headGeo.center(); headGeo.rotateX(Math.PI / 2);
      add(bolt, headGeo, st, 0, 1.75, 0); add(bolt, new THREE.CylinderGeometry(.47, .47, 3.2, 40), st, 0, 0, 0);
      for (let i = 0; i < 30; i++) { const th = add(bolt, new THREE.TorusGeometry(.49, .03, 6, 40), st, 0, -1.5 + i * .095, 0); th.rotation.x = Math.PI / 2 + .05; }
      return { g, tick: (t, h) => { const p = Math.sin(t * .9) * .75; bolt.position.y = p; bolt.rotation.y = p * 9; nut.rotation.y = -t * .25; g.rotation.y = Math.sin(t * .4) * .5; } };
    },
    /* 05 fire — ringing alarm bell */
    () => {
      const g = new THREE.Group(), bell = new THREE.Group(); bell.rotation.x = 1.05; g.add(bell);
      const red = std(0xd8321f, .22, .35), dk = std(0x7e1a10, .5, .2);
      add(bell, new THREE.CylinderGeometry(1.3, 1.3, .14, 56), dk, 0, -.07, 0);
      const dome = add(bell, new THREE.SphereGeometry(1.08, 56, 24, 0, Math.PI * 2, 0, Math.PI / 2), red); dome.scale.y = .62;
      add(bell, new THREE.CylinderGeometry(.2, .24, .16, 28), steel(), 0, .7, 0);
      const arm = new THREE.Group(); arm.position.set(1.22, .1, 0); bell.add(arm);
      add(arm, new THREE.BoxGeometry(.5, .07, .1), steel(), -.2, .12, 0); add(arm, new THREE.SphereGeometry(.13, 16, 12), steel(), -.42, .12, 0);
      const waves = [0, 1, 2].map(k => { const w = add(bell, new THREE.TorusGeometry(1.35, .018, 6, 96), new THREE.MeshBasicMaterial({ color: Y, transparent: true }), 0, .02, 0); w.rotation.x = Math.PI / 2; w.castShadow = false; return w; });
      return { g, tick: (t, h) => { bell.rotation.z = Math.sin(t * .6) * .25; bell.rotation.x = 1.05 + Math.sin(t * .8) * .08; arm.rotation.y = Math.sin(t * (22 + h * 14)) * .16;
        bell.position.x = Math.sin(t * 40) * .012 * (1 + h * 2);
        waves.forEach((w, k) => { const p = (t * (.45 + h * .35) + k / 3) % 1; w.scale.setScalar(1 + p * .75); w.material.opacity = (1 - p) * .85; }); } };
    },
    /* 06 security — panning camera */
    () => {
      const g = new THREE.Group(); g.rotation.y = -.55; g.position.set(-.25, .2, 0);
      const wh = std(PAPER, .35), dk = std(INK, .4, .3);
      add(g, new THREE.BoxGeometry(.14, 1.3, 1), wh, -1.75, .35, 0); const armM = add(g, new THREE.CylinderGeometry(.09, .09, .95, 16), wh, -1.25, .35, 0); armM.rotation.z = Math.PI / 2;
      add(g, new THREE.SphereGeometry(.19, 20, 14), dk, -.78, .35, 0);
      const head = new THREE.Group(); head.position.set(-.78, .35, 0); g.add(head);
      const body = new THREE.Group(); body.rotation.z = -.3; head.add(body);
      const barrel = add(body, new THREE.CylinderGeometry(.36, .36, 1.9, 40), wh, 1.05, 0, 0); barrel.rotation.z = Math.PI / 2;
      add(body, new THREE.BoxGeometry(2.25, .06, .9), wh, 1.2, .4, 0);
      const lens = add(body, new THREE.CylinderGeometry(.3, .33, .22, 40), dk, 2.08, 0, 0); lens.rotation.z = Math.PI / 2;
      const glass = add(body, new THREE.CylinderGeometry(.2, .2, .03, 32), std(B, .05, .6, { emissive: 0x4aa3e8, emissiveIntensity: .5 }), 2.2, 0, 0); glass.rotation.z = Math.PI / 2;
      const led = add(body, new THREE.SphereGeometry(.045, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3b1f, transparent: true }), 2.19, .24, 0); led.castShadow = false;
      const cone = add(body, new THREE.ConeGeometry(1.25, 3.6, 40, 1, true), new THREE.MeshBasicMaterial({ color: Y, transparent: true, opacity: .16, side: THREE.DoubleSide, depthWrite: false }), 4.0, 0, 0); cone.rotation.z = Math.PI / 2; cone.castShadow = false;
      return { g, tick: (t, h) => { head.rotation.y = Math.sin(t * .8) * .7; body.rotation.z = -.3 + Math.sin(t * .5) * .08; led.material.opacity = Math.sin(t * 6) > 0 ? 1 : .15; cone.material.opacity = .12 + h * .14; } };
    },
  ];

  const views = cards.map((card, i) => {
    const holder = card.querySelector('.tilt-img');
    const canvas = document.createElement('canvas'); canvas.className = 'tilt-gl'; holder.append(canvas);
    const scene = new THREE.Scene(); scene.environment = env; scene.environmentIntensity = .9;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x20262c, .7));
    const key = new THREE.DirectionalLight(0xfff0d8, 2.6); key.position.set(3.5, 6, 5); key.castShadow = true; key.shadow.mapSize.set(512, 512);
    Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 }); key.shadow.radius = 6; key.shadow.bias = -0.001; scene.add(key);
    const rim = new THREE.DirectionalLight(0x4aa3e8, 1.4); rim.position.set(-5, 2, -4); scene.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 40), new THREE.ShadowMaterial({ opacity: .38 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -2.15; floor.receiveShadow = true; scene.add(floor);
    const wrap = new THREE.Group(); scene.add(wrap);
    const model = builders[i % builders.length]();
    // normalise every model: same visual size, centred on the same point
    const fit = new THREE.Group(); fit.add(model.g); wrap.add(fit); fit.updateMatrixWorld(true);
    const bb = new THREE.Box3(); fit.traverse(o => { if (o.isMesh && o.castShadow) bb.expandByObject(o); });
    const size = bb.getSize(new THREE.Vector3()), mid = bb.getCenter(new THREE.Vector3()), k = 2.45 / Math.max(size.x, size.y, size.z);
    fit.scale.setScalar(k); fit.position.copy(mid).multiplyScalar(-k);
    const v = { card, canvas, ctx: canvas.getContext('2d'), scene, wrap, model, on: false, h: 0, hT: 0, px: 0, py: 0, tx: 0, ty: 0, T: i * 1.7, in: 0 };
    card.addEventListener('pointerenter', () => v.hT = 1);
    card.addEventListener('pointerleave', () => { v.hT = 0; v.tx = v.ty = 0; });
    card.addEventListener('pointermove', e => { const r = card.getBoundingClientRect(); v.tx = (e.clientX - r.left) / r.width - .5; v.ty = (e.clientY - r.top) / r.height - .5; });
    new IntersectionObserver(([e]) => { const was = v.on; v.on = e.isIntersecting; if (v.on && !was) start(); }, { rootMargin: '60px' }).observe(card);
    return v;
  });

  const camera = new THREE.PerspectiveCamera(30, .8, .1, 50);
  camera.position.set(0, 1.4, 9.4); camera.lookAt(0, -.8, 0);
  let W = 0, H = 0;
  const resize = () => {
    const r = views[0].canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio, 1.5);
    const w = Math.round(r.width * d), h = Math.round(r.height * d);
    if (!w || !h || (w === W && h === H)) return;
    W = w; H = h; renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.fov = W / H > 1 ? 24 : 30; camera.updateProjectionMatrix();
    views.forEach(v => { v.canvas.width = W; v.canvas.height = H; });
  };
  new ResizeObserver(resize).observe(views[0].card); resize();

  let running = false, last = 0;
  function start() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    let any = false;
    for (const v of views) {
      if (!v.on) continue; any = true;
      v.h += (v.hT - v.h) * .1; v.px += (v.tx - v.px) * .1; v.py += (v.ty - v.py) * .1;
      v.in = Math.min(1, v.in + dt * 1.1);
      if (!reduce) v.T += dt * (1 + v.h * 1.4);
      const e = 1 - Math.pow(1 - v.in, 3);
      v.model.tick(v.T, v.h);
      v.wrap.rotation.set(v.py * .5, v.px * .9 + (1 - e) * -1.6, 0);
      v.wrap.scale.setScalar((.55 + .45 * e) * (1 + v.h * .1));
      v.wrap.position.y = (1 - e) * -1.2;
      renderer.render(v.scene, camera);
      v.ctx.clearRect(0, 0, W, H); v.ctx.drawImage(renderer.domElement, 0, 0);
    }
    if (any) requestAnimationFrame(frame); else running = false;
  }
}
