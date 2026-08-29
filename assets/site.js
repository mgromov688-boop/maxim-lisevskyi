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
  var mouse={x:-9999,y:-9999};
  var probe=null,maskImg=null,LINK=140,POWER=1.25;
  var MASK=mimg?mimg.getAttribute('src'):null;
  // Палитра кадра — ЧЁРНЫЙ и ОРАНЖЕВЫЙ, третьего нет.
  // Холодный белый, которым раньше рисовалась сеть, выпадал из композиции:
  // у фигуры на снимке оранжевая контровая отбивка, и свет вокруг обязан
  // быть того же источника. Чтобы фон при этом не уходил в «блёклый тёплый»,
  // держим не цвет, а ЯРКОСТЬ: заливка идёт долями процента, свет собран
  // у кромок фигуры, а не размазан по кадру.
  function col(o){return 'rgba(255,122,40,'+o+')';}       // сеть, узлы, свет
  function acc(o){return 'rgba(255,140,54,'+o+')';}       // пакеты, кометы, вспышки

  function loadMask(){
    if(!MASK||maskImg) return;
    var im=new Image();
    im.onload=function(){
      maskImg=im;
      // Чтение пикселей маски нужно только для проверки «курсор на фигуре».
      // Под file:// картинка помечает канвас как чужую, и getImageData
      // бросает SecurityError — без try отсюда вылетало всё остальное,
      // включая пересборку выреза. На боевом адресе источник свой.
      try{
        var c=document.createElement('canvas');
        c.width=200;c.height=Math.max(1,Math.round(200*im.height/im.width));
        var x=c.getContext('2d');x.drawImage(im,0,0,c.width,c.height);
        probe={d:x.getImageData(0,0,c.width,c.height).data,w:c.width,h:c.height};
      }catch(e){probe=null;}
      buildCut();
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

  // ── маска выреза: СТРОГО по контуру, без прямоугольников ──
  // Прежний вариант гасил прямоугольник вокруг каждого блока и размывал
  // его на 26px. На чёрном кадре это читалось кляксой: пятно живёт своей
  // формой, к тексту отношения не имеет. Теперь вырез повторяет то, что
  // элемент реально показывает: плашка (пилюля, чипы, кнопка) — свою
  // скруглённую форму, чистый текст — форму букв.
  //
  // Буквы вырезаются вместе с внутренними просветами: глиф рисуется не
  // один раз, а венцом смещений по окружности радиуса R. Это смыкает
  // «о», «б», «а» изнутри и даёт ровный отступ снаружи — то же, что даёт
  // морфологическое расширение, но без чтения пикселей.
  // Маска одна и только по фигуре: линии сети не должны бежать по лицу.
  // Вырез по буквам был нужен, пока под текстом лежало свечение — свечения
  // больше нет, гасить нечего.
  var cutFig=null;

  function resize(){
    var r=shot.getBoundingClientRect();
    DPR=Math.min(window.devicePixelRatio||1,2);
    if(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4) DPR=Math.min(DPR,1.5);
    W=cv.width=Math.max(1,Math.floor(r.width*DPR));
    H=cv.height=Math.max(1,Math.floor(r.height*DPR));
    cv.style.width=r.width+'px';cv.style.height=r.height+'px';
    nodes=[];packets=[];calls=[];ripples=[];
    var n=Math.round((W/DPR)*(H/DPR)/15000);
    n=Math.max(30,Math.min(n,72));   // связи растут квадратом — потолок держим низко
    for(var i=0;i<n;i++) nodes.push({x:Math.random()*W,y:Math.random()*H,
      vx:(Math.random()-.5)*.18*DPR,vy:(Math.random()-.5)*.18*DPR,
      r:(Math.random()*1.6+.8)*DPR,hub:Math.random()<.09,ph:Math.random()*6.28});
    buildCut();
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
    // shadowBlur пересчитывает размытие вокруг каждой точки и стоит
    // заметной доли кадра. Ореол даём вторым, более тусклым кругом.
    ctx.beginPath();ctx.arc(h.x,h.y,6*DPR,0,6.283);
    ctx.fillStyle=acc(.13*env);ctx.fill();
    ctx.beginPath();ctx.arc(h.x,h.y,2.1*DPR,0,6.283);
    ctx.fillStyle=acc(.95*env);ctx.fill();
  }

  function buildCut(){
    if(!W||!H||!maskImg) return;
    if(!cutFig) cutFig=document.createElement('canvas');
    cutFig.width=W;cutFig.height=H;
    var gf=cutFig.getContext('2d');
    gf.clearRect(0,0,W,H);gf.fillStyle='#000';
    var cr=cv.getBoundingClientRect(),ir=img.getBoundingClientRect();
    // Венец смещений даёт краю фигуры отступ: линия не липнет к контуру.
    var x=(ir.left-cr.left)*DPR,y=(ir.top-cr.top)*DPR,
        w2=ir.width*DPR,h2=ir.height*DPR,R2=3*DPR;
    for(var k=0;k<10;k++){
      var a=k/10*6.283185;
      gf.drawImage(maskImg,x+Math.cos(a)*R2,y+Math.sin(a)*R2,w2,h2);
    }
    gf.drawImage(maskImg,x,y,w2,h2);
  }

  // ── СВЕЧЕНИЯ НЕТ ─────────────────────────────────────────
  // Решение Максима 26.08: фон первого экрана — чистый чёрный, за ним
  // только сеть. Ни фоновой ауры, ни света за курсором. Всё, что
  // подмешивало яркость, снято: и заливки, и спрайт курсора.
  // Заодно ушла причина, по которой вырез приходилось делать по буквам —
  // гасить под текстом больше нечего, маска осталась только на фигуре.

  // вырезаем готовую маску одним destination-out: и силуэт, и текст
  // лежат в ней уже по своим контурам, размывать нечего.
  function cutOut(m){
    if(!m) return;
    ctx.save();
    ctx.globalCompositeOperation='destination-out';
    ctx.drawImage(m,0,0);
    ctx.restore();
  }

  function frame(now){
    var dt=Math.min((now-last)/1000,.05);last=now;
    var k=POWER,link=LINK*DPR,mr=170*DPR,i,j;
    ctx.clearRect(0,0,W,H);
    for(i=0;i<nodes.length;i++){var n=nodes[i];n.x+=n.vx;n.y+=n.vy;
      if(n.x<0||n.x>W)n.vx*=-1;if(n.y<0||n.y>H)n.vy*=-1;}
    callT-=dt;if(callT<=0){spawnCall();callT=2.4+Math.random()*2.6;}
    packetT-=dt;if(packetT<=0){spawnPacket();packetT=.45+Math.random()*.65;}
    for(i=0;i<nodes.length;i++)for(j=i+1;j<nodes.length;j++){
      var a=nodes[i],b=nodes[j],dx=a.x-b.x,dy=a.y-b.y,q=dx*dx+dy*dy;
      if(q<link*link){var d=Math.sqrt(q);
        ctx.strokeStyle=col((1-d/link)*.23*k);ctx.lineWidth=DPR*.6;
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    }
    for(i=packets.length-1;i>=0;i--){
      var pk=packets[i];pk.p+=pk.sp*dt;
      if(pk.p>=1){packets.splice(i,1);continue;}
      var x=pk.a.x+(pk.b.x-pk.a.x)*pk.p,y=pk.a.y+(pk.b.y-pk.a.y)*pk.p,o=Math.sin(Math.PI*pk.p);
      ctx.beginPath();ctx.arc(x,y,1.7*DPR,0,6.283);
      ctx.fillStyle=acc(.16*o*k);ctx.fill();
      ctx.beginPath();ctx.arc(x,y,1.7*DPR,0,6.283);
      ctx.fillStyle=acc(.85*o*k);ctx.fill();
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
    cutOut(cutFig);            // с фигуры снято всё, включая линии
    raf=requestAnimationFrame(frame);
  }

  function start(){if(!raf&&visible&&!calm){last=performance.now();raf=requestAnimationFrame(frame);}}
  function stop(){if(raf){cancelAnimationFrame(raf);raf=null;}}

  var KEEP='.cov-grid,.bigname,header,.cov-scroll';
  window.addEventListener('mousemove',function(e){
    var t=e.target;
    if((t&&t.closest&&t.closest(KEEP))||onFigure(e.clientX,e.clientY)){
      mouse.x=mouse.y=-9999;return;
    }
    var r=cv.getBoundingClientRect();
    mouse.x=(e.clientX-r.left)*DPR;mouse.y=(e.clientY-r.top)*DPR;
  },{passive:true});
  window.addEventListener('mouseout',function(){mouse.x=mouse.y=-9999;},{passive:true});
  window.addEventListener('resize',function(){resize();},{passive:true});
  // Маска строится ПО ФАКТИЧЕСКИМ боксам текста, поэтому её нельзя
  // собирать раньше, чем текст встал на место. Первый прогон случался до
  // подмены шрифта: с запасным начертанием строки стоят на других высотах,
  // и после подмены вырез оставался ниже текста — на кадре был виден
  // тёмный призрак абзаца. Пересобираем на каждом событии, которое двигает
  // раскладку: подмена шрифтов, полная загрузка, смена языка, прокрутка.
  var cutT=0;
  function laterCut(){clearTimeout(cutT);cutT=setTimeout(buildCut,180);}
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(laterCut);
  window.addEventListener('load',laterCut);
  document.addEventListener('i18n:changed',laterCut);
  window.addEventListener('scroll',laterCut,{passive:true});
  // Главный источник промаха: блоки первого экрана выезжают reveal-анимацией.
  // Пока переход идёт, getBoundingClientRect отдаёт СМЕЩЁННУЮ позицию, и
  // маска застывала ниже текста — на кадре читался тёмный призрак абзаца
  // (замер: вырез на экране 465..517 при тексте 418..493, промах 47px).
  // Ловим конец переходов и пересобираем по осевшей раскладке.
  var hero=document.querySelector('.hero-cover');
  if(hero){
    hero.addEventListener('transitionend',laterCut);
    hero.addEventListener('animationend',laterCut);
  }
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
    if(idle){ idle=0; wake(); }
    var t=e.target;
    var calmZone=(t && t.closest && t.closest(CALM)) || overFace(mx,my);
    root.classList.toggle('cur-calm', !!calmZone);
  },{passive:true});
  addEventListener('mouseleave',function(){root.classList.add('cur-hide')});
  addEventListener('mouseenter',function(){root.classList.remove('cur-hide')});
  // Коэффициенты подтянуты: было .16 и .08 — кольцо и след тащились
  // за указателем так заметно, что курсор читался «медленным». Ближе к
  // трети шага — инерция ещё видна, но рука ведёт, а не догоняет.
  var RING=.30, TRAIL=.17, idle=0, alive=0;
  function loop(){
    alive=0;
    dot.style.transform='translate('+(mx-4.5)+'px,'+(my-4.5)+'px)';
    rx+=(mx-rx)*RING; ry+=(my-ry)*RING;
    ring.style.transform='translate('+(rx-19)+'px,'+(ry-19)+'px)';
    tx+=(mx-tx)*TRAIL; ty+=(my-ty)*TRAIL;
    trail.style.transform='translate('+(tx-60)+'px,'+(ty-60)+'px)';
    trail.style.opacity = moving ? '1' : '.35';
    // Цикл крутился ВСЕГДА, даже когда мышь стоит: постоянная работа
    // в каждом кадре впустую. Останавливаемся, когда догнали указатель,
    // и просыпаемся от движения мыши.
    var far=Math.abs(mx-rx)+Math.abs(my-ry)+Math.abs(mx-tx)+Math.abs(my-ty);
    moving=0;
    if(far<0.6){ idle=1; return; }
    wake();
  }
  function wake(){ if(!alive){ alive=1; requestAnimationFrame(loop);} }
  loop();
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
// Порядок кейсов — из сетки, а не из отдельного списка: переставят
// карточки — лента переставится сама.
function caseOrder(){
  return [].slice.call(document.querySelectorAll('.grid .card'))
    .map(function(c){var a=(c.getAttribute('onclick')||'').match(/openCase\((?:'|&#39;)([a-z0-9-]+)/);
      return a?a[1]:null;}).filter(Boolean);
}
function caseTitle(id){
  var c=document.querySelector('.grid .card[onclick*="'+id+'"] .ctitle');
  return c?c.textContent.trim():id;
}
function buildFoot(m,id){
  if(m.querySelector('.mfoot')) return;
  var box=m.querySelector('.mbox'); if(!box) return;
  var сп=caseOrder(), i=сп.indexOf(id);
  var f=document.createElement('div'); f.className='mfoot';

  function кнопка(cid,сторона){
    if(!cid){var g=document.createElement('span');g.className='mnav ghost';return g;}
    var b=document.createElement('button');
    b.type='button'; b.className='mnav '+сторона;
    var ar=document.createElement('span'); ar.className='ar';
    ar.textContent = сторона==='prev' ? '←' : '→';
    var tt=document.createElement('span'); tt.className='tt'; tt.textContent=caseTitle(cid);
    if(сторона==='prev'){ b.appendChild(ar); b.appendChild(tt); }
    else { b.appendChild(tt); b.appendChild(ar); }
    b.addEventListener('click',function(){ goCase(cid) });
    return b;
  }

  var cta=document.createElement('a');
  cta.className='mcta'; cta.href='https://t.me/Maximpact888';
  cta.target='_blank'; cta.rel='noopener';
  // Подпись берём из кнопки первого экрана: её переводит штатный словарь,
  // а строку, созданную скриптом, обход текстовых узлов не увидит.
  var обр=document.querySelector('.cov-r .cta-round .lbl');
  cta.textContent = обр ? обр.textContent.trim() : 'Обговорити задачу';

  f.appendChild(кнопка(i>0?сп[i-1]:null,'prev'));
  f.appendChild(cta);
  f.appendChild(кнопка((i>-1&&i<сп.length-1)?сп[i+1]:null,'next'));
  box.appendChild(f);
}
// Смена языка меняет и подпись кнопки, и заголовки соседних кейсов —
// собранный подвал устаревает. Сносим, он отстроится при открытии.
document.addEventListener('i18n:changed',function(){
  document.querySelectorAll('.mfoot').forEach(function(f){f.remove()});
});
function goCase(id){
  document.querySelectorAll('.modal.open').forEach(function(m){m.classList.remove('open')});
  openCase(id);
  var m=document.getElementById('m-'+id); if(m) m.scrollTop=0;
}
function openCase(s){var m=document.getElementById('m-'+s);if(!m)return;
  buildFoot(m,s);
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