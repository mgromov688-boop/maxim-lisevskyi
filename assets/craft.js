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

  // магнит: кнопка тянется к указателю, пока он рядом
  var btns = document.querySelectorAll(MAGNET);
  for(var i = 0; i < btns.length; i++){
    var b = btns[i], br = b.getBoundingClientRect();
    if(br.bottom < -200 || br.top > innerHeight + 200) continue;   // вне экрана — не считаем
    var cx = br.left + br.width / 2, cy = br.top + br.height / 2;
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
