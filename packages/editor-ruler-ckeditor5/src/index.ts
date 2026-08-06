import { addListToDropdown, Collection, createDropdown, Plugin, UIModel } from 'ckeditor5';
import {
  createGuides,
  createRuler,
  detectLanguage,
  resolveRulerLabels,
  type Guides,
  type Ruler,
  type RulerChange,
  type RulerChangePhase,
  type RulerMetrics,
  type RulerUnit,
} from '@devslab/editor-ruler';

const ATTRS = [
  { model: 'rulerMarginLeft', style: 'margin-left', key: 'leftMargin' },
  { model: 'rulerMarginRight', style: 'margin-right', key: 'rightMargin' },
  { model: 'rulerTextIndent', style: 'text-indent', key: 'firstLineIndent' },
] as const;

const UPCAST_TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'li', 'div'];

const RULER_ICON =
  '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 8a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H3zm1 2h1.5v3H4v-3zm3.5 0H9v2H7.5v-2zm3.5 0h1.5v3H11v-3zm3.5 0H16v2h-1.5v-2zm3.5 0h1.5v3H18v-3z"/></svg>';

interface CkRulerStrings {
  ruler: string;
  showHide: string;
  lockGuides: string;
  clearGuides: string;
  cm: string;
  in: string;
  px: string;
}

const STRINGS: Record<string, CkRulerStrings> = {
  en: {
    ruler: 'Ruler',
    showHide: 'Show / Hide',
    lockGuides: 'Lock Guides',
    clearGuides: 'Clear Guides',
    cm: 'cm',
    in: 'inch',
    px: 'px',
  },
  ko: {
    ruler: '줄자',
    showHide: '보이기 / 숨기기',
    lockGuides: '가이드 잠금',
    clearGuides: '가이드 지우기',
    cm: 'cm',
    in: '인치',
    px: 'px',
  },
};

export interface CkRulerConfig {
  unit?: RulerUnit;
  guides?: boolean;
  guideSnap?: number;
  language?: string;
  /**
   * Whether the ruler starts visible. Default true. `visible: false` mounts
   * it hidden — the toolbar dropdown / plugin `show()` bring it up later.
   */
  visible?: boolean;
}

declare module 'ckeditor5' {
  interface EditorConfig {
    editorRuler?: CkRulerConfig;
  }
}

/**
 * CKEditor 5 plugin mounting a Word-like horizontal ruler above the editable.
 *
 * ```ts
 * import { ClassicEditor, Essentials, Paragraph, Heading } from 'ckeditor5';
 * import { EditorRulerPlugin } from '@devslab/editor-ruler-ckeditor5';
 *
 * ClassicEditor.create(element, {
 *   plugins: [Essentials, Paragraph, Heading, EditorRulerPlugin],
 *   editorRuler: { unit: 'cm' },
 * });
 * ```
 *
 * Indentation is stored as model attributes (`rulerMarginLeft` /
 * `rulerMarginRight` / `rulerTextIndent`) and down-cast to plain inline CSS,
 * so `getData()` output is portable and existing inline indentation up-casts
 * back in. A whole drag gesture is exactly one undo step.
 */
export class EditorRulerPlugin extends Plugin {
  public static get pluginName(): 'EditorRuler' {
    return 'EditorRuler';
  }

  private _ruler: Ruler | null = null;
  private _guides: Guides | null = null;
  private _mountEl: HTMLElement | null = null;
  private _cleanup: Array<() => void> = [];
  private _gestureBaseline: Map<any, Record<string, number | null>> | null = null;

  public get ruler(): Ruler | null {
    return this._ruler;
  }

  public get guides(): Guides | null {
    return this._guides;
  }

  private _visible = true;

  public show(): void {
    if (this._mountEl) this._mountEl.style.display = '';
    this._visible = true;
    this._ruler?.refresh();
  }

  public hide(): void {
    if (this._mountEl) this._mountEl.style.display = 'none';
    this._visible = false;
  }

  public toggle(): void {
    this._visible ? this.hide() : this.show();
  }

  public isVisible(): boolean {
    return this._visible;
  }

  public setUnit(unit: RulerUnit): void {
    this._ruler?.setUnit(unit);
  }

  public getUnit(): RulerUnit {
    return this._ruler?.getUnit() ?? this._config().unit;
  }

  public setGuidesLocked(locked: boolean): void {
    this._guides?.setLocked(locked);
  }

  public isGuidesLocked(): boolean {
    return this._guides?.isLocked() === true;
  }

  public clearGuides(): void {
    this._guides?.clear();
  }

  public init(): void {
    const editor = this.editor as any;
    const schema = editor.model.schema;
    schema.extend('$block', { allowAttributes: ATTRS.map((a) => a.model) });

    for (const attr of ATTRS) {
      editor.conversion.for('downcast').attributeToAttribute({
        model: attr.model,
        view: (value: number) => ({ key: 'style', value: { [attr.style]: `${value}px` } }),
      });
      for (const tag of UPCAST_TAGS) {
        editor.conversion.for('upcast').attributeToAttribute({
          view: { name: tag, styles: { [attr.style]: /.+/ } },
          model: {
            key: attr.model,
            value: (viewElement: any) => parseFloat(viewElement.getStyle(attr.style)) || 0,
          },
        });
      }
    }

    this._registerToolbarDropdown();
    editor.once('ready', () => this._mount());
  }

  /** `'editorRuler'` toolbar item: a ruler-icon dropdown (show/hide, guides, units). */
  private _registerToolbarDropdown(): void {
    const editor = this.editor as any;
    const plugin = this;
    editor.ui.componentFactory.add('editorRuler', (locale: any) => {
      const config = this._config();
      const language = detectLanguage(
        config.language || editor.config.get('language.ui') || editor.config.get('language'),
        typeof document !== 'undefined' ? document : undefined,
      );
      const t = STRINGS[language] ?? STRINGS.en!;
      const labels: Record<string, string> = {
        toggle: t.showHide,
        lockGuides: t.lockGuides,
        clearGuides: t.clearGuides,
        cm: t.cm,
        in: t.in,
        px: t.px,
      };

      const dropdown = createDropdown(locale);
      dropdown.buttonView.set({ label: t.ruler, icon: RULER_ICON, tooltip: true });

      const models = new Map<string, any>();
      const items = new Collection<any>();
      const push = (id: string) => {
        const model = new UIModel({ id, label: labels[id], withText: true });
        models.set(id, model);
        items.add({ type: 'button', model });
      };
      push('toggle');
      push('lockGuides');
      push('clearGuides');
      items.add({ type: 'separator' });
      push('cm');
      push('in');
      push('px');
      addListToDropdown(dropdown, items);

      dropdown.on('execute', (evt: any) => {
        const id = evt.source?.id;
        if (id === 'toggle') plugin.toggle();
        else if (id === 'lockGuides') plugin.setGuidesLocked(!plugin.isGuidesLocked());
        else if (id === 'clearGuides') plugin.clearGuides();
        else if (id === 'cm' || id === 'in' || id === 'px') plugin.setUnit(id);
      });

      dropdown.on('change:isOpen', (_evt: any, _name: string, isOpen: boolean) => {
        if (!isOpen) return;
        const unit = plugin.getUnit();
        models.get('toggle')?.set('isOn', plugin.isVisible());
        models.get('lockGuides')?.set('isOn', plugin.isGuidesLocked());
        for (const u of ['cm', 'in', 'px']) models.get(u)?.set('isOn', unit === u);
      });

      return dropdown;
    });
  }

  public override destroy(): void {
    for (const fn of this._cleanup) fn();
    this._cleanup = [];
    this._ruler?.destroy();
    this._ruler = null;
    this._guides?.destroy();
    this._guides = null;
    this._mountEl?.remove();
    this._mountEl = null;
    super.destroy();
  }

  private _config(): Required<Pick<CkRulerConfig, 'unit' | 'guides' | 'guideSnap'>> & CkRulerConfig {
    const editor = this.editor as any;
    const user: CkRulerConfig = editor.config.get('editorRuler') ?? {};
    return { unit: 'cm', guides: true, guideSnap: 5, ...user };
  }

  private _selectedBlocks(): any[] {
    const editor = this.editor as any;
    return [...editor.model.document.selection.getSelectedBlocks()];
  }

  private _mount(): void {
    const editor = this.editor as any;
    const domRoot: HTMLElement | undefined = editor.editing.view.getDomRoot();
    if (!domRoot) return;
    const doc = domRoot.ownerDocument;
    const win = doc.defaultView!;
    const host = domRoot.parentElement;
    if (!host) return;
    const config = this._config();

    const mount = doc.createElement('div');
    mount.className = 'edr-ck-mount';
    host.insertBefore(mount, domRoot);
    this._mountEl = mount;
    if (config.visible === false) this.hide();

    const padding = (side: 'paddingLeft' | 'paddingRight' | 'paddingTop'): number =>
      parseFloat(win.getComputedStyle(domRoot)[side]) || 0;

    const getMetrics = (): RulerMetrics => {
      const contentWidth = Math.max(
        0,
        domRoot.clientWidth - padding('paddingLeft') - padding('paddingRight'),
      );
      const block = this._selectedBlocks()[0];
      const read = (name: string): number =>
        block?.hasAttribute(name) ? Number(block.getAttribute(name)) || 0 : 0;
      return {
        contentWidth,
        leftMargin: read('rulerMarginLeft'),
        rightMargin: read('rulerMarginRight'),
        firstLineIndent: read('rulerTextIndent'),
      };
    };

    const writeChange = (writer: any, blocks: any[], change: RulerChange) => {
      for (const block of blocks) {
        if (change.leftMargin !== undefined) writer.setAttribute('rulerMarginLeft', change.leftMargin, block);
        if (change.rightMargin !== undefined) writer.setAttribute('rulerMarginRight', change.rightMargin, block);
        if (change.firstLineIndent !== undefined) writer.setAttribute('rulerTextIndent', change.firstLineIndent, block);
      }
    };

    const applyChange = (change: RulerChange, phase: RulerChangePhase) => {
      const model = editor.model;
      const blocks = this._selectedBlocks();
      if (phase === 'drag') {
        if (!this._gestureBaseline) {
          this._gestureBaseline = new Map(
            blocks.map((b) => [
              b,
              Object.fromEntries(
                ATTRS.map((a) => [a.model, b.hasAttribute(a.model) ? b.getAttribute(a.model) : null]),
              ),
            ]),
          );
        }
        model.enqueueChange({ isUndoable: false }, (writer: any) => writeChange(writer, blocks, change));
        return;
      }
      // commit: silently restore the baseline, then apply the final value on
      // an undoable change so a whole gesture is one undo step.
      if (this._gestureBaseline) {
        const baseline = this._gestureBaseline;
        this._gestureBaseline = null;
        model.enqueueChange({ isUndoable: false }, (writer: any) => {
          for (const [block, attrs] of baseline) {
            for (const [name, value] of Object.entries(attrs)) {
              if (value === null) writer.removeAttribute(name, block);
              else writer.setAttribute(name, value, block);
            }
          }
        });
      }
      model.change((writer: any) => writeChange(writer, blocks, change));
    };

    if (config.guides !== false) {
      this._guides = createGuides(host, {
        getOffsetLeft: () => domRoot.offsetLeft + padding('paddingLeft'),
        getOffsetTop: () => domRoot.offsetTop + padding('paddingTop'),
      });
    }

    const language =
      config.language || editor.config.get('language.ui') || editor.config.get('language') || undefined;

    this._ruler = createRuler(mount, {
      unit: config.unit,
      guideSnap: config.guideSnap,
      getMetrics,
      onChange: applyChange,
      labels: resolveRulerLabels(
        typeof language === 'string' ? language : detectLanguage(undefined, doc),
        doc,
      ),
      ...(this._guides ? { guides: this._guides } : {}),
    });

    const align = () => {
      mount.style.paddingLeft = `${domRoot.offsetLeft + padding('paddingLeft')}px`;
    };
    align();

    const refresh = () => {
      align();
      this._ruler?.refresh();
      this._guides?.refresh();
    };
    const selection = editor.model.document.selection;
    selection.on('change:range', refresh);
    editor.model.document.on('change:data', refresh);
    win.addEventListener('resize', refresh);
    this._cleanup.push(() => {
      selection.off('change:range', refresh);
      editor.model.document.off('change:data', refresh);
      win.removeEventListener('resize', refresh);
    });

    this._ruler.refresh();
  }
}

export default EditorRulerPlugin;
