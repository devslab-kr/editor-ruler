// src/index.ts
import { Extension } from "@tiptap/core";
import {
  createGuides,
  createRuler,
  createVRuler,
  resolveRulerLabels
} from "@devslab/editor-ruler";
function styleOf(indent) {
  if (!indent) return null;
  const parts = [];
  if (indent.marginLeft != null) parts.push(`margin-left: ${indent.marginLeft}px`);
  if (indent.marginRight != null) parts.push(`margin-right: ${indent.marginRight}px`);
  if (indent.textIndent != null) parts.push(`text-indent: ${indent.textIndent}px`);
  return parts.length > 0 ? parts.join("; ") : null;
}
function parseIndent(element) {
  const read = (value) => {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : void 0;
  };
  const indent = {};
  const ml = read(element.style.marginLeft);
  if (ml !== void 0) indent.marginLeft = ml;
  const mr = read(element.style.marginRight);
  if (mr !== void 0) indent.marginRight = mr;
  const ti = read(element.style.textIndent);
  if (ti !== void 0) indent.textIndent = ti;
  return Object.keys(indent).length > 0 ? indent : null;
}
var EditorRuler = Extension.create({
  name: "editorRuler",
  addOptions() {
    return {
      types: ["paragraph", "heading"],
      visible: true,
      vertical: false,
      verticalGutter: false,
      unit: "cm",
      guides: true,
      guideSnap: 5,
      language: null,
      element: null
    };
  },
  addStorage() {
    return {
      ruler: null,
      guides: null,
      vruler: null,
      host: null,
      visible: true,
      verticalVisible: false,
      setVerticalVisible: null,
      cleanup: null
    };
  },
  addCommands() {
    const setVisible = (storage, visible) => {
      if (!storage.host) return false;
      storage.host.style.display = visible ? "" : "none";
      storage.visible = visible;
      if (visible) storage.ruler?.refresh();
      return true;
    };
    const setVertical = (storage, visible) => {
      if (!storage.setVerticalVisible) return false;
      storage.setVerticalVisible(visible);
      return true;
    };
    const internal = () => this.storage;
    return {
      showRuler: () => () => setVisible(this.storage, true),
      hideRuler: () => () => setVisible(this.storage, false),
      toggleRuler: () => () => setVisible(this.storage, !this.storage.visible),
      showVerticalRuler: () => () => setVertical(internal(), true),
      hideVerticalRuler: () => () => setVertical(internal(), false),
      toggleVerticalRuler: () => () => setVertical(internal(), !this.storage.verticalVisible)
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          rulerIndent: {
            default: null,
            parseHTML: (element) => parseIndent(element),
            renderHTML: (attributes) => {
              const style = styleOf(attributes.rulerIndent);
              return style ? { style } : {};
            }
          }
        }
      }
    ];
  },
  onCreate() {
    const editor = this.editor;
    const options = this.options;
    const storage = this.storage;
    const view = editor.view;
    const dom = view.dom;
    const doc = dom.ownerDocument;
    const win = doc.defaultView;
    let ownsHost = false;
    const host = options.element ?? (() => {
      const m = doc.createElement("div");
      m.className = "edr-tiptap-mount";
      dom.parentElement?.insertBefore(m, dom);
      ownsHost = true;
      return m;
    })();
    const padding = (side) => parseFloat(win.getComputedStyle(dom)[side]) || 0;
    const types = options.types;
    function currentBlocks() {
      const { state } = editor;
      const targets = [];
      state.doc.nodesBetween(state.selection.from, state.selection.to, (node, pos) => {
        if (types.includes(node.type.name)) {
          targets.push({ node, pos });
          return false;
        }
        return true;
      });
      return targets;
    }
    function getMetrics() {
      const contentWidth = Math.max(
        0,
        dom.clientWidth - padding("paddingLeft") - padding("paddingRight")
      );
      const indent = currentBlocks()[0]?.node.attrs.rulerIndent ?? {};
      return {
        contentWidth,
        leftMargin: indent.marginLeft ?? 0,
        rightMargin: indent.marginRight ?? 0,
        firstLineIndent: indent.textIndent ?? 0
      };
    }
    let gestureBaseline = null;
    function applyIndent(change, addToHistory, baseline) {
      const { state } = editor;
      const tr = state.tr;
      for (const { node, pos } of currentBlocks()) {
        const prev = baseline?.get(pos) ?? node.attrs.rulerIndent ?? {};
        const next = { ...prev };
        if (change.leftMargin !== void 0) next.marginLeft = change.leftMargin;
        if (change.rightMargin !== void 0) next.marginRight = change.rightMargin;
        if (change.firstLineIndent !== void 0) next.textIndent = change.firstLineIndent;
        tr.setNodeMarkup(pos, void 0, { ...node.attrs, rulerIndent: next });
      }
      if (!tr.docChanged) return;
      if (!addToHistory) tr.setMeta("addToHistory", false);
      view.dispatch(tr);
    }
    function applyChange(change, phase) {
      if (phase === "drag") {
        if (!gestureBaseline) {
          gestureBaseline = new Map(
            currentBlocks().map(({ node, pos }) => [pos, node.attrs.rulerIndent ?? null])
          );
        }
        applyIndent(change, false);
        return;
      }
      if (gestureBaseline) {
        const restore = editor.state.tr;
        for (const { node, pos } of currentBlocks()) {
          if (gestureBaseline.has(pos)) {
            restore.setNodeMarkup(pos, void 0, {
              ...node.attrs,
              rulerIndent: gestureBaseline.get(pos)
            });
          }
        }
        if (restore.docChanged) {
          restore.setMeta("addToHistory", false);
          view.dispatch(restore);
        }
        gestureBaseline = null;
      }
      applyIndent(change, true);
    }
    let guides = null;
    if (options.guides) {
      const container = dom.parentElement ?? host;
      guides = createGuides(container, {
        getOffsetLeft: () => dom.offsetLeft + padding("paddingLeft"),
        getOffsetTop: () => dom.offsetTop + padding("paddingTop")
      });
    }
    const align = () => {
      host.style.paddingLeft = `${dom.offsetLeft + padding("paddingLeft")}px`;
    };
    const ruler = createRuler(host, {
      unit: options.unit,
      guideSnap: options.guideSnap,
      getMetrics,
      onChange: applyChange,
      labels: resolveRulerLabels(options.language ?? void 0, doc),
      ...guides ? { guides } : {}
    });
    align();
    let vwrap = null;
    let vmount = null;
    const vGutter = options.verticalGutter === true;
    const ensureVWrap = () => {
      if (vwrap) return;
      const parent = dom.parentElement;
      if (!parent) return;
      vwrap = doc.createElement("div");
      vwrap.className = "edr-vwrap";
      parent.insertBefore(vwrap, dom);
      vmount = doc.createElement("div");
      vmount.className = "edr-tiptap-vmount";
      vwrap.appendChild(vmount);
      vwrap.appendChild(dom);
      vmount.style.paddingTop = `${padding("paddingTop")}px`;
      storage.vruler = createVRuler(vmount, {
        unit: ruler.getUnit(),
        ...guides ? { guides } : {},
        getMetrics: () => ({
          // When the editable scrolls itself, clientHeight is the visible
          // viewport, which is exactly what the strip should span.
          contentHeight: Math.max(
            0,
            dom.clientHeight - padding("paddingTop") - padding("paddingBottom")
          )
        })
      });
    };
    const setVerticalVisible = (visible) => {
      ensureVWrap();
      if (!vmount) return;
      if (visible) {
        vmount.style.display = "";
        vmount.style.visibility = "";
        storage.vruler?.refresh();
      } else if (vGutter) {
        vmount.style.visibility = "hidden";
      } else {
        vmount.style.display = "none";
      }
      storage.verticalVisible = visible;
      align();
      ruler.refresh();
      guides?.refresh();
    };
    storage.setVerticalVisible = setVerticalVisible;
    if (options.vertical === true) {
      setVerticalVisible(true);
    } else if (vGutter) {
      ensureVWrap();
      if (vmount) vmount.style.visibility = "hidden";
    }
    const onResize = () => {
      align();
      ruler.refresh();
      storage.vruler?.refresh();
      guides?.refresh();
    };
    win.addEventListener("resize", onResize);
    storage.ruler = ruler;
    storage.guides = guides;
    storage.host = host;
    storage.visible = options.visible !== false;
    if (!storage.visible) host.style.display = "none";
    storage.cleanup = () => {
      win.removeEventListener("resize", onResize);
      ruler.destroy();
      guides?.destroy();
      storage.vruler?.destroy();
      storage.vruler = null;
      storage.setVerticalVisible = null;
      if (vwrap) {
        vwrap.parentElement?.insertBefore(dom, vwrap);
        vwrap.remove();
        vwrap = null;
        vmount = null;
      }
      if (ownsHost) host.remove();
    };
  },
  onSelectionUpdate() {
    this.storage.ruler?.refresh();
  },
  onUpdate() {
    this.storage.ruler?.refresh();
    this.storage.vruler?.refresh();
  },
  onDestroy() {
    this.storage.cleanup?.();
  }
});
var index_default = EditorRuler;
export {
  EditorRuler,
  index_default as default
};
//# sourceMappingURL=index.js.map