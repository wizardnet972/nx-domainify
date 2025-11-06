import { Tree } from '@nx/devkit';
import { Project } from 'ts-morph';

const ast = new Project({ skipAddingFilesFromTsConfig: true, useInMemoryFileSystem: true });

export const createSourceFile = (tree: Tree, filePath: string) => {
  const sourceText = tree.read(filePath, 'utf-8');

  const sourceFile = ast.createSourceFile(filePath, sourceText ?? '');

  const flush = () => {
    tree.write(filePath, sourceFile.getFullText());
  };

  return { sourceFile, flush };
};
