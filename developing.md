# Developing This Package

### `bun outdated`

Shows which packages have new versions available. If `@biomejs/biome` has a new version, we continue to the next step.

### `bun update`

- Run `bun update` to update most packages
- Change the version of `@biomejs/biome` in `package.json` to the latest version printed by `bun outdated`
- Run `bun i` to install the newer version of `@biomejs/biome`

### `bun run build`

Kicks off a few tasks:

1. Runs a schema check
    - If `@biomejs/biome` was updated, this will likely show an error message such as `Update the schema version in biome.jsonc to x.x.x`. Take care of that and run this command again.
1. Generates Biome TypeScript types in `biomeSchema.d.ts`
1. Checks for changes in Biome's list of rules
    - Check `ruleChanges.json` for a list of new and deleted rules
    - `ruleData.json` will have a comprehensive list of rules and metadata. This file can also be checked for changes.
1. Biome config files will be created in the `dist` folder

### Make Biome config changes

1. Update `createBiomeConfig.ts` with data from `ruleChanges.json` in mind.
1. Run `bun run build` again to generate new configs
1. Commit changes to version control

### `bun run release`

Uses [release-it](https://github.com/release-it/release-it) to handle publishing to npm, tagging a release, and pushing those changes.
