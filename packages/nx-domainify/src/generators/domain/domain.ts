import { formatFiles, getWorkspaceLayout, joinPathFragments, names, Tree } from '@nx/devkit';

import { DomainGeneratorSchema } from './schema';

import { libraryGenerator } from '@nx/angular/generators';
import { addDepsConstraints } from '../../utils/add-deps-constraints';

export async function domainGenerator(tree: Tree, options: DomainGeneratorSchema) {
  const { fileName: domainName } = names(options.name);

  const { libsDir } = getWorkspaceLayout(tree);

  const domainNameWithoutPrefix = domainName.replace(/-domain$/g, '');

  const projectRoot = joinPathFragments(libsDir, domainNameWithoutPrefix, 'domain');

  await libraryGenerator(tree, {
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

  addDepsConstraints(tree, [
    {
      sourceTag: `domain:${domainNameWithoutPrefix}`,
      onlyDependOnLibsWithTags: ['type:domain-logic', `domain:${domainNameWithoutPrefix}`],
    },
  ]);

  await formatFiles(tree);
}

export default domainGenerator;
