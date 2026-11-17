/* The Digital Agila — header, hero sequence, pipeline demo, filters. */
(function(){
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $=function(s,c){return (c||document).querySelector(s)};
  var $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};

  $$('.steps-anim').forEach(function(g){Array.prototype.forEach.call(g.children,function(c,i){c.style.setProperty('--i',i)})});
  var hdr=$('.hdr');
  function onS(){if(hdr)hdr.classList.toggle('scrolled',scrollY>8)}
  addEventListener('scroll',onS,{passive:true});onS();
  var burger=$('.burger');
  if(burger)burger.addEventListener('click',function(){setTimeout(function(){burger.setAttribute('aria-expanded',document.body.classList.contains('menu-open')?'true':'false')},0)});

  // Follow-up sequence: items with data-at (ms) appear in order, then the whole thing replays.
  $$('[data-sequence]').forEach(function(root){
    var items=$$('[data-at]',root).sort(function(a,b){return +a.dataset.at - +b.dataset.at});
    var total=+root.dataset.sequence||9000;
    if(reduce){items.forEach(function(i){if(!i.hasAttribute('data-temp'))i.classList.add('on')});return}
    function run(){
      items.forEach(function(i){i.classList.remove('on')});
      items.forEach(function(i){
        setTimeout(function(){i.classList.add('on')},+i.dataset.at);
        if(i.dataset.until)setTimeout(function(){i.classList.remove('on')},+i.dataset.until);
      });
      setTimeout(run,total);
    }
    var started=false;
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting&&!started){started=true;run()}})},{threshold:.25});
    io.observe(root);
  });

  // Pipeline: one highlighted lead moves New -> Contacted -> Booked -> Won.
  $$('[data-pipeline]').forEach(function(p){
    var cols=$$('.pcol',p),card=$('.pcard.hl',p);if(!card||reduce)return;
    var i=0;
    setInterval(function(){
      var vis=cols.filter(function(c){return c.offsetParent!==null});
      i=(i+1)%vis.length;var target=vis[i];var idx=cols.indexOf(target);
      card.style.opacity=0;
      setTimeout(function(){
        target.insertBefore(card,target.children[1]||null);
        var tag=$('.tag',card);
        var labels=['New lead','Replied in 40s','Call booked','Won'];
        if(tag){tag.textContent=labels[idx];tag.classList.toggle('g',idx>=2)}
        card.style.opacity=1;
      },350);
    },2200);
  });

  // Work filters
  var fb=$$('.filters button');
  fb.forEach(function(b){b.addEventListener('click',function(){
    var f=b.dataset.f;fb.forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});
    $$('.case-card[data-k]').forEach(function(c){c.classList.toggle('hide',f!=='all'&&(' '+c.dataset.k+' ').indexOf(' '+f+' ')<0)});
  })});

  // Demos hero: fan of real demo screenshots rotates
  $$('[data-fan]').forEach(function(f){
    var cards=$$('.fan-card',f),order=cards.map(function(_,i){return i});
    function paint(){order.forEach(function(ci,pos){cards[ci].className='fan-card pos'+pos})}
    paint();if(reduce)return;
    setInterval(function(){order.push(order.shift());paint()},3200);
  });

  // Blog hero: search box types topics, results appear
  $$('.bs-q').forEach(function(q){
    var topics=JSON.parse(q.getAttribute('data-topics')),res=$$('.bs-results div');
    if(reduce){q.textContent=topics[0];res.forEach(function(r){r.classList.add('on')});return}
    var ti=0;
    (function type(){
      var w=topics[ti],i=0;res.forEach(function(r){r.classList.remove('on')});
      var iv=setInterval(function(){q.textContent=w.slice(0,++i);if(i>=w.length){clearInterval(iv);
        res.forEach(function(r,k){setTimeout(function(){r.classList.add('on')},250+k*200)});
        setTimeout(function(){ti=(ti+1)%topics.length;type()},3800)}},55);
    })();
  });

  // Contact: live clocks for Manila and Sydney
  var faces=$$('.clk-face'),labels=$$('[data-time]');
  function tick(){
    var now=new Date();
    faces.forEach(function(f){
      var p=new Intl.DateTimeFormat('en-AU',{timeZone:f.dataset.tz,hour:'numeric',minute:'numeric',second:'numeric',hour12:false}).formatToParts(now);
      var g=function(t){return +((p.find(function(x){return x.type===t})||{}).value||0)};
      var h=g('hour')%12,m=g('minute'),s=g('second');
      f.querySelector('.h').style.transform='rotate('+(h*30+m*.5)+'deg)';
      f.querySelector('.m').style.transform='rotate('+(m*6)+'deg)';
      f.querySelector('.s').style.transform='rotate('+(s*6)+'deg)';
    });
    labels.forEach(function(l){l.textContent=new Intl.DateTimeFormat('en-AU',{timeZone:l.dataset.time,hour:'numeric',minute:'2-digit',weekday:'short'}).format(now)});
  }
  if(faces.length){tick();setInterval(tick,1000)}

  // Gentle parallax on hero visuals (desktop)
  var par=$$('.hero-stage,.about-hero-vis,.demo-fan');
  if(!reduce&&matchMedia('(min-width: 900px)').matches&&par.length){
    addEventListener('scroll',function(){par.forEach(function(el){var r=el.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;
      var c=(r.top+r.height/2-innerHeight/2)/innerHeight;el.style.transform='translate3d(0,'+(c*-30).toFixed(1)+'px,0)'})},{passive:true});
  }

  // Contact form: posts to the site's /api/contact (Cloudflare Pages Function)
  var cf=$('#contact-form');
  if(cf){
    var st=cf.querySelector('[name=started]'); if(st) st.value=Date.now();
    var err=cf.querySelector('.form-error'),btn=cf.querySelector('button[type=submit]'),lbl=btn.querySelector('.lbl');
    var live=/thedigitalagila\.com$|\.pages\.dev$|^localhost$/.test(location.hostname);
    cf.addEventListener('submit',function(e){
      e.preventDefault(); if(!cf.reportValidity())return;
      err.classList.remove('on');
      if(!live){err.textContent='This is a preview, so the form is switched off here. On thedigitalagila.com it sends your message to Jayson.';err.classList.add('on');return}
      btn.classList.add('is-loading');lbl.textContent='Sending…';
      fetch(cf.getAttribute('action'),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams(new FormData(cf)).toString()})
        .then(function(r){return r.json().catch(function(){return {}}).then(function(j){return {r:r,j:j}})})
        .then(function(x){
          if(x.r.ok&&x.j.ok){cf.classList.add('is-sent');cf.scrollIntoView({behavior:'smooth',block:'center'})}
          else if(x.r.status===400&&x.j.message){err.textContent=x.j.message;err.classList.add('on')}
          else throw new Error('fail');
        })
        .catch(function(){err.textContent='Sorry, that didn’t go through. Please try again in a moment, or email hello@thedigitalagila.com.';err.classList.add('on')})
        .then(function(){btn.classList.remove('is-loading');lbl.textContent='Send message'});
    });
  }
})();
