import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree } from '@nx/devkit';

import { getProjectImportPathOrThrow } from './get-project-import-path';

describe('getProjectImportPathOrThrow', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('uses the project package.json name', () => {
    // Arrange
    tree.write('libs/booking/domain/package.json', JSON.stringify({ name: '@acme/booking-domain' }));

    // Act
    const importPath = getProjectImportPathOrThrow(tree, 'libs/booking/domain', 'booking-domain');

    // Assert
    expect(importPath).toBe('@acme/booking-domain');
  });

  it('falls back to a tsconfig paths mapping', () => {
    // Arrange
    tree.write(
      'tsconfig.base.json',
      JSON.stringify({
        compilerOptions: {
          paths: {
            'booking-domain': ['./libs/booking/domain/src/index.ts'],
          },
        },
      })
    );

    // Act
    const importPath = getProjectImportPathOrThrow(tree, 'libs/booking/domain', 'booking-domain');

    // Assert
    expect(importPath).toBe('booking-domain');
  });

  it('throws when no package name or tsconfig mapping exists', () => {
    // Arrange
    tree.write('tsconfig.base.json', JSON.stringify({ compilerOptions: { paths: {} } }));

    // Act / Assert
    expect(() => getProjectImportPathOrThrow(tree, 'libs/booking/domain', 'booking-domain')).toThrow(
      /Could not determine the import path for "booking-domain"/
    );
  });
});
