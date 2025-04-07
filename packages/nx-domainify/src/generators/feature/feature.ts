import { formatFiles, joinPathFragments, names, Tree } from '@nx/devkit';
import { FeatureGeneratorSchema } from './schema';
import { componentGenerator, libraryGenerator } from '@nx/angular/generators';
import { ObjectLiteralExpression } from 'ts-morph';
import { getNpmScope } from '../../utils/get-npm-scope';
import { createSourceFile } from '../../utils/create-source-file';
import { query } from '../../utils/ast';
import { cleanupLibrary } from '../../utils/cleanup-library';
import { resolveDomainOrThrow } from '../../utils/resolve-domain-or-throw';

export async function featureGenerator(tree: Tree, options: FeatureGeneratorSchema) {
  const prefix = 'feature';

  const { fileName: name } = names(options.name);
  const { fileName: domainName } = names(options.domain ?? '');
  const { fileName: directory = '' } = names(options.directory ?? '');

  const normilizeDirectory = directory.replace(/\//g, '-');
  const npmScope = getNpmScope(tree);

  const { domainName: domain, directory: domainDirectory, projectRoot: domainProjectRoot } = resolveDomainOrThrow(tree, domainName);

  const libraryName = [domain, normilizeDirectory, prefix, name].filter(Boolean).join('-');
  const projectRoot = joinPathFragments(domainDirectory, directory, [prefix, name].filter(Boolean).join('-'));

  await libraryGenerator(tree, {
    name: libraryName,
    directory: projectRoot,
    buildable: true,
    prefix: libraryName,
    tags: `type:${prefix},domain:${domain}`,
    flat: false,
  });

  cleanupLibrary(tree, projectRoot);

  await componentGenerator(tree, {
    name: names(name).name,
    path: joinPathFragments(projectRoot, 'src', 'lib', name),
    selector: libraryName,
  });

  tree.write(joinPathFragments(projectRoot, 'src', 'index.ts'), `export * from './lib/${name}.component'`);

  tree.write(
    joinPathFragments(domainProjectRoot, 'src', 'lib', 'application', `${name}.facade.ts`),
    `
  import { Injectable } from '@angular/core';

  @Injectable({ providedIn: 'root' })
  export class ${names(name).className}Facade {}
  `
  );

  const indexFilePath = joinPathFragments(domainProjectRoot, 'src', 'index.ts');
  const { sourceFile: indexSourceFile, flush: flushIndexSourceFile } = createSourceFile(tree, indexFilePath);

  indexSourceFile.addExportDeclaration({
    namedExports: [`${names(name).className}Facade`],
    moduleSpecifier: `./lib/application/${name}.facade`,
  });

  flushIndexSourceFile();

  const componentFilePath = joinPathFragments(projectRoot, 'src', 'lib', `${name}.component.ts`);
  const { sourceFile: componentSourceFile, flush: flushComponentSourceFile } = createSourceFile(tree, componentFilePath);

  componentSourceFile.addImportDeclaration({
    namedImports: [`${names(name).className}Facade`],
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
  componentMetadata.addPropertyAssignment({ initializer: `[${names(name).className}Facade]`, name: 'providers' });

  const [classComponent] = componentSourceFile.getClasses();
  classComponent.addProperty({ name: 'facade', initializer: `inject(${`${names(name).className}Facade`})` });

  flushComponentSourceFile();

  await formatFiles(tree);
}

export default featureGenerator;
