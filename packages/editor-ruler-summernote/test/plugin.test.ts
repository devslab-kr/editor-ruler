import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineRulerPlugin } from '../src/index';

/**
 * Minimal stand-in for jQuery + $.summernote. Only the surface the adapter
 * actually touches: `plugins`, `options`, `dom`, `extend`, and enough of the
 * `ui` builder for the toolbar memo.
 */
function makeJQuery() {
  const jq: any = (sel: any) => ({
    closest: () => ({ data: () => undefined }),
    0: sel,
  });
  jq.extend = (deep: any, target: any, ...rest: any[]) => {
    // supports both $.extend(target, ...) and $.extend(true, target, ...)
    const objs = typeof deep === 'boolean' ? rest : [target, ...rest];
    const dst = typeof deep === 'boolean' ? target : deep;
    for (const o of objs) for (const k of Object.keys(o ?? {})) dst[k] = { ...(dst[k] ?? {}), ...o[k] };
    return dst;
  };
  jq.summernote = {
    plugins: {},
    options: {},
    dom: { isPara: (n: any) => /^(P|H[1-6]|LI|BLOCKQUOTE|PRE|DIV)$/.test(n?.tagName ?? '') },
    ui: {
      buttonGroup: (children: any[]) => ({ render: () => ({ children }) }),
      button: (o: any) => o,
      dropdown: (o: any) => o,
    },
  };
  return jq;
}

interface Ctx {
  context: any;
  editable: HTMLElement;
  paragraph: HTMLElement;
  afterCommand: ReturnType<typeof vi.fn>;
}

function makeContext(rulerOptions: Record<string, unknown> = {}): Ctx {
  const host = document.createElement('div');
  const editable = document.createElement('div');
  editable.className = 'note-editable';
  Object.defineProperty(editable, 'clientWidth', { value: 600, configurable: true });
  const paragraph = document.createElement('p');
  paragraph.textContent = 'Hello ruler';
  editable.appendChild(paragraph);
  host.appendChild(editable);
  document.body.appendChild(host);

  const afterCommand = vi.fn();
  const context = {
    layoutInfo: { editable: Object.assign([editable], { 0: editable }) },
    options: { ruler: { enabled: true, unit: 'cm', guides: true, guideSnap: 5, ...rulerOptions } },
    memo: vi.fn(),
    invoke: (name: string) => {
      if (name === 'editor.afterCommand') return afterCommand();
      if (name === 'editor.getLastRange') {
        return { nodes: () => [paragraph] };
      }
      return undefined;
    },
  };
  return { context, editable, paragraph, afterCommand };
}

function mountPlugin(jq: any, ctx: Ctx) {
  const Plugin = jq.summernote.plugins.ruler;
  const instance: any = {};
  Plugin.call(instance, ctx.context);
  instance.initialize?.();
  return instance;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('defineRulerPlugin (Summernote)', () => {
  it('registers the plugin and merges default options', () => {
    const jq = makeJQuery();
    defineRulerPlugin(jq);
    expect(jq.summernote.plugins.ruler).toBeTypeOf('function');
    expect(jq.summernote.options.ruler).toMatchObject({ enabled: true, unit: 'cm', guides: true });
  });

  it('is idempotent', () => {
    const jq = makeJQuery();
    defineRulerPlugin(jq);
    const first = jq.summernote.plugins.ruler;
    defineRulerPlugin(jq);
    expect(jq.summernote.plugins.ruler).toBe(first);
  });

  it('mounts the ruler above the editable', () => {
    const jq = makeJQuery();
    defineRulerPlugin(jq);
    const ctx = makeContext();
    mountPlugin(jq, ctx);

    const mount = document.querySelector('.edr-sn-mount') as HTMLElement;
    expect(mount).toBeTruthy();
    expect(mount.querySelector('.edr-ruler')).toBeTruthy();
    expect(mount.nextElementSibling).toBe(ctx.editable);
  });

  it('applies indentation to the selected block and records one undo step', () => {
    const jq = makeJQuery();
    defineRulerPlugin(jq);
    const ctx = makeContext();
    mountPlugin(jq, ctx);

    const handle = document.querySelector('.edr-handle-left') as HTMLElement;
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    expect(ctx.paragraph.style.marginLeft).toBe('1px');
    expect(ctx.afterCommand).toHaveBeenCalledTimes(1);
  });

  it('a selection inside a table indents the whole table, never text-indent', () => {
    const jq = makeJQuery();
    defineRulerPlugin(jq);
    const ctx = makeContext();
    const table = document.createElement('table');
    table.innerHTML = '<tbody><tr><td><p>cell</p></td></tr></tbody>';
    ctx.editable.appendChild(table);
    const cell = table.querySelector('td') as HTMLElement;
    // Summernote hands back the cell; the adapter must climb to the table.
    ctx.context.invoke = (name: string) =>
      name === 'editor.getLastRange' ? { nodes: () => [cell] } : ctx.afterCommand();
    mountPlugin(jq, ctx);

    const handle = document.querySelector('.edr-handle-left') as HTMLElement;
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    expect(table.style.marginLeft).toBe('1px');
    expect(table.style.textIndent).toBe('');
    expect(cell.style.marginLeft).toBe('');
  });

  it('visible: false starts hidden but stays toggleable', () => {
    const jq = makeJQuery();
    defineRulerPlugin(jq);
    const ctx = makeContext({ visible: false });
    const api = mountPlugin(jq, ctx);

    const mount = document.querySelector('.edr-sn-mount') as HTMLElement;
    expect(mount.style.display).toBe('none');
    expect(api.isVisible()).toBe(false);

    api.toggle();
    expect(mount.style.display).toBe('');
    expect(api.isVisible()).toBe(true);
  });

  it('vertical: true mounts the strip and wraps the editable', () => {
    const jq = makeJQuery();
    defineRulerPlugin(jq);
    const ctx = makeContext({ vertical: true });
    const api = mountPlugin(jq, ctx);

    const vwrap = document.querySelector('.edr-vwrap') as HTMLElement;
    expect(vwrap).toBeTruthy();
    expect(vwrap.querySelector('.edr-vruler')).toBeTruthy();
    expect(vwrap.contains(ctx.editable)).toBe(true);
    expect(api.isVRulerVisible()).toBe(true);

    api.toggleVRuler();
    expect((document.querySelector('.edr-sn-vmount') as HTMLElement).style.display).toBe('none');
  });

  it('verticalGutter reserves the column across toggles', () => {
    const jq = makeJQuery();
    defineRulerPlugin(jq);
    const ctx = makeContext({ verticalGutter: true });
    const api = mountPlugin(jq, ctx);

    const vmount = document.querySelector('.edr-sn-vmount') as HTMLElement;
    const mount = document.querySelector('.edr-sn-mount') as HTMLElement;
    expect(vmount.style.visibility).toBe('hidden');
    expect(mount.style.paddingLeft).toBe('23px');

    api.toggleVRuler();
    expect(vmount.style.visibility).toBe('');
    api.toggleVRuler();
    expect(vmount.style.visibility).toBe('hidden');
    expect(vmount.style.display).not.toBe('none');
    expect(mount.style.paddingLeft).toBe('23px');
  });

  it('registers the ruler toolbar item', () => {
    const jq = makeJQuery();
    defineRulerPlugin(jq);
    const ctx = makeContext();
    mountPlugin(jq, ctx);
    expect(ctx.context.memo).toHaveBeenCalledWith('button.ruler', expect.any(Function));
  });

  it('destroy unwraps the editable and removes the mount', () => {
    const jq = makeJQuery();
    defineRulerPlugin(jq);
    const ctx = makeContext({ vertical: true });
    const api = mountPlugin(jq, ctx);
    const host = ctx.editable.parentElement?.parentElement;

    api.destroy();
    expect(document.querySelector('.edr-sn-mount')).toBeNull();
    expect(document.querySelector('.edr-vwrap')).toBeNull();
    expect(host?.contains(ctx.editable)).toBe(true);
  });

  it('enabled: false keeps the plugin from initializing', () => {
    const jq = makeJQuery();
    defineRulerPlugin(jq);
    const ctx = makeContext({ enabled: false });
    const Plugin = jq.summernote.plugins.ruler;
    const instance: any = {};
    Plugin.call(instance, ctx.context);
    expect(instance.shouldInitialize()).toBe(false);
  });
});
