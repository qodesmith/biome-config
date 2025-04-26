import type {Config} from 'release-it'

// biome-ignore lint/style/noDefaultExport: this is how release-it works
export default {
  git: {
    requireBranch: 'main',

    // https://github.com/release-it/release-it/blob/main/docs/changelog.md#auto-changelog
    changelog:
      'bunx auto-changelog --stdout --commit-limit false -u --template ./src/changelog-compact.hbs',
  },

  // https://github.com/release-it/release-it?tab=readme-ov-file#hooks
  hooks: {
    'before:init': ['bun run build'],
    'after:bump': ['bunx auto-changelog -p'],
  },

  github: {
    release: true,
  },
  npm: {
    publish: true,
  },
} satisfies Config
