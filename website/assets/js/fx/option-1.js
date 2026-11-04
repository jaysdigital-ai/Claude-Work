/* ==========================================================================
   Option 1 · Editorial
   Kinetic type: letters that react to the cursor, paragraphs that fill with
   ink as you read, headings that lean with scroll speed, a running skills
   marquee and outline numerals on Services.
   ========================================================================== */
const { gsap, ScrollTrigger } = window;
const { animate, finePointer } = window.agila;
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* Split an element's words (already wrapped by main.js) into letters ------- */
function splitChars(root) {
  const chars = [];
  $$('.line > span > *', root).forEach((word) => {
    const text = word.textContent;
    word.textContent = '';
    [...text].forEach((c) => {
      const s = document.createElement('span');
      s.className = 'fx-ch';
      s.textContent = c;
      word.appendChild(s);
      chars.push(s);
    });
  });
  return chars;
}

/* Letters lift and tilt away from the pointer ------------------------------ */
function letterField(el, { reach = 170, lift = 34, tilt = 14 } = {}) {
  const chars = splitChars(el);
  if (!finePointer || !animate) return;
  const state = chars.map(() => ({ y: 0, r: 0, ty: 0, tr: 0 }));
  let px = -9999, py = -9999, active = false, running = false;
  const zone = el.closest('section') || el;
  zone.addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; active = true; kick(); });
  zone.addEventListener('pointerleave', () => { active = false; kick(); });
  function kick() { if (!running) { running = true; requestAnimationFrame(tick); } }
  function tick() {
    let moving = false;
    chars.forEach((c, i) => {
      const s = state[i];
      if (active) {
        const r = c.getBoundingClientRect();
        const dx = r.left + r.width / 2 - px, dy = r.top + r.height / 2 - py;
        const f = Math.max(0, 1 - Math.hypot(dx, dy) / reach);
        const ease = f * f * (3 - 2 * f);
        s.ty = -lift * ease;
        s.tr = (dx > 0 ? 1 : -1) * tilt * ease;
      } else { s.ty = 0; s.tr = 0; }
      s.y += (s.ty - s.y) * 0.16;
      s.r += (s.tr - s.r) * 0.16;
      if (Math.abs(s.ty - s.y) > 0.05 || Math.abs(s.tr - s.r) > 0.05) moving = true;
      c.style.transform = `translate3d(0, ${s.y.toFixed(2)}px, 0) rotate(${s.r.toFixed(2)}deg)`;
      c.classList.toggle('is-hot', Math.abs(s.y) > lift * 0.45);
    });
    if (moving || active) requestAnimationFrame(tick); else running = false;
  }
}
$$('.page-hero h1').forEach((h) => letterField(h));
$$('.cta h2').forEach((h) => letterField(h, { reach: 260, lift: 60, tilt: 10 }));

/* Paragraphs fill with ink as they scroll past ----------------------------- */
function inkFill(p) {
  const words = [];
  const frag = document.createDocumentFragment();
  [...p.childNodes].forEach((node) => {
    if (node.nodeType !== 3) { frag.appendChild(node); words.push(node); return; }
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
      const w = document.createElement('span');
      w.className = 'fx-w';
      w.textContent = part;
      frag.appendChild(w);
      words.push(w);
    });
  });
  p.textContent = '';
  p.appendChild(frag);
  if (!animate) return;
  gsap.fromTo(words, { opacity: 0.3 }, {
    opacity: 1, ease: 'none', stagger: 0.1,
    scrollTrigger: { trigger: p, start: 'top 82%', end: 'bottom 48%', scrub: 0.4 },
  });
}
$$('.story__text p, .svc__body > p, .cta__row p, .head-row p').forEach(inkFill);

/* Headings lean with scroll speed ------------------------------------------ */
if (animate) {
  const heads = $$('main h2:not(.cta h2)');
  const setters = heads.map((h) => gsap.quickTo(h, 'skewY', { duration: 0.5, ease: 'power3.out' }));
  let settle = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      const skew = gsap.utils.clamp(-5, 5, self.getVelocity() / -400);
      setters.forEach((set) => set(skew));
      // straighten up once scrolling stops, even after an abrupt stop
      clearTimeout(settle);
      settle = setTimeout(() => setters.forEach((set) => set(0)), 120);
    },
  });
}

/* About: "a·gi·la" types itself, then the caret keeps blinking ------------- */
$$('.define b').forEach((b) => {
  const text = b.textContent;
  b.innerHTML = '<span class="fx-type"></span><i class="fx-caret" aria-hidden="true"></i>';
  b.setAttribute('aria-label', text);
  const out = b.firstChild;
  if (!animate) { out.textContent = text; return; }
  ScrollTrigger.create({
    trigger: b, start: 'top 85%', once: true,
    onEnter: () => {
      [...text].forEach((c, i) => setTimeout(() => { out.textContent += c; }, 260 + i * 120));
    },
  });
});

/* About: the skills list becomes two marquees that speed up as you scroll -- */
$$('.skills').forEach((ul) => {
  const items = $$('li', ul).map((li) => li.textContent);
  const half = Math.ceil(items.length / 2);
  const rows = [items.slice(0, half), items.slice(half)];
  const box = document.createElement('div');
  box.className = 'fx-marquee';
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML = rows.map((row, r) => {
    const run = row.map((t, i) => `<span>${t}</span><i>${(i + r) % 2 ? '✦' : '◦'}</i>`).join('');
    return `<div class="fx-marquee__row${r ? ' fx-marquee__row--alt' : ''}"><div class="fx-marquee__track">${run}${run}${run}</div></div>`;
  }).join('');
  ul.classList.add('fx-sr');
  ul.after(box);
  if (!animate) return;
  const tracks = $$('.fx-marquee__track', box);
  const pos = [0, 0];
  let boost = 0;
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => { boost = Math.min(8, Math.abs(self.getVelocity()) / 300); } });
  let hover = 1;
  box.addEventListener('pointerenter', () => { hover = 0.25; });
  box.addEventListener('pointerleave', () => { hover = 1; });
  gsap.ticker.add((t, dt) => {
    boost *= 0.94;
    tracks.forEach((tr, i) => {
      const w = tr.scrollWidth / 3;
      pos[i] -= (0.04 + boost * 0.05) * dt * hover * (i ? -1 : 1);
      pos[i] = ((pos[i] % w) - w) % w;
      tr.style.transform = `translate3d(${pos[i]}px, 0, 0)`;
    });
  });
});

/* About: the portrait opens like a shutter --------------------------------- */
if (animate) {
  $$('.portrait:not(.bio)').forEach((fig) => {
    gsap.fromTo(fig, { clipPath: 'inset(18% 12% 18% 12%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
      scrollTrigger: { trigger: fig, start: 'top 95%', end: 'top 35%', scrub: true },
    });
    const ph = fig.querySelector('.portrait__ph b, img');
    if (ph) gsap.fromTo(ph, { scale: 1.35 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

/* Services: giant outline numerals behind each heading --------------------- */
const services = $$('.svc');
services.forEach((svc, i) => {
  const head = svc.querySelector('.svc__head');
  const n = document.createElement('span');
  n.className = 'fx-bignum';
  n.setAttribute('aria-hidden', 'true');
  n.textContent = String(i + 1).padStart(2, '0');
  head.prepend(n);
  if (animate) {
    gsap.fromTo(n, { yPercent: 40, opacity: 0 }, {
      yPercent: -30, opacity: 1, ease: 'none',
      scrollTrigger: { trigger: svc, start: 'top 90%', end: 'bottom 40%', scrub: true },
    });
  }
});

/* Services: "What's included" lines draw in one after another -------------- */
if (animate) {
  $$('.svc__cols .list').forEach((list) => {
    gsap.from(list.children, {
      '--fx-line': 0, x: -14, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06,
      scrollTrigger: { trigger: list, start: 'top 88%' },
    });
  });
}

ScrollTrigger.refresh();
