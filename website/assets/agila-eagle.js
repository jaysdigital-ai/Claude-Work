/* Digital Agila eagle – needs three.js (loaded just above).
   Usage: AgilaEagle(document.getElementById('agila-eagle'), { ...options });
   Options (all optional):
     sky : true/false         – draw the dusk sky (false = transparent, your own background shows)
     clouds : true/false      – drifting clouds and gold dust
     interactive : true/false – camera follows the pointer and can be dragged
     scale : 1                – make the eagle larger or smaller in its box        */
(function () {
  function smooth(e0, e1, x) { var t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function col(h) { return new THREE.Color(h).convertSRGBToLinear(); }
  function canvasTex(w, h, draw) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    return t;
  }
  // tiny vector helpers on plain arrays
  function add(a, b, s) { return [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }

  window.AgilaEagle = function (canvas, opts) {
    if (!window.THREE) return;
    var o = { sky: true, clouds: true, interactive: true, scale: 1 };
    for (var k in (opts || {})) o[k] = opts[k];
    var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true }); }
    catch (e) { return; }
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var FOG = col('#27344a');
    scene.fog = new THREE.FogExp2(FOG.getHex(), 0.006);
    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 600);

    /* ---------- light: low sun behind the bird, cool sky fill in front ---------- */
    var SUN_DIR = new THREE.Vector3(0.55, 0.42, -1).normalize();
    var sun = new THREE.DirectionalLight(col('#ffcf8f'), 3.0);
    sun.position.copy(SUN_DIR).multiplyScalar(50);
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(col('#8ea6cc'), col('#4a3a2a'), 1.15));
    var fill = new THREE.DirectionalLight(col('#b9c8e6'), 0.75);
    fill.position.set(3, 2, 6);
    scene.add(fill);

    /* ---------- sky, sun, clouds ---------- */
    if (o.sky) {
      var skyTex = canvasTex(8, 512, function (g, w, h) {
        var gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0.00, '#070c15');
        gr.addColorStop(0.40, '#141e2c');
        gr.addColorStop(0.47, '#33405a');
        gr.addColorStop(0.494, '#9c8562');
        gr.addColorStop(0.504, '#b8965f');
        gr.addColorStop(0.525, '#665f66');
        gr.addColorStop(0.58, '#2c384e');
        gr.addColorStop(0.70, '#19232f');
        gr.addColorStop(1.00, '#0b111a');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      });
      var sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 32),
        new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }));
      scene.add(sky);
    }
    var glowTex = canvasTex(256, 256, function (g, w) {
      var gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,244,214,1)');
      gr.addColorStop(0.08, 'rgba(255,214,140,0.85)');
      gr.addColorStop(0.3, 'rgba(240,170,90,0.28)');
      gr.addColorStop(1, 'rgba(240,170,90,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
    var clouds = [], dust = null;
    if (o.clouds) {
      var sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, fog: false, depthWrite: false, transparent: true }));
      sunSprite.position.copy(SUN_DIR).multiplyScalar(300); sunSprite.position.y = 22;
      sunSprite.scale.set(260, 260, 1);
      scene.add(sunSprite);

      var puffTex = canvasTex(256, 256, function (g, w) {
        for (var i = 0; i < 22; i++) {
          var a = Math.random() * 6.28, r = Math.random() * 62;
          var x = w / 2 + Math.cos(a) * r * 1.25, y = w / 2 + Math.sin(a) * r * 0.55, s = 34 + Math.random() * 44;
          var gr = g.createRadialGradient(x, y, 0, x, y, s);
          gr.addColorStop(0, 'rgba(255,255,255,0.20)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = gr; g.fillRect(0, 0, w, w);
        }
      });
      var cloudCols = [col('#6f83a3'), col('#4f6180'), col('#5d6f8d'), col('#8d99ad'), col('#c9a877')];
      for (var c = 0; c < 70; c++) {
        var low = c < 52;
        var mat = new THREE.SpriteMaterial({ map: puffTex, color: cloudCols[(Math.random() * cloudCols.length) | 0], transparent: true,
          opacity: low ? 0.16 + Math.random() * 0.26 : 0.08 + Math.random() * 0.1, depthWrite: false });
        var sp = new THREE.Sprite(mat);
        var sc = low ? 14 + Math.random() * 22 : 16 + Math.random() * 20;
        sp.scale.set(sc * 1.9, sc * (low ? 0.75 : 0.5), 1);
        sp.position.set((Math.random() * 2 - 1) * 70, low ? -4.5 - Math.random() * 9 : 5 + Math.random() * 10, -55 + Math.random() * 62);
        sp.userData.v = 5.5 + Math.random() * 1.5;
        scene.add(sp); clouds.push(sp);
      }
      var DN = 260, dpos = new Float32Array(DN * 3);
      for (var d = 0; d < DN; d++) { dpos[d * 3] = (Math.random() * 2 - 1) * 14; dpos[d * 3 + 1] = (Math.random() * 2 - 1) * 5; dpos[d * 3 + 2] = (Math.random() * 2 - 1) * 8; }
      var dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
      dust = new THREE.Points(dg, new THREE.PointsMaterial({ map: glowTex, size: 0.09, color: col('#ffd89a'), transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false }));
      dust.frustumCulled = false;
      scene.add(dust);
    }

    /* ---------- the eagle ---------- */
    var bird = new THREE.Group(); scene.add(bird);
    var C_DARK = col('#2a1e15'), C_BROWN = col('#4a3423'), C_TAWNY = col('#7a5a30'), C_GOLD = col('#b98a42'), C_BUFF = col('#5c4630');

    // body: smooth spindle with a feather-scale texture
    var scaleTex = canvasTex(256, 256, function (g, w, h) {
      g.fillStyle = '#d9d9d9'; g.fillRect(0, 0, w, h);
      var rows = 8, cols = 6, cw = w / cols, rh = h / rows;
      for (var r = -1; r <= rows; r++) for (var cc = -1; cc <= cols; cc++) {
        var x = cc * cw + (r % 2 ? cw / 2 : 0) + cw / 2, y = r * rh;
        var gr = g.createLinearGradient(0, y, 0, y + rh * 1.5);
        gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(165,165,165,0.9)');
        g.fillStyle = gr;
        g.beginPath(); g.ellipse(x, y + rh * 0.5, cw * 0.56, rh * 1.0, 0, 0, Math.PI); g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 2; g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x, y + rh * 0.5); g.lineTo(x, y + rh * 1.4); g.stroke();
      }
    });
    scaleTex.wrapS = scaleTex.wrapT = THREE.RepeatWrapping;

    (function buildBody() {
      var ctrl = [[-1.05, 0.03, 0.0], [-0.9, 0.10, 0.0], [-0.6, 0.165, -0.01], [-0.2, 0.215, -0.03], [0.2, 0.225, -0.03], [0.5, 0.195, 0.0],
                  [0.72, 0.155, 0.05], [0.86, 0.135, 0.09], [0.98, 0.142, 0.115], [1.08, 0.112, 0.108], [1.14, 0.07, 0.095]]
        .map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); });
      var pts = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal').getPoints(56);
      var RS = 28, pos = [], uv = [], colr = [], idx = [], tmp = new THREE.Color();
      pts.forEach(function (p, i) {
        for (var s = 0; s <= RS; s++) {
          var a = -Math.PI / 2 + s / RS * Math.PI * 2;
          pos.push(p.x, p.z + p.y * 0.9 * Math.sin(a), p.y * Math.cos(a));
          uv.push(s / RS * 7, -p.x * 6);
          tmp.copy(C_BROWN).lerp(C_GOLD, smooth(0.48, 0.86, p.x)).lerp(C_DARK, smooth(-0.3, -0.95, p.x) * 0.6);
          var under = 0.78 + 0.22 * smooth(-0.6, 0.5, Math.sin(a));
          colr.push(tmp.r * under, tmp.g * under, tmp.b * under);
        }
      });
      for (var i = 0; i < pts.length - 1; i++) for (var s = 0; s < RS; s++) {
        var a0 = i * (RS + 1) + s, b0 = a0 + 1, c0 = a0 + RS + 1, d0 = c0 + 1;
        idx.push(a0, c0, b0, b0, c0, d0);
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
      g.setIndex(idx); g.computeVertexNormals();
      bird.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: scaleTex, vertexColors: true, roughness: 0.82, metalness: 0, side: THREE.DoubleSide })));

      // hooked beak
      var bp = [], bc = [], bi = [], BR = 14, BN = 12, yel = col('#d6a63a'), horn = col('#231f1c');
      for (var j = 0; j <= BN; j++) {
        var t = j / BN, cx = 1.115 + 0.2 * t, cy = 0.092 - 0.125 * t * t;
        var ry = 0.074 * Math.pow(1 - t, 0.6) + 0.003, rz = 0.052 * Math.pow(1 - t, 0.8) + 0.002;
        tmp.copy(yel).lerp(horn, smooth(0.28, 0.62, t));
        for (var s2 = 0; s2 <= BR; s2++) {
          var a2 = s2 / BR * Math.PI * 2;
          bp.push(cx, cy + ry * Math.sin(a2), rz * Math.cos(a2)); bc.push(tmp.r, tmp.g, tmp.b);
        }
      }
      for (var j2 = 0; j2 < BN; j2++) for (var s3 = 0; s3 < BR; s3++) {
        var q = j2 * (BR + 1) + s3; bi.push(q, q + BR + 1, q + 1, q + 1, q + BR + 1, q + BR + 2);
      }
      var bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
      bg.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3));
      bg.setIndex(bi); bg.computeVertexNormals();
      bird.add(new THREE.Mesh(bg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, side: THREE.DoubleSide })));

      // eyes and brow
      var eyeM = new THREE.MeshStandardMaterial({ color: col('#140d06'), roughness: 0.08 });
      var irisM = new THREE.MeshStandardMaterial({ color: col('#c48a1e'), roughness: 0.3 });
      var browM = new THREE.MeshStandardMaterial({ color: col('#5a4226'), roughness: 0.85 });
      [-1, 1].forEach(function (sg) {
        var iris = new THREE.Mesh(new THREE.SphereGeometry(0.026, 14, 10), irisM);
        iris.position.set(1.0, 0.158, sg * 0.107); bird.add(iris);
        var pupil = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 8), eyeM);
        pupil.position.set(1.004, 0.159, sg * 0.121); bird.add(pupil);
        var brow = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), browM);
        brow.scale.set(2.3, 0.5, 0.9); brow.position.set(1.0, 0.194, sg * 0.098); brow.rotation.z = -0.28; bird.add(brow);
      });
    })();

    // feathers: one textured blade, drawn a few hundred times
    var featherTex = canvasTex(128, 512, function (g, w, h) {
      g.clearRect(0, 0, w, h);
      g.beginPath();
      g.moveTo(w * 0.5, h);
      g.bezierCurveTo(w * 0.28, h * 0.97, w * 0.05, h * 0.78, w * 0.05, h * 0.38);
      g.bezierCurveTo(w * 0.05, h * 0.13, w * 0.28, 0.01 * h, w * 0.5, 0.01 * h);
      g.bezierCurveTo(w * 0.72, 0.01 * h, w * 0.95, h * 0.13, w * 0.95, h * 0.38);
      g.bezierCurveTo(w * 0.95, h * 0.78, w * 0.72, h * 0.97, w * 0.5, h);
      g.closePath();
      g.save(); g.clip();
      var gr = g.createLinearGradient(0, h, 0, 0);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#d6d6d6'); gr.addColorStop(0.85, '#a3a3a3'); gr.addColorStop(1, '#7c7c7c');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      // barbs
      g.lineWidth = 1;
      for (var y = h; y > -40; y -= 3.2) {
        g.strokeStyle = 'rgba(0,0,0,' + (0.05 + Math.random() * 0.1) + ')';
        g.beginPath(); g.moveTo(w * 0.5, y); g.lineTo(0, y - 46); g.stroke();
        g.beginPath(); g.moveTo(w * 0.5, y); g.lineTo(w, y - 46); g.stroke();
      }
      // soft dark edges and a few splits
      var eg = g.createLinearGradient(0, 0, w, 0);
      eg.addColorStop(0, 'rgba(0,0,0,0.3)'); eg.addColorStop(0.16, 'rgba(0,0,0,0)'); eg.addColorStop(0.84, 'rgba(0,0,0,0)'); eg.addColorStop(1, 'rgba(0,0,0,0.3)');
      g.fillStyle = eg; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-out';
      for (var n = 0; n < 5; n++) {
        var sy = h * (0.15 + Math.random() * 0.6), left = Math.random() < 0.5;
        g.beginPath(); g.moveTo(left ? 0 : w, sy - 40); g.lineTo(left ? 0 : w, sy - 34); g.lineTo(w * (left ? 0.3 : 0.7), sy - 14); g.closePath(); g.fill();
      }
      g.globalCompositeOperation = 'source-over';
      // shaft
      g.strokeStyle = 'rgba(255,246,225,0.95)'; g.lineWidth = 3.2;
      g.beginPath(); g.moveTo(w * 0.5, h); g.lineTo(w * 0.5, h * 0.05); g.stroke();
      g.restore();
    });
    var fGeo = new THREE.PlaneGeometry(1, 1, 4, 6); fGeo.translate(0, 0.5, 0);
    (function () {
      var p = fGeo.attributes.position;
      for (var i = 0; i < p.count; i++) { var x = p.getX(i), y = p.getY(i); p.setZ(i, -0.1 * x * x - 0.035 * y * y); }
      fGeo.computeVertexNormals();
    })();
    var MAXF = 480;
    var feathers = new THREE.InstancedMesh(fGeo, new THREE.MeshStandardMaterial({
      map: featherTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.62, metalness: 0.0
    }), MAXF);
    feathers.frustumCulled = false;
    bird.add(feathers);
    var fi = 0, M = new THREE.Matrix4(), vx = new THREE.Vector3(), vy = new THREE.Vector3(), vz = new THREE.Vector3(), tc = new THREE.Color();
    var coloured = false;

    function place(P, dir, n, len, wid, mirror, colour, jit) {
      if (fi >= MAXF) return;
      var y = norm(dir), z = norm(add(n, y, -dot(n, y)));
      var px = P[0], py = P[1], pz = P[2];
      if (mirror) { pz = -pz; y = [y[0], y[1], -y[2]]; z = [z[0], z[1], -z[2]]; }
      var x = cross(y, z);
      vx.set(x[0] * wid, x[1] * wid, x[2] * wid); vy.set(y[0] * len, y[1] * len, y[2] * len); vz.set(z[0], z[1], z[2]);
      M.makeBasis(vx, vy, vz).setPosition(px, py, pz);
      feathers.setMatrixAt(fi, M);
      if (!coloured) {
        var j = 0.82 + 0.36 * ((Math.sin(fi * 12.9898) * 43758.5453) % 1 + 1) % 1 * (jit === undefined ? 1 : jit);
        tc.copy(colour).multiplyScalar(j); feathers.setColorAt(fi, tc);
      }
      fi++;
    }

    // wing bones (drawn as slim cylinders under the small covert feathers)
    var boneGeo = new THREE.CylinderGeometry(0.03, 0.05, 1, 8);
    var boneMat = new THREE.MeshStandardMaterial({ color: C_BROWN, roughness: 0.85 });
    var bones = [];
    for (var b = 0; b < 6; b++) { var bm = new THREE.Mesh(boneGeo, boneMat); bird.add(bm); bones.push(bm); }
    var UP = new THREE.Vector3(0, 1, 0), tv = new THREE.Vector3();
    function setBone(m, A, B, mirror) {
      var az = mirror ? -A[2] : A[2], bz = mirror ? -B[2] : B[2];
      m.position.set((A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (az + bz) / 2);
      tv.set(B[0] - A[0], B[1] - A[1], bz - az);
      m.scale.set(1, tv.length(), 1);
      m.quaternion.setFromUnitVectors(UP, tv.normalize());
    }

    var L1 = 0.5, L2 = 0.62, L3 = 0.5, SH = [0.38, 0.10, 0.19];

    function featherStack(P, dirF, n, bk, len, wid, mirror, stag) {
      var nn = norm(add(n, bk, 0.13));                      // shingle tilt
      place(add(add(P, bk, 0.03), n, -stag), dirF, nn, len, wid, mirror, C_DARK);            // flight feather
      place(add(P, n, -0.016 - stag), dirF, nn, len * 0.52, wid * 1.2, mirror, C_BUFF);      // under covert
      place(add(P, n, 0.014 - stag), dirF, nn, len * 0.5, wid * 1.22, mirror, C_BROWN);      // greater covert
      place(add(add(P, bk, -0.02), n, 0.026 - stag), dirF, nn, len * 0.3, wid * 1.25, mirror, C_TAWNY);  // median covert
      place(add(add(P, bk, -0.12), n, 0.03), norm(add(bk, dirF, 0.35)), norm(add(n, bk, 0.22)), 0.36, 0.26, mirror, C_TAWNY);
      place(add(add(P, bk, -0.11), n, -0.03), norm(add(bk, dirF, 0.35)), norm(add(n, bk, -0.22)), 0.36, 0.26, mirror, C_BUFF); // lesser covert
    }

    function buildWing(mirror, ph, A, env) {
      var fold = env * 0.3 * (0.5 + 0.5 * Math.cos(ph));
      var e1 = 0.07 + A * Math.sin(ph);
      var e2 = e1 - 0.03 + 0.3 * A * Math.sin(ph - 0.8);
      var e3 = e2 + 0.4 * A * Math.sin(ph - 1.5);
      var al = [-(0.16 + 0.42 * fold), 0.12 + 0.3 * fold, -(0.08 + 0.7 * fold)], el = [e1, e2, e3], Ls = [L1, L2, L3];
      var tw = -0.3 * A * Math.cos(ph);
      var J = [SH], seg = [];
      for (var s = 0; s < 3; s++) {
        var d = [Math.sin(al[s]), Math.cos(al[s]) * Math.sin(el[s]), Math.cos(al[s]) * Math.cos(el[s])];
        var bk = norm(add([-1, 0, 0], d, d[0]));
        var n = cross(bk, d), t = tw * (0.3 + 0.35 * s);
        var bk2 = norm(add([bk[0] * Math.cos(t), bk[1] * Math.cos(t), bk[2] * Math.cos(t)], n, Math.sin(t)));
        var n2 = cross(bk2, d);
        seg.push({ d: d, bk: bk2, n: n2 });
        J.push(add(J[s], d, Ls[s]));
        setBone(bones[(mirror ? 3 : 0) + s], J[s], J[s + 1], mirror);
      }
      var i, u, phi, dirF, sg, stag = 0;
      // tertials on the upper arm
      sg = seg[0];
      for (i = 0; i < 6; i++) {
        u = (i + 0.5) / 6; phi = -0.2 + 0.04 * i;
        dirF = add([sg.bk[0] * Math.cos(phi), sg.bk[1] * Math.cos(phi), sg.bk[2] * Math.cos(phi)], sg.d, Math.sin(phi));
        featherStack(add(J[0], sg.d, L1 * u), dirF, sg.n, sg.bk, 0.68 + 0.015 * i, 0.22, mirror, stag); stag += 0.0012;
      }
      // secondaries on the forearm
      sg = seg[1];
      for (i = 0; i < 12; i++) {
        u = i / 11; phi = 0.04 + 0.26 * u;
        dirF = add([sg.bk[0] * Math.cos(phi), sg.bk[1] * Math.cos(phi), sg.bk[2] * Math.cos(phi)], sg.d, Math.sin(phi));
        featherStack(add(J[1], sg.d, L2 * u), dirF, sg.n, sg.bk, 0.76 + 0.05 * u, 0.21, mirror, stag); stag += 0.0012;
      }
      // primaries on the hand – the outer ones are the long "fingers"
      sg = seg[2];
      var lift = 0.10 + 0.34 * A * Math.sin(ph - 2.3);
      for (i = 0; i < 10; i++) {
        u = i / 9; phi = lerp(0.36, 1.5, Math.pow(u, 0.9)) * (1 - 0.32 * fold);
        dirF = add([sg.bk[0] * Math.cos(phi), sg.bk[1] * Math.cos(phi), sg.bk[2] * Math.cos(phi)], sg.d, Math.sin(phi));
        dirF = add(dirF, sg.n, lift * u);
        featherStack(add(J[2], sg.d, L3 * u), dirF, sg.n, sg.bk, 0.82 + 0.30 * Math.sin(u * Math.PI * 0.75), 0.2 - 0.075 * u, mirror, stag); stag += 0.0012;
      }
    }

    function buildTail(env, sway) {
      var base = [-0.90, 0.0, 0], spread = 0.36 + 0.14 * (1 - env), up = [0, 1, 0], i, a;
      for (i = 0; i < 12; i++) {
        a = spread * (i - 5.5) / 5.5 + sway;
        place([base[0], base[1] - Math.abs(i - 5.5) * 0.004, base[2] + (i - 5.5) * 0.012], [-Math.cos(a), -0.05, Math.sin(a)],
              [0.05 * (i - 5.5), 1, 0], 0.92, 0.27, false, C_DARK);
      }
      for (i = 0; i < 7; i++) {
        a = spread * 0.8 * (i - 3) / 3 + sway;
        place([-0.72, 0.075, (i - 3) * 0.02], [-Math.cos(a), -0.1, Math.sin(a)], up, 0.5, 0.27, false, C_BROWN);
        place([-0.72, -0.075, (i - 3) * 0.02], [-Math.cos(a), 0.04, Math.sin(a)], up, 0.52, 0.27, false, C_BUFF);
      }
      // shoulder feathers blending the wings into the back
      for (i = 0; i < 5; i++) {
        [-1, 1].forEach(function (sgn) {
          place([0.46 - i * 0.13, 0.155 - i * 0.004, sgn * (0.12 + 0.012 * i)], [-1, -0.03, sgn * 0.16], [0, 1, sgn * 0.7], 0.46, 0.2, false, C_BROWN);
        });
      }
    }

    /* ---------- camera + interaction ---------- */
    var W = 0, H = 0, dist = 9;
    function resize() {
      var r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      if (W < 2 || H < 2) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(W, H, false);
      camera.aspect = W / H; camera.updateProjectionMatrix();
      var th = Math.tan(camera.fov * Math.PI / 360) * 2;
      dist = Math.max(4.0 / th, 5.6 / (th * camera.aspect)) / o.scale;
    }
    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize);

    var azT = 0, elT = 0, azO = 0, elO = 0, dragging = false, lastX = 0, lastY = 0;
    if (o.interactive) {
      canvas.addEventListener('pointerdown', function (e) {
        dragging = true; lastX = e.clientX; lastY = e.clientY;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      });
      canvas.addEventListener('pointermove', function (e) {
        if (dragging) {
          azT -= (e.clientX - lastX) * 0.007;
          elT = Math.max(-0.9, Math.min(1.1, elT + (e.clientY - lastY) * 0.005));
          lastX = e.clientX; lastY = e.clientY;
        } else if (e.pointerType === 'mouse') {
          var r = canvas.getBoundingClientRect();
          azT = -((e.clientX - r.left) / r.width - 0.5) * 0.5;
          elT = ((e.clientY - r.top) / r.height - 0.5) * 0.25;
        }
      });
      var release = function () { if (dragging) { dragging = false; azT = 0; elT = 0; } };
      canvas.addEventListener('pointerup', release);
      canvas.addEventListener('pointercancel', release);
      canvas.addEventListener('pointerleave', function () { if (!dragging) { azT = 0; elT = 0; } });
    }
    var visible = true;
    if (window.IntersectionObserver) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(canvas);

    /* ---------- frame ---------- */
    var time = 0, ph = 2.2, last = 0, target = new THREE.Vector3(0.05, 0.12, 0);
    function frame(now) {
      requestAnimationFrame(frame);
      if (!visible || W < 2) { last = now; return; }
      var dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
      if (still) dt = 0;
      time += dt;

      var env = still ? 0 : smooth(-0.2, 0.5, Math.sin(time * 0.36 + 1.2));   // 1 = flapping, 0 = gliding
      var A = 0.03 + 0.5 * env;
      ph += dt * (2.6 + 2.5 * env);

      fi = 0;
      buildWing(false, ph, A, env);
      buildWing(true, ph, A, env);
      buildTail(env, 0.06 * Math.sin(time * 0.5));
      feathers.count = fi;
      feathers.instanceMatrix.needsUpdate = true;
      if (!coloured) { coloured = true; feathers.instanceColor.needsUpdate = true; }

      bird.position.y = -0.13 * A * Math.sin(ph - 0.5) + 0.08 * Math.sin(time * 0.7);
      bird.rotation.x = 0.16 * Math.sin(time * 0.29);                         // bank
      bird.rotation.z = 0.04 + 0.05 * Math.sin(time * 0.41) + 0.05 * A * Math.cos(ph);  // pitch

      var ease = dragging ? 0.3 : 0.045;
      azO += (azT - azO) * ease; elO += (elT - elO) * ease;
      var az = 0.62 + 0.4 * Math.sin(time * 0.075) + azO;
      var el = 0.50 + 0.13 * Math.sin(time * 0.11 + 1) + elO;
      var dd = dist * (1 + 0.07 * Math.sin(time * 0.13));
      camera.position.set(target.x + dd * Math.cos(el) * Math.cos(az), target.y + dd * Math.sin(el), target.z + dd * Math.cos(el) * Math.sin(az));
      camera.lookAt(target);
      camera.rotation.z += 0.012 * Math.sin(time * 0.33);

      var i;
      for (i = 0; i < clouds.length; i++) {
        var cl = clouds[i]; cl.position.x -= cl.userData.v * dt;
        if (cl.position.x < -70) cl.position.x += 140;
      }
      if (dust) {
        var p = dust.geometry.attributes.position;
        for (i = 0; i < p.count; i++) { var x = p.getX(i) - 4.5 * dt; if (x < -14) x += 28; p.setX(i, x); }
        p.needsUpdate = true;
      }
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
  };
})();


/* auto-start every <canvas data-agila-eagle> on the page (added for the site build) */
document.querySelectorAll('canvas[data-agila-eagle]').forEach(function (c) {
  AgilaEagle(c, { sky: c.dataset.sky !== '0', clouds: c.dataset.clouds !== '0', interactive: true, scale: parseFloat(c.dataset.scale || '1') });
});
