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
