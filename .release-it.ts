import type {Config} from 'release-it'

// biome-ignore lint/style/noDefaultExport: this is how release-it works
export default {
  git: {
    requireBranch: 'main',
  },

  // https://github.com/release-it/release-it?tab=readme-ov-file#hooks
  hooks: {
    'before:init': ['bun run build'],
    'after:bump': ['bunx auto-changelog --commit-limit false -p'],
  },
  github: {
    release: true,
  },
  npm: {
    publish: true,
  },
} satisfies Config
