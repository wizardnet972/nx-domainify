import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, readProjectConfiguration } from '@nx/devkit';

import { uiGenerator } from './ui';
import domainGenerator from '../domain/domain';

describe('ui generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await uiGenerator(tree, { name: 'dashboard' });
    const config = readProjectConfiguration(tree, 'ui-dashboard');
    console.log({ config });
    expect(config).toBeDefined();
  });

  it('should run successfully1', async () => {
    await domainGenerator(tree, { name: 'booking' });
    await uiGenerator(tree, { name: 'dashboard', domain: 'booking' });
    const config = readProjectConfiguration(tree, 'booking-ui-dashboard');
    console.log({ config });
    expect(config).toBeDefined();
  });

  it('test #1 should skip prefix', async () => {
    await uiGenerator(tree, { name: 'dashboard', directory: 'ui', skipPrefix: true });
    const config = readProjectConfiguration(tree, 'ui-dashboard');
    console.log(config);
    expect(config).toBeDefined();
  });

  //TODO: test if directory is ui/@
  it('test #2 should skip prefix', async () => {
    await uiGenerator(tree, { name: 'dashboard', directory: 'ui' });
    const config = readProjectConfiguration(tree, 'ui-dashboard');
    console.log(config);
    expect(config).toBeDefined();
  });

  // it('test #2 support angular library schema like buildable', async () => {
  //   await uiGenerator(tree, { name: 'dashboard', directory: 'ui', skipPrefix: true, buildable: true });
  //   const config = readProjectConfiguration(tree, 'shared-ui-dashboard');
  //   expect(config).toBeDefined();
  //   expect(config.targets.build).toBeDefined();
  // });

  // it('test #2 support angular library schema like buildable', async () => {
  //   await uiGenerator(tree, { name: 'dashboard' });
  //   const config = readProjectConfiguration(tree, 'shared-ui-dashboard');
  //   console.log({ config });
  //   expect(config).toBeDefined();
  // });
});
