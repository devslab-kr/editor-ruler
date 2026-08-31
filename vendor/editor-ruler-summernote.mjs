// src/index.ts
import {
  createGuides,
  createRuler,
  createVRuler,
  detectLanguage,
  resolveRulerLabels
} from "@devslab/editor-ruler";
var STRINGS = {
  en: {
    ruler: "Ruler",
    showHide: "Show / Hide",
    verticalRuler: "Vertical Ruler",
    lockGuides: "Lock Guides",
    clearGuides: "Clear Guides",
    cm: "cm",
    in: "inch",
    px: "px"
  },
  ko: {
    ruler: "\uC904\uC790",
    showHide: "\uBCF4\uC774\uAE30 / \uC228\uAE30\uAE30",
    verticalRuler: "\uC138\uB85C \uC904\uC790",
    lockGuides: "\uAC00\uC774\uB4DC \uC7A0\uAE08",
    clearGuides: "\uAC00\uC774\uB4DC \uC9C0\uC6B0\uAE30",
    cm: "cm",
    in: "\uC778\uCE58",
    px: "px"
  }
};
var BLOCK_FALLBACK_SELECTOR = "p, div, h1, h2, h3, h4, h5, h6, li, blockquote, pre";
var TABLE_TAGS = /* @__PURE__ */ new Set(["TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TD", "TH"]);
var RULER_ICON_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M3 8a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H3zm1 2h1.5v3H4v-3zm3.5 0H9v2H7.5v-2zm3.5 0h1.5v3H11v-3zm3.5 0H16v2h-1.5v-2zm3.5 0h1.5v3H18v-3z"/></svg>';
function defineRulerPlugin(jQuery, defineOptions = {}) {
  const $ = jQuery;
  const summernote = $?.summernote;
  if (!summernote || summernote.plugins?.ruler) return;
  const doc = typeof document !== "undefined" ? document : void 0;
  const language = detectLanguage(defineOptions.language, doc);
  const t = { ...STRINGS[language] ?? STRINGS.en, ...defineOptions.strings };
  summernote.options = $.extend(true, {}, summernote.options, {
    ruler: {
      enabled: true,
      visible: true,
      unit: "cm",
      vertical: false,
      verticalGutter: false,
      guides: true,
      guideSnap: 5,
      language: null
    }
  });
  summernote.plugins.ruler = function rulerPlugin(context) {
    const self = this;
    const opts = () => context.options?.ruler ?? {};
    let mount = null;
    let vwrap = null;
    let vmount = null;
    let ruler = null;
    let vruler = null;
    let guides = null;
    let visible = false;
    let vVisible = false;
    function editableEl() {
      const el = context.layoutInfo?.editable;
      return el?.[0] ?? el;
    }
    function contentPadding(side) {
      const el = editableEl();
      const win = el.ownerDocument.defaultView;
      return parseFloat(win.getComputedStyle(el)[side]) || 0;
    }
    function vRulerOffset() {
      return vVisible || opts().verticalGutter === true && vwrap ? 23 : 0;
    }
    function alignMount() {
      if (mount) mount.style.paddingLeft = `${contentPadding("paddingLeft") + vRulerOffset()}px`;
    }
    function normalizeBlock(b, el) {
      if (!b || b === el || !el.contains(b)) return null;
      if (b.tagName === "IMG") {
        const host = b.closest(BLOCK_FALLBACK_SELECTOR);
        return host && host !== el && el.contains(host) ? host : null;
      }
      if (TABLE_TAGS.has(b.tagName)) {
        const table = b.tagName === "TABLE" ? b : b.closest("table");
        return table && el.contains(table) ? table : null;
      }
      return b;
    }
    function rawBlocks() {
      const el = editableEl();
      const dom = summernote.dom;
      const rng = context.invoke("editor.getLastRange");
      if (rng && typeof rng.nodes === "function" && dom?.isPara) {
        const nodes = rng.nodes(dom.isPara, { includeAncestor: true });
        if (nodes?.length) return nodes;
      }
      const win = el.ownerDocument.defaultView;
      const sel = win.getSelection?.();
      const node = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).startContainer : null;
      const start = node && (node.nodeType === 1 ? node : node.parentElement);
      const block = start?.closest(BLOCK_FALLBACK_SELECTOR);
      return block ? [block] : [];
    }
    function selectedBlocks() {
      const el = editableEl();
      const targets = [];
      for (const raw of rawBlocks()) {
        const target = normalizeBlock(raw, el);
        if (target && !targets.includes(target)) targets.push(target);
      }
      if (targets.length > 0) return targets;
      const fallback = el.querySelector(BLOCK_FALLBACK_SELECTOR);
      return fallback ? [fallback] : [];
    }
    function getMetrics() {
      const el = editableEl();
      const win = el.ownerDocument.defaultView;
      const contentWidth = Math.max(
        0,
        el.clientWidth - contentPadding("paddingLeft") - contentPadding("paddingRight")
      );
      const block = selectedBlocks()[0];
      if (!block) return { contentWidth, leftMargin: 0, rightMargin: 0, firstLineIndent: 0 };
      const style = win.getComputedStyle(block);
      return {
        contentWidth,
        leftMargin: parseFloat(style.marginLeft) || 0,
        rightMargin: parseFloat(style.marginRight) || 0,
        firstLineIndent: parseFloat(style.textIndent) || 0
      };
    }
    function currentTable() {
      const el = editableEl();
      for (const b of rawBlocks()) {
        const table = b.tagName === "TABLE" ? b : b.closest?.("table");
        if (table && el.contains(table)) return table;
      }
      return null;
    }
    function contentLeft() {
      const el = editableEl();
      return el.getBoundingClientRect().left + contentPadding("paddingLeft");
    }
    function columnEdges() {
      const table = currentTable();
      if (!table) return null;
      if (table.querySelector("td[colspan], th[colspan], td[rowspan], th[rowspan]")) return null;
      const row = table.querySelector("tr");
      if (!row) return null;
      const cells = Array.from(row.children).filter(
        (c) => c.tagName === "TD" || c.tagName === "TH"
      );
      if (cells.length === 0) return null;
      const origin = contentLeft();
      const edges = [table.getBoundingClientRect().left - origin];
      for (const cell of cells) edges.push(cell.getBoundingClientRect().right - origin);
      return edges;
    }
    function commit() {
      context.invoke("editor.afterCommand");
    }
    function applyColumnChange(index, x, phase) {
      const table = currentTable();
      const edges = columnEdges();
      if (!table || !edges) return;
      const leftEdge = edges[index - 1];
      const rightEdge = edges[index + 1];
      if (leftEdge === void 0 || rightEdge === void 0) return;
      const tableWidth = table.getBoundingClientRect().width;
      if (!(tableWidth > 0)) return;
      const pct = (w) => `${(w / tableWidth * 100).toFixed(4)}%`;
      for (const row of Array.from(table.querySelectorAll("tr"))) {
        const cells = Array.from(row.children).filter(
          (c) => c.tagName === "TD" || c.tagName === "TH"
        );
        const leftCell = cells[index - 1];
        const rightCell = cells[index];
        if (leftCell) leftCell.style.width = pct(x - leftEdge);
        if (rightCell) rightCell.style.width = pct(rightEdge - x);
      }
      if (phase === "commit") commit();
    }
    function applyChange(change, phase) {
      for (const block of selectedBlocks()) {
        if (change.leftMargin !== void 0) block.style.marginLeft = `${change.leftMargin}px`;
        if (change.rightMargin !== void 0) block.style.marginRight = `${change.rightMargin}px`;
        if (change.firstLineIndent !== void 0 && block.tagName !== "TABLE")
          block.style.textIndent = `${change.firstLineIndent}px`;
      }
      if (phase === "commit") commit();
    }
    function refresh() {
      alignMount();
      if (vmount) vmount.style.paddingTop = `${contentPadding("paddingTop")}px`;
      ruler?.refresh();
      vruler?.refresh();
      guides?.refresh();
    }
    function ensureVWrap() {
      if (vwrap) return;
      const el = editableEl();
      const d = el.ownerDocument;
      const parent = el.parentElement;
      if (!parent) return;
      vwrap = d.createElement("div");
      vwrap.className = "edr-vwrap";
      parent.insertBefore(vwrap, el);
      vmount = d.createElement("div");
      vmount.className = "edr-sn-vmount";
      vwrap.appendChild(vmount);
      vwrap.appendChild(el);
      vmount.style.paddingTop = `${contentPadding("paddingTop")}px`;
      vruler = createVRuler(vmount, {
        unit: ruler?.getUnit() ?? opts().unit ?? "cm",
        ...guides ? { guides } : {},
        getMetrics: () => ({
          contentHeight: Math.max(
            0,
            el.clientHeight - contentPadding("paddingTop") - contentPadding("paddingBottom")
          )
        })
      });
    }
    function showVRuler() {
      ensureVWrap();
      if (!vmount) return;
      vmount.style.display = "";
      vmount.style.visibility = "";
      vVisible = true;
      refresh();
    }
    function hideVRuler() {
      if (!vmount) return;
      if (opts().verticalGutter === true) {
        vmount.style.visibility = "hidden";
      } else {
        vmount.style.display = "none";
      }
      vVisible = false;
      refresh();
    }
    function show() {
      if (!mount) return;
      mount.style.display = "";
      visible = true;
      refresh();
    }
    function hide() {
      if (!mount) return;
      mount.style.display = "none";
      visible = false;
    }
    const api = {
      refresh,
      show,
      hide,
      toggle: () => visible ? hide() : show(),
      isVisible: () => visible,
      setUnit: (unit) => {
        ruler?.setUnit(unit);
        vruler?.setUnit(unit);
      },
      getUnit: () => ruler?.getUnit() ?? opts().unit ?? "cm",
      showVRuler,
      hideVRuler,
      toggleVRuler: () => vVisible ? hideVRuler() : showVRuler(),
      isVRulerVisible: () => vVisible,
      setGuidesLocked: (locked) => guides?.setLocked(locked),
      isGuidesLocked: () => guides?.isLocked() === true,
      clearGuides: () => guides?.clear(),
      getGuides: () => guides?.list() ?? { x: [], y: [] }
    };
    Object.assign(self, api);
    const ui = summernote.ui;
    if (ui && typeof context.memo === "function") {
      context.memo("button.ruler", () => {
        const items = [
          ["toggle", t.showHide, () => api.toggle()],
          ["vruler", t.verticalRuler, () => api.toggleVRuler()],
          ["lockGuides", t.lockGuides, () => api.setGuidesLocked(!api.isGuidesLocked())],
          ["clearGuides", t.clearGuides, () => api.clearGuides()],
          ["cm", t.cm, () => api.setUnit("cm")],
          ["in", t.in, () => api.setUnit("in")],
          ["px", t.px, () => api.setUnit("px")]
        ];
        const button = ui.buttonGroup([
          ui.button({
            contents: RULER_ICON_SVG,
            tooltip: t.ruler,
            data: { toggle: "dropdown" }
          }),
          ui.dropdown({
            className: "dropdown-ruler",
            items: items.map(([id]) => id),
            template: (id) => items.find((i) => i[0] === id)?.[1] ?? id,
            click: (event) => {
              event.preventDefault?.();
              const id = $(event.target).closest("[data-value]").data("value");
              items.find((i) => i[0] === id)?.[2]();
            }
          })
        ]);
        return button.render();
      });
    }
    this.shouldInitialize = () => opts().enabled !== false;
    this.initialize = function initialize() {
      const el = editableEl();
      const d = el.ownerDocument;
      const parent = el.parentElement;
      if (!parent) return;
      const o = opts();
      mount = d.createElement("div");
      mount.className = "edr-sn-mount";
      parent.insertBefore(mount, el);
      if (o.guides !== false) {
        guides = createGuides(parent, {
          getOffsetLeft: () => contentPadding("paddingLeft"),
          getOffsetTop: () => contentPadding("paddingTop")
        });
      }
      ruler = createRuler(mount, {
        unit: o.unit ?? "cm",
        guideSnap: o.guideSnap ?? 5,
        getMetrics,
        onChange: applyChange,
        labels: resolveRulerLabels(o.language ?? context.options?.lang ?? void 0, d),
        columns: { get: columnEdges, onChange: applyColumnChange },
        ...guides ? { guides } : {}
      });
      alignMount();
      visible = true;
      if (o.visible === false) hide();
      if (o.vertical === true) {
        showVRuler();
      } else if (o.verticalGutter === true) {
        ensureVWrap();
        if (vmount) vmount.style.visibility = "hidden";
        refresh();
      }
    };
    this.destroy = function destroy() {
      ruler?.destroy();
      ruler = null;
      guides?.destroy();
      guides = null;
      vruler?.destroy();
      vruler = null;
      if (vwrap) {
        const el = editableEl();
        vwrap.parentElement?.insertBefore(el, vwrap);
        vwrap.remove();
        vwrap = null;
        vmount = null;
      }
      mount?.remove();
      mount = null;
      visible = false;
      vVisible = false;
    };
    this.events = {
      "summernote.mouseup": refresh,
      "summernote.keyup": refresh,
      "summernote.change": refresh
    };
  };
}
export {
  defineRulerPlugin
};
//# sourceMappingURL=index.js.map