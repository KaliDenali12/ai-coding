import '@testing-library/jest-dom/vitest'

// Polyfill SVG methods missing in jsdom (used by RedString animation)
if (typeof SVGElement !== 'undefined') {
  Object.defineProperty(SVGElement.prototype, 'getTotalLength', {
    value: () => 500,
    writable: true,
    configurable: true,
  })
}
