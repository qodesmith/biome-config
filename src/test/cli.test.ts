import {afterEach, describe, expect, test} from 'bun:test'

import {run} from '../cli.mjs'
import {createTestProject, fileExists, readJson} from './testHelpers'

type DefaultBiomeConfig = typeof defaultBiomeconfig

const devDependencies = {devDependencies: {'@qodestack/biome-config': '^1.0.0'}}
const defaultBiomeconfig = {
  $schema: './node_modules/@biomejs/biome/configuration_schema.json',
  extends: ['@qodestack/biome-config/react'], // React is the default config to extend.
  files: {
    ignoreUnknown: true,
    includes: ['**', '!**/node_modules', '!dist', '!*.lock'],
  },
}
const defaultVscodeSettings = {
  'prettier.enable': false,
  'eslint.enable': false,
  'typescript.preferences.preferTypeOnlyAutoImports': true,
  'biome.enabled': true,
  '[typescript][typescriptreact][javascript][javascriptreact][json][jsonc]': {
    'editor.defaultFormatter': 'biomejs.biome',
  },
  'editor.defaultFormatter': 'biomejs.biome',
  'editor.formatOnSave': true,
  'editor.codeActionsOnSave': {
    'source.fixAll.biome': 'explicit',
    'source.organizeImports.biome': 'explicit',
  },
}
const defaultPkJsonScripts = {
  check: 'biome check',
  'check:fix': 'biome check --write .',
  lint: 'biome lint',
  'lint:fix': 'biome lint --write .',
  format: 'biome format',
  'format:fix': 'biome format --write .',
}

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
  })

  test('creates biome.jsonc with --jsonc flag', () => {
    const project = createTestProject(devDependencies)
    cleanup = project.cleanup

    runCli(project.dir, ['--jsonc'])

    expect(fileExists(project.dir, 'biome.json')).toBe(false)
    expect(fileExists(project.dir, 'biome.jsonc')).toBe(true)
  })

  test('default biome settings', () => {
    const project = createTestProject(devDependencies)
    cleanup = project.cleanup

    runCli(project.dir)

    const config = readJson(project.dir, 'biome.json') as DefaultBiomeConfig
    expect(config).toEqual(defaultBiomeconfig)
  })

  test('vanilla biome settings', () => {
    const project = createTestProject(devDependencies)
    cleanup = project.cleanup

    runCli(project.dir, ['--vanilla'])

    const config = readJson(project.dir, 'biome.json') as DefaultBiomeConfig
    expect(config).toEqual({
      ...defaultBiomeconfig,
      // As opposed to `@qodestack/biome-config/react`
      extends: ['@qodestack/biome-config'],
    })
  })

  test('skips biome config with --no-include-biome-config', () => {
    const project = createTestProject(devDependencies)
    cleanup = project.cleanup

    runCli(project.dir, ['--no-include-biome-config'])

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

    expect(settings).toEqual(defaultVscodeSettings)
  })

  test('merges with existing vscode settings', () => {
    const existingVscodeSettings = {
      customSetting: true,
      'editor.codeActionsOnSave': {
        'source.existingAction': 'explicit',
      },
    }
    const project = createTestProject({
      ...devDependencies,
      existingVscodeSettings,
    })
    cleanup = project.cleanup

    runCli(project.dir)

    const settings = readJson(project.dir, '.vscode/settings.json') as Record<
      string,
      unknown
    >

    expect(settings).toEqual({
      ...defaultVscodeSettings,
      ...existingVscodeSettings,
      'editor.codeActionsOnSave': {
        ...defaultVscodeSettings['editor.codeActionsOnSave'],
        ...existingVscodeSettings['editor.codeActionsOnSave'],
      },
    })
  })

  test('skips vscode with --no-vscode flag', () => {
    const project = createTestProject(devDependencies)
    cleanup = project.cleanup

    runCli(project.dir, ['--no-vscode'])

    expect(fileExists(project.dir, '.vscode')).toBe(false)
  })

  test('skips vscode with --no-include-vscode flag', () => {
    const project = createTestProject(devDependencies)
    cleanup = project.cleanup

    runCli(project.dir, ['--no-include-vscode'])

    expect(fileExists(project.dir, '.vscode')).toBe(false)
  })

  test('creates settings.json when .vscode folder exists but settings.json does not', () => {
    const project = createTestProject({
      ...devDependencies,
      vscodeFolderOnly: true,
    })
    cleanup = project.cleanup

    runCli(project.dir)

    expect(fileExists(project.dir, '.vscode/settings.json')).toBe(true)
    const settings = readJson(project.dir, '.vscode/settings.json') as Record<
      string,
      unknown
    >
    expect(settings).toEqual(defaultVscodeSettings)
  })

  test('parses and merges JSONC settings with comments', () => {
    const jsoncWithComments = `{
      // This is a comment
      "customSetting": true,
      /* Another comment */
      "anotherSetting": "value"
    }`
    const project = createTestProject({
      ...devDependencies,
      existingVscodeSettingsRaw: jsoncWithComments,
    })
    cleanup = project.cleanup

    runCli(project.dir)

    const settings = readJson(project.dir, '.vscode/settings.json') as Record<
      string,
      unknown
    >
    expect(settings).toEqual({
      ...defaultVscodeSettings,
      customSetting: true,
      anotherSetting: 'value',
    })
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
    expect(pkg.scripts).toEqual(defaultPkJsonScripts)
  })

  test('preserves existing scripts', () => {
    const existingScripts = {
      dev: 'vite',
      build: 'tsc && vite build',
    }
    const project = createTestProject({...devDependencies, existingScripts})
    cleanup = project.cleanup

    runCli(project.dir)

    const pkg = readJson(project.dir, 'package.json') as {
      scripts: Record<string, string>
    }
    expect(pkg.scripts).toEqual({...defaultPkJsonScripts, ...existingScripts})
  })

  test('skips scripts with --no-include-scripts', () => {
    const existingScripts = {dev: 'vite'}
    const project = createTestProject({...devDependencies, existingScripts})
    cleanup = project.cleanup

    runCli(project.dir, ['--no-include-scripts'])

    const pkg = readJson(project.dir, 'package.json') as {
      scripts: Record<string, string | undefined>
    }
    expect(pkg.scripts).toEqual(existingScripts)
  })
})

describe('flag combinations', () => {
  test('--vanilla --jsonc creates vanilla jsonc config', () => {
    const project = createTestProject(devDependencies)
    cleanup = project.cleanup

    runCli(project.dir, ['--vanilla', '--jsonc'])

    expect(fileExists(project.dir, 'biome.jsonc')).toBe(true)
    const config = readJson(project.dir, 'biome.jsonc') as DefaultBiomeConfig
    expect(config).toEqual({
      ...defaultBiomeconfig,
      extends: ['@qodestack/biome-config'],
    })
  })

  test('all --no flags skips all file creation', () => {
    const project = createTestProject(devDependencies)
    cleanup = project.cleanup

    runCli(project.dir, [
      '--no-include-biome-config',
      '--no-include-vscode',
      '--no-include-scripts',
    ])

    expect(fileExists(project.dir, 'biome.json')).toBe(false)
    expect(fileExists(project.dir, 'biome.jsonc')).toBe(false)
    expect(fileExists(project.dir, '.vscode')).toBe(false)

    const pkg = readJson(project.dir, 'package.json') as {
      scripts: Record<string, string | undefined>
    }
    expect(pkg.scripts).toEqual({})
  })

  test('--no-vscode does not affect --no-include-vscode behavior', () => {
    const project = createTestProject(devDependencies)
    cleanup = project.cleanup

    // Both flags should result in no vscode settings
    runCli(project.dir, ['--no-vscode'])
    expect(fileExists(project.dir, '.vscode')).toBe(false)
  })

  test('--no-vscode overrides --include-vscode (both must be true)', () => {
    const project = createTestProject(devDependencies)
    cleanup = project.cleanup

    // isVscode=false && include-vscode=true => no vscode
    runCli(project.dir, ['--no-vscode', '--include-vscode'])
    expect(fileExists(project.dir, '.vscode')).toBe(false)
  })

  test('--vscode with --no-include-vscode skips vscode', () => {
    const project = createTestProject(devDependencies)
    cleanup = project.cleanup

    // isVscode=true && include-vscode=false => no vscode
    runCli(project.dir, ['--vscode', '--no-include-vscode'])
    expect(fileExists(project.dir, '.vscode')).toBe(false)
  })
})

describe('edge cases', () => {
  test('exits with code 1 if no package.json exists', () => {
    const project = createTestProject({noPkgJson: true})
    cleanup = project.cleanup

    const exitCode = runCli(project.dir)
    expect(exitCode).toBe(1)
  })

  test('exits with code 1 if package.json is malformed', () => {
    const project = createTestProject({malformedPkgJson: true})
    cleanup = project.cleanup

    const exitCode = runCli(project.dir)
    expect(exitCode).toBe(1)
  })

  test('works when package.json has no scripts field', () => {
    const project = createTestProject({
      ...devDependencies,
      noScriptsField: true,
    })
    cleanup = project.cleanup

    const exitCode = runCli(project.dir)
    expect(exitCode).toBe(0)

    const pkg = readJson(project.dir, 'package.json') as {
      scripts: Record<string, string>
    }
    expect(pkg.scripts).toEqual(defaultPkJsonScripts)
  })

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
