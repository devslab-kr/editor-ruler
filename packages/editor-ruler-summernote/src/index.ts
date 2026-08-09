import {
  createGuides,
  createRuler,
  createVRuler,
  detectLanguage,
  resolveRulerLabels,
  type Guides,
  type GuideSet,
  type Ruler,
  type RulerChange,
  type RulerChangePhase,
  type RulerMetrics,
  type RulerUnit,
  type VRuler,
} from '@devslab/editor-ruler';

/**
 * Options for the ruler plugin, passed under the `ruler` key of Summernote's
 * options object:
 *
 * ```js
 * $('#editor').summernote({
 *   toolbar: [['misc', ['ruler']]],
 *   ruler: { unit: 'cm', vertical: true },
 * });
 * ```
 */
export interface SummernoteRulerOptions {
  /** Turn the plugin off entirely. Default true. */
  enabled?: boolean;
  /**
   * Whether the horizontal ruler starts visible. Default true. `false` mounts
   * it hidden — the toolbar dropdown or `show()` brings it up later.
   */
  visible?: boolean;
  unit?: RulerUnit;
  /** Show the vertical ruler strip on init. Default false. */
  vertical?: boolean;
  /**
   * Reserve the vertical ruler's 23px column from the start (like CSS
   * `scrollbar-gutter: stable`), so toggling it never reflows the content.
   * Default false.
   */
  verticalGutter?: boolean;
  /** Enable guide lines (drag out of a ruler). Default true. */
  guides?: boolean;
  /** Snap distance for drags near a guide; 0 disables. Default 5. */
  guideSnap?: number;
  /** UI language; null = `<html lang>` → browser language → en. */
  language?: string | null;
}

/** The plugin API, reachable via `context.modules.ruler`. */
export interface SummernoteRulerApi {
  refresh(): void;
  show(): void;
  hide(): void;
  toggle(): void;
  isVisible(): boolean;
  setUnit(unit: RulerUnit): void;
  getUnit(): RulerUnit;
  showVRuler(): void;
  hideVRuler(): void;
  toggleVRuler(): void;
  isVRulerVisible(): boolean;
  setGuidesLocked(locked: boolean): void;
  isGuidesLocked(): boolean;
  clearGuides(): void;
  getGuides(): GuideSet;
}

/** UI strings for the toolbar dropdown. */
export interface RulerStrings {
  ruler: string;
  showHide: string;
  verticalRuler: string;
  lockGuides: string;
  clearGuides: string;
  cm: string;
  in: string;
  px: string;
}

const STRINGS: Record<string, RulerStrings> = {
  en: {
    ruler: 'Ruler',
    showHide: 'Show / Hide',
    verticalRuler: 'Vertical Ruler',
    lockGuides: 'Lock Guides',
    clearGuides: 'Clear Guides',
    cm: 'cm',
    in: 'inch',
    px: 'px',
  },
  ko: {
    ruler: '줄자',
    showHide: '보이기 / 숨기기',
    verticalRuler: '세로 줄자',
    lockGuides: '가이드 잠금',
    clearGuides: '가이드 지우기',
    cm: 'cm',
    in: '인치',
    px: 'px',
  },
};

export interface DefineRulerPluginOptions {
  /** Language for toolbar strings. Default: `<html lang>` → browser → 'en'. */
  language?: string;
  /** Override any built-in string. */
  strings?: Partial<RulerStrings>;
}

const BLOCK_FALLBACK_SELECTOR = 'p, div, h1, h2, h3, h4, h5, h6, li, blockquote, pre';

/**
 * CSS ignores margins on table *cells*, so a selection inside a table targets
 * the whole `<table>` instead — Word's behavior. `text-indent` is never
 * written onto a table.
 */
const TABLE_TAGS = new Set(['TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TD', 'TH']);

const RULER_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M3 8a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H3zm1 2h1.5v3H4v-3zm3.5 0H9v2H7.5v-2zm3.5 0h1.5v3H11v-3zm3.5 0H16v2h-1.5v-2zm3.5 0h1.5v3H18v-3z"/></svg>';

/**
 * Registers the `ruler` plugin on Summernote. Call once, before initializing
 * any editor:
 *
 * ```ts
 * import $ from 'jquery';
 * import 'summernote';
 * import { defineRulerPlugin } from '@devslab/editor-ruler-summernote';
 *
 * defineRulerPlugin($);
 * $('#editor').summernote({ toolbar: [['misc', ['ruler']]] });
 * ```
 *
 * Also registers a `ruler` toolbar item — a ruler-icon dropdown holding
 * Show/Hide, Vertical Ruler, Lock/Clear Guides, and the cm/inch/px switch.
 */
export function defineRulerPlugin(jQuery: any, defineOptions: DefineRulerPluginOptions = {}): void {
  const $ = jQuery;
  const summernote = $?.summernote;
  if (!summernote || summernote.plugins?.ruler) return;

  const doc = typeof document !== 'undefined' ? document : undefined;
  const language = detectLanguage(defineOptions.language, doc);
  const t: RulerStrings = { ...(STRINGS[language] ?? STRINGS.en!), ...defineOptions.strings };

  // Summernote merges this into every editor's options object.
  summernote.options = $.extend(true, {}, summernote.options, {
    ruler: {
      enabled: true,
      visible: true,
      unit: 'cm' as RulerUnit,
      vertical: false,
      verticalGutter: false,
      guides: true,
      guideSnap: 5,
      language: null,
    } satisfies SummernoteRulerOptions,
  });

  summernote.plugins.ruler = function rulerPlugin(this: any, context: any) {
    const self = this;
    const opts = (): SummernoteRulerOptions => context.options?.ruler ?? {};

    let mount: HTMLElement | null = null;
    let vwrap: HTMLElement | null = null;
    let vmount: HTMLElement | null = null;
    let ruler: Ruler | null = null;
    let vruler: VRuler | null = null;
    let guides: Guides | null = null;
    let visible = false;
    let vVisible = false;

    function editableEl(): HTMLElement {
      const el = context.layoutInfo?.editable;
      return (el?.[0] ?? el) as HTMLElement;
    }

    function contentPadding(
      side: 'paddingLeft' | 'paddingRight' | 'paddingTop' | 'paddingBottom',
    ): number {
      const el = editableEl();
      const win = el.ownerDocument.defaultView!;
      return parseFloat(win.getComputedStyle(el)[side]) || 0;
    }

    /** 23px = 22px strip + 1px border. Reserved whenever the column exists. */
    function vRulerOffset(): number {
      return vVisible || (opts().verticalGutter === true && vwrap) ? 23 : 0;
    }

    function alignMount(): void {
      if (mount) mount.style.paddingLeft = `${contentPadding('paddingLeft') + vRulerOffset()}px`;
    }

    /**
     * Resolves a raw block to what the ruler should push:
     * table structure → the whole `<table>`; a bare `<img>` → its block.
     */
    function normalizeBlock(b: HTMLElement, el: HTMLElement): HTMLElement | null {
      if (!b || b === el || !el.contains(b)) return null;
      if (b.tagName === 'IMG') {
        const host = b.closest(BLOCK_FALLBACK_SELECTOR) as HTMLElement | null;
        return host && host !== el && el.contains(host) ? host : null;
      }
      if (TABLE_TAGS.has(b.tagName)) {
        const table = (b.tagName === 'TABLE' ? b : b.closest('table')) as HTMLElement | null;
        return table && el.contains(table) ? table : null;
      }
      return b;
    }

    /** Blocks under the caret, via Summernote's range when available. */
    function rawBlocks(): HTMLElement[] {
      const el = editableEl();
      const dom = summernote.dom;
      const rng = context.invoke('editor.getLastRange');
      if (rng && typeof rng.nodes === 'function' && dom?.isPara) {
        const nodes = rng.nodes(dom.isPara, { includeAncestor: true }) as HTMLElement[];
        if (nodes?.length) return nodes;
      }
      // Fallback: the editable is a plain contenteditable, so the native
      // selection is enough when Summernote has no range yet.
      const win = el.ownerDocument.defaultView!;
      const sel = win.getSelection?.();
      const node = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).startContainer : null;
      const start = (node && (node.nodeType === 1 ? node : node.parentElement)) as HTMLElement | null;
      const block = start?.closest(BLOCK_FALLBACK_SELECTOR) as HTMLElement | null;
      return block ? [block] : [];
    }

    function selectedBlocks(): HTMLElement[] {
      const el = editableEl();
      const targets: HTMLElement[] = [];
      for (const raw of rawBlocks()) {
        const target = normalizeBlock(raw, el);
        if (target && !targets.includes(target)) targets.push(target);
      }
      if (targets.length > 0) return targets;
      const fallback = el.querySelector(BLOCK_FALLBACK_SELECTOR);
      return fallback ? [fallback as HTMLElement] : [];
    }

    function getMetrics(): RulerMetrics {
      const el = editableEl();
      const win = el.ownerDocument.defaultView!;
      const contentWidth = Math.max(
        0,
        el.clientWidth - contentPadding('paddingLeft') - contentPadding('paddingRight'),
      );
      const block = selectedBlocks()[0];
      if (!block) return { contentWidth, leftMargin: 0, rightMargin: 0, firstLineIndent: 0 };
      const style = win.getComputedStyle(block);
      return {
        contentWidth,
        leftMargin: parseFloat(style.marginLeft) || 0,
        rightMargin: parseFloat(style.marginRight) || 0,
        firstLineIndent: parseFloat(style.textIndent) || 0,
      };
    }

    function currentTable(): HTMLTableElement | null {
      const el = editableEl();
      for (const b of rawBlocks()) {
        const table = (b.tagName === 'TABLE' ? b : b.closest?.('table')) as HTMLTableElement | null;
        if (table && el.contains(table)) return table;
      }
      return null;
    }

    function contentLeft(): number {
      const el = editableEl();
      return el.getBoundingClientRect().left + contentPadding('paddingLeft');
    }

    /** Column boundaries of the selected table in ruler coords, or null. */
    function columnEdges(): number[] | null {
      const table = currentTable();
      if (!table) return null;
      // Merged cells make the boundary math ambiguous — no markers there.
      if (table.querySelector('td[colspan], th[colspan], td[rowspan], th[rowspan]')) return null;
      const row = table.querySelector('tr');
      if (!row) return null;
      const cells = Array.from(row.children).filter(
        (c) => c.tagName === 'TD' || c.tagName === 'TH',
      ) as HTMLElement[];
      if (cells.length === 0) return null;
      const origin = contentLeft();
      const edges = [table.getBoundingClientRect().left - origin];
      for (const cell of cells) edges.push(cell.getBoundingClientRect().right - origin);
      return edges;
    }

    /** Records exactly one undo step; Summernote snapshots in afterCommand. */
    function commit(): void {
      context.invoke('editor.afterCommand');
    }

    function applyColumnChange(index: number, x: number, phase: RulerChangePhase): void {
      const table = currentTable();
      const edges = columnEdges();
      if (!table || !edges) return;
      const leftEdge = edges[index - 1];
      const rightEdge = edges[index + 1];
      if (leftEdge === undefined || rightEdge === undefined) return;
      const tableWidth = table.getBoundingClientRect().width;
      if (!(tableWidth > 0)) return;
      const pct = (w: number) => `${((w / tableWidth) * 100).toFixed(4)}%`;
      for (const row of Array.from(table.querySelectorAll('tr'))) {
        const cells = Array.from(row.children).filter(
          (c) => c.tagName === 'TD' || c.tagName === 'TH',
        ) as HTMLElement[];
        const leftCell = cells[index - 1];
        const rightCell = cells[index];
        if (leftCell) leftCell.style.width = pct(x - leftEdge);
        if (rightCell) rightCell.style.width = pct(rightEdge - x);
      }
      if (phase === 'commit') commit();
    }

    function applyChange(change: RulerChange, phase: RulerChangePhase): void {
      for (const block of selectedBlocks()) {
        if (change.leftMargin !== undefined) block.style.marginLeft = `${change.leftMargin}px`;
        if (change.rightMargin !== undefined) block.style.marginRight = `${change.rightMargin}px`;
        // text-indent is meaningless on a table block.
        if (change.firstLineIndent !== undefined && block.tagName !== 'TABLE')
          block.style.textIndent = `${change.firstLineIndent}px`;
      }
      if (phase === 'commit') commit();
    }

    function refresh(): void {
      alignMount();
      if (vmount) vmount.style.paddingTop = `${contentPadding('paddingTop')}px`;
      ruler?.refresh();
      vruler?.refresh();
      guides?.refresh();
    }

    function ensureVWrap(): void {
      if (vwrap) return;
      const el = editableEl();
      const d = el.ownerDocument;
      const parent = el.parentElement;
      if (!parent) return;
      vwrap = d.createElement('div');
      vwrap.className = 'edr-vwrap';
      parent.insertBefore(vwrap, el);
      vmount = d.createElement('div');
      vmount.className = 'edr-sn-vmount';
      vwrap.appendChild(vmount);
      vwrap.appendChild(el);
      vmount.style.paddingTop = `${contentPadding('paddingTop')}px`;
      vruler = createVRuler(vmount, {
        unit: ruler?.getUnit() ?? opts().unit ?? 'cm',
        ...(guides ? { guides } : {}),
        getMetrics: () => ({
          contentHeight: Math.max(
            0,
            el.clientHeight - contentPadding('paddingTop') - contentPadding('paddingBottom'),
          ),
        }),
      });
    }

    function showVRuler(): void {
      ensureVWrap();
      if (!vmount) return;
      vmount.style.display = '';
      vmount.style.visibility = '';
      vVisible = true;
      refresh();
    }

    function hideVRuler(): void {
      if (!vmount) return;
      if (opts().verticalGutter === true) {
        // Keep the reserved column — hide without reclaiming the width.
        vmount.style.visibility = 'hidden';
      } else {
        vmount.style.display = 'none';
      }
      vVisible = false;
      refresh();
    }

    function show(): void {
      if (!mount) return;
      mount.style.display = '';
      visible = true;
      refresh();
    }

    function hide(): void {
      if (!mount) return;
      mount.style.display = 'none';
      visible = false;
    }

    const api: SummernoteRulerApi = {
      refresh,
      show,
      hide,
      toggle: () => (visible ? hide() : show()),
      isVisible: () => visible,
      setUnit: (unit) => {
        ruler?.setUnit(unit);
        vruler?.setUnit(unit);
      },
      getUnit: () => ruler?.getUnit() ?? opts().unit ?? 'cm',
      showVRuler,
      hideVRuler,
      toggleVRuler: () => (vVisible ? hideVRuler() : showVRuler()),
      isVRulerVisible: () => vVisible,
      setGuidesLocked: (locked) => guides?.setLocked(locked),
      isGuidesLocked: () => guides?.isLocked() === true,
      clearGuides: () => guides?.clear(),
      getGuides: () => guides?.list() ?? { x: [], y: [] },
    };
    Object.assign(self, api);

    // ---- toolbar dropdown ----
    const ui = summernote.ui;
    if (ui && typeof context.memo === 'function') {
      context.memo('button.ruler', () => {
        const items: Array<[string, string, () => void]> = [
          ['toggle', t.showHide, () => api.toggle()],
          ['vruler', t.verticalRuler, () => api.toggleVRuler()],
          ['lockGuides', t.lockGuides, () => api.setGuidesLocked(!api.isGuidesLocked())],
          ['clearGuides', t.clearGuides, () => api.clearGuides()],
          ['cm', t.cm, () => api.setUnit('cm')],
          ['in', t.in, () => api.setUnit('in')],
          ['px', t.px, () => api.setUnit('px')],
        ];
        const button = ui.buttonGroup([
          ui.button({
            contents: RULER_ICON_SVG,
            tooltip: t.ruler,
            data: { toggle: 'dropdown' },
          }),
          ui.dropdown({
            className: 'dropdown-ruler',
            items: items.map(([id]) => id),
            template: (id: string) => items.find((i) => i[0] === id)?.[1] ?? id,
            click: (event: any) => {
              event.preventDefault?.();
              const id = $(event.target).closest('[data-value]').data('value');
              items.find((i) => i[0] === id)?.[2]();
            },
          }),
        ]);
        return button.render();
      });
    }

    this.shouldInitialize = () => opts().enabled !== false;

    this.initialize = function initialize(): void {
      const el = editableEl();
      const d = el.ownerDocument;
      const parent = el.parentElement;
      if (!parent) return;
      const o = opts();

      mount = d.createElement('div');
      mount.className = 'edr-sn-mount';
      parent.insertBefore(mount, el);

      if (o.guides !== false) {
        guides = createGuides(parent, {
          getOffsetLeft: () => contentPadding('paddingLeft'),
          getOffsetTop: () => contentPadding('paddingTop'),
        });
      }

      ruler = createRuler(mount, {
        unit: o.unit ?? 'cm',
        guideSnap: o.guideSnap ?? 5,
        getMetrics,
        onChange: applyChange,
        labels: resolveRulerLabels(o.language ?? context.options?.lang ?? undefined, d),
        columns: { get: columnEdges, onChange: applyColumnChange },
        ...(guides ? { guides } : {}),
      });
      alignMount();
      visible = true;
      if (o.visible === false) hide();

      if (o.vertical === true) {
        showVRuler();
      } else if (o.verticalGutter === true) {
        // Reserve the column up front so a later toggle doesn't reflow the
        // content — and re-align, or the horizontal ruler keeps the old offset.
        ensureVWrap();
        if (vmount) vmount.style.visibility = 'hidden';
        refresh();
      }
    };

    this.destroy = function destroy(): void {
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

    // Summernote fires these on the context; keep the ruler in sync.
    this.events = {
      'summernote.mouseup': refresh,
      'summernote.keyup': refresh,
      'summernote.change': refresh,
    };
  };
}

export type { RulerChange, RulerChangePhase, RulerMetrics, RulerUnit };
