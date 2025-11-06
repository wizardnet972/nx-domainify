import { readJson, Tree } from '@nx/devkit';

export function getNpmScope(tree: Tree): string | undefined {
  const { name } = tree.exists('package.json') ? readJson<{ name?: string }>(tree, 'package.json') : { name: null };

  if (name?.startsWith('@')) {
    return name.split('/')[0].substring(1);
  }

  return;
}
