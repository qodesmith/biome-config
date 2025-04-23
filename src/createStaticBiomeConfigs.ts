import {createBiomeConfig} from './createBiomeConfig'

const defaultConfig = createBiomeConfig({type: 'default'})
const reactConfig = createBiomeConfig({type: 'react', includeJotaiHooks: false})
const reactExtraHooksConfig = createBiomeConfig({
  type: 'react',
  includeJotaiHooks: true,
})

/**
 * These two files are the static JSON files shipped with this package. They are
 * ready to be extended by the user.
 */
await Bun.write('./dist/biome.json', JSON.stringify(defaultConfig, null, 2))
await Bun.write('./dist/biomeReact.json', JSON.stringify(reactConfig, null, 2))
await Bun.write(
  './dist/biomeReactExtraHooks.json',
  JSON.stringify(reactExtraHooksConfig, null, 2)
)
