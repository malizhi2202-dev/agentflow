import '@testing-library/jest-dom';

// Mock localStorage for jsdom
const store: Record<string, string> = {};
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  },
  writable: true,
});

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = () => {};
