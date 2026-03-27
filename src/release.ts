import {spawnSync} from 'node:child_process'
import {readFileSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'

import * as p from '@clack/prompts'
import pc from 'picocolors'

const pkgPath = resolve(import.meta.dirname, '..', 'package.json')

function run(cmd: string, args: string[]) {
  const result = spawnSync(cmd, args, {stdio: 'pipe', encoding: 'utf-8'})
  return {
    ok: result.status === 0,
    stdout: result.stdout?.trim() ?? '',
    stderr: result.stderr?.trim() ?? '',
  }
}

function rollback(tag: string, committed: boolean) {
  p.log.info('Rolling back local changes...')
  if (committed) {
    run('git', ['tag', '-d', tag])
    run('git', ['reset', 'HEAD~1'])
  }
  run('git', ['checkout', 'HEAD', '--', 'package.json', 'CHANGELOG.md'])
}

function fail(message: string, tag: string, committed: boolean): never {
  rollback(tag, committed)
  p.cancel(message)
  process.exit(1)
}

function getPkg() {
  return JSON.parse(readFileSync(pkgPath, 'utf-8'))
}

function bumpVersion(
  version: string,
  type: 'patch' | 'minor' | 'major'
): string {
  const [major, minor, patch] = version.split('.').map(Number)
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
      return `${major}.${minor}.${patch + 1}`
    default:
      throw new Error(`Unexpected bumpVersion type - ${type}`)
  }
}

async function finishRelease(tag: string) {
  // Create GitHub release (if it doesn't already exist).
  const releaseExists = run('gh', ['release', 'view', tag]).ok

  if (releaseExists) {
    p.log.step('GitHub release already exists — skipping.')
  } else {
    const releaseSpinner = p.spinner()
    releaseSpinner.start('Creating GitHub release')
    const ghResult = run('gh', [
      'release',
      'create',
      tag,
      '--generate-notes',
      '--title',
      tag,
    ])
    if (ghResult.ok) {
      releaseSpinner.stop(`GitHub release created: ${ghResult.stdout}`)
    } else {
      releaseSpinner.stop(pc.yellow('GitHub release failed'))
      p.log.warning(ghResult.stderr)
      p.log.warning(
        `Run ${pc.bold(`gh release create ${tag} --generate-notes --title ${tag}`)} to retry.`
      )
    }
  }

  // Publish to npm (if not already published).
  const pkg = getPkg()
  const publishedVersions = run('bunx', [
    'npm',
    'view',
    pkg.name,
    'versions',
    '--json',
  ])
  const alreadyPublished =
    publishedVersions.ok &&
    publishedVersions.stdout.includes(`"${pkg.version}"`)

  if (alreadyPublished) {
    p.log.step('Already published to npm — skipping.')
  } else {
    const publishSpinner = p.spinner()
    publishSpinner.start('Publishing to npm')
    const publishResult = run('bun', ['publish'])
    if (!publishResult.ok) {
      publishSpinner.stop('Publish failed')
      p.log.error(publishResult.stderr || publishResult.stdout)
      p.cancel(
        `Release is tagged on GitHub but not published to npm. Run ${pc.bold('bun publish')} to retry.`
      )
      process.exit(1)
    }
    publishSpinner.stop('Published to npm')
  }

  p.outro(pc.green(`${tag} released!`))
}

async function main() {
  p.intro(pc.bgCyan(pc.black(' release ')))

  // 1. Verify gh CLI is installed.
  if (!run('gh', ['--version']).ok) {
    p.cancel(
      'GitHub CLI (gh) is not installed. Install it from https://cli.github.com'
    )
    process.exit(1)
  }

  // 2. Verify npm auth.
  if (!run('bunx', ['npm', 'whoami']).ok) {
    p.log.warning('Not logged in to npm. Starting login...')
    const loginResult = spawnSync('bunx', ['npm', 'login'], {
      stdio: 'inherit',
    })
    if (loginResult.status !== 0) {
      p.cancel('npm login failed.')
      process.exit(1)
    }
  }

  // 3. Verify we're on main branch.
  const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']).stdout
  if (branch !== 'main') {
    p.cancel(
      `Must be on ${pc.bold('main')} branch. Currently on ${pc.bold(branch)}.`
    )
    process.exit(1)
  }

  // 4. Check for uncommitted changes.
  const {stdout: gitStatus} = run('git', ['status', '--porcelain'])
  if (gitStatus) {
    p.cancel(
      'Working directory has uncommitted changes. Commit or stash them first.'
    )
    process.exit(1)
  }

  // 5. Run tests.
  const testSpinner = p.spinner()
  testSpinner.start('Running tests')
  const testResult = run('bun', ['test', 'src/test'])
  if (!testResult.ok) {
    testSpinner.stop('Tests failed')
    p.cancel(testResult.stderr || testResult.stdout)
    process.exit(1)
  }
  testSpinner.stop('Tests passed')

  // 6. Run build.
  const buildSpinner = p.spinner()
  buildSpinner.start('Building')
  const buildResult = run('bun', ['run', 'build'])
  if (!buildResult.ok) {
    buildSpinner.stop('Build failed')
    p.cancel(buildResult.stderr || buildResult.stdout)
    process.exit(1)
  }
  buildSpinner.stop('Build complete')

  // 7. Check for a partially completed release.
  const pkg = getPkg()
  const currentVersion = pkg.version
  const currentTag = `v${currentVersion}`
  const tagExistsOnRemote = run('git', [
    'ls-remote',
    '--tags',
    'origin',
    currentTag,
  ]).stdout.includes(currentTag)

  if (tagExistsOnRemote) {
    const publishedVersions = run('bunx', [
      'npm',
      'view',
      pkg.name,
      'versions',
      '--json',
    ])
    const alreadyOnNpm =
      publishedVersions.ok &&
      publishedVersions.stdout.includes(`"${currentVersion}"`)

    if (alreadyOnNpm) {
      p.cancel(
        `${pc.bold(currentTag)} is already released and published. Nothing to do.`
      )
      process.exit(0)
    }

    p.log.warning(
      `Tag ${pc.bold(currentTag)} exists on remote but is not on npm — a previous release may not have finished.`
    )

    const resume = await p.confirm({
      message: `Resume the ${pc.bold(currentTag)} release?`,
    })

    if (p.isCancel(resume)) {
      p.cancel('Release cancelled.')
      process.exit(0)
    }

    if (resume) {
      await finishRelease(currentTag)
      return
    }
  }

  // 8. Prompt for version bump.
  const releaseType = await p.select({
    message: `Current version: ${pc.bold(currentVersion)}. Select release type:`,
    options: [
      {
        value: 'patch' as const,
        label: `patch → ${pc.green(bumpVersion(currentVersion, 'patch'))}`,
      },
      {
        value: 'minor' as const,
        label: `minor → ${pc.green(bumpVersion(currentVersion, 'minor'))}`,
      },
      {
        value: 'major' as const,
        label: `major → ${pc.green(bumpVersion(currentVersion, 'major'))}`,
      },
    ],
  })

  if (p.isCancel(releaseType)) {
    p.cancel('Release cancelled.')
    process.exit(0)
  }

  const newVersion = bumpVersion(currentVersion, releaseType)
  const tag = `v${newVersion}`

  // 9. Confirm.
  const confirmed = await p.confirm({
    message: `Release ${pc.bold(tag)}?`,
  })

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel('Release cancelled.')
    process.exit(0)
  }

  // 10. Bump version in package.json.
  const bumpSpinner = p.spinner()
  bumpSpinner.start('Bumping version')
  pkg.version = newVersion
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  bumpSpinner.stop(`Version bumped to ${pc.bold(newVersion)}`)

  // 11. Generate changelog.
  const changelogSpinner = p.spinner()
  changelogSpinner.start('Generating changelog')
  const changelogResult = run('bunx', [
    'auto-changelog',
    '--commit-limit',
    'false',
    '-p',
  ])
  if (!changelogResult.ok) {
    changelogSpinner.stop('Changelog generation failed')
    fail(changelogResult.stderr, tag, false)
  }
  changelogSpinner.stop('Changelog updated')

  // 12. Git commit, tag, push.
  const gitSpinner = p.spinner()
  gitSpinner.start('Committing and tagging')

  const addResult = run('git', ['add', 'package.json', 'CHANGELOG.md'])
  if (!addResult.ok) {
    gitSpinner.stop('git add failed')
    fail(addResult.stderr, tag, false)
  }

  const commitResult = run('git', ['commit', '-m', `Release ${newVersion}`])
  if (!commitResult.ok) {
    gitSpinner.stop('git commit failed')
    fail(commitResult.stderr, tag, false)
  }

  const tagResult = run('git', ['tag', tag])
  if (!tagResult.ok) {
    gitSpinner.stop('git tag failed')
    fail(tagResult.stderr, tag, true)
  }

  gitSpinner.stop(`Committed and tagged ${pc.bold(tag)}`)

  const pushSpinner = p.spinner()
  pushSpinner.start('Pushing to remote')

  const pushResult = run('git', ['push'])
  if (!pushResult.ok) {
    pushSpinner.stop('git push failed')
    fail(pushResult.stderr, tag, true)
  }

  const pushTagResult = run('git', ['push', 'origin', tag])
  if (!pushTagResult.ok) {
    pushSpinner.stop('git push tag failed')
    run('git', ['tag', '-d', tag])
    p.log.error(pushTagResult.stderr)
    p.cancel(
      [
        'Commit was pushed but tag push failed. To finish the release:',
        `  1. ${pc.bold(`git tag ${tag} && git push origin ${tag}`)}`,
        `  2. ${pc.bold(`gh release create ${tag} --generate-notes --title ${tag}`)}`,
        `  3. ${pc.bold('bun publish')}`,
      ].join('\n')
    )
    process.exit(1)
  }

  pushSpinner.stop('Pushed to remote')

  await finishRelease(tag)
}

await main()
