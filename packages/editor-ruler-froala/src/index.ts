import {
  createRuler,
  type Ruler,
  type RulerChange,
  type RulerChangePhase,
  type RulerMetrics,
  type RulerUnit,
} from '@devslab/editor-ruler';

/**
 * Options merged into FroalaEditor.DEFAULTS. Configure per editor instance via
 * `new FroalaEditor(el, { rulerEnabled: true, rulerUnit: 'cm' })`.
 */
export interface FroalaRulerOptions {
  rulerEnabled?: boolean;
  rulerUnit?: RulerUnit;
}

interface FroalaRulerApi {
  _init(): void;
  refresh(): void;
  show(): void;
  hide(): void;
  toggle(): void;
  isVisible(): boolean;
  destroy(): void;
}

const BLOCK_FALLBACK_SELECTOR = 'p, div, h1, h2, h3, h4, h5, h6, li, blockquote, pre';

/**
 * Margins/text-indent are meaningless on table structure elements (CSS ignores
 * margins on table cells), so the ruler never writes styles onto them.
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
export function defineRulerPlugin(FroalaEditor: any): void {
  if (FroalaEditor.PLUGINS?.ruler) return;

  FroalaEditor.DEFAULTS = Object.assign(
    { rulerEnabled: true, rulerUnit: 'cm' satisfies RulerUnit },
    FroalaEditor.DEFAULTS,
  );

  if (typeof FroalaEditor.DefineIconTemplate === 'function') {
    FroalaEditor.DefineIconTemplate('editorRuler', RULER_ICON_SVG);
  }
  if (typeof FroalaEditor.DefineIcon === 'function') {
    FroalaEditor.DefineIcon('toggleRuler', { NAME: 'ruler', template: 'editorRuler' });
  }
  if (typeof FroalaEditor.RegisterCommand === 'function') {
    FroalaEditor.RegisterCommand('toggleRuler', {
      title: 'Toggle Ruler',
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

    function editorEl(): HTMLElement {
      return editor.el as HTMLElement;
    }

    function selectedBlocks(): HTMLElement[] {
      const blocks: HTMLElement[] = editor.selection?.blocks?.() ?? [];
      const el = editorEl();
      const inEditor = blocks.filter((b) => b !== el && el.contains(b));
      const usable = inEditor.filter((b) => !TABLE_TAGS.has(b.tagName));
      if (usable.length > 0) return usable;
      // Selection sits on table structure itself (e.g. a bare td): stay inert
      // rather than falling back to an unrelated block elsewhere in the editor.
      if (inEditor.length > 0) return [];
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

    function applyChange(change: RulerChange, phase: RulerChangePhase): void {
      for (const block of selectedBlocks()) {
        if (change.leftMargin !== undefined) block.style.marginLeft = `${change.leftMargin}px`;
        if (change.rightMargin !== undefined) block.style.marginRight = `${change.rightMargin}px`;
        if (change.firstLineIndent !== undefined)
          block.style.textIndent = `${change.firstLineIndent}px`;
      }
      if (phase === 'commit') {
        editor.undo?.saveStep?.();
      }
    }

    function alignMount(): void {
      if (!mount) return;
      const el = editorEl();
      const win = el.ownerDocument.defaultView!;
      const paddingLeft = parseFloat(win.getComputedStyle(el).paddingLeft) || 0;
      mount.style.paddingLeft = `${paddingLeft}px`;
    }

    function refresh(): void {
      alignMount();
      ruler?.refresh();
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

    function destroy(): void {
      ruler?.destroy();
      ruler = null;
      mount?.remove();
      mount = null;
      visible = false;
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

      ruler = createRuler(mount, {
        unit: editor.opts.rulerUnit ?? 'cm',
        getMetrics,
        onChange: applyChange,
      });
      alignMount();
      visible = true;

      for (const event of ['mouseup', 'keyup', 'contentChanged', 'commands.after']) {
        editor.events?.on?.(event, refresh);
      }
      editor.events?.on?.('destroy', destroy);
    }

    return { _init, refresh, show, hide, toggle, isVisible, destroy };
  };
}

export type { RulerChange, RulerChangePhase, RulerMetrics, RulerUnit };
