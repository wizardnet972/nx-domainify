import { formatFiles, installPackagesTask, joinPathFragments, names, readNxJson, Tree } from '@nx/devkit';
import { FeatureGeneratorSchema } from './schema';
import { SyntaxKind } from 'ts-morph';
import { createSourceFile } from '../../utils/create-source-file';
import { cleanupLibrary } from '../../utils/cleanup-library';
import { getProjectImportPathOrThrow } from '../../utils/get-project-import-path';
import { resolveDomainOrThrow } from '../../utils/resolve-domain-or-throw';

export async function featureGenerator(tree: Tree, options: FeatureGeneratorSchema) {
  const prefix = 'feature';

  const directoryInput = options.directory?.trim() ?? '';
  const directorySegmentsRaw = directoryInput.split('/').filter(Boolean);

  if (!directorySegmentsRaw.length) {
    throw new Error('The directory option must include a feature name as the last segment.');
  }

  const nameSegment = directorySegmentsRaw[directorySegmentsRaw.length - 1];
  const directorySegments = directorySegmentsRaw.slice(0, -1).map((segment) => names(segment).fileName);
  const { fileName: featureFileName } = names(nameSegment);
  const featureNames = names(featureFileName);

  const { fileName: domainName } = names(options.domain ?? '');

  const { domainName: domain, directory: domainDirectory, projectRoot: domainProjectRoot } = resolveDomainOrThrow(tree, domainName);
  const domainImportPath = getProjectImportPathOrThrow(tree, domainProjectRoot, `${domain}-domain`);

  const normalizedDirectory = directorySegments.join('-');
  const libraryName = [domain, normalizedDirectory, prefix, featureFileName].filter(Boolean).join('-');
  const projectRoot = joinPathFragments(domainDirectory, ...directorySegments, [prefix, featureFileName].filter(Boolean).join('-'));

  const { libraryGenerator, componentGenerator } = await import('@nx/angular/generators');
  const libraryDefaults = readNxJson(tree)?.generators?.['@nx/angular:library'] || {};

  await libraryGenerator(tree, {
    ...libraryDefaults,
    name: libraryName,
    directory: projectRoot,
    prefix: domain,
    tags: `domain:${domain},type:${prefix}`,
    flat: false,
  });

  cleanupLibrary(tree, projectRoot);

  const componentDefaults = readNxJson(tree)?.generators?.['@nx/angular:component'] || {};
  await componentGenerator(tree, {
    ...componentDefaults,
    name: featureNames.name,
    path: joinPathFragments(projectRoot, 'src', 'lib', featureFileName),
    selector: libraryName,
  });

  const componentFilePath = resolveComponentFilePath(tree, projectRoot, featureFileName);
  tree.write(joinPathFragments(projectRoot, 'src', 'index.ts'), `export * from '${toSrcExportSpecifier(projectRoot, componentFilePath)}'`);

  tree.write(
    joinPathFragments(domainProjectRoot, 'src', 'lib', 'application', `${featureFileName}.facade.ts`),
    `
  import { Injectable } from '@angular/core';

  @Injectable({ providedIn: 'root' })
  export class ${featureNames.className}Facade {}
  `
  );

  const indexFilePath = joinPathFragments(domainProjectRoot, 'src', 'index.ts');
  const { sourceFile: indexSourceFile, flush: flushIndexSourceFile } = createSourceFile(tree, indexFilePath);

  indexSourceFile.addExportDeclaration({
    namedExports: [`${featureNames.className}Facade`],
    moduleSpecifier: `./lib/application/${featureFileName}.facade`,
  });

  flushIndexSourceFile();

  const { sourceFile: componentSourceFile, flush: flushComponentSourceFile } = createSourceFile(tree, componentFilePath);

  componentSourceFile.addImportDeclaration({
    namedImports: [`${featureNames.className}Facade`],
    moduleSpecifier: domainImportPath,
  });

  const angularCoreImport = componentSourceFile.getImportDeclaration((id) => id.getModuleSpecifierValue() === '@angular/core');

  if (angularCoreImport) {
    const hasInject = angularCoreImport.getNamedImports().some((namedImport) => namedImport.getName() === 'inject');

    if (!hasInject) {
      angularCoreImport.addNamedImport('inject');
    }
  } else {
    componentSourceFile.addImportDeclaration({
      moduleSpecifier: '@angular/core',
      namedImports: ['inject'],
    });
  }

  const [classComponent] = componentSourceFile.getClasses();
  const componentMetadata = classComponent
    .getDecoratorOrThrow('Component')
    .getArguments()[0]
    .asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  componentMetadata.addPropertyAssignment({ initializer: `[${featureNames.className}Facade]`, name: 'providers' });

  classComponent.addProperty({ name: 'facade', initializer: `inject(${`${featureNames.className}Facade`})` });

  flushComponentSourceFile();

  await formatFiles(tree);

  return () => {
    installPackagesTask(tree);
  };
}

function resolveComponentFilePath(tree: Tree, projectRoot: string, featureFileName: string) {
  const libRoot = joinPathFragments(projectRoot, 'src', 'lib');
  const candidates = [
    joinPathFragments(libRoot, `${featureFileName}.ts`),
    joinPathFragments(libRoot, `${featureFileName}.component.ts`),
    joinPathFragments(libRoot, featureFileName, `${featureFileName}.ts`),
    joinPathFragments(libRoot, featureFileName, `${featureFileName}.component.ts`),
  ];
  const found = candidates.find((path) => tree.exists(path));
  if (!found) {
    throw new Error(`Could not find the generated feature component at ${libRoot}.`);
  }
  return found;
}

function toSrcExportSpecifier(projectRoot: string, filePath: string) {
  const srcRoot = joinPathFragments(projectRoot, 'src');
  const relative = filePath.startsWith(`${srcRoot}/`) ? filePath.slice(srcRoot.length + 1) : filePath;
  return `./${relative.replace(/\.ts$/, '')}`;
}

export default featureGenerator;
