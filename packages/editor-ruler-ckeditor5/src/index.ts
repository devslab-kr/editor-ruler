import { Plugin } from 'ckeditor5';
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

export interface CkRulerConfig {
  unit?: RulerUnit;
  guides?: boolean;
  guideSnap?: number;
  language?: string;
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

    editor.once('ready', () => this._mount());
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
