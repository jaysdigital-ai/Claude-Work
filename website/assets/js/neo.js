/* ==========================================================================
   Home: the neon eagle.
   One choreography for the page: as you scroll, the eagle hovers in the
   hero, dives at the camera until you fly through it, pulls back to a faint
   emblem while you read, and returns full size for the final call to action.
   The pointer adds parallax. assets/js/neo/hyperspace.js draws it.
   ========================================================================== */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = () => innerWidth < 900;

  /* Choreography ------------------------------------------------------------ */
  // x, y: centre of the eagle as a share of the viewport; s: size relative to
  // the base size; o: eagle opacity; burst: the dive (0..1); tunnel: how
  // bright the ring tunnel is. While there is text to read, both stay faint.
  const DESK = {
    hero:     { x: 0.7, y: 0.47, s: 1, o: 1, burst: 0, tunnel: 0.75 },
    dive:     { x: 0.5, y: 0.52, s: 3.4, o: 0, burst: 1, tunnel: 1 },
    problem:  { x: 0.86, y: 0.5, s: 0.45, o: 0.22, burst: 0.1, tunnel: 0.18 },
    services: { x: 0.88, y: 0.3, s: 0.42, o: 0.18, burst: 0.05, tunnel: 0.12 },
    founder:  { x: 0.84, y: 0.62, s: 0.5, o: 0.2, burst: 0, tunnel: 0.14 },
    cta:      { x: 0.68, y: 0.48, s: 1.05, o: 0.95, burst: 0, tunnel: 0.7 },
  };
  const PHONE = {
    hero:     { x: 0.5, y: 0.27, s: 0.95, o: 0.95, burst: 0, tunnel: 0.6 },
    dive:     { x: 0.5, y: 0.45, s: 3.2, o: 0, burst: 1, tunnel: 1 },
    problem:  { x: 0.5, y: 0.5, s: 0.7, o: 0.1, burst: 0.2, tunnel: 0.1 },
    services: { x: 0.5, y: 0.5, s: 0.7, o: 0.08, burst: 0.1, tunnel: 0.08 },
    founder:  { x: 0.5, y: 0.5, s: 0.8, o: 0.1, burst: 0, tunnel: 0.1 },
    cta:      { x: 0.5, y: 0.3, s: 0.9, o: 0.75, burst: 0, tunnel: 0.5 },
  };
  const KEYS = ['hero', 'dive', 'problem', 'services', 'founder', 'cta'];
  const FIELDS = ['x', 'y', 's', 'o', 'burst', 'tunnel'];
  let track = [];
  function measure() {
    const top = (k) => document.querySelector(`[data-neo-key="${k}"]`).getBoundingClientRect().top + window.scrollY;
    const h = innerHeight;
    const set = small() ? PHONE : DESK;
    const at = {
      hero: 0,
      dive: top('problem') - h * 0.45,
      problem: top('problem') - h * 0.05,
      services: top('services') - h * 0.2,
      founder: top('founder') - h * 0.25,
      cta: Math.min(top('cta') - h * 0.15, document.documentElement.scrollHeight - h),
    };
    track = KEYS.map((k) => ({ at: at[k], ...set[k] }));
  }
  const smooth = (t) => t * t * (3 - 2 * t);
  function sample(y) {
    if (y <= track[0].at) return { ...track[0] };
    for (let i = 0; i < track.length - 1; i++) {
      const a = track[i], b = track[i + 1];
      if (y <= b.at) {
        const t = smooth((y - a.at) / Math.max(1, b.at - a.at));
        const out = {};
        for (const k of FIELDS) out[k] = a[k] + (b[k] - a[k]) * t;
        return out;
      }
    }
    return { ...track[track.length - 1] };
  }

  /* Shared state, updated every frame -------------------------------------- */
  const state = { x: 0.7, y: 0.47, s: 1, o: 0, burst: 1, tunnel: 0.75, mx: 0, my: 0, vel: 0, progress: 0, time: 0, intro: reduce ? 1 : 0, base: 400, w: innerWidth, h: innerHeight };
  const listeners = [];
  window.neo = { state, onFrame: (fn) => listeners.push(fn), small, reduce };

  let tmx = 0, tmy = 0, lastY = 0;
  window.addEventListener('pointermove', (e) => { tmx = e.clientX / innerWidth - 0.5; tmy = e.clientY / innerHeight - 0.5; }, { passive: true });

  function start() {
    measure();
    window.addEventListener('resize', measure);
    if (window.ScrollTrigger) window.ScrollTrigger.addEventListener('refresh', measure);
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      state.time += dt;
      state.intro = Math.min(1, state.intro + dt / 2.2);
      const y = window.scrollY;
      const target = sample(y);
      const k = reduce ? 1 : Math.min(1, dt * 6);
      for (const key of FIELDS) state[key] += (target[key] - state[key]) * k;
      state.vel += ((y - lastY) / Math.max(dt, 0.001) - state.vel) * Math.min(1, dt * 8);
      lastY = y;
      state.mx += (tmx - state.mx) * Math.min(1, dt * 3);
      state.my += (tmy - state.my) * Math.min(1, dt * 3);
      state.progress = y / Math.max(1, document.documentElement.scrollHeight - innerHeight);
      state.w = innerWidth; state.h = innerHeight;
      state.base = small() ? Math.min(innerWidth * 0.95, innerHeight * 0.5) : Math.min(innerWidth * 0.46, innerHeight * 0.82);
      if (poster) placePoster();
      listeners.forEach((fn) => fn(state, dt));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    scheduleScene();
  }

  /* The 3D scene loads once the page is ready ---------------------------------
     Building it (the 3D library, the artwork, the graphics code) is the
     heaviest work on the page, so it waits until the visitor first moves,
     touches, scrolls or types, or until the browser is idle a few seconds
     after loading. Until then a still of the eagle (the poster) stands in at
     the same spot, then fades out as the 3D eagle assembles. */
  let poster = document.querySelector('.neo-poster');
  function placePoster() {
    const size = state.base * state.s;
    poster.style.width = size.toFixed(1) + 'px';
    poster.style.transform = `translate(${(state.x * innerWidth - size / 2).toFixed(1)}px, ${(state.y * innerHeight - size / 2).toFixed(1)}px)`;
    poster.style.opacity = state.o.toFixed(3);
  }
  let sceneRequested = false;
  function loadScene() {
    if (sceneRequested) return;
    sceneRequested = true;
    TRIGGERS.forEach((t) => window.removeEventListener(t, onFirstInput, true));
    import('./neo/hyperspace.js?v=20261126')
      .then(() => { state.intro = reduce ? 1 : 0; })   // fly in from deep space
      .catch((err) => { console.error('The eagle failed to load', err); });
  }
  const TRIGGERS = ['pointerdown', 'pointermove', 'touchstart', 'wheel', 'keydown', 'scroll'];
  function onFirstInput(e) {
    if (e.type === 'scroll' && window.scrollY < 40) return;     // ignore the page settling at the top
    loadScene();
  }
  function scheduleScene() {
    TRIGGERS.forEach((t) => window.addEventListener(t, onFirstInput, { passive: true, capture: true }));
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1));
    const later = () => setTimeout(() => idle(loadScene, { timeout: 2000 }), 4500);
    if (document.readyState === 'complete') later(); else window.addEventListener('load', later, { once: true });
  }
  // the 3D eagle is on screen: fade the still out, then remove it
  window.addEventListener('neo:scene', () => {
    if (!poster) return;
    const p = poster;
    p.classList.add('is-leaving');
    setTimeout(() => { p.remove(); if (poster === p) poster = null; }, 1600);
  }, { once: true });
  if (window.agila && window.agila.ready) start();
  else window.addEventListener('agila:ready', start, { once: true });
})();
