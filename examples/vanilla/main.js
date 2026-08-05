import { createGuides, createRuler } from '@devslab/editor-ruler';

const page = document.getElementById('page');
const mount = document.getElementById('ruler-mount');

page.innerHTML =
  '<h3>editor-ruler — 코어만으로</h3>' +
  '<p style="margin-left: 60px;">왼쪽 여백 60px 문단 — 핸들을 끌어 보세요.</p>' +
  '<p style="text-indent: 40px;">첫 줄 40px 들여쓰기 문단.</p>' +
  '<p>기본 문단. 줄자 빈 곳에서 아래로 끌면 가로 가이드가 생깁니다.</p>' +
  '<table><tbody><tr><th>제품</th><th>가격</th></tr><tr><td>editor-ruler</td><td>무료</td></tr></tbody></table>';

function currentBlocks() {
  const sel = document.getSelection();
  const blocks = [];
  if (sel && sel.rangeCount > 0) {
    let node = sel.getRangeAt(0).startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    while (node && node !== page && node.parentElement !== page) node = node.parentElement;
    if (node && node !== page) blocks.push(node);
  }
  if (blocks.length === 0 && page.firstElementChild) blocks.push(page.firstElementChild);
  return blocks;
}

function getMetrics() {
  const s = getComputedStyle(page);
  const contentWidth = page.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
  const block = currentBlocks()[0];
  const style = block ? getComputedStyle(block) : null;
  return {
    contentWidth,
    leftMargin: style ? parseFloat(style.marginLeft) || 0 : 0,
    rightMargin: style ? parseFloat(style.marginRight) || 0 : 0,
    firstLineIndent: style ? parseFloat(style.textIndent) || 0 : 0,
  };
}

const guides = createGuides(page, {
  getOffsetLeft: () => parseFloat(getComputedStyle(page).paddingLeft) || 0,
});

const ruler = createRuler(mount, {
  unit: 'cm',
  getMetrics,
  guides,
  onChange(change) {
    for (const block of currentBlocks()) {
      if (change.leftMargin !== undefined) block.style.marginLeft = `${change.leftMargin}px`;
      if (change.rightMargin !== undefined) block.style.marginRight = `${change.rightMargin}px`;
      if (change.firstLineIndent !== undefined) block.style.textIndent = `${change.firstLineIndent}px`;
    }
  },
});

document.addEventListener('selectionchange', () => {
  if (page.contains(document.getSelection()?.anchorNode ?? null)) ruler.refresh();
});
window.addEventListener('resize', () => ruler.refresh());
