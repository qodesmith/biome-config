/**
 * WAITING ON:
 *
 * - HTML parsing & formatting not available yet
 *   - https://github.com/biomejs/biome/issues/4726
 */

import type {
  Configuration,
  ImportMatcher,
  NegatablePredefinedSourceMatcher,
  SeverityOrGroupFor_Correctness,
  SeverityOrGroupFor_Nursery,
} from './biomeSchema'

import pkgJson from '../package.json'
import {files} from './commonBiomeSettings.mjs'

// Allow arbitrary strings but keep autocompletion.
type PredefinedImportGroup = NegatablePredefinedSourceMatcher | (string & {})

export function createBiomeConfig({
  type,
}: {
  type: 'default' | 'react'
}): Configuration {
  const correctnessReact: SeverityOrGroupFor_Correctness = {
    useExhaustiveDependencies: {
      level: 'on',
      fix: 'safe',
      options: {
        reportMissingDependenciesArray: true,
        reportUnnecessaryDependencies: true,
      },
    },
    useHookAtTopLevel: 'on',
    useJsxKeyInIterable: 'on',
  }

  const nurseryReact: SeverityOrGroupFor_Nursery = {
    useReactFunctionComponents: 'error',
  }

  const biomeVersion = pkgJson.dependencies['@biomejs/biome'].replace('^', '')

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
    $schema: `https://biomejs.dev/schemas/${biomeVersion}/schema.json`,
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
    html: {
      formatter: {
        enabled: true,
      },
    },
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
          noStaticElementInteractions: 'warn',
          useAriaPropsSupportedByRole: 'on',
          useValidAutocomplete: 'warn',
        },

        // Rules that focus on inspecting complex code that could be simplified.
        complexity: {
          noExtraBooleanCast: {
            level: 'on',
            fix: 'safe',
            options: {},
          },
          noUselessFragments: {
            level: 'on',
            fix: 'safe',
            options: {},
          },
          noUselessStringConcat: {
            level: 'on',
            fix: 'safe',
            options: {},
          },
          noUselessSwitchCase: {
            level: 'on',
            fix: 'safe',
            options: {},
          },
          noUselessUndefinedInitialization: 'on',
          useLiteralKeys: {
            level: 'on',
            fix: 'safe',
            options: {},
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
            options: {},
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
          noUnusedImports: {
            level: 'warn',
            fix: 'none',
            options: {},
          },
          noUnusedVariables: {
            level: 'warn',
            fix: 'none',
            options: {
              ignoreRestSiblings: false,
            },
          },
          useIsNan: {
            level: 'on',
            fix: 'safe',
            options: {},
          },
          useValidTypeof: {
            level: 'on',
            fix: 'safe',
            options: {},
          },
        },

        /**
         * New rules that are still under development. These will eventually
         * find themselves into other groups.
         */
        nursery: {
          ...(type === 'react' ? nurseryReact : {}),
          noBitwiseOperators: 'warn',
          noConstantBinaryExpression: 'warn',
          noFloatingPromises: 'warn',
          noGlobalDirnameFilename: 'error',
          noImportCycles: 'on',
          noNoninteractiveElementInteractions: 'warn',
          noProcessGlobal: 'warn',
          noTsIgnore: 'on',
          useExhaustiveSwitchCases: 'warn',
          useParseIntRadix: 'warn',
          useNumericSeparators: 'on',
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
        },

        /**
         * Rules catching ways your code could be written to run faster, or
         * generally be more efficient.
         */
        performance: {
          noBarrelFile: 'error',
          noDynamicNamespaceImportAccess: 'on',
          noReExportAll: 'error',
        },

        // Rules that detect potential security flaws.
        security: {
          noDangerouslySetInnerHtml: 'warn',
        },

        // Rules enforcing a consistent and idiomatic way of writing your code.
        style: {
          noCommonJs: 'error',
          noDefaultExport: 'warn',
          noEnum: 'error',
          noExportedImports: 'warn',
          noInferrableTypes: 'on',
          noNegationElse: 'warn',
          noParameterProperties: 'error',
          noShoutyConstants: 'warn',
          noUnusedTemplateLiteral: {
            level: 'on',
            fix: 'safe',
            options: {},
          },
          noUselessElse: {
            level: 'warn',
            fix: 'safe',
            options: {},
          },
          noYodaExpression: 'warn',
          useAsConstAssertion: 'warn',
          useAtIndex: 'warn',
          useCollapsedElseIf: 'warn',
          useComponentExportOnlyModules: 'on',
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
            options: {},
          },
          useCollapsedIf: 'warn',
          useConsistentCurlyBraces: 'warn',
          useConst: 'warn',
          useDefaultParameterLast: {
            level: 'warn',
            fix: 'safe',
            options: {},
          },
          useDefaultSwitchClause: 'warn',
          useExponentiationOperator: {
            level: 'on',
            fix: 'safe',
            options: {},
          },
          useExportType: 'error',
          useForOf: 'warn',
          useFragmentSyntax: {
            level: 'warn',
            fix: 'safe',
            options: {},
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
            options: {},
          },
          useSelfClosingElements: 'warn',
          useShorthandAssign: {
            level: 'warn',
            fix: 'safe',
            options: {},
          },
          useSingleVarDeclarator: {
            level: 'warn',
            fix: 'safe',
            options: {},
          },
          useTemplate: {
            level: 'warn',
            fix: 'safe',
            options: {},
          },
          useThrowNewError: {
            level: 'warn',
            fix: 'safe',
            options: {},
          },
        },

        // Rules that detect code that is likely to be incorrect or useless.
        suspicious: {
          noArrayIndexKey: 'warn',
          noConsole: 'warn',
          noDocumentCookie: 'on',
          noDuplicateElseIf: 'on',
          noDuplicateTestHooks: 'error',
          noFocusedTests: 'warn',
          noGlobalIsFinite: {
            level: 'on',
            fix: 'safe',
            options: {},
          },
          noGlobalIsNan: {
            level: 'on',
            fix: 'safe',
            options: {},
          },
          noIrregularWhitespace: 'error',
          noTemplateCurlyInString: 'on',
          noSkippedTests: 'warn',
          noUnsafeNegation: {
            level: 'on',
            fix: 'safe',
            options: {},
          },
          noVar: 'on',
          useAdjacentOverloadSignatures: 'on',
          useErrorMessage: 'warn',
          useIsArray: {
            level: 'on',
            fix: 'safe',
            options: {},
          },
          useNumberToFixedDigitsArgument: {
            level: 'warn',
            fix: 'safe',
            options: {},
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
