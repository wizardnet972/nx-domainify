import { formatFiles, installPackagesTask, joinPathFragments, names, readNxJson, Tree } from '@nx/devkit';
import { UiGeneratorSchema } from './schema';
import { libraryGenerator } from '@nx/angular/generators';
import { cleanupLibrary } from '../../utils/cleanup-library';
import { isSkipPrefix, withoutGeneratorFlags } from '../../utils/generator-options';
import { resolveDomainOrThrow } from '../../utils/resolve-domain-or-throw';

export const normalizeOptions = (options: UiGeneratorSchema) => {
  const { name, domain = '', directory = '', ...rest } = options;

  return {
    extra: withoutGeneratorFlags(rest),
    skipPrefix: isSkipPrefix(options),
    name: names(name).fileName,
    domainName: names(domain ?? '').fileName,
    directory: names(directory ?? '').fileName,
  };
};

export async function uiGenerator(tree: Tree, options: UiGeneratorSchema) {
  const prefix = 'ui';

  const { name, domainName, directory, extra, skipPrefix } = normalizeOptions(options);

  const normalizeDirectory = directory.replace(/\//g, '-');

  const { domainName: domain, directory: domainDirectory } = resolveDomainOrThrow(tree, domainName);

  const libraryName = [domain === 'shared' ? null : domain, normalizeDirectory, !skipPrefix && prefix, name]
    .filter(Boolean)
    .join('-');
  const projectRoot = joinPathFragments(domainDirectory, directory, [!skipPrefix && prefix, name].filter(Boolean).join('-'));

  await libraryGenerator(tree, {
    ...(readNxJson(tree)?.generators?.['@nx/angular:library'] || {}),
    name: libraryName,
    directory: projectRoot,
    prefix: domain === 'shared' ? prefix : domain,
    tags: `domain:${domain},type:${prefix}`,
    ...extra,
  });

  cleanupLibrary(tree, projectRoot);

  await formatFiles(tree);

  return () => {
    installPackagesTask(tree);
  };
}

export default uiGenerator;
