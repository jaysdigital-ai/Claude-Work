(function(){
  var body=document.body, reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hdr=document.querySelector('.hdr'), pill=document.querySelector('.book-pill');
  var hero=document.querySelector('.hero,.page-hero');
  if(pill && document.querySelector('.bk')){ pill.remove(); pill=null; }

  /* Header turns solid once you scroll past the top of the dark hero */
  function onScroll(){
    var y=window.scrollY;
    hdr.classList.toggle('solid', y>40);
    if(pill && hero) pill.classList.toggle('show', y>hero.offsetHeight*0.7);
  }
  window.addEventListener('scroll',onScroll,{passive:true}); onScroll();

  /* Mobile menu */
  document.querySelectorAll('[data-menu]').forEach(function(b){
    b.addEventListener('click',function(){
      var open=!body.classList.contains('menu-open');
      body.classList.toggle('menu-open',open);
      document.querySelector('.menu-btn').setAttribute('aria-expanded',open);
    });
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape')body.classList.remove('menu-open')});

  /* Next available slot (clinic hours Mon-Sat 8-5, Philippine time) */
  var slot=document.querySelector('[data-next]');
  if(slot){
    var now=new Date(Date.now()+(new Date().getTimezoneOffset()+480)*60000);
    var d=new Date(now), h=now.getHours();
    if(d.getDay()===0||h>=16){ d.setDate(d.getDate()+1); h=8; }
    while(d.getDay()===0) d.setDate(d.getDate()+1);
    var hour=Math.max(9,h+1);
    var sameDay=d.toDateString()===now.toDateString();
    var label=(sameDay?'Today':d.toLocaleDateString('en-PH',{weekday:'long'}))+' at '+(hour>12?hour-12:hour)+':00 '+(hour>=12?'PM':'AM');
    slot.textContent='Next opening: '+label;
  }

  /* Parallax inside arches: the image drifts within its frame */
  var par=[].slice.call(document.querySelectorAll('[data-par]'));
  /* Horizontal scroll section */
  var hs=document.querySelector('.hs'), track=hs&&hs.querySelector('.hs-track'), bar=hs&&hs.querySelector('.hs-progress i');
  function sizeHs(){
    if(!hs) return;
    if(window.innerWidth<=1000||reduce){hs.style.height='';return;}
    var extra=track.scrollWidth-window.innerWidth;
    hs.style.height=(window.innerHeight+Math.max(0,extra))+'px';
  }
  var ticking=false;
  function frame(){
    var vh=window.innerHeight;
    if(!reduce) par.forEach(function(img){
      var r=img.parentElement.getBoundingClientRect();
      if(r.bottom<0||r.top>vh) return;
      var p=(r.top+r.height/2-vh/2)/vh;
      img.style.transform='translate3d(0,'+(-13-p*16).toFixed(2)+'%,0)';
    });
    if(hs&&window.innerWidth>1000&&!reduce){
      var r=hs.getBoundingClientRect(), total=hs.offsetHeight-vh;
      var p=Math.min(1,Math.max(0,-r.top/total));
      var extra=track.scrollWidth-window.innerWidth;
      track.style.transform='translate3d('+(-p*extra).toFixed(1)+'px,0,0)';
      if(bar) bar.style.width=(p*100)+'%';
    }
    ticking=false;
  }
  function req(){if(!ticking){ticking=true;requestAnimationFrame(frame)}}
  window.addEventListener('scroll',req,{passive:true});
  window.addEventListener('resize',function(){sizeHs();req()});
  window.addEventListener('load',function(){sizeHs();req()});
  sizeHs(); frame();

  /* Review slider */
  var slides=[].slice.call(document.querySelectorAll('.slide')), cur=0, cnt=document.querySelector('.slide-count');
  function show(i){ if(!slides.length) return; cur=(i+slides.length)%slides.length; slides.forEach(function(s,k){s.classList.toggle('on',k===cur)}); if(cnt) cnt.textContent=(cur+1)+' / '+slides.length; }
  document.querySelectorAll('[data-slide]').forEach(function(b){b.addEventListener('click',function(){show(cur+(+b.dataset.slide))})});
  show(0);

  /* Tabs */
  var tabs=[].slice.call(document.querySelectorAll('[role="tab"]'));
  tabs.forEach(function(t){
    t.addEventListener('click',function(){
      tabs.forEach(function(x){x.setAttribute('aria-selected','false');document.getElementById(x.getAttribute('aria-controls')).classList.remove('on')});
      t.setAttribute('aria-selected','true');document.getElementById(t.getAttribute('aria-controls')).classList.add('on');
    });
  });
  if(location.hash){ var tt=document.querySelector('[data-tab="'+location.hash.slice(1)+'"]'); if(tt) tt.click(); }

  /* Flip cards */
  document.querySelectorAll('.flip').forEach(function(f){f.addEventListener('click',function(){f.classList.toggle('on');f.setAttribute('aria-pressed',f.classList.contains('on'))})});

  /* Booking widget (demo: nothing is sent) */
  var bk=document.querySelector('.bk');
  if(bk){
    var state={service:null,day:null,time:null}, step=0;
    var stages=bk.querySelectorAll('.bk-stage'), bars=bk.querySelectorAll('.bk-steps span');
    var next=bk.querySelector('.next'), back=bk.querySelector('.back'), err=bk.querySelector('.err');
    function go(n){
      step=n;
      stages.forEach(function(s,k){s.classList.toggle('on',k===n)});
      bars.forEach(function(b,k){b.classList.toggle('on',k<=n)});
      back.hidden=(n===0||n===3);
      next.style.display=(n===3)?'none':'';
      next.textContent=(n===2)?'Confirm booking':'Continue';
      err.textContent='';
      if(n===2){bk.querySelector('[data-sum]').innerHTML='<span><b>Service:</b> '+state.service+'</span><span><b>When:</b> '+state.dayLabel+', '+state.time+'</span>';}
    }
    bk.querySelectorAll('.choice').forEach(function(c){c.addEventListener('click',function(){
      bk.querySelectorAll('.choice').forEach(function(x){x.setAttribute('aria-pressed','false')});
      c.setAttribute('aria-pressed','true'); state.service=c.dataset.v; err.textContent='';
    })});
    // build the next six clinic days
    var daysEl=bk.querySelector('.days'), timesEl=bk.querySelector('.times');
    var base=new Date(Date.now()+(new Date().getTimezoneOffset()+480)*60000), list=[];
    var dd=new Date(base); dd.setDate(dd.getDate()+1);
    while(list.length<6){ if(dd.getDay()!==0) list.push(new Date(dd)); dd.setDate(dd.getDate()+1); }
    list.forEach(function(day){
      var b=document.createElement('button'); b.type='button'; b.setAttribute('aria-pressed','false');
      b.innerHTML='<small>'+day.toLocaleDateString('en-PH',{weekday:'short'})+'</small><b>'+day.getDate()+'</b>';
      b.addEventListener('click',function(){
        daysEl.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed','false')});
        b.setAttribute('aria-pressed','true'); state.day=day; state.time=null;
        state.dayLabel=day.toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric'});
        renderTimes(day); err.textContent='';
      });
      daysEl.appendChild(b);
    });
    function renderTimes(day){
      timesEl.innerHTML='';
      var hrs=day.getDay()===6?[8,9,10,11,13,14]:[8,9,10,11,13,14,15,16];
      hrs.forEach(function(hr,i){
        var t=(hr>12?hr-12:hr)+':00 '+(hr>=12?'PM':'AM');
        var b=document.createElement('button'); b.type='button'; b.textContent=t; b.setAttribute('aria-pressed','false');
        if((day.getDate()*7+i*3)%5===0) b.disabled=true;
        b.addEventListener('click',function(){
          timesEl.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed','false')});
          b.setAttribute('aria-pressed','true'); state.time=t; err.textContent='';
        });
        timesEl.appendChild(b);
      });
    }
    next.addEventListener('click',function(){
      if(step===0&&!state.service){err.textContent='Choose a service to continue.';return;}
      if(step===1&&(!state.day||!state.time)){err.textContent=!state.day?'Choose a day to continue.':'Choose a time to continue.';return;}
      if(step===2){
        var n=bk.querySelector('#bk-name').value.trim(), p=bk.querySelector('#bk-phone').value.replace(/\D/g,'');
        if(!n){err.textContent='Enter your name so we know who is coming in.';return;}
        if(p.length<10){err.textContent='Enter a mobile number with at least 10 digits.';return;}
        bk.querySelector('[data-done]').textContent='See you '+state.dayLabel+' at '+state.time+', '+n.split(' ')[0]+'. We\'ll text '+bk.querySelector('#bk-phone').value.trim()+' the day before as a reminder.';
      }
      go(step+1);
    });
    back.addEventListener('click',function(){go(step-1)});
    go(0);
  }
})();

/* Layered parallax: [data-speed] elements drift at their own speed */
(function(){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var els=[].slice.call(document.querySelectorAll('[data-speed]')), tk=false;
  function run(){
    var vh=innerHeight, k=innerWidth<700?.5:1;
    els.forEach(function(el){
      var r=el.parentElement.getBoundingClientRect(); if(r.bottom<-300||r.top>vh+300) return;
      var d=(r.top+r.height/2-vh/2)*parseFloat(el.dataset.speed)*k;
      el.style.transform='translate3d(0,'+d.toFixed(1)+'px,0)';
    }); tk=false;
  }
  addEventListener('scroll',function(){if(!tk){tk=true;requestAnimationFrame(run)}},{passive:true});
  addEventListener('resize',run); run();
})();

/* 3D tilt on cards (mouse only) */
(function(){
  if(!matchMedia('(hover: hover) and (pointer: fine)').matches||matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.svc-card,.jcard,.role,.comm article,.panel .box').forEach(function(el){
    el.classList.add('tilt');
    el.addEventListener('pointermove',function(e){
      var r=el.getBoundingClientRect(), x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
      el.classList.add('tilting');
      el.style.transform='perspective(800px) rotateX('+(-y*7)+'deg) rotateY('+(x*9)+'deg) translateZ(4px)';
    });
    el.addEventListener('pointerleave',function(){el.classList.remove('tilting');el.style.transform='';});
  });
})();

/* Ask-a-dentist demo form + today's hours */
(function(){
  var f=document.querySelector('[data-ask]');
  if(f) f.addEventListener('submit',function(e){e.preventDefault();var q=f.querySelector('textarea');if(!q.value.trim()){q.focus();return;}f.querySelector('.ask-ok').hidden=false;q.value='';});
  var d=new Date(Date.now()+(new Date().getTimezoneOffset()+480)*60000).getDay();
  document.querySelectorAll('[data-hours] tr[data-d]').forEach(function(tr){if(+tr.dataset.d===d)tr.classList.add('today')});
})();
