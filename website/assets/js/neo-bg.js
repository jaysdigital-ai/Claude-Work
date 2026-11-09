/* ==========================================================================
   Inner pages: the neon eagle, loaded light.
   Building the 3D scene (the 3D library, the artwork, the graphics code) is
   the heaviest work on the page, so it waits until the visitor first moves,
   touches, scrolls or types, or until the browser is idle a few seconds
   after loading. Until then a still of the eagle (the poster) stands in at
   the same spot beside the page title, follows the same path as you scroll,
   then fades out as the 3D eagle flies in. The scene itself lives in
   assets/js/neo/inner-scene.js.
   ========================================================================== */
const small = () => innerWidth < 900;
const asked = new URLSearchParams(location.search).get('scene');
const kind = ['stars', 'grid', 'signal', 'showcase', 'updraft', 'growth'].includes(asked) ? asked : (document.body.dataset.scene || 'stars');

const host = document.createElement('div');
host.className = 'neo-stage';
host.dataset.neoBg = '';
host.setAttribute('aria-hidden', 'true');

let poster = new Image(512, 512);
poster.className = 'neo-poster';
poster.alt = '';
poster.decoding = 'async';
poster.fetchPriority = 'high';
poster.src = new URL('../img/neon-eagle.jpg', import.meta.url).href;
host.appendChild(poster);
document.body.prepend(host);

/* The poster sits where the 3D eagle will be (the same numbers as in
   inner-scene.js): beside the title, rising and shrinking as you scroll. */
const hero = document.querySelector('.page-hero');
const mix = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
function place() {
  if (!poster) return;
  const W = host.clientWidth || innerWidth, H = host.clientHeight || innerHeight;
  const heroH = hero ? hero.offsetHeight : H;
  const t = ease(Math.min(1, Math.max(0, window.scrollY / (heroH * 0.85))));
  const phone = small();
  const from = phone ? { x: 0.72, y: 0.2, s: Math.min(W * 0.62, H * 0.32), o: 0.7 }
    : { x: kind === 'signal' ? 0.8 : 0.78, y: kind === 'grid' ? 0.4 : 0.44, s: Math.min(W * 0.4, H * 0.66), o: 1 };
  const to = phone ? { x: 0.86, y: 0.1, s: W * 0.3, o: 0.12 } : { x: 0.9, y: 0.16, s: H * 0.24, o: 0.22 };
  const size = mix(from.s, to.s, t);
  poster.style.width = size.toFixed(1) + 'px';
  poster.style.transform = `translate(${(mix(from.x, to.x, t) * W - size / 2).toFixed(1)}px, ${(mix(from.y, to.y, t) * H - size / 2).toFixed(1)}px)`;
  poster.style.opacity = mix(from.o, to.o, t).toFixed(3);
}
let queued = false;
const queuePlace = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; place(); }); } };
place();
window.addEventListener('scroll', queuePlace, { passive: true });
window.addEventListener('resize', queuePlace);

/* Load the 3D scene on the first input, or when the browser is idle ---------- */
let sceneRequested = false;
const TRIGGERS = ['pointerdown', 'pointermove', 'touchstart', 'wheel', 'keydown', 'scroll'];
function loadScene() {
  if (sceneRequested) return;
  sceneRequested = true;
  TRIGGERS.forEach((t) => window.removeEventListener(t, onFirstInput, true));
  import('./neo/inner-scene.js?v=20261127').catch((err) => { console.error('The eagle failed to load', err); });
}
function onFirstInput(e) {
  if (e.type === 'scroll' && window.scrollY < 40) return;     // ignore the page settling at the top
  loadScene();
}
TRIGGERS.forEach((t) => window.addEventListener(t, onFirstInput, { passive: true, capture: true }));
const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1));
const later = () => setTimeout(() => idle(loadScene, { timeout: 2000 }), 4500);
if (document.readyState === 'complete') later(); else window.addEventListener('load', later, { once: true });

// the 3D eagle is on screen: fade the still out, then remove it
window.addEventListener('neo:scene', () => {
  if (!poster) return;
  const p = poster;
  p.classList.add('is-leaving');
  setTimeout(() => {
    p.remove();
    poster = null;
    window.removeEventListener('scroll', queuePlace);
    window.removeEventListener('resize', queuePlace);
  }, 1600);
}, { once: true });
