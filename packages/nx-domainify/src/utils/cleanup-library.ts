import { Tree, joinPathFragments } from '@nx/devkit';

export const cleanupLibrary = (tree: Tree, projectRoot: string) => {
  const srcPath = joinPathFragments(projectRoot, 'src');
  tree.delete(joinPathFragments(srcPath, 'lib'));
  tree.write(joinPathFragments(srcPath, 'index.ts'), 'export {}');
  tree.write(joinPathFragments(srcPath, 'lib', '.gitkeep'), ' ');
};
