import { Extension } from '@tiptap/core';
import {
  createGuides,
  createRuler,
  resolveRulerLabels,
  type Guides,
  type Ruler,
  type RulerChange,
  type RulerChangePhase,
  type RulerMetrics,
  type RulerUnit,
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

interface RulerStorage {
  ruler: Ruler | null;
  guides: Guides | null;
  /** The ruler's mount element (for show/hide). */
  host: HTMLElement | null;
  /** Current visibility — read via `editor.storage.editorRuler.visible`. */
  visible: boolean;
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
      unit: 'cm',
      guides: true,
      guideSnap: 5,
      language: null,
      element: null,
    };
  },

  addStorage() {
    return { ruler: null, guides: null, host: null, visible: true, cleanup: null };
  },

  addCommands() {
    const setVisible = (storage: RulerStorage, visible: boolean): boolean => {
      if (!storage.host) return false;
      storage.host.style.display = visible ? '' : 'none';
      storage.visible = visible;
      if (visible) storage.ruler?.refresh();
      return true;
    };
    return {
      showRuler: () => () => setVisible(this.storage, true),
      hideRuler: () => () => setVisible(this.storage, false),
      toggleRuler: () => () => setVisible(this.storage, !this.storage.visible),
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
    const storage = this.storage;
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

    const padding = (side: 'paddingLeft' | 'paddingRight' | 'paddingTop'): number =>
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

    const onResize = () => {
      align();
      ruler.refresh();
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
      if (ownsHost) host.remove();
    };
  },

  onSelectionUpdate() {
    this.storage.ruler?.refresh();
  },

  onUpdate() {
    this.storage.ruler?.refresh();
  },

  onDestroy() {
    this.storage.cleanup?.();
  },
});

export default EditorRuler;
