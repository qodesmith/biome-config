#!/usr/bin/env node

import fs, {existsSync} from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {parseArgs} from 'node:util'

import {Biome, Distribution} from '@biomejs/js-api'
import {mind as mindGradient} from 'gradient-string'
import color from 'picocolors'

const biome = await Biome.create({distribution: Distribution.NODE})

function formatJson(codeString) {
  return biome.formatContent(codeString, {
    filePath: 'example.json',
  }).content
}

// biome-ignore-start lint/suspicious/noConsole: intentionally used

////////////////////
// PKG JSON CHECK //
////////////////////

const pkgJsonPath = path.resolve(process.cwd(), 'package.json')
const pkgJson = (() => {
  try {
    return JSON.parse(fs.readFileSync(pkgJsonPath, {encoding: 'utf8'}))
  } catch {
    return {}
  }
})()

try {
  const {dependencies, devDependencies} = pkgJson

  if (
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
    // Default to creating React projects.
    vanilla: {
      type: 'boolean',
      default: false,
    },

    // Default to using VS Code.
    vscode: {
      type: 'boolean',
      default: true,
    },

    // Default to including Jotai hooks.
    extraHooks: {
      type: 'boolean',
      default: true,
    },

    // Default to using json over jsonc.
    jsonc: {
      type: 'boolean',
      default: false,
    },
  },
  allowPositionals: true,
  allowNegative: true,
})

const isVanilla = args.values.vanilla
const reactFlavor = args.values.extraHooks ? '/reactExtraHooks' : '/react'
const biomeConfig = {
  $schema: './node_modules/@biomejs/biome/configuration_schema.json',
  extends: [`@qodestack/biome-config${isVanilla ? '' : reactFlavor}`],
}

// biome.json takes precedence over biome.jsonc
const biomeJsonPath = path.resolve(process.cwd(), 'biome.json')
const biomeJsoncPath = path.resolve(process.cwd(), 'biome.jsonc')
const isJsonc = args.values.jsonc
const hasBiomeJson = fs.existsSync(biomeJsonPath)
const hasBiomeJsonc = fs.existsSync(biomeJsoncPath)
const formattedBiomeConfig = formatJson(JSON.stringify(biomeConfig, null, 2))

/*
  - jsonc: true
    - has jsonc - quit
    - has json - warn & proceed
  - jsonc: false
    - has jsonc - warn & proceed
    - has json - quit
*/

if (isJsonc) {
  if (hasBiomeJsonc) {
    console.log(
      'A biome.jsonc file already exists. Proceed manually or delete the file.'
    )
    console.log('')
    process.exit()
  } else if (hasBiomeJson) {
    console.warn(
      '⚠️ A biome.json file already exists. Biome will use that instead of biome.jsonc'
    )
  }

  fs.writeFileSync(biomeJsoncPath, formattedBiomeConfig)
  console.log('-', 'created', color.cyan('biome.jsonc'))
} else if (hasBiomeJson) {
  console.log(
    'A biome.json file already exists. Proceed manually or delete the file.'
  )
  console.log('')
  process.exit()
} else if (hasBiomeJsonc) {
  console.warn(
    '⚠️ A biome.jsonc file already exists. Biome will ignore that in favor of biome.json'
  )
}

fs.writeFileSync(biomeJsonPath, formattedBiomeConfig)
console.log('-', 'created', color.cyan('biome.json'))

/////////////
// VS CODE //
/////////////

const isVscode = args.values.vscode
const vscodeFolderPath = path.resolve(process.cwd(), '.vscode')
const vscodeFolderExists = existsSync(vscodeFolderPath)
const vscodeSettingsPath = `${vscodeFolderPath}/settings.json`

if (isVscode) {
  if (!vscodeFolderExists) {
    fs.mkdirSync(vscodeFolderPath)
  }

  const currentVscodeSettings = (() => {
    try {
      return JSON.parse(fs.readFileSync(vscodeSettingsPath, {encoding: 'utf8'}))
    } catch {
      return {}
    }
  })()

  const vscodeSettings = {
    ...currentVscodeSettings,
    'prettier.enable': false,
    'eslint.enable': false,

    // https://next.biomejs.dev/linter/rules/use-import-type/#description
    'typescript.preferences.preferTypeOnlyAutoImports': true,

    'biome.enabled': true,

    'editor.defaultFormatter': 'biomejs.biome',
    'editor.formatOnSave': true,
    'editor.codeActionsOnSave': {
      ...currentVscodeSettings?.['editor.codeActionsOnSave'],
      'source.fixAll.biome': 'explicit',
      'source.organizeImports.biome': 'explicit',
    },
  }
  const formattedVscodeSettings = formatJson(
    JSON.stringify(vscodeSettings, null, 2)
  )

  fs.writeFileSync(vscodeSettingsPath, formattedVscodeSettings)
  console.log(
    '-',
    currentVscodeSettings ? 'updated' : 'created',
    color.cyan('./vscode/settings.json')
  )
}

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

const formattedPkgJson = formatJson(JSON.stringify(pkgJson, null, 2))
fs.writeFileSync(pkgJsonPath, formattedPkgJson)

console.log('-', 'updated', color.cyan('package.json'), 'scripts')
console.log('')
console.log(color.greenBright('Biome setup complete!'))
console.log('"Reload Window" in VS Code for Biome to take effect.')
console.log('')

// biome-ignore-end lint/suspicious/noConsole: intentionally used
