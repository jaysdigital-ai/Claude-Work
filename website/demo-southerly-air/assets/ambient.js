/* Ambient 3D particle layer, themed to the business.
   Set <html data-ambient="hvac|heating|vet|dental|plumbing|electrical|garden|cleaning|solar|cafe|beauty|legal|generic">,
   or leave it off and the theme is picked from the page title + meta description.
   Plain canvas, no libraries. Pauses offscreen, off for prefers-reduced-motion. */
(function(){
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var DPR=Math.min(window.devicePixelRatio||1,2),TAU=Math.PI*2;

  /* ---------- sprite painters (draw centred in a 96px box, colour = rgb string) ---------- */
  var S={
    glow:function(g,c){var r=g.createRadialGradient(48,48,0,48,48,48);r.addColorStop(0,'rgba('+c+',1)');r.addColorStop(.35,'rgba('+c+',.45)');r.addColorStop(1,'rgba('+c+',0)');g.fillStyle=r;g.fillRect(0,0,96,96);},
    mist:function(g,c){var r=g.createRadialGradient(48,48,0,48,48,48);r.addColorStop(0,'rgba('+c+',.55)');r.addColorStop(1,'rgba('+c+',0)');g.fillStyle=r;g.fillRect(0,0,96,96);},
    frost:function(g,c){g.translate(48,48);g.strokeStyle='rgba('+c+',.95)';g.lineCap='round';g.lineWidth=2.4;
      for(var i=0;i<6;i++){g.save();g.rotate(i*TAU/6);g.beginPath();g.moveTo(0,0);g.lineTo(0,-40);g.moveTo(0,-16);g.lineTo(-9,-25);g.moveTo(0,-16);g.lineTo(9,-25);g.moveTo(0,-28);g.lineTo(-6,-34);g.moveTo(0,-28);g.lineTo(6,-34);g.stroke();g.restore();}},
    paw:function(g,c){g.fillStyle='rgba('+c+',.95)';g.beginPath();g.ellipse(48,60,17,14,0,0,TAU);g.fill();
      [[26,38,7,9,-.4],[40,28,7,10,-.15],[56,28,7,10,.15],[70,38,7,9,.4]].forEach(function(t){g.beginPath();g.ellipse(t[0],t[1],t[2],t[3],t[4],0,TAU);g.fill();});},
    heart:function(g,c){g.fillStyle='rgba('+c+',.95)';g.beginPath();g.moveTo(48,76);g.bezierCurveTo(10,52,18,18,48,34);g.bezierCurveTo(78,18,86,52,48,76);g.fill();},
    sparkle:function(g,c){g.translate(48,48);g.fillStyle='rgba('+c+',1)';g.beginPath();g.moveTo(0,-42);g.quadraticCurveTo(5,-5,42,0);g.quadraticCurveTo(5,5,0,42);g.quadraticCurveTo(-5,5,-42,0);g.quadraticCurveTo(-5,-5,0,-42);g.fill();},
    bubble:function(g,c){g.strokeStyle='rgba('+c+',.9)';g.lineWidth=3;g.beginPath();g.arc(48,48,38,0,TAU);g.stroke();
      g.fillStyle='rgba('+c+',.12)';g.fill();g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.ellipse(34,32,9,5,-.7,0,TAU);g.fill();},
    drop:function(g,c){var r=g.createLinearGradient(30,10,66,86);r.addColorStop(0,'rgba('+c+',.95)');r.addColorStop(1,'rgba('+c+',.45)');g.fillStyle=r;
      g.beginPath();g.moveTo(48,8);g.bezierCurveTo(56,30,74,46,74,62);g.arc(48,62,26,0,Math.PI);g.bezierCurveTo(22,46,40,30,48,8);g.fill();
      g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.ellipse(40,62,4,9,.3,0,TAU);g.fill();},
    leaf:function(g,c){g.fillStyle='rgba('+c+',.95)';g.beginPath();g.moveTo(48,6);g.bezierCurveTo(84,30,78,70,48,90);g.bezierCurveTo(18,70,12,30,48,6);g.fill();
      g.strokeStyle='rgba(255,255,255,.45)';g.lineWidth=2;g.beginPath();g.moveTo(48,12);g.lineTo(48,86);g.stroke();},
    bolt:function(g,c){g.fillStyle='rgba('+c+',1)';g.beginPath();g.moveTo(56,6);g.lineTo(22,54);g.lineTo(44,54);g.lineTo(38,90);g.lineTo(74,40);g.lineTo(52,40);g.closePath();g.fill();},
    petal:function(g,c){g.fillStyle='rgba('+c+',.95)';g.beginPath();g.moveTo(48,10);g.bezierCurveTo(80,28,70,78,48,88);g.bezierCurveTo(26,78,16,28,48,10);g.fill();},
    ring:function(g,c){g.strokeStyle='rgba('+c+',.9)';g.lineWidth=2.5;g.beginPath();g.arc(48,48,36,0,TAU);g.stroke();},
    steam:function(g,c){g.strokeStyle='rgba('+c+',.8)';g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(48,90);g.bezierCurveTo(20,66,76,44,48,22);g.bezierCurveTo(36,12,44,4,52,2);g.stroke();},
    square:function(g,c){g.strokeStyle='rgba('+c+',.9)';g.lineWidth=3;g.strokeRect(22,22,52,52);}
  };

  /* ---------- themes ----------
     mix: [kind, weight]  kinds: dot | streak | <sprite name>
     flow: base drift per frame [vx, vy] (screen units; vy<0 rises)  spin: 3D flip speed
     dark/light: rgb used on dark vs light sections                                     */
  var THEMES={
    hvac:      {mix:[['dot',5],['streak',3],['frost',1.2]],flow:[.0026,.0008],mist:1,spin:.02,dark:'214,234,246',light:'88,140,180'},
    heating:   {mix:[['dot',7],['streak',1]],flow:[.0004,-.0026],mist:.6,spin:.02,dark:'255,170,110',light:'205,110,60',ember:1},
    vet:       {mix:[['dot',4],['paw',1.4],['heart',.6]],flow:[.0012,-.0012],mist:.5,spin:.015,dark:'255,214,190',light:'200,120,90'},
    dental:    {mix:[['dot',4],['sparkle',1.6],['bubble',.8]],flow:[.0008,-.0016],mist:.5,spin:.03,dark:'225,245,255',light:'70,150,200',twinkle:1},
    plumbing:  {mix:[['bubble',2],['drop',1.2],['dot',3]],flow:[.0006,-.0022],mist:.5,spin:.015,dark:'170,215,245',light:'50,120,180'},
    electrical:{mix:[['dot',4],['streak',3],['bolt',.7]],flow:[.0034,-.0004],mist:.3,spin:.03,dark:'255,214,90',light:'200,150,20',twinkle:1},
    garden:    {mix:[['leaf',2],['dot',3],['petal',.4]],flow:[.0022,.0012],mist:.5,spin:.035,dark:'170,220,150',light:'80,140,70'},
    cleaning:  {mix:[['bubble',2.4],['sparkle',1],['dot',2]],flow:[.0008,-.0018],mist:.5,spin:.02,dark:'220,240,255',light:'80,150,200',twinkle:1},
    solar:     {mix:[['dot',5],['streak',2],['ring',.6]],flow:[.0018,.0006],mist:.7,spin:.01,dark:'255,220,140',light:'215,150,40'},
    cafe:      {mix:[['steam',1],['dot',4]],flow:[.0004,-.0018],mist:.8,spin:.01,dark:'245,225,200',light:'150,110,80'},
    beauty:    {mix:[['petal',2],['sparkle',1],['dot',3]],flow:[.0014,.0008],mist:.6,spin:.03,dark:'255,210,220',light:'200,110,140',twinkle:1},
    legal:     {mix:[['dot',5],['square',.6],['streak',1]],flow:[.0012,.0002],mist:.5,spin:.008,dark:'225,215,190',light:'120,110,90'},
    generic:   {mix:[['dot',6],['streak',1]],flow:[.0016,.0004],mist:.6,spin:.01,dark:'220,230,240',light:'100,120,140'}
  };
  var KEYWORDS=[['hvac',/\b(air ?con\w*|hvac|cooling|heat pumps?|ducted|refrigerat\w*)\b/i],['heating',/\b(heating|heaters?|fireplaces?|furnaces?|boilers?|hot water)\b/i],
    ['vet',/\b(vets?|veterinar\w*|animals?|pets?|dogs?|cats?|grooming)\b/i],['dental',/\b(dental|dentists?|teeth|orthodont\w*|smiles?)\b/i],['plumbing',/\b(plumb\w*|drains?|pipes?|pools?)\b/i],
    ['electrical',/\b(electric\w*|wiring|switchboards?|ev charg\w*)\b/i],['garden',/\b(garden\w*|landscap\w*|lawns?|trees?|arborists?|nurser\w*)\b/i],['cleaning',/\b(clean\w*|laundry|pressure wash\w*)\b/i],
    ['solar',/\b(solar|energy|batter\w*|renewables?)\b/i],['cafe',/\b(caf[eé]s?|coffee|bakery|bakeries|restaurants?|catering)\b/i],['beauty',/\b(beauty|salons?|spas?|skin\w*|florists?|weddings?|nails?)\b/i],
    ['legal',/\b(law\w*|legal|account\w*|finance|consult\w*|advis\w*)\b/i]];
  function pickTheme(){var a=document.documentElement.getAttribute('data-ambient');if(a&&THEMES[a])return a;
    var txt=document.title+' '+((document.querySelector('meta[name=description]')||{}).content||'');
    for(var i=0;i<KEYWORDS.length;i++)if(KEYWORDS[i][1].test(txt))return KEYWORDS[i][0];return 'generic';}

  var cache={};
  function spr(kind,c){var k=kind+c;if(!cache[k]){var cv=document.createElement('canvas');cv.width=cv.height=96;S[kind==='dot'?'glow':kind](cv.getContext('2d'),c);cache[k]=cv;}return cache[k];}

  function Field(host,theme,dark){
    var cv=document.createElement('canvas');cv.className='frost ambient';cv.setAttribute('aria-hidden','true');host.insertBefore(cv,host.firstChild);
    var g=cv.getContext('2d'),T=THEMES[theme],col=dark?T.dark:T.light,A=dark?1:.75,W=0,H=0,P=[],M=[],run=false,t=0,mx=0,my=0,tx=0,ty=0,last=0;
    var total=0;T.mix.forEach(function(m){total+=m[1];});
    function kind(){var r=Math.random()*total;for(var i=0;i<T.mix.length;i++){r-=T.mix[i][1];if(r<=0)return T.mix[i][0];}return 'dot';}
    function make(any){var up=T.flow[1]<0;return {x:any?Math.random()*2.8-1.4:(Math.abs(T.flow[0])>Math.abs(T.flow[1])?-1.5:Math.random()*2.8-1.4),
      y:any?Math.random()*2.4-1.2:(Math.abs(T.flow[0])>Math.abs(T.flow[1])?Math.random()*2.4-1.2:(up?1.3:-1.3)),
      z:.35+Math.random()*1.5,k:kind(),rot:Math.random()*TAU,spin:(Math.random()-.5)*.03,flip:Math.random()*TAU,sp:.6+Math.random()*.9,ph:Math.random()*TAU};}
    function size(){var r=host.getBoundingClientRect();W=r.width;H=r.height;cv.width=W*DPR;cv.height=H*DPR;g.setTransform(DPR,0,0,DPR,0,0);
      var n=Math.round(Math.min(160,Math.max(45,W*H/9500)));P=[];for(var i=0;i<n;i++)P.push(make(true));
      M=[];for(var j=0;j<4;j++)M.push({x:Math.random(),y:.55+Math.random()*.5,s:.5+Math.random()*.6,v:.0006+Math.random()*.0008,p:Math.random()*6});}
    function frame(now){if(!run)return;var dt=Math.min(50,now-(last||now))/16.67;last=now;t+=.008*dt;
      mx+=(tx-mx)*.04;my+=(ty-my)*.04;g.clearRect(0,0,W,H);
      if(T.mist){var mist=spr('mist',col);for(var m=0;m<M.length;m++){var Q=M[m];Q.x+=Q.v*dt;if(Q.x>1.4)Q.x=-.4;var ms=Q.s*Math.max(W,H);
        g.globalAlpha=(.2+.08*Math.sin(t+Q.p))*A*T.mist;g.drawImage(mist,(Q.x-.2)*W-ms/2-mx*20,Q.y*H-ms/2-my*10,ms,ms*.55);}}
      var cx=W/2,cy=H/2,F=Math.max(W,H)*.55;
      for(var i=0;i<P.length;i++){var p=P[i];
        p.x+=(T.flow[0]+.0011*Math.sin(t*1.3+p.y*3+p.ph))*p.sp*dt;p.y+=(T.flow[1]+.0010*Math.sin(t*.9+p.x*2.6+p.ph))*p.sp*dt;
        p.z+=Math.sin(t+p.ph)*.0012*dt;p.rot+=p.spin*dt;p.flip+=T.spin*dt;
        if(p.x>1.6||p.x<-1.7||p.y>1.4||p.y<-1.45){P[i]=p=make(false);}
        var f=1/p.z,sx=cx+(p.x+mx*.12*f)*F*f*.9,sy=cy+(p.y+my*.08*f)*F*f*.6;if(sx<-80||sx>W+80||sy<-80||sy>H+80)continue;
        var near=Math.max(0,Math.min(1,(1.9-p.z)/1.6)),dof=Math.abs(p.z-.9),a=(.25+.65*near)*(1-Math.min(.6,dof*.45))*A;
        if(T.twinkle)a*=.55+.45*Math.sin(t*6+p.ph*3);
        if(T.ember&&p.k==='dot')a*=Math.max(0,Math.min(1,(1.3-p.y)/1.2));
        if(p.k==='dot'){var s=(2.2+6*f)*(1+dof*.8);g.globalAlpha=a*.9;g.drawImage(spr('dot',col),sx-s,sy-s,s*2,s*2);}
        else if(p.k==='streak'){var L=(18+42*f)*p.sp,ang=Math.atan2(T.flow[1],T.flow[0]),ex=Math.cos(ang)*L,ey=Math.sin(ang)*L;
          var gr=g.createLinearGradient(sx-ex,sy-ey,sx,sy);gr.addColorStop(0,'rgba('+col+',0)');gr.addColorStop(1,'rgba('+col+','+(a*.55)+')');
          g.globalAlpha=1;g.strokeStyle=gr;g.lineWidth=Math.max(.6,1.4*f);g.lineCap='round';g.beginPath();g.moveTo(sx-ex,sy-ey);g.lineTo(sx,sy);g.stroke();}
        else{var cs=(7+14*f)*(1+dof*.3),fl=Math.cos(p.flip);g.save();g.translate(sx,sy);g.rotate(p.rot);g.scale(fl*.85+.15*(fl<0?-1:1),1);
          g.globalAlpha=a*.85;g.drawImage(spr(p.k,col),-cs,-cs,cs*2,cs*2);g.restore();}
      }
      g.globalAlpha=1;requestAnimationFrame(frame);}
    function start(){if(run)return;run=true;last=0;requestAnimationFrame(frame);}function stop(){run=false;}
    size();
    if('ResizeObserver' in window)new ResizeObserver(size).observe(host);else addEventListener('resize',size);
    if('IntersectionObserver' in window)new IntersectionObserver(function(e){e[0].isIntersecting?start():stop();}).observe(host);else start();
    document.addEventListener('visibilitychange',function(){document.hidden?stop():start();});
    host.addEventListener('pointermove',function(e){var r=host.getBoundingClientRect();tx=(e.clientX-r.left)/r.width-.5;ty=(e.clientY-r.top)/r.height-.5;});
    host.addEventListener('pointerleave',function(){tx=ty=0;});
  }

  function init(){var th=pickTheme();document.documentElement.setAttribute('data-ambient-active',th);
    document.querySelectorAll('.hero,.cta-panel,.footer').forEach(function(el){Field(el,th,el.matches('.dark,.deep,.cta-panel,.footer'));});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
