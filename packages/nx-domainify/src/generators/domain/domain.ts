import { formatFiles, getWorkspaceLayout, installPackagesTask, joinPathFragments, names, readNxJson, Tree } from '@nx/devkit';
import { DomainGeneratorSchema } from './schema';
import { updateDepsConstraints } from '../../utils/update-deps-constraints';
import { parse } from 'json5';

const normalizeOptions = (tree: Tree, options: DomainGeneratorSchema) => {
  const { libsDir } = getWorkspaceLayout(tree);
  const name = names(options.name).fileName.replace(/-domain$/g, '');
  const directory = joinPathFragments(libsDir, names(options.directory ?? '')?.fileName, name, 'domain');
  return { name, directory };
};

export async function domainGenerator(tree: Tree, options: DomainGeneratorSchema) {
  const { name, directory } = normalizeOptions(tree, options);
  const suffix = 'domain';

  const { libraryGenerator } = await import('@nx/angular/generators');
  await libraryGenerator(tree, {
    ...(readNxJson(tree)?.generators?.['@nx/angular:library'] || {}),
    ...options,
    name: `${name}-${suffix}`,
    directory,
    buildable: true,
    prefix: `${name}-${suffix}`,
    tags: `domain:${name},type:domain-logic`,
  });

  tree.delete(joinPathFragments(directory, 'src', 'lib', `${name}-${suffix}`));

  tree.write(joinPathFragments(directory, 'src', 'index.ts'), 'export {}');
  tree.write(joinPathFragments(directory, 'src', 'lib', 'application', '.gitkeep'), ' ');
  tree.write(joinPathFragments(directory, 'src', 'lib', 'entities', '.gitkeep'), ' ');
  tree.write(joinPathFragments(directory, 'src', 'lib', 'infrastructure', '.gitkeep'), ' ');

  updateDepsConstraints(tree, (node) => {
    const value = parse(node.getText());
    return JSON.stringify([{ sourceTag: `domain:${name}`, onlyDependOnLibsWithTags: [`domain:${name}`, 'domain:shared'] }, ...value]);
  });

  await formatFiles(tree);

  return () => {
    installPackagesTask(tree);
  };
}
export default domainGenerator;
