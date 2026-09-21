import { Tree } from '@nx/devkit';
import { StringTransformer, tsquery } from '@phenomnomnominal/tsquery';
import { parse } from 'json5';

const JS_CANDIDATES = [
  'eslint.config.ts',
  'eslint.config.mts',
  'eslint.config.mjs',
  'eslint.config.js',
  'eslint.config.cjs',
  '.eslintrc.js',
  '.eslintrc.cjs',
];

const JSON_CANDIDATES = ['.eslintrc.json'];

export const updateDepsConstraints = (tree: Tree, stringTransformer: StringTransformer) => {
  const jsConfig = JS_CANDIDATES.find((path) => tree.exists(path));
  if (jsConfig) {
    const eslintConfig = tree.read(jsConfig, 'utf-8');
    if (!eslintConfig) return;

    const updated = tsquery.replace(
      eslintConfig,
      `PropertyAssignment:has(StringLiteral[value="@nx/enforce-module-boundaries"]) ArrayLiteralExpression PropertyAssignment:has(Identifier[name="depConstraints"]) > ArrayLiteralExpression`,
      stringTransformer
    );

    tree.write(jsConfig, updated);
    return;
  }

  const jsonConfig = JSON_CANDIDATES.find((path) => tree.exists(path));
  if (!jsonConfig) return;

  const eslintConfig = tree.read(jsonConfig, 'utf-8');
  if (!eslintConfig) return;

  let changed = false;
  const updated = replaceDepConstraints(parse(eslintConfig), (current) => {
    changed = true;
    return parse(stringTransformer(textNode(current)));
  });

  if (changed) {
    tree.write(jsonConfig, `${JSON.stringify(updated, null, 2)}\n`);
  }
};

function replaceDepConstraints(value: unknown, update: (current: unknown[]) => unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => replaceDepConstraints(item, update));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;
  if (Array.isArray(record.depConstraints)) {
    return { ...record, depConstraints: update(record.depConstraints) };
  }

  return Object.fromEntries(Object.entries(record).map(([key, nested]) => [key, replaceDepConstraints(nested, update)]));
}

function textNode(value: unknown[]) {
  return { getText: () => JSON.stringify(value) } as Parameters<StringTransformer>[0];
}
