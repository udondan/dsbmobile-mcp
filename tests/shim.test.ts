import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '..');
const shimPath = path.resolve(root, 'bin', 'dsbmobile-mcp-server.js');
const packageJsonPath = path.resolve(root, 'package.json');

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

describe('package.json entry points', () => {
  test('bin points to the JS shim, not a .ts file', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const binEntry: unknown = packageJson?.bin?.['dsbmobile-mcp-server'];
    expect(typeof binEntry).toBe('string');
    expect(binEntry as string).not.toMatch(/\.ts$/);
    expect(binEntry as string).toMatch(/\.js$/);
  });

  test('bin entry file exists', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const binEntry = packageJson?.bin?.['dsbmobile-mcp-server'] as string;
    const binFile = path.resolve(root, binEntry);
    expect(existsSync(binFile)).toBe(true);
  });

  test('main field is not present (CLI-only package)', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(packageJson.main).toBeUndefined();
  });
});

describe('shim file', () => {
  test('shim file exists at bin/dsbmobile-mcp-server.js', () => {
    expect(existsSync(shimPath)).toBe(true);
  });

  test('shim has #!/usr/bin/env node shebang', () => {
    const content = readFileSync(shimPath, 'utf8');
    expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
  });

  test('shim is valid JavaScript (no TypeScript syntax)', () => {
    const content = readFileSync(shimPath, 'utf8');
    // Should not contain TypeScript-specific syntax like type annotations or interfaces
    expect(content).not.toMatch(/:\s*(string|number|boolean|void|unknown|any)\b/);
    expect(content).not.toMatch(/^interface\s+/m);
    expect(content).not.toMatch(/^type\s+\w+\s*=/m);
  });

  test('shim references src/index.ts as the target', () => {
    const content = readFileSync(shimPath, 'utf8');
    // The shim may reference the path as a combined string or as separate resolve() arguments
    const hasSourceIndexTs =
      content.includes('src/index.ts') ||
      (content.includes("'src'") && content.includes("'index.ts'")) ||
      (content.includes('"src"') && content.includes('"index.ts"'));
    expect(hasSourceIndexTs).toBe(true);
  });

  test('shim invokes bun to run the TypeScript entry point', () => {
    const content = readFileSync(shimPath, 'utf8');
    expect(content).toMatch(/bun/);
  });

  test('shim uses __dirname or import.meta to resolve path (not hardcoded absolute path)', () => {
    const content = readFileSync(shimPath, 'utf8');
    const hasRelativeResolution =
      content.includes('__dirname') ||
      content.includes('import.meta') ||
      content.includes('fileURLToPath') ||
      content.includes('path.resolve') ||
      content.includes('resolve(');
    expect(hasRelativeResolution).toBe(true);
  });

  test('shim can be executed by node without ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING', () => {
    // Run node --check on the shim to verify it parses as valid JS without type errors
    const result = spawnSync('node', ['--check', shimPath], {
      encoding: 'utf8',
      timeout: 5000,
    });
    expect(result.stderr ?? '').not.toMatch(/ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING/);
    expect(result.status).toBe(0);
  });
});
