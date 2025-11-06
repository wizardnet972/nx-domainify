import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, readProjectConfiguration } from '@nx/devkit';

import { initGenerator } from './init';
import { InitGeneratorSchema } from './schema';

describe('init generator', () => {
  let tree: Tree;
  const options: InitGeneratorSchema = {};

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await initGenerator(tree, options);
    const config = readProjectConfiguration(tree, 'test');
    expect(config).toBeDefined();
  });

  describe('add-dep-constraint generator with flat-config eslint.config.mjs', () => {
    let appTree: Tree;

    beforeEach(() => {
      appTree = createTreeWithEmptyWorkspace();
      // simulate realistic flat-config ESLint file
      const mjsContent = `import nx from '@nx/eslint-plugin';

export default [
  {
    files: ['**/*.json'],
    rules: {},
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?js$'],
          depConstraints: [],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    rules: {},
  },
];`;
      appTree.write('eslint.config.mjs', mjsContent);
    });

    it('should insert dep constraint into the enforce-module-boundaries rule', async () => {
      const options: AddDepConstraintSchema = {
        sourceTag: 'type:app',
        onlyDependOnLibsWithTags: ['type:api', 'type:feature', 'type:ui', 'type:domain-logic', 'type:util'],
      };

      await initGenerator(appTree, options);

      const updated = appTree.read('eslint.config.mjs', 'utf-8')!;
      // should add our constraint object inside depConstraints array
      expect(updated).toMatch(/depConstraints\s*:\s*\[\s*\{[\s\S]*sourceTag:\s*'type:app'/);
      expect(updated).toContain("onlyDependOnLibsWithTags: ['type:api','type:feature','type:ui','type:domain-logic','type:util']");
    });

    // it('should throw if no ESLint config file is found', async () => {
    //   const tree = createTreeWithEmptyWorkspace();
    //   await expect(initGenerator(tree, { sourceTag: 'type:app', onlyDependOnLibsWithTags: ['type:api'] })).rejects.toThrow(
    //     'No ESLint config file found'
    //   );
    // });
  });
});
