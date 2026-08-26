// ── Прямые ссылки на кейс ────────────────────────────────
// Раньше портфолио было входной точкой само по себе. Теперь на него
// приходят с резюме, и ссылку на конкретный кейс захочется отправить
// отдельно — поэтому открытый кейс живёт в адресе страницы.
(function(){
var open = window.openCase, close = window.closeCase;
if(typeof open !== 'function') return;

function slugOf(hash){
  var m = /^#case-([a-z0-9-]+)$/i.exec(hash || '');
  return m ? m[1] : null;
}

window.openCase = function(s){
  open(s);
  if(location.hash !== '#case-' + s) history.pushState({c:s}, '', '#case-' + s);
};

window.closeCase = function(e, s){
  close(e, s);
  // назад по истории, чтобы кнопка «назад» браузера вела не на резюме,
  // а на список кейсов — если в истории есть куда возвращаться
  if(slugOf(location.hash)) history.replaceState({}, '', location.pathname + location.search);
};

function syncFromHash(){
  var s = slugOf(location.hash);
  document.querySelectorAll('.modal.open').forEach(function(m){ m.classList.remove('open') });
  if(s && document.getElementById('m-' + s)){
    open(s);
  }else{
    document.body.style.overflow = '';
  }
}
window.addEventListener('popstate', syncFromHash);
window.addEventListener('hashchange', syncFromHash);
if(slugOf(location.hash)) syncFromHash();

// Esc и клик по фону закрывают модалку внутри site.js — адрес чистим здесь
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && slugOf(location.hash))
    history.replaceState({}, '', location.pathname + location.search);
});
document.querySelectorAll('.modal').forEach(function(m){
  m.addEventListener('click', function(e){
    if(e.target === m && slugOf(location.hash))
      history.replaceState({}, '', location.pathname + location.search);
  });
});
})();
