/**
 * Test setup and configuration for AQUA
 * This file is automatically run before all tests
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

/**
 * Setup DOM mocking for jsdom environment
 */
beforeEach(() => {
  // Clear any leftover DOM state
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  // Clean up mocks between tests
  vi.clearAllMocks();
});

/**
 * Mock window.matchMedia for theme detection tests
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

/**
 * Suppress console errors during tests (optional)
 */
const originalError = console.error;
beforeAll(() => {
  // Uncomment the next line to suppress console.error output during tests
  // console.error = vi.fn();
});

afterAll(() => {
  // console.error = originalError;
});
