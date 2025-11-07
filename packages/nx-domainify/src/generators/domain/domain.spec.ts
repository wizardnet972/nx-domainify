import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { readProjectConfiguration, Tree } from '@nx/devkit';
import * as devkit from '@nx/devkit';
import { vi } from 'vitest';

import { domainGenerator } from './domain';

const ESLINT_CONFIG = `import nx from '@nx/eslint-plugin';

export default [
  {
    files: ['**/*.ts'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
];
`;

describe('domainGenerator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    tree.write('eslint.config.mjs', ESLINT_CONFIG);
    vi.restoreAllMocks();
  });

  it('creates a domain library with the expected configuration', async () => {
    // Arrange
    const options = { name: 'booking' } as const;
    vi.spyOn(devkit, 'formatFiles').mockResolvedValue();

    // Act
    await domainGenerator(tree, options);

    // Assert
    const project = readProjectConfiguration(tree, 'booking-domain');
    expect(project.root).toBe('booking/domain');
    expect(project.tags).toContain('type:domain-logic');
    expect(project.tags).toContain('domain:booking');
    expect(tree.exists('booking/domain/src/lib/application/.gitkeep')).toBe(true);
    expect(tree.exists('booking/domain/src/lib/entities/.gitkeep')).toBe(true);
    expect(tree.exists('booking/domain/src/lib/infrastructure/.gitkeep')).toBe(true);
  });

  it('appends a domain-specific dependency constraint', async () => {
    // Arrange
    vi.spyOn(devkit, 'formatFiles').mockResolvedValue();

    // Act
    await domainGenerator(tree, { name: 'support' });

    // Assert
    const updated = tree.read('eslint.config.mjs', 'utf-8')?.replace(/\s+/g, '');
    expect(updated).toContain('"sourceTag":"domain:support"');
    expect(updated).toContain('"onlyDependOnLibsWithTags":["type:domain-logic","domain:support"]');
  });

  it('formats files when generation completes', async () => {
    // Arrange
    const formatSpy = vi.spyOn(devkit, 'formatFiles').mockResolvedValue();

    // Act
    await domainGenerator(tree, { name: 'shared' });

    // Assert
    expect(formatSpy).toHaveBeenCalledWith(tree);
  });
});
