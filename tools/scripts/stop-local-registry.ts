/**
 * This script stops the local registry for e2e testing purposes.
 * It is meant to be called in jest's globalTeardown.
 */

/// <reference path="registry.d.ts" />

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export default () => {
  if (global.stopLocalRegistry) {
    global.stopLocalRegistry();
  }

  const version = global.__nxDomainifyOriginalVersion;
  if (!version) {
    return;
  }

  for (const file of ['packages/nx-domainify/package.json', 'dist/packages/nx-domainify/package.json']) {
    if (!existsSync(file)) {
      continue;
    }
    const manifest = JSON.parse(readFileSync(file, 'utf-8'));
    manifest.version = version;
    writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
  }
};
