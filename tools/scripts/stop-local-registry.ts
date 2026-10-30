/**
 * This script stops the local registry for e2e testing purposes.
 * It is meant to be called in jest's globalTeardown.
 */

/// <reference path="registry.d.ts" />

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

export default () => {
  if (global.stopLocalRegistry) {
    global.stopLocalRegistry();
  }

  const version = global.__nxDomainifyOriginalVersion;
  if (!version) {
    return;
  }

  for (const file of [
    join(workspaceRoot, 'packages/nx-domainify/package.json'),
    join(workspaceRoot, 'dist/packages/nx-domainify/package.json'),
  ]) {
    if (!existsSync(file)) {
      continue;
    }
    const manifest = JSON.parse(readFileSync(file, 'utf-8'));
    manifest.version = version;
    writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
  }
};
