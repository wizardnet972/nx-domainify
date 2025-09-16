import { Tree } from '@nx/devkit';
import { StringTransformer, tsquery } from '@phenomnomnominal/tsquery';

export const updateDepsConstraints = (tree: Tree, stringTransformer: StringTransformer) => {
  const eslintConfigPath = 'eslint.config.mjs';

  const eslintConfig = tree.read(eslintConfigPath, 'utf-8');
  if (!eslintConfig) {
    throw new Error('No ESLint config file found');
  }

  const updated = tsquery.replace(
    eslintConfig,
    `PropertyAssignment:has(StringLiteral[value="@nx/enforce-module-boundaries"]) ArrayLiteralExpression PropertyAssignment:has(Identifier[name="depConstraints"]) > ArrayLiteralExpression`,
    stringTransformer
  );

  tree.write(eslintConfigPath, updated);
};
