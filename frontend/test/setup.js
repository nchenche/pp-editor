import '@testing-library/jest-dom';

// JSDOM polyfills that UI/libs sometimes need
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = window.ResizeObserver || RO;

// Quiet console noise in tests (optional)
/*
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
*/