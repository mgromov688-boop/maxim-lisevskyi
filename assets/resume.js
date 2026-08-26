// ── Страница резюме. Один слушатель скролла на все эффекты ──
// Три rAF-цикла по отдельности дают заметный jank на слабом железе,
// поэтому чтения геометрии и записи в стиль идут одним проходом.
(function(){
var calm = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

// ── настоящий ли курсив у гарнитуры ──────────────────────
// Приём первого экрана держится на второй строке курсивом. Если у Geist
// нет кириллического italic, браузер синтезирует наклон — на 170px это
// выглядит дёшево. Тогда наклоняем сами, управляемо.
(function(){
  if(!document.fonts || !document.fonts.check) return;
  var probe = document.createElement('canvas').getContext('2d');
  probe.font = '700 64px Geist';
  var normal = probe.measureText('Лисевський').width;
  probe.font = 'italic 700 64px Geist';
  var ital = probe.measureText('Лисевський').width;
  // синтетический наклон не меняет метрики: ширина совпадает до пикселя
  if(Math.abs(normal - ital) < 0.5) document.documentElement.classList.add('no-italic');
})();

// ── счётчики метрик ──────────────────────────────────────
document.querySelectorAll('[data-count]').forEach(function(el){
  var to = parseFloat(el.getAttribute('data-count')), done = false;
  if(!('IntersectionObserver' in window) || calm){ el.textContent = to; return; }
  new IntersectionObserver(function(es, ob){
    es.forEach(function(e){
      if(!e.isIntersecting || done) return;
      done = true; ob.disconnect();
      var t0 = 0;
      (function step(ts){
        if(!t0) t0 = ts;
        var p = Math.min((ts - t0) / 900, 1);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
        if(p < 1) requestAnimationFrame(step);
      })(0);
    });
  }, {threshold:.5}).observe(el);
});

// ── переключатель домена в процессе ──────────────────────
// Все четыре набора чипов лежат в DOM всегда: если монтировать их по
// клику, IntersectionObserver из site.js их уже не увидит и они
// останутся невидимыми навсегда.
document.querySelectorAll('.r-tab').forEach(function(tab){
  tab.addEventListener('click', function(){
    var key = tab.getAttribute('data-d');
    document.querySelectorAll('.r-tab').forEach(function(t){ t.classList.toggle('on', t === tab) });
    document.querySelectorAll('.r-domain').forEach(function(d){
      d.classList.toggle('on', d.getAttribute('data-d') === key);
    });
  });
});

// ── один проход по скроллу ───────────────────────────────
var bridge = document.querySelector('.r-track'),
    bImg   = document.querySelector('.r-bmedia img.c'),
    bCount = document.querySelector('.r-bcount b'),
    proc   = document.querySelector('.r-proc'),
    steps  = [].slice.call(document.querySelectorAll('.r-step')),
    jobs   = [].slice.call(document.querySelectorAll('.r-job[data-year]')),
    rail   = document.querySelector('.r-rail-in b');

var ticking = false;
function onScroll(){
  if(ticking) return;
  ticking = true;
  requestAnimationFrame(function(){
    ticking = false;
    var vh = window.innerHeight;

    // мост: чёрно-белое раскрывается в цвет по прогрессу липкого блока
    if(bridge && bImg){
      var b = bridge.getBoundingClientRect(),
          p = Math.min(Math.max(-b.top / (b.height - vh), 0), 1);
      bImg.style.clipPath = 'inset(0 ' + ((1 - p) * 100).toFixed(1) + '% 0 0)';
      if(bCount) bCount.textContent = Math.round(p * 9);
    }

    // процесс: линия заливается, текущий шаг подсвечивается
    if(proc && steps.length){
      var r = proc.getBoundingClientRect(),
          q = Math.min(Math.max((vh * .62 - r.top) / r.height, 0), 1);
      proc.style.setProperty('--fill', (q * 100).toFixed(1) + '%');
      var act = -1;
      steps.forEach(function(s, i){
        var sr = s.getBoundingClientRect();
        if(sr.top < vh * .62 && sr.bottom > vh * .2) act = i;
      });
      steps.forEach(function(s, i){ s.classList.toggle('act', i === act) });
    }

    // Рейка опыта: номер позиции, ближайшей к линии чтения.
    // Год здесь показывать нельзя — места работы идут не по хронологии,
    // и цифра прыгала бы назад, читаясь как ошибка вёрстки.
    if(rail && jobs.length){
      var line = vh * .3, idx = 0, best = Infinity;
      jobs.forEach(function(j, i){
        var r = j.getBoundingClientRect(),
            d = r.top > line ? r.top - line : (r.bottom < line ? line - r.bottom : 0);
        if(d < best){ best = d; idx = i }
      });
      var n = ('0' + (idx + 1)).slice(-2);
      if(rail.textContent !== n) rail.textContent = n;
    }
  });
}
window.addEventListener('scroll', onScroll, {passive:true});
window.addEventListener('resize', onScroll, {passive:true});
onScroll();
})();
