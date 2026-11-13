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

// Tasmanian transfer duty (general rate)
function duty(v) {
  if (v <= 3000) return 50;
  if (v <= 25000) return 50 + (v - 3000) * 0.0175;
  if (v <= 75000) return 435 + (v - 25000) * 0.0225;
  if (v <= 200000) return 1560 + (v - 75000) * 0.035;
  if (v <= 375000) return 5935 + (v - 200000) * 0.04;
  if (v <= 725000) return 12935 + (v - 375000) * 0.0425;
  return 27810 + (v - 725000) * 0.045;
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
