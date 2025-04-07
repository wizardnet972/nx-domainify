import { formatFiles, joinPathFragments, names, Tree } from '@nx/devkit';
import { UiGeneratorSchema } from './schema';
import { libraryGenerator } from '@nx/angular/generators';
import { cleanupLibrary } from '../../utils/cleanup-library';
import { resolveDomainOrThrow } from '../../utils/resolve-domain-or-throw';

export async function uiGenerator(tree: Tree, options: UiGeneratorSchema) {
  const prefix = 'ui';

  const { fileName: name } = names(options.name);
  const { fileName: domainName } = names(options.domain ?? '');
  const { fileName: directory = '' } = names(options.directory ?? '');

  const normilizeDirectory = directory.replace(/\//g, '-');

  const { domainName: domain, directory: domainDirectory } = resolveDomainOrThrow(tree, domainName);

  const libraryName = [domain, normilizeDirectory, prefix, name].filter(Boolean).join('-');
  const projectRoot = joinPathFragments(domainDirectory, directory, [prefix, name].filter(Boolean).join('-'));

  await libraryGenerator(tree, {
    name: libraryName,
    directory: projectRoot,
    buildable: true,
    prefix: libraryName,
    tags: `type:${prefix},domain:${domain}`,
  });

  cleanupLibrary(tree, projectRoot);

  await formatFiles(tree);
}

export default uiGenerator;
