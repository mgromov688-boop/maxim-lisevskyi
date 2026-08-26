// ── Перевод страницы на русский и английский ─────────────
// Сайт один, украинский. Русская и английская версии — не отдельные
// адреса с отдельными кейсами, а подмена текста по словарю: одни и те же
// работы, один набор ассетов. Словарь лежит в assets/dict.js.
(function(){
var KEY = 'site-lang', SUPPORTED = {uk:1, ru:1, en:1};
var DICT = window.SITE_DICT || {};
var ATTRS = ['alt', 'title', 'aria-label', 'placeholder'];
var nodes = null, attrNodes = null;
var titleUk = document.title;                 // заголовок вкладки живёт вне body

function collect(){
  // Собираем узлы один раз и запоминаем украинский оригинал: переводим
  // всегда из него, иначе повторное переключение переводит перевод.
  nodes = [];
  var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: function(n){
      var p = n.parentNode;
      if(!p) return NodeFilter.FILTER_REJECT;
      var t = p.nodeName.toLowerCase();
      if(t === 'script' || t === 'style') return NodeFilter.FILTER_REJECT;
      return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  var n;
  while((n = w.nextNode())) nodes.push({node: n, uk: n.nodeValue});

  attrNodes = [];
  var all = document.body.querySelectorAll('*');
  for(var i = 0; i < all.length; i++){
    for(var j = 0; j < ATTRS.length; j++){
      var v = all[i].getAttribute(ATTRS[j]);
      if(v && v.trim()) attrNodes.push({el: all[i], attr: ATTRS[j], uk: v});
    }
  }
}

function pick(uk, lang){
  var key = uk.replace(/\s+/g, ' ').trim();
  var row = DICT[key];
  if(!row || !row[lang]) return null;
  // возвращаем перевод, сохранив исходные пробелы по краям
  var lead = uk.match(/^\s*/)[0], tail = uk.match(/\s*$/)[0];
  return lead + row[lang] + tail;
}

function apply(lang){
  if(!nodes) collect();
  var i, t;
  for(i = 0; i < nodes.length; i++){
    t = lang === 'uk' ? nodes[i].uk : pick(nodes[i].uk, lang);
    if(t !== null && nodes[i].node.nodeValue !== t) nodes[i].node.nodeValue = t;
    else if(t === null && nodes[i].node.nodeValue !== nodes[i].uk)
      nodes[i].node.nodeValue = nodes[i].uk;   // нет перевода — не выдумываем
  }
  for(i = 0; i < attrNodes.length; i++){
    t = lang === 'uk' ? attrNodes[i].uk : (pick(attrNodes[i].uk, lang) || attrNodes[i].uk);
    attrNodes[i].el.setAttribute(attrNodes[i].attr, t);
  }
  document.title = lang === 'uk' ? titleUk : (pick(titleUk, lang) || titleUk);
  document.documentElement.lang = lang;
  document.querySelectorAll('.langs button').forEach(function(b){
    var on = b.getAttribute('data-lang') === lang;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  try { localStorage.setItem(KEY, lang); } catch(e){}
}

document.querySelectorAll('.langs button').forEach(function(b){
  b.addEventListener('click', function(){ apply(b.getAttribute('data-lang')) });
});

// язык из прошлого визита; если его нет — украинский по умолчанию
var saved = null;
try { saved = localStorage.getItem(KEY); } catch(e){}
if(saved && SUPPORTED[saved] && saved !== 'uk') apply(saved);
else apply('uk');

window.setSiteLang = apply;
})();
