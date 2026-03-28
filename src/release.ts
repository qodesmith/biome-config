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

function exec(cmd: string, args: string[]) {
  const result = spawnSync(cmd, args, {stdio: 'inherit'})
  return {ok: result.status === 0}
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
    p.log.step('Creating GitHub release...')
    const ghOk = exec('gh', [
      'release',
      'create',
      tag,
      '--generate-notes',
      '--title',
      tag,
    ]).ok
    if (!ghOk) {
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
    p.log.step('Publishing to npm...')
    const publishResult = spawnSync('bun', ['publish'], {stdio: 'inherit'})
    if (publishResult.status !== 0) {
      p.cancel(
        `Release is tagged on GitHub but not published to npm. Run ${pc.bold('bun publish')} to retry.`
      )
      process.exit(1)
    }
    p.log.step('Published to npm')
  }

  p.outro(pc.green(`${tag} released!`))
}

async function main() {
  p.intro(pc.bgCyan(pc.black(' release ')))

  // 1. Verify gh CLI is installed and authenticated.
  if (!run('gh', ['--version']).ok) {
    p.cancel(
      'GitHub CLI (gh) is not installed. Install it from https://cli.github.com'
    )
    process.exit(1)
  }

  if (!run('gh', ['auth', 'status']).ok) {
    p.log.warning('GitHub CLI is not authenticated. Starting login...')
    const ghLoginResult = spawnSync('gh', ['auth', 'login'], {
      stdio: 'inherit',
    })
    if (ghLoginResult.status !== 0) {
      p.cancel('GitHub CLI login failed.')
      process.exit(1)
    }
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
  p.log.step('Running build...')
  if (!exec('bun', ['run', 'build']).ok) {
    p.cancel('Build failed.')
    process.exit(1)
  }

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

    // Check if there are new commits since the tag.
    const newCommits = run('git', [
      'rev-list',
      `${currentTag}..HEAD`,
      '--count',
    ])
    const hasNewCommits = newCommits.ok && Number(newCommits.stdout) > 0

    if (alreadyOnNpm && !hasNewCommits) {
      p.cancel(
        `${pc.bold(currentTag)} is already released and published. Nothing to do.`
      )
      process.exit(0)
    }

    if (alreadyOnNpm && hasNewCommits) {
      // Happy path — previous release completed, new commits exist.
      // Fall through to version bump prompt.
    } else if (!alreadyOnNpm) {
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
  p.log.step('Generating changelog...')
  if (!exec('bunx', ['auto-changelog', '--commit-limit', 'false', '-p']).ok) {
    fail('Changelog generation failed.', tag, false)
  }

  // 12. Git commit, tag, push.
  p.log.step('Committing and tagging...')

  if (!exec('git', ['add', 'package.json', 'CHANGELOG.md']).ok) {
    fail('git add failed.', tag, false)
  }

  if (!exec('git', ['commit', '-m', `Release ${newVersion}`]).ok) {
    fail('git commit failed.', tag, false)
  }

  if (!exec('git', ['tag', tag]).ok) {
    fail('git tag failed.', tag, true)
  }

  p.log.step('Pushing to remote...')

  if (!exec('git', ['push']).ok) {
    fail('git push failed.', tag, true)
  }

  if (!exec('git', ['push', 'origin', tag]).ok) {
    run('git', ['tag', '-d', tag])
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

  await finishRelease(tag)
}

await main()
