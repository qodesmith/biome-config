import {$} from 'bun'
import path from 'node:path'

import {createBiomeConfig} from './createBiomeConfig'

const defaultConfig = createBiomeConfig({type: 'default'})
const reactConfig = createBiomeConfig({type: 'react'})

const defaultConfigStr = JSON.stringify(defaultConfig)
const reactConfigStr = JSON.stringify(reactConfig)

await $`rm -rf ./dist`.quiet().nothrow()

/**
 * These are the static JSON files shipped with this package. They are ready to
 * be extended by the user.
 */
await Bun.write('./dist/biomeConfig.json', defaultConfigStr)
await Bun.write('./dist/biomeConfigReact.json', reactConfigStr)

// Now that configs have been written to disk, use them to format themselves.
const projectPath = path.resolve(import.meta.dirname, '..')
const configPaths = ['./dist/biomeConfig.json', './dist/biomeConfigReact.json']
  .map(filePath => path.resolve(projectPath, filePath))
  .join(' ')

await $`biome format --write ${{raw: configPaths}}`
