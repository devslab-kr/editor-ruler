// src/index.ts
import { addListToDropdown, Collection, createDropdown, Plugin, UIModel } from "ckeditor5";
import {
  createGuides,
  createRuler,
  createVRuler,
  detectLanguage,
  resolveRulerLabels
} from "@devslab/editor-ruler";
var ATTRS = [
  { model: "rulerMarginLeft", style: "margin-left", key: "leftMargin" },
  { model: "rulerMarginRight", style: "margin-right", key: "rightMargin" },
  { model: "rulerTextIndent", style: "text-indent", key: "firstLineIndent" }
];
var UPCAST_TAGS = ["p", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "li", "div"];
var RULER_ICON = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 8a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H3zm1 2h1.5v3H4v-3zm3.5 0H9v2H7.5v-2zm3.5 0h1.5v3H11v-3zm3.5 0H16v2h-1.5v-2zm3.5 0h1.5v3H18v-3z"/></svg>';
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
var EditorRulerPlugin = class extends Plugin {
  constructor() {
    super(...arguments);
    this._ruler = null;
    this._guides = null;
    this._vruler = null;
    this._mountEl = null;
    this._vwrapEl = null;
    this._vmountEl = null;
    this._domRoot = null;
    this._vVisible = false;
    this._cleanup = [];
    this._gestureBaseline = null;
    this._visible = true;
  }
  static get pluginName() {
    return "EditorRuler";
  }
  get ruler() {
    return this._ruler;
  }
  get guides() {
    return this._guides;
  }
  get vruler() {
    return this._vruler;
  }
  show() {
    if (this._mountEl) this._mountEl.style.display = "";
    this._visible = true;
    this._ruler?.refresh();
  }
  hide() {
    if (this._mountEl) this._mountEl.style.display = "none";
    this._visible = false;
  }
  toggle() {
    this._visible ? this.hide() : this.show();
  }
  isVisible() {
    return this._visible;
  }
  showVRuler() {
    this._ensureVWrap();
    if (!this._vmountEl) return;
    this._vmountEl.style.display = "";
    this._vmountEl.style.visibility = "";
    this._vVisible = true;
    this._vruler?.refresh();
    this._ruler?.refresh();
    this._guides?.refresh();
  }
  hideVRuler() {
    if (!this._vmountEl) return;
    if (this._config().verticalGutter === true) {
      this._vmountEl.style.visibility = "hidden";
    } else {
      this._vmountEl.style.display = "none";
    }
    this._vVisible = false;
    this._ruler?.refresh();
    this._guides?.refresh();
  }
  toggleVRuler() {
    this._vVisible ? this.hideVRuler() : this.showVRuler();
  }
  isVRulerVisible() {
    return this._vVisible;
  }
  setUnit(unit) {
    this._ruler?.setUnit(unit);
    this._vruler?.setUnit(unit);
  }
  getUnit() {
    return this._ruler?.getUnit() ?? this._config().unit;
  }
  setGuidesLocked(locked) {
    this._guides?.setLocked(locked);
  }
  isGuidesLocked() {
    return this._guides?.isLocked() === true;
  }
  clearGuides() {
    this._guides?.clear();
  }
  init() {
    const editor = this.editor;
    const schema = editor.model.schema;
    schema.extend("$block", { allowAttributes: ATTRS.map((a) => a.model) });
    for (const attr of ATTRS) {
      editor.conversion.for("downcast").attributeToAttribute({
        model: attr.model,
        view: (value) => ({ key: "style", value: { [attr.style]: `${value}px` } })
      });
      for (const tag of UPCAST_TAGS) {
        editor.conversion.for("upcast").attributeToAttribute({
          view: { name: tag, styles: { [attr.style]: /.+/ } },
          model: {
            key: attr.model,
            value: (viewElement) => parseFloat(viewElement.getStyle(attr.style)) || 0
          }
        });
      }
    }
    this._registerToolbarDropdown();
    editor.once("ready", () => this._mount());
  }
  /** `'editorRuler'` toolbar item: a ruler-icon dropdown (show/hide, guides, units). */
  _registerToolbarDropdown() {
    const editor = this.editor;
    const plugin = this;
    editor.ui.componentFactory.add("editorRuler", (locale) => {
      const config = this._config();
      const language = detectLanguage(
        config.language || editor.config.get("language.ui") || editor.config.get("language"),
        typeof document !== "undefined" ? document : void 0
      );
      const t = STRINGS[language] ?? STRINGS.en;
      const labels = {
        toggle: t.showHide,
        vruler: t.verticalRuler,
        lockGuides: t.lockGuides,
        clearGuides: t.clearGuides,
        cm: t.cm,
        in: t.in,
        px: t.px
      };
      const dropdown = createDropdown(locale);
      dropdown.buttonView.set({ label: t.ruler, icon: RULER_ICON, tooltip: true });
      const models = /* @__PURE__ */ new Map();
      const items = new Collection();
      const push = (id) => {
        const model = new UIModel({ id, label: labels[id], withText: true });
        models.set(id, model);
        items.add({ type: "button", model });
      };
      push("toggle");
      push("vruler");
      push("lockGuides");
      push("clearGuides");
      items.add({ type: "separator" });
      push("cm");
      push("in");
      push("px");
      addListToDropdown(dropdown, items);
      dropdown.on("execute", (evt) => {
        const id = evt.source?.id;
        if (id === "toggle") plugin.toggle();
        else if (id === "vruler") plugin.toggleVRuler();
        else if (id === "lockGuides") plugin.setGuidesLocked(!plugin.isGuidesLocked());
        else if (id === "clearGuides") plugin.clearGuides();
        else if (id === "cm" || id === "in" || id === "px") plugin.setUnit(id);
      });
      dropdown.on("change:isOpen", (_evt, _name, isOpen) => {
        if (!isOpen) return;
        const unit = plugin.getUnit();
        models.get("toggle")?.set("isOn", plugin.isVisible());
        models.get("vruler")?.set("isOn", plugin.isVRulerVisible());
        models.get("lockGuides")?.set("isOn", plugin.isGuidesLocked());
        for (const u of ["cm", "in", "px"]) models.get(u)?.set("isOn", unit === u);
      });
      return dropdown;
    });
  }
  destroy() {
    for (const fn of this._cleanup) fn();
    this._cleanup = [];
    this._ruler?.destroy();
    this._ruler = null;
    this._guides?.destroy();
    this._guides = null;
    this._vruler?.destroy();
    this._vruler = null;
    if (this._vwrapEl) {
      if (this._domRoot) this._vwrapEl.parentElement?.insertBefore(this._domRoot, this._vwrapEl);
      this._vwrapEl.remove();
      this._vwrapEl = null;
      this._vmountEl = null;
    }
    this._domRoot = null;
    this._vVisible = false;
    this._mountEl?.remove();
    this._mountEl = null;
    super.destroy();
  }
  _config() {
    const editor = this.editor;
    const user = editor.config.get("editorRuler") ?? {};
    return { unit: "cm", guides: true, guideSnap: 5, ...user };
  }
  /** Wraps the editable in a flex row with the vertical ruler strip beside it. */
  _ensureVWrap() {
    const domRoot = this._domRoot;
    if (this._vwrapEl || !domRoot) return;
    const doc = domRoot.ownerDocument;
    const win = doc.defaultView;
    const parent = domRoot.parentElement;
    if (!parent) return;
    const pad = (side) => parseFloat(win.getComputedStyle(domRoot)[side]) || 0;
    const vwrap = doc.createElement("div");
    vwrap.className = "edr-vwrap";
    parent.insertBefore(vwrap, domRoot);
    const vmount = doc.createElement("div");
    vmount.className = "edr-ck-vmount";
    vwrap.appendChild(vmount);
    vwrap.appendChild(domRoot);
    vmount.style.paddingTop = `${pad("paddingTop")}px`;
    this._vwrapEl = vwrap;
    this._vmountEl = vmount;
    this._vruler = createVRuler(vmount, {
      unit: this.getUnit(),
      ...this._guides ? { guides: this._guides } : {},
      getMetrics: () => ({
        // When the editable scrolls itself (max-height setups), clientHeight
        // is the visible viewport — exactly what the strip should span.
        contentHeight: Math.max(
          0,
          domRoot.clientHeight - pad("paddingTop") - pad("paddingBottom")
        )
      })
    });
  }
  _selectedBlocks() {
    const editor = this.editor;
    return [...editor.model.document.selection.getSelectedBlocks()];
  }
  _mount() {
    const editor = this.editor;
    const domRoot = editor.editing.view.getDomRoot();
    if (!domRoot) return;
    const doc = domRoot.ownerDocument;
    const win = doc.defaultView;
    const host = domRoot.parentElement;
    if (!host) return;
    const config = this._config();
    const mount = doc.createElement("div");
    mount.className = "edr-ck-mount";
    host.insertBefore(mount, domRoot);
    this._mountEl = mount;
    this._domRoot = domRoot;
    if (config.visible === false) this.hide();
    const padding = (side) => parseFloat(win.getComputedStyle(domRoot)[side]) || 0;
    const getMetrics = () => {
      const contentWidth = Math.max(
        0,
        domRoot.clientWidth - padding("paddingLeft") - padding("paddingRight")
      );
      const block = this._selectedBlocks()[0];
      const read = (name) => block?.hasAttribute(name) ? Number(block.getAttribute(name)) || 0 : 0;
      return {
        contentWidth,
        leftMargin: read("rulerMarginLeft"),
        rightMargin: read("rulerMarginRight"),
        firstLineIndent: read("rulerTextIndent")
      };
    };
    const writeChange = (writer, blocks, change) => {
      for (const block of blocks) {
        if (change.leftMargin !== void 0) writer.setAttribute("rulerMarginLeft", change.leftMargin, block);
        if (change.rightMargin !== void 0) writer.setAttribute("rulerMarginRight", change.rightMargin, block);
        if (change.firstLineIndent !== void 0) writer.setAttribute("rulerTextIndent", change.firstLineIndent, block);
      }
    };
    const applyChange = (change, phase) => {
      const model = editor.model;
      const blocks = this._selectedBlocks();
      if (phase === "drag") {
        if (!this._gestureBaseline) {
          this._gestureBaseline = new Map(
            blocks.map((b) => [
              b,
              Object.fromEntries(
                ATTRS.map((a) => [a.model, b.hasAttribute(a.model) ? b.getAttribute(a.model) : null])
              )
            ])
          );
        }
        model.enqueueChange({ isUndoable: false }, (writer) => writeChange(writer, blocks, change));
        return;
      }
      if (this._gestureBaseline) {
        const baseline = this._gestureBaseline;
        this._gestureBaseline = null;
        model.enqueueChange({ isUndoable: false }, (writer) => {
          for (const [block, attrs] of baseline) {
            for (const [name, value] of Object.entries(attrs)) {
              if (value === null) writer.removeAttribute(name, block);
              else writer.setAttribute(name, value, block);
            }
          }
        });
      }
      model.change((writer) => writeChange(writer, blocks, change));
    };
    if (config.guides !== false) {
      this._guides = createGuides(host, {
        getOffsetLeft: () => domRoot.offsetLeft + padding("paddingLeft"),
        getOffsetTop: () => domRoot.offsetTop + padding("paddingTop")
      });
    }
    const language = config.language || editor.config.get("language.ui") || editor.config.get("language") || void 0;
    this._ruler = createRuler(mount, {
      unit: config.unit,
      guideSnap: config.guideSnap,
      getMetrics,
      onChange: applyChange,
      labels: resolveRulerLabels(
        typeof language === "string" ? language : detectLanguage(void 0, doc),
        doc
      ),
      ...this._guides ? { guides: this._guides } : {}
    });
    const align = () => {
      mount.style.paddingLeft = `${domRoot.offsetLeft + padding("paddingLeft")}px`;
    };
    align();
    const refresh = () => {
      align();
      this._ruler?.refresh();
      this._vruler?.refresh();
      this._guides?.refresh();
    };
    const selection = editor.model.document.selection;
    selection.on("change:range", refresh);
    editor.model.document.on("change:data", refresh);
    win.addEventListener("resize", refresh);
    this._cleanup.push(() => {
      selection.off("change:range", refresh);
      editor.model.document.off("change:data", refresh);
      win.removeEventListener("resize", refresh);
    });
    if (config.vertical === true) {
      this.showVRuler();
    } else if (config.verticalGutter === true) {
      this._ensureVWrap();
      if (this._vmountEl) this._vmountEl.style.visibility = "hidden";
    }
    this._ruler.refresh();
  }
};
var index_default = EditorRulerPlugin;
export {
  EditorRulerPlugin,
  index_default as default
};
//# sourceMappingURL=index.js.map