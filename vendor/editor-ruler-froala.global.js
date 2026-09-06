"use strict";
var EditorRulerFroala = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    defineRulerPlugin: () => defineRulerPlugin
  });

  // ../editor-ruler/dist/index.js
  var PX_PER_INCH = 96;
  var PX_PER_CM = PX_PER_INCH / 2.54;
  function pxPerUnit(unit) {
    switch (unit) {
      case "cm":
        return PX_PER_CM;
      case "in":
        return PX_PER_INCH;
      case "px":
        return 1;
    }
  }
  var TICK_SPECS = {
    cm: { minor: 0.25, mid: 0.5, major: 1 },
    in: { minor: 0.125, mid: 0.5, major: 1 },
    px: { minor: 10, mid: 50, major: 100 }
  };
  var EPSILON = 1e-6;
  function computeTicks(widthPx, unit) {
    const ticks = [];
    if (!(widthPx > 0)) return ticks;
    const scale = pxPerUnit(unit);
    const spec = TICK_SPECS[unit];
    for (let i = 0; ; i++) {
      const value = i * spec.minor;
      const x = value * scale;
      if (x > widthPx + EPSILON) break;
      const isMajor = isMultipleOf(value, spec.major);
      const isMid = !isMajor && isMultipleOf(value, spec.mid);
      const tick = { x, kind: isMajor ? "major" : isMid ? "mid" : "minor" };
      if (isMajor) tick.label = formatTickLabel(value);
      ticks.push(tick);
    }
    return ticks;
  }
  function isMultipleOf(value, base) {
    const ratio = value / base;
    return Math.abs(ratio - Math.round(ratio)) < EPSILON;
  }
  function formatTickLabel(value) {
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  }
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
  var STYLE_ATTR = "data-edr-styles";
  var CSS = `
.edr-ruler {
  position: relative;
  height: 22px;
  user-select: none;
  -webkit-user-select: none;
  background: var(--edr-bg, #f6f7f8);
  border-bottom: 1px solid var(--edr-border, #d8dbe0);
  color: var(--edr-fg, #5f6570);
}
.edr-scale {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
}
.edr-handle {
  position: absolute;
  width: 12px;
  height: 10px;
  margin-left: -6px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: ew-resize;
  touch-action: none;
  z-index: 2;
  display: block;
}
.edr-handle svg {
  display: block;
  width: 100%;
  height: 100%;
  fill: var(--edr-handle, #3b82f6);
}
.edr-handle:hover svg,
.edr-handle:active svg {
  fill: var(--edr-handle-active, #2563eb);
}
.edr-handle:focus-visible {
  outline: 2px solid var(--edr-accent, #3b82f6);
  outline-offset: 1px;
}
.edr-handle-indent { top: 0; }
.edr-handle-left { bottom: 0; }
.edr-handle-right { bottom: 0; }
.edr-ruler.edr-has-guides { cursor: copy; }
.edr-ruler.edr-has-guides .edr-handle { cursor: ew-resize; }
.edr-vruler {
  position: relative;
  width: 22px;
  flex: 0 0 auto;
  user-select: none;
  -webkit-user-select: none;
  background: var(--edr-bg, #f6f7f8);
  border-right: 1px solid var(--edr-border, #d8dbe0);
  color: var(--edr-fg, #5f6570);
}
.edr-vscale {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
}
.edr-vwrap {
  display: flex;
  align-items: stretch;
}
.edr-vwrap > *:last-child { flex: 1 1 auto; min-width: 0; }
.edr-guides {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
}
.edr-guide {
  position: absolute;
  pointer-events: auto;
}
.edr-guide::before {
  content: '';
  position: absolute;
  background: var(--edr-guide, #2563eb);
  opacity: 0.65;
}
.edr-guide-x {
  top: 0;
  bottom: 0;
  width: 7px;
  margin-left: -3px;
  cursor: ew-resize;
}
.edr-guide-x::before {
  left: 3px;
  top: 0;
  bottom: 0;
  width: 1px;
}
.edr-guide-y {
  left: 0;
  right: 0;
  height: 7px;
  margin-top: -3px;
  cursor: ns-resize;
}
.edr-guide-y::before {
  top: 3px;
  left: 0;
  right: 0;
  height: 1px;
}
.edr-vruler.edr-has-guides { cursor: copy; }
.edr-colmark {
  position: absolute;
  bottom: 2px;
  width: 8px;
  height: 8px;
  margin-left: -4px;
  box-sizing: border-box;
  cursor: col-resize;
  z-index: 3;
  background: var(--edr-colmark, #e5e7eb);
  border: 1px solid var(--edr-fg, #5f6570);
  border-radius: 1px;
  padding: 0;
}
.edr-colmark:focus-visible {
  outline: 2px solid var(--edr-accent, #3b82f6);
  outline-offset: 1px;
}
.edr-guide-temp::before { opacity: 0.35; }
.edr-guides-locked .edr-guide { cursor: default; pointer-events: none; }
@media (prefers-color-scheme: dark) {
  .edr-ruler {
    background: var(--edr-bg, #26282c);
    border-bottom-color: var(--edr-border, #3a3d42);
    color: var(--edr-fg, #9aa0aa);
  }
  .edr-vruler {
    background: var(--edr-bg, #26282c);
    border-right-color: var(--edr-border, #3a3d42);
    color: var(--edr-fg, #9aa0aa);
  }
}
`;
  function ensureStyles(doc) {
    if (doc.head.querySelector(`style[${STYLE_ATTR}]`)) return;
    const style = doc.createElement("style");
    style.setAttribute(STYLE_ATTR, "");
    style.textContent = CSS;
    doc.head.appendChild(style);
  }
  var DEFAULT_LABELS = {
    leftMargin: "Left margin",
    rightMargin: "Right margin",
    firstLineIndent: "First-line indent",
    columnBoundary: "Column boundary"
  };
  var DEFAULT_MIN_COLUMN_MARKER_GAP = 24;
  var DEFAULT_MIN_COLUMN = 48;
  var KEYBOARD_STEP = 1;
  var KEYBOARD_STEP_LARGE = 10;
  var SVG_NS = "http://www.w3.org/2000/svg";
  var RULER_HEIGHT = 22;
  var TRIANGLE_DOWN = "M0,0 L12,0 L6,10 Z";
  var TRIANGLE_UP = "M6,0 L12,10 L0,10 Z";
  var HANDLE_SPECS = [
    {
      key: "firstLineIndent",
      className: "edr-handle-indent",
      path: TRIANGLE_DOWN,
      sign: 1,
      position: (m) => m.leftMargin + m.firstLineIndent,
      valueForPosition: (m, pos) => pos - m.leftMargin,
      min: (m) => -m.leftMargin,
      max: (m, minColumn) => m.contentWidth - m.leftMargin - m.rightMargin - minColumn
    },
    {
      key: "leftMargin",
      className: "edr-handle-left",
      path: TRIANGLE_UP,
      sign: 1,
      position: (m) => m.leftMargin,
      valueForPosition: (_m, pos) => pos,
      min: (m) => Math.max(0, -m.firstLineIndent),
      max: (m, minColumn) => m.contentWidth - m.rightMargin - minColumn - Math.max(0, m.firstLineIndent)
    },
    {
      key: "rightMargin",
      className: "edr-handle-right",
      path: TRIANGLE_UP,
      sign: -1,
      position: (m) => m.contentWidth - m.rightMargin,
      valueForPosition: (m, pos) => m.contentWidth - pos,
      min: () => 0,
      max: (m, minColumn) => m.contentWidth - m.leftMargin - Math.max(0, m.firstLineIndent) - minColumn
    }
  ];
  function createRuler(mount, options) {
    const doc = mount.ownerDocument;
    ensureStyles(doc);
    let unit = options.unit ?? "cm";
    const minColumn = options.minColumnWidth ?? DEFAULT_MIN_COLUMN;
    const labels = { ...DEFAULT_LABELS, ...options.labels };
    const abort = new AbortController();
    const { signal } = abort;
    const root = doc.createElement("div");
    root.className = "edr-ruler";
    const scale = doc.createElementNS(SVG_NS, "svg");
    scale.setAttribute("class", "edr-scale");
    scale.setAttribute("height", String(RULER_HEIGHT));
    root.appendChild(scale);
    const handles = /* @__PURE__ */ new Map();
    for (const spec of HANDLE_SPECS) {
      const handle = doc.createElement("div");
      handle.className = `edr-handle ${spec.className}`;
      handle.tabIndex = 0;
      handle.setAttribute("role", "slider");
      handle.setAttribute("aria-orientation", "horizontal");
      handle.setAttribute("aria-label", labels[spec.key]);
      const svg = doc.createElementNS(SVG_NS, "svg");
      svg.setAttribute("viewBox", "0 0 12 10");
      const path = doc.createElementNS(SVG_NS, "path");
      path.setAttribute("d", spec.path);
      svg.appendChild(path);
      handle.appendChild(svg);
      root.appendChild(handle);
      handles.set(spec.key, handle);
      wireHandle(handle, spec);
    }
    if (options.guides) {
      root.classList.add("edr-has-guides");
      root.addEventListener(
        "pointerdown",
        (event) => {
          if (event.target?.closest?.(".edr-handle, .edr-colmark")) return;
          options.guides.beginCreate(event, root, "y");
        },
        { signal }
      );
    }
    mount.appendChild(root);
    let lastScaleWidth = -1;
    let lastScaleUnit = null;
    function readMetrics() {
      const m = options.getMetrics();
      return {
        contentWidth: Math.max(0, m.contentWidth),
        leftMargin: m.leftMargin || 0,
        rightMargin: m.rightMargin || 0,
        firstLineIndent: m.firstLineIndent || 0
      };
    }
    function refresh() {
      layout(readMetrics());
    }
    function layout(m) {
      root.style.width = `${m.contentWidth}px`;
      if (m.contentWidth !== lastScaleWidth || unit !== lastScaleUnit) {
        renderScale(m.contentWidth);
        lastScaleWidth = m.contentWidth;
        lastScaleUnit = unit;
      }
      for (const spec of HANDLE_SPECS) {
        const handle = handles.get(spec.key);
        handle.style.left = `${spec.position(m)}px`;
        handle.setAttribute("aria-valuemin", String(Math.round(spec.min(m))));
        handle.setAttribute("aria-valuemax", String(Math.round(spec.max(m, minColumn))));
        handle.setAttribute("aria-valuenow", String(Math.round(valueOf(spec.key, m))));
      }
      syncColumnMarkers();
    }
    let columnEdges = [];
    const columnMarkers = [];
    function syncColumnMarkers() {
      if (!options.columns) return;
      columnEdges = options.columns.get() ?? [];
      const innerCount = Math.max(0, columnEdges.length - 2);
      while (columnMarkers.length > innerCount) columnMarkers.pop().remove();
      while (columnMarkers.length < innerCount) {
        const marker = doc.createElement("div");
        marker.className = "edr-colmark";
        marker.tabIndex = 0;
        marker.setAttribute("role", "slider");
        marker.setAttribute("aria-orientation", "horizontal");
        marker.setAttribute("aria-label", labels.columnBoundary);
        wireColumnMarker(marker);
        root.appendChild(marker);
        columnMarkers.push(marker);
      }
      columnMarkers.forEach((marker, i) => {
        const index = i + 1;
        marker.dataset.index = String(index);
        marker.style.left = `${columnEdges[index]}px`;
        marker.setAttribute("aria-valuenow", String(Math.round(columnEdges[index])));
      });
    }
    function columnBounds(index) {
      const gap = options.columns?.minWidth ?? DEFAULT_MIN_COLUMN_MARKER_GAP;
      const lo = (columnEdges[index - 1] ?? 0) + gap;
      const hi = (columnEdges[index + 1] ?? Number.MAX_SAFE_INTEGER) - gap;
      return { lo, hi: Math.max(lo, hi) };
    }
    function applyColumn(marker, index, raw, phase) {
      const { lo, hi } = columnBounds(index);
      const next = clamp(raw, lo, hi);
      marker.style.left = `${next}px`;
      marker.setAttribute("aria-valuenow", String(Math.round(next)));
      options.columns.onChange(index, next, phase);
      return next;
    }
    function wireColumnMarker(marker) {
      marker.addEventListener(
        "pointerdown",
        (down) => {
          down.preventDefault();
          down.stopPropagation();
          marker.focus();
          const index = Number(marker.dataset.index);
          const startX = down.clientX;
          const startEdge = columnEdges[index] ?? 0;
          let last = startEdge;
          const onMove = (move) => {
            const raw = startEdge + (move.clientX - startX);
            const snapped = snapPosition(raw);
            last = applyColumn(marker, index, snapped ?? raw, "drag");
          };
          const onUp = () => {
            doc.defaultView?.removeEventListener("pointermove", onMove);
            doc.defaultView?.removeEventListener("pointerup", onUp);
            applyColumn(marker, index, last, "commit");
            refresh();
          };
          doc.defaultView?.addEventListener("pointermove", onMove, { signal });
          doc.defaultView?.addEventListener("pointerup", onUp, { signal });
        },
        { signal }
      );
      marker.addEventListener(
        "keydown",
        (event) => {
          const index = Number(marker.dataset.index);
          const current = columnEdges[index] ?? 0;
          const step = event.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;
          let next = null;
          if (event.key === "ArrowLeft") next = current - step;
          else if (event.key === "ArrowRight") next = current + step;
          else return;
          event.preventDefault();
          applyColumn(marker, index, next, "commit");
          refresh();
        },
        { signal }
      );
    }
    function renderScale(widthPx) {
      while (scale.firstChild) scale.removeChild(scale.firstChild);
      scale.setAttribute("width", String(widthPx));
      scale.setAttribute("viewBox", `0 0 ${Math.max(widthPx, 1)} ${RULER_HEIGHT}`);
      for (const tick of computeTicks(widthPx, unit)) {
        const height = tick.kind === "major" ? 7 : tick.kind === "mid" ? 5 : 3;
        const line = doc.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", String(tick.x));
        line.setAttribute("x2", String(tick.x));
        line.setAttribute("y1", String(RULER_HEIGHT - height));
        line.setAttribute("y2", String(RULER_HEIGHT));
        line.setAttribute("stroke", "currentColor");
        line.setAttribute("stroke-width", "1");
        scale.appendChild(line);
        if (tick.label !== void 0 && tick.x > 0) {
          const text = doc.createElementNS(SVG_NS, "text");
          text.setAttribute("x", String(tick.x));
          text.setAttribute("y", "11");
          text.setAttribute("text-anchor", "middle");
          text.setAttribute("fill", "currentColor");
          text.setAttribute("font-size", "9");
          text.textContent = tick.label;
          scale.appendChild(text);
        }
      }
    }
    function valueOf(key, m) {
      return m[key];
    }
    function snapPosition(pos) {
      const distance = options.guideSnap ?? 5;
      if (!options.guides || !(distance > 0)) return null;
      let best = null;
      for (const g of options.guides.list().x) {
        const d = Math.abs(g - pos);
        if (d <= distance && (best === null || d < Math.abs(best - pos))) best = g;
      }
      return best;
    }
    function applyValue(spec, m, raw, phase) {
      const lo = spec.min(m);
      const hi = Math.max(lo, spec.max(m, minColumn));
      const next = clamp(raw, lo, hi);
      const updated = { ...m, [spec.key]: next };
      layout(updated);
      options.onChange({ [spec.key]: next }, phase);
    }
    function wireHandle(handle, spec) {
      handle.addEventListener(
        "pointerdown",
        (down) => {
          down.preventDefault();
          handle.focus();
          const startMetrics = readMetrics();
          const startValue = valueOf(spec.key, startMetrics);
          const startX = down.clientX;
          let lastValue = startValue;
          const onMove = (move) => {
            const raw = startValue + spec.sign * (move.clientX - startX);
            const lo = spec.min(startMetrics);
            const hi = Math.max(lo, spec.max(startMetrics, minColumn));
            let value = clamp(raw, lo, hi);
            const snapped = snapPosition(spec.position({ ...startMetrics, [spec.key]: value }));
            if (snapped !== null) {
              value = clamp(spec.valueForPosition(startMetrics, snapped), lo, hi);
            }
            lastValue = value;
            applyValue(spec, startMetrics, lastValue, "drag");
          };
          const onUp = () => {
            doc.defaultView?.removeEventListener("pointermove", onMove);
            doc.defaultView?.removeEventListener("pointerup", onUp);
            applyValue(spec, startMetrics, lastValue, "commit");
            refresh();
          };
          doc.defaultView?.addEventListener("pointermove", onMove, { signal });
          doc.defaultView?.addEventListener("pointerup", onUp, { signal });
        },
        { signal }
      );
      handle.addEventListener(
        "keydown",
        (event) => {
          const m = readMetrics();
          const current = valueOf(spec.key, m);
          let next = null;
          const step = event.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;
          switch (event.key) {
            case "ArrowLeft":
              next = current - spec.sign * step;
              break;
            case "ArrowRight":
              next = current + spec.sign * step;
              break;
            case "Home":
              next = spec.min(m);
              break;
            case "End":
              next = spec.max(m, minColumn);
              break;
            default:
              return;
          }
          event.preventDefault();
          applyValue(spec, m, next, "commit");
        },
        { signal }
      );
    }
    refresh();
    return {
      element: root,
      refresh,
      setUnit(next) {
        unit = next;
        refresh();
      },
      getUnit: () => unit,
      destroy() {
        abort.abort();
        root.remove();
      }
    };
  }
  var SVG_NS2 = "http://www.w3.org/2000/svg";
  var RULER_WIDTH = 22;
  function createVRuler(mount, options) {
    const doc = mount.ownerDocument;
    ensureStyles(doc);
    let unit = options.unit ?? "cm";
    const root = doc.createElement("div");
    root.className = "edr-vruler";
    const scale = doc.createElementNS(SVG_NS2, "svg");
    scale.setAttribute("class", "edr-vscale");
    scale.setAttribute("width", String(RULER_WIDTH));
    root.appendChild(scale);
    if (options.guides) {
      root.classList.add("edr-has-guides");
      root.addEventListener("pointerdown", (event) => {
        options.guides.beginCreate(event, root, "x");
      });
    }
    mount.appendChild(root);
    let lastHeight = -1;
    let lastUnit = null;
    function refresh() {
      const height = Math.max(0, options.getMetrics().contentHeight);
      root.style.height = `${height}px`;
      if (height === lastHeight && unit === lastUnit) return;
      lastHeight = height;
      lastUnit = unit;
      renderScale(height);
    }
    function renderScale(heightPx) {
      while (scale.firstChild) scale.removeChild(scale.firstChild);
      scale.setAttribute("height", String(heightPx));
      scale.setAttribute("viewBox", `0 0 ${RULER_WIDTH} ${Math.max(heightPx, 1)}`);
      for (const tick of computeTicks(heightPx, unit)) {
        const length = tick.kind === "major" ? 7 : tick.kind === "mid" ? 5 : 3;
        const line = doc.createElementNS(SVG_NS2, "line");
        line.setAttribute("y1", String(tick.x));
        line.setAttribute("y2", String(tick.x));
        line.setAttribute("x1", String(RULER_WIDTH - length));
        line.setAttribute("x2", String(RULER_WIDTH));
        line.setAttribute("stroke", "currentColor");
        line.setAttribute("stroke-width", "1");
        scale.appendChild(line);
        if (tick.label !== void 0 && tick.x > 0) {
          const text = doc.createElementNS(SVG_NS2, "text");
          text.setAttribute("x", "10");
          text.setAttribute("y", String(tick.x + 3));
          text.setAttribute("text-anchor", "middle");
          text.setAttribute("fill", "currentColor");
          text.setAttribute("font-size", "9");
          text.textContent = tick.label;
          scale.appendChild(text);
        }
      }
    }
    refresh();
    return {
      element: root,
      refresh,
      setUnit(next) {
        unit = next;
        refresh();
      },
      getUnit: () => unit,
      destroy() {
        root.remove();
      }
    };
  }
  function createGuides(container, options = {}) {
    const doc = container.ownerDocument;
    ensureStyles(doc);
    const win = doc.defaultView;
    const abort = new AbortController();
    const { signal } = abort;
    if (win.getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }
    const layer = doc.createElement("div");
    layer.className = "edr-guides";
    container.appendChild(layer);
    const guides = [];
    let locked = false;
    let visible = true;
    const offsetLeft = () => options.getOffsetLeft?.() ?? 0;
    const offsetTop = () => options.getOffsetTop?.() ?? 0;
    function notify() {
      options.onChange?.(list());
    }
    function list() {
      const sorted = (axis) => guides.filter((g) => g.axis === axis).map((g) => g.pos).sort((a, b) => a - b);
      return { x: sorted("x"), y: sorted("y") };
    }
    function position(entry) {
      if (entry.axis === "x") entry.el.style.left = `${offsetLeft() + entry.pos}px`;
      else entry.el.style.top = `${offsetTop() + entry.pos}px`;
    }
    function makeGuideEl(axis, temp = false) {
      const el = doc.createElement("div");
      el.className = `edr-guide edr-guide-${axis}${temp ? " edr-guide-temp" : ""}`;
      layer.appendChild(el);
      return el;
    }
    function addGuide(axis, pos) {
      const entry = { axis, pos: Math.max(0, pos), el: makeGuideEl(axis) };
      position(entry);
      wireGuideDrag(entry);
      guides.push(entry);
      return entry;
    }
    function removeGuide(entry) {
      entry.el.remove();
      const i = guides.indexOf(entry);
      if (i >= 0) guides.splice(i, 1);
    }
    function wireGuideDrag(entry) {
      entry.el.addEventListener(
        "pointerdown",
        (down) => {
          if (locked) return;
          down.preventDefault();
          down.stopPropagation();
          const start = entry.axis === "x" ? down.clientX : down.clientY;
          const startPos = entry.pos;
          const containerRect = container.getBoundingClientRect();
          const onMove = (move) => {
            const client = entry.axis === "x" ? move.clientX : move.clientY;
            entry.pos = Math.max(0, startPos + (client - start));
            position(entry);
          };
          const onUp = (up) => {
            win.removeEventListener("pointermove", onMove);
            win.removeEventListener("pointerup", onUp);
            const gone = entry.axis === "x" ? up.clientX < containerRect.left : up.clientY < containerRect.top;
            if (gone) removeGuide(entry);
            notify();
          };
          win.addEventListener("pointermove", onMove, { signal });
          win.addEventListener("pointerup", onUp, { signal });
        },
        { signal }
      );
    }
    return {
      element: layer,
      list,
      set(next) {
        for (const g of [...guides]) removeGuide(g);
        for (const x of next.x ?? []) addGuide("x", x);
        for (const y of next.y ?? []) addGuide("y", y);
        notify();
      },
      clear() {
        if (guides.length === 0) return;
        for (const g of [...guides]) removeGuide(g);
        notify();
      },
      setLocked(next) {
        locked = next;
        layer.classList.toggle("edr-guides-locked", locked);
      },
      isLocked: () => locked,
      setVisible(next) {
        visible = next;
        layer.style.display = visible ? "" : "none";
      },
      isVisible: () => visible,
      beginCreate(event, rulerRoot, axis) {
        if (locked || !visible) return;
        event.preventDefault();
        const rulerRect = rulerRoot.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const temp = makeGuideEl(axis, true);
        const posFrom = (clientX, clientY) => Math.max(
          0,
          axis === "x" ? clientX - containerRect.left - offsetLeft() : clientY - containerRect.top - offsetTop()
        );
        let pos = posFrom(event.clientX, event.clientY);
        const place = () => {
          if (axis === "x") temp.style.left = `${offsetLeft() + pos}px`;
          else temp.style.top = `${offsetTop() + pos}px`;
        };
        place();
        const onMove = (move) => {
          pos = posFrom(move.clientX, move.clientY);
          place();
        };
        const onUp = (up) => {
          win.removeEventListener("pointermove", onMove);
          win.removeEventListener("pointerup", onUp);
          temp.remove();
          const committed = axis === "y" ? up.clientY > rulerRect.bottom : up.clientX > rulerRect.right;
          if (committed) {
            addGuide(axis, pos);
            notify();
          }
        };
        win.addEventListener("pointermove", onMove, { signal });
        win.addEventListener("pointerup", onUp, { signal });
      },
      refresh() {
        for (const g of guides) position(g);
      },
      destroy() {
        abort.abort();
        layer.remove();
        guides.length = 0;
      }
    };
  }
  var RULER_LABEL_LOCALES = {
    en: {
      leftMargin: "Left margin",
      rightMargin: "Right margin",
      firstLineIndent: "First-line indent",
      columnBoundary: "Column boundary"
    },
    ko: {
      leftMargin: "\uC67C\uCABD \uC5EC\uBC31",
      rightMargin: "\uC624\uB978\uCABD \uC5EC\uBC31",
      firstLineIndent: "\uCCAB \uC904 \uB4E4\uC5EC\uC4F0\uAE30",
      columnBoundary: "\uCEEC\uB7FC \uACBD\uACC4"
    }
  };
  function detectLanguage(explicit, doc) {
    const raw = explicit || doc?.documentElement?.lang || doc?.defaultView?.navigator?.language || (typeof navigator !== "undefined" ? navigator.language : "") || "en";
    return raw.toLowerCase().split("-")[0] || "en";
  }
  function resolveRulerLabels(language, doc) {
    return RULER_LABEL_LOCALES[detectLanguage(language, doc)] ?? RULER_LABEL_LOCALES.en;
  }

  // src/index.ts
  var STRINGS = {
    en: {
      ruler: "Ruler",
      toggleRuler: "Toggle Ruler",
      rulerUnit: "Ruler Unit",
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
      toggleRuler: "\uC904\uC790 \uD45C\uC2DC/\uC228\uAE30\uAE30",
      rulerUnit: "\uB208\uAE08 \uB2E8\uC704",
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
  var RULER_ICON_SVG = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 8a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H3zm1 2h1.5v3H4v-3zm3.5 0H9v2H7.5v-2zm3.5 0h1.5v3H11v-3zm3.5 0H16v2h-1.5v-2zm3.5 0h1.5v3H18v-3z"/></svg>';
  function defineRulerPlugin(FroalaEditor, defineOptions = {}) {
    if (FroalaEditor.PLUGINS?.ruler) return;
    const doc = typeof document !== "undefined" ? document : void 0;
    const language = detectLanguage(defineOptions.language, doc);
    const t = { ...STRINGS[language] ?? STRINGS.en, ...defineOptions.strings };
    const UNIT_OPTIONS = { cm: t.cm, in: t.in, px: t.px };
    FroalaEditor.DEFAULTS = Object.assign(
      {
        rulerEnabled: true,
        rulerVisible: true,
        rulerUnit: "cm",
        rulerVertical: false,
        rulerVerticalGutter: false,
        rulerGuides: true,
        rulerLanguage: null
      },
      FroalaEditor.DEFAULTS
    );
    if (typeof FroalaEditor.DefineIconTemplate === "function") {
      FroalaEditor.DefineIconTemplate("editorRuler", RULER_ICON_SVG);
    }
    if (typeof FroalaEditor.DefineIcon === "function") {
      FroalaEditor.DefineIcon("toggleRuler", { NAME: "ruler", template: "editorRuler" });
    }
    if (typeof FroalaEditor.RegisterCommand === "function") {
      FroalaEditor.RegisterCommand("rulerOptions", {
        title: t.ruler,
        icon: "toggleRuler",
        type: "dropdown",
        undo: false,
        focus: false,
        plugin: "ruler",
        options: {
          toggle: t.showHide,
          vruler: t.verticalRuler,
          lockGuides: t.lockGuides,
          clearGuides: t.clearGuides,
          ...UNIT_OPTIONS
        },
        callback(_cmd, value) {
          if (value === "toggle") this.ruler?.toggle();
          else if (value === "vruler") this.ruler?.toggleVRuler();
          else if (value === "lockGuides") this.ruler?.setGuidesLocked(!this.ruler?.isGuidesLocked());
          else if (value === "clearGuides") this.ruler?.clearGuides();
          else this.ruler?.setUnit(value);
        },
        refreshOnShow(_$btn, $dropdown) {
          const rootEl = $dropdown?.get?.(0) ?? $dropdown;
          if (!rootEl?.querySelectorAll) return;
          const unit = this.ruler?.getUnit?.();
          const activeByParam = {
            toggle: this.ruler?.isVisible?.() === true,
            vruler: this.ruler?.isVRulerVisible?.() === true,
            lockGuides: this.ruler?.isGuidesLocked?.() === true,
            clearGuides: false
          };
          for (const item of rootEl.querySelectorAll("a.fr-command")) {
            const param = item.getAttribute("data-param1");
            item.classList.toggle("fr-active", param ? activeByParam[param] ?? param === unit : false);
          }
        }
      });
      FroalaEditor.RegisterCommand("rulerUnit", {
        title: t.rulerUnit,
        icon: "toggleRuler",
        type: "dropdown",
        undo: false,
        focus: false,
        plugin: "ruler",
        options: UNIT_OPTIONS,
        callback(_cmd, unit) {
          this.ruler?.setUnit(unit);
        },
        refreshOnShow(_$btn, $dropdown) {
          const current = this.ruler?.getUnit?.();
          if (!current) return;
          const rootEl = $dropdown?.get?.(0) ?? $dropdown;
          if (!rootEl?.querySelectorAll) return;
          for (const item of rootEl.querySelectorAll("a.fr-command")) {
            item.classList.toggle("fr-active", item.getAttribute("data-param1") === current);
          }
        }
      });
      FroalaEditor.RegisterCommand("toggleRuler", {
        title: t.toggleRuler,
        icon: "toggleRuler",
        undo: false,
        focus: false,
        plugin: "ruler",
        callback() {
          this.ruler?.toggle();
        },
        refresh($btn) {
          $btn?.toggleClass?.("fr-active", this.ruler?.isVisible() === true);
        }
      });
    }
    FroalaEditor.PLUGINS.ruler = function rulerPlugin(editor) {
      let ruler = null;
      let mount = null;
      let visible = false;
      let guides = null;
      let vruler = null;
      let vmount = null;
      let vwrap = null;
      let vVisible = false;
      function editorEl() {
        return editor.el;
      }
      function normalizeBlock(b, el) {
        if (b === el || !el.contains(b)) return null;
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
      function selectedBlocks() {
        const blocks = editor.selection?.blocks?.() ?? [];
        const el = editorEl();
        const targets = [];
        for (const raw of blocks) {
          const target = normalizeBlock(raw, el);
          if (target && !targets.includes(target)) targets.push(target);
        }
        if (targets.length > 0) return targets;
        if (blocks.some((b) => el.contains(b) && b !== el)) return [];
        const fallback = el.querySelector(BLOCK_FALLBACK_SELECTOR);
        return fallback ? [fallback] : [];
      }
      function getMetrics() {
        const el = editorEl();
        const doc2 = el.ownerDocument;
        const win = doc2.defaultView;
        const elStyle = win.getComputedStyle(el);
        const paddingLeft = parseFloat(elStyle.paddingLeft) || 0;
        const paddingRight = parseFloat(elStyle.paddingRight) || 0;
        const contentWidth = Math.max(0, el.clientWidth - paddingLeft - paddingRight);
        const block = selectedBlocks()[0];
        if (!block) {
          return { contentWidth, leftMargin: 0, rightMargin: 0, firstLineIndent: 0 };
        }
        const style = win.getComputedStyle(block);
        return {
          contentWidth,
          leftMargin: parseFloat(style.marginLeft) || 0,
          rightMargin: parseFloat(style.marginRight) || 0,
          firstLineIndent: parseFloat(style.textIndent) || 0
        };
      }
      function currentTable() {
        const blocks = editor.selection?.blocks?.() ?? [];
        const el = editorEl();
        for (const b of blocks) {
          const t2 = b.tagName === "TABLE" ? b : b.closest?.("table");
          if (t2 && el.contains(t2)) return t2;
        }
        return null;
      }
      function contentLeft() {
        const el = editorEl();
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
        if (phase === "commit") {
          editor.undo?.saveStep?.();
        }
      }
      function applyChange(change, phase) {
        for (const block of selectedBlocks()) {
          if (change.leftMargin !== void 0) block.style.marginLeft = `${change.leftMargin}px`;
          if (change.rightMargin !== void 0) block.style.marginRight = `${change.rightMargin}px`;
          if (change.firstLineIndent !== void 0 && block.tagName !== "TABLE")
            block.style.textIndent = `${change.firstLineIndent}px`;
        }
        if (phase === "commit") {
          editor.undo?.saveStep?.();
        }
      }
      function contentPadding(side) {
        const el = editorEl();
        const win = el.ownerDocument.defaultView;
        return parseFloat(win.getComputedStyle(el)[side]) || 0;
      }
      function vGutter() {
        return editor.opts.rulerVerticalGutter === true;
      }
      function vRulerOffset() {
        return vVisible || vGutter() && vwrap ? 23 : 0;
      }
      function alignMount() {
        if (!mount) return;
        mount.style.paddingLeft = `${contentPadding("paddingLeft") + vRulerOffset()}px`;
      }
      function refresh() {
        alignMount();
        if (vmount) vmount.style.paddingTop = `${contentPadding("paddingTop")}px`;
        ruler?.refresh();
        vruler?.refresh();
        guides?.refresh();
      }
      function wrapperEl() {
        return editor.$wp?.get?.(0) ?? editorEl().parentElement ?? editorEl();
      }
      function ensureVWrap() {
        const el = editorEl();
        const doc2 = el.ownerDocument;
        if (!vwrap) {
          const wrapper = wrapperEl();
          vwrap = doc2.createElement("div");
          vwrap.className = "edr-vwrap";
          wrapper.parentElement?.insertBefore(vwrap, wrapper);
          vmount = doc2.createElement("div");
          vmount.className = "edr-froala-vmount";
          vwrap.appendChild(vmount);
          vwrap.appendChild(wrapper);
          vruler = createVRuler(vmount, {
            unit: ruler?.getUnit() ?? editor.opts.rulerUnit ?? "cm",
            ...guides ? { guides } : {},
            getMetrics: () => {
              const target = editorEl();
              const scroller = wrapperEl();
              const padTop = contentPadding("paddingTop");
              const contentH = target.clientHeight - padTop - contentPadding("paddingBottom");
              const viewportH = scroller.clientHeight > 0 ? scroller.clientHeight - padTop : Infinity;
              return { contentHeight: Math.max(0, Math.min(contentH, viewportH)) };
            }
          });
        }
      }
      function showVRuler() {
        ensureVWrap();
        vmount.style.display = "";
        vmount.style.visibility = "";
        vVisible = true;
        refresh();
      }
      function hideVRuler() {
        if (!vmount) return;
        if (vGutter()) {
          vmount.style.visibility = "hidden";
        } else {
          vmount.style.display = "none";
        }
        vVisible = false;
        refresh();
      }
      function toggleVRuler() {
        vVisible ? hideVRuler() : showVRuler();
      }
      function isVRulerVisible() {
        return vVisible;
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
      function toggle() {
        visible ? hide() : show();
      }
      function isVisible() {
        return visible;
      }
      function setUnit(unit) {
        ruler?.setUnit(unit);
        vruler?.setUnit(unit);
      }
      function getUnit() {
        return ruler?.getUnit() ?? (editor.opts.rulerUnit ?? "cm");
      }
      function setGuidesLocked(locked) {
        guides?.setLocked(locked);
      }
      function isGuidesLocked() {
        return guides?.isLocked() === true;
      }
      function clearGuides() {
        guides?.clear();
      }
      function getGuides() {
        return guides?.list() ?? { x: [], y: [] };
      }
      function destroy() {
        ruler?.destroy();
        ruler = null;
        guides?.destroy();
        guides = null;
        vruler?.destroy();
        vruler = null;
        if (vwrap) {
          const wrapper = vwrap.lastElementChild;
          if (wrapper && wrapper !== vmount) vwrap.parentElement?.insertBefore(wrapper, vwrap);
          vwrap.remove();
          vwrap = null;
          vmount = null;
        }
        mount?.remove();
        mount = null;
        visible = false;
        vVisible = false;
      }
      function _init() {
        if (!editor.opts.rulerEnabled) return;
        const el = editorEl();
        const doc2 = el.ownerDocument;
        const wrapper = editor.$wp?.get?.(0) ?? el.parentElement ?? el;
        const host = wrapper.parentElement ?? wrapper;
        mount = doc2.createElement("div");
        mount.className = "edr-froala-mount";
        host.insertBefore(mount, wrapper);
        if (editor.opts.rulerGuides !== false) {
          guides = createGuides(wrapper, {
            getOffsetLeft: () => contentPadding("paddingLeft"),
            getOffsetTop: () => contentPadding("paddingTop")
          });
        }
        ruler = createRuler(mount, {
          unit: editor.opts.rulerUnit ?? "cm",
          getMetrics,
          onChange: applyChange,
          labels: resolveRulerLabels(editor.opts.rulerLanguage || editor.opts.language, doc2),
          columns: { get: columnEdges, onChange: applyColumnChange },
          ...guides ? { guides } : {}
        });
        alignMount();
        visible = true;
        if (editor.opts.rulerVisible === false) hide();
        if (editor.opts.rulerVertical === true) {
          showVRuler();
        } else if (vGutter()) {
          ensureVWrap();
          vmount.style.visibility = "hidden";
          refresh();
        }
        for (const event of ["mouseup", "keyup", "contentChanged", "commands.after"]) {
          editor.events?.on?.(event, refresh);
        }
        editor.events?.on?.("destroy", destroy);
      }
      return {
        _init,
        refresh,
        show,
        hide,
        toggle,
        isVisible,
        setUnit,
        getUnit,
        toggleVRuler,
        isVRulerVisible,
        setGuidesLocked,
        isGuidesLocked,
        clearGuides,
        getGuides,
        destroy
      };
    };
  }
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=index.global.js.map