import { vi } from 'vitest';

vi.mock('@nx/angular/generators', () => ({
  libraryGenerator: vi.fn(),
}));

import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { addProjectConfiguration, joinPathFragments, Tree, updateJson } from '@nx/devkit';
import * as devkit from '@nx/devkit';
import * as angularGenerators from '@nx/angular/generators';

import { uiGenerator } from './ui';

type LibraryGeneratorSchema = Parameters<typeof angularGenerators.libraryGenerator>[1];

const libraryGeneratorMock = vi.mocked(angularGenerators.libraryGenerator);
const formatFilesMock = vi.spyOn(devkit, 'formatFiles');

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

describe('uiGenerator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    vi.clearAllMocks();
    libraryGeneratorMock.mockResolvedValue(async () => undefined);
    formatFilesMock.mockResolvedValue();
  });

  it('creates a domain-scoped ui library', async () => {
    // Arrange
    setupDomainProject(tree, 'booking');

    // Act
    await uiGenerator(tree, { name: 'dashboard', domain: 'booking', directory: 'widgets' });

    // Assert
    expect(libraryGeneratorMock).toHaveBeenCalledTimes(1);
    const [, schema] = libraryGeneratorMock.mock.calls[0] as [Tree, LibraryGeneratorSchema];
    expect(schema).toMatchObject({
      name: 'booking-widgets-ui-dashboard',
      directory: joinPathFragments('libs/booking', 'widgets', 'ui-dashboard'),
      prefix: 'booking',
      tags: 'domain:booking,type:ui',
    });

    expect(tree.read('libs/booking/widgets/ui-dashboard/src/index.ts', 'utf-8')).toBe('export {}');
    expect(tree.read('libs/booking/widgets/ui-dashboard/src/lib/.gitkeep', 'utf-8')).toBe(' ');
    expect(schema.buildable).toBeUndefined();
    expect(formatFilesMock).toHaveBeenCalledWith(tree);
  });

  it('forwards buildable from nx.json angular library defaults', async () => {
    // Arrange
    setupDomainProject(tree, 'booking');
    updateJson(tree, 'nx.json', (nxJson) => {
      nxJson.generators = {
        ...(nxJson.generators ?? {}),
        '@nx/angular:library': { buildable: true },
      };
      return nxJson;
    });

    // Act
    await uiGenerator(tree, { name: 'button', domain: 'booking', directory: '' });

    // Assert
    const [, schema] = libraryGeneratorMock.mock.calls[0] as [Tree, LibraryGeneratorSchema];
    expect(schema.buildable).toBe(true);
  });

  it('uses shared domain defaults and keeps the prefix when skipPrefix is false', async () => {
    // Act
    await uiGenerator(tree, { name: 'header', domain: '', directory: '' });

    // Assert
    const [, schema] = libraryGeneratorMock.mock.calls[0] as [Tree, LibraryGeneratorSchema];
    expect(schema).toMatchObject({
      name: 'ui-header',
      directory: joinPathFragments('shared', 'ui-header'),
      prefix: 'ui',
      tags: 'domain:shared,type:ui',
    });

    const projectRoot = schema.directory as string;
    expect(tree.read(joinPathFragments(projectRoot, 'src', 'index.ts'), 'utf-8')).toBe('export {}');
  });

  it('omits the prefix when skip-prefix is true', async () => {
    // Arrange
    setupDomainProject(tree, 'marketing');

    // Act
    await uiGenerator(tree, { name: 'hero', domain: 'marketing', directory: 'pages', 'skip-prefix': true });

    // Assert
    const [, schema] = libraryGeneratorMock.mock.calls[0] as [Tree, LibraryGeneratorSchema];
    expect(schema).toMatchObject({
      name: 'marketing-pages-hero',
      directory: joinPathFragments('libs/marketing', 'pages', 'hero'),
      prefix: 'marketing',
      tags: 'domain:marketing,type:ui',
    });
  });
});
