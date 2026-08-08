import { Extension } from '@tiptap/core';
import {
  createGuides,
  createRuler,
  createVRuler,
  resolveRulerLabels,
  type Guides,
  type Ruler,
  type RulerChange,
  type RulerChangePhase,
  type RulerMetrics,
  type RulerUnit,
  type VRuler,
} from '@devslab/editor-ruler';

/** Per-node indentation, px. Stored as a single `rulerIndent` attribute. */
export interface RulerIndent {
  marginLeft?: number;
  marginRight?: number;
  textIndent?: number;
}

export interface EditorRulerOptions {
  /** Node types that carry indentation. */
  types: string[];
  /**
   * Whether the ruler starts visible with the editor. Default true.
   * `visible: false` mounts it hidden — bring it up later with the
   * `showRuler` / `toggleRuler` commands.
   */
  visible: boolean;
  /** Show the vertical ruler strip on create. Default false. */
  vertical: boolean;
  /**
   * Reserve the vertical ruler's 23px column from the start (like CSS
   * `scrollbar-gutter: stable`), so toggling the vertical ruler never
   * reflows the content. Default false.
   */
  verticalGutter: boolean;
  unit: RulerUnit;
  /** Enable guide lines (drag down from the ruler). */
  guides: boolean;
  /** Snap distance for drags near a guide; 0 disables. */
  guideSnap: number;
  /** UI language; null = `<html lang>` → browser language → en. */
  language: string | null;
  /** Mount element for the ruler; null inserts one before the editor DOM. */
  element: HTMLElement | null;
}

function styleOf(indent: RulerIndent | null | undefined): string | null {
  if (!indent) return null;
  const parts: string[] = [];
  if (indent.marginLeft != null) parts.push(`margin-left: ${indent.marginLeft}px`);
  if (indent.marginRight != null) parts.push(`margin-right: ${indent.marginRight}px`);
  if (indent.textIndent != null) parts.push(`text-indent: ${indent.textIndent}px`);
  return parts.length > 0 ? parts.join('; ') : null;
}

function parseIndent(element: HTMLElement): RulerIndent | null {
  const read = (value: string): number | undefined => {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : undefined;
  };
  const indent: RulerIndent = {};
  const ml = read(element.style.marginLeft);
  if (ml !== undefined) indent.marginLeft = ml;
  const mr = read(element.style.marginRight);
  if (mr !== undefined) indent.marginRight = mr;
  const ti = read(element.style.textIndent);
  if (ti !== undefined) indent.textIndent = ti;
  return Object.keys(indent).length > 0 ? indent : null;
}

/**
 * Shape of `editor.storage.editorRuler`. Everything here is read-only from
 * the outside — drive visibility with the commands, not by assignment.
 */
export interface RulerStorage {
  /** The horizontal ruler handle (`refresh`/`setUnit`/…), once mounted. */
  ruler: Ruler | null;
  /** The guide-line controller, or null when `guides: false`. */
  guides: Guides | null;
  /** The vertical strip, or null until the vertical ruler is first shown. */
  vruler: VRuler | null;
  /** The ruler's mount element. */
  host: HTMLElement | null;
  /** Whether the horizontal ruler is currently visible. */
  visible: boolean;
  /** Whether the vertical ruler is currently visible. */
  verticalVisible: boolean;
}

/**
 * Implementation-only fields. Kept off {@link RulerStorage} so the public
 * type stays a stable contract — these can change without a major bump.
 */
interface InternalRulerStorage extends RulerStorage {
  setVerticalVisible: ((visible: boolean) => void) | null;
  cleanup: (() => void) | null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    editorRuler: {
      /** Show the ruler. */
      showRuler: () => ReturnType;
      /** Hide the ruler (extension stays active). */
      hideRuler: () => ReturnType;
      /** Toggle ruler visibility. */
      toggleRuler: () => ReturnType;
      /** Show the vertical ruler strip. */
      showVerticalRuler: () => ReturnType;
      /** Hide the vertical ruler strip. */
      hideVerticalRuler: () => ReturnType;
      /** Toggle the vertical ruler strip. */
      toggleVerticalRuler: () => ReturnType;
    };
  }
  interface Storage {
    editorRuler: RulerStorage;
  }
}

/**
 * Tiptap extension mounting a Word-like horizontal ruler above the editor.
 *
 * ```ts
 * import { Editor } from '@tiptap/core';
 * import StarterKit from '@tiptap/starter-kit';
 * import { EditorRuler } from '@devslab/editor-ruler-tiptap';
 *
 * new Editor({ element, extensions: [StarterKit, EditorRuler], content });
 * ```
 *
 * Indentation is stored as a `rulerIndent` node attribute on the configured
 * `types` and rendered as inline CSS, so `editor.getHTML()` output is plain
 * portable HTML. Drags dispatch history-free transactions and record a single
 * undo step on release.
 */
export const EditorRuler = Extension.create<EditorRulerOptions, RulerStorage>({
  name: 'editorRuler',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      visible: true,
      vertical: false,
      verticalGutter: false,
      unit: 'cm',
      guides: true,
      guideSnap: 5,
      language: null,
      element: null,
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
      cleanup: null,
    };
  },

  addCommands() {
    const setVisible = (storage: RulerStorage, visible: boolean): boolean => {
      if (!storage.host) return false;
      storage.host.style.display = visible ? '' : 'none';
      storage.visible = visible;
      if (visible) storage.ruler?.refresh();
      return true;
    };
    const setVertical = (storage: InternalRulerStorage, visible: boolean): boolean => {
      if (!storage.setVerticalVisible) return false;
      storage.setVerticalVisible(visible);
      return true;
    };
    const internal = (): InternalRulerStorage => this.storage as InternalRulerStorage;
    return {
      showRuler: () => () => setVisible(this.storage, true),
      hideRuler: () => () => setVisible(this.storage, false),
      toggleRuler: () => () => setVisible(this.storage, !this.storage.visible),
      showVerticalRuler: () => () => setVertical(internal(), true),
      hideVerticalRuler: () => () => setVertical(internal(), false),
      toggleVerticalRuler: () => () => setVertical(internal(), !this.storage.verticalVisible),
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          rulerIndent: {
            default: null,
            parseHTML: (element: HTMLElement) => parseIndent(element),
            renderHTML: (attributes: Record<string, unknown>) => {
              const style = styleOf(attributes.rulerIndent as RulerIndent | null);
              return style ? { style } : {};
            },
          },
        },
      },
    ];
  },

  onCreate() {
    const editor = this.editor;
    const options = this.options;
    const storage = this.storage as InternalRulerStorage;
    const view = editor.view;
    const dom = view.dom as HTMLElement;
    const doc = dom.ownerDocument;
    const win = doc.defaultView!;

    let ownsHost = false;
    const host =
      options.element ??
      (() => {
        const m = doc.createElement('div');
        m.className = 'edr-tiptap-mount';
        dom.parentElement?.insertBefore(m, dom);
        ownsHost = true;
        return m;
      })();

    const padding = (side: 'paddingLeft' | 'paddingRight' | 'paddingTop' | 'paddingBottom'): number =>
      parseFloat(win.getComputedStyle(dom)[side]) || 0;

    const types = options.types;

    function currentBlocks(): Array<{ node: any; pos: number }> {
      const { state } = editor;
      const targets: Array<{ node: any; pos: number }> = [];
      state.doc.nodesBetween(state.selection.from, state.selection.to, (node: any, pos: number) => {
        if (types.includes(node.type.name)) {
          targets.push({ node, pos });
          return false; // don't descend into a matched block
        }
        return true;
      });
      return targets;
    }

    function getMetrics(): RulerMetrics {
      const contentWidth = Math.max(
        0,
        dom.clientWidth - padding('paddingLeft') - padding('paddingRight'),
      );
      const indent: RulerIndent = currentBlocks()[0]?.node.attrs.rulerIndent ?? {};
      return {
        contentWidth,
        leftMargin: indent.marginLeft ?? 0,
        rightMargin: indent.marginRight ?? 0,
        firstLineIndent: indent.textIndent ?? 0,
      };
    }

    // Drag transactions skip history; the commit replays baseline→final so a
    // whole gesture is exactly one undo step.
    let gestureBaseline: Map<number, RulerIndent | null> | null = null;

    function applyIndent(change: RulerChange, addToHistory: boolean, baseline?: Map<number, RulerIndent | null>): void {
      const { state } = editor;
      const tr = state.tr;
      for (const { node, pos } of currentBlocks()) {
        const prev: RulerIndent = (baseline?.get(pos) ?? node.attrs.rulerIndent) ?? {};
        const next: RulerIndent = { ...prev };
        if (change.leftMargin !== undefined) next.marginLeft = change.leftMargin;
        if (change.rightMargin !== undefined) next.marginRight = change.rightMargin;
        if (change.firstLineIndent !== undefined) next.textIndent = change.firstLineIndent;
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, rulerIndent: next });
      }
      if (!tr.docChanged) return;
      if (!addToHistory) tr.setMeta('addToHistory', false);
      view.dispatch(tr);
    }

    function applyChange(change: RulerChange, phase: RulerChangePhase): void {
      if (phase === 'drag') {
        if (!gestureBaseline) {
          gestureBaseline = new Map(
            currentBlocks().map(({ node, pos }) => [pos, node.attrs.rulerIndent ?? null]),
          );
        }
        applyIndent(change, false);
        return;
      }
      // commit
      if (gestureBaseline) {
        // silently restore the baseline, then apply the final value on history
        const restore = editor.state.tr;
        for (const { node, pos } of currentBlocks()) {
          if (gestureBaseline.has(pos)) {
            restore.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              rulerIndent: gestureBaseline.get(pos),
            });
          }
        }
        if (restore.docChanged) {
          restore.setMeta('addToHistory', false);
          view.dispatch(restore);
        }
        gestureBaseline = null;
      }
      applyIndent(change, true);
    }

    let guides: Guides | null = null;
    if (options.guides) {
      const container = dom.parentElement ?? host;
      guides = createGuides(container, {
        getOffsetLeft: () => dom.offsetLeft + padding('paddingLeft'),
        getOffsetTop: () => dom.offsetTop + padding('paddingTop'),
      });
    }

    const align = () => {
      host.style.paddingLeft = `${dom.offsetLeft + padding('paddingLeft')}px`;
    };

    const ruler = createRuler(host, {
      unit: options.unit,
      guideSnap: options.guideSnap,
      getMetrics,
      onChange: applyChange,
      labels: resolveRulerLabels(options.language ?? undefined, doc),
      ...(guides ? { guides } : {}),
    });
    align();

    // ---- vertical ruler (lazy: the wrap only exists once needed) ----
    let vwrap: HTMLElement | null = null;
    let vmount: HTMLElement | null = null;
    const vGutter = options.verticalGutter === true;

    const ensureVWrap = () => {
      if (vwrap) return;
      const parent = dom.parentElement;
      if (!parent) return;
      vwrap = doc.createElement('div');
      vwrap.className = 'edr-vwrap';
      parent.insertBefore(vwrap, dom);
      vmount = doc.createElement('div');
      vmount.className = 'edr-tiptap-vmount';
      vwrap.appendChild(vmount);
      vwrap.appendChild(dom);
      vmount.style.paddingTop = `${padding('paddingTop')}px`;
      storage.vruler = createVRuler(vmount, {
        unit: ruler.getUnit(),
        ...(guides ? { guides } : {}),
        getMetrics: () => ({
          // When the editable scrolls itself, clientHeight is the visible
          // viewport, which is exactly what the strip should span.
          contentHeight: Math.max(
            0,
            dom.clientHeight - padding('paddingTop') - padding('paddingBottom'),
          ),
        }),
      });
    };

    const setVerticalVisible = (visible: boolean) => {
      ensureVWrap();
      if (!vmount) return;
      if (visible) {
        vmount.style.display = '';
        vmount.style.visibility = '';
        storage.vruler?.refresh();
      } else if (vGutter) {
        // Keep the reserved column — hide the strip without reclaiming width.
        vmount.style.visibility = 'hidden';
      } else {
        vmount.style.display = 'none';
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
      // Reserve the gutter up front so a later toggle doesn't reflow content.
      ensureVWrap();
      if (vmount) (vmount as HTMLElement).style.visibility = 'hidden';
    }

    const onResize = () => {
      align();
      ruler.refresh();
      storage.vruler?.refresh();
      guides?.refresh();
    };
    win.addEventListener('resize', onResize);

    storage.ruler = ruler;
    storage.guides = guides;
    storage.host = host;
    storage.visible = options.visible !== false;
    if (!storage.visible) host.style.display = 'none';
    storage.cleanup = () => {
      win.removeEventListener('resize', onResize);
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
    (this.storage as InternalRulerStorage).cleanup?.();
  },
});

export default EditorRuler;
