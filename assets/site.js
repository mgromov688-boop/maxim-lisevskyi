// ── живой фон первого экрана: сеть сигналов поверх свечения ──
// Приём из моего же лендинга-резюме («Comet signal arc»): узлы и связи —
// метафора работы, а не абстрактные частицы.
// Слой лежит ВНУТРИ .cover-shot с отрицательным z-index: только тогда он
// попадает в backdrop картинки и mix-blend-mode:screen его показывает.
// Всё рисуется в один канвас (свечение тоже), а вырезание идёт внутри канваса:
// CSS-маска обрезала бы слой по краю фото, а чёрный фон шире фото.
(function(){
  var shot=document.querySelector('.hero-cover .cover-shot');
  if(!shot) return;
  var layers=shot.querySelector('.cov-fx'),
      cv=layers&&layers.querySelector('.cov-net'),
      img=shot.querySelector('img:not(.cov-mask)'),
      mimg=layers&&layers.querySelector('.cov-mask');
  if(!cv||!img) return;

  var calm=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var fine=window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if(!fine||window.innerWidth<=980) return;

  var ctx=cv.getContext('2d'),W=0,H=0,DPR=1,raf=null,last=0,visible=true;
  var nodes=[],packets=[],calls=[],ripples=[],callT=1.2,packetT=.5;
  var mouse={x:-9999,y:-9999},glow={x:-9999,y:-9999,on:0};
  var probe=null,maskImg=null,keepOut=[],LINK=140,POWER=1.25;
  var MASK=mimg?mimg.getAttribute('src'):null;
  // Два цвета вместо одного. Раньше всё — сеть, свечение, сигналы —
  // рисовалось оранжевым, и фон уходил в блёклый тёплый: замер R−B
  // у кромки давал 16.7 при выключенном канвасе 6.2.
  // Теперь конструкция сети нейтральная (холодный белый), а оранжевый
  // остаётся только у сигналов — один акцент, как в каноне.
  function col(o){return 'rgba(214,220,232,'+o+')';}      // сеть, узлы, свечение
  function acc(o){return 'rgba(255,106,26,'+o+')';}       // пакеты, кометы, вспышки

  function loadMask(){
    if(!MASK||maskImg) return;
    var im=new Image();
    im.onload=function(){
      maskImg=im;
      var c=document.createElement('canvas');
      c.width=200;c.height=Math.max(1,Math.round(200*im.height/im.width));
      var x=c.getContext('2d');x.drawImage(im,0,0,c.width,c.height);
      probe={d:x.getImageData(0,0,c.width,c.height).data,w:c.width,h:c.height};
    };
    im.src=MASK;
  }

  // курсор на фигуре? там ни реакции, ни свечения быть не должно
  function onFigure(cx,cy){
    if(!probe) return false;
    var ir=img.getBoundingClientRect();
    var u=(cx-ir.left)/ir.width,v=(cy-ir.top)/ir.height;
    if(u<0||u>1||v<0||v>1) return false;
    var px=Math.min(probe.w-1,Math.max(0,Math.round(u*probe.w)));
    var py=Math.min(probe.h-1,Math.max(0,Math.round(v*probe.h)));
    return probe.d[(py*probe.w+px)*4+3]>105;
  }

  // прямоугольники текста и имени — под ними анимации тоже быть не должно
  function measureKeepOut(){
    keepOut=[];
    var cr=cv.getBoundingClientRect();
    ['.cov-l .pill','.cov-l h1','.cov-l .tagline','.cov-r .sub','.cov-r .cta-round',
     '.cov-r .cov-tags','.bigname'].forEach(function(sel){
      var e=document.querySelector('.hero-cover '+sel);
      if(!e) return;
      var r=e.getBoundingClientRect();
      if(r.width<4||r.height<4) return;
      keepOut.push({x:(r.left-cr.left)*DPR,y:(r.top-cr.top)*DPR,
                    w:r.width*DPR,h:r.height*DPR});
    });
  }

  function resize(){
    var r=shot.getBoundingClientRect();
    DPR=Math.min(window.devicePixelRatio||1,2);
    if(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4) DPR=Math.min(DPR,1.5);
    W=cv.width=Math.max(1,Math.floor(r.width*DPR));
    H=cv.height=Math.max(1,Math.floor(r.height*DPR));
    cv.style.width=r.width+'px';cv.style.height=r.height+'px';
    nodes=[];packets=[];calls=[];ripples=[];
    var n=Math.round((W/DPR)*(H/DPR)/15000);
    n=Math.max(34,Math.min(n,110));
    for(var i=0;i<n;i++) nodes.push({x:Math.random()*W,y:Math.random()*H,
      vx:(Math.random()-.5)*.18*DPR,vy:(Math.random()-.5)*.18*DPR,
      r:(Math.random()*1.6+.8)*DPR,hub:Math.random()<.09,ph:Math.random()*6.28});
    measureKeepOut();
  }

  function spawnPacket(){
    for(var t=0;t<14;t++){
      var a=nodes[(Math.random()*nodes.length)|0],b=nodes[(Math.random()*nodes.length)|0];
      if(a!==b&&Math.hypot(a.x-b.x,a.y-b.y)<LINK*DPR){
        packets.push({a:a,b:b,p:0,sp:.55+Math.random()*.5});return;}
    }
  }
  function spawnCall(){
    if(calls.length>=2) return;
    for(var t=0;t<22;t++){
      var a=nodes[(Math.random()*nodes.length)|0],b=nodes[(Math.random()*nodes.length)|0];
      var d=a===b?0:Math.hypot(a.x-b.x,a.y-b.y);
      if(d>LINK*DPR*.9&&d<LINK*DPR*2.5){
        calls.push({a:a,b:b,t:0,dur:2.8+Math.random()*1.6,
          bow:(Math.random()<.5?-1:1)*(.10+Math.random()*.08),done:false});
        ripples.push({x:a.x,y:a.y,r:0,max:36*DPR});return;}
    }
  }
  function drawCall(c,k){
    var kk=c.t/c.dur,env=Math.min(kk*5,1)*Math.min((1-kk)*5,1)*k;
    var ax=c.a.x,ay=c.a.y,bx=c.b.x,by=c.b.y;
    var dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy)||1;
    var cpx=(ax+bx)/2+(-dy/len)*len*c.bow,cpy=(ay+by)/2+(dx/len)*len*c.bow;
    function bez(s){var u=1-s;return{x:u*u*ax+2*u*s*cpx+s*s*bx,y:u*u*ay+2*u*s*cpy+s*s*by};}
    ctx.beginPath();ctx.moveTo(ax,ay);ctx.quadraticCurveTo(cpx,cpy,bx,by);
    ctx.strokeStyle=acc(.09*env);ctx.lineWidth=DPR*.8;ctx.stroke();
    var p=kk<.5?2*kk*kk:1-Math.pow(-2*kk+2,2)/2,TAIL=.22,steps=14;
    ctx.lineCap='round';
    for(var i=0;i<steps;i++){
      var s1=p-TAIL*i/steps;if(s1<=0)break;
      var s0=Math.max(p-TAIL*(i+1)/steps,0),q0=bez(s0),q1=bez(s1),fade=1-i/steps;
      ctx.strokeStyle=acc(.5*env*fade);ctx.lineWidth=DPR*(1.9-1.3*i/steps);
      ctx.beginPath();ctx.moveTo(q0.x,q0.y);ctx.lineTo(q1.x,q1.y);ctx.stroke();
    }
    var h=bez(p);
    ctx.beginPath();ctx.arc(h.x,h.y,2.1*DPR,0,6.283);
    ctx.fillStyle=acc(.95*env);ctx.shadowColor=acc(.9);ctx.shadowBlur=14*DPR;
    ctx.fill();ctx.shadowBlur=0;
  }

  // мягкое свечение-подложка: то, что раньше было отдельным CSS-слоем
  function drawAura(now,k){
    var t=now*0.00006;
    // Пять источников вместо трёх и симметрия по горизонтали.
    // Замер верхней полосы кадра показывал спад слева направо
    // 15.0 → 9.3: правый блоб был слабее левого, и правый край гас —
    // кадр читался обрезанным. Края держат отдельные источники.
    // Яркость вдвое ниже прежней: тёплая заливка делала кадр блёклым.
    // Фон должен оставаться чёрным, свет — только намёком по краям.
    var blobs=[
      {x:.06+Math.sin(t)*0.03,      y:.30+Math.cos(t*.8)*0.05, r:.58, a:.05},
      {x:.94+Math.cos(t*.9)*0.03,   y:.30+Math.sin(t)*0.05,    r:.58, a:.05},
      {x:.20+Math.sin(t*1.1)*0.04,  y:.62+Math.cos(t*.7)*0.05, r:.46, a:.032},
      {x:.80+Math.cos(t*1.1)*0.04,  y:.62+Math.sin(t*.7)*0.05, r:.46, a:.032},
      {x:.48+Math.sin(t*1.2)*0.06,  y:.92+Math.cos(t)*0.04,    r:.42, a:.03}
    ];
    for(var i=0;i<blobs.length;i++){
      var b=blobs[i],cx=b.x*W,cy=b.y*H,rr=b.r*Math.max(W,H);
      var g=ctx.createRadialGradient(cx,cy,0,cx,cy,rr);
      g.addColorStop(0,col(b.a*k));g.addColorStop(1,col(0));
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    }
    if(glow.on>0.01){
      var gg=ctx.createRadialGradient(glow.x,glow.y,0,glow.x,glow.y,320*DPR);
      gg.addColorStop(0,col(.16*glow.on*k));gg.addColorStop(1,col(0));
      ctx.fillStyle=gg;ctx.fillRect(0,0,W,H);
    }
  }

  // вырезаем фигуру и текстовые зоны из уже нарисованного кадра
  // вырезаем силуэт и текстовые зоны из уже нарисованного кадра.
  // маска несёт альфу ФИГУРЫ, поэтому destination-out стирает ровно её,
  // а всё, что за пределами фото, остаётся нетронутым — фон шире кадра.
  function cutOut(){
    ctx.save();
    ctx.globalCompositeOperation='destination-out';
    if(maskImg){
      var ir=img.getBoundingClientRect(),cr=cv.getBoundingClientRect();
      ctx.drawImage(maskImg,(ir.left-cr.left)*DPR,(ir.top-cr.top)*DPR,
                    ir.width*DPR,ir.height*DPR);
    }
    if(ctx.filter!==undefined) ctx.filter='blur('+(26*DPR)+'px)';
    ctx.fillStyle='#000';
    for(var i=0;i<keepOut.length;i++){
      var r=keepOut[i];
      ctx.fillRect(r.x-10*DPR,r.y-10*DPR,r.w+20*DPR,r.h+20*DPR);
    }
    if(ctx.filter!==undefined) ctx.filter='none';
    ctx.restore();
  }

  function frame(now){
    var dt=Math.min((now-last)/1000,.05);last=now;
    var k=POWER,link=LINK*DPR,mr=170*DPR,i,j;
    ctx.clearRect(0,0,W,H);
    drawAura(now,k);
    for(i=0;i<nodes.length;i++){var n=nodes[i];n.x+=n.vx;n.y+=n.vy;
      if(n.x<0||n.x>W)n.vx*=-1;if(n.y<0||n.y>H)n.vy*=-1;}
    callT-=dt;if(callT<=0){spawnCall();callT=2.4+Math.random()*2.6;}
    packetT-=dt;if(packetT<=0){spawnPacket();packetT=.45+Math.random()*.65;}
    for(i=0;i<nodes.length;i++)for(j=i+1;j<nodes.length;j++){
      var a=nodes[i],b=nodes[j],d=Math.hypot(a.x-b.x,a.y-b.y);
      if(d<link){ctx.strokeStyle=col((1-d/link)*.23*k);ctx.lineWidth=DPR*.6;
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    }
    for(i=packets.length-1;i>=0;i--){
      var pk=packets[i];pk.p+=pk.sp*dt;
      if(pk.p>=1){packets.splice(i,1);continue;}
      var x=pk.a.x+(pk.b.x-pk.a.x)*pk.p,y=pk.a.y+(pk.b.y-pk.a.y)*pk.p,o=Math.sin(Math.PI*pk.p);
      ctx.beginPath();ctx.arc(x,y,1.7*DPR,0,6.283);
      ctx.fillStyle=acc(.85*o*k);ctx.shadowColor=acc(.8);ctx.shadowBlur=8*DPR;
      ctx.fill();ctx.shadowBlur=0;
    }
    for(i=calls.length-1;i>=0;i--){
      var cl=calls[i];cl.t+=dt;
      if(cl.t>=cl.dur){calls.splice(i,1);continue;}
      if(!cl.done&&cl.t/cl.dur>.93){cl.done=true;
        ripples.push({x:cl.b.x,y:cl.b.y,r:0,max:36*DPR});}
      drawCall(cl,k);
    }
    for(i=ripples.length-1;i>=0;i--){
      var rp=ripples[i];rp.r+=rp.max*1.1*dt;
      if(rp.r>=rp.max){ripples.splice(i,1);continue;}
      ctx.beginPath();ctx.arc(rp.x,rp.y,rp.r,0,6.283);
      ctx.strokeStyle=acc((1-rp.r/rp.max)*.45*k);ctx.lineWidth=DPR;ctx.stroke();
    }
    for(i=0;i<nodes.length;i++){
      var nd=nodes[i],md=Math.hypot(nd.x-mouse.x,nd.y-mouse.y),near=md<mr;
      if(nd.hub){var pulse=.5+Math.sin(now*.0018+nd.ph)*.5;
        ctx.beginPath();ctx.arc(nd.x,nd.y,nd.r+3.5*DPR,0,6.283);
        ctx.strokeStyle=col((.16+pulse*.18)*k);ctx.lineWidth=DPR*.8;ctx.stroke();}
      ctx.beginPath();ctx.arc(nd.x,nd.y,nd.r,0,6.283);
      ctx.fillStyle=col((near?.95:(nd.hub?.72:.55))*k);ctx.fill();
      if(near){ctx.strokeStyle=col((1-md/mr)*.5*k);ctx.lineWidth=DPR*.7;
        ctx.beginPath();ctx.moveTo(nd.x,nd.y);ctx.lineTo(mouse.x,mouse.y);ctx.stroke();}
    }
    cutOut();
    raf=requestAnimationFrame(frame);
  }

  function start(){if(!raf&&visible&&!calm){last=performance.now();raf=requestAnimationFrame(frame);}}
  function stop(){if(raf){cancelAnimationFrame(raf);raf=null;}}

  var KEEP='.cov-grid,.bigname,header,.cov-scroll';
  window.addEventListener('mousemove',function(e){
    var t=e.target;
    if((t&&t.closest&&t.closest(KEEP))||onFigure(e.clientX,e.clientY)){
      mouse.x=mouse.y=-9999;glow.on=0;return;
    }
    var r=cv.getBoundingClientRect();
    mouse.x=(e.clientX-r.left)*DPR;mouse.y=(e.clientY-r.top)*DPR;
    glow.x=mouse.x;glow.y=mouse.y;glow.on=1;
  },{passive:true});
  window.addEventListener('mouseout',function(){mouse.x=mouse.y=-9999;glow.on=0;},{passive:true});
  window.addEventListener('resize',function(){resize();},{passive:true});
  window.addEventListener('scroll',measureKeepOut,{passive:true});
  document.addEventListener('visibilitychange',function(){document.hidden?stop():start();});
  if(window.IntersectionObserver){
    new IntersectionObserver(function(es){
      visible=es[0].isIntersecting;visible?start():stop();
    },{threshold:.02}).observe(shot);
  }

  function run(){
    loadMask();resize();
    layers.classList.add('on');
    if(calm){frame(performance.now());stop();}
    else start();
  }
  if(document.readyState==='complete') setTimeout(run,120);
  else window.addEventListener('load',function(){
    ('requestIdleCallback' in window)?requestIdleCallback(run,{timeout:1200}):setTimeout(run,260);
  });
})();

// ── имя первого экрана уходит в глубину при прокрутке ──────
(function(){
  if(window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  var el=document.querySelector('.hero-cover .bigname');
  if(!el) return;
  var t=0;
  addEventListener('scroll',function(){
    if(t) return;
    t=requestAnimationFrame(function(){
      t=0;
      var y=Math.min(scrollY,700);
      el.style.transform='perspective(900px) translate3d(0,'+(y*-0.08)+'px,'+(y*-0.22)+'px)';
      el.style.opacity=String(Math.max(0,1-y/620));
    });
  },{passive:true});
})();

// ── премиальный курсор ─────────────────────────────────────
// Ставим только там, где есть настоящая мышь: на тачскрине системный курсор
// не нужен, а при prefers-reduced-motion слежка за мышью раздражает.
(function(){
  var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches,
      calm = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(!fine || calm) return;
  var root=document.documentElement;
  root.classList.add('has-cursor');
  function mk(id){var d=document.createElement('div');d.id=id;document.body.appendChild(d);return d}
  var dot=mk('cur'), ring=mk('cur-ring'), trail=mk('cur-trail');
  var mx=innerWidth/2, my=innerHeight/2, rx=mx, ry=my, tx=mx, ty=my, moving=0;
  // «спокойные» зоны: карточки, панели и портрет — там подсветка гасится
  var CALM='.card,.wi,.proof,.show-media,.mbox,.shot,.scheme,.hero-strip,.magnet-shots,.poster-strip,details';
  // портрет не ловит события (pointer-events:none), поэтому его зону считаем по координатам
  var face=document.querySelector('.portrait');
  function overFace(x,y){
    if(!face) return false;
    var r=face.getBoundingClientRect();
    return x>=r.left && x<=r.right && y>=r.top && y<=r.bottom;
  }
  addEventListener('mousemove',function(e){
    mx=e.clientX; my=e.clientY; moving=1;
    var t=e.target;
    var calmZone=(t && t.closest && t.closest(CALM)) || overFace(mx,my);
    root.classList.toggle('cur-calm', !!calmZone);
  },{passive:true});
  addEventListener('mouseleave',function(){root.classList.add('cur-hide')});
  addEventListener('mouseenter',function(){root.classList.remove('cur-hide')});
  (function loop(){
    dot.style.transform='translate('+(mx-4.5)+'px,'+(my-4.5)+'px)';
    rx+=(mx-rx)*.16; ry+=(my-ry)*.16;
    ring.style.transform='translate('+(rx-19)+'px,'+(ry-19)+'px)';
    tx+=(mx-tx)*.08; ty+=(my-ty)*.08;
    trail.style.transform='translate('+(tx-60)+'px,'+(ty-60)+'px)';
    // след виден только пока мышь реально движется
    trail.style.opacity = moving ? '1' : '.35';
    moving=0;
    requestAnimationFrame(loop);
  })();
})();

// ── глубина: слои первого экрана расходятся при прокрутке ──
(function(){
  if(window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  var pic=document.querySelector('.portrait img')||document.querySelector('.cover-shot img');
  if(!pic) return;
  var box=pic.parentNode;
  pic.dataset.base=getComputedStyle(pic).position==='absolute'?'translateY(-50%)':'';
  var tick=0;
  addEventListener('scroll',function(){
    if(tick) return;
    tick=requestAnimationFrame(function(){
      tick=0;
      var y=Math.min(scrollY,900);
      pic.style.transform=(pic.dataset.base||'')+' translate3d(0,'+(y*.14)+'px,0) scale('+(1+y*.00006)+')';
    });
  },{passive:true});
  // у центрированных портретов уже есть translateX — иначе его снесёт
})();

// scroll-reveal: fadeUp при входе во вьюпорт
if(!('IntersectionObserver' in window)){
  document.documentElement.classList.remove('js');
}else{
var io=new IntersectionObserver(function(es){es.forEach(function(e){
  if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -8% 0px'});
document.querySelectorAll('[data-rv]').forEach(function(el,i){
  el.style.animationDelay=(i%4*70)+'ms';io.observe(el)});
}


// sticky-showcase: прогресс скролла -> раскрытие цвета + ступенчатые факты
document.querySelectorAll('.show-track').forEach(function(track){
  var shot=track.querySelector('.show-shot img.color'),
      facts=[].slice.call(track.querySelectorAll('.show-facts div')),
      dots=[].slice.call(track.querySelectorAll('.show-dots i'));
  if(!shot) return;
  var ticking=false;
  function upd(){
    var r=track.getBoundingClientRect(), vh=window.innerHeight, p=0;
    if(window.innerWidth<900){ p=1; }
    else if(r.top<=0){
      var d=r.height-vh;
      p=d>0?Math.min(Math.abs(r.top)/d,1):1;
    }
    shot.style.clipPath='inset(0 0 '+((1-p)*100).toFixed(1)+'% 0)';
    facts.forEach(function(f,i){ f.classList.toggle('on', p>=(i+1)*0.16); });
    dots.forEach(function(d,i){ d.classList.toggle('on', p>=i/dots.length); });
    ticking=false;
  }
  function onScroll(){ if(!ticking){ ticking=true; requestAnimationFrame(upd); } }
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',onScroll,{passive:true});
  upd();
});

// фильтр кейсов
var F=document.querySelectorAll('.chip'),C=document.querySelectorAll('.card');
F.forEach(function(b){b.onclick=function(){
  F.forEach(function(x){x.classList.remove('on')});b.classList.add('on');
  var f=b.dataset.f;
  C.forEach(function(c){c.classList.toggle('hide', f!=='all' && c.dataset.tag!==f)});
}});

// кейс: открытие/закрытие
function openCase(s){var m=document.getElementById('m-'+s);if(!m)return;
  m.classList.add('open');document.body.style.overflow='hidden';}
function closeCase(e,s){document.getElementById('m-'+s).classList.remove('open');
  document.body.style.overflow='';}
document.querySelectorAll('.modal').forEach(function(m){
  m.addEventListener('click',function(e){if(e.target===m){m.classList.remove('open');document.body.style.overflow=''}})});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){
  document.querySelectorAll('.modal.open').forEach(function(m){m.classList.remove('open')});
  document.body.style.overflow='';}});

// счётчики в ленте фактов
document.querySelectorAll('.fact b[data-n]').forEach(function(el){
  var t=parseInt(el.dataset.n,10),d=1100,st=null,done=false;
  var ob=new IntersectionObserver(function(es){es.forEach(function(e){
    if(e.isIntersecting&&!done){done=true;
      requestAnimationFrame(function step(ts){st=st||ts;var p=Math.min((ts-st)/d,1);
        el.textContent=Math.round(t*(1-Math.pow(1-p,3)));
        if(p<1)requestAnimationFrame(step)})}})},{threshold:.6});
  ob.observe(el)});