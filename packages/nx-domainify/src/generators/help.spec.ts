import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

type JsonSchema = {
  description?: string;
  title?: string;
  properties?: Record<string, { description?: string; aliases?: string[] }>;
};

type GeneratorsJson = {
  generators: Record<string, { schema: string; description: string }>;
};

describe('generator --help metadata', () => {
  const generatorsJson = JSON.parse(readFileSync(join(pluginRoot, 'generators.json'), 'utf-8')) as GeneratorsJson;

  it.each(Object.entries(generatorsJson.generators))('%s has a description and a schema description', (_name, generator) => {
    // Arrange
    const schemaPath = join(pluginRoot, generator.schema.replace('./', ''));
    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8')) as JsonSchema;

    // Act
    const generatorDescription = generator.description?.trim();
    const schemaDescription = schema.description?.trim();
    const schemaTitle = schema.title?.trim();

    // Assert
    expect(generatorDescription).toBeTruthy();
    expect(schemaDescription).toBeTruthy();
    expect(schemaTitle).toBeTruthy();
    expect(schemaDescription).toBe(generatorDescription);
  });

  it.each(Object.entries(generatorsJson.generators))('%s documents every option', (_name, generator) => {
    // Arrange
    const schemaPath = join(pluginRoot, generator.schema.replace('./', ''));
    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8')) as JsonSchema;
    const properties = Object.entries(schema.properties ?? {});

    // Act / Assert
    expect(properties.length).toBeGreaterThan(0);
    for (const [optionName, option] of properties) {
      expect(option.description?.trim(), `${optionName} is missing a description`).toBeTruthy();
    }
  });

  it('does not describe the api directory option as a ui library', () => {
    // Arrange
    const schema = JSON.parse(readFileSync(join(pluginRoot, 'src/generators/api/schema.json'), 'utf-8')) as JsonSchema;

    // Act
    const directoryDescription = schema.properties?.directory?.description ?? '';

    // Assert
    expect(directoryDescription.toLowerCase()).not.toContain('ui library');
    expect(directoryDescription.toLowerCase()).toContain('api');
  });

  it.each(['api', 'ui', 'util'] as const)('%s skipPrefix accepts skip-prefix', (generator) => {
    // Arrange
    const schema = JSON.parse(readFileSync(join(pluginRoot, `src/generators/${generator}/schema.json`), 'utf-8')) as JsonSchema;

    // Act
    const aliases = schema.properties?.skipPrefix?.aliases ?? [];

    // Assert
    expect(aliases).toContain('skip-prefix');
  });
});
