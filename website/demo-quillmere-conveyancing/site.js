// Shared page behaviour. The 3D lives in scene.js.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// header: hide on the way down, show on the way up
const head = $('#head'), nav = $('#nav'), menuBtn = $('#menuBtn');
let lastY = 0;
addEventListener('scroll', () => {
  const y = scrollY;
  head.classList.toggle('is-stuck', y > 20);
  if (!nav.classList.contains('is-open')) head.classList.toggle('is-hidden', y > lastY && y > 400);
  lastY = y;
}, { passive: true });
menuBtn.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  menuBtn.setAttribute('aria-expanded', open);
  menuBtn.textContent = open ? 'Close' : 'Menu';
});

// reveals
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -12% 0px' });
$$('.reveal').forEach(el => io.observe(el));

// testimonial switcher (home)
const quotes = $$('#quoteStage blockquote'), names = $$('#quoteNames button');
if (quotes.length) {
  let qi = 0, timer;
  const show = (i, user) => {
    qi = i;
    quotes.forEach((q, k) => q.classList.toggle('is-on', k === i));
    names.forEach((n, k) => n.classList.toggle('is-on', k === i));
    if (user) clearInterval(timer);
  };
  names.forEach((b, i) => b.addEventListener('click', () => show(i, true)));
  if (!reduced) timer = setInterval(() => show((qi + 1) % quotes.length), 7000);
}

// NSW transfer duty, general rate, 2026/27 (Revenue NSW). An estimate: no concessions or surcharges.
function duty(v) {
  if (v <= 18000) return Math.max(20, v * 0.0125);
  if (v <= 38000) return 225 + (v - 18000) * 0.015;
  if (v <= 103000) return 525 + (v - 38000) * 0.0175;
  if (v <= 387000) return 1662 + (v - 103000) * 0.035;
  if (v <= 1290000) return 11602 + (v - 387000) * 0.045;
  return 52237 + (v - 1290000) * 0.055;
}
const price = $('#price'), range = $('#priceRange');
if (price) {
  const dutyOut = $('#dutyOut'), dutyPct = $('#dutyPct');
  const fmt = n => Math.round(n).toLocaleString('en-AU');
  const calc = v => {
    const d = Math.ceil(duty(v));
    dutyOut.textContent = '$' + fmt(d);
    dutyPct.textContent = v > 0 ? (d / v * 100).toFixed(2) + '%' : '—';
    window.__duty = d;
    dispatchEvent(new CustomEvent('duty', { detail: { duty: d } }));
  };
  range.addEventListener('input', () => { price.value = fmt(+range.value); calc(+range.value); });
  price.addEventListener('input', () => {
    const v = +price.value.replace(/[^\d]/g, '') || 0;
    price.value = v ? fmt(v) : '';
    range.value = clamp(v, +range.min, +range.max);
    calc(v);
  });
  calc(+range.value);
}

// enquiry form (demo only: nothing is sent)
const form = $('#enquiry');
if (form) form.addEventListener('submit', e => {
  e.preventDefault();
  const msg = $('#formMsg');
  if (!form.name.value.trim() || !form.email.value || !form.email.validity.valid) {
    msg.textContent = 'Please add your name and a valid email.';
    (form.name.value.trim() ? form.email : form.name).focus();
    return;
  }
  msg.textContent = `Thanks, ${form.name.value.trim().split(' ')[0]}. We’ll be in touch within one business day.`;
  form.reset();
  dispatchEvent(new Event('enquiry-sent'));
});

const yr = $('#yr');
if (yr) yr.textContent = new Date().getFullYear();
