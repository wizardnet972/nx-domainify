import { vi } from 'vitest';

vi.mock('@nx/angular/generators', () => ({
  libraryGenerator: vi.fn(),
}));

import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { addProjectConfiguration, joinPathFragments, readProjectConfiguration, Tree } from '@nx/devkit';
import * as devkit from '@nx/devkit';
import * as angularGenerators from '@nx/angular/generators';

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
    vi.mocked(angularGenerators.libraryGenerator).mockImplementation(async (host, options: any) => {
      const tags =
        typeof options.tags === 'string'
          ? options.tags
              .split(',')
              .map((tag: string) => tag.trim())
              .filter(Boolean)
          : [];

      addProjectConfiguration(host, options.name, {
        name: options.name,
        root: options.directory,
        sourceRoot: joinPathFragments(options.directory, 'src'),
        projectType: 'library',
        targets: {},
        tags,
      });

      host.write(joinPathFragments(options.directory, 'src', 'index.ts'), 'export {}');
      host.write(joinPathFragments(options.directory, 'src', 'lib', `${options.name}`, '.gitkeep'), ' ');

      return () => Promise.resolve();
    });
  });

  it('creates a domain library with the expected configuration', async () => {
    // Arrange
    const options = { name: 'booking' } as const;
    vi.spyOn(devkit, 'formatFiles').mockResolvedValue();
    vi.spyOn(devkit, 'getWorkspaceLayout').mockReturnValue({ libsDir: 'libs', appsDir: 'apps', standaloneAsDefault: false });

    // Act
    await domainGenerator(tree, options);

    // Assert
    const project = readProjectConfiguration(tree, 'booking-domain');
    expect(project.root).toBe('libs/booking/domain');
    expect(project.tags).toContain('type:domain-logic');
    expect(project.tags).toContain('domain:booking');
    expect(tree.exists('libs/booking/domain/src/lib/application/.gitkeep')).toBe(true);
    expect(tree.exists('libs/booking/domain/src/lib/entities/.gitkeep')).toBe(true);
    expect(tree.exists('libs/booking/domain/src/lib/infrastructure/.gitkeep')).toBe(true);
  });

  it('appends a domain-specific dependency constraint', async () => {
    // Arrange
    vi.spyOn(devkit, 'formatFiles').mockResolvedValue();

    // Act
    await domainGenerator(tree, { name: 'support' });

    // Assert
    const updated = tree.read('eslint.config.mjs', 'utf-8')?.replace(/\s+/g, '');
    expect(updated).toContain('"sourceTag":"domain:support"');
    expect(updated).toContain('"onlyDependOnLibsWithTags":["domain:support","domain:shared"]');
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
