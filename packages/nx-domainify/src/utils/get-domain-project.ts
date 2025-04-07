import { Tree, getProjects } from '@nx/devkit';

export const getDomainProjectOrThrow = (tree: Tree, domainName: string) => {
  const projects = getProjects(tree);

  const domainProject = [domainName, `${domainName}-domain`].map((name) => projects.get(name)).find(Boolean);

  if (!domainProject) {
    throw new Error(`Domain project not found for "${domainName}". Expected one of: "${domainName}" or "${domainName}-domain".`);
  }

  if (!domainProject.tags?.includes?.('type:domain-logic')) {
    throw new Error(`Project "${domainProject.name}" is missing the required 'type:domain-logic' tag.`);
  }

  return domainProject;
};
