import { vi } from 'vitest';

vi.mock('@nx/angular/generators', () => ({
  libraryGenerator: vi.fn(),
}));

import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { addProjectConfiguration, joinPathFragments, Tree, updateJson } from '@nx/devkit';
import * as devkit from '@nx/devkit';
import * as angularGenerators from '@nx/angular/generators';

import { apiGenerator } from './api';

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

describe('apiGenerator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    vi.clearAllMocks();
    libraryGeneratorMock.mockResolvedValue(async () => undefined);
    formatFilesMock.mockResolvedValue();
  });

  it('creates a domain-scoped api library with expected options', async () => {
    // Arrange
    setupDomainProject(tree, 'booking');

    // Act
    await apiGenerator(tree, { name: 'availability', domain: 'booking', directory: '' });

    // Assert
    expect(libraryGeneratorMock).toHaveBeenCalledTimes(1);
    const [, schema] = libraryGeneratorMock.mock.calls[0] as [Tree, LibraryGeneratorSchema];
    expect(schema).toMatchObject({
      name: 'booking-api-availability',
      directory: 'libs/booking/api-availability',
      prefix: 'booking',
      tags: 'domain:booking,type:api',
    });

    expect(tree.read('libs/booking/api-availability/src/index.ts', 'utf-8')).toBe('export {}');
    expect(tree.read('libs/booking/api-availability/src/lib/.gitkeep', 'utf-8')).toBe(' ');
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
    await apiGenerator(tree, { name: 'availability', domain: 'booking', directory: '' });

    // Assert
    const [, schema] = libraryGeneratorMock.mock.calls[0] as [Tree, LibraryGeneratorSchema];
    expect(schema.buildable).toBe(true);
  });

  it('omits the api prefix when skipPrefix is true', async () => {
    // Arrange
    setupDomainProject(tree, 'support');

    // Act
    await apiGenerator(tree, { name: 'chat', domain: 'support', directory: 'help/desk', skipPrefix: true });

    // Assert
    const [, schema] = libraryGeneratorMock.mock.calls[0] as [Tree, LibraryGeneratorSchema];
    expect(schema).toMatchObject({
      name: 'support-help-desk-chat',
      directory: joinPathFragments('libs/support', 'help/desk', 'chat'),
      prefix: 'support',
      tags: 'domain:support,type:api',
    });

    expect(tree.read('libs/support/help/desk/chat/src/index.ts', 'utf-8')).toBe('export {}');
  });

  it('defaults to the shared domain when none is provided', async () => {
    // Act
    await apiGenerator(tree, { name: 'payments', domain: '', directory: '' });

    // Assert
    const [, schema] = libraryGeneratorMock.mock.calls[0] as [Tree, LibraryGeneratorSchema];
    expect(schema).toMatchObject({
      name: 'api-payments',
      directory: joinPathFragments('shared', 'api-payments'),
      prefix: 'api',
      tags: 'domain:shared,type:api',
    });

    expect(tree.read(joinPathFragments('shared', 'api-payments', 'src', 'index.ts'), 'utf-8')).toBe('export {}');
  });
});
