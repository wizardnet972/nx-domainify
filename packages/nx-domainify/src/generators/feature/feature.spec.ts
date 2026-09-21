import { vi } from 'vitest';

vi.mock('@nx/angular/generators', () => ({
  libraryGenerator: vi.fn(),
  componentGenerator: vi.fn(),
}));

import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { addProjectConfiguration, joinPathFragments, names, readProjectConfiguration, Tree, updateJson } from '@nx/devkit';
import * as devkit from '@nx/devkit';
import * as angularGenerators from '@nx/angular/generators';

import { featureGenerator } from './feature';

const setupDomainProject = (tree: Tree, domain: string, importPath = `@proj/${domain}-domain`) => {
  addProjectConfiguration(tree, `${domain}-domain`, {
    name: `${domain}-domain`,
    root: `libs/${domain}/domain`,
    sourceRoot: `libs/${domain}/domain/src`,
    projectType: 'library',
    targets: {},
    tags: ['type:domain-logic', `domain:${domain}`],
  });

  tree.write(`libs/${domain}/domain/src/index.ts`, 'export {}');
  tree.write(`libs/${domain}/domain/package.json`, JSON.stringify({ name: importPath }));
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
    const targetDir = options.path?.endsWith(`/${options.name}`)
      ? options.path.slice(0, -(`/` + options.name).length)
      : (options.path ?? '');

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
    expect(vi.mocked(angularGenerators.libraryGenerator).mock.calls[0][1].prefix).toBe('booking');
    expect(tree.exists('libs/booking/experience/feature-search/src/lib/search.ts')).toBe(true);
    expect(formatSpy).toHaveBeenCalledWith(tree);
    expect(vi.mocked(angularGenerators.libraryGenerator).mock.calls[0][1].buildable).toBeUndefined();
  });

  it('forwards buildable from nx.json angular library defaults', async () => {
    // Arrange
    setupDomainProject(tree, 'orders');
    vi.spyOn(devkit, 'formatFiles').mockResolvedValue();
    updateJson(tree, 'nx.json', (nxJson) => {
      nxJson.generators = {
        ...(nxJson.generators ?? {}),
        '@nx/angular:library': { buildable: true },
      };
      return nxJson;
    });

    // Act
    await featureGenerator(tree, { domain: 'orders', directory: 'shell' });

    // Assert
    expect(vi.mocked(angularGenerators.libraryGenerator).mock.calls[0][1].buildable).toBe(true);
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
    expect(component?.replace(/"/g, "'")).toContain("from '@proj/shared-domain'");
  });

  it('imports the facade from the domain package name when the workspace is unscoped', async () => {
    // Arrange
    setupDomainProject(tree, 'catalog', 'catalog-domain');

    // Act
    await featureGenerator(tree, { domain: 'catalog', directory: 'shell' });

    // Assert
    const component = tree.read('libs/catalog/feature-shell/src/lib/shell.ts', 'utf-8');
    expect(component?.replace(/"/g, "'")).toContain("from 'catalog-domain'");
    expect(component).not.toContain('@undefined/');
  });

  it('wires a generated *.component.ts file used by older Angular component types', async () => {
    // Arrange
    setupDomainProject(tree, 'inventory');
    vi.mocked(angularGenerators.componentGenerator).mockImplementation(async (tree, options: any) => {
      const className = names(options.name).className;
      const filePath = `${options.path}.component.ts`;

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

    // Act
    await featureGenerator(tree, { domain: 'inventory', directory: 'list' });

    // Assert
    const component = tree.read('libs/inventory/feature-list/src/lib/list.component.ts', 'utf-8');
    const index = tree.read('libs/inventory/feature-list/src/index.ts', 'utf-8');
    expect(component).toContain('providers: [ListFacade]');
    expect(component).toContain('facade = inject(ListFacade)');
    expect(index?.replace(/"/g, "'")).toContain("export * from './lib/list.component'");
  });

  it('throws when the domain project has no import path', async () => {
    // Arrange
    addProjectConfiguration(tree, 'booking-domain', {
      name: 'booking-domain',
      root: 'libs/booking/domain',
      sourceRoot: 'libs/booking/domain/src',
      projectType: 'library',
      targets: {},
      tags: ['type:domain-logic', 'domain:booking'],
    });
    tree.write('libs/booking/domain/src/index.ts', 'export {}');

    // Act / Assert
    await expect(featureGenerator(tree, { domain: 'booking', directory: 'shell' })).rejects.toThrow(
      /Could not determine the import path for "booking-domain"/
    );
  });
});
