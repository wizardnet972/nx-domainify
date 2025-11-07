import { vi } from 'vitest';

vi.mock('@nx/angular/generators', () => ({
  libraryGenerator: vi.fn(),
  componentGenerator: vi.fn(),
}));

import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { addProjectConfiguration, joinPathFragments, names, readProjectConfiguration, Tree } from '@nx/devkit';
import * as devkit from '@nx/devkit';
import * as angularGenerators from '@nx/angular/generators';

import { featureGenerator } from './feature';

const setupDomainProject = (tree: Tree, domain: string) => {
  addProjectConfiguration(tree, `${domain}-domain`, {
    name: `${domain}-domain`,
    root: `libs/${domain}/domain`,
    sourceRoot: `libs/${domain}/domain/src`,
    projectType: 'library',
    targets: {},
    tags: ['type:domain-logic', `domain:${domain}`],
  });

  tree.write(`libs/${domain}/domain/src/index.ts`, 'export {}');
};

const mockLibraryGenerator = () => {
  vi.mocked(angularGenerators.libraryGenerator).mockImplementation(async (tree, options: any) => {
    const tags =
      typeof options.tags === 'string'
        ? options.tags
            .split(',')
            .map((tag: string) => tag.trim())
            .filter(Boolean)
        : [];

    addProjectConfiguration(tree, options.name, {
      name: options.name,
      root: options.directory,
      sourceRoot: joinPathFragments(options.directory, 'src'),
      projectType: 'library',
      targets: {},
      tags,
    });

    tree.write(joinPathFragments(options.directory, 'src', 'index.ts'), 'export {}');
    tree.write(joinPathFragments(options.directory, 'src', 'lib', '.gitkeep'), ' ');

    return () => Promise.resolve();
  });
};

const mockComponentGenerator = () => {
  vi.mocked(angularGenerators.componentGenerator).mockImplementation(async (tree, options: any) => {
    const className = names(options.name).className;
    const targetDir = options.path?.endsWith(`/${options.name}`) ? options.path.slice(0, -(`/` + options.name).length) : options.path ?? '';

    const filePath = joinPathFragments(targetDir, `${options.name}.ts`);

    tree.write(
      filePath,
      `import { Component } from '@angular/core';

@Component({
  selector: '${options.selector}',
  standalone: true,
})
export class ${className}Component {}
`
    );
  });
};

describe('featureGenerator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    vi.clearAllMocks();
    mockLibraryGenerator();
    mockComponentGenerator();
  });

  it('creates a feature library scoped to the domain', async () => {
    // Arrange
    setupDomainProject(tree, 'booking');
    const formatSpy = vi.spyOn(devkit, 'formatFiles').mockResolvedValue();

    // Act
    await featureGenerator(tree, { domain: 'booking', directory: 'experience/search' });

    // Assert
    const project = readProjectConfiguration(tree, 'booking-experience-feature-search');
    expect(project.root).toBe('libs/booking/experience/feature-search');
    expect(project.tags).toContain('type:feature');
    expect(project.tags).toContain('domain:booking');
    expect(tree.exists('libs/booking/experience/feature-search/src/lib/search.ts')).toBe(true);
    expect(formatSpy).toHaveBeenCalledWith(tree);
  });

  it('wires the facade into the domain project', async () => {
    // Arrange
    setupDomainProject(tree, 'support');

    // Act
    await featureGenerator(tree, { domain: 'support', directory: 'messaging/chat' });

    // Assert
    const facade = tree.read('libs/support/domain/src/lib/application/chat.facade.ts', 'utf-8');
    const index = tree.read('libs/support/domain/src/index.ts', 'utf-8');

    expect(facade).toContain('export class ChatFacade');
    expect(index?.replace(/"/g, "'")).toContain("export { ChatFacade } from './lib/application/chat.facade'");
  });

  it('injects the facade inside the generated component', async () => {
    // Arrange
    setupDomainProject(tree, 'shared');

    // Act
    await featureGenerator(tree, { domain: 'shared', directory: 'announcements' });

    // Assert
    const component = tree.read('libs/shared/feature-announcements/src/lib/announcements.ts', 'utf-8');
    expect(component).toContain('providers: [AnnouncementsFacade]');
    expect(component).toContain('facade = inject(AnnouncementsFacade)');
  });
});
