import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineRulerPlugin } from '../src/index';

interface FakeEditor {
  opts: Record<string, unknown>;
  el: HTMLElement;
  $wp: { get(i: number): HTMLElement };
  selection: { blocks(): HTMLElement[] };
  events: { on(name: string, fn: () => void): void; handlers: Map<string, Array<() => void>> };
  undo: { saveStep: ReturnType<typeof vi.fn> };
}

function makeFroalaConstructor() {
  return {
    DEFAULTS: { existing: true },
    PLUGINS: {} as Record<string, (editor: FakeEditor) => any>,
    DefineIconTemplate: vi.fn(),
    DefineIcon: vi.fn(),
    RegisterCommand: vi.fn(),
  };
}

function makeEditor(opts: Record<string, unknown> = {}): { editor: FakeEditor; container: HTMLElement; wrapper: HTMLElement; paragraph: HTMLElement } {
  const container = document.createElement('div');
  const wrapper = document.createElement('div');
  wrapper.className = 'fr-wrapper';
  const el = document.createElement('div');
  el.className = 'fr-element';
  // jsdom has no layout; give the editor a real content width.
  Object.defineProperty(el, 'clientWidth', { value: 600 });
  const paragraph = document.createElement('p');
  paragraph.textContent = 'Hello ruler';
  el.appendChild(paragraph);
  wrapper.appendChild(el);
  container.appendChild(wrapper);
  document.body.appendChild(container);

  const handlers = new Map<string, Array<() => void>>();
  const editor: FakeEditor = {
    opts: { rulerEnabled: true, rulerUnit: 'cm', ...opts },
    el,
    $wp: { get: () => wrapper },
    selection: { blocks: () => [paragraph] },
    events: {
      handlers,
      on(name, fn) {
        const list = handlers.get(name) ?? [];
        list.push(fn);
        handlers.set(name, list);
      },
    },
    undo: { saveStep: vi.fn() },
  };
  return { editor, container, wrapper, paragraph };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('defineRulerPlugin', () => {
  it('registers the plugin and merges defaults without overriding existing ones', () => {
    const FE = makeFroalaConstructor();
    defineRulerPlugin(FE);
    expect(FE.PLUGINS.ruler).toBeTypeOf('function');
    expect((FE.DEFAULTS as any).rulerEnabled).toBe(true);
    expect((FE.DEFAULTS as any).rulerUnit).toBe('cm');
    expect((FE.DEFAULTS as any).existing).toBe(true);
  });

  it('is idempotent', () => {
    const FE = makeFroalaConstructor();
    defineRulerPlugin(FE);
    const first = FE.PLUGINS.ruler;
    defineRulerPlugin(FE);
    expect(FE.PLUGINS.ruler).toBe(first);
  });

  it('mounts the ruler above the editor wrapper on _init', () => {
    const FE = makeFroalaConstructor();
    defineRulerPlugin(FE);
    const { editor, container, wrapper } = makeEditor();
    const plugin = FE.PLUGINS.ruler!(editor);
    plugin._init();

    const mount = container.querySelector('.edr-froala-mount') as HTMLElement;
    expect(mount).toBeTruthy();
    expect(mount.nextElementSibling).toBe(wrapper);
    expect(mount.querySelector('.edr-ruler')).toBeTruthy();
  });

  it('does nothing when rulerEnabled is false', () => {
    const FE = makeFroalaConstructor();
    defineRulerPlugin(FE);
    const { editor, container } = makeEditor({ rulerEnabled: false });
    FE.PLUGINS.ruler!(editor)._init();
    expect(container.querySelector('.edr-froala-mount')).toBeNull();
  });

  it('applies keyboard changes to the selected block and saves an undo step', () => {
    const FE = makeFroalaConstructor();
    defineRulerPlugin(FE);
    const { editor, container, paragraph } = makeEditor();
    FE.PLUGINS.ruler!(editor)._init();

    const leftHandle = container.querySelector('.edr-handle-left') as HTMLElement;
    leftHandle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    expect(paragraph.style.marginLeft).toBe('1px');
    expect(editor.undo.saveStep).toHaveBeenCalledTimes(1);
  });

  it('subscribes to editor refresh events and destroys with the editor', () => {
    const FE = makeFroalaConstructor();
    defineRulerPlugin(FE);
    const { editor, container } = makeEditor();
    FE.PLUGINS.ruler!(editor)._init();

    for (const name of ['mouseup', 'keyup', 'contentChanged', 'commands.after', 'destroy']) {
      expect(editor.events.handlers.has(name), `missing handler for ${name}`).toBe(true);
    }

    for (const fn of editor.events.handlers.get('destroy')!) fn();
    expect(container.querySelector('.edr-froala-mount')).toBeNull();
  });

  it('registers the toggleRuler toolbar icon and command', () => {
    const FE = makeFroalaConstructor();
    defineRulerPlugin(FE);
    expect(FE.DefineIconTemplate).toHaveBeenCalledWith('editorRuler', expect.stringContaining('<svg'));
    expect(FE.DefineIcon).toHaveBeenCalledWith('toggleRuler', expect.objectContaining({ template: 'editorRuler' }));
    expect(FE.RegisterCommand).toHaveBeenCalledWith(
      'toggleRuler',
      expect.objectContaining({ icon: 'toggleRuler', plugin: 'ruler' }),
    );
  });

  it('toggleRuler command hides and shows the mounted ruler', () => {
    const FE = makeFroalaConstructor();
    defineRulerPlugin(FE);
    const { editor, container } = makeEditor();
    const api = FE.PLUGINS.ruler!(editor);
    api._init();
    (editor as any).ruler = api;

    const command = FE.RegisterCommand.mock.calls.find((c) => c[0] === 'toggleRuler')![1];
    const mount = container.querySelector('.edr-froala-mount') as HTMLElement;

    expect(api.isVisible()).toBe(true);
    command.callback.call(editor);
    expect(api.isVisible()).toBe(false);
    expect(mount.style.display).toBe('none');
    command.callback.call(editor);
    expect(api.isVisible()).toBe(true);
    expect(mount.style.display).toBe('');

    const btn = { toggleClass: vi.fn() };
    command.refresh.call(editor, btn);
    expect(btn.toggleClass).toHaveBeenCalledWith('fr-active', true);
  });

  it('tolerates a Froala constructor without icon/command registries', () => {
    const FE = { DEFAULTS: {}, PLUGINS: {} as Record<string, unknown> };
    expect(() => defineRulerPlugin(FE)).not.toThrow();
    expect(FE.PLUGINS.ruler).toBeTypeOf('function');
  });

  it('falls back to the first block element when selection is empty', () => {
    const FE = makeFroalaConstructor();
    defineRulerPlugin(FE);
    const { editor, container, paragraph } = makeEditor();
    editor.selection.blocks = () => [];
    FE.PLUGINS.ruler!(editor)._init();

    const leftHandle = container.querySelector('.edr-handle-left') as HTMLElement;
    leftHandle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(paragraph.style.marginLeft).toBe('1px');
  });
});
