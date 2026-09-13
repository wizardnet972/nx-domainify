import { Tree } from '@nx/devkit';
import { updateDepsConstraints } from './update-deps-constraints';

export type DepConstraint = {
  sourceTag?: string;
  allSourceTags?: string[];
  onlyDependOnLibsWithTags?: string[];
  notDependOnLibsWithTags?: string[];
  allowedExternalImports?: string[];
  bannedExternalImports?: string[];
};

export const setDepsConstraints = (tree: Tree, constraints: DepConstraint[]) => {
  updateDepsConstraints(tree, () => JSON.stringify(constraints));
};
