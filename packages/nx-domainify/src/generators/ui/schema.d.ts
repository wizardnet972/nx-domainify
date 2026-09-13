export interface UiGeneratorSchema {
  name: string;
  domain?: string;
  directory?: string;
  skipPrefix?: boolean;

  [key: string]: string | boolean | undefined;
}
