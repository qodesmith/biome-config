import path from 'node:path'
import process from 'node:process'

import pkgJson from '../package.json'

const expectedSchemaVersion = pkgJson.dependencies['@biomejs/biome']
const biomeConfigStr = await Bun.file(
  path.resolve(import.meta.dirname, '../biome.jsonc')
).text()
const hasCorrectVersion = biomeConfigStr.includes(
  expectedSchemaVersion.replace('^', '')
)

if (!hasCorrectVersion) {
  // biome-ignore lint/suspicious/noConsole: it's ok here
  console.error(
    `Update the schema version in biome.jsonc to ${expectedSchemaVersion}`
  )
  process.exit(1)
}

// biome-ignore lint/suspicious/noConsole: it's ok
console.log('biome.jsonc has the correct schema version')
