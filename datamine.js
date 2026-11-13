// 데이터마이닝 한글 정리 페이지: 데이터(DM)를 화면으로 그리고 검색한다.
(function () {
  var body = document.getElementById('dm-body'), nav = document.getElementById('dm-nav');
  var q = document.getElementById('dm-q'), status = document.getElementById('dm-status'), empty = document.getElementById('dm-empty');
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var cards = [], sections = [], total = 0;
  DM.sections.forEach(function (sec) {
    var count = sec.groups.reduce(function (n, g) { return n + g.records.length; }, 0);
    var link = el('a', '', sec.ko);
    link.href = '#' + sec.id;
    link.append(el('small', '', String(count)));
    nav.append(link);
    var s = el('section', 'dm-sec'); s.id = sec.id;
    var h2 = el('h2', '', sec.ko); if (sec.en && sec.en !== sec.ko) h2.append(el('small', '', sec.en));
    s.append(h2);
    var groupEls = [];
    sec.groups.forEach(function (g) {
      var ge = el('div', 'dm-group');
      if (g.en) { var h3 = el('h3', '', g.ko || g.en); if (g.ko) h3.append(el('small', '', g.en)); ge.append(h3); }
      var items = [];
      g.records.forEach(function (r) {
        var c = el('article', 'dm-card');
        var h4 = el('h4');
        if (r.isId) h4.append(el('code', '', r.en));
        else { h4.append(document.createTextNode(r.ko || r.en)); if (r.ko && r.ko !== r.en) h4.append(el('small', '', r.en)); }
        c.append(h4);
        r.lines.forEach(function (l) {
          var p = el('p', 'dm-line');
          if (l.ko) { p.append(el('span', 'dm-ko', l.ko)); p.append(el('span', 'dm-en', l.en)); }
          else p.append(el('span', 'dm-ko', l.en));
          c.append(p);
        });
        if (r.meta.length) {
          var m = el('div', 'dm-meta');
          r.meta.forEach(function (kv) {
            if (kv[0] === 'ID' && r.isId && kv[1] === r.en) return;
            var sp = el('span'); sp.append(el('b', '', kv[0] + ' ')); sp.append(el('code', '', kv[1])); m.append(sp);
          });
          if (m.childNodes.length) c.append(m);
        }
        ge.append(c);
        var text = (sec.ko + ' ' + (r.ko || '') + ' ' + r.en + ' ' + r.lines.map(function (l) { return (l.ko || '') + ' ' + l.en; }).join(' ') + ' ' + r.meta.map(function (kv) { return kv[0] + ' ' + kv[1]; }).join(' ')).toLowerCase();
        var entry = { el: c, text: text, group: ge, sec: s };
        cards.push(entry); items.push(entry); total++;
      });
      s.append(ge); groupEls.push({ el: ge, items: items });
    });
    body.append(s);
    sections.push({ el: s, groups: groupEls });
  });
  function filter() {
    var words = q.value.toLowerCase().split(/\s+/).filter(Boolean), shown = 0;
    cards.forEach(function (c) { var ok = words.every(function (w) { return c.text.indexOf(w) >= 0; }); c.el.hidden = !ok; if (ok) shown++; });
    sections.forEach(function (s) {
      var any = false;
      s.groups.forEach(function (g) { var a = g.items.some(function (i) { return !i.el.hidden; }); g.el.hidden = !a; any = any || a; });
      s.el.hidden = !any;
    });
    status.textContent = words.length ? shown + ' / ' + total + '개 일치' : total + '개 항목';
    empty.hidden = shown > 0;
  }
  q.addEventListener('input', filter);
  filter();
})();
