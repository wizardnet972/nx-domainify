import { joinPathFragments, readJson, Tree } from '@nx/devkit';

export function getProjectImportPathOrThrow(tree: Tree, projectRoot: string, projectName?: string): string {
  const packageJsonPath = joinPathFragments(projectRoot, 'package.json');

  if (tree.exists(packageJsonPath)) {
    const { name } = readJson<{ name?: string }>(tree, packageJsonPath);
    if (name?.trim()) {
      return name.trim();
    }
  }

  const importPathFromTsconfig = findImportPathInTsconfig(tree, projectRoot);
  if (importPathFromTsconfig) {
    return importPathFromTsconfig;
  }

  const label = projectName ?? projectRoot;
  throw new Error(
    `Could not determine the import path for "${label}". Add a package.json "name" on that project or a tsconfig paths mapping.`
  );
}

function findImportPathInTsconfig(tree: Tree, projectRoot: string): string | undefined {
  const candidates = ['tsconfig.base.json', 'tsconfig.json'];
  const normalizedRoot = normalizePath(projectRoot);

  for (const file of candidates) {
    if (!tree.exists(file)) {
      continue;
    }

    const tsconfig = readJson<{ compilerOptions?: { paths?: Record<string, string[]> } }>(tree, file);
    const paths = tsconfig.compilerOptions?.paths ?? {};

    for (const [importPath, mappings] of Object.entries(paths)) {
      const matches = (mappings ?? []).some((mapping) => {
        const normalized = normalizePath(mapping);
        return normalized === normalizedRoot || normalized.startsWith(`${normalizedRoot}/`);
      });

      if (matches) {
        return importPath;
      }
    }
  }

  return undefined;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.?\//, '').replace(/\/$/, '');
}
