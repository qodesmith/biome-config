import type {Configuration} from './biomeSchema'

const defaultConfig = JSON.stringify(createConfig({type: 'default'}), null, 2)
const reactConfig = JSON.stringify(createConfig({type: 'react'}), null, 2)

await Bun.write('./dist/biome.json', defaultConfig)
await Bun.write('./dist/biome-react.json', reactConfig)

function createConfig({type}: {type: 'default' | 'react'}): Configuration {
  // https://next.biomejs.dev/reference/configuration/
  return {
    $schema: 'https://biomejs.dev/schemas/2.0.0-beta.1/schema.json',
    assist: {},
    css: {},
    extends: [],
    files: {
      ignoreUnknown: true,
      includes: [
        // Include all known files in all folders recursively.
        '**',
      ],
      // maxSize: 1048576, // Default value - (1024*1024, 1MB)
    },
    formatter: {},
    graphql: {},
    grit: {},
    html: {},
    javascript: {},
    json: {},
    linter: {},
    overrides: [],
    plugins: [],
    root: true,
    vcs: {
      clientKind: 'git',
      defaultBranch: 'main',
      enabled: true,
      root: '.',
      useIgnoreFile: true,
    },
  }
}
