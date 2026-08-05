const STYLE_ATTR = 'data-edr-styles';

const CSS = `
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
  top: 0;
  bottom: 0;
  width: 7px;
  margin-left: -3px;
  cursor: ew-resize;
  pointer-events: auto;
}
.edr-guide::before {
  content: '';
  position: absolute;
  left: 3px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--edr-guide, #2563eb);
  opacity: 0.65;
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

/** Injects the ruler stylesheet into the document once. Safe to call repeatedly. */
export function ensureStyles(doc: Document): void {
  if (doc.head.querySelector(`style[${STYLE_ATTR}]`)) return;
  const style = doc.createElement('style');
  style.setAttribute(STYLE_ATTR, '');
  style.textContent = CSS;
  doc.head.appendChild(style);
}
