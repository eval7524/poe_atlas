// 언어 전환 (한국어 / English). 선택은 이 브라우저에 저장되고, 바꾸면 페이지를 다시 불러온다.
// 한국어 문구를 키로 쓰고, 영어 모드에서만 아래 사전으로 바꿔 보여준다. 노드/효과 문구는
// 원래 영어이므로 영어 모드에서는 번역(tr)을 거치지 않는다.
const LANG = (() => { try { return localStorage.getItem('atlas-lang') === 'en' ? 'en' : 'ko'; } catch (e) { return 'ko'; } })();
const EN = {
  // 정적 화면
  '패스 오브 엑자일 아틀라스 패시브 트리 한국어 도구': 'Path of Exile Atlas passive tree planner',
  'POE Atlas · 아틀라스 패시브 트리': 'POE Atlas · Atlas Passive Tree',
  '아틀라스 트리 홈': 'Atlas tree home',
  '패시브 트리 플래너': 'Passive Tree Planner',
  '노드 이름 또는 효과 검색': 'Search node name or effect',
  '노드 이름 또는 설명 검색. Enter: 다음 결과, Esc: 검색어 지우기': 'Search node names or descriptions. Enter: next result, Esc: clear',
  '트리 화면 도구': 'Tree view tools',
  '축소': 'Zoom out', '확대': 'Zoom in',
  '트리를 화면에 맞춤': 'Fit the tree to the screen', '화면 맞춤': 'Fit',
  '배경 표시/숨기기 (B)': 'Show/hide background (B)', '배경': 'Background',
  '저장한 빌드 목록': 'Saved builds', '저장 목록': 'Saved builds',
  '선택 패널 표시/숨기기': 'Show/hide selection panel', '선택됨': 'Selected',
  '아틀라스 패시브 트리. 드래그하여 이동하고 노드를 클릭해 선택할 수 있습니다.': 'Atlas passive tree. Drag to pan and click nodes to select them.',
  '선택한 패시브 정보': 'Selected passive info',
  '선택한 패시브': 'Selected Passives',
  '선택 모두 지우기': 'Clear all selections',
  '초기화': 'Reset',
  '할당 포인트': 'Allocated Points',
  '최대 150': 'Max 150',
  '현재 선택을 짧은 링크로 복사': 'Copy the current selection as a short link',
  '링크 복사': 'Copy link',
  '현재 선택을 저장 목록에 저장': 'Save the current selection to your saved builds',
  '저장': 'Save',
  '트리에서 노드를 선택하면 할당 경로와 효과가 여기에 표시됩니다. 여러 선택지가 있는 노드는 원하는 항목을 선택하세요.': 'Select nodes on the tree and the allocation path and effects will appear here. For nodes with several options, pick the one you want.',
  '노드를 클릭해 시작하세요.': 'Click a node to start.',
  '합산 효과': 'Summed Effects',
  '선택한 노드': 'Selected Nodes',
  '노드를 선택하면 효과가 자동으로 합산됩니다.': 'Effects are summed automatically as you select nodes.',
  '이 사이트는 방문 통계 분석을 위해 Google Analytics를 사용하며, 이 과정에서 쿠키와 접속 정보가 수집될 수 있습니다. 개인을 직접 식별하는 정보는 수집하지 않습니다. 수집을 원하지 않으면': 'This site uses Google Analytics for visit statistics, which may collect cookies and connection information. No personally identifying information is collected. If you do not want this, use the',
  '차단 도구': 'opt-out tool',
  '를 사용하거나 브라우저에서 쿠키를 차단하세요.': ' or block cookies in your browser.',
  '이 브라우저에만 저장됩니다. 다른 기기에서 확인할 수 없습니다.': 'Saved in this browser only. Not available on other devices.',
  '빌드 이름 (비워두면 자동)': 'Build name (auto if empty)',
  '현재 선택 저장': 'Save current selection',
  '아직 저장한 빌드가 없습니다.': 'No saved builds yet.',
  '초기화할까요?': 'Reset everything?',
  '취소': 'Cancel',
  // 동적 문구
  '지도에서 발견하는 아이템 희귀도': 'Rarity of Items found in your Maps',
  '지도에서 발견하는 기억의 실낱': 'Threads found in your Maps',
  '플레이어의 지도에서 지도 발견': 'Maps found in your Maps',
  '지도 내 마법 몬스터 수': 'Number of Magic Monsters in your Maps',
  '지도 내 희귀 몬스터 수': 'Number of Rare Monsters in your Maps',
  '지도 내 무리 규모': 'Pack Size in your Maps',
  '지도 보너스': 'Map Bonuses',
  '지도': 'Maps',
  '증가': 'increased',
  '제거': 'Remove',
  '노드 {k}개 제거 (이 노드와 연결된 노드 포함)': 'Remove {k} nodes (including nodes connected to this one)',
  '할당할 항목을 선택하세요 ({k}포인트)': 'Choose an option to allocate ({k} points)',
  '경로에 {need}포인트가 필요합니다. 남은 포인트: {left}': 'The path needs {need} points. Points left: {left}',
  '{n} / {max}개 선택됨': '{n} / {max} selected',
  '트리에서 보기': 'Show on tree',
  '이 노드의 선택 항목': 'Option for this node',
  '하나 선택…': 'Choose one…',
  '선택한 패시브 {n}개가 모두 지워집니다. 이 작업은 되돌릴 수 없습니다.': 'All {n} selected passives will be cleared. This cannot be undone.',
  '이 링크는 현재 데이터와 맞지 않아 열 수 없습니다': 'This link does not match the current data and cannot be opened',
  '복사됨 ✓': 'Copied ✓', '복사 실패': 'Copy failed',
  '이름 수정': 'Rename',
  '불러오기': 'Load', '삭제': 'Delete',
  '{n} / {max}개 · {date}': '{n} / {max} · {date}',
  '현재 선택이 바뀝니다. 한 번 더': 'This replaces your selection. Click again',
  '정말 삭제?': 'Really delete?',
  '"{name}"을(를) 불러왔습니다.': 'Loaded "{name}".',
  '트리가 업데이트되어 이 빌드는 불러올 수 없습니다.': 'The tree has been updated, so this build can no longer be loaded.',
  '선택한 노드가 없어 저장할 수 없습니다.': 'Nothing is selected, so there is nothing to save.',
  '저장은 최대 {max}개까지 가능합니다. 하나를 삭제해 주세요.': 'You can save up to {max} builds. Please delete one.',
  '빌드 {n}': 'Build {n}',
  '이 브라우저에서는 저장할 수 없습니다. (저장 공간 차단 또는 시크릿 모드)': 'Saving is not possible in this browser (storage blocked or private mode).',
  '저장했습니다.': 'Saved.',
  '{n}개 검색됨': '{n} found', '검색 결과 없음': 'No results',
  '관련 노드 {a}개 + 중앙 노드 {b}개 강조': '{a} related nodes + {b} central nodes highlighted',
  '클릭하여 선택 변경 또는 제거': 'Click to change the option or remove',
  '클릭하여 항목 선택': 'Click to choose an option',
  '클릭하여 제거': 'Click to remove',
  '클릭하여 노드 {k}개 제거 (연결된 노드 포함)': 'Click to remove {k} nodes (including connected nodes)',
  '경로에 {pts}포인트가 필요하지만 {left}포인트만 남았습니다': 'The path needs {pts} points but only {left} are left',
  '클릭하여 항목 선택 및 {pts}포인트 할당': 'Click to choose an option and allocate {pts} points',
  '클릭하여 {pts}포인트 할당': 'Click to allocate {pts} points',
  '확정 {n}회': 'Guaranteed ×{n}',
  '새 빌드로 저장': 'Save as new build',
  '불러온 빌드: {name}': 'Loaded build: {name}',
  '덮어쓰기': 'Overwrite',
  '기존 내용이 사라집니다. 한 번 더': 'This replaces the old version. Click again',
  '"{name}"에 덮어썼습니다.': 'Overwrote "{name}".',
  '확정 {n}회 + {r}% 확률로 1회 더': 'Guaranteed ×{n} + {r}% chance for 1 more',
};
function t(ko, vars) {
  let s = LANG === 'en' ? (EN[ko] !== undefined ? EN[ko] : ko) : ko;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return s;
}
if (LANG === 'en') {
  tr = v => v; // 영어 모드에서는 번역하지 않고 원문을 그대로 쓴다
  document.documentElement.lang = 'en';
  document.title = t(document.title);
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = t(meta.content);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (node.parentNode.closest('script,style')) continue;
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(node.nodeValue);
    if (m[2] && EN[m[2]] !== undefined) node.nodeValue = m[1] + EN[m[2]] + m[3];
  }
  for (const el of document.querySelectorAll('[title],[placeholder],[aria-label]'))
    for (const a of ['title', 'placeholder', 'aria-label']) {
      const v = el.getAttribute(a);
      if (v && EN[v] !== undefined) el.setAttribute(a, EN[v]);
    }
}
const langButton = document.getElementById('lang');
if (langButton) {
  langButton.querySelectorAll('.lang-opt').forEach(o => o.classList.toggle('on', o.dataset.lang === LANG));
  langButton.onclick = () => {
    try { localStorage.setItem('atlas-lang', LANG === 'en' ? 'ko' : 'en'); } catch (e) {}
    location.reload(); // 선택한 노드는 주소(#b=...)에 들어 있어 그대로 유지된다
  };
}
