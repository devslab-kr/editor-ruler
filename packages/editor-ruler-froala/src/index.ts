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
 * Options merged into FroalaEditor.DEFAULTS. Configure per editor instance via
 * `new FroalaEditor(el, { rulerEnabled: true, rulerUnit: 'cm' })`.
 */
export interface FroalaRulerOptions {
  rulerEnabled?: boolean;
  rulerUnit?: RulerUnit;
  /** Show the vertical ruler strip on init. Default false. */
  rulerVertical?: boolean;
  /** Enable guide lines (drag down from the ruler strip). Default true. */
  rulerGuides?: boolean;
}

interface FroalaRulerApi {
  _init(): void;
  refresh(): void;
  show(): void;
  hide(): void;
  toggle(): void;
  isVisible(): boolean;
  setUnit(unit: RulerUnit): void;
  getUnit(): RulerUnit;
  toggleVRuler(): void;
  isVRulerVisible(): boolean;
  setGuidesLocked(locked: boolean): void;
  isGuidesLocked(): boolean;
  clearGuides(): void;
  getGuides(): GuideSet;
  destroy(): void;
}

/** UI strings for the toolbar commands. Registered once per FroalaEditor constructor. */
export interface RulerStrings {
  ruler: string;
  toggleRuler: string;
  rulerUnit: string;
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
    toggleRuler: 'Toggle Ruler',
    rulerUnit: 'Ruler Unit',
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
    toggleRuler: '줄자 표시/숨기기',
    rulerUnit: '눈금 단위',
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
  /** Language for toolbar strings ('ko', 'en', …). Default: `<html lang>` → browser language → 'en'. */
  language?: string;
  /** Override any built-in string. */
  strings?: Partial<RulerStrings>;
}

const BLOCK_FALLBACK_SELECTOR = 'p, div, h1, h2, h3, h4, h5, h6, li, blockquote, pre';

/**
 * CSS ignores margins on table *cells*, so a selection inside a table targets
 * the whole `<table>` instead — Word's behavior: the ruler indents the table
 * as a block. `text-indent` is skipped for tables (meaningless there).
 */
const TABLE_TAGS = new Set(['TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TD', 'TH']);

const RULER_ICON_SVG =
  '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 8a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H3zm1 2h1.5v3H4v-3zm3.5 0H9v2H7.5v-2zm3.5 0h1.5v3H11v-3zm3.5 0H16v2h-1.5v-2zm3.5 0h1.5v3H18v-3z"/></svg>';

/**
 * Registers the ruler plugin on the FroalaEditor constructor. Call once, before
 * creating editor instances:
 *
 * ```ts
 * import FroalaEditor from 'froala-editor';
 * import { defineRulerPlugin } from '@devslab/editor-ruler-froala';
 *
 * defineRulerPlugin(FroalaEditor);
 * new FroalaEditor('#editor', { rulerEnabled: true });
 * ```
 *
 * If you set `pluginsEnabled` explicitly, include `'ruler'` in the list.
 *
 * Also registers a `'toggleRuler'` toolbar command with a ruler icon — add it to
 * `toolbarButtons` to let users show/hide the ruler.
 */
export function defineRulerPlugin(FroalaEditor: any, defineOptions: DefineRulerPluginOptions = {}): void {
  if (FroalaEditor.PLUGINS?.ruler) return;

  const doc = typeof document !== 'undefined' ? document : undefined;
  const language = detectLanguage(defineOptions.language, doc);
  const t: RulerStrings = { ...(STRINGS[language] ?? STRINGS.en!), ...defineOptions.strings };
  const UNIT_OPTIONS: Record<RulerUnit, string> = { cm: t.cm, in: t.in, px: t.px };

  FroalaEditor.DEFAULTS = Object.assign(
    {
      rulerEnabled: true,
      rulerUnit: 'cm' satisfies RulerUnit,
      rulerVertical: false,
      rulerGuides: true,
      rulerLanguage: null,
    },
    FroalaEditor.DEFAULTS,
  );

  if (typeof FroalaEditor.DefineIconTemplate === 'function') {
    FroalaEditor.DefineIconTemplate('editorRuler', RULER_ICON_SVG);
  }
  if (typeof FroalaEditor.DefineIcon === 'function') {
    FroalaEditor.DefineIcon('toggleRuler', { NAME: 'ruler', template: 'editorRuler' });
  }
  if (typeof FroalaEditor.RegisterCommand === 'function') {
    // Recommended single button: one ruler icon, all ruler options inside.
    FroalaEditor.RegisterCommand('rulerOptions', {
      title: t.ruler,
      icon: 'toggleRuler',
      type: 'dropdown',
      undo: false,
      focus: false,
      plugin: 'ruler',
      options: {
        toggle: t.showHide,
        vruler: t.verticalRuler,
        lockGuides: t.lockGuides,
        clearGuides: t.clearGuides,
        ...UNIT_OPTIONS,
      },
      callback(this: any, _cmd: string, value: string) {
        if (value === 'toggle') this.ruler?.toggle();
        else if (value === 'vruler') this.ruler?.toggleVRuler();
        else if (value === 'lockGuides') this.ruler?.setGuidesLocked(!this.ruler?.isGuidesLocked());
        else if (value === 'clearGuides') this.ruler?.clearGuides();
        else this.ruler?.setUnit(value as RulerUnit);
      },
      refreshOnShow(this: any, _$btn: any, $dropdown: any) {
        const rootEl: any = $dropdown?.get?.(0) ?? $dropdown;
        if (!rootEl?.querySelectorAll) return;
        const unit = this.ruler?.getUnit?.();
        const activeByParam: Record<string, boolean> = {
          toggle: this.ruler?.isVisible?.() === true,
          vruler: this.ruler?.isVRulerVisible?.() === true,
          lockGuides: this.ruler?.isGuidesLocked?.() === true,
          clearGuides: false,
        };
        for (const item of rootEl.querySelectorAll('a.fr-command')) {
          const param = item.getAttribute('data-param1');
          item.classList.toggle('fr-active', param ? (activeByParam[param] ?? param === unit) : false);
        }
      },
    });
    // Granular commands for hosts that prefer separate buttons.
    FroalaEditor.RegisterCommand('rulerUnit', {
      title: t.rulerUnit,
      icon: 'toggleRuler',
      type: 'dropdown',
      undo: false,
      focus: false,
      plugin: 'ruler',
      options: UNIT_OPTIONS,
      callback(this: any, _cmd: string, unit: string) {
        this.ruler?.setUnit(unit as RulerUnit);
      },
      refreshOnShow(this: any, _$btn: any, $dropdown: any) {
        const current = this.ruler?.getUnit?.();
        if (!current) return;
        const rootEl: any = $dropdown?.get?.(0) ?? $dropdown;
        if (!rootEl?.querySelectorAll) return;
        for (const item of rootEl.querySelectorAll('a.fr-command')) {
          item.classList.toggle('fr-active', item.getAttribute('data-param1') === current);
        }
      },
    });
    FroalaEditor.RegisterCommand('toggleRuler', {
      title: t.toggleRuler,
      icon: 'toggleRuler',
      undo: false,
      focus: false,
      plugin: 'ruler',
      callback(this: any) {
        this.ruler?.toggle();
      },
      refresh(this: any, $btn: any) {
        $btn?.toggleClass?.('fr-active', this.ruler?.isVisible() === true);
      },
    });
  }

  FroalaEditor.PLUGINS.ruler = function rulerPlugin(editor: any): FroalaRulerApi {
    let ruler: Ruler | null = null;
    let mount: HTMLElement | null = null;
    let visible = false;
    let guides: Guides | null = null;
    let vruler: VRuler | null = null;
    let vmount: HTMLElement | null = null;
    let vwrap: HTMLElement | null = null;
    let vVisible = false;

    function editorEl(): HTMLElement {
      return editor.el as HTMLElement;
    }

    /**
     * Resolves a raw selection block to what the ruler should push:
     * - table structure (td/tr/…) → the whole <table> (Word-style table indent)
     * - a bare <img> → its closest block container
     * - anything else → itself
     */
    function normalizeBlock(b: HTMLElement, el: HTMLElement): HTMLElement | null {
      if (b === el || !el.contains(b)) return null;
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

    function selectedBlocks(): HTMLElement[] {
      const blocks: HTMLElement[] = editor.selection?.blocks?.() ?? [];
      const el = editorEl();
      const targets: HTMLElement[] = [];
      for (const raw of blocks) {
        const target = normalizeBlock(raw, el);
        if (target && !targets.includes(target)) targets.push(target);
      }
      if (targets.length > 0) return targets;
      if (blocks.some((b) => el.contains(b) && b !== el)) return [];
      const fallback = el.querySelector(BLOCK_FALLBACK_SELECTOR);
      return fallback ? [fallback as HTMLElement] : [];
    }

    function getMetrics(): RulerMetrics {
      const el = editorEl();
      const doc = el.ownerDocument;
      const win = doc.defaultView!;
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
        firstLineIndent: parseFloat(style.textIndent) || 0,
      };
    }

    function currentTable(): HTMLTableElement | null {
      const blocks: HTMLElement[] = editor.selection?.blocks?.() ?? [];
      const el = editorEl();
      for (const b of blocks) {
        const t = (b.tagName === 'TABLE' ? b : b.closest?.('table')) as HTMLTableElement | null;
        if (t && el.contains(t)) return t;
      }
      return null;
    }

    function contentLeft(): number {
      const el = editorEl();
      return el.getBoundingClientRect().left + contentPadding('paddingLeft');
    }

    /** Column boundaries of the selected table in ruler coords, or null. */
    function columnEdges(): number[] | null {
      const table = currentTable();
      if (!table) return null;
      // Merged cells make boundary math ambiguous — no markers there.
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
      if (phase === 'commit') {
        editor.undo?.saveStep?.();
      }
    }

    function applyChange(change: RulerChange, phase: RulerChangePhase): void {
      for (const block of selectedBlocks()) {
        if (change.leftMargin !== undefined) block.style.marginLeft = `${change.leftMargin}px`;
        if (change.rightMargin !== undefined) block.style.marginRight = `${change.rightMargin}px`;
        // text-indent is meaningless on a table block.
        if (change.firstLineIndent !== undefined && block.tagName !== 'TABLE')
          block.style.textIndent = `${change.firstLineIndent}px`;
      }
      if (phase === 'commit') {
        editor.undo?.saveStep?.();
      }
    }

    function contentPadding(side: 'paddingLeft' | 'paddingRight' | 'paddingTop' | 'paddingBottom'): number {
      const el = editorEl();
      const win = el.ownerDocument.defaultView!;
      return parseFloat(win.getComputedStyle(el)[side]) || 0;
    }

    /** Extra x-offset the vertical ruler strip adds in front of the editor. */
    function vRulerOffset(): number {
      return vVisible ? 23 : 0; // 22px strip + 1px border
    }

    function alignMount(): void {
      if (!mount) return;
      mount.style.paddingLeft = `${contentPadding('paddingLeft') + vRulerOffset()}px`;
    }

    function refresh(): void {
      alignMount();
      if (vmount) vmount.style.paddingTop = `${contentPadding('paddingTop')}px`;
      ruler?.refresh();
      vruler?.refresh();
      guides?.refresh();
    }

    function wrapperEl(): HTMLElement {
      return editor.$wp?.get?.(0) ?? editorEl().parentElement ?? editorEl();
    }

    function showVRuler(): void {
      const el = editorEl();
      const doc = el.ownerDocument;
      if (!vwrap) {
        const wrapper = wrapperEl();
        vwrap = doc.createElement('div');
        vwrap.className = 'edr-vwrap';
        wrapper.parentElement?.insertBefore(vwrap, wrapper);
        vmount = doc.createElement('div');
        vmount.className = 'edr-froala-vmount';
        vwrap.appendChild(vmount);
        vwrap.appendChild(wrapper);
        vruler = createVRuler(vmount, {
          unit: ruler?.getUnit() ?? editor.opts.rulerUnit ?? 'cm',
          ...(guides ? { guides } : {}),
          getMetrics: () => {
            const target = editorEl();
            return {
              contentHeight: Math.max(
                0,
                target.clientHeight - contentPadding('paddingTop') - contentPadding('paddingBottom'),
              ),
            };
          },
        });
      }
      vmount!.style.display = '';
      vVisible = true;
      refresh();
    }

    function hideVRuler(): void {
      if (!vmount) return;
      vmount.style.display = 'none';
      vVisible = false;
      refresh();
    }

    function toggleVRuler(): void {
      vVisible ? hideVRuler() : showVRuler();
    }

    function isVRulerVisible(): boolean {
      return vVisible;
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

    function toggle(): void {
      visible ? hide() : show();
    }

    function isVisible(): boolean {
      return visible;
    }

    function setUnit(unit: RulerUnit): void {
      ruler?.setUnit(unit);
      vruler?.setUnit(unit);
    }

    function getUnit(): RulerUnit {
      return ruler?.getUnit() ?? ((editor.opts.rulerUnit as RulerUnit) ?? 'cm');
    }

    function setGuidesLocked(locked: boolean): void {
      guides?.setLocked(locked);
    }

    function isGuidesLocked(): boolean {
      return guides?.isLocked() === true;
    }

    function clearGuides(): void {
      guides?.clear();
    }

    function getGuides(): GuideSet {
      return guides?.list() ?? { x: [], y: [] };
    }

    function destroy(): void {
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

    function _init(): void {
      if (!editor.opts.rulerEnabled) return;
      const el = editorEl();
      const doc = el.ownerDocument;
      const wrapper: HTMLElement = editor.$wp?.get?.(0) ?? el.parentElement ?? el;
      const host = wrapper.parentElement ?? wrapper;

      mount = doc.createElement('div');
      mount.className = 'edr-froala-mount';
      host.insertBefore(mount, wrapper);

      if (editor.opts.rulerGuides !== false) {
        guides = createGuides(wrapper, {
          getOffsetLeft: () => contentPadding('paddingLeft'),
          getOffsetTop: () => contentPadding('paddingTop'),
        });
      }

      ruler = createRuler(mount, {
        unit: editor.opts.rulerUnit ?? 'cm',
        getMetrics,
        onChange: applyChange,
        labels: resolveRulerLabels(editor.opts.rulerLanguage || editor.opts.language, doc),
        columns: { get: columnEdges, onChange: applyColumnChange },
        ...(guides ? { guides } : {}),
      });
      alignMount();
      visible = true;

      if (editor.opts.rulerVertical === true) showVRuler();

      for (const event of ['mouseup', 'keyup', 'contentChanged', 'commands.after']) {
        editor.events?.on?.(event, refresh);
      }
      editor.events?.on?.('destroy', destroy);
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
      destroy,
    };
  };
}

export type { RulerChange, RulerChangePhase, RulerMetrics, RulerUnit };
