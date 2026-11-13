// 데이터마이닝 한글 정리 페이지: 데이터(DM)를 화면으로 그리고 검색한다. 섹션은 눌러서 펼친다.
(function () {
  var body = document.getElementById('dm-body'), nav = document.getElementById('dm-nav');
  var q = document.getElementById('dm-q'), status = document.getElementById('dm-status'), empty = document.getElementById('dm-empty');
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var TIERS = ['하급', '중급', '상급', '상급1', '상급2', '상급3', '여왕', '우버', '1', '2', '3', ''];
  var TCLS = { '하급': 't-low', '중급': 't-med', '상급': 't-high', '상급1': 't-high', '상급2': 't-high', '상급3': 't-high', '여왕': 't-queen', '우버': 't-uber' };
  var cards = [], sections = [], total = 0;

  function lineEls(r) {
    return r.lines.map(function (l) {
      var p = el('p', 'dm-line');
      if (l.ko) { p.append(el('span', 'dm-ko', l.ko)); p.append(el('span', 'dm-en', l.en)); }
      else p.append(el('span', 'dm-ko', l.en));
      return p;
    });
  }
  function textOf(secKo, recs) {
    return (secKo + ' ' + recs.map(function (r) {
      return (r.ko || '') + ' ' + r.en + ' ' + r.lines.map(function (l) { return (l.ko || '') + ' ' + l.en; }).join(' ') + ' ' + r.meta.map(function (kv) { return kv[0] + ' ' + kv[1]; }).join(' ');
    }).join(' ')).toLowerCase();
  }
  // 일반 카드
  function plainCard(r) {
    var c = el('article', 'dm-card'), h4 = el('h4');
    if (r.isId) h4.append(el('code', '', r.en));
    else { h4.append(document.createTextNode(r.ko || r.en)); if (r.ko && r.ko !== r.en) h4.append(el('small', '', r.en)); }
    c.append(h4);
    lineEls(r).forEach(function (p) { c.append(p); });
    if (r.meta.length) {
      var m = el('div', 'dm-meta');
      r.meta.forEach(function (kv) {
        if (kv[0] === 'ID' && r.isId && kv[1] === r.en) return;
        var sp = el('span'); sp.append(el('b', '', kv[0] + ' ')); sp.append(el('code', '', kv[1])); m.append(sp);
      });
      if (m.childNodes.length) c.append(m);
    }
    return c;
  }
  // 제웅 카드: 왼쪽에 이름·부위, 오른쪽에 등급별 줄(상급이 위, 하급이 아래)
  var EORDER = ['우버', '여왕', '상급', '상급1', '상급2', '상급3', '중급', '하급', '1', '2', '3', ''];
  function effigyCard(base, recs) {
    var c = el('article', 'dm-card dm-eff');
    var left = el('div', 'dm-eff-name', base);
    left.append(el('span', 'dm-slot', recs[0].slot || ''));
    c.append(left);
    recs.sort(function (a, b) { return EORDER.indexOf(a.tier) - EORDER.indexOf(b.tier); });
    var rows = el('div', 'dm-rows');
    recs.forEach(function (r) {
      var row = el('div', 'dm-row ' + (TCLS[r.tier] || ''));
      row.append(el('span', 'dm-tier-name', r.tier || '효과'));
      var txt = el('div', 'dm-row-text');
      lineEls(r).forEach(function (p) { txt.append(p); });
      row.append(txt);
      row.title = (r.meta.filter(function (kv) { return kv[0] === 'ID'; })[0] || [0, ''])[1];
      rows.append(row);
    });
    c.append(rows);
    return c;
  }

  DM.sections.forEach(function (sec) {
    var count = sec.groups.reduce(function (n, g) { return n + g.records.length; }, 0);
    var s = el('section', 'dm-sec'); s.id = sec.id;
    var head = el('button', 'dm-sec-head'); head.type = 'button'; head.setAttribute('aria-expanded', 'false');
    head.append(el('span', 'dm-caret', '▸'));
    head.append(el('span', 'dm-sec-title', sec.ko));
    if (sec.en && sec.en !== sec.ko) head.append(el('small', '', sec.en));
    head.append(el('span', 'dm-sec-count', count + '개'));
    s.append(head);
    var box = el('div', 'dm-sec-body'); box.hidden = true; s.append(box);
    var secObj = { el: s, box: box, head: head, groups: [], open: false, forced: false, count: count };

    sec.groups.forEach(function (g) {
      var ge = el('div', 'dm-group');
      if (g.en) { var h3 = el('h3', '', g.ko || g.en); if (g.ko && g.ko !== g.en) h3.append(el('small', '', g.en)); ge.append(h3); }
      var items = [];
      var add = function (node, recs) {
        ge.append(node);
        var e = { el: node, text: textOf(sec.ko, recs), n: recs.length };
        cards.push(e); items.push(e); total += recs.length;
      };
      var done = {};
      g.records.forEach(function (r) {
        if (r.base) {
          if (done[r.base]) return;
          var recs = g.records.filter(function (x) { return x.base === r.base; });
          done[r.base] = 1;
          add(effigyCard(r.base, recs), recs);
        } else add(plainCard(r), [r]);
      });
      box.append(ge); secObj.groups.push({ el: ge, items: items });
    });
    body.append(s); sections.push(secObj);

    var link = el('a', '', sec.ko); link.href = '#' + sec.id; link.append(el('small', '', String(count)));
    link.addEventListener('click', function (ev) {
      ev.preventDefault();
      if (!secObj.open) setOpen(secObj, true);
      s.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    nav.append(link);
    head.addEventListener('click', function () { setOpen(secObj, !isOpen(secObj)); });
  });
  function isOpen(s) { return s.forced || s.open; }
  function setOpen(s, v) {
    if (s.forced) return;
    s.open = v; render(s);
  }
  function render(s) {
    var o = isOpen(s);
    s.box.hidden = !o; s.head.setAttribute('aria-expanded', String(o));
    s.head.firstChild.textContent = o ? '▾' : '▸';
    s.el.classList.toggle('open', o);
  }
  function filter() {
    var words = q.value.toLowerCase().split(/\s+/).filter(Boolean), shown = 0;
    cards.forEach(function (c) { var ok = words.every(function (w) { return c.text.indexOf(w) >= 0; }); c.el.hidden = !ok; c.ok = ok; if (ok) shown += c.n; });
    var searching = words.length > 0;
    sections.forEach(function (s) {
      var any = false;
      s.groups.forEach(function (g) { var a = g.items.some(function (i) { return i.ok; }); g.el.hidden = !a; any = any || a; });
      s.el.hidden = !any;
      s.forced = searching && any;   // 검색 중에는 일치하는 섹션을 자동으로 펼침
      render(s);
    });
    status.textContent = searching ? shown + ' / ' + total + '개 일치' : total + '개 항목';
    empty.hidden = shown > 0;
  }
  q.addEventListener('input', filter);
  filter();
})();
