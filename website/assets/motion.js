/* motion.js — proven reveal and interaction kit for demo sites (no dependencies).
   Classes: .rv (fade up), .rv-img (clip reveal, inner .ph-in), [data-words] (word-by-word headline),
   .stg (stagger children), .pop (scale in), .steps (draw .line), .tl (timeline item), [data-count]="1234" (+ data-suffix),
   [data-parallax] (gentle parallax), .tilt (desktop 3D tilt), [data-magnetic] (magnetic button),
   .progress (reading bar), .burger + .mnav (mobile menu, toggles body.menu-open), form[data-demo] (no-backend form).
   Content is hidden only after the script adds html.anim, and a timed fallback reveals everything. Pair with motion.css. */
(function(){
  var root=document.documentElement;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine=window.matchMedia&&window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // mobile menu
  var burger=document.querySelector('.burger');
  if(burger){burger.addEventListener('click',function(){document.body.classList.toggle('menu-open');});}
  document.querySelectorAll('.mnav a').forEach(function(a){a.addEventListener('click',function(){document.body.classList.remove('menu-open');});});

  // split headings into words
  document.querySelectorAll('[data-words]').forEach(function(el){
    var i=0;
    function walk(node){
      Array.prototype.slice.call(node.childNodes).forEach(function(n){
        if(n.nodeType===3){
          var parts=n.textContent.split(/(\s+)/);var frag=document.createDocumentFragment();
          parts.forEach(function(p){
            if(!p)return;
            if(/^\s+$/.test(p)){frag.appendChild(document.createTextNode(p));return;}
            var w=document.createElement('span');w.className='w';
            var s=document.createElement('span');s.textContent=p;s.style.setProperty('--i',i++);
            w.appendChild(s);frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag,n);
        }else if(n.nodeType===1&&!n.classList.contains('rot')&&!n.classList.contains('w')){
          if(n.tagName==='BR')return;
          walk(n);
        }else if(n.nodeType===1&&n.classList.contains('rot')){
          var w=document.createElement('span');w.className='w';n.parentNode.insertBefore(w,n);
          var s=document.createElement('span');s.style.setProperty('--i',i++);w.appendChild(s);s.appendChild(n);
        }
      });
    }
    walk(el);
  });

  // stagger index
  document.querySelectorAll('.stg').forEach(function(g){Array.prototype.forEach.call(g.children,function(c,i){c.style.setProperty('--i',i);});});

  if(reduce){return finishStatic();}
  root.classList.add('anim');

  var targets=document.querySelectorAll('.rv,.rv-img,[data-words],.stg,.pop,.steps,.tl,[data-count]');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(e.isIntersecting){e.target.classList.add('in');if(e.target.hasAttribute('data-count'))countUp(e.target);io.unobserve(e.target);}
      });
    },{threshold:0.12,rootMargin:'0px 0px -6% 0px'});
    targets.forEach(function(t){io.observe(t);});
  }else{targets.forEach(function(t){t.classList.add('in');});}

  // safety fallback: never leave content hidden
  setTimeout(function(){
    document.querySelectorAll('.rv,.rv-img,[data-words],.stg,.pop,.steps,.tl').forEach(function(t){
      var r=t.getBoundingClientRect();
      if(r.top<window.innerHeight*1.2)t.classList.add('in');
    });
  },2500);
  window.addEventListener('error',function(){document.querySelectorAll('.rv,.rv-img,[data-words],.stg,.pop,.steps,.tl').forEach(function(t){t.classList.add('in');});});

  function countUp(el){
    var to=parseFloat(el.getAttribute('data-count'));var dec=(el.getAttribute('data-count').split('.')[1]||'').length;
    var t0=null;var dur=1800;var suf=el.getAttribute('data-suffix')||'';
    function step(ts){if(!t0)t0=ts;var p=Math.min((ts-t0)/dur,1);var v=to*(1-Math.pow(1-p,3));
      el.innerHTML=v.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g,',')+suf;if(p<1)requestAnimationFrame(step);}
    requestAnimationFrame(step);
  }

  // progress bar + parallax
  var bar=document.querySelector('.progress');
  var par=document.querySelectorAll('[data-parallax]');
  var ticking=false;
  function onScroll(){
    if(ticking)return;ticking=true;
    requestAnimationFrame(function(){
      var h=document.documentElement.scrollHeight-innerHeight;
      if(bar)bar.style.transform='scaleX('+(h>0?scrollY/h:0)+')';
      par.forEach(function(el){
        var r=el.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;
        var c=(r.top+r.height/2-innerHeight/2)/innerHeight;
        var inner=el.querySelector('.ph-in');var k=parseFloat(el.getAttribute('data-parallax'))||1;
        if(inner&&el.classList.contains('in'))inner.style.transform="translate3d(0,"+(c*-18*k)+"px,0)";
        else if(!inner)el.style.transform='translateY('+(c*-40*k)+'px)';
      });
      ticking=false;
    });
  }
  addEventListener('scroll',onScroll,{passive:true});onScroll();
  // let the reveal transition finish before parallax takes over the inner transform
  par.forEach(function(el){var inner=el.querySelector('.ph-in');if(inner)el.addEventListener('transitionend',function(){inner.style.transition='transform .2s linear';});});

  if(fine){
    // tilt
    document.querySelectorAll('.tilt').forEach(function(c){
      if(!c.querySelector('.shine')){var s=document.createElement('i');s.className='shine';c.appendChild(s);}
      c.addEventListener('mousemove',function(e){
        var r=c.getBoundingClientRect();var x=(e.clientX-r.left)/r.width;var y=(e.clientY-r.top)/r.height;
        c.style.transform='perspective(900px) rotateX('+((.5-y)*7)+'deg) rotateY('+((x-.5)*7)+'deg) translateY(-4px)';
        c.style.setProperty('--mx',x*100+'%');c.style.setProperty('--my',y*100+'%');
      });
      c.addEventListener('mouseleave',function(){c.style.transform='';});
    });
    // magnetic buttons
    document.querySelectorAll('[data-magnetic]').forEach(function(b){
      b.addEventListener('mousemove',function(e){var r=b.getBoundingClientRect();
        b.style.transform='translate('+((e.clientX-r.left-r.width/2)*.18)+'px,'+((e.clientY-r.top-r.height/2)*.3)+'px)';});
      b.addEventListener('mouseleave',function(){b.style.transform='';});
    });
  }

  function finishStatic(){
    document.querySelectorAll('[data-count]').forEach(function(el){
      var v=el.getAttribute('data-count');el.innerHTML=v.replace(/\B(?=(\d{3})+(?!\d))/g,',')+(el.getAttribute('data-suffix')||'');
    });
  }
})();

// forms (no backend in the demo)
document.querySelectorAll('form[data-demo]').forEach(function(f){
  f.addEventListener('submit',function(e){e.preventDefault();var n=f.querySelector('.form-note');if(n){n.classList.add('on');}f.querySelectorAll('input,textarea').forEach(function(i){if(i.type!=='range')i.value='';});});
});
