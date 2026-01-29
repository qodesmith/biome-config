import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

type CreateTestProjectOptions = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  existingScripts?: Record<string, string>
  existingVscodeSettings?: Record<string, unknown>
  hasBiomeJson?: boolean
  hasBiomeJsonc?: boolean
}

export function createTestProject(options: CreateTestProjectOptions = {}) {
  const {
    dependencies = {},
    devDependencies = {},
    existingScripts = {},
    existingVscodeSettings,
    hasBiomeJson = false,
    hasBiomeJsonc = false,
  } = options

  // Create temp directory
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'biome-config-test-'))

  // Create package.json
  const pkgJson = {
    name: 'test-project',
    version: '1.0.0',
    scripts: existingScripts,
    dependencies,
    devDependencies,
  }
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify(pkgJson, null, 2)
  )

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
  if (existingVscodeSettings !== undefined) {
    const vscodeDir = path.join(dir, '.vscode')
    fs.mkdirSync(vscodeDir, {recursive: true})
    fs.writeFileSync(
      path.join(vscodeDir, 'settings.json'),
      JSON.stringify(existingVscodeSettings, null, 2)
    )
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
