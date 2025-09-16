export interface UiGeneratorSchema {
  name: string;
  domain?: string;
  directory?: string;

  [key: string]: string | boolean | undefined;
}
