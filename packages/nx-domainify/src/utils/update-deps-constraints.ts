import { Tree } from '@nx/devkit';
import { StringTransformer, tsquery } from '@phenomnomnominal/tsquery';
import { parse } from 'json5';

const ESLINT_SCRIPT_CANDIDATES = [
  'eslint.config.ts',
  'eslint.config.mts',
  'eslint.config.mjs',
  'eslint.config.js',
  'eslint.config.cjs',
  '.eslintrc.js',
  '.eslintrc.cjs',
];

const OXLINT_SCRIPT_CANDIDATES = ['oxlint.config.ts', 'oxlint.config.mts'];

const ESLINT_JSON_CANDIDATES = ['.eslintrc.json'];

const OXLINT_JSON_CANDIDATES = ['.oxlintrc.json', '.oxlintrc.jsonc'];

const OXLINT_CONFIGS = [...OXLINT_SCRIPT_CANDIDATES, ...OXLINT_JSON_CANDIDATES];

const BOUNDARY_RULES = ['@nx/enforce-module-boundaries', 'boundaries/enforce-module-boundaries'];

const OXLINT_BOUNDARIES_PLUGIN = '@nx/oxlint/boundaries-plugin';

export type UpdateDepsConstraintsOptions = {
  /** Add the Nx Oxlint boundaries rule when a root Oxlint config has none. */
  ensureOxlintRule?: boolean;
};

export const updateDepsConstraints = (tree: Tree, stringTransformer: StringTransformer, options: UpdateDepsConstraintsOptions = {}) => {
  if (OXLINT_CONFIGS.some((configPath) => tree.exists(configPath))) {
    for (const configPath of OXLINT_SCRIPT_CANDIDATES) {
      updateScriptConfig(tree, configPath, stringTransformer);
    }
    for (const configPath of OXLINT_JSON_CANDIDATES) {
      updateJsonConfig(tree, configPath, stringTransformer, options.ensureOxlintRule ?? false);
    }
    return;
  }

  for (const configPath of ESLINT_SCRIPT_CANDIDATES) {
    updateScriptConfig(tree, configPath, stringTransformer);
  }
  for (const configPath of ESLINT_JSON_CANDIDATES) {
    updateJsonConfig(tree, configPath, stringTransformer, false);
  }
};

function updateScriptConfig(tree: Tree, configPath: string, stringTransformer: StringTransformer) {
  if (!tree.exists(configPath)) return;

  const source = tree.read(configPath, 'utf-8');
  if (!source) return;

  const updated = BOUNDARY_RULES.reduce(
    (current, ruleName) =>
      tsquery.replace(
        current,
        `PropertyAssignment:has(StringLiteral[value="${ruleName}"]) ArrayLiteralExpression PropertyAssignment:has(Identifier[name="depConstraints"]) > ArrayLiteralExpression`,
        stringTransformer
      ),
    source
  );

  if (updated !== source) {
    tree.write(configPath, updated);
  }
}

function updateJsonConfig(tree: Tree, configPath: string, stringTransformer: StringTransformer, ensureOxlintRule: boolean) {
  if (!tree.exists(configPath)) return;

  const source = tree.read(configPath, 'utf-8');
  if (!source) return;

  const apply = (current: unknown[]) => parse(stringTransformer(textNode(current)));
  const { result, changed, updates } = replaceBoundaryDepConstraints(parse(source), apply);

  if (changed) {
    const next = replaceConstraintArrays(source, updates) ?? `${JSON.stringify(result, null, 2)}\n`;
    if (next !== source) tree.write(configPath, next);
    return;
  }

  if (!ensureOxlintRule) return;

  const config = result as Record<string, unknown>;
  if (!ensureOxlintBoundaries(config, apply([]))) return;

  const next = `${JSON.stringify(config, null, 2)}\n`;
  if (next !== source) tree.write(configPath, next);
}

function replaceBoundaryDepConstraints(value: unknown, update: (current: unknown[]) => unknown) {
  let changed = false;
  const updates: unknown[] = [];

  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      return node.map(walk);
    }

    if (!node || typeof node !== 'object') {
      return node;
    }

    const record = node as Record<string, unknown>;
    const next: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(record)) {
      const constraints = boundaryDepConstraints(key, nested);
      if (constraints) {
        changed = true;
        const nextConstraints = update(constraints);
        updates.push(nextConstraints);
        next[key] = withDepConstraints(nested as unknown[], nextConstraints);
        continue;
      }

      next[key] = walk(nested);
    }

    return next;
  };

  return { result: walk(value), changed, updates };
}

function replaceConstraintArrays(source: string, constraints: unknown[]) {
  const spans = constraintSpans(source);
  if (spans.length !== constraints.length) return;

  return spans.reduceRight((current, span, index) => {
    const indent = lineIndent(current, span.start);
    return current.slice(0, span.start) + formatJson(constraints[index], indent) + current.slice(span.end);
  }, source);
}

function constraintSpans(source: string) {
  const spans: { start: number; end: number }[] = [];
  const ruleName = /["'](?:@nx\/enforce-module-boundaries|boundaries\/enforce-module-boundaries)["']/g;

  for (const match of source.matchAll(ruleName)) {
    const rule = arrayAfter(source, (match.index ?? 0) + match[0].length);
    if (!rule) continue;

    const body = source.slice(rule.start, rule.end);
    const key = /["']depConstraints["']/.exec(body);
    if (!key || key.index === undefined) continue;

    const constraints = arrayAfter(source, rule.start + key.index + key[0].length);
    if (constraints) spans.push(constraints);
  }

  return spans;
}

function arrayAfter(source: string, from: number) {
  let index = from;
  while (index < source.length && /\s/.test(source[index])) index++;
  if (source[index] === ':') {
    index++;
    while (index < source.length && /\s/.test(source[index])) index++;
  }
  if (source[index] !== '[') return;

  const end = matchingBracket(source, index);
  return end === undefined ? undefined : { start: index, end };
}

function matchingBracket(source: string, open: number) {
  let depth = 0;
  let stringQuote: string | undefined;

  for (let index = open; index < source.length; index++) {
    const char = source[index];
    const next = source[index + 1];

    if (stringQuote) {
      if (char === '\\') {
        index++;
        continue;
      }
      if (char === stringQuote) stringQuote = undefined;
      continue;
    }

    if (char === '"' || char === "'") {
      stringQuote = char;
      continue;
    }

    if (char === '/' && next === '/') {
      const newline = source.indexOf('\n', index);
      index = newline === -1 ? source.length : newline;
      continue;
    }

    if (char === '/' && next === '*') {
      const close = source.indexOf('*/', index + 2);
      index = close === -1 ? source.length : close + 1;
      continue;
    }

    if (char === '[' || char === '{') depth++;
    if (char === ']' || char === '}') {
      depth--;
      if (depth === 0) return index + 1;
    }
  }

  return undefined;
}

function lineIndent(source: string, index: number) {
  const lineStart = source.lastIndexOf('\n', index - 1) + 1;
  return source.slice(lineStart, index).match(/^\s*/)?.[0] ?? '';
}

function formatJson(value: unknown, indent: string) {
  return JSON.stringify(value, null, 2)
    .split('\n')
    .map((line, index) => (index === 0 ? line : `${indent}${line}`))
    .join('\n');
}

function boundaryDepConstraints(key: string, value: unknown) {
  if (!BOUNDARY_RULES.includes(key) || !Array.isArray(value)) return;

  const options = value[1];
  if (!options || typeof options !== 'object' || Array.isArray(options)) return;

  const constraints = (options as { depConstraints?: unknown }).depConstraints;
  return Array.isArray(constraints) ? constraints : undefined;
}

function withDepConstraints(rule: unknown[], depConstraints: unknown) {
  const [severity, options, ...rest] = rule;
  return [severity, { ...(options as Record<string, unknown>), depConstraints }, ...rest];
}

function ensureOxlintBoundaries(config: Record<string, unknown>, depConstraints: unknown) {
  if (fillMissingDepConstraints(config, depConstraints)) return true;
  if (hasCustomBoundariesPlugin(config.jsPlugins)) return false;

  insertJsPlugin(config, OXLINT_BOUNDARIES_PLUGIN);
  const rules = recordValue(config, 'rules');
  rules['@nx/enforce-module-boundaries'] = [
    'error',
    {
      enforceBuildableLibDependency: true,
      allow: [],
      depConstraints,
    },
  ];
  return true;
}

function fillMissingDepConstraints(value: unknown, depConstraints: unknown) {
  let found = false;

  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    if (!node || typeof node !== 'object') return;

    const record = node as Record<string, unknown>;
    for (const [key, nested] of Object.entries(record)) {
      if (BOUNDARY_RULES.includes(key)) {
        found = true;
        if (Array.isArray(nested)) {
          const options = nested[1];
          const hasConstraints =
            !!options &&
            typeof options === 'object' &&
            !Array.isArray(options) &&
            Array.isArray((options as { depConstraints?: unknown }).depConstraints);
          if (!hasConstraints && options && typeof options === 'object' && !Array.isArray(options)) {
            (options as { depConstraints?: unknown }).depConstraints = depConstraints;
          } else if (nested.length === 1) {
            nested.push({ depConstraints });
          }
        }
        continue;
      }

      walk(nested);
    }
  };

  walk(value);
  return found;
}

function hasCustomBoundariesPlugin(jsPlugins: unknown) {
  if (!Array.isArray(jsPlugins)) return false;

  return jsPlugins.some((plugin) => {
    if (plugin === OXLINT_BOUNDARIES_PLUGIN) return false;
    if (typeof plugin === 'string') return plugin.includes('boundaries');
    if (!plugin || typeof plugin !== 'object') return false;

    const record = plugin as { name?: unknown; specifier?: unknown };
    return String(record.name ?? '').includes('boundaries') || String(record.specifier ?? '').includes('boundaries');
  });
}

function insertJsPlugin(config: Record<string, unknown>, plugin: string) {
  const plugins = Array.isArray(config.jsPlugins) ? [...config.jsPlugins] : [];
  if (!plugins.includes(plugin)) {
    plugins.push(plugin);
  }

  if (Array.isArray(config.jsPlugins)) {
    config.jsPlugins = plugins;
    return;
  }

  const next: Record<string, unknown> = {};
  let inserted = false;
  for (const [key, value] of Object.entries(config)) {
    next[key] = value;
    if (key === 'plugins') {
      next.jsPlugins = plugins;
      inserted = true;
    }
  }

  if (!inserted) {
    next.jsPlugins = plugins;
  }

  for (const key of Object.keys(config)) {
    delete config[key];
  }

  Object.assign(config, next);
}

function recordValue(record: Record<string, unknown>, key: string) {
  const current = record[key];
  if (current && typeof current === 'object' && !Array.isArray(current)) {
    return current as Record<string, unknown>;
  }

  const created: Record<string, unknown> = {};
  record[key] = created;
  return created;
}

function textNode(value: unknown[]) {
  return { getText: () => JSON.stringify(value) } as Parameters<StringTransformer>[0];
}
