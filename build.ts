import type {Configuration, SeverityOrGroupFor_Correctness} from './biomeSchema'

const defaultConfig = JSON.stringify(createConfig({type: 'default'}), null, 2)
const reactConfig = JSON.stringify(createConfig({type: 'react'}), null, 2)

await Bun.write('./dist/biome.json', defaultConfig)
await Bun.write('./dist/biome-react.json', reactConfig)

function createConfig({type}: {type: 'default' | 'react'}): Configuration {
  const correctnessReact: SeverityOrGroupFor_Correctness = {
    useExhaustiveDependencies: {
      level: 'error',
      fix: 'safe',
      options: {
        hooks: [
          // Jotai hooks - because Jotai is an amazing state library.
          {name: 'useAtom', stableResult: [1]},
          {name: 'useSetAtom', stableResult: true},
          {name: 'useStore', stableResult: true},
          {name: 'useResetAtom', stableResult: true},
        ],
        reportMissingDependenciesArray: true,
        reportUnnecessaryDependencies: true,
      },
    },
    useHookAtTopLevel: 'error',
    useJsxKeyInIterable: 'error',
  }

  // https://next.biomejs.dev/reference/configuration/
  return {
    $schema: 'https://biomejs.dev/schemas/2.0.0-beta.1/schema.json',
    assist: {},
    css: {},
    // extends: [],
    files: {
      ignoreUnknown: true,
      includes: [
        // Include all known files in all folders recursively.
        '**',
      ],
      // maxSize: 1048576, // Default value - (1024*1024, 1MB)
    },
    formatter: {
      attributePosition: 'auto',
      bracketSameLine: false,
      bracketSpacing: false,
      enabled: true,
      expand: 'auto',
      formatWithErrors: true,

      // `formatter.includes` is applied AFTER `files.includes`
      // includes: ['**'],
      indentStyle: 'space',
      indentWidth: 2,
      lineEnding: 'lf',
      lineWidth: 80,
      useEditorconfig: true,
    },
    graphql: {},
    grit: {},
    html: {},
    javascript: {
      formatter: {
        /**
         * Properties already defined in the top-level `formatter` section:
         * - attributePosition
         * - bracketSameLine
         * - bracketSpacing
         * - expand
         * - indentStyle
         * - indentWidth
         * - lineEnding
         * - lineWidth
         */

        enabled: true,
        arrowParentheses: 'asNeeded',
        jsxQuoteStyle: 'double',
        quoteProperties: 'asNeeded',
        quoteStyle: 'single',
        semicolons: 'asNeeded',
        trailingCommas: 'es5',
      },
    },
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

        // Rules focused on preventing accessibility problems.
        a11y: {
          noAutofocus: 'off',
        },

        // Rules that focus on inspecting complex code that could be simplified.
        complexity: {
          noUselessStringConcat: 'error',
          noUselessUndefinedInitialization: 'error',
          useSimplifiedLogicExpression: 'error',
        },

        // Rules that detect code that is guaranteed to be incorrect or useless.
        correctness: {
          ...(type === 'react' ? correctnessReact : {}),
          noConstantMathMinMaxClamp: 'warn',
          noUndeclaredDependencies: {
            level: 'error',
            options: {
              // `true` is synonymous with "allow these to be imported".
              devDependencies: true,
              optionalDependencies: true,
              peerDependencies: true,
            },
          },
          noUnusedFunctionParameters: 'error',
          noUnusedImports: 'error',
          noUnusedVariables: 'error',
          useIsNan: 'error',
        },

        /**
         * New rules that are still under development. These will eventually
         * find themselves into other groups.
         */
        nursery: {},

        /**
         * Rules catching ways your code could be written to run faster, or
         * generally be more efficient.
         */
        performance: {},

        // Rules that detect potential security flaws.
        security: {
          noDangerouslySetInnerHtml: 'warn',
        },

        // Rules enforcing a consistent and idiomatic way of writing your code.
        style: {
          noDefaultExport: 'error',
          noInferrableTypes: 'error',
          noNegationElse: 'error',
          noParameterProperties: 'error',
          noShoutyConstants: 'error',
          noUnusedTemplateLiteral: 'error',
          noUselessElse: 'error',
          noYodaExpression: 'error',
          useAsConstAssertion: 'error',
          useCollapsedElseIf: 'error',
          useConsistentArrayType: {
            level: 'error',
            options: {
              syntax: 'shorthand',
            },
          },
          useConsistentBuiltinInstantiation: 'error',
          useConst: 'error',
          useDefaultParameterLast: 'error',
          useDefaultSwitchClause: 'error',
          useExponentiationOperator: 'error',
          useExportType: 'error',
          useForOf: 'error',
          useFragmentSyntax: 'error',
          useImportType: 'error',
          useNamingConvention: {
            level: 'error',
            options: {
              strictCase: false,
            },
          },
          useNodejsImportProtocol: 'error',
          useSelfClosingElements: 'error',
          useShorthandAssign: 'error',
          useSingleVarDeclarator: 'error',
          useTemplate: 'error',
          useThrowNewError: 'error',
        },

        // Rules that detect code that is likely to be incorrect or useless.
        suspicious: {},
      },
    },
    overrides: [],
    plugins: [],
    root: true,
    vcs: {
      clientKind: 'git',
      defaultBranch: 'main',
      enabled: true,
      root: '.',
      useIgnoreFile: true,
    },
  }
}
