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

  it('registers the unified rulerOptions dropdown (toggle + vruler + guides + units)', () => {
    const FE = makeFroalaConstructor();
    defineRulerPlugin(FE);
    expect(FE.RegisterCommand).toHaveBeenCalledWith(
      'rulerOptions',
      expect.objectContaining({
        type: 'dropdown',
        plugin: 'ruler',
        options: {
          toggle: 'Show / Hide',
          vruler: 'Vertical Ruler',
          lockGuides: 'Lock Guides',
          clearGuides: 'Clear Guides',
          cm: 'cm',
          in: 'inch',
          px: 'px',
        },
      }),
    );
  });

  it('rulerOptions routes vruler, lockGuides, and clearGuides values', () => {
    const FE = makeFroalaConstructor();
    defineRulerPlugin(FE);
    const { editor, container } = makeEditor();
    const api = FE.PLUGINS.ruler!(editor);
    api._init();
    (editor as any).ruler = api;
    const command = FE.RegisterCommand.mock.calls.find((c) => c[0] === 'rulerOptions')![1];

    expect(api.isVRulerVisible()).toBe(false);
    command.callback.call(editor, 'rulerOptions', 'vruler');
    expect(api.isVRulerVisible()).toBe(true);
    expect(container.querySelector('.edr-vwrap .edr-vruler')).toBeTruthy();
    command.callback.call(editor, 'rulerOptions', 'vruler');
    expect(api.isVRulerVisible()).toBe(false);

    command.callback.call(editor, 'rulerOptions', 'lockGuides');
    expect(api.isGuidesLocked()).toBe(true);
    command.callback.call(editor, 'rulerOptions', 'lockGuides');
    expect(api.isGuidesLocked()).toBe(false);

    command.callback.call(editor, 'rulerOptions', 'clearGuides');
    expect(api.getGuides()).toEqual([]);
  });

  it('mounts vertical ruler on init when rulerVertical is true and unwraps on destroy', () => {
    const FE = makeFroalaConstructor();
    defineRulerPlugin(FE);
    const { editor, container, wrapper } = makeEditor({ rulerVertical: true });
    const api = FE.PLUGINS.ruler!(editor);
    api._init();
    expect(api.isVRulerVisible()).toBe(true);
    const vwrap = container.querySelector('.edr-vwrap') as HTMLElement;
    expect(vwrap).toBeTruthy();
    expect(vwrap.contains(wrapper)).toBe(true);

    api.destroy();
    expect(container.querySelector('.edr-vwrap')).toBeNull();
    expect(container.contains(wrapper)).toBe(true); // wrapper restored to its old place
  });

  it('creates a guide by dragging down from the ruler strip', () => {
    const FE = makeFroalaConstructor();
    defineRulerPlugin(FE);
    const { editor, container } = makeEditor();
    const api = FE.PLUGINS.ruler!(editor);
    api._init();

    const rulerRoot = container.querySelector('.edr-ruler') as HTMLElement;
    const fire = (t: string, x: number, y: number, target: EventTarget) =>
      target.dispatchEvent(new MouseEvent(t, { clientX: x, clientY: y, bubbles: true, cancelable: true }));
    fire('pointerdown', 120, 0, rulerRoot);
    fire('pointermove', 150, 40, window);
    fire('pointerup', 150, 40, window);

    expect(api.getGuides()).toEqual([150]);
    expect(container.querySelector('.edr-guides .edr-guide')).toBeTruthy();
    api.clearGuides();
    expect(api.getGuides()).toEqual([]);
  });

  it('does not create guides when rulerGuides is false', () => {
    const FE = makeFroalaConstructor();
    defineRulerPlugin(FE);
    const { editor, container } = makeEditor({ rulerGuides: false });
    const api = FE.PLUGINS.ruler!(editor);
    api._init();
    expect(container.querySelector('.edr-guides')).toBeNull();
    expect(api.getGuides()).toEqual([]);
    expect(api.isGuidesLocked()).toBe(false);
  });

  it('rulerOptions callback routes toggle vs unit values', () => {
    const FE = makeFroalaConstructor();
    defineRulerPlugin(FE);
    const { editor } = makeEditor();
    const api = FE.PLUGINS.ruler!(editor);
    api._init();
    (editor as any).ruler = api;

    const command = FE.RegisterCommand.mock.calls.find((c) => c[0] === 'rulerOptions')![1];
    command.callback.call(editor, 'rulerOptions', 'toggle');
    expect(api.isVisible()).toBe(false);
    command.callback.call(editor, 'rulerOptions', 'toggle');
    expect(api.isVisible()).toBe(true);
    command.callback.call(editor, 'rulerOptions', 'in');
    expect(api.getUnit()).toBe('in');
  });

  it('rulerOptions refreshOnShow marks visibility and active unit', () => {
    const FE = makeFroalaConstructor();
    defineRulerPlugin(FE);
    const { editor } = makeEditor();
    const api = FE.PLUGINS.ruler!(editor);
    api._init();
    (editor as any).ruler = api;

    const dropdown = document.createElement('div');
    dropdown.innerHTML =
      '<a class="fr-command" data-param1="toggle"></a>' +
      '<a class="fr-command" data-param1="cm"></a>' +
      '<a class="fr-command" data-param1="px"></a>';
    const command = FE.RegisterCommand.mock.calls.find((c) => c[0] === 'rulerOptions')![1];
    command.refreshOnShow.call(editor, null, { get: () => dropdown });

    expect(dropdown.querySelector('[data-param1="toggle"]')!.classList.contains('fr-active')).toBe(true);
    expect(dropdown.querySelector('[data-param1="cm"]')!.classList.contains('fr-active')).toBe(true);
    expect(dropdown.querySelector('[data-param1="px"]')!.classList.contains('fr-active')).toBe(false);
  });

  it('registers the rulerUnit dropdown with cm/in/px options', () => {
    const FE = makeFroalaConstructor();
    defineRulerPlugin(FE);
    expect(FE.RegisterCommand).toHaveBeenCalledWith(
      'rulerUnit',
      expect.objectContaining({
        type: 'dropdown',
        plugin: 'ruler',
        options: { cm: 'cm', in: 'inch', px: 'px' },
      }),
    );
  });

  it('rulerUnit dropdown callback switches the scale unit', () => {
    const FE = makeFroalaConstructor();
    defineRulerPlugin(FE);
    const { editor } = makeEditor();
    const api = FE.PLUGINS.ruler!(editor);
    api._init();
    (editor as any).ruler = api;

    expect(api.getUnit()).toBe('cm');
    const command = FE.RegisterCommand.mock.calls.find((c) => c[0] === 'rulerUnit')![1];
    command.callback.call(editor, 'rulerUnit', 'px');
    expect(api.getUnit()).toBe('px');
  });

  it('rulerUnit refreshOnShow marks the active unit', () => {
    const FE = makeFroalaConstructor();
    defineRulerPlugin(FE);
    const { editor } = makeEditor();
    const api = FE.PLUGINS.ruler!(editor);
    api._init();
    (editor as any).ruler = api;

    const dropdown = document.createElement('div');
    dropdown.innerHTML =
      '<a class="fr-command" data-param1="cm"></a><a class="fr-command" data-param1="px"></a>';
    const command = FE.RegisterCommand.mock.calls.find((c) => c[0] === 'rulerUnit')![1];
    command.refreshOnShow.call(editor, null, { get: () => dropdown });

    expect(dropdown.querySelector('[data-param1="cm"]')!.classList.contains('fr-active')).toBe(true);
    expect(dropdown.querySelector('[data-param1="px"]')!.classList.contains('fr-active')).toBe(false);
  });

  it('tolerates a Froala constructor without icon/command registries', () => {
    const FE = { DEFAULTS: {}, PLUGINS: {} as Record<string, unknown> };
    expect(() => defineRulerPlugin(FE)).not.toThrow();
    expect(FE.PLUGINS.ruler).toBeTypeOf('function');
  });

  it('stays inert when the selection sits on a table cell', () => {
    const FE = makeFroalaConstructor();
    defineRulerPlugin(FE);
    const { editor, container, paragraph } = makeEditor();
    const table = document.createElement('table');
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    tr.appendChild(td);
    table.appendChild(tr);
    editor.el.appendChild(table);
    editor.selection.blocks = () => [td];
    FE.PLUGINS.ruler!(editor)._init();

    const leftHandle = container.querySelector('.edr-handle-left') as HTMLElement;
    leftHandle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    // Neither the cell nor any unrelated block gets styled.
    expect(td.getAttribute('style')).toBeNull();
    expect(paragraph.style.marginLeft).toBe('');
  });

  it('still applies to real blocks inside a table cell', () => {
    const FE = makeFroalaConstructor();
    defineRulerPlugin(FE);
    const { editor, container } = makeEditor();
    const table = document.createElement('table');
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    const cellPara = document.createElement('p');
    cellPara.textContent = 'in cell';
    td.appendChild(cellPara);
    tr.appendChild(td);
    table.appendChild(tr);
    editor.el.appendChild(table);
    editor.selection.blocks = () => [cellPara];
    FE.PLUGINS.ruler!(editor)._init();

    const leftHandle = container.querySelector('.edr-handle-left') as HTMLElement;
    leftHandle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    expect(cellPara.style.marginLeft).toBe('1px');
    expect(td.getAttribute('style')).toBeNull();
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
