# CLI - set up Biome with a single command

TL;DR

```bash
bunx biomeInit
```

Running the command with no arguments will:

- Create a `biome.json` file for a React project.
- Create (or update) a `.vscode/settings.json` file.
- Add scripts to `package.json`.

## Options

| Option        | Description                                          |
|---------------|------------------------------------------------------|
| `--no-vscode` | Prevent creating `.vscode/settings.json`             |
| `--vanilla`   | Prevent including React settings in the Biome config |
| `--jsonc`     | Create a `biome.jsonc` file instead of `biome.json`  |
