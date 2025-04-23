# CLI - set up Biome with a single command

TL;DR

```bash
bunx biomeInit
```

By itself, this command will:

- Create a `biome.json` file for a React project.
- Create (or update) a `.vscode/settings.json` file.
- Add a few 3rd party hooks to a list, preventing them from being flagged as unstable values in the `useCallback` dependency array.

## Options

| Option          | Description                                          |
|-----------------|------------------------------------------------------|
| --no-vscode     | Prevent creating `.vscode/settings.json`             |
| --vanilla       | Prevent including React settings in the Biome config |
| --no-extraHooks | Prevent listing the 3rd party hooks                  |
