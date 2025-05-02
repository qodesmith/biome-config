/**
 * WAITING ON:
 *
 * - HTML parsing & formatting not available yet
 *   - https://github.com/biomejs/biome/issues/4726
 */

import type {
  Configuration,
  Hook,
  ImportMatcher,
  SeverityOrGroupFor_Correctness,
} from './biomeSchema'

import pkgJson from '../package.json'
import {files} from './commonBiomeSettings.mjs'

/**
 * This type is no longer included in the JSON schema for 2.0.0-beta.2:
 * https://next.biomejs.dev/schemas/2.0.0-beta.2/schema.json
 *
 * Docs for these values can be found at:
 * https://next.biomejs.dev/assist/actions/organize-imports/#import-and-export-groups
 *
 * The original schema values with this type can be found at:
 * https://next.biomejs.dev/schemas/2.0.0-beta.1/schema.json
 * Search for `PredefinedImportGroup`
 */
type PredefinedImportGroup =
  | ':BLANK_LINE:'
  | ':ALIAS:'
  | ':BUN:'
  | ':NODE:'
  | ':PACKAGE:'
  | ':PACKAGE_WITH_PROTOCOL:'
  | ':PATH:'
  | ':URL:'
  | (string & {}) // Allow arbitrary strings but keep autocompletion.

export function createBiomeConfig({
  type,
  includeJotaiHooks,
}: {
  type: 'default' | 'react'
  includeJotaiHooks?: boolean
}): Configuration {
  // Jotai hooks - because Jotai is an amazing state library.
  const jotaiHooks: Hook[] = [
    {name: 'useAtom', stableResult: [1]},
    {name: 'useSetAtom', stableResult: true},
    {name: 'useStore', stableResult: true},
    {name: 'useResetAtom', stableResult: true},
  ]

  const hooks: Hook[] = []

  if (type === 'react' && includeJotaiHooks) {
    hooks.push(...jotaiHooks)
  }

  const correctnessReact: SeverityOrGroupFor_Correctness = {
    useExhaustiveDependencies: {
      level: 'on',
      fix: 'safe',
      options: {
        hooks: hooks.length > 0 ? hooks : undefined,
        reportMissingDependenciesArray: true,
        reportUnnecessaryDependencies: true,
      },
    },
    useHookAtTopLevel: 'on',
    useJsxKeyInIterable: 'on',
  }

  const biomeVersion = pkgJson.dependencies['@biomejs/biome']

  const organizeImportsGroups = [
    /**
     * GROUP 1 - runtime and protocol
     * - 'bun' takes precedence because Bun rules
     */
    'bun',
    ':BUN:',
    ':NODE:',
    ':PACKAGE_WITH_PROTOCOL:',
    ':BLANK_LINE:',

    /**
     * GROUP 2 - aliased
     * - @/aliased-pkg
     * - #aliased-pkg
     * - ~aliased-pkg
     * - %aliased-pkg
     */
    ':ALIAS:',
    ':BLANK_LINE:',

    /**
     * GROUP 3 - 3rd party (i.e. node_modules)
     * - @scoped-pkg/thing
     * - regular-pkg
     */
    ':PACKAGE:',
    ':BLANK_LINE:',

    /**
     * GROUP 4 - local
     * - ./mod1
     * - ../../mod2
     */
    ':PATH:',
    ':BLANK_LINE:',

    /**
     * GROUP 5 - everything else
     */
    '**',
  ] satisfies PredefinedImportGroup[]

  // https://next.biomejs.dev/reference/configuration/
  return {
    $schema: `https://next.biomejs.dev/schemas/${biomeVersion}/schema.json`,
    assist: {
      actions: {
        source: {
          organizeImports: {
            level: 'on',
            options: {
              // https://next.biomejs.dev/assist/actions/organize-imports/#import-and-export-groups
              groups: [
                {
                  type: true,
                  /**
                   * Types are in a single group (no blank lines), sorted the
                   * same as non-type imports.
                   */
                  source: organizeImportsGroups.filter(
                    matcher => matcher !== ':BLANK_LINE:'
                  ),
                },
                ':BLANK_LINE:',
                ...organizeImportsGroups,
              ] satisfies (
                | PredefinedImportGroup
                | PredefinedImportGroup[]
                | ImportMatcher
              )[],
            },
          },

          // This affects CSS only.
          useSortedProperties: 'on',
        },
      },
    },
    // css: {},
    // extends: [],
    files,
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
    // graphql: {},
    // grit: {},

    /**
     * https://github.com/biomejs/biome/issues/4726
     * HTML parsing and formatting not available yet.
     */
    // html: {},
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
    // json: {},
    linter: {
      /**
       * Domains are a convenient way to group rules together by technology
       * (i.e. React, Solid, etc.). Rules found in domains are NOT exclusive to
       * domains so we will address them in the `rules` section instead of here.
       */
      // domains: {},
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
          noExtraBooleanCast: {
            level: 'on',
            fix: 'safe',
          },
          noUselessFragments: {
            level: 'on',
            fix: 'safe',
          },
          noUselessStringConcat: {
            level: 'on',
            fix: 'safe',
          },
          noUselessSwitchCase: {
            level: 'on',
            fix: 'safe',
          },
          noUselessUndefinedInitialization: 'on',
          useLiteralKeys: {
            level: 'on',
            fix: 'safe',
          },
          useSimplifiedLogicExpression: 'warn',
        },

        // Rules that detect code that is guaranteed to be incorrect or useless.
        correctness: {
          ...(type === 'react' ? correctnessReact : {}),
          noConstantMathMinMaxClamp: 'warn',
          noInvalidBuiltinInstantiation: {
            level: 'on',
            fix: 'safe',
          },
          noInvalidNewBuiltin: {
            level: 'on',
            fix: 'safe',
          },
          noUndeclaredDependencies: {
            level: 'error',
            options: {
              // `true` is synonymous with "allow these to be imported".
              devDependencies: true,
              optionalDependencies: true,
              peerDependencies: true,
            },
          },
          noUnusedFunctionParameters: {
            level: 'warn',
            fix: 'safe',
          },
          noUnusedImports: {
            level: 'warn',
            fix: 'none',
          },
          noUnusedVariables: {
            level: 'warn',
            fix: 'safe',
            options: {
              ignoreRestSiblings: false,
            },
          },
          useIsNan: {
            level: 'on',
            fix: 'safe',
          },
        },

        /**
         * New rules that are still under development. These will eventually
         * find themselves into other groups.
         */
        nursery: {
          noBitwiseOperators: 'warn',
          noCommonJs: 'error',
          noConstantBinaryExpression: 'warn',
          noDocumentCookie: 'warn',
          noDuplicateElseIf: 'on',
          noDynamicNamespaceImportAccess: 'warn',
          noEnum: 'error',
          noExportedImports: 'warn',
          noFloatingPromises: 'warn',
          noGlobalDirnameFilename: 'error',
          noImportCycles: 'on',
          noIrregularWhitespace: 'error',
          noNoninteractiveElementInteractions: 'warn',
          noProcessGlobal: 'warn',
          noStaticElementInteractions: 'warn',
          noTemplateCurlyInString: 'warn',
          noTsIgnore: 'on',
          useAdjacentOverloadSignatures: 'warn',
          useAriaPropsSupportedByRole: 'on',
          useAtIndex: 'warn',
          useCollapsedIf: 'warn',
          useComponentExportOnlyModules: 'warn',
          useConsistentCurlyBraces: 'warn',
          /**
           * This rule currently reports errors on single-digit numbers. It will
           * be enabled when that is fixed.
           *
           * Playground - https://bit.ly/3YjGbI3
           * Issue - https://github.com/biomejs/biome/issues/5826
           */
          // useNumericSeparators: 'on',
          useParseIntRadix: 'warn',
          useSortedClasses: {
            level: 'info',
            fix: 'safe',
            options: {
              // 'class' and 'className' are default.
              // attributes: [],
              functions: ['clsx'],
            },
          },
          useSymbolDescription: 'on',
          useValidAutocomplete: 'warn',
        },

        /**
         * Rules catching ways your code could be written to run faster, or
         * generally be more efficient.
         */
        performance: {
          noBarrelFile: 'error',
          noReExportAll: 'error',
        },

        // Rules that detect potential security flaws.
        security: {
          noDangerouslySetInnerHtml: 'warn',
        },

        // Rules enforcing a consistent and idiomatic way of writing your code.
        style: {
          noDefaultExport: 'warn',
          noInferrableTypes: 'on',
          noNegationElse: 'warn',
          noParameterProperties: 'error',
          noShoutyConstants: 'warn',
          noUnusedTemplateLiteral: {
            level: 'on',
            fix: 'safe',
          },
          noUselessElse: {
            level: 'warn',
            fix: 'safe',
          },
          noYodaExpression: 'warn',
          useAsConstAssertion: 'warn',
          useCollapsedElseIf: 'warn',
          useConsistentArrayType: {
            level: 'warn',
            fix: 'safe',
            options: {
              syntax: 'shorthand',
            },
          },
          useConsistentBuiltinInstantiation: {
            level: 'warn',
            fix: 'safe',
          },
          useConst: 'warn',
          useDefaultParameterLast: {
            level: 'warn',
            fix: 'safe',
          },
          useDefaultSwitchClause: 'warn',
          useExponentiationOperator: {
            level: 'on',
            fix: 'safe',
          },
          useExportType: 'error',
          useForOf: 'warn',
          useFragmentSyntax: {
            level: 'warn',
            fix: 'safe',
          },
          useImportType: {
            level: 'error',
            options: {
              style: 'separatedType',
            },
          },

          useNamingConvention: {
            level: 'warn',
            options: {
              strictCase: false,
              conventions: [
                /**
                 * Allows object methods like:
                 * {
                 *   GET: () => {...},
                 *   POST: () => {...},
                 * }
                 */
                {
                  selector: {
                    kind: 'objectLiteralMethod',
                    scope: 'any',
                  },
                  formats: ['CONSTANT_CASE', 'camelCase'],
                },
              ],
            },
          },
          useNodejsImportProtocol: {
            level: 'warn',
            fix: 'safe',
          },
          useSelfClosingElements: 'warn',
          useShorthandAssign: {
            level: 'warn',
            fix: 'safe',
          },
          useSingleVarDeclarator: {
            level: 'warn',
            fix: 'safe',
          },
          useTemplate: {
            level: 'warn',
            fix: 'safe',
          },
          useThrowNewError: {
            level: 'warn',
            fix: 'safe',
          },
        },

        // Rules that detect code that is likely to be incorrect or useless.
        suspicious: {
          noArrayIndexKey: 'warn',
          noConsole: 'warn',
          noDuplicateTestHooks: 'error',
          noFocusedTests: 'warn',
          noGlobalIsFinite: {
            level: 'on',
            fix: 'safe',
          },
          noGlobalIsNan: {
            level: 'on',
            fix: 'safe',
          },
          noSkippedTests: 'warn',
          noUnsafeNegation: {
            level: 'on',
            fix: 'safe',
          },
          noVar: 'on',
          useErrorMessage: 'warn',
          useIsArray: {
            level: 'on',
            fix: 'safe',
          },
          useNumberToFixedDigitsArgument: {
            level: 'warn',
            fix: 'safe',
          },
          useValidTypeof: {
            level: 'on',
            fix: 'safe',
          },
        },
      },
    },
    // overrides: [],
    // plugins: [],
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
