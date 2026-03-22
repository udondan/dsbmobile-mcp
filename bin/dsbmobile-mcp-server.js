#!/usr/bin/env node
// Shim: invokes bun to run the TypeScript entry point.
// This file exists so that Node.js (used by bunx/npx) can execute the package
// without hitting ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING.
/* eslint-disable no-undef */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entry = path.resolve(__dirname, '..', 'src', 'index.ts');

const result = spawnSync('bun', [entry, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  if (result.error.code === 'ENOENT') {
    console.error('Error: bun is not installed or not in PATH. Please install bun: https://bun.sh');
  } else {
    console.error('Error:', result.error.message);
  }

  process.exit(1);
}

process.exit(result.status ?? 1);
