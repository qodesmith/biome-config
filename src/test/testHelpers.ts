import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

type CreateTestProjectOptions = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  existingScripts?: Record<string, string>
  existingVscodeSettings?: Record<string, unknown>
  existingVscodeSettingsRaw?: string
  hasBiomeJson?: boolean
  hasBiomeJsonc?: boolean
  noPkgJson?: boolean
  malformedPkgJson?: boolean
  noScriptsField?: boolean
  vscodeFolderOnly?: boolean
}

export function createTestProject(options: CreateTestProjectOptions = {}) {
  const {
    dependencies = {},
    devDependencies = {},
    existingScripts = {},
    existingVscodeSettings,
    existingVscodeSettingsRaw,
    hasBiomeJson = false,
    hasBiomeJsonc = false,
    noPkgJson = false,
    malformedPkgJson = false,
    noScriptsField = false,
    vscodeFolderOnly = false,
  } = options

  // Create temp directory
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'biome-config-test-'))

  // Create package.json
  if (!noPkgJson) {
    if (malformedPkgJson) {
      fs.writeFileSync(path.join(dir, 'package.json'), '{invalid json')
    } else {
      const pkgJson: Record<string, unknown> = {
        name: 'test-project',
        version: '1.0.0',
        dependencies,
        devDependencies,
      }
      if (!noScriptsField) {
        pkgJson.scripts = existingScripts
      }
      fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify(pkgJson, null, 2)
      )
    }
  }

  // Create stub biome binary
  const nodeModulesBin = path.join(dir, 'node_modules', '.bin')
  fs.mkdirSync(nodeModulesBin, {recursive: true})

  const biomeStub = `#!/bin/sh
exit 0
`
  const biomePath = path.join(nodeModulesBin, 'biome')
  fs.writeFileSync(biomePath, biomeStub)
  fs.chmodSync(biomePath, '755')

  // Create existing biome configs if requested
  if (hasBiomeJson) {
    fs.writeFileSync(path.join(dir, 'biome.json'), '{}')
  }
  if (hasBiomeJsonc) {
    fs.writeFileSync(path.join(dir, 'biome.jsonc'), '{}')
  }

  // Create existing vscode settings if requested
  if (
    existingVscodeSettings !== undefined ||
    existingVscodeSettingsRaw !== undefined ||
    vscodeFolderOnly
  ) {
    const vscodeDir = path.join(dir, '.vscode')
    fs.mkdirSync(vscodeDir, {recursive: true})
    if (existingVscodeSettingsRaw !== undefined) {
      fs.writeFileSync(
        path.join(vscodeDir, 'settings.json'),
        existingVscodeSettingsRaw
      )
    } else if (existingVscodeSettings !== undefined) {
      fs.writeFileSync(
        path.join(vscodeDir, 'settings.json'),
        JSON.stringify(existingVscodeSettings, null, 2)
      )
    }
    // vscodeFolderOnly creates folder but no settings.json
  }

  const cleanup = () => {
    fs.rmSync(dir, {recursive: true, force: true})
  }

  return {dir, cleanup}
}

export function readJson(testDir: string, filePath: string): unknown {
  const fullPath = path.join(testDir, filePath)
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'))
}

export function fileExists(testDir: string, filePath: string): boolean {
  return fs.existsSync(path.join(testDir, filePath))
}
