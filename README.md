# @qodestack/biome-config

A Biome config for JavaScript, TypeScript, and React projects - linting +
formatting in one!

<details>
  <summary>Why this package</summary>
  I was on a quest to use ESLint (flat configs) and Prettier - great tools. Then
  I bit the <a href="https://antfu.me/posts/why-not-prettier" target="_blank">Antfu</a>
  bug about not using Prettier and having ESLint do
  <a href="https://www.youtube.com/watch?v=Kr4VxMbF3LY" target="_blank">all-the-things</a>
  instead. That lead to frustration and a realization I was just following along
  because. I never really had beef with Prettier in the first place.
  <br /><br />
  When I asked myself what I really wanted, I landed on
  <a href="https://next.biomejs.dev" target="_blank">Biome</a> - a single tool
  to lint _and_ format my code. Now I can go back to building things instead of
  configuring them 😅
</details>

## Usage / Setup

### Installation via your package manager

```
bun add -D @qodestack/biome-config
```

```
npm i -D @qodestack/biome-config
```

### CLI Tool ✨

There is a CLI tool included in this package that automatically sets everything
up for you. You can run it by typing `bunx biomeInit`. This will start a guided
process. Since this config is opinionated, the CLI tool is also. For example,
it assumes VS Code is your IDE (you can disable that with an option). If you
want more control over what the CLI tool outputs, use the optional flags. See
[cli.md](./cli.md) for details.

Using the CLI is completely optional. Below details how you can manually set
things up yourself.

### Create a `biome.jsonc` or `biome.json` file

You will extend from the config provided in this package.

Vanilla JS/TS projects:

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": ["@qodestack/biome-config"]
}
```

React projects:

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": ["@qodestack/biome-config/react"]
}
```

#### Add scripts to `package.json`

> [!NOTE]
> The `check` script lints *and* formats code

`package.json`:

```json
{
  "scripts": {
    "check": "biome check",
    "check:fix": "biome check --write .",

    "lint": "biome lint",
    "lint:fix": "biome lint --write .",

    "format": "biome format",
    "format:fix": "biome format --write ."
  }
}
```

### Recommended VS Code settings

Add the following to `.vscode/settings.json`:

```jsonc
{
  // Avoid any remnants from previously loved tools.
  "prettier.enable": false,
  "eslint.enable": false,

  // import type {thing} from 'pkg' <-- Uses this
  // import {type thing} from 'pkg'
  "typescript.preferences.preferTypeOnlyAutoImports": true,

  // Biome settings.
  "biome.enabled": true,
  "[typescript][typescriptreact][javascript][javascriptreact][json][jsonc]": {
    "editor.defaultFormatter": "biomejs.biome",
  },
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

<hr />

Now go build stuff instead of endlessly configuring things.
