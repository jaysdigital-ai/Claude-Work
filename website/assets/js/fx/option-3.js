/* ==========================================================================
   Option 3 · Hands-on
   Every service gets a small working example to play with (funnel
   calculator, automation run, website preview, drag-and-drop pipeline,
   email sequence, search ranking, before/after design). About gets a
   pronunciation button and a skills filter; Contact builds a live project
   brief as the visitor fills in the form. All numbers are illustrative.
   ========================================================================== */
const { gsap, ScrollTrigger } = window;
const { animate } = window.agila;
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const card = (title, note, body) => el(`
  <div class="fx-demo">
    <div class="fx-demo__head"><span><i></i>Try it · ${title}</span><small>${note}</small></div>
    ${body}
  </div>`);
const onView = (node, fn) => ScrollTrigger.create({ trigger: node, start: 'top 80%', once: true, onEnter: fn });
const tween = (from, to, set, duration = 0.9) => {
  if (!animate) { set(to); return; }
  const o = { v: from };
  gsap.to(o, { v: to, duration, ease: 'power3.out', onUpdate: () => set(o.v) });
};

/* ---------------------------------------------------------------- Services */
const DEMOS = {
  funnels() {
    const RATES = { off: [0.015, 0.2, 0.2], on: [0.06, 0.35, 0.3] };
    const c = card('Funnel calculator', 'Illustrative rates', `
      <label class="fx-range"><span>Monthly visitors <b data-v>5,000</b></span><input type="range" min="500" max="20000" step="500" value="5000"></label>
      <div class="fx-seg" role="group" aria-label="Compare"><button type="button" aria-pressed="false" data-mode="off">Without a funnel</button><button type="button" aria-pressed="true" data-mode="on">With a funnel</button></div>
      <div class="fx-funnel">${['Visitors', 'Leads', 'Booked calls', 'New clients'].map((n) => `<div class="fx-funnel__row"><span>${n}</span><div class="fx-funnel__bar"><i></i></div><b>0</b></div>`).join('')}</div>`);
    const input = c.querySelector('input');
    const rows = $$('.fx-funnel__row', c);
    let mode = 'on';
    const shown = [0, 0, 0, 0];
    const update = () => {
      const v = +input.value;
      c.querySelector('[data-v]').textContent = fmt(v);
      const r = RATES[mode];
      const vals = [v, v * r[0], v * r[0] * r[1], v * r[0] * r[1] * r[2]];
      rows.forEach((row, i) => {
        row.querySelector('i').style.width = `${Math.max(3, Math.pow(vals[i] / v, 0.32) * 100)}%`;
        const b = row.querySelector('b');
        tween(shown[i], vals[i], (x) => { shown[i] = x; b.textContent = fmt(x); }, 0.6);
      });
    };
    input.addEventListener('input', update);
    c.querySelector('.fx-seg').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      mode = b.dataset.mode;
      $$('button', c.querySelector('.fx-seg')).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      update();
    });
    onView(c, update);
    return c;
  },

  automation() {
    const steps = [['Form', 'Lead fills in your form'], ['Tag', 'Tagged & added to CRM'], ['Email', 'Welcome email sent'], ['SMS', 'Booking link by text'], ['Alert', 'You get notified']];
    const times = ['0:00', '0:01', '0:02', '0:04', '0:05'];
    const people = ['Maria S.', 'Daniel R.', 'Aisha K.', 'Tom W.', 'Lea M.'];
    const c = card('Automation run', 'Simulated', `
      <div class="fx-flow">${steps.map(([s, d]) => `<div class="fx-flow__node"><b>${s}</b><span>${d}</span></div>`).join('<i class="fx-flow__wire"><u></u></i>')}</div>
      <div class="fx-flow__foot"><button type="button" class="fx-btn">Simulate a new lead</button><ol class="fx-log" aria-live="polite"></ol></div>`);
    const nodes = $$('.fx-flow__node', c), wires = $$('.fx-flow__wire', c), log = c.querySelector('.fx-log'), btn = c.querySelector('button');
    let n = 0, busy = false;
    btn.addEventListener('click', () => {
      if (busy) return; busy = true; btn.disabled = true;
      const who = people[n++ % people.length];
      nodes.forEach((x) => x.classList.remove('is-on')); wires.forEach((x) => x.classList.remove('is-on'));
      log.innerHTML = '';
      steps.forEach(([, d], i) => setTimeout(() => {
        nodes[i].classList.add('is-on');
        if (wires[i]) wires[i].classList.add('is-on');
        const li = document.createElement('li');
        li.innerHTML = `<time>${times[i]}</time> ${i ? d : `${who} fills in your form`}`;
        log.appendChild(li);
        if (i === steps.length - 1) { busy = false; btn.disabled = false; btn.textContent = 'Run it again'; }
      }, 120 + i * 650));
    });
    return c;
  },

  website() {
    const c = card('Website preview', 'Example layout', `
      <div class="fx-seg" role="group" aria-label="Device"><button type="button" aria-pressed="true" data-d="desk">Desktop</button><button type="button" aria-pressed="false" data-d="phone">Phone</button></div>
      <div class="fx-site">
        <div class="fx-browser" data-d="desk">
          <div class="fx-browser__bar"><i></i><i></i><i></i><span>yourbusiness.example</span></div>
          <div class="fx-browser__page">
            <div class="fx-b fx-b--nav"></div>
            <div class="fx-b fx-b--h1"></div><div class="fx-b fx-b--h1 fx-b--short"></div>
            <div class="fx-b fx-b--p"></div>
            <div class="fx-b fx-b--btn"></div>
            <div class="fx-b fx-b--img"></div>
            <div class="fx-b fx-b--cards"><span></span><span></span><span></span></div>
          </div>
        </div>
        <div class="fx-score"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34"/><circle class="fx-score__arc" cx="40" cy="40" r="34" pathLength="100"/></svg><b>0</b><span>Speed score</span></div>
      </div>`);
    const browser = c.querySelector('.fx-browser');
    c.querySelector('.fx-seg').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      browser.dataset.d = b.dataset.d;
      $$('button', c.querySelector('.fx-seg')).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
    onView(c, () => {
      setTimeout(() => browser.classList.add('is-built'), 500);
      const arc = c.querySelector('.fx-score__arc'), num = c.querySelector('.fx-score b');
      tween(0, 98, (v) => { num.textContent = Math.round(v); arc.style.strokeDashoffset = String(100 - v); }, 2.2);
    });
    return c;
  },

  crm() {
    const cols = ['New', 'Contacted', 'Proposal', 'Won'];
    const deals = [['Brioloo Bakehouse', 1800, 0], ['Molarvia Dental', 3200, 0], ['Kettlewisp Fitness', 2400, 1], ['Arvenhall Law', 4100, 2], ['Lumiquay Studio', 1500, 3]];
    const c = card('Sales pipeline', 'Drag a deal, or tap it to move it on', `
      <div class="fx-kanban">${cols.map((n, i) => `<div class="fx-col" data-col="${i}"><div class="fx-col__head"><b>${n}</b><span>$0</span></div><div class="fx-col__list"></div></div>`).join('')}</div>
      <p class="fx-kanban__won">Won this month: <b>$0</b></p>`);
    const lists = $$('.fx-col__list', c);
    deals.forEach(([name, value, col]) => {
      const d = el(`<button type="button" class="fx-deal" data-value="${value}"><b>${name}</b><span>$${fmt(value)}</span></button>`);
      lists[col].appendChild(d);
    });
    let won = 0;
    const totals = () => {
      $$('.fx-col', c).forEach((col) => {
        const sum = $$('.fx-deal', col).reduce((a, d) => a + +d.dataset.value, 0);
        col.querySelector('.fx-col__head span').textContent = '$' + fmt(sum);
        if (col.dataset.col === '3') { const b = c.querySelector('.fx-kanban__won b'); tween(won, sum, (v) => { b.textContent = '$' + fmt(v); }, 0.7); won = sum; }
      });
    };
    const drop = (deal, list) => {
      const first = deal.getBoundingClientRect();
      list.appendChild(deal);
      const last = deal.getBoundingClientRect();
      if (animate) gsap.from(deal, { x: first.left - last.left, y: first.top - last.top, duration: 0.5, ease: 'power3.out' });
      deal.classList.add('is-landed'); setTimeout(() => deal.classList.remove('is-landed'), 600);
      totals();
    };
    // Pointer drag that also works on touch; a plain tap moves the deal one stage on
    c.addEventListener('pointerdown', (e) => {
      const deal = e.target.closest('.fx-deal'); if (!deal) return;
      const r = deal.getBoundingClientRect();
      const ox = e.clientX - r.left, oy = e.clientY - r.top, sx = e.clientX, sy = e.clientY;
      let ghost = null;
      const move = (ev) => {
        if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
        if (!ghost) {
          ghost = deal.cloneNode(true); ghost.classList.add('fx-deal--ghost');
          ghost.style.width = r.width + 'px'; document.body.appendChild(ghost); deal.classList.add('is-dragging');
        }
        ghost.style.transform = `translate(${ev.clientX - ox}px, ${ev.clientY - oy}px) rotate(3deg)`;
        $$('.fx-col', c).forEach((col) => { const cr = col.getBoundingClientRect(); col.classList.toggle('is-over', ev.clientX > cr.left && ev.clientX < cr.right && ev.clientY > cr.top && ev.clientY < cr.bottom); });
      };
      const up = (ev) => {
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
        const over = c.querySelector('.fx-col.is-over');
        $$('.fx-col', c).forEach((col) => col.classList.remove('is-over'));
        if (ghost) { ghost.remove(); deal.classList.remove('is-dragging'); if (over) drop(deal, over.querySelector('.fx-col__list')); }
        else { const col = +deal.closest('.fx-col').dataset.col; drop(deal, lists[(col + 1) % lists.length]); }
        deal.dataset.justMoved = '1';
      };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    });
    // keyboard: Enter/Space moves it on (pointer clicks are handled above)
    c.addEventListener('click', (e) => {
      const deal = e.target.closest('.fx-deal'); if (!deal) return;
      if (deal.dataset.justMoved) { delete deal.dataset.justMoved; return; }
      const col = +deal.closest('.fx-col').dataset.col; drop(deal, lists[(col + 1) % lists.length]); deal.focus();
    });
    totals();
    return c;
  },

  email() {
    const seq = [
      ['Day 0', 'Welcome', 'Welcome, here’s what happens next', 'Thanks for joining. Over the next week we’ll share…', 62],
      ['Day 2', 'Our story', 'Why we started (and who we help)', 'Most businesses we meet have the same problem…', 51],
      ['Day 4', 'Tips', '3 small fixes that bring in more orders', 'Most of these take less than an hour…', 47],
      ['Day 7', 'Offer', 'Your free strategy call is waiting', 'Book a 30-minute call this week and we’ll…', 44],
    ];
    const c = card('Email sequence', 'Example open rates', `
      <div class="fx-mail">
        <div class="fx-mail__steps" role="tablist">${seq.map(([d, n], i) => `<button type="button" role="tab" aria-selected="${!i}"><small>${d}</small><b>${n}</b></button>`).join('')}</div>
        <div class="fx-mail__view" aria-live="polite">
          <div class="fx-mail__from"><i>A</i><div><b>Your Business</b><span>to you</span></div></div>
          <b class="fx-mail__subject"></b><p class="fx-mail__prev"></p>
          <div class="fx-mail__lines"><span></span><span></span><span></span></div>
          <div class="fx-mail__rate"><span>Open rate</span><div><i></i></div><b></b></div>
        </div>
      </div>`);
    const tabs = $$('[role="tab"]', c), view = c.querySelector('.fx-mail__view');
    let at = 0, auto = null;
    const show = (i) => {
      at = i;
      tabs.forEach((t, j) => t.setAttribute('aria-selected', String(i === j)));
      const [, , subject, prev, rate] = seq[i];
      view.querySelector('.fx-mail__subject').textContent = subject;
      view.querySelector('.fx-mail__prev').textContent = prev;
      view.querySelector('.fx-mail__rate b').textContent = rate + '%';
      view.querySelector('.fx-mail__rate i').style.width = rate + '%';
      if (animate) gsap.fromTo(view, { y: 10, opacity: 0.2 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });
    };
    tabs.forEach((t, i) => t.addEventListener('click', () => { clearInterval(auto); show(i); }));
    show(0);
    onView(c, () => { auto = setInterval(() => show((at + 1) % seq.length), 2600); });
    return c;
  },

  seo() {
    const others = ['competitor-one.example', 'city-directory.example', 'local-listings.example', 'review-hub.example', 'old-blog.example', 'another-studio.example', 'marketplace.example', 'news-site.example'];
    const c = card('Search ranking', 'Scroll to watch it climb · example', `
      <div class="fx-serp">
        <div class="fx-serp__q"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>bakery near me</div>
        <ol class="fx-serp__list">${others.map((o) => `<li><b>${o}</b><span></span></li>`).join('')}<li class="is-you"><b>yourbusiness.example</b><span></span></li></ol>
        <div class="fx-serp__pos">Position <b>#9</b></div>
      </div>`);
    const rows = $$('.fx-serp__list li', c), you = rows[rows.length - 1], posB = c.querySelector('.fx-serp__pos b');
    const H = 38;
    const place = (p) => {           // p: 0 = bottom (#9), 1 = top (#1)
      const rank = 8 - p * 8;        // 8..0
      you.style.transform = `translateY(${rank * H}px)`;
      // rows below your listing step down smoothly as it passes them
      rows.slice(0, -1).forEach((r, i) => { r.style.transform = `translateY(${(i + Math.min(1, Math.max(0, i - rank + 1))) * H}px)`; });
      posB.textContent = '#' + (Math.round(rank) + 1);
      you.classList.toggle('is-top', rank < 0.5);
    };
    place(0);
    ScrollTrigger.create({ trigger: c, start: 'top 85%', end: 'bottom 35%', scrub: true, onUpdate: (s) => place(s.progress) });
    return c;
  },

  graphics() {
    const c = card('Before / after', 'Drag the handle', `
      <div class="fx-ba" style="--split:50%">
        <div class="fx-ad fx-ad--after"><small>Brioloo Bakehouse</small><b>Fresh <em>ensaymada</em>, every morning.</b><span class="fx-ad__cta">Pre-order now</span><i class="fx-ad__sun"></i></div>
        <div class="fx-ad fx-ad--before"><b>BRIOLOO BAKEHOUSE!!! WE HAVE BREAD AND PASTRIES. ORDER NOW. CALL US OR MESSAGE US. OPEN DAILY.</b></div>
        <span class="fx-ba__tag fx-ba__tag--l">Before</span><span class="fx-ba__tag fx-ba__tag--r">After</span>
        <span class="fx-ba__handle"><i></i></span>
        <input type="range" min="0" max="100" value="50" aria-label="Compare before and after">
      </div>`);
    const box = c.querySelector('.fx-ba'), input = c.querySelector('input');
    input.addEventListener('input', () => box.style.setProperty('--split', input.value + '%'));
    onView(c, () => {
      if (!animate) return;
      const o = { v: 50 };
      gsap.timeline().to(o, { v: 82, duration: 0.9, ease: 'power2.inOut' }).to(o, { v: 22, duration: 1.1, ease: 'power2.inOut' }).to(o, { v: 50, duration: 0.8, ease: 'power2.inOut' })
        .eventCallback('onUpdate', () => { input.value = o.v; box.style.setProperty('--split', o.v + '%'); });
    });
    return c;
  },
};

$$('.svc').forEach((svc) => {
  const make = DEMOS[svc.id]; if (!make) return;
  const demo = make();
  const p = svc.querySelector('.svc__body > p');
  p.after(demo);
  if (animate) gsap.from(demo, { y: 50, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: demo, start: 'top 90%' } });
});

/* ------------------------------------------------------------------- About */
$$('.define').forEach((def) => {
  if (!('speechSynthesis' in window)) return;
  const b = el('<button type="button" class="fx-say"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/></svg>Hear it</button>');
  def.querySelector('small').after(b);
  b.addEventListener('click', () => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance('ah-GEE-lah');
    const voice = speechSynthesis.getVoices().find((v) => /^(fil|tl)/i.test(v.lang));
    if (voice) { u.voice = voice; u.text = 'agila'; }
    u.rate = 0.8;
    b.classList.add('is-playing');
    u.onend = () => b.classList.remove('is-playing');
    speechSynthesis.speak(u);
  });
});

// skipped when the Editorial option has already turned the list into a marquee
$$('.skills:not(.fx-sr)').forEach((ul) => {
  const GROUPS = {
    Strategy: ['Funnel strategy', 'Workflow design', 'CRM architecture', 'Content strategy', 'Keyword research', 'Lead scoring'],
    Build: ['Website development', 'Marketing automation', 'Pipeline management', 'Analytics & tracking', 'Technical SEO', 'Email sequences'],
    Design: ['Landing page design', 'Website design', 'Ad creatives', 'Social graphics', 'Brand kits'],
    Growth: ['Conversion copywriting', 'Newsletter campaigns', 'Local SEO', 'A/B testing'],
  };
  const bar = el(`<div class="fx-filter" role="group" aria-label="Filter skills">${['All', ...Object.keys(GROUPS)].map((g, i) => `<button type="button" aria-pressed="${!i}">${g}</button>`).join('')}</div>`);
  ul.before(bar);
  const items = $$('li', ul);
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', bar).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const list = GROUPS[b.textContent];
    items.forEach((li, i) => {
      const on = !list || list.includes(li.textContent);
      li.classList.toggle('is-dim', !on);
      if (on && list && animate) gsap.fromTo(li, { x: -8 }, { x: 0, duration: 0.5, delay: i * 0.012, ease: 'power3.out' });
    });
  });
});

/* ----------------------------------------------------------------- Contact */
const form = document.querySelector('[data-contact-form]');
if (form) {
  const brief = el(`
    <div class="fx-brief" aria-live="polite">
      <div class="fx-brief__head"><span>Your project brief</span><div class="fx-brief__ring"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17"/><circle class="fx-brief__arc" cx="20" cy="20" r="17" pathLength="100"/></svg><b>0%</b></div></div>
      <dl>
        <div><dt>From</dt><dd data-k="who">…</dd></div>
        <div><dt>Help with</dt><dd data-k="services"><span class="fx-brief__empty">Pick a few below</span></dd></div>
        <div><dt>Start</dt><dd data-k="timeline">…</dd></div>
        <div><dt>Goals</dt><dd data-k="message">…</dd></div>
      </dl>
    </div>`);
  const mq = matchMedia('(max-width: 900px)');
  const place = () => { if (mq.matches) form.querySelector('.form__foot').before(brief); else document.querySelector('.contact__aside').appendChild(brief); };
  place(); mq.addEventListener('change', place);
  const arc = brief.querySelector('.fx-brief__arc'), pct = brief.querySelector('.fx-brief__ring b');
  let shown = 0;
  const v = (n) => (form.elements[n]?.value || '').trim();
  const update = () => {
    const name = v('name'), company = v('company'), msg = v('message');
    const services = $$('input[name="services"]:checked', form).map((x) => x.value);
    brief.querySelector('[data-k="who"]').textContent = name ? name + (company ? `, ${company}` : '') : '…';
    brief.querySelector('[data-k="services"]').innerHTML = services.length ? services.map((s) => `<span class="fx-tag">${s}</span>`).join('') : '<span class="fx-brief__empty">Pick a few below</span>';
    brief.querySelector('[data-k="timeline"]').textContent = v('timeline') || '…';
    const words = msg ? msg.split(/\s+/).length : 0;
    brief.querySelector('[data-k="message"]').textContent = words ? `${words} word${words > 1 ? 's' : ''} so far${words < 12 ? ' · a little more helps' : ' · great'}` : '…';
    const done = [name, /\S+@\S+\.\S+/.test(v('email')), services.length, msg.length >= 10].filter(Boolean).length;
    const target = done / 4 * 100;
    tween(shown, target, (x) => { shown = x; pct.textContent = Math.round(x) + '%'; arc.style.strokeDashoffset = String(100 - x); }, 0.6);
    brief.classList.toggle('is-ready', done === 4);
  };
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
}

ScrollTrigger.refresh();
