import { formatFiles, joinPathFragments, names, readNxJson, Tree } from '@nx/devkit';
import { FeatureGeneratorSchema } from './schema';
import { ObjectLiteralExpression } from 'ts-morph';
import { getNpmScope } from '../../utils/get-npm-scope';
import { createSourceFile } from '../../utils/create-source-file';
import { query } from '../../utils/ast';
import { cleanupLibrary } from '../../utils/cleanup-library';
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
  const npmScope = getNpmScope(tree);

  const { domainName: domain, directory: domainDirectory, projectRoot: domainProjectRoot } = resolveDomainOrThrow(tree, domainName);

  const normalizedDirectory = directorySegments.join('-');
  const libraryName = [domain, normalizedDirectory, prefix, featureFileName].filter(Boolean).join('-');
  const projectRoot = joinPathFragments(domainDirectory, ...directorySegments, [prefix, featureFileName].filter(Boolean).join('-'));

  const { libraryGenerator, componentGenerator } = await import('@nx/angular/generators');
  const libraryDefaults = readNxJson(tree)?.generators?.['@nx/angular:library'] || {};

  await libraryGenerator(tree, {
    ...libraryDefaults,
    name: libraryName,
    directory: projectRoot,
    buildable: true,
    prefix: libraryName,
    tags: `type:${prefix},domain:${domain}`,
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

  tree.write(joinPathFragments(projectRoot, 'src', 'index.ts'), `export * from './lib/${featureFileName}'`);

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

  const componentFilePath = joinPathFragments(projectRoot, 'src', 'lib', `${featureFileName}.ts`);
  const { sourceFile: componentSourceFile, flush: flushComponentSourceFile } = createSourceFile(tree, componentFilePath);

  componentSourceFile.addImportDeclaration({
    namedImports: [`${featureNames.className}Facade`],
    moduleSpecifier: `@${npmScope}/${domain}-domain`,
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

  const [componentMetadata] = query(componentSourceFile, 'Decorator CallExpression ObjectLiteralExpression') as ObjectLiteralExpression[];
  componentMetadata.addPropertyAssignment({ initializer: `[${featureNames.className}Facade]`, name: 'providers' });

  const [classComponent] = componentSourceFile.getClasses();
  classComponent.addProperty({ name: 'facade', initializer: `inject(${`${featureNames.className}Facade`})` });

  flushComponentSourceFile();

  await formatFiles(tree);
}

export default featureGenerator;
