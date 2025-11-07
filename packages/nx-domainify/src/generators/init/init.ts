import { formatFiles, Tree } from '@nx/devkit';
import { InitGeneratorSchema } from './schema';
import { updateDepsConstraints } from '../../utils/update-deps-constraints';

export async function initGenerator(tree: Tree, options: InitGeneratorSchema) {
  const dddRules = [
    { sourceTag: 'type:app', onlyDependOnLibsWithTags: ['type:api', 'type:feature', 'type:ui', 'type:domain-logic', 'type:util'] },
    { sourceTag: 'type:api', onlyDependOnLibsWithTags: ['type:ui', 'type:domain-logic', 'type:util'] },
    { sourceTag: 'type:feature', onlyDependOnLibsWithTags: ['type:ui', 'type:domain-logic', 'type:util'] },
    { sourceTag: 'type:ui', onlyDependOnLibsWithTags: ['type:domain-logic', 'type:util'] },
    { sourceTag: 'type:domain-logic', onlyDependOnLibsWithTags: ['type:util'] },
    { sourceTag: 'domain:shared', onlyDependOnLibsWithTags: ['domain:shared'] },
  ];

  updateDepsConstraints(tree, () => JSON.stringify(dddRules));

  if (!options.skipFormat) await formatFiles(tree);
}

export default initGenerator;
