import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClassicEditor, Essentials, Heading, Paragraph } from 'ckeditor5';
import { EditorRulerPlugin } from '../src/index';

function pointer(type: string, clientX: number, clientY = 0): MouseEvent {
  return new MouseEvent(type, { clientX, clientY, bubbles: true, cancelable: true });
}

let editors: any[] = [];

async function makeEditor(data = '<p>Hello world</p><p>Second paragraph</p>') {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const editor: any = await ClassicEditor.create(element, {
    licenseKey: 'GPL',
    plugins: [Essentials, Paragraph, Heading, EditorRulerPlugin],
    initialData: data,
  });
  editors.push(editor);
  const domRoot: HTMLElement = editor.editing.view.getDomRoot();
  Object.defineProperty(domRoot, 'clientWidth', { value: 600, configurable: true });
  const host = domRoot.parentElement as HTMLElement;
  return { editor, host, domRoot };
}

beforeEach(() => {
  document.body.innerHTML = '';
  editors = [];
});

afterEach(async () => {
  for (const e of editors) {
    try {
      await e.destroy();
    } catch {
      /* already destroyed */
    }
  }
});

describe('EditorRulerPlugin (CKEditor 5)', () => {
  it('mounts the ruler above the editable', async () => {
    const { host } = await makeEditor();
    const mount = host.querySelector('.edr-ck-mount');
    expect(mount).toBeTruthy();
    expect(mount!.querySelector('.edr-ruler')).toBeTruthy();
  });

  it('editorRuler.visible: false mounts the ruler hidden; show() brings it up', async () => {
    const element = document.createElement('div');
    document.body.appendChild(element);
    const editor: any = await ClassicEditor.create(element, {
      licenseKey: 'GPL',
      plugins: [Essentials, Paragraph, Heading, EditorRulerPlugin],
      editorRuler: { visible: false },
      initialData: '<p>Hi</p>',
    });
    editors.push(editor);
    const host = editor.editing.view.getDomRoot().parentElement as HTMLElement;
    const mount = host.querySelector('.edr-ck-mount') as HTMLElement;
    const plugin = editor.plugins.get('EditorRuler');

    expect(mount.style.display).toBe('none');
    expect(plugin.isVisible()).toBe(false);

    plugin.show();
    expect(mount.style.display).toBe('');
    expect(plugin.isVisible()).toBe(true);
  });

  it('editorRuler.vertical: true mounts the strip; toggleVRuler hides it', async () => {
    const element = document.createElement('div');
    document.body.appendChild(element);
    const editor: any = await ClassicEditor.create(element, {
      licenseKey: 'GPL',
      plugins: [Essentials, Paragraph, Heading, EditorRulerPlugin],
      editorRuler: { vertical: true },
      initialData: '<p>Hi</p>',
    });
    editors.push(editor);
    const domRoot = editor.editing.view.getDomRoot();
    const plugin = editor.plugins.get('EditorRuler');
    const vwrap = document.querySelector('.edr-vwrap') as HTMLElement;

    expect(vwrap).toBeTruthy();
    expect(vwrap.querySelector('.edr-vruler')).toBeTruthy();
    expect(vwrap.contains(domRoot)).toBe(true);
    expect(plugin.isVRulerVisible()).toBe(true);

    plugin.toggleVRuler();
    const vmount = vwrap.querySelector('.edr-ck-vmount') as HTMLElement;
    expect(vmount.style.display).toBe('none');
    expect(plugin.isVRulerVisible()).toBe(false);
  });

  it('editorRuler.verticalGutter reserves the column across toggles', async () => {
    const element = document.createElement('div');
    document.body.appendChild(element);
    const editor: any = await ClassicEditor.create(element, {
      licenseKey: 'GPL',
      plugins: [Essentials, Paragraph, Heading, EditorRulerPlugin],
      editorRuler: { verticalGutter: true },
      initialData: '<p>Hi</p>',
    });
    editors.push(editor);
    const plugin = editor.plugins.get('EditorRuler');
    const vmount = document.querySelector('.edr-ck-vmount') as HTMLElement;

    expect(vmount).toBeTruthy();
    expect(vmount.style.visibility).toBe('hidden');
    expect(plugin.isVRulerVisible()).toBe(false);

    plugin.toggleVRuler(); // show
    expect(vmount.style.visibility).toBe('');
    plugin.toggleVRuler(); // hide — gutter stays
    expect(vmount.style.visibility).toBe('hidden');
    expect(vmount.style.display).not.toBe('none');
  });

  it('applies indentation to the selected block as portable inline CSS', async () => {
    const { editor, host } = await makeEditor();
    const left = host.querySelector('.edr-handle-left') as HTMLElement;
    left.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }));
    expect(editor.getData()).toContain('margin-left:10px');
  });

  it('upcasts existing inline indentation into model attributes', async () => {
    const { editor } = await makeEditor('<p style="margin-left:40px;text-indent:12px;">Kept</p>');
    const block = editor.model.document.getRoot().getChild(0);
    expect(block.getAttribute('rulerMarginLeft')).toBe(40);
    expect(block.getAttribute('rulerTextIndent')).toBe(12);
    expect(editor.getData()).toContain('margin-left:40px');
  });

  it('a whole drag gesture is exactly one undo step', async () => {
    const { editor, host } = await makeEditor();
    const left = host.querySelector('.edr-handle-left') as HTMLElement;
    left.dispatchEvent(pointer('pointerdown', 0));
    window.dispatchEvent(pointer('pointermove', 30));
    window.dispatchEvent(pointer('pointermove', 60));
    window.dispatchEvent(pointer('pointerup', 60));
    expect(editor.getData()).toContain('margin-left:60px');

    editor.execute('undo');
    expect(editor.getData()).not.toContain('margin-left');
  });

  it('creates guides without touching the document data', async () => {
    const { editor, host } = await makeEditor();
    const rulerRoot = host.querySelector('.edr-ruler') as HTMLElement;
    rulerRoot.dispatchEvent(pointer('pointerdown', 100, 0));
    window.dispatchEvent(pointer('pointerup', 100, 50));
    expect(host.querySelector('.edr-guides .edr-guide-y')).toBeTruthy();
    expect(editor.getData()).not.toContain('edr-guide');
  });

  it('registers the editorRuler toolbar dropdown with a ruler icon', async () => {
    const { editor } = await makeEditor();
    expect(editor.ui.componentFactory.has('editorRuler')).toBe(true);
    const dropdown = editor.ui.componentFactory.create('editorRuler');
    expect(dropdown.buttonView.label).toBe('Ruler');
    expect(dropdown.buttonView.icon).toContain('<svg');
  });

  it('exposes show/hide, unit, and guide controls on the plugin API', async () => {
    const { editor, host } = await makeEditor();
    const plugin = editor.plugins.get('EditorRuler');
    const mount = host.querySelector('.edr-ck-mount') as HTMLElement;

    expect(plugin.isVisible()).toBe(true);
    plugin.toggle();
    expect(plugin.isVisible()).toBe(false);
    expect(mount.style.display).toBe('none');
    plugin.toggle();
    expect(mount.style.display).toBe('');

    expect(plugin.getUnit()).toBe('cm');
    plugin.setUnit('px');
    expect(plugin.getUnit()).toBe('px');

    expect(plugin.isGuidesLocked()).toBe(false);
    plugin.setGuidesLocked(true);
    expect(plugin.isGuidesLocked()).toBe(true);
    plugin.clearGuides();
  });

  it('cleans up its DOM on destroy', async () => {
    const { editor, host } = await makeEditor();
    await editor.destroy();
    expect(host.querySelector('.edr-ck-mount')).toBeNull();
  });
});
