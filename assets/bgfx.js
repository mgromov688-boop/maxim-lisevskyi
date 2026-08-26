// ── Глубина фона: четыре слоя, разные скорости ───────────
// Слои строим из JS, чтобы разметка обеих страниц осталась чистой.
// Объём даёт не картинка, а разница между слоями: дальний почти
// не движется, ближний уезжает заметно. Плюс противоход мыши.
(function(){
var calm = matchMedia('(prefers-reduced-motion:reduce)').matches;
var fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
var narrow = innerWidth <= 900;

var box = document.createElement('div');
box.className = 'bgfx';
box.setAttribute('aria-hidden', 'true');

// ── Слой −1: снятый кадр под каждым блоком ───────────────
// У блока своя сцена из одной мастерской: чертёж, инструменты,
// стопка листов. Кадр меняется перетеканием, когда блок доходит
// до середины экрана, и всегда лежит ПОД процедурными слоями.
var DIR = (location.pathname.indexOf('/roboty/') > -1) ? '../assets/bg/' : 'assets/bg/';
var SCENES = narrow
  ? [['body', 'works-m']]                       // телефон: один кадр на страницу
  : [
      ['.r-hero',    'hero'],
      ['#facts',     'hero'],
      ['#for-whom',  'whom'],
      ['#experience','exp'],
      ['.r-bridge',  'works'],
      ['#stack',     'stack'],
      ['#education', 'edu'],
      ['#process',   'proc'],
      ['#faq',       'proc'],
      ['#contact',   'contact'],
      ['.hero-cover','works'],                  // страница кейсов
      ['#works',     'works'],
      ['.show',      'works']
    ];

var photo = layer('bg-photo');
var slotA = document.createElement('i'), slotB = document.createElement('i');
slotA.className = slotB.className = 'bp';
photo.appendChild(slotA); photo.appendChild(slotB);
box.appendChild(photo);

var cur = null, front = slotA, backSlot = slotB, cache = {};
function show(name){
  if(name === cur) return;
  cur = name;
  var url = DIR + 'bg-' + name + '.webp';
  // ждём загрузки, иначе слой мигнёт пустотой на плохой связи
  if(cache[name]){ swap(url); return; }
  var im = new Image();
  im.onload = function(){ cache[name] = 1; swap(url) };
  im.src = url;
}
function swap(url){
  backSlot.style.backgroundImage = 'url("' + url + '")';
  backSlot.classList.add('on');
  front.classList.remove('on');
  var t = front; front = backSlot; backSlot = t;
}
// крупную форму на заднем плане. Без неё сетка одна читается плоско:
// глубину показывает не количество деталей, а разный масштаб.
var NS0 = 'http://www.w3.org/2000/svg';
var orb = document.createElementNS(NS0, 'svg');
orb.setAttribute('class', 'bg-orbits');
orb.setAttribute('viewBox', '0 0 1000 1000');
orb.setAttribute('preserveAspectRatio', 'xMidYMid slice');
[[500, 480, 300], [500, 480, 430], [500, 480, 580], [500, 480, 760]].forEach(function(c, k){
  var el = document.createElementNS(NS0, 'circle');
  el.setAttribute('cx', c[0]); el.setAttribute('cy', c[1]); el.setAttribute('r', c[2]);
  el.style.animationDelay = (k * .9) + 's';
  orb.appendChild(el);
});
box.appendChild(orb);

// Слой 1 — сетка. Координаты в пикселях, не в процентах: растянутый
// viewBox превращает горизонтальный пунктир в длинные тире, а
// вертикальный оставляет мелким — сетка сразу читается как брак.
var NS = 'http://www.w3.org/2000/svg';
var CELL = 132;
var W = Math.ceil(innerWidth * 1.3 / CELL) * CELL;
var H = Math.ceil(innerHeight * 1.3 / CELL) * CELL;
var svg = document.createElementNS(NS, 'svg');
svg.setAttribute('class', 'bg-grid');
svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
var i, ln;
for(i = 0; i <= H; i += CELL){
  ln = document.createElementNS(NS, 'line');
  ln.setAttribute('x1', 0); ln.setAttribute('y1', i);
  ln.setAttribute('x2', W); ln.setAttribute('y2', i);
  svg.appendChild(ln);
}
for(i = 0; i <= W; i += CELL){
  ln = document.createElementNS(NS, 'line');
  ln.setAttribute('class', 'v');
  ln.setAttribute('x1', i); ln.setAttribute('y1', 0);
  ln.setAttribute('x2', i); ln.setAttribute('y2', H);
  svg.appendChild(ln);
}
box.appendChild(svg);

function layer(cls){ var d = document.createElement('div'); d.className = cls; return d }

// Слой 2 — узлы. Своя редкая решётка в процентах: она НЕ должна
// совпадать с сеткой, слои всё равно разъезжаются на разной скорости,
// а совпадение читалось бы как одна плоскость, а не как две.
var nodes = layer('bg-nodes');
var GAP = 12.5;
for(var y = GAP; y < 100; y += GAP){
  for(var x = GAP; x < 100; x += GAP){
    if((x / GAP + y / GAP) % 3) continue;
    var n = document.createElement('i');
    n.className = 'bg-node';
    n.style.left = x + '%'; n.style.top = y + '%';
    n.style.animationDelay = ((x + y) % 40) / 10 + 's';
    nodes.appendChild(n);
  }
}
box.appendChild(nodes);

// слой 3 — ближние искры
var motes = layer('bg-motes');
if(!narrow){
  // Искр было 26. Каждая — отдельный слой композитора: у неё бесконечная
  // анимация и своя тень. Сорок с лишним таких микрослоёв на кадр стоят
  // дороже, чем читаются: массу движения держит дюжина.
  for(i = 0; i < 12; i++){
    var m = document.createElement('i');
    m.className = 'bg-mote';
    m.style.left = (7 + (i * 37) % 86) + '%';
    m.style.top = (5 + (i * 61) % 90) + '%';
    m.style.animationDelay = (i % 9) * .7 + 's';
    m.style.animationDuration = (7 + i % 5) + 's';
    motes.appendChild(m);
  }
}
box.appendChild(motes);
box.appendChild(layer('bg-veil'));
// слой зерна не создаём: текстура впечатана в файлы фона (см. bgfx.css)

// Свет за курсором убран по всему сайту: фон чёрный, движение даёт
// только сеть и параллакс слоёв.
var cursor = layer('bg-cursor');
document.body.insertBefore(box, document.body.firstChild);

// ── движение ─────────────────────────────────────────────
// Коэффициенты — это и есть глубина: 0.04 против 0.26 читается
// как расстояние между слоями, одинаковые значения дали бы плоскость.
var L = [
  {el: photo, s: .008, m: 1},
  {el: orb,   s: .015, m: 2},
  {el: svg,   s: .06,  m: 6},
  {el: nodes, s: .13,  m: 13},
  {el: motes, s: .30,  m: 26}
];
var sy = 0, mx = 0, my = 0, tick = 0;

function frame(){
  tick = 0;
  for(var i = 0; i < L.length; i++){
    var l = L[i];
    l.el.style.transform = 'translate3d(' + (-mx * l.m).toFixed(1) + 'px,'
      + (-sy * l.s - my * l.m).toFixed(1) + 'px,0)';
  }
}
function schedule(){ if(!tick) tick = requestAnimationFrame(frame) }

if(!calm){
  addEventListener('scroll', function(){ sy = scrollY; schedule() }, {passive: true});
  sy = scrollY; schedule();
}
if(fine && !narrow && !calm){
  addEventListener('mousemove', function(e){
    mx = (e.clientX / innerWidth - .5) * 2;      // -1 … 1
    my = (e.clientY / innerHeight - .5) * 2;
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
    cursor.classList.add('on');
    schedule();
  }, {passive: true});
  addEventListener('mouseleave', function(){ cursor.classList.remove('on') });

  // отклик на клик — кольцо расходится от точки нажатия
  addEventListener('click', function(e){
    if(e.target.closest('a,button,details,.card,.modal')) return;
    var r = document.createElement('span');
    r.className = 'bg-ring';
    r.style.left = e.clientX + 'px';
    r.style.top = e.clientY + 'px';
    document.body.appendChild(r);
    setTimeout(function(){ r.remove() }, 900);
  });
}

// ── смена кадра по блокам ────────────────────────────────
// Берём тот блок, чья середина ближе к середине экрана: наблюдатель
// «кто последний вошёл» на коротких секциях скачет туда-сюда.
var zones = [];
SCENES.forEach(function(s){
  document.querySelectorAll(s[0]).forEach(function(el){ zones.push({el: el, name: s[1]}) });
});
if(zones.length){
  if(narrow){
    show(location.pathname.indexOf('/roboty/') > -1 ? 'works-m' : 'cv-m');
  }else{
    var pending = 0;
    var pickScene = function(){
      pending = 0;
      var mid = innerHeight / 2, best = null, bd = Infinity;
      for(var i = 0; i < zones.length; i++){
        var r = zones[i].el.getBoundingClientRect();
        if(r.bottom < 0 || r.top > innerHeight) continue;
        var d = Math.abs((r.top + r.bottom) / 2 - mid);
        if(d < bd){ bd = d; best = zones[i].name }
      }
      if(best) show(best);
    };
    addEventListener('scroll', function(){
      if(!pending) pending = requestAnimationFrame(pickScene);
    }, {passive: true});
    addEventListener('resize', pickScene, {passive: true});
    pickScene();
  }
}

// угловые засечки первого экрана
var hero = document.querySelector('.r-hero');
if(hero){
  ['tl', 'tr', 'bl', 'br'].forEach(function(c){
    var s = document.createElement('span');
    s.className = 'corner ' + c;
    s.setAttribute('aria-hidden', 'true');
    hero.appendChild(s);
  });
}
})();
