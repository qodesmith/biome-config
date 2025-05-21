import path from 'node:path'

import {Biome, Distribution} from '@biomejs/js-api'

import {createBiomeConfig} from './createBiomeConfig'

const biome = await Biome.create({distribution: Distribution.NODE})

biome.applyConfiguration({
  formatter: {
    indentStyle: 'space',
    indentWidth: 2,
    lineEnding: 'lf',
  },
})

function formatJson(codeString: string): string {
  return biome.formatContent(codeString, {
    filePath: 'example.json',
  }).content
}

const defaultConfig = createBiomeConfig({type: 'default'})
const reactConfig = createBiomeConfig({type: 'react', includeJotaiHooks: false})
const reactExtraHooksConfig = createBiomeConfig({
  type: 'react',
  includeJotaiHooks: true,
})

const defaultConfigStr = formatJson(JSON.stringify(defaultConfig, null, 2))
const reactConfigStr = formatJson(JSON.stringify(reactConfig, null, 2))
const reactExtraHooksConfigStr = formatJson(
  JSON.stringify(reactExtraHooksConfig, null, 2)
)

/**
 * These are the static JSON files shipped with this package. They are ready to
 * be extended by the user.
 */
await Bun.write('./dist/biome.json', defaultConfigStr)
await Bun.write('./dist/biomeReact.json', reactConfigStr)
await Bun.write('./dist/biomeReactExtraHooks.json', reactExtraHooksConfigStr)

// Copy the schema to the dist folder to finish out what's exported.
const schemafile = Bun.file(
  path.resolve(import.meta.dirname, './biomeSchema.d.ts')
)
await Bun.write('./dist/biomeSchema.d.ts', schemafile)
