/**
 * Test utilities and helpers for the AQUA project
 */

/**
 * Creates a mock FileNode for testing
 */
export function createMockFileNode(overrides = {}) {
  return {
    name: 'test-file.md',
    path: '/home/user/test-file.md',
    is_dir: false,
    ...overrides,
  };
}

/**
 * Creates a mock file tree structure
 */
export function createMockFileTree() {
  return {
    name: 'root',
    path: '/home/user',
    is_dir: true,
    children: [
      {
        name: 'Documents',
        path: '/home/user/Documents',
        is_dir: true,
        children: [
          createMockFileNode({ name: 'doc1.md', path: '/home/user/Documents/doc1.md' }),
          createMockFileNode({ name: 'doc2.md', path: '/home/user/Documents/doc2.md' }),
        ],
      },
      createMockFileNode({ name: 'note.md', path: '/home/user/note.md' }),
    ],
  };
}

/**
 * Waits for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 1000,
  interval = 50
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Creates sample markdown content for testing
 */
export function createSampleMarkdown() {
  return `# AQUA Test Document

## Section 1
This is a test document with various markdown features.

### Subsection
- Item 1
- Item 2
- [x] Completed task
- [ ] Pending task

## Section 2
Some text with arrows: -> <- <->

## Math
Inline math: $E = mc^2$

Block math:
$$
\\frac{1}{2} \\int_0^\\infty e^{-x^2} dx
$$

## Code
\`\`\`javascript
const greeting = "Hello, World!";
console.log(greeting);
\`\`\`
`;
}

/**
 * Mock console methods and verify calls
 */
export function createMockConsole() {
  const logs: string[] = [];
  const errors: string[] = [];
  const warns: string[] = [];

  const mockConsole = {
    log: (...args: any[]) => logs.push(args.join(' ')),
    error: (...args: any[]) => errors.push(args.join(' ')),
    warn: (...args: any[]) => warns.push(args.join(' ')),
  };

  return { mockConsole, logs, errors, warns };
}

/**
 * Creates a mock DOM environment for testing
 */
export function setupMockDOM() {
  // Ensure document is available
  if (typeof document === 'undefined') {
    throw new Error('DOM environment not available');
  }

  // Clear body
  document.body.innerHTML = '';

  return {
    cleanup: () => {
      document.body.innerHTML = '';
    },
  };
}
