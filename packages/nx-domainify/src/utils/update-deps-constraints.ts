import { Tree } from '@nx/devkit';
import { StringTransformer, tsquery } from '@phenomnomnominal/tsquery';

const CANDIDATES = ['eslint.config.ts', 'eslint.config.mts', 'eslint.config.mjs', 'eslint.config.js', 'eslint.config.cjs'];

export const updateDepsConstraints = (tree: Tree, stringTransformer: StringTransformer) => {
  const filePath = CANDIDATES.find((p) => tree.exists(p));
  if (!filePath) return;
  const eslintConfig = tree.read(filePath, 'utf-8');
  if (!eslintConfig) return;

  const updated = tsquery.replace(
    eslintConfig,
    `PropertyAssignment:has(StringLiteral[value="@nx/enforce-module-boundaries"]) ArrayLiteralExpression PropertyAssignment:has(Identifier[name="depConstraints"]) > ArrayLiteralExpression`,
    stringTransformer
  );

  tree.write(filePath, updated);
};
