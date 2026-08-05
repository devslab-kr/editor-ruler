// jsdom lacks a few browser APIs CKEditor 5 touches at startup.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

if (typeof (globalThis as any).ResizeObserver !== 'function') {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (typeof (window as any).InputEvent === 'undefined') {
  (window as any).InputEvent = window.Event;
}

if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}
