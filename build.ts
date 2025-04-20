import type {
  Configuration,
  SeverityOrGroupFor_Correctness,
} from "./biomeSchema";

const defaultConfig = JSON.stringify(createConfig({type: "default"}), null, 2);
const reactConfig = JSON.stringify(createConfig({type: "react"}), null, 2);

await Bun.write("./dist/biome.json", defaultConfig);
await Bun.write("./dist/biome-react.json", reactConfig);

function createConfig({type}: {type: "default" | "react"}): Configuration {
  const correctnessReact: SeverityOrGroupFor_Correctness = {
    useExhaustiveDependencies: {
      level: "error",
      fix: "safe",
      options: {
        hooks: [
          // Jotai hooks - because Jotai is an amazing state library.
          {name: "useAtom", stableResult: [1]},
          {name: "useSetAtom", stableResult: true},
          {name: "useStore", stableResult: true},
          {name: "useResetAtom", stableResult: true},
        ],
        reportMissingDependenciesArray: true,
        reportUnnecessaryDependencies: true,
      },
    },
    useHookAtTopLevel: "error",
    useJsxKeyInIterable: "error",
  };

  // https://next.biomejs.dev/reference/configuration/
  return {
    $schema: "https://biomejs.dev/schemas/2.0.0-beta.1/schema.json",
    assist: {},
    css: {},
    // extends: [],
    files: {
      ignoreUnknown: true,
      includes: [
        // Include all known files in all folders recursively.
        "**",
      ],
      // maxSize: 1048576, // Default value - (1024*1024, 1MB)
    },
    formatter: {
      attributePosition: "auto",
      bracketSameLine: false,
      bracketSpacing: false,
      enabled: true,
      expand: "auto",
      formatWithErrors: true,

      // `formatter.includes` is applied AFTER `files.includes`
      // includes: ['**'],
      indentStyle: "space",
      indentWidth: 2,
      lineEnding: "lf",
      lineWidth: 80,
      useEditorconfig: true,
    },
    graphql: {},
    grit: {},
    html: {},
    javascript: {},
    json: {},
    linter: {
      /**
       * Domains are a convenient way to group rules together by technology
       * (i.e. React, Solid, etc.). Rules found in domains are NOT exclusive to
       * domains so we will address them in the `rules` section instead of here.
       */
      domains: {},
      enabled: true,
      rules: {
        /**
         * This turns on recommended rules for ALL groups. We can then turn off
         * or update individual rules as need be.
         */
        recommended: true,
        correctness: {
          ...(type === "react" ? correctnessReact : {}),
          noConstantMathMinMaxClamp: "warn",
          noUndeclaredDependencies: {
            level: "error",
            options: {
              // `true` is synonymous with "allow these to be imported".
              devDependencies: true,
              optionalDependencies: true,
              peerDependencies: true,
            },
          },
          noUnusedFunctionParameters: "error",
          noUnusedImports: "error",
          noUnusedVariables: "error",
          useIsNan: "error",
        },
      },
    },
    overrides: [],
    plugins: [],
    root: true,
    vcs: {
      clientKind: "git",
      defaultBranch: "main",
      enabled: true,
      root: ".",
      useIgnoreFile: true,
    },
  };
}
