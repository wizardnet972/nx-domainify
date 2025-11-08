import { formatFiles, joinPathFragments, names, readNxJson, Tree } from '@nx/devkit';
import { ApiGeneratorSchema } from './schema';
import { cleanupLibrary } from '../../utils/cleanup-library';
import { resolveDomainOrThrow } from '../../utils/resolve-domain-or-throw';

export const normalizeOptions = (options: ApiGeneratorSchema) => {
  const { name, domain = '', directory = '', ...extra } = options;

  return {
    extra,
    name: names(name).fileName,
    domainName: names(domain ?? '').fileName,
    directory: names(directory ?? '').fileName,
  };
};

export async function apiGenerator(tree: Tree, options: ApiGeneratorSchema) {
  const prefix = 'api';

  const { name, domainName, directory, extra } = normalizeOptions(options);

  const normalizeDirectory = directory.replace(/\//g, '-');

  const { domainName: domain, directory: domainDirectory } = resolveDomainOrThrow(tree, domainName);

  const libraryName = [domain === 'shared' ? null : domain, normalizeDirectory, !options.skipPrefix && prefix, name]
    .filter(Boolean)
    .join('-');
  const projectRoot = joinPathFragments(domainDirectory, directory, [!options.skipPrefix && prefix, name].filter(Boolean).join('-'));

  const { libraryGenerator } = await import('@nx/angular/generators');
  await libraryGenerator(tree, {
    ...(readNxJson(tree)?.generators?.['@nx/angular:library'] || {}),
    name: libraryName,
    directory: projectRoot,
    buildable: true,
    prefix: domain === 'shared' ? prefix : domain,
    tags: `domain:${domain},type:${prefix}`,
    ...extra,
  });

  cleanupLibrary(tree, projectRoot);

  await formatFiles(tree);
}

export default apiGenerator;
