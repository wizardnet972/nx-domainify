const GENERATOR_FLAG_KEYS = ['skipPrefix', 'skip-prefix', 'dryRun', 'dry-run', 'skipFormat', 'skip-format'] as const;

export function isSkipPrefix(options: { skipPrefix?: boolean; 'skip-prefix'?: boolean }) {
  return Boolean(options.skipPrefix ?? options['skip-prefix']);
}

export function withoutGeneratorFlags<T extends object>(options: T) {
  const extra = { ...(options as Record<string, unknown>) };

  for (const key of GENERATOR_FLAG_KEYS) {
    delete extra[key];
  }

  return extra;
}
