export interface UiGeneratorSchema {
  name: string;
  domain?: string;
  directory?: string;
  skipPrefix?: boolean;
  'skip-prefix'?: boolean;
  dryRun?: boolean;
  'dry-run'?: boolean;
}
