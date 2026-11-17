/* Kestrel Vale demo: scroll and interaction animations */
(function () {
  window.__animReady = true;
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // reading progress bar
  var bar = document.createElement('div'); bar.className = 'scroll-progress'; bar.setAttribute('aria-hidden', 'true'); document.body.appendChild(bar);

  if (reduce || !('IntersectionObserver' in window)) {
    root.classList.remove('js-anim');
    window.addEventListener('scroll', function () {
      var m = document.body.scrollHeight - innerHeight; bar.style.transform = 'scaleX(' + (m > 0 ? scrollY / m : 0) + ')';
    }, { passive: true });
    return;
  }

  // ---------- word-by-word headline reveals ----------
  function splitWords(el) {
    if (el.children.length || el.classList.contains('wsplit')) return;
    var words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(function (w, i) { return '<span class="w"><span style="--i:' + i + '">' + w + '</span></span>'; }).join(' ');
    el.classList.add('wsplit');
  }
  function now(el) { requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('in'); }); }); }

  $$('.hero-copy h1, .phero h1').forEach(function (h) { if (h.children.length) h.classList.add('wsplit', 'a-hero'); else splitWords(h); now(h); });
  $$('.crumbs, .hero-copy .lede, .phero .lede, .hero-ctas, .hero-meta').forEach(function (el, i) {
    el.classList.add('a-hero'); el.style.setProperty('--d', (.35 + i * .12) + 's'); now(el);
  });
  $$('.hero-photo').forEach(function (el) { el.classList.add('a-photo'); now(el); });

  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); if (e.target._onIn) e.target._onIn(); } });
  }, { rootMargin: '0px 0px -10% 0px', threshold: .08 });
  function inHero(el) { return !!el.closest('.hero, .phero'); }
  function tag(sel, cls, stagger) {
    $$(sel).forEach(function (el) {
      if (inHero(el) || el.classList.contains('rv')) return;
      el.classList.add('rv', cls);
      if (stagger) { var idx = Array.prototype.indexOf.call(el.parentNode.children, el); el.style.setProperty('--d', (idx % 6) * .08 + 's'); }
      io.observe(el);
    });
  }

  $$('.sec-head h2, .split h2, .cta h2, .featured h2, .emerg h3, .pband blockquote, .svc-block h2, .card > h2').forEach(function (h) {
    if (inHero(h)) return; splitWords(h); h.classList.add('rv'); io.observe(h);
  });
  tag('.sec-head .lede, .split > div > .lede, .split > div > p, .pband cite, .sample-note', 'a-up');
  tag('.checks li', 'a-up', true);
  tag('.svc-grid .svc, .values .value, .steps .step, .plans .plan, .posts .post, .team .member, .facil .f, .grid3 > .card, .grid2 > .card, .quotes .q, .season .s, .stats > div, .timeline .tl, .contact-list li, .faq details, aside > .card, .svc-block .box', 'a-up', true);
  tag('.map, .table, .featured, form.card, .filters, .news', 'a-zoom');
  $$('.split > .art').forEach(function (a) {
    var left = a.getBoundingClientRect().left < a.parentNode.getBoundingClientRect().left + a.parentNode.clientWidth / 2;
    tag2(a, left ? 'a-left' : 'a-right');
  });
  function tag2(el, cls) { if (inHero(el)) return; el.classList.add('rv', cls); io.observe(el); }

  // image frames: clip reveal + zoom-out on entry
  var frames = $$('.art, .post .thumb, .member .ph, .featured .thumb, .facil .f .art').filter(function (f) { return !inHero(f); });
  frames.forEach(function (f) { f.classList.add('a-clip'); if (!f.classList.contains('rv')) { f.classList.add('rv'); io.observe(f); } });

  // count-up stats
  $$('.stats b').forEach(function (b) {
    var m = b.textContent.match(/^(\d+(?:\.\d+)?)(.*)$/); if (!m) return;
    var end = parseFloat(m[1]), dec = (m[1].split('.')[1] || '').length, rest = m[2];
    b.textContent = (0).toFixed(dec) + rest;
    var host = b.parentNode;
    host._onIn = function () {
      var t0 = performance.now(), dur = 1400;
      (function step(t) {
        var p = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 3);
        b.textContent = (end * e).toFixed(dec) + rest; if (p < 1) requestAnimationFrame(step);
      })(t0);
    };
  });

  // ---------- scroll-linked effects ----------
  var scrubImgs = frames.map(function (f) { return f.querySelector(':scope > img, :scope > svg'); }).filter(Boolean);
  scrubImgs.forEach(function (im) { im.classList.add('scrub'); });
  var zoomBands = $$('.cta, .emerg');
  var drift = $$('.sec-head, .pband .wrap');
  var marquees = $$('.marquee .track').map(function (t) { return { el: t, x: 0 }; });
  var lastY = scrollY, vel = 0, vh = innerHeight;
  window.addEventListener('resize', function () { vh = innerHeight; });

  function prog(r) { return clamp((vh - r.top) / (vh + r.height), 0, 1); }
  function tick() {
    var y = scrollY, max = document.body.scrollHeight - vh;
    bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    vel += ((y - lastY) - vel) * .2; lastY = y;

    scrubImgs.forEach(function (im) {
      var r = im.parentNode.getBoundingClientRect(); if (r.bottom < -50 || r.top > vh + 50) return;
      var p = prog(r);
      im.style.setProperty('--s', (1.2 - .12 * clamp(p * 1.3, 0, 1)).toFixed(4));
      im.style.setProperty('--ty', ((.5 - p) * r.height * .06).toFixed(1) + 'px');
    });
    zoomBands.forEach(function (b) {
      var r = b.getBoundingClientRect(); if (r.bottom < -50 || r.top > vh + 50) return;
      var p = clamp((vh - r.top) / (vh * .7), 0, 1), e = 1 - Math.pow(1 - p, 2);
      b.style.transform = 'scale(' + (.88 + .12 * e).toFixed(4) + ')'; b.style.opacity = (.35 + .65 * e).toFixed(3);
    });
    drift.forEach(function (d) {
      var r = d.getBoundingClientRect(); if (r.bottom < -50 || r.top > vh + 50) return;
      d.style.transform = 'translate3d(0,' + ((.5 - prog(r)) * 36).toFixed(1) + 'px,0)';
    });
    requestAnimationFrame(tick);
  }

  // marquee: steady drift that speeds up with scroll velocity
  var lt = performance.now();
  function mq(t) {
    var dt = Math.min(.05, (t - lt) / 1000); lt = t;
    marquees.forEach(function (m) {
      var half = m.el.scrollWidth / 2;
      m.x -= (60 + Math.abs(vel) * 9) * dt; if (-m.x >= half) m.x += half;
      m.el.style.transform = 'translate3d(' + m.x.toFixed(1) + 'px,0,0) skewX(' + clamp(-vel * .25, -8, 8).toFixed(2) + 'deg)';
    });
    requestAnimationFrame(mq);
  }
  requestAnimationFrame(tick); if (marquees.length) requestAnimationFrame(mq);

  // ---------- pointer effects ----------
  if (fine) {
    $$('.value, .q, .member .ph, .post .thumb, .plan:not(.feat), .card .ic').forEach(function (c) {
      if (c.matches('.card .ic')) return;
      c.classList.add('tilt');
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        c.style.transform = 'perspective(900px) rotateY(' + (x * 8).toFixed(2) + 'deg) rotateX(' + (-y * 8).toFixed(2) + 'deg) translateY(-4px)';
        c.style.setProperty('--gx', (x + .5) * 100 + '%'); c.style.setProperty('--gy', (y + .5) * 100 + '%');
      });
      c.addEventListener('pointerleave', function () { c.style.transform = ''; });
    });
    $$('.btn-primary, .btn-dark').forEach(function (b) {
      if (b.closest('#booking')) return;
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .18).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * .25).toFixed(1) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }
})();
