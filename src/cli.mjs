#!/usr/bin/env node

import {execSync} from 'node:child_process'
import fs, {existsSync} from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {parseArgs} from 'node:util'

import {mind as mindGradient} from 'gradient-string'
import {parse} from 'jsonc-parser'
import color from 'picocolors'

import {files} from './commonBiomeSettings.mjs'

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
const biomeConfig = {
  $schema: './node_modules/@biomejs/biome/configuration_schema.json',
  extends: [`@qodestack/biome-config${isVanilla ? '' : '/react'}`],

  /**
   * Settings likekly to be customized by the user.
   *
   * Exposing these as opposed to keeping them opaque in the generated biome
   * settings files provided by this package.
   */
  files,
}

// biome.json takes precedence over biome.jsonc
const biomeJsonPath = path.resolve(process.cwd(), 'biome.json')
const biomeJsoncPath = path.resolve(process.cwd(), 'biome.jsonc')
const isJsonc = args.values.jsonc
const hasBiomeJson = fs.existsSync(biomeJsonPath)
const hasBiomeJsonc = fs.existsSync(biomeJsoncPath)
const biomeConfigStr = JSON.stringify(biomeConfig)

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
      `A ${color.bold('biome.jsonc')} file already exists. Delete this file first or proceed with a manual setup.`
    )
    console.log('')
    process.exit()
  } else if (hasBiomeJson) {
    console.warn(
      `⚠️ A ${color.bold('biome.json')} file already exists. ${color.bold('biome.jsonc')} will be created but Biome will default to reading ${color.bold('biome.json')}.`
    )
  }

  fs.writeFileSync(biomeJsoncPath, biomeConfigStr)
  console.log('-', 'created', color.cyan('biome.jsonc'))
} else if (hasBiomeJson) {
  console.log(
    `A ${color.bold('biome.json')} file already exists. Delete this file first or proceed with a manual setup.`
  )
  console.log('')
  process.exit()
} else if (hasBiomeJsonc) {
  console.warn(
    `⚠️ A ${color.bold('biome.jsonc')} file already exists. Proceeding without creating a new config...`
  )
} else {
  fs.writeFileSync(biomeJsonPath, biomeConfigStr)
  console.log('-', 'created', color.cyan('biome.json'))
}

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
      return parse(fs.readFileSync(vscodeSettingsPath, {encoding: 'utf8'}))
    } catch {
      return undefined
    }
  })()

  const vscodeSettings = {
    ...currentVscodeSettings,
    'prettier.enable': false,
    'eslint.enable': false,

    // https://next.biomejs.dev/linter/rules/use-import-type/#description
    'typescript.preferences.preferTypeOnlyAutoImports': true,

    'biome.enabled': true,
    '[typescript][typescriptreact][javascript][javascriptreact][json][jsonc]': {
      'editor.defaultFormatter': 'biomejs.biome',
    },
    'editor.defaultFormatter': 'biomejs.biome',
    'editor.formatOnSave': true,
    'editor.codeActionsOnSave': {
      ...currentVscodeSettings?.['editor.codeActionsOnSave'],
      'source.fixAll.biome': 'explicit',
      'source.organizeImports.biome': 'explicit',
    },
  }
  const vscodeSettingsStr = JSON.stringify(vscodeSettings)

  fs.writeFileSync(vscodeSettingsPath, vscodeSettingsStr)
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

const pkgJsonStr = JSON.stringify(pkgJson)
fs.writeFileSync(pkgJsonPath, pkgJsonStr)

//////////////////
// FORMAT FILES //
//////////////////

const biomeExecPath = path.resolve(process.cwd(), './node_modules/.bin/biome')
const filesToFormat = [
  biomeJsoncPath,
  biomeJsonPath,
  vscodeSettingsPath,
  pkgJsonPath,
]
  .filter(filePath => existsSync(filePath))
  .join(' ')

execSync(`${biomeExecPath} format --write ${filesToFormat}`)

console.log('-', 'updated', color.cyan('package.json'), 'scripts')
console.log('')
console.log(color.greenBright('Biome setup complete!'))
console.log('"Reload Window" in VS Code for Biome to take effect.')
console.log('')

// biome-ignore-end lint/suspicious/noConsole: intentionally used
