/* Southerly Air Co. — page heroes */
(function(){
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero=document.querySelector('[data-hero]');if(!hero)return;
  var kind=hero.getAttribute('data-hero');
  function $(s,c){return (c||document).querySelector(s);} function $$(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s));}
  function every(ms,fn){if(reduce)return;fn();return setInterval(fn,ms);}

  if(kind==='home'){
    // rotating words
    var words=$$('.rot>span',hero),wi=0;
    if(!reduce&&words.length)setInterval(function(){var cur=words[wi];cur.classList.remove('on');cur.classList.add('out');
      setTimeout(function(){cur.classList.remove('out');},800);wi=(wi+1)%words.length;words[wi].classList.add('on');},2600);
    // slideshow
    var sl=$$('.slides .ph',hero),si=0;
    if(!reduce&&sl.length)setInterval(function(){sl[si].classList.remove('on');si=(si+1)%sl.length;sl[si].classList.add('on');},4500);
    // thermostat dial
    var arc=$('#dialArc'),num=$('#dialNum'),modes=$$('.dial .modes span',hero);
    var C=2*Math.PI*84;
    function setT(t){var p=(t-10)/(32-10);arc.style.strokeDashoffset=C*(1-p*0.75);num.textContent=t.toFixed(0)+'°';}
    if(arc){arc.style.strokeDasharray=C;setT(22);
      if(!reduce){var seq=[[31,22,0],[12,21,1],[28,24,2]],k=0;
        (function run(){var s=seq[k%seq.length];k++;modes.forEach(function(m,i){m.classList.toggle('on',i===s[2]);});
          var t=s[0],to=s[1],dir=to>t?1:-1;setT(t);
          var iv=setInterval(function(){t+=dir*0.5;if((dir>0&&t>=to)||(dir<0&&t<=to)){t=to;clearInterval(iv);setTimeout(run,2600);}setT(t);},120);
        })();}}
    // technician ETA
    var eta=$('#eta'),bar=$('.enroute .bar i'),m=14;
    if(eta&&!reduce)setInterval(function(){m=m<=2?14:m-1;eta.textContent=m+' min';bar.style.width=((14-m)/12*85+15)+'%';},1600);
    // checklist (compact)
    var items=['Clean & sanitise filters','Check refrigerant pressure','Test drain & pump','Inspect electrical','Airflow & temp reading'];
    var steps=$$('.ck-steps b',hero),now=$('#ckNow'),cnt=$('#ckCount'),ci=0;
    function ck(){steps.forEach(function(b,i){b.classList.toggle('on',i<ci);});if(now)now.textContent=items[Math.min(ci,4)];if(cnt)cnt.textContent=ci+' of 5 done';}
    if(steps.length){if(reduce){ci=5;ck();}else{ck();setInterval(function(){ci=ci>=5?0:ci+1;ck();},1300);}}
  }

  if(kind==='about'&&!reduce){
    var st=$('.stack',hero);
    hero.addEventListener('mousemove',function(e){var r=hero.getBoundingClientRect();
      var x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      $$('.ph',st).forEach(function(p){p.style.setProperty('--px',x*18);p.style.setProperty('--py',y*18);});});
    hero.addEventListener('mouseleave',function(){$$('.ph',st).forEach(function(p){p.style.setProperty('--px',0);p.style.setProperty('--py',0);});});
  }

  if(kind==='commercial'){
    var zones=$$('.zone',hero);
    zones.forEach(function(z,i){z.style.setProperty('--sd',(i*0.37%4)+'s');});
    every(1800,function(){
      zones.forEach(function(z){if(Math.random()<.35){var b=z.querySelector('b');var t=parseFloat(b.textContent);
        t=Math.max(20.5,Math.min(24.5,t+(Math.random()-.5)*0.8));b.textContent=t.toFixed(1)+'°';z.classList.toggle('warm',t>23.4);}});
      var kw=$('#kw');if(kw)kw.textContent=(38+Math.random()*6).toFixed(1);
    });
  }

  if(kind==='plans'){
    var g=$('#gArc'),gv=$('#gVal'),C2=2*Math.PI*110,ss=$$('.season span',hero),mesh=$('.filter .mesh',hero);
    if(mesh){for(var i=0;i<22;i++){var d=document.createElement('i');d.style.left=Math.random()*94+'%';d.style.top=Math.random()*90+'%';d.style.transitionDelay=(Math.random()*.6)+'s';mesh.appendChild(d);}}
    g.style.strokeDasharray=C2;
    function fill(){var v=0;g.style.strokeDashoffset=C2;if(mesh)mesh.classList.remove('clean');
      var iv=setInterval(function(){v+=2;if(v>=98){v=98;clearInterval(iv);if(mesh)mesh.classList.add('clean');}g.style.strokeDashoffset=C2*(1-v/100);gv.textContent=v;},30);}
    if(reduce){g.style.strokeDashoffset=C2*.02;gv.textContent=98;if(mesh)mesh.classList.add('clean');}
    else{fill();var si2=0;setInterval(function(){ss.forEach(function(s){s.classList.remove('on');});si2=(si2+1)%ss.length;ss[si2].classList.add('on');fill();},5200);}
  }

  if(kind==='projects'){
    var ba=$('.ba',hero),touched=false,p=50,dir=1;
    function set(v){ba.style.setProperty('--p',v+'%');}
    function fromEv(e){var r=ba.getBoundingClientRect();var x=(e.touches?e.touches[0].clientX:e.clientX)-r.left;set(Math.max(4,Math.min(96,x/r.width*100)));}
    var down=false;
    ba.addEventListener('pointerdown',function(e){down=true;touched=true;fromEv(e);});
    addEventListener('pointerup',function(){down=false;});
    ba.addEventListener('pointermove',function(e){if(down||e.pointerType==='mouse'){if(e.pointerType==='mouse')touched=true;fromEv(e);}});
    if(!reduce)(function loop(){if(!touched){p+=dir*0.25;if(p>78||p<22)dir*=-1;set(p);}requestAnimationFrame(loop);})();
  }

  if(kind==='advice'){
    var cards=$$('.deck .ac',hero);
    function layout(){cards.forEach(function(c,i){c.style.zIndex=cards.length-i;c.style.transform='translate('+(i*16)+'px,'+(i*22)+'px) rotate('+(i*3-1)+'deg) scale('+(1-i*.05)+')';c.style.opacity=i>2?0:1;});}
    layout();
    if(!reduce)setInterval(function(){var f=cards.shift();f.style.transition='transform .6s ease-in, opacity .25s';f.style.transform='translate(-140px,-40px) rotate(-16deg)';f.style.opacity=0;
      setTimeout(function(){f.style.transition='none';cards.push(f);layout();void f.offsetWidth;f.style.transition='';},600);},2800);
  }

  if(kind==='book'){
    var bk=$('.bk',hero),cur=$('.cursor',hero),bars=$$('.bk-steps i',bk),done=$('.done',bk);
    function moveTo(el,cb){var r=el.getBoundingClientRect(),b=bk.getBoundingClientRect();cur.style.left=(r.left-b.left+r.width*.6)+'px';cur.style.top=(r.top-b.top+r.height*.6)+'px';
      setTimeout(function(){cur.classList.remove('click');void cur.offsetWidth;cur.classList.add('click');cb&&cb();},950);}
    var seq=[['.opt:nth-child(2)',0],['.day:nth-child(3)',1],['.time:nth-child(3)',2],['.confirm .btn',3]];
    function reset(){$$('.sel',bk).forEach(function(s){s.classList.remove('sel');});bars.forEach(function(b){b.classList.remove('on');});bars[0].classList.add('on');done.classList.remove('on');}
    function play(i){if(i>=seq.length){done.classList.add('on');setTimeout(function(){reset();play(0);},3200);return;}
      var el=$(seq[i][0],bk);moveTo(el,function(){if(i<3)el.classList.add('sel');if(bars[seq[i][1]+1])bars[seq[i][1]+1].classList.add('on');setTimeout(function(){play(i+1);},700);});}
    if(reduce){cur.style.display='none';}else{reset();setTimeout(function(){play(0);},900);}
  }
})();

// Projects filter chips
document.querySelectorAll('[data-filter]').forEach(function(wrap){
  var chips=wrap.querySelectorAll('.chip'),items=document.querySelectorAll('.proj');
  chips.forEach(function(c){c.addEventListener('click',function(){chips.forEach(function(x){x.classList.remove('on');});c.classList.add('on');
    var f=c.getAttribute('data-f');items.forEach(function(it){it.classList.toggle('hide',f!=='all'&&it.getAttribute('data-cat')!==f);});});});
});

// Plans savings calculator
(function(){var r=document.getElementById('units');if(!r)return;var out=document.getElementById('save'),lab=document.getElementById('unitsLbl');
  function calc(){var n=+r.value;lab.textContent=n+(n===1?' system':' systems');out.textContent='$'+(n*165+(n>2?120:0)).toLocaleString();}
  r.addEventListener('input',calc);calc();})();

// Booking wizard
(function(){var wz=document.querySelector('.wizard');if(!wz)return;
  var panes=wz.querySelectorAll('.wz-pane'),tabs=wz.querySelectorAll('.wz-steps span'),i=0,back=wz.querySelector('[data-back]'),next=wz.querySelector('[data-next]');
  function show(){panes.forEach(function(p,k){p.classList.toggle('on',k===i);});tabs.forEach(function(t,k){t.classList.toggle('on',k<=i);});
    back.style.visibility=i?'visible':'hidden';next.style.display=i===panes.length-1?'none':'';
    if(i===panes.length-1){var s=wz.querySelectorAll('.wz-opt.sel');var sum=wz.querySelector('#wzSum');sum.innerHTML='';s.forEach(function(o){var li=document.createElement('li');li.textContent=o.querySelector('b').textContent;sum.appendChild(li);});}}
  wz.querySelectorAll('.wz-opts').forEach(function(g){g.addEventListener('click',function(e){var o=e.target.closest('.wz-opt');if(!o)return;g.querySelectorAll('.wz-opt').forEach(function(x){x.classList.remove('sel');});o.classList.add('sel');});});
  next.addEventListener('click',function(){if(i<panes.length-1){i++;show();}});
  back.addEventListener('click',function(){if(i>0){i--;show();}});
  show();})();
