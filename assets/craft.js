// ── Свет за курсором и магнитные кнопки ──────────────────
// Один слушатель на документ вместо обработчика на каждой карточке:
// их на странице под сотню, и отдельные слушатели заметно грузят
// прокрутку. Позицию пишем в CSS-переменные, рисует всё CSS.
(function(){
if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;
if(!matchMedia('(hover:hover) and (pointer:fine)').matches) return;

var CARDS = '.r-job,.r-col,.r-item,.r-sgroup,.ct-card,.r-mode div,.card,.cert';
var MAGNET = '.r-btn,.cta-round';
var pending = 0, lastEv = null;

// Кэш геометрии магнитных кнопок. Храним координаты В ДОКУМЕНТЕ
// (плюс scrollY), а не во вьюпорте: тогда прокрутка не требует
// пересчёта — достаточно вычесть текущий scrollY.
var btns = [].slice.call(document.querySelectorAll(MAGNET));
var rects = [], sy = scrollY;
function remeasure(){
  var top = scrollY;
  rects = btns.map(function(b){
    var r = b.getBoundingClientRect();
    if(r.width < 2) return null;
    return {left: r.left, top: r.top + top, width: r.width, height: r.height,
            bottom: r.bottom + top};
  });
}
remeasure();
addEventListener('resize', remeasure);
addEventListener('load', remeasure);
if(document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
addEventListener('scroll', function(){ sy = scrollY }, {passive: true});

function paint(){
  pending = 0;
  var e = lastEv;
  if(!e) return;

  // подсветка внутри карточки под курсором
  var card = e.target.closest && e.target.closest(CARDS);
  if(card){
    var r = card.getBoundingClientRect();
    card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
    card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
  }

  // магнит: кнопка тянется к указателю, пока он рядом.
  // Раньше на КАЖДОМ движении мыши шёл querySelectorAll и по
  // getBoundingClientRect на каждую кнопку. Каждый такой замер заставляет
  // браузер пересчитать раскладку прямо посреди кадра — при живом канвасе
  // на первом экране это ощущалось как «курсор едет медленнее».
  // Список кнопок собираем один раз, геометрию — при прокрутке и resize.
  for(var i = 0; i < btns.length; i++){
    var b = btns[i], br = rects[i];
    if(!br) continue;
    if(br.bottom - sy < -200 || br.top - sy > innerHeight + 200) continue;
    var cx = br.left + br.width / 2, cy = br.top - sy + br.height / 2;
    var dx = e.clientX - cx, dy = e.clientY - cy;
    var dist = Math.hypot(dx, dy), reach = Math.max(br.width, br.height) * .9 + 46;
    if(dist < reach){
      var k = (1 - dist / reach) * .3;
      b.style.transform = 'translate(' + (dx * k).toFixed(1) + 'px,' + (dy * k).toFixed(1) + 'px)';
    }else if(b.style.transform){
      b.style.transform = '';
    }
  }
}

addEventListener('mousemove', function(e){
  lastEv = e;
  if(!pending) pending = requestAnimationFrame(paint);
}, {passive: true});

addEventListener('mouseleave', function(){
  document.querySelectorAll(MAGNET).forEach(function(b){ b.style.transform = '' });
});

// ── смена раздела: шов прочерчивается при входе блока ────
if('IntersectionObserver' in window){
  var secs = document.querySelectorAll('.r-sec');
  if(secs.length){
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(e.isIntersecting){ e.target.classList.add('sec-in'); io.unobserve(e.target) }
      });
    }, {threshold: .04, rootMargin: '0px 0px -12% 0px'});
    secs.forEach(function(s){ io.observe(s) });
  }
}
})();
