import { formatFiles, Tree } from '@nx/devkit';
import { InitGeneratorSchema } from './schema';
import { setDepsConstraints } from '../../utils/set-deps-constraints';

export async function initGenerator(tree: Tree, options: InitGeneratorSchema) {
  setDepsConstraints(tree, [
    {
      sourceTag: 'type:app',
      onlyDependOnLibsWithTags: ['type:api', 'type:feature', 'type:ui', 'type:domain-logic', 'type:util'],
    },
    {
      sourceTag: 'type:api',
      onlyDependOnLibsWithTags: ['type:ui', 'type:domain-logic', 'type:util'],
    },
    {
      sourceTag: 'type:feature',
      onlyDependOnLibsWithTags: ['type:ui', 'type:domain-logic', 'type:util'],
    },
    {
      sourceTag: 'type:ui',
      onlyDependOnLibsWithTags: ['type:domain-logic', 'type:util'],
    },
    {
      sourceTag: 'type:domain-logic',
      onlyDependOnLibsWithTags: ['type:util'],
    },
    {
      sourceTag: 'domain:shared',
      onlyDependOnLibsWithTags: ['domain:shared'],
    },
  ]);

  await formatFiles(tree);
}

export default initGenerator;
