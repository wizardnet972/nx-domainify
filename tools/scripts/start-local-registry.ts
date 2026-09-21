/**
 * This script starts a local registry for e2e testing purposes.
 * It is meant to be called in jest's globalSetup.
 */

/// <reference path="registry.d.ts" />

import { readFileSync } from 'node:fs';
import { startLocalRegistry } from '@nx/js/plugins/jest/local-registry';
import { releasePublish, releaseVersion } from 'nx/release';

export default async () => {
  const localRegistryTarget = '@nx-domainify/source:local-registry';
  const storage = './tmp/local-registry/storage';
  const manifest = 'packages/nx-domainify/package.json';

  global.__nxDomainifyOriginalVersion = JSON.parse(readFileSync(manifest, 'utf-8')).version;

  global.stopLocalRegistry = await startLocalRegistry({
    localRegistryTarget,
    storage,
    verbose: false,
  });

  await releaseVersion({
    specifier: '0.0.0-e2e',
    stageChanges: false,
    gitCommit: false,
    gitTag: false,
    firstRelease: true,
    versionActionsOptionsOverrides: {
      skipLockFileUpdate: true,
    },
  });
  await releasePublish({
    tag: 'e2e',
    firstRelease: true,
  });
};
