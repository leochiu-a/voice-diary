// jsdom has no matchMedia. Every query reports no match, as on a phone; a test
// for a wide screen replaces it.
window.matchMedia = (query) =>
  ({
    media: query,
    matches: false,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

// jsdom has no ResizeObserver either, and lays nothing out, so nothing resizes.
window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
