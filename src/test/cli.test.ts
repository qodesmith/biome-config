import {afterEach, describe, expect, test} from 'bun:test'

import {run} from '../cli.mjs'
import {createTestProject, fileExists, readJson} from './testHelpers'

const devDependencies = {devDependencies: {'@qodestack/biome-config': '^1.0.0'}}

let cleanup = () => {}

afterEach(() => {
  cleanup()
  cleanup = () => {}
})

function runCli(testDir: string, args: string[] = []) {
  const argv = ['bun', 'cli.mjs', ...args]
  return run({cwd: testDir, argv})
}

describe('dependency validation', () => {
  test('exits with code 1 if @qodestack/biome-config not installed', () => {
    const project = createTestProject()
    cleanup = project.cleanup

    const exitCode = runCli(project.dir)
    expect(exitCode).toBe(1)
  })

  test('succeeds with @qodestack/biome-config in dependencies', () => {
    const project = createTestProject({
      dependencies: {'@qodestack/biome-config': '^1.0.0'},
      devDependencies: {},
    })
    cleanup = project.cleanup

    const exitCode = runCli(project.dir)
    expect(exitCode).toBe(0)
  })

  test('succeeds with @qodestack/biome-config in devDependencies', () => {
    const project = createTestProject(devDependencies)
    cleanup = project.cleanup

    const exitCode = runCli(project.dir)
    expect(exitCode).toBe(0)
  })
})

describe('biome.json creation', () => {
  test('creates biome.json by default', () => {
    const project = createTestProject(devDependencies)
    cleanup = project.cleanup

    runCli(project.dir)

    expect(fileExists(project.dir, 'biome.json')).toBe(true)
    expect(fileExists(project.dir, 'biome.jsonc')).toBe(false)

    const config = readJson(project.dir, 'biome.json') as {extends: string[]}
    expect(config.extends).toEqual(['@qodestack/biome-config/react'])
  })

  test('creates biome.jsonc with --jsonc flag', () => {
    const project = createTestProject(devDependencies)
    cleanup = project.cleanup

    runCli(project.dir, ['--jsonc'])

    expect(fileExists(project.dir, 'biome.json')).toBe(false)
    expect(fileExists(project.dir, 'biome.jsonc')).toBe(true)
  })

  test('uses vanilla extends with --vanilla flag', () => {
    const project = createTestProject(devDependencies)
    cleanup = project.cleanup

    runCli(project.dir, ['--vanilla'])

    const config = readJson(project.dir, 'biome.json') as {extends: string[]}
    expect(config.extends).toEqual(['@qodestack/biome-config'])
  })

  test('skips biome config with --no-includeBiomeConfig', () => {
    const project = createTestProject(devDependencies)
    cleanup = project.cleanup

    runCli(project.dir, ['--no-includeBiomeConfig'])

    expect(fileExists(project.dir, 'biome.json')).toBe(false)
    expect(fileExists(project.dir, 'biome.jsonc')).toBe(false)
  })

  test('exits early if biome.json already exists', () => {
    const project = createTestProject({...devDependencies, hasBiomeJson: true})
    cleanup = project.cleanup

    const exitCode = runCli(project.dir)

    expect(exitCode).toBe(0)
    // Should not create vscode settings since it exits early
    expect(fileExists(project.dir, '.vscode/settings.json')).toBe(false)
  })

  test('exits early if biome.jsonc exists and --jsonc flag used', () => {
    const project = createTestProject({...devDependencies, hasBiomeJsonc: true})
    cleanup = project.cleanup

    const exitCode = runCli(project.dir, ['--jsonc'])

    expect(exitCode).toBe(0)
    expect(fileExists(project.dir, '.vscode/settings.json')).toBe(false)
  })

  test('warns but proceeds when biome.json exists and --jsonc used', () => {
    const project = createTestProject({...devDependencies, hasBiomeJson: true})
    cleanup = project.cleanup

    const exitCode = runCli(project.dir, ['--jsonc'])

    expect(exitCode).toBe(0)
    expect(fileExists(project.dir, 'biome.jsonc')).toBe(true)
  })

  test('warns but proceeds when biome.jsonc exists and creating biome.json', () => {
    const project = createTestProject({...devDependencies, hasBiomeJsonc: true})
    cleanup = project.cleanup

    const exitCode = runCli(project.dir)

    expect(exitCode).toBe(0)
    // Should NOT create biome.json when jsonc exists
    expect(fileExists(project.dir, 'biome.json')).toBe(false)
  })
})

describe('VSCode settings', () => {
  test('creates .vscode/settings.json by default', () => {
    const project = createTestProject(devDependencies)
    cleanup = project.cleanup

    runCli(project.dir)

    expect(fileExists(project.dir, '.vscode/settings.json')).toBe(true)

    const settings = readJson(project.dir, '.vscode/settings.json') as Record<
      string,
      unknown
    >
    expect(settings['biome.enabled']).toBe(true)
    expect(settings['editor.formatOnSave']).toBe(true)
  })

  test('merges with existing vscode settings', () => {
    const project = createTestProject({
      ...devDependencies,
      existingVscodeSettings: {
        customSetting: true,
        'editor.codeActionsOnSave': {
          'source.existingAction': 'explicit',
        },
      },
    })
    cleanup = project.cleanup

    runCli(project.dir)

    const settings = readJson(project.dir, '.vscode/settings.json') as Record<
      string,
      unknown
    >
    expect(settings.customSetting).toBe(true)
    expect(settings['biome.enabled']).toBe(true)
    const codeActions = settings['editor.codeActionsOnSave'] as Record<
      string,
      string
    >
    expect(codeActions['source.existingAction']).toBe('explicit')
    expect(codeActions['source.fixAll.biome']).toBe('explicit')
  })

  test('skips vscode with --no-vscode flag', () => {
    const project = createTestProject(devDependencies)
    cleanup = project.cleanup

    runCli(project.dir, ['--no-vscode'])

    expect(fileExists(project.dir, '.vscode')).toBe(false)
  })

  test('skips vscode with --no-includeVscode flag', () => {
    const project = createTestProject(devDependencies)
    cleanup = project.cleanup

    runCli(project.dir, ['--no-includeVscode'])

    expect(fileExists(project.dir, '.vscode')).toBe(false)
  })
})

describe('package.json scripts', () => {
  test('adds biome scripts to package.json', () => {
    const project = createTestProject(devDependencies)
    cleanup = project.cleanup

    runCli(project.dir)

    const pkg = readJson(project.dir, 'package.json') as {
      scripts: Record<string, string>
    }
    expect(pkg.scripts.check).toBe('biome check')
    expect(pkg.scripts['check:fix']).toBe('biome check --write .')
    expect(pkg.scripts.lint).toBe('biome lint')
    expect(pkg.scripts['lint:fix']).toBe('biome lint --write .')
    expect(pkg.scripts.format).toBe('biome format')
    expect(pkg.scripts['format:fix']).toBe('biome format --write .')
  })

  test('preserves existing scripts', () => {
    const project = createTestProject({
      ...devDependencies,
      existingScripts: {
        dev: 'vite',
        build: 'tsc && vite build',
      },
    })
    cleanup = project.cleanup

    runCli(project.dir)

    const pkg = readJson(project.dir, 'package.json') as {
      scripts: Record<string, string>
    }
    expect(pkg.scripts.dev).toBe('vite')
    expect(pkg.scripts.build).toBe('tsc && vite build')
    expect(pkg.scripts.check).toBe('biome check')
  })

  test('skips scripts with --no-includeScripts', () => {
    const project = createTestProject({
      ...devDependencies,
      existingScripts: {dev: 'vite'},
    })
    cleanup = project.cleanup

    runCli(project.dir, ['--no-includeScripts'])

    const pkg = readJson(project.dir, 'package.json') as {
      scripts: Record<string, string | undefined>
    }
    expect(pkg.scripts.dev).toBe('vite')
    expect(pkg.scripts.check).toBeUndefined()
  })
})

describe('flag combinations', () => {
  test('--vanilla --jsonc creates vanilla jsonc config', () => {
    const project = createTestProject(devDependencies)
    cleanup = project.cleanup

    runCli(project.dir, ['--vanilla', '--jsonc'])

    expect(fileExists(project.dir, 'biome.jsonc')).toBe(true)
    const config = readJson(project.dir, 'biome.jsonc') as {extends: string[]}
    expect(config.extends).toEqual(['@qodestack/biome-config'])
  })

  test('all --no flags skips all file creation', () => {
    const project = createTestProject(devDependencies)
    cleanup = project.cleanup

    runCli(project.dir, [
      '--no-includeBiomeConfig',
      '--no-includeVscode',
      '--no-includeScripts',
    ])

    expect(fileExists(project.dir, 'biome.json')).toBe(false)
    expect(fileExists(project.dir, 'biome.jsonc')).toBe(false)
    expect(fileExists(project.dir, '.vscode')).toBe(false)

    const pkg = readJson(project.dir, 'package.json') as {
      scripts: Record<string, string | undefined>
    }
    expect(pkg.scripts.check).toBeUndefined()
  })

  test('--no-vscode does not affect --no-includeVscode behavior', () => {
    const project = createTestProject(devDependencies)
    cleanup = project.cleanup

    // Both flags should result in no vscode settings
    runCli(project.dir, ['--no-vscode'])
    expect(fileExists(project.dir, '.vscode')).toBe(false)
  })
})

describe('edge cases', () => {
  test('both biome.json and biome.jsonc exist - exits without jsonc flag', () => {
    const project = createTestProject({
      ...devDependencies,
      hasBiomeJson: true,
      hasBiomeJsonc: true,
    })
    cleanup = project.cleanup

    const exitCode = runCli(project.dir)

    // Should exit early because biome.json exists
    expect(exitCode).toBe(0)
  })

  test('both biome.json and biome.jsonc exist - exits with jsonc flag', () => {
    const project = createTestProject({
      ...devDependencies,
      hasBiomeJson: true,
      hasBiomeJsonc: true,
    })
    cleanup = project.cleanup

    const exitCode = runCli(project.dir, ['--jsonc'])

    // Should exit early because biome.jsonc exists
    expect(exitCode).toBe(0)
  })
})
