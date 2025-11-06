import { Tree, getWorkspaceLayout, joinPathFragments } from '@nx/devkit';
import { getDomainProjectOrThrow } from './get-domain-project';

export function resolveDomainOrThrow(tree: Tree, domainName: string, sharedDomainName = 'shared') {
  const { libsDir } = getWorkspaceLayout(tree);

  if (domainName) {
    const domainProject = getDomainProjectOrThrow(tree, domainName);
    return {
      domainName: domainProject.name?.replace(/-domain$/g, '') ?? '',
      directory: joinPathFragments(domainProject.root, '..'),
      projectRoot: joinPathFragments(domainProject.root),
    };
  }

  return {
    domainName: sharedDomainName,
    directory: joinPathFragments(libsDir, sharedDomainName),
    projectRoot: joinPathFragments(libsDir, sharedDomainName),
  };
}
