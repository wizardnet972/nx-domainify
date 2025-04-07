import { Tree } from '@nx/devkit';
import { DepConstraint } from '@nx/eslint-plugin/src/utils/runtime-lint-utils';
import { updateOverrideInLintConfig } from '@nx/eslint/src/generators/utils/eslint-file';

export const setDepsConstraints = (tree: Tree, constraints: DepConstraint[]) => {
  updateOverrideInLintConfig(
    tree,
    '.',
    (o) => Object.keys(o.rules ?? {})?.includes('@nx/enforce-module-boundaries'),
    (o) => {
      o.rules['@nx/enforce-module-boundaries'][1]['depConstraints'] = constraints;

      return {
        ...o,
      };
    }
  );
};
