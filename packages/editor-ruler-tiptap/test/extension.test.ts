import { beforeEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { EditorRuler } from '../src/index';

function pointer(type: string, clientX: number, clientY = 0): MouseEvent {
  return new MouseEvent(type, { clientX, clientY, bubbles: true, cancelable: true });
}

async function makeEditor(content = '<p>Hello world</p><p>Second paragraph</p>') {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const editor = new Editor({
    element,
    extensions: [StarterKit, EditorRuler],
    content,
  });
  // Tiptap v3 emits 'create' asynchronously.
  if (!element.querySelector('.edr-tiptap-mount')) {
    await new Promise<void>((resolve) => {
      editor.on('create', () => resolve());
      setTimeout(resolve, 50);
    });
  }
  // jsdom has no layout; give the editor a real content width.
  Object.defineProperty(editor.view.dom, 'clientWidth', { value: 600 });
  return { editor, element };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('EditorRuler (Tiptap)', () => {
  it('mounts the ruler before the editor DOM', async () => {
    const { editor, element } = await makeEditor();
    const mount = element.querySelector('.edr-tiptap-mount');
    expect(mount).toBeTruthy();
    expect(mount!.querySelector('.edr-ruler')).toBeTruthy();
    expect(mount!.nextElementSibling).toBe(editor.view.dom);
    editor.destroy();
    expect(element.querySelector('.edr-tiptap-mount')).toBeNull();
  });

  it('applies indentation to the current paragraph as portable inline CSS', async () => {
    const { editor, element } = await makeEditor();
    editor.commands.setTextSelection(3);
    const left = element.querySelector('.edr-handle-left') as HTMLElement;
    left.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }));
    expect(editor.getHTML()).toContain('margin-left: 10px');
    expect(editor.getHTML()).not.toContain('Second paragraph</p'.replace('</p', 'style'));
  });

  it('applies to every block in a multi-paragraph selection', async () => {
    const { editor, element } = await makeEditor();
    editor.commands.selectAll();
    const left = element.querySelector('.edr-handle-left') as HTMLElement;
    left.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    const html = editor.getHTML();
    expect(html.match(/margin-left: 1px/g)?.length).toBe(2);
  });

  it('parses existing inline indentation back into attributes', async () => {
    const { editor } = await makeEditor('<p style="margin-left: 40px; text-indent: 12px">Kept</p>');
    const attrs = editor.state.doc.firstChild!.attrs.rulerIndent;
    expect(attrs).toEqual({ marginLeft: 40, textIndent: 12 });
    expect(editor.getHTML()).toContain('margin-left: 40px');
    editor.destroy();
  });

  it('a whole drag gesture is exactly one undo step', async () => {
    const { editor, element } = await makeEditor();
    editor.commands.setTextSelection(3);
    const left = element.querySelector('.edr-handle-left') as HTMLElement;
    left.dispatchEvent(pointer('pointerdown', 0));
    window.dispatchEvent(pointer('pointermove', 30));
    window.dispatchEvent(pointer('pointermove', 60));
    window.dispatchEvent(pointer('pointerup', 60));
    expect(editor.getHTML()).toContain('margin-left: 60px');

    editor.commands.undo();
    expect(editor.getHTML()).not.toContain('margin-left');
    editor.destroy();
  });

  it('creates guides from the ruler without touching the document', async () => {
    const { editor, element } = await makeEditor();
    const rulerRoot = element.querySelector('.edr-ruler') as HTMLElement;
    rulerRoot.dispatchEvent(pointer('pointerdown', 100, 0));
    window.dispatchEvent(pointer('pointerup', 100, 50));
    expect(element.querySelector('.edr-guides .edr-guide-y')).toBeTruthy();
    expect(editor.getHTML()).not.toContain('edr-guide');
    editor.destroy();
  });
});
