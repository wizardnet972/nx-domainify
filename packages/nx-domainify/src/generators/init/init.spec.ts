import { vi } from 'vitest';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree } from '@nx/devkit';
import * as devkit from '@nx/devkit';

import { initGenerator } from './init';

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

describe('initGenerator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    vi.restoreAllMocks();
  });

  it('updates depConstraints in eslint config', async () => {
    // Arrange
    tree.write('eslint.config.mjs', ESLINT_CONFIG);

    // Act
    await initGenerator(tree, { skipFormat: true });

    // Assert
    const updated = tree.read('eslint.config.mjs', 'utf-8');
    expect(updated).not.toContain("sourceTag: '*'");
    expect(updated).toContain('"sourceTag": "domain:shared"');
  });

  it('installs the AI skill for Cursor and Claude', async () => {
    // Arrange
    tree.write('eslint.config.mjs', ESLINT_CONFIG);

    // Act
    await initGenerator(tree, { skipFormat: true });

    // Assert
    const cursorSkill = tree.read('.cursor/skills/nx-domainify-generate/SKILL.md', 'utf-8');
    const claudeSkill = tree.read('.claude/skills/nx-domainify-generate/SKILL.md', 'utf-8');
    expect(cursorSkill).toContain('npx nx g nx-domainify:');
    expect(cursorSkill).toContain('--help');
    expect(claudeSkill).toBe(cursorSkill);
  });

  it('formats files when skipFormat is not set', async () => {
    // Arrange
    vi.spyOn(devkit, 'formatFiles').mockResolvedValue();
    tree.write('eslint.config.mjs', ESLINT_CONFIG);

    // Act
    await initGenerator(tree, {});

    // Assert
    expect(devkit.formatFiles).toHaveBeenCalledWith(tree);
  });

  it('updates depConstraints in .eslintrc.json', async () => {
    // Arrange
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

    // Act
    await initGenerator(tree, { skipFormat: true });

    // Assert
    const updated = tree.read('.eslintrc.json', 'utf-8');
    expect(updated).not.toContain('"sourceTag": "*"');
    expect(updated).toContain('"sourceTag": "domain:shared"');
  });

  it('updates Oxlint depConstraints without rewriting the rest of the config', async () => {
    // Arrange
    const source = `{
  "plugins": ["typescript"],
  "rules": {
    "no-console": ["error", { "allow": ["warn", "error"] }],
    "boundaries/enforce-module-boundaries": [
      "error",
      {
        "enforceBuildableLibDependency": true,
        "depConstraints": [{ "sourceTag": "*", "onlyDependOnLibsWithTags": ["*"] }]
      }
    ]
  }
}
`;
    tree.write('.oxlintrc.json', source);

    // Act
    await initGenerator(tree, { skipFormat: true });

    // Assert
    const updated = tree.read('.oxlintrc.json', 'utf-8') ?? '';
    expect(updated).toContain('"no-console": ["error", { "allow": ["warn", "error"] }]');
    expect(updated).toContain('"enforceBuildableLibDependency": true');
    expect(updated).toContain('"sourceTag": "domain:shared"');
    expect(updated).not.toContain('"sourceTag": "*"');
  });

  it('updates depConstraints in an Oxlint config that already enforces boundaries', async () => {
    // Arrange
    tree.write(
      '.oxlintrc.json',
      JSON.stringify({
        jsPlugins: ['./tools/oxlint/boundaries.mjs'],
        rules: {
          'no-console': 'error',
          'boundaries/enforce-module-boundaries': [
            'error',
            {
              enforceBuildableLibDependency: true,
              depConstraints: [{ sourceTag: '*', onlyDependOnLibsWithTags: ['*'] }],
            },
          ],
        },
      })
    );

    // Act
    await initGenerator(tree, { skipFormat: true });

    // Assert
    const updated = JSON.parse(tree.read('.oxlintrc.json', 'utf-8') ?? '{}');
    expect(updated.jsPlugins).toEqual(['./tools/oxlint/boundaries.mjs']);
    expect(updated.rules['no-console']).toBe('error');
    expect(updated.rules['@nx/enforce-module-boundaries']).toBeUndefined();
    expect(updated.rules['boundaries/enforce-module-boundaries'][1].enforceBuildableLibDependency).toBe(true);
    expect(updated.rules['boundaries/enforce-module-boundaries'][1].depConstraints).toEqual(
      expect.arrayContaining([expect.objectContaining({ sourceTag: 'domain:shared' })])
    );
    expect(updated.rules['boundaries/enforce-module-boundaries'][1].depConstraints).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ sourceTag: '*' })])
    );
  });

  it('adds the Nx Oxlint boundaries rule when the root config has none', async () => {
    // Arrange
    tree.write(
      '.oxlintrc.json',
      JSON.stringify({
        $schema: './node_modules/oxlint/configuration_schema.json',
        plugins: ['typescript', 'unicorn', 'oxc'],
        categories: { correctness: 'error' },
        rules: {},
        env: { builtin: true },
      })
    );

    // Act
    await initGenerator(tree, { skipFormat: true });

    // Assert
    const updated = JSON.parse(tree.read('.oxlintrc.json', 'utf-8') ?? '{}');
    expect(updated.plugins).toEqual(['typescript', 'unicorn', 'oxc']);
    expect(updated.jsPlugins).toEqual(['@nx/oxlint/boundaries-plugin']);
    expect(updated.rules['@nx/enforce-module-boundaries'][0]).toBe('error');
    expect(updated.rules['@nx/enforce-module-boundaries'][1].enforceBuildableLibDependency).toBe(true);
    expect(updated.rules['@nx/enforce-module-boundaries'][1].depConstraints).toEqual(
      expect.arrayContaining([expect.objectContaining({ sourceTag: 'type:app' }), expect.objectContaining({ sourceTag: 'domain:shared' })])
    );
  });

  it('fills depConstraints on an existing Nx Oxlint rule without duplicating the plugin', async () => {
    // Arrange
    tree.write(
      '.oxlintrc.json',
      JSON.stringify({
        jsPlugins: ['@nx/oxlint/boundaries-plugin'],
        rules: {
          '@nx/enforce-module-boundaries': ['error', { allow: [] }],
        },
      })
    );

    // Act
    await initGenerator(tree, { skipFormat: true });

    // Assert
    const updated = JSON.parse(tree.read('.oxlintrc.json', 'utf-8') ?? '{}');
    expect(updated.jsPlugins).toEqual(['@nx/oxlint/boundaries-plugin']);
    expect(updated.rules['@nx/enforce-module-boundaries'][1].allow).toEqual([]);
    expect(updated.rules['@nx/enforce-module-boundaries'][1].depConstraints).toEqual(
      expect.arrayContaining([expect.objectContaining({ sourceTag: 'type:ui' })])
    );
  });

  it('updates depConstraints in oxlint.config.ts', async () => {
    // Arrange
    tree.write(
      'oxlint.config.ts',
      `export default {
        rules: {
          '@nx/enforce-module-boundaries': [
            'error',
            {
              depConstraints: [{ sourceTag: '*', onlyDependOnLibsWithTags: ['*'] }],
            },
          ],
        },
      };
      `
    );

    // Act
    await initGenerator(tree, { skipFormat: true });

    // Assert
    const updated = tree.read('oxlint.config.ts', 'utf-8');
    expect(updated).toContain('"sourceTag": "domain:shared"');
    expect(updated).not.toContain("sourceTag: '*'");
  });

  it('follows Oxlint and leaves ESLint unchanged when both configs exist', async () => {
    // Arrange
    tree.write('eslint.config.mjs', ESLINT_CONFIG);
    tree.write(
      '.oxlintrc.json',
      JSON.stringify({
        plugins: ['typescript'],
        categories: { correctness: 'error' },
        rules: {},
      })
    );

    // Act
    await initGenerator(tree, { skipFormat: true });

    // Assert
    expect(tree.read('eslint.config.mjs', 'utf-8')).toBe(ESLINT_CONFIG);
    const oxlint = JSON.parse(tree.read('.oxlintrc.json', 'utf-8') ?? '{}');
    expect(oxlint.jsPlugins).toEqual(['@nx/oxlint/boundaries-plugin']);
    expect(oxlint.rules['@nx/enforce-module-boundaries'][1].depConstraints).toEqual(
      expect.arrayContaining([expect.objectContaining({ sourceTag: 'domain:shared' })])
    );
  });

  it('skips formatting when skipFormat is true', async () => {
    // Arrange
    vi.spyOn(devkit, 'formatFiles').mockResolvedValue();
    tree.write('eslint.config.mjs', ESLINT_CONFIG);

    // Act
    await initGenerator(tree, { skipFormat: true });

    // Assert
    expect(devkit.formatFiles).not.toHaveBeenCalled();
  });
});
