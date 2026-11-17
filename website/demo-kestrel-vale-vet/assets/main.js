(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // header border on scroll
  var header = document.querySelector('.header');
  function onScrollHeader(){ if(header) header.classList.toggle('scrolled', window.scrollY > 10); }

  // parallax layers: data-speed = fraction of scroll
  var layers = Array.prototype.slice.call(document.querySelectorAll('[data-speed]'));
  var ticking = false;
  function parallax(){
    var vh = window.innerHeight;
    layers.forEach(function(el){
      var host = el.closest('[data-px]') || el.parentElement;
      var r = host.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var offset = (r.top + r.height/2 - vh/2);
      var s = parseFloat(el.getAttribute('data-speed'));
      el.style.transform = 'translate3d(0,' + (offset * s).toFixed(1) + 'px,0)';
    });
    ticking = false;
  }
  window.addEventListener('scroll', function(){
    onScrollHeader();
    if (!reduce && !ticking){ ticking = true; requestAnimationFrame(parallax); }
  }, {passive:true});
  window.addEventListener('resize', function(){ if(!reduce) parallax(); });
  onScrollHeader(); if(!reduce) parallax();

  // mobile nav
  var burger = document.querySelector('.burger'), nav = document.querySelector('.nav');
  if (burger && nav){
    burger.addEventListener('click', function(){
      var open = nav.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
      document.body.classList.toggle('menu-open', open);
    });
  }

  // desktop nav: sliding highlight pill
  if (nav) {
    var pill = document.createElement('span'); pill.className = 'nav-pill'; pill.setAttribute('aria-hidden', 'true'); nav.insertBefore(pill, nav.firstChild);
    var cur = nav.querySelector('a[aria-current="page"]:not(.btn)');
    function moveTo(a, instant) {
      if (!a) { pill.style.opacity = 0; return; }
      if (instant) pill.style.transition = 'none';
      pill.style.opacity = 1; pill.style.left = a.offsetLeft + 'px'; pill.style.top = a.offsetTop + 'px';
      pill.style.width = a.offsetWidth + 'px'; pill.style.height = a.offsetHeight + 'px';
      if (instant) { pill.offsetWidth; pill.style.transition = ''; }
    }
    nav.querySelectorAll('a:not(.btn)').forEach(function (a) {
      a.addEventListener('mouseenter', function () { moveTo(a); });
      a.addEventListener('focus', function () { moveTo(a); });
    });
    nav.addEventListener('mouseleave', function () { moveTo(cur); });
    function init() { if (window.innerWidth > 1080) moveTo(cur, true); }
    window.addEventListener('resize', init); window.addEventListener('load', init); setTimeout(init, 900);
  }

  // forms: no backend in the demo
  document.querySelectorAll('form[data-demo]').forEach(function(f){
    f.addEventListener('submit', function(e){
      e.preventDefault();
      f.classList.add('sent');
      var ok = f.querySelector('.ok'); if (ok) ok.focus && ok.focus();
    });
  });
  document.querySelectorAll('form[data-news]').forEach(function(f){
    f.addEventListener('submit', function(e){
      e.preventDefault();
      var b = f.querySelector('button'); if (b) b.textContent = 'Subscribed';
    });
  });

  // highlight today in hours tables
  var d = new Date().getDay();
  document.querySelectorAll('[data-day="' + d + '"]').forEach(function(tr){ tr.classList.add('today'); });

  // article filters
  var fbtns = document.querySelectorAll('.filters button');
  fbtns.forEach(function(b){
    b.addEventListener('click', function(){
      fbtns.forEach(function(x){ x.classList.remove('on'); x.setAttribute('aria-pressed','false'); });
      b.classList.add('on'); b.setAttribute('aria-pressed','true');
      var c = b.getAttribute('data-f');
      document.querySelectorAll('.posts .post').forEach(function(p){
        p.style.display = (c === 'all' || p.getAttribute('data-c') === c) ? '' : 'none';
      });
    });
  });

  // services side nav active state
  var blocks = document.querySelectorAll('.svc-block');
  if (blocks.length && 'IntersectionObserver' in window){
    var links = document.querySelectorAll('.svc-nav a');
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (en.isIntersecting){
          links.forEach(function(l){ l.classList.toggle('on', l.getAttribute('href') === '#' + en.target.id); });
        }
      });
    }, {rootMargin:'-40% 0px -55% 0px'});
    blocks.forEach(function(b){ io.observe(b); });
  }

  // booking wizard
  var bk = document.querySelector('#booking');
  if (bk){
    var panels = bk.querySelectorAll('.bk-panel'), tabs = bk.querySelectorAll('.bk-steps span'), i = 0;
    function show(n){
      i = n;
      panels.forEach(function(p,k){ p.classList.toggle('on', k === n); });
      tabs.forEach(function(t,k){ t.classList.toggle('on', k === n); t.classList.toggle('done', k < n); });
      bk.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block:'start'});
    }
    bk.querySelectorAll('[data-next]').forEach(function(b){ b.addEventListener('click', function(){
      var cur = panels[i], bad = null;
      cur.querySelectorAll('[required]').forEach(function(f){ if(!bad && !f.value) bad = f; });
      if (bad){ bad.focus(); bad.reportValidity && bad.reportValidity(); return; }
      show(i + 1);
      if (i === panels.length - 1) fillSummary();
    }); });
    bk.querySelectorAll('[data-prev]').forEach(function(b){ b.addEventListener('click', function(){ show(i - 1); }); });

    // build next 14 open days
    var days = bk.querySelector('.days');
    if (days){
      var names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], dt = new Date(), html = '', c = 0;
      while (c < 14){
        dt.setDate(dt.getDate() + 1);
        var v = dt.toISOString().slice(0,10);
        html += '<label><input type="radio" name="day" value="' + v + '"' + (c===0?' checked':'') + '><span><small>' + names[dt.getDay()] + '</small><b>' + dt.getDate() + '</b><small>' + dt.toLocaleString('en-AU',{month:'short'}) + '</small></span></label>';
        c++;
      }
      days.innerHTML = html;
    }
    function val(n){ var el = bk.querySelector('[name="' + n + '"]:checked') || bk.querySelector('[name="' + n + '"]'); return el ? el.value : ''; }
    function fillSummary(){
      var s = bk.querySelector('#bk-summary'); if(!s) return;
      var day = val('day'); var nice = day ? new Date(day + 'T12:00').toLocaleDateString('en-AU',{weekday:'long', day:'numeric', month:'long'}) : '';
      s.innerHTML = '<tr><td>Pet</td><td>' + esc(val('petname')) + ' (' + esc(val('species')) + ')</td></tr>' +
        '<tr><td>Visit</td><td>' + esc(val('reason')) + '</td></tr>' +
        '<tr><td>Vet</td><td>' + esc(val('vet')) + '</td></tr>' +
        '<tr><td>When</td><td>' + esc(nice) + ', ' + esc(val('slot')) + '</td></tr>';
    }
    function esc(t){ return String(t).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    bk.addEventListener('submit', function(e){
      e.preventDefault();
      bk.querySelector('.bk-final').style.display = 'none';
      bk.querySelector('.bk-done').style.display = 'block';
    });
  }
})();
