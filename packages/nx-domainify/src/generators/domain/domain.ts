import { formatFiles, getWorkspaceLayout, installPackagesTask, joinPathFragments, names, readNxJson, Tree } from '@nx/devkit';

import { DomainGeneratorSchema } from './schema';

import { updateDepsConstraints } from '../../utils/update-deps-constraints';
import { parse } from 'json5';

export async function domainGenerator(tree: Tree, options: DomainGeneratorSchema) {
  const { fileName: domainName } = names(options.name);
  const { libsDir } = getWorkspaceLayout(tree);

  const domainNameWithoutPrefix = domainName.replace(/-domain$/g, '');
  const projectRoot = joinPathFragments(libsDir, domainNameWithoutPrefix, 'domain');

  const { libraryGenerator } = await import('@nx/angular/generators');
  await libraryGenerator(tree, {
    ...(readNxJson(tree)?.generators?.['@nx/angular:library'] || {}),
    ...options,
    name: `${domainNameWithoutPrefix}-domain`,
    directory: projectRoot,
    buildable: true,
    prefix: `${domainNameWithoutPrefix}-domain`,
    tags: `type:domain-logic,domain:${domainNameWithoutPrefix}`,
  });

  tree.delete(joinPathFragments(projectRoot, 'src', 'lib', `${domainNameWithoutPrefix}-domain`));

  tree.write(joinPathFragments(projectRoot, 'src', 'index.ts'), 'export {}');
  tree.write(joinPathFragments(projectRoot, 'src', 'lib', 'application', '.gitkeep'), ' ');
  tree.write(joinPathFragments(projectRoot, 'src', 'lib', 'entities', '.gitkeep'), ' ');
  tree.write(joinPathFragments(projectRoot, 'src', 'lib', 'infrastructure', '.gitkeep'), ' ');

  updateDepsConstraints(tree, (node) => {
    const value = parse(node.getText());
    value.push({
      sourceTag: `domain:${domainNameWithoutPrefix}`,
      onlyDependOnLibsWithTags: ['type:domain-logic', `domain:${domainNameWithoutPrefix}`],
    });
    return JSON.stringify(value);
  });

  await formatFiles(tree);

  return () => {
    installPackagesTask(tree);
  };
}

export default domainGenerator;
