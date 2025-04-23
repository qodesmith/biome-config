#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import {parseArgs} from 'node:util'
import {mind as mindGradient} from 'gradient-string'
import color from 'picocolors'

////////////////////
// PKG JSON CHECK //
////////////////////

const pkgJsonPath = path.resolve(process.cwd(), 'package.json')
const pkgJson = (() => {
  try {
    return JSON.parse(fs.readFileSync(pkgJsonPath, {encoding: 'utf8'}))
  } catch {
    // noop
  }
})()

try {
  const {dependencies, devDependencies} = pkgJson ?? {}

  if (
    pkgJson === undefined ||
    !(
      dependencies?.['@qodestack/biome-config'] ||
      devDependencies?.['@qodestack/biome-config']
    )
  ) {
    throw new Error('Package not found')
  }
} catch {
  console.error(`Please first install ${color.bold('@qodestack/biome-config')}`)
  process.exit(1)
}

///////////
// TITLE //
///////////

// https://patorjk.com/software/taag/#p=display&f=Larry%203D&t=Biome%20Setup
const title = [
  ' ____                                         ____            __',
  'fB  _`B    __                                fB  _`B         fB B__',
  'B B BLB B fB_B    ___     ___ ___      __    B B,BLB_B     __B B ,_B  __  __  _____',
  " B B  _ <'BfB B  f __`B f' __` __`B  f'__`B   Bf_B__ B   f'__`B B Bf fB BfB BfB '__`B",
  '  B B BLB BB B BfB BLB BfB BfB BfB BfB  __f     fB BLB BfB  __fB B B_B B B_B B B BLB B',
  '   B B____f B B_B B____fB B_B B_B B_B B____B    B `B____B B____BB B__BB B____fB B ,__f',
  '    Bf___f   Bf_fBf___f  Bf_fBf_fBf_fBf____f     Bf_____fBf____f Bf__f Bf___f  B B Bf',
  '        by: The Qodesmith                                                       B B_B',
  '                                                                                 Bf_f',
]
  .join('\n')
  .replaceAll('f', '/')
  .replaceAll('B', '\\')
const titleGradient = mindGradient(title)

console.log(titleGradient)

//////////////////
// BIOME CONFIG //
//////////////////

const args = parseArgs({
  args: process.argv,
  options: {
    vanilla: {
      type: 'boolean',
      default: false,
    },
  },
  allowPositionals: true,
  allowNegative: true,
})

const isVanilla = args.values.vanilla
const biomeConfig = {
  $schema: 'https://biomejs.dev/schemas/2.0.0-beta.1/schema.json',
  extends: [`@qodestack/biome-config${isVanilla ? '' : '/reactExtraHooks'}`],
}
const biomeConfigPath = path.resolve(process.cwd(), 'biome.json')

if (fs.existsSync(biomeConfigPath)) {
  console.log('-', color.yellow('Skipping biome.json - file already exists'))
} else {
  fs.writeFileSync(biomeConfigPath, JSON.stringify(biomeConfig, null, 2))
  console.log('-', 'created', color.cyan('biome.json'))
}

/////////////
// VS CODE //
/////////////

const vscodeFolderPath = path.resolve(process.cwd(), '.vscode')
const vscodeSettingsPath = `${vscodeFolderPath}/settings.json`

try {
  fs.mkdirSync(vscodeFolderPath)
} catch {
  // noop
}

let currentVscodeSettings

try {
  currentVscodeSettings = JSON.parse(fs.readFileSync(vscodeSettingsPath))
} catch {
  // noop
}

const vscodeSettings = {
  ...currentVscodeSettings,
  'prettier.enable': false,
  'eslint.enable': false,
  'biome.enabled': true,
  'editor.defaultFormatter': 'biomejs.biome',
  'editor.formatOnSave': true,
  'editor.codeActionsOnSave': {
    'source.fixAll.biome': 'explicit',
    'source.organizeImports.biome': 'explicit',
  },
}
const vscodeSettingsContents = [
  JSON.stringify(vscodeSettings, null, 2),
  '', // Ensure an empty line at the end of the file.
].join('\n')

fs.writeFileSync(vscodeSettingsPath, vscodeSettingsContents)
console.log(
  '-',
  currentVscodeSettings ? 'updated' : 'created',
  color.cyan('./vscode/settings.json')
)

//////////////////////
// PKG JSON SCRIPTS //
//////////////////////

pkgJson.scripts = {
  ...pkgJson.scripts,
  check: 'biome check',
  'check:fix': 'biome check --write .',
  lint: 'biome lint',
  'lint:fix': 'biome lint --write .',
  format: 'biome format',
  'format:fix': 'biome format --write .',
}

fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2))

console.log('-', 'updated', color.cyan('package.json'), 'scripts')
console.log('')
console.log(color.greenBright('Biome setup complete!'))
console.log('"Reload Window" in VS Code for Biome to take effect.')
console.log('')
