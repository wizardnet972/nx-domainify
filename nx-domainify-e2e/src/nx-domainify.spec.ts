import { execSync, ExecSyncOptions } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const WORKSPACE_TIMEOUT_MS = 600_000;

const WORKSPACES = [
  { nxVersion: '20.8.4', label: 'Nx 20' },
  { nxVersion: '21.6.11', label: 'Nx 21' },
  { nxVersion: '22.7.12', label: 'Nx 22' },
  { nxVersion: '23.2.1', label: 'Nx 23' },
] as const;

describe.each(WORKSPACES)('nx-domainify on $label', ({ nxVersion }) => {
  let projectDirectory: string;
  let keepWorkspace = false;
  const projectName = `test-project-${nxVersion.split('.')[0]}`;

  beforeAll(() => {
    projectDirectory = createTestProject(nxVersion, projectName);
    run(`pnpm add -D --config.frozen-lockfile=false nx-domainify@e2e`, projectDirectory);
  }, WORKSPACE_TIMEOUT_MS);

  afterAll(() => {
    if (projectDirectory && !keepWorkspace) {
      rmSync(projectDirectory, {
        recursive: true,
        force: true,
      });
    }
  });

  it('should be installed against the workspace @nx/angular', () => {
    run('pnpm ls --depth 100 nx-domainify', projectDirectory);
    expect(packageMajor(join(projectDirectory, 'node_modules/@nx/angular/package.json'))).toBe(nxVersion.split('.')[0]);
    expect(existsSync(join(projectDirectory, 'node_modules/nx-domainify/node_modules/@nx/angular'))).toBe(false);
  });

  it(
    'should init, generate isolated domains, and enforce module boundaries',
    () => {
      try {
        generateIsolatedDomains(projectDirectory);
      } catch (error) {
        keepWorkspace = true;
        throw error;
      }
    },
    WORKSPACE_TIMEOUT_MS
  );
});

function generateIsolatedDomains(projectDirectory: string) {
  run('pnpm exec nx g nx-domainify:init --no-interactive', projectDirectory);
  run('pnpm exec nx g nx-domainify:domain booking --directory=libs --no-interactive', projectDirectory);
  run('pnpm exec nx g nx-domainify:feature list --domain=booking --no-interactive', projectDirectory);
  run('pnpm exec nx g nx-domainify:domain orders --no-interactive', projectDirectory);
  run('pnpm exec nx g nx-domainify:feature list --domain=orders --no-interactive', projectDirectory);

  const bookingDomain = nxProjectName(projectDirectory, 'libs/booking/domain');
  const bookingFeature = nxProjectName(projectDirectory, 'libs/booking/feature-list');
  const ordersDomain = nxProjectName(projectDirectory, 'libs/orders/domain');
  const ordersFeature = nxProjectName(projectDirectory, 'libs/orders/feature-list');

  run(
    `pnpm exec nx run-many -t lint --projects=${shellJoin([bookingDomain, bookingFeature, ordersDomain, ordersFeature])}`,
    projectDirectory
  );
  runBuildIfPresent(projectDirectory, [bookingDomain, bookingFeature]);

  const bookingImportPath = projectImportPath(projectDirectory, 'libs/booking/domain');
  appendFileSync(featureSourceFile(projectDirectory, 'libs/orders/feature-list', 'list'), `\nimport '${bookingImportPath}';\n`);

  let lintOutput = '';
  try {
    run(`pnpm exec nx lint ${shellQuote(ordersFeature)}`, projectDirectory);
  } catch (error) {
    lintOutput = commandOutput(error);
  }

  expect(lintOutput).toContain('enforce-module-boundaries');
}

function createTestProject(nxVersion: string, projectName: string) {
  const projectDirectory = join(tmpdir(), 'nx-domainify-e2e', projectName);

  rmSync(projectDirectory, {
    recursive: true,
    force: true,
  });
  mkdirSync(dirname(projectDirectory), {
    recursive: true,
  });

  const major = Number(nxVersion.split('.')[0]);
  const flags = [
    `pnpm dlx create-nx-workspace@${nxVersion}`,
    projectName,
    '--preset=angular-monorepo',
    '--appName=demo',
    '--style=css',
    '--bundler=esbuild',
    '--ssr=false',
    '--e2eTestRunner=none',
    '--unitTestRunner=none',
    '--formatter=prettier',
    '--packageManager=pnpm',
    '--nxCloud=skip',
    '--no-interactive',
  ];

  if (major >= 23) {
    flags.push('--linter=eslint', '--aiAgents=none');
  }

  run(flags.join(' '), dirname(projectDirectory));
  alignAngularLibraryDefaults(projectDirectory);

  return projectDirectory;
}

function alignAngularLibraryDefaults(projectDirectory: string) {
  const nxJsonPath = join(projectDirectory, 'nx.json');
  const nxJson = JSON.parse(readFileSync(nxJsonPath, 'utf-8')) as {
    generators?: Record<string, Record<string, unknown>>;
  };

  nxJson.generators = {
    ...(nxJson.generators ?? {}),
    '@nx/angular:library': {
      ...(nxJson.generators?.['@nx/angular:library'] ?? {}),
      unitTestRunner: 'none',
    },
  };

  writeFileSync(nxJsonPath, `${JSON.stringify(nxJson, null, 2)}\n`);
}

function run(command: string, cwd: string) {
  const options: ExecSyncOptions = {
    cwd,
    encoding: 'utf-8',
    stdio: 'pipe',
    env: {
      ...process.env,
      INIT_CWD: cwd,
      NX_DAEMON: 'false',
    },
  };

  try {
    const output = execSync(command, options);
    process.stdout.write(String(output));
    return String(output);
  } catch (error) {
    process.stdout.write(commandOutput(error));
    throw error;
  }
}

function nxProjectName(cwd: string, projectRoot: string) {
  const normalizedRoot = normalizePath(projectRoot);
  const byRoot = nxProjectRoots(cwd);
  const names = [...byRoot.values()];
  const declared = declaredProjectName(cwd, projectRoot);

  const fromGraph = byRoot.get(normalizedRoot);
  if (fromGraph) {
    return fromGraph;
  }

  if (declared && names.includes(declared)) {
    return declared;
  }

  throw new Error(
    `No Nx project at ${projectRoot}. Declared name: ${declared ?? '(none)'}. Projects: ${names.join(', ') || '(none)'}. Roots: ${
      [...byRoot.entries()].map(([root, name]) => `${name}=${root}`).join(', ') || '(none)'
    }`
  );
}

function declaredProjectName(cwd: string, projectRoot: string) {
  for (const file of ['package.json', 'project.json']) {
    try {
      const { name } = JSON.parse(readFileSync(join(cwd, projectRoot, file), 'utf-8')) as { name?: string };
      if (name?.trim()) {
        return name.trim();
      }
    } catch {
      // Try the next metadata file.
    }
  }

  return undefined;
}

const projectRootCache = new Map<string, Map<string, string>>();

function nxProjectRoots(cwd: string) {
  const cached = projectRootCache.get(cwd);
  if (cached) {
    return cached;
  }

  const graphFile = join(cwd, 'tmp-nx-e2e-graph.json');
  run(`pnpm exec nx graph --file=${graphFile} --open=false --watch=false`, cwd);
  const payload = JSON.parse(readFileSync(graphFile, 'utf-8')) as {
    graph?: { nodes?: Record<string, { data?: { root?: string }; root?: string }> };
    nodes?: Record<string, { data?: { root?: string }; root?: string }>;
  };
  const nodes = payload.graph?.nodes ?? payload.nodes ?? {};
  const byRoot = new Map<string, string>();

  for (const [name, node] of Object.entries(nodes)) {
    const root = normalizePath(String(node?.data?.root ?? node?.root ?? ''));
    if (root) {
      byRoot.set(root, name);
    }
  }

  projectRootCache.set(cwd, byRoot);
  return byRoot;
}

function parseJsonOutput<T>(output: string): T {
  const text = output.trim();
  const starts = ['{', '[']
    .map((token) => text.indexOf(token))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);

  if (!starts.length) {
    throw new Error(`Expected JSON in command output:\n${text.slice(0, 500)}`);
  }

  return JSON.parse(text.slice(starts[0])) as T;
}

function normalizePath(value: string) {
  return value.replace(/\\/g, '/').replace(/^\.?\//, '').replace(/\/$/, '');
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function shellJoin(values: string[]) {
  return values.map(shellQuote).join(',');
}

function runBuildIfPresent(cwd: string, projects: string[]) {
  const buildable = projects.filter((project) => hasTarget(cwd, project, 'build'));
  if (!buildable.length) {
    run('pnpm exec nx build demo', cwd);
    return;
  }

  run(`pnpm exec nx run-many -t build --projects=${shellJoin(buildable)}`, cwd);
}

function hasTarget(cwd: string, project: string, target: string) {
  try {
    const details = parseJsonOutput<{ targets?: Record<string, unknown> }>(
      run(`pnpm exec nx show project ${shellQuote(project)} --json`, cwd)
    );
    return Boolean(details?.targets?.[target]);
  } catch {
    return false;
  }
}

function projectImportPath(workspace: string, projectRoot: string) {
  const packageJsonPath = join(workspace, projectRoot, 'package.json');
  try {
    const { name } = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as { name?: string };
    if (name?.trim()) {
      return name.trim();
    }
  } catch {
    // Fall through to tsconfig paths.
  }

  const tsconfig = JSON.parse(readFileSync(join(workspace, 'tsconfig.base.json'), 'utf-8')) as {
    compilerOptions?: { paths?: Record<string, string[]> };
  };
  const paths = tsconfig.compilerOptions?.paths ?? {};
  const normalizedRoot = projectRoot.replace(/\\/g, '/').replace(/^\.?\//, '');

  for (const [importPath, mappings] of Object.entries(paths)) {
    const matches = (mappings ?? []).some((mapping) => {
      const normalized = mapping.replace(/\\/g, '/').replace(/^\.?\//, '').replace(/\/$/, '');
      return normalized === normalizedRoot || normalized.startsWith(`${normalizedRoot}/`);
    });
    if (matches) {
      return importPath;
    }
  }

  throw new Error(`Could not determine the import path for ${projectRoot}`);
}

function featureSourceFile(workspace: string, projectRoot: string, featureName: string) {
  const candidates = [
    join(workspace, projectRoot, 'src/lib', `${featureName}.ts`),
    join(workspace, projectRoot, 'src/lib', `${featureName}.component.ts`),
    join(workspace, projectRoot, 'src/lib', featureName, `${featureName}.ts`),
    join(workspace, projectRoot, 'src/lib', featureName, `${featureName}.component.ts`),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`Could not find the generated feature file for ${projectRoot}`);
  }
  return found;
}

function packageMajor(manifestPath: string) {
  const { version } = JSON.parse(readFileSync(manifestPath, 'utf-8')) as { version?: string };
  return version?.split('.')[0];
}

function commandOutput(error: unknown) {
  if (!error || typeof error !== 'object') {
    return String(error);
  }

  const withOutput = error as { stdout?: Buffer | string; stderr?: Buffer | string; message?: string };
  return `${String(withOutput.stdout ?? '')}${String(withOutput.stderr ?? '')}${withOutput.message ?? ''}`;
}
