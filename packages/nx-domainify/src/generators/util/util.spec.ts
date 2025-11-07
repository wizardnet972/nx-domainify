import { vi } from 'vitest';

vi.mock('@nx/angular/generators', () => ({
  libraryGenerator: vi.fn(),
}));

import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { addProjectConfiguration, joinPathFragments, Tree } from '@nx/devkit';
import * as devkit from '@nx/devkit';
import * as angularGenerators from '@nx/angular/generators';

import { utilGenerator } from './util';

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

describe('utilGenerator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    vi.clearAllMocks();
    libraryGeneratorMock.mockResolvedValue(async () => undefined);
    formatFilesMock.mockResolvedValue();
  });

  it('creates a domain-scoped util library with expected options', async () => {
    // Arrange
    setupDomainProject(tree, 'booking');

    // Act
    await utilGenerator(tree, { name: 'dates', domain: 'booking', directory: 'shared-tools' });

    // Assert
    expect(libraryGeneratorMock).toHaveBeenCalledTimes(1);
    const [, schema] = libraryGeneratorMock.mock.calls[0] as [Tree, LibraryGeneratorSchema];
    expect(schema).toMatchObject({
      name: 'booking-shared-tools-util-dates',
      directory: joinPathFragments('libs/booking', 'shared-tools', 'util-dates'),
      buildable: true,
      prefix: 'booking',
      tags: 'type:util,domain:booking',
    });

    expect(tree.read('libs/booking/shared-tools/util-dates/src/index.ts', 'utf-8')).toBe('export {}');
    expect(tree.read('libs/booking/shared-tools/util-dates/src/lib/.gitkeep', 'utf-8')).toBe(' ');
    expect(formatFilesMock).toHaveBeenCalledWith(tree);
  });

  it('falls back to the shared domain and respects skipPrefix', async () => {
    // Act
    await utilGenerator(tree, { name: 'math', domain: '', directory: '', skipPrefix: true });

    // Assert
    const [, schema] = libraryGeneratorMock.mock.calls[0] as [Tree, LibraryGeneratorSchema];
    expect(schema).toMatchObject({
      name: 'math',
      directory: joinPathFragments('shared', 'math'),
      prefix: 'util',
      tags: 'type:util,domain:shared',
    });

    const projectRoot = schema.directory as string;
    expect(tree.read(joinPathFragments(projectRoot, 'src', 'index.ts'), 'utf-8')).toBe('export {}');
  });
});
