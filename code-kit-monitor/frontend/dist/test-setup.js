import '@testing-library/jest-dom';
// Mock localStorage for jsdom
const store = {};
Object.defineProperty(window, 'localStorage', {
    value: {
        getItem: (key) => store[key] ?? null,
        setItem: (key, value) => { store[key] = value; },
        removeItem: (key) => { delete store[key]; },
        clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    },
    writable: true,
});
// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = () => { };
