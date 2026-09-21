import { vi } from 'vitest';

vi.mock('@nx/angular/generators', () => ({
  libraryGenerator: vi.fn(),
}));

import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { addProjectConfiguration, joinPathFragments, readProjectConfiguration, Tree, updateJson } from '@nx/devkit';
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
    vi.clearAllMocks();
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
    expect(vi.mocked(angularGenerators.libraryGenerator).mock.calls[0][1].buildable).toBeUndefined();
  });

  it('forwards buildable from nx.json angular library defaults', async () => {
    // Arrange
    vi.spyOn(devkit, 'formatFiles').mockResolvedValue();
    updateJson(tree, 'nx.json', (nxJson) => {
      nxJson.generators = {
        ...(nxJson.generators ?? {}),
        '@nx/angular:library': { buildable: true },
      };
      return nxJson;
    });

    // Act
    await domainGenerator(tree, { name: 'booking' });

    // Assert
    expect(vi.mocked(angularGenerators.libraryGenerator).mock.calls[0][1].buildable).toBe(true);
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

  it('appends a domain-specific constraint in .eslintrc.json', async () => {
    // Arrange
    tree.delete('eslint.config.mjs');
    tree.write(
      '.eslintrc.json',
      JSON.stringify({
        overrides: [
          {
            files: ['*.ts'],
            rules: {
              '@nx/enforce-module-boundaries': [
                'error',
                {
                  depConstraints: [{ sourceTag: '*', onlyDependOnLibsWithTags: ['*'] }],
                },
              ],
            },
          },
        ],
      })
    );
    vi.spyOn(devkit, 'formatFiles').mockResolvedValue();

    // Act
    await domainGenerator(tree, { name: 'orders' });

    // Assert
    const updated = tree.read('.eslintrc.json', 'utf-8')?.replace(/\s+/g, '');
    expect(updated).toContain('"sourceTag":"domain:orders"');
    expect(updated).toContain('"onlyDependOnLibsWithTags":["domain:orders","domain:shared"]');
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
