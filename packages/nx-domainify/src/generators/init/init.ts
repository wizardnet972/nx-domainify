import { formatFiles, Tree } from '@nx/devkit';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { InitGeneratorSchema } from './schema';
import { updateDepsConstraints } from '../../utils/update-deps-constraints';

const AI_SKILL_PATHS = ['.cursor/skills/nx-domainify-generate/SKILL.md', '.claude/skills/nx-domainify-generate/SKILL.md'];

const installAiSkill = (tree: Tree) => {
  const skill = readFileSync(join(__dirname, 'files', 'SKILL.md'), 'utf-8');

  for (const path of AI_SKILL_PATHS) {
    tree.write(path, skill);
  }
};

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
  installAiSkill(tree);

  if (!options.skipFormat && !options['skip-format']) await formatFiles(tree);
}

export default initGenerator;
