# @qodestack/biome-config

I was on a quest to use ESLint (flat configs) and Prettier - great tools. Then
I bit the [Antfu](https://antfu.me/posts/why-not-prettier) bug about not using
Prettier and having ESLint do
[all-the-things](https://www.youtube.com/watch?v=Kr4VxMbF3LY) instead. That lead
to frustration and a realization I was just following along _because_. I never
really had beef with Prettier in the first place.

When I asked myself what I really wanted, I landed on
[Biome](https://next.biomejs.dev/) - a single tool to lint _and_ format my code.
Now I can go back to building things instead of configuring them 😅

## Usage

### Install this package with your package manager

```
bun add -d @qodestack/biome-config
```

```
npm i -D @qodestack/biome-config
```

This package depends on version `2.0.0-beta.1`, which will be installed when
installing this config.

### Create a `biome.jsonc` or `biome.json` file

You will extend from the config provided in this package.

> [!NOTE]
> The `$schema` property can be one of two values:
>
> Local file:
>
> `./node_modules/@biomejs/biome/configuration_schema.json`
>
> Published file:
>
> `https://biomejs.dev/schemas/2.0.0-beta.1/schema.json`

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": ["@qodestack/biome-config"]
}
```

### Add scripts to `package.json`

> [!NOTE]
> The `check` script lints _and_ formats code

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

<hr />

Now go build stuff instead of endlessly configuring things.
