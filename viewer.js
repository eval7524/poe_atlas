const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const tip = document.getElementById('tip');
const header = document.querySelector('header');
const panel = document.getElementById('panel');
const MIN_ZOOM = 0.02, MAX_ZOOM = 1.5;
const MAX_PICK = 150; // the export still says 138; 150 is this season's limit
// 합산 효과 맨 위 "지도 보너스" 칸에 고정해서 보여줄 효과
const PINNED_STATS = [
  { re: /^(\d+(?:\.\d+)?)% increased Rarity of Items found in your Maps$/, label: '지도에서 발견하는 아이템 희귀도' },
  { re: /^(\d+(?:\.\d+)?)% increased Threads found in your Maps$/, label: '지도에서 발견하는 기억의 실낱' },
  { re: /^(\d+(?:\.\d+)?)% increased Maps found in your Maps$/, label: '플레이어의 지도에서 지도 발견' },
  { re: /^(\d+(?:\.\d+)?)% increased number of Magic Monsters in your Maps$/, label: '지도 내 마법 몬스터 수' },
  { re: /^(\d+(?:\.\d+)?)% increased number of Rare Monsters in your Maps$/, label: '지도 내 희귀 몬스터 수' },
  { re: /^(\d+(?:\.\d+)?)% increased Pack Size in your Maps$/, label: '지도 내 무리 규모' },
];
let TOP = 36;

const sheets = T.sheets.map(src => { const im = new Image(); im.onload = draw; im.src = src; return im; });
const byId = new Map(T.nodes.map(n => [n.id, n]));
const START = T.start[3];
const adj = new Map();
for (const [a, b] of T.edges) {
  if (!adj.has(a)) adj.set(a, []);
  if (!adj.has(b)) adj.set(b, []);
  adj.get(a).push(b);
  adj.get(b).push(a);
}

// ---- 짧은 공유 주소 (#b=...) ------------------------------------------------
// 선택한 노드는 항상 시작 노드에서 이어져 있으므로, 시작 노드에서 퍼져 나가며
// "이웃 노드를 골랐는가"를 한 비트씩만 기록한다. 노드 번호를 나열하는 것보다 훨씬 짧다.
// 앞 3글자는 노드/연결 데이터의 지문이며, 데이터가 바뀌면 옛 링크를 열지 않는다.
const NEIGHBORS = new Map();
for (const [id, list] of adj) NEIGHBORS.set(id, [...new Set(list)].sort((a, b) => a - b));
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const FINGERPRINT = (() => {
  let h = 0x811c9dc5;
  const mix = v => { h = Math.imul(h ^ v, 0x01000193) >>> 0; };
  for (const id of [...NEIGHBORS.keys()].sort((a, b) => a - b)) { mix(id); NEIGHBORS.get(id).forEach(mix); }
  for (const n of [...T.nodes].sort((a, b) => a.id - b.id)) { mix(n.id); mix(n.v ? n.v.length : 0); mix(n.k === 'mastery' ? 1 : 0); }
  return B64[(h >>> 12) & 63] + B64[(h >>> 6) & 63] + B64[h & 63];
})();

function bytesToB64(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
    const chars = Math.min(4, Math.ceil((bytes.length - i) * 8 / 6));
    for (let k = 0; k < chars; k++) out += B64[(n >> (18 - 6 * k)) & 63];
  }
  return out;
}
function b64ToBytes(str) {
  const bytes = [];
  let acc = 0, nbits = 0;
  for (const ch of str) {
    const v = B64.indexOf(ch);
    if (v < 0) return null;
    acc = (acc << 6) | v; nbits += 6;
    if (nbits >= 8) { nbits -= 8; bytes.push((acc >> nbits) & 255); acc &= (1 << nbits) - 1; }
  }
  return bytes;
}

function encodeBuild() {
  const bits = [], chosen = [];
  const seen = new Set([START]), queue = [START];
  for (let q = 0; q < queue.length; q++)
    for (const nb of NEIGHBORS.get(queue[q]) || []) {
      if (seen.has(nb)) continue;
      seen.add(nb);
      const on = picked.has(nb);
      bits.push(on ? 1 : 0);
      if (on) {
        queue.push(nb);
        if (byId.get(nb).v) chosen.push(choice.has(nb) ? choice.get(nb) + 1 : 0);
      }
    }
  for (const c of chosen) for (let k = 3; k >= 0; k--) bits.push((c >> k) & 1);
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let k = 0; k < 8; k++) b = (b << 1) | (bits[i + k] || 0);
    bytes.push(b);
  }
  while (bytes.length && bytes[bytes.length - 1] === 0) bytes.pop();
  return FINGERPRINT + bytesToB64(bytes);
}

// returns [[id, choiceIndex|undefined], ...] or null when the link doesn't fit this data
function decodeBuild(str) {
  if (str.slice(0, 3) !== FINGERPRINT) return null;
  const bytes = b64ToBytes(str.slice(3));
  if (!bytes) return null;
  let pos = 0;
  const bit = () => { const b = (pos >> 3) < bytes.length ? (bytes[pos >> 3] >> (7 - (pos & 7))) & 1 : 0; pos++; return b; };
  const seen = new Set([START]), queue = [START], out = [], withChoice = [];
  for (let q = 0; q < queue.length; q++)
    for (const nb of NEIGHBORS.get(queue[q]) || []) {
      if (seen.has(nb)) continue;
      seen.add(nb);
      if (!bit()) continue;
      const n = byId.get(nb);
      if (!n || n.k === 'mastery') return null;
      queue.push(nb);
      out.push([nb, undefined]);
      if (n.v) withChoice.push(out.length - 1);
    }
  for (const i of withChoice) {
    let c = 0;
    for (let k = 0; k < 4; k++) c = (c << 1) | bit();
    out[i][1] = c ? c - 1 : undefined;
  }
  return out;
}

for (const n of T.nodes)
  n.text = [n.n, tr(n.n), ...n.s, ...n.s.map(tr), ...n.r, ...n.r.map(tr), ...(n.v || []).flatMap(v => [v[0], tr(v[0])])].join(' ').replace(/\s+/g, ' ').toLowerCase();

let zoom = 0.1, camX = 0, camY = 0, dpr = 1;

// background on/off, remembered in this browser
let showBg = true;
try { showBg = localStorage.getItem('atlas-bg') !== 'off'; } catch (e) {}
const bgButton = document.getElementById('bg');
function setBg(on) {
  showBg = on;
  bgButton.classList.toggle('on', on);
  try { localStorage.setItem('atlas-bg', on ? 'on' : 'off'); } catch (e) {}
  draw();
}
bgButton.onclick = () => setBg(!showBg);
bgButton.classList.toggle('on', showBg);
if (!T.bg) bgButton.style.display = 'none';

function resize() {
  TOP = header.offsetHeight;
  canvas.style.top = panel.style.top = TOP + 'px';
  dpr = window.devicePixelRatio || 1;
  canvas.style.width = innerWidth + 'px';
  canvas.style.height = (innerHeight - TOP) + 'px';
  canvas.width = innerWidth * dpr;
  canvas.height = (innerHeight - TOP) * dpr;
  draw();
}

function panelW() {
  const w = panel.classList.contains('hidden') ? 0 : panel.offsetWidth;
  return w < innerWidth ? w : 0;
}

function lookAt(x, y) {
  camX = x + panelW() / 2 / zoom;
  camY = y;
  draw();
}

function fit() {
  const [x0, y0, x1, y1] = T.bounds;
  const w = innerWidth - panelW(), h = innerHeight - TOP;
  zoom = Math.min(w / (x1 - x0 + 800), h / (y1 - y0 + 1600));
  lookAt((x0 + x1) / 2, (y0 + y1) / 2);
}

function sprite(r, x, y, scale = 1) {
  if (!r) return;
  const im = sheets[r[0]];
  if (!im.complete || !im.naturalWidth) return;
  const w = r[5] * scale, h = r[6] * scale;
  ctx.drawImage(im, r[1], r[2], r[3], r[4], x - w / 2, y - h / 2, w, h);
}

let pending = false;
function draw() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(render);
}

function ring(n, color, width, gap) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width / zoom;
  ctx.beginPath();
  ctx.arc(n.x, n.y, Math.max(radius(n) + gap / zoom, 7 / zoom), 0, Math.PI * 2);
  ctx.stroke();
}

// 중앙(콘텐츠) 노드에 마우스를 올리면, 같은 주제의 노드를 함께 강조한다.
// 각 중앙 노드 주위에는 같은 그룹의 노드가 정해진 간격(궤도)으로 둘러싸고 있다.
// 그래서 "가장 가까운 중앙 노드와의 거리가 궤도 간격과 맞는 노드"를 그 주제의 노드로 본다.
// 어느 그룹에도 속하지 않은 노드(예: 일부 핵심 노드)만, 이름/효과 문구에 주제 단어가
// 들어 있을 때 보충으로 추가한다. 선택지 목록이나 주의 문구, 다른 그룹 노드의 언급은 무시한다.
const ORBITS = [82, 162, 335, 493, 662, 846];
const ORBIT_TOLERANCE = 2.5;
const THEME_MAX = 150;
// 중앙 노드 이름과 게임 내 표기가 다른 주제의 별칭 (콘텐츠 선택 노드의 선택지 매칭용)
const THEME_ALIASES = { 'Settlers of Kalguur': ['ore deposit'], 'Beyond': ['demonic evocator'], 'Essence': ['imprisoned monster'] }; // 문구 보충이 이보다 많이 걸리는 단어(예: Maps)는 보충하지 않는다
let homeHub = null;
function buildHomeHubs() {
  homeHub = new Map();
  const hubs = T.nodes.filter(n => n.k === 'mastery');
  for (const n of T.nodes) {
    if (n.k === 'mastery') continue;
    let best = null, bestD = Infinity;
    for (const h of hubs) {
      const d = Math.hypot(h.x - n.x, h.y - n.y);
      if (d < bestD) { bestD = d; best = h; }
    }
    if (best && ORBITS.some(r => Math.abs(bestD - r) < ORBIT_TOLERANCE)) homeHub.set(n, best);
  }
}
const themeCache = new Map();
function themeOf(n) {
  if (!n || n.k !== 'mastery') return null;
  if (themeCache.has(n.n)) return themeCache.get(n.n);
  if (!homeHub) buildHomeHubs();
  const hubs = T.nodes.filter(m => m.k === 'mastery' && m.n === n.n);
  const related = new Set();
  for (const [node, hub] of homeHub) if (hub.n === n.n) related.add(node);
  const word = n.n.toLowerCase().replace(/^the /, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('\\b' + word, 'i');
  const extra = T.nodes.filter(m => m.k !== 'mastery' && !homeHub.has(m) && re.test([m.n, ...m.s].join(' ')));
  if (extra.length <= THEME_MAX) extra.forEach(m => related.add(m));
  // "확률을 올릴 콘텐츠 종류 선택" 노드(융합된 세계 등)는 선택지가 곧 주제이므로,
  // 선택지 중 하나라도 이 주제를 가리키면 함께 강조한다. (Maps처럼 너무 흔한 주제는 제외)
  if (n.n !== 'Maps') {
    const stem = word.replace(/(ies|es|s)$/, '');
    const topicRe = new RegExp('\\b(?:' + [stem, ...(THEME_ALIASES[n.n] || [])].join('|') + ')', 'i');
    for (const m of T.nodes)
      if (m.v && !homeHub.has(m) && m.s.some(x => /Select a type of content/i.test(x)) &&
          topicRe.test(m.v.map(v => v[0] + ' ' + v[1].join(' ')).join(' ')))
        related.add(m);
  }
  const set = { hubs, related: [...related] };
  themeCache.set(n.n, set);
  return set;
}

// 노드가 속한 주제 이름.
const themeNames = [...new Set(T.nodes.filter(n => n.k === 'mastery').map(n => n.n))];
function themeNameOf(node) {
  if (!homeHub) buildHomeHubs();
  const hub = homeHub.get(node);
  if (hub) return hub.n;
  // "확률을 올릴 콘텐츠 종류 선택" 노드는 지금 고른 선택지가 가리키는 주제로 묶는다.
  // (선택지 전체가 아니라 고른 것만 봐야 용병을 골랐는데 다른 주제로 들어가지 않는다)
  if (node.v && node.s.some(x => /Select a type of content/i.test(x))) {
    const pick = node.v[choice.get(node.id)];
    if (!pick) return null;
    const text = pick[0] + ' ' + pick[1].join(' ');
    for (const name of themeNames) {
      if (name === 'Maps') continue;
      const stem = name.toLowerCase().replace(/^the /, '').replace(/(ies|es|s)$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp('\\b(?:' + [stem, ...(THEME_ALIASES[name] || [])].join('|') + ')', 'i').test(text)) return name;
    }
    return null;
  }
  for (const name of themeNames) {
    const t = themeOf(T.nodes.find(m => m.k === 'mastery' && m.n === name));
    if (t.related.includes(node)) return name;
  }
  return null;
}

// 노드 강조 표시. 크기는 노드 크기에 비례시키고, 화면에서 아주 작게 보이는 노드는
// 서로 겹치지 않도록 작은 점으로 그린다. (주제 강조와 검색 결과 강조가 함께 쓴다)
function markNode(n, color, rgb) {
  const r = radius(n), px = r * zoom;
  ctx.beginPath();
  if (px < 6) {
    ctx.fillStyle = `rgba(${rgb},.9)`;
    ctx.arc(n.x, n.y, Math.max(px * 1.1, 3) / zoom, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.fillStyle = `rgba(${rgb},.22)`;
  ctx.arc(n.x, n.y, r * 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, px * 0.08) / zoom;
  ctx.beginPath();
  ctx.arc(n.x, n.y, r * 1.2, 0, Math.PI * 2);
  ctx.stroke();
}

function render() {
  pending = false;
  const w = canvas.width / dpr, h = canvas.height / dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = T.bg && showBg ? '#0a0c14' : '#08090c'; // background image's edge color, so it blends in
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * (w / 2 - camX * zoom), dpr * (h / 2 - camY * zoom));
  ctx.imageSmoothingQuality = 'high';

  // round background, centered on the start node and framing the whole tree
  if (T.bg && showBg) {
    const [x0, y0, x1, y1] = T.bounds, [sx, sy] = T.start;
    const size = 2.3 * Math.max(sx - x0, x1 - sx, sy - y0, y1 - sy);
    const im = sheets[T.bg[0]];
    if (im.complete && im.naturalWidth)
      ctx.drawImage(im, T.bg[1], T.bg[2], T.bg[3], T.bg[4], sx - size / 2, sy - size / 2, size, size);
  }

  for (const [x, y, r] of T.groups) sprite(r, x, y);

  // links between the nodes
  ctx.strokeStyle = '#6b5a3c';
  ctx.lineWidth = Math.max(8, 1.5 / zoom);
  ctx.beginPath();
  for (const [ax, ay, bx, by] of T.lines) { ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
  for (const [cx, cy, r, a, d] of T.arcs) {
    ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    ctx.arc(cx, cy, r, a, a + d, d < 0);
  }
  ctx.stroke();

  const on = id => id === START || picked.has(id);
  const soon = id => on(id) || (preview && preview.add && preview.add.has(id));
  linkPass((a, b) => on(a) && on(b), '#e8c060');
  if (preview && preview.add) linkPass((a, b) => soon(a) && soon(b) && !(on(a) && on(b)), '#8fd080');

  sprite(T.start[2], T.start[0], T.start[1]);

  for (const n of T.nodes) {
    sprite(n.i, n.x, n.y);
    sprite(picked.has(n.id) && n.fa ? n.fa : n.fr, n.x, n.y);
  }

  // gold when allocated; orange for a multiple-choice node that still needs its choice
  for (const n of picked.values()) ring(n, n.v && !choice.has(n.id) ? '#e07a30' : '#e8c060', 2.5, 2);
  if (preview) for (const id of preview.add || preview.remove)
    ring(byId.get(id), preview.add ? '#8fd080' : '#e07050', 2.5, 2);
  for (const n of matches) n === matches[cursor] ? markNode(n, '#ffffff', '255,255,255') : markNode(n, '#4fc3ff', '79,195,255');
  const theme = themeOf(hover);
  if (theme) {
    theme.related.forEach(n => markNode(n, '#ff8ad8', '255,138,216'));
    theme.hubs.forEach(n => { if (n !== hover) markNode(n, '#ff8ad8', '255,138,216'); });
  }
  if (hover) ring(hover, '#e8d8a8', 2, 4);

  document.getElementById('pct').textContent = Math.round(zoom * 1000) / 10 + '%';
}

function linkPass(test, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(10, 2.5 / zoom);
  ctx.beginPath();
  for (const [ax, ay, bx, by, a, b] of T.lines)
    if (test(a, b)) { ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
  for (const [cx, cy, r, s, d, a, b] of T.arcs)
    if (test(a, b)) { ctx.moveTo(cx + r * Math.cos(s), cy + r * Math.sin(s)); ctx.arc(cx, cy, r, s, s + d, d < 0); }
  ctx.stroke();
}

function radius(n) { return (n.fr ? n.fr[5] : n.i ? n.i[5] : 60) * 0.45; }

function toWorld(sx, sy) {
  const w = canvas.width / dpr, h = canvas.height / dpr;
  return [(sx - w / 2) / zoom + camX, (sy - TOP - h / 2) / zoom + camY];
}

function zoomAt(factor, sx, sy) {
  const nz = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
  const [wx, wy] = toWorld(sx, sy);
  camX = wx - (wx - camX) * zoom / nz;
  camY = wy - (wy - camY) * zoom / nz;
  zoom = nz;
  draw();
}

function centerOn(n) {
  zoom = Math.max(zoom, 0.3);
  lookAt(n.x, n.y);
}

// node selection logic
const picked = new Map();
const choice = new Map(); // multiple-choice node id -> index into its n.v
const selectable = n => n.k !== 'mastery';
const effects = n => n.v ? (choice.has(n.id) ? n.v[choice.get(n.id)][1] : []) : n.s;

function pathTo(n) {
  const prev = new Map();
  const queue = [START, ...picked.keys()];
  for (const id of queue) prev.set(id, null);
  for (let i = 0; i < queue.length && !prev.has(n.id); i++)
    for (const next of adj.get(queue[i]) || [])
      if (!prev.has(next)) { prev.set(next, queue[i]); queue.push(next); }
  if (!prev.has(n.id)) return null;
  const path = [];
  for (let id = n.id; id !== START && !picked.has(id); id = prev.get(id)) path.push(id);
  return path.reverse();
}

function linked(without) {
  const reach = new Set([START]), stack = [START];
  while (stack.length)
    for (const next of adj.get(stack.pop()) || [])
      if (next !== without && picked.has(next) && !reach.has(next)) { reach.add(next); stack.push(next); }
  return reach;
}

function cut(n) {
  const reach = linked(n.id);
  return [...picked.keys()].filter(id => !reach.has(id));
}

let preview = null;
function makePreview(n) {
  if (!n || !selectable(n)) return null;
  if (picked.has(n.id)) return n.v ? null : { remove: new Set(cut(n)) }; // multiple-choice: the menu decides
  const path = pathTo(n);
  return path && { add: new Set(path) };
}

function unpick(n) {
  for (const id of cut(n)) { picked.delete(id); choice.delete(id); }
}

// Allocates the path to n; false if it doesn't fit in the points left.
function allocate(n) {
  const path = pathTo(n);
  if (!path) return false;
  if (picked.size + path.length > MAX_PICK) { flashFull(path.length); return false; }
  for (const id of path) picked.set(id, byId.get(id));
  return true;
}

function toggle(n) {
  if (!selectable(n)) return;
  if (picked.has(n.id)) unpick(n);
  else if (!allocate(n)) return;
  changed();
}

function choose(n, i) {
  if (!picked.has(n.id) && !allocate(n)) return;
  choice.set(n.id, i);
  changed();
}

function changed() {
  preview = makePreview(hover);
  selectionChanged();
}

// Menu for multiple-choice nodes: pick (or change) the choice, or remove the node.
const menu = document.getElementById('menu');
function openMenu(n, sx, sy) {
  if (!selectable(n) || (!picked.has(n.id) && !pathTo(n))) return;
  tip.style.display = 'none';
  menu.innerHTML = '';
  const title = document.createElement('b');
  title.textContent = tr(n.n);
  menu.append(title);
  for (const s of n.s) {
    const d = document.createElement('div');
    d.className = 'stat';
    d.textContent = tr(s);
    menu.append(d);
  }
  const cur = choice.get(n.id);
  n.v.forEach(([label], i) => {
    const b = document.createElement('button');
    b.textContent = tr(label);
    if (i === cur) b.className = 'on';
    b.onclick = () => { closeMenu(); choose(n, i); };
    menu.append(b);
  });
  if (picked.has(n.id)) {
    const k = cut(n).length;
    const b = document.createElement('button');
    b.className = 'rm';
    b.textContent = k === 1 ? '제거' : `노드 ${k}개 제거 (이 노드와 연결된 노드 포함)`;
    b.onclick = () => { closeMenu(); toggle(n); };
    menu.append(b);
  } else {
    const k = pathTo(n).length;
    const d = document.createElement('div');
    d.className = 'hint';
    d.textContent = `할당할 항목을 선택하세요 (${k}포인트)`;
    menu.append(d);
  }
  menu.style.display = 'block';
  const r = menu.getBoundingClientRect();
  menu.style.left = Math.max(8, Math.min(sx + 12, innerWidth - r.width - 8)) + 'px';
  menu.style.top = Math.max(TOP + 4, Math.min(sy + 12, innerHeight - r.height - 8)) + 'px';
}
const menuOpen = () => menu.style.display === 'block';
function closeMenu() { menu.style.display = 'none'; }
addEventListener('pointerdown', e => { if (menuOpen() && !menu.contains(e.target) && e.target !== canvas) closeMenu(); });

let fullTimer = 0;
function flashFull(need) {
  const c = document.getElementById('count');
  c.textContent = `경로에 ${need}포인트가 필요합니다. 남은 포인트: ${MAX_PICK - picked.size}`;
  c.classList.add('full');
  clearTimeout(fullTimer);
  fullTimer = setTimeout(updatePanel, 1500);
}

function selectionChanged() {
  history.replaceState(null, '', picked.size ? '#b=' + encodeBuild() : location.pathname + location.search);
  updatePanel();
  draw();
}

// logic for stacking node effects that can be stacked
// e.g. nodes 43934 (Betrayal Chance) and 34644 (Obsessed with Vengeance)
// both have "your maps have % chance to contain jun", or the percentage for betrayal scarab drop
// numerical values for both affixes add up, so 10+20 = 30% to contain jun, and same for scarabs (10+20)
const NUM = /\d+(?:\.\d+)?/g;
function summableIndexes(s) {
  const pct = [];
  let count = 0;
  s.replace(NUM, (m, off) => { if (s[off + m.length] === '%') pct.push(count); count++; return m; });
  return pct.length ? pct : count === 1 ? [0] : [];
}
function summarize(nodes) {
  const groups = new Map();
  for (const n of nodes) for (const s of effects(n)) {
    const key = s.replace(NUM, '#');
    const nums = (s.match(NUM) || []).map(Number);
    const g = groups.get(key);
    if (!g) groups.set(key, { text: s, nums, count: 1, sum: summableIndexes(s) });
    else { g.count++; for (const i of g.sum) g.nums[i] += nums[i]; }
  }
  return [...groups.values()].map(g => {
    let i = 0;
    const text = g.count > 1 && g.sum.length
      ? g.text.replace(NUM, m => g.sum.includes(i) ? String(Math.round(g.nums[i++] * 100) / 100) : (i++, m))
      : g.text;
    return { text, count: g.count };
  }).sort((a, b) => a.text.localeCompare(b.text));
}

function updatePanel() {
  const n = picked.size;
  const c = document.getElementById('count');
  c.textContent = `${n} / ${MAX_PICK}개 선택됨`;
  c.classList.toggle('full', n >= MAX_PICK);
  document.getElementById('badge').textContent = n;
  document.getElementById('empty').style.display = n ? 'none' : '';

  const eff = document.getElementById('effects');
  eff.innerHTML = '';
  const byTheme = new Map([['Maps', []]]);
  for (const node of picked.values()) {
    const key = themeNameOf(node) || 'Maps';
    (byTheme.get(key) || byTheme.set(key, []).get(key)).push(node);
  }
  const keys = [...byTheme.keys()].sort((x, y) => {
    const rank = k => k === 'Maps' ? 0 : 1;
    return rank(x) - rank(y) || byTheme.get(y).length - byTheme.get(x).length;
  });
  const TAIL = /^(.*?)\s*([+\-−]?\d+(?:\.\d+)?%)(?:\s*(증가|감소))?$/;
  const mkValue = (num, unit) => {
    const v = document.createElement('span');
    v.className = 'pinned-value';
    const b = document.createElement('b');
    b.textContent = num;
    v.append(b);
    if (unit) { const sm = document.createElement('small'); sm.textContent = unit; v.append(sm); }
    return v;
  };
  for (const key of keys) {
    const rows = summarize(byTheme.get(key)).filter(e => !PINNED_STATS.some(p => p.re.test(e.text)));
    const items = [];
    if (key === 'Maps') {
      for (const { re, label } of PINNED_STATS.slice(3)) {
        let total = 0;
        for (const node of picked.values()) for (const e of effects(node)) { const m = re.exec(e); if (m) total += +m[1]; }
        if (total) items.push({ label, value: mkValue((Math.round(total * 100) / 100) + '%', '증가') });
      }
    }
    for (const e of rows) {
      const t = tr(e.text);
      const m = t.match(TAIL);
      const item = { count: e.count };
      if (m && m[1]) { item.label = m[1]; item.value = mkValue(m[2], m[3]); }
      else item.text = t;
      items.push(item);
    }
    if (!items.length) continue;
    const box = document.createElement('li');
    box.className = 'group-box';
    const title = document.createElement('div');
    title.className = 'box-title';
    title.textContent = key === 'Maps' ? '지도' : tr(key);
    box.append(title);
    for (const it of items) {
      const row = document.createElement('div');
      row.className = 'box-row';
      const text = document.createElement('span');
      text.className = 'box-text';
      if (it.label) text.textContent = it.label;
      else {
        it.text.split(/(\d+(?:\.\d+)?%?)/).forEach((part, i) => {
          if (i % 2) { const b = document.createElement('b'); b.className = 'num'; b.textContent = part; text.append(b); }
          else text.append(part);
        });
      }
      if (it.count > 1) {
        const k = document.createElement('small');
        k.className = 'cnt';
        k.textContent = ' ×' + it.count;
        text.append(k);
      }
      row.append(text);
      if (it.value) row.append(it.value);
      box.append(row);
    }
    eff.append(box);
  }

  // 지도 보너스 칸: 자주 보는 합산값을 맨 위에 고정해서 보여준다.
  const pinnedBox = document.getElementById('pinned');
  pinnedBox.innerHTML = '<div class="pinned-title">지도 보너스</div>';
  for (const { re, label } of PINNED_STATS.slice(0, 3)) {
    let total = 0;
    for (const node of picked.values()) for (const e of effects(node)) { const m = re.exec(e); if (m) total += +m[1]; }
    const row = document.createElement('div');
    row.className = 'pinned-row' + (total ? '' : ' zero');
    const l = document.createElement('span');
    l.textContent = label;
    const v = document.createElement('span');
    v.className = 'pinned-value';
    const num = document.createElement('b');
    num.textContent = (Math.round(total * 100) / 100) + '%';
    const unit = document.createElement('small');
    unit.textContent = '증가';
    v.append(num, unit);
    row.append(l, v);
    pinnedBox.append(row);
  }

  const list = document.getElementById('picked');
  list.innerHTML = '';
  for (const node of picked.values()) {
    const li = document.createElement('li');
    li.className = node.k;
    const name = document.createElement('span');
    name.textContent = tr(node.n);
    name.title = '트리에서 보기';
    name.onclick = () => centerOn(node);
    const x = document.createElement('button');
    x.textContent = '×';
    x.title = '제거';
    x.onclick = () => toggle(node);
    li.append(name, x);
    if (node.v) {
      const sel = document.createElement('select');
      sel.title = '이 노드의 선택 항목';
      if (!choice.has(node.id)) sel.append(new Option('하나 선택…', '', true, true));
      node.v.forEach(([label], i) => sel.append(new Option(tr(label), i, false, choice.get(node.id) === i)));
      sel.onchange = () => choose(node, +sel.value);
      li.append(sel);
    }
    list.append(li);
  }
}

document.getElementById('clear').onclick = () => { picked.clear(); choice.clear(); selectionChanged(); };
document.getElementById('toggle').onclick = () => {
  panel.classList.toggle('hidden');
  document.getElementById('toggle').classList.toggle('on', !panel.classList.contains('hidden'));
};

// saving the taken path in the url, node IDs separated by commas,
// "id:choice" for multiple-choice nodes
let initial = [], badLink = false;
{
  const short = /#b=([A-Za-z0-9_-]+)/.exec(location.hash);
  const legacy = /#s=([\d,:]+)/.exec(location.hash);
  if (short) {
    const decoded = decodeBuild(short[1]);
    if (decoded) initial = decoded; else badLink = true;
  } else if (legacy) {
    initial = legacy[1].split(',').map(item => item.split(':').map(Number)); // 예전 긴 주소도 계속 열림
  }
}
for (const [id, c] of initial) {
  const n = byId.get(id);
  if (!n || !selectable(n) || picked.size >= MAX_PICK) continue;
  picked.set(n.id, n);
  if (n.v && n.v[c]) choice.set(n.id, c);
}
{
  const reach = linked(null);
  for (const id of [...picked.keys()]) if (!reach.has(id)) { picked.delete(id); choice.delete(id); }
}
if (innerWidth < 900 && !picked.size) panel.classList.add('hidden');
document.getElementById('toggle').classList.toggle('on', !panel.classList.contains('hidden'));
updatePanel();
if (badLink) {
  const c = document.getElementById('count');
  c.textContent = '이 링크는 현재 데이터와 맞지 않아 열 수 없습니다';
  c.classList.add('full');
  clearTimeout(fullTimer);
  fullTimer = setTimeout(updatePanel, 4000);
}

// 링크 복사
const shareButton = document.getElementById('share');
const shareLabel = document.getElementById('share-label');
let shareTimer = 0;
shareButton.onclick = async () => {
  const url = location.href;
  let ok = false;
  try { await navigator.clipboard.writeText(url); ok = true; } catch (e) {
    const t = document.createElement('textarea');
    t.value = url; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.append(t); t.select();
    try { ok = document.execCommand('copy'); } catch (e2) {}
    t.remove();
  }
  shareLabel.textContent = ok ? '복사됨 ✓' : '복사 실패';
  clearTimeout(shareTimer);
  shareTimer = setTimeout(() => { shareLabel.textContent = '링크 복사'; }, 1500);
};

const q = document.getElementById('q');
const hits = document.getElementById('hits');
let matches = [], cursor = -1;

// search text for nodes (name, description)
function search() {
  const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
  matches = words.length ? T.nodes.filter(n => words.every(w => n.text.includes(w))) : [];
  cursor = -1;
  hits.textContent = words.length ? (matches.length ? matches.length + '개 검색됨' : '검색 결과 없음') : '';
  draw();
}
q.addEventListener('input', search);
q.addEventListener('keydown', e => {
  if (e.key === 'Enter' && matches.length) {
    cursor = (cursor + (e.shiftKey ? matches.length - 1 : 1)) % matches.length;
    hits.textContent = `${cursor + 1} / ${matches.length}`;
    centerOn(matches[cursor]);
  } else if (e.key === 'Escape') {
    q.value = '';
    search();
    q.blur();
  }
});

// hover logic
let hover = null;
function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
function showTip(n, sx, sy) {
  let html = '<b>' + esc(tr(n.n)) + '</b>';
  for (const s of n.s) html += '<div class="stat">' + esc(tr(s)) + '</div>';
  if (n.v) {
    const cur = choice.get(n.id);
    html += '<div class="choices">' + n.v.map(([label], i) =>
      '<div' + (i === cur ? ' class="on"' : '') + '>' + esc(tr(label)) + '</div>').join('') + '</div>';
  }
  for (const s of n.r) html += '<div class="rem">' + esc(tr(s)) + '</div>';
  if (n.f.length) html += '<div class="fl">' + n.f.map(x => esc(tr(x))).join('<br>') + '</div>';
  if (n.k === 'mastery') {
    const th = themeOf(n);
    html += '<div class="hint">' + `관련 노드 ${th.related.length}개 + 중앙 노드 ${th.hubs.length}개 강조` + '</div>';
  }
  if (n.v && picked.has(n.id)) {
    html += '<div class="hint">' + (choice.has(n.id) ? '클릭하여 선택 변경 또는 제거' : '클릭하여 항목 선택') + '</div>';
  } else if (preview) {
    const k = (preview.add || preview.remove).size, left = MAX_PICK - picked.size;
    const pts = k;
    html += '<div class="hint">' + (preview.remove
      ? (k === 1 ? '클릭하여 제거' : `클릭하여 노드 ${k}개 제거 (연결된 노드 포함)`)
      : k > left ? `경로에 ${pts}포인트가 필요하지만 ${left}포인트만 남았습니다`
      : n.v ? `클릭하여 항목 선택 및 ${pts}포인트 할당`
      : `클릭하여 ${pts}포인트 할당`) + '</div>';
  }
  tip.innerHTML = html;
  tip.style.display = 'block';
  const r = tip.getBoundingClientRect();
  tip.style.left = Math.min(sx + 16, innerWidth - r.width - 8) + 'px';
  tip.style.top = Math.min(sy + 16, innerHeight - r.height - 8) + 'px';
}
function pick(sx, sy) {
  const [wx, wy] = toWorld(sx, sy);
  let best = null, bestD = Infinity;
  for (const n of T.nodes) {
    const d = Math.hypot(n.x - wx, n.y - wy);
    if (d < radius(n) && d < bestD) { best = n; bestD = d; }
  }
  return best;
}

// moving around the tree
let drag = null;
canvas.addEventListener('pointerdown', e => {
  // a click on the tree while the choice menu is open only closes the menu
  const swallow = menuOpen();
  closeMenu();
  drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: false, swallow };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (drag) {
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return;
    drag.moved = true;
    canvas.classList.add('drag');
    camX -= (e.clientX - drag.x) / zoom;
    camY -= (e.clientY - drag.y) / zoom;
    drag.x = e.clientX;
    drag.y = e.clientY;
    tip.style.display = 'none';
    draw();
    return;
  }
  const n = pick(e.clientX, e.clientY);
  if (n !== hover) { hover = n; preview = makePreview(n); draw(); }
  if (n && !menuOpen()) showTip(n, e.clientX, e.clientY); else tip.style.display = 'none';
});
canvas.addEventListener('pointerup', e => {
  const click = drag && !drag.moved && !drag.swallow;
  drag = null;
  canvas.classList.remove('drag');
  if (!click) return;
  const n = pick(e.clientX, e.clientY);
  if (n && n.v) openMenu(n, e.clientX, e.clientY);
  else if (n) {
    toggle(n);
    if (e.pointerType === 'mouse') showTip(n, e.clientX, e.clientY);
  }
});
canvas.addEventListener('pointercancel', () => { drag = null; canvas.classList.remove('drag'); });
canvas.addEventListener('pointerleave', () => { tip.style.display = 'none'; if (hover) { hover = preview = null; draw(); } });
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  closeMenu();
  zoomAt(Math.pow(1.0015, -e.deltaY), e.clientX, e.clientY);
}, { passive: false });

const center = () => [(innerWidth - panelW()) / 2, TOP + (innerHeight - TOP) / 2];
document.getElementById('in').onclick = () => zoomAt(1.25, ...center());
document.getElementById('out').onclick = () => zoomAt(0.8, ...center());
document.getElementById('fit').onclick = fit;
addEventListener('keydown', e => {
  if (e.key === 'Escape') closeMenu();
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key === '+' || e.key === '=') zoomAt(1.25, ...center());
  if (e.key === '-') zoomAt(0.8, ...center());
  if (e.key === '0') fit();
  if (e.key === 'b') setBg(!showBg);
  if (e.key === '/' || (e.key === 'f' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); q.focus(); q.select(); }
});
addEventListener('resize', resize);

resize();
fit();
