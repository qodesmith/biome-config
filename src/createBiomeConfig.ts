/**
 * WAITING ON:
 *
 * - HTML parsing & formatting not available yet
 *   - https://github.com/biomejs/biome/issues/4726
 * - Overriding `fix` levels isn't released yet
 *   - https://github.com/biomejs/biome/issues/5488
 * - `useImportType` options isn't released yet
 *   - https://github.com/biomejs/biome/issues/5749
 */

import type {
  Configuration,
  Hook,
  SeverityOrGroupFor_Correctness,
} from './biomeSchema'

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

  // https://next.biomejs.dev/reference/configuration/
  return {
    $schema: 'https://biomejs.dev/schemas/2.0.0-beta.1/schema.json',
    assist: {
      actions: {
        source: {
          organizeImports: {
            level: 'on',
            options: {
              // https://next.biomejs.dev/assist/actions/organize-imports/#import-and-export-groups
              groups: [
                ':BUN:',
                ':NODE:',
                ':BLANK_LINE:',
                //
                ':ALIAS:',
                ':BLANK_LINE:',
                //
                ':PACKAGE:',
                ':PACKAGE_WITH_PROTOCOL:',
                ':BLANK_LINE:',
                //
                ':PATH:',
                ':BLANK_LINE:',
                //
                ':URL:',
              ],
            },
          },

          // This affects CSS only.
          useSortedProperties: 'on',
        },
      },
    },
    // css: {},
    // extends: [],
    files: {
      ignoreUnknown: true,
      includes: [
        '**', // Include all known files in all folders recursively.
        '!node_modules/**',
        '!dist/**',
        '!*.lock',
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
          noDocumentCookie: 'error',
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
          noTsIgnore: 'error',
          useAdjacentOverloadSignatures: 'warn',
          useAriaPropsSupportedByRole: 'on',
          useAtIndex: 'warn',
          useCollapsedIf: 'warn',
          useComponentExportOnlyModules: 'error',
          useConsistentCurlyBraces: 'warn',
          useParseIntRadix: 'error',
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
          noDefaultExport: 'error',
          noInferrableTypes: 'on',
          noNegationElse: 'warn',
          noParameterProperties: 'error',
          noShoutyConstants: 'error',
          noUnusedTemplateLiteral: {
            level: 'on',
            fix: 'safe',
          },
          noUselessElse: {
            level: 'warn',
            fix: 'safe',
          },
          noYodaExpression: 'error',
          useAsConstAssertion: 'error',
          useCollapsedElseIf: 'error',
          useConsistentArrayType: {
            level: 'error',
            fix: 'safe',
            options: {
              syntax: 'shorthand',
            },
          },
          useConsistentBuiltinInstantiation: {
            level: 'error',
            fix: 'safe',
          },
          useConst: 'error',
          useDefaultParameterLast: {
            level: 'error',
            fix: 'safe',
          },
          useDefaultSwitchClause: 'error',
          useExponentiationOperator: {
            level: 'error',
            fix: 'safe',
          },
          useExportType: 'error',
          useForOf: 'error',
          useFragmentSyntax: {
            level: 'error',
            fix: 'safe',
          },

          /**
           * https://next.biomejs.dev/linter/rules/use-import-type/#description
           * This rule should be able to take options according to the docs.
           * I have filed an issue in the Biome repo:
           * https://github.com/biomejs/biome/issues/5749
           */
          useImportType: 'error',
          // useImportType: {
          //   level: 'error',
          //   options: {
          //     style: 'separatedType'
          //   }
          // },

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
          useSelfClosingElements: 'error',
          useShorthandAssign: {
            level: 'error',
            fix: 'safe',
          },
          useSingleVarDeclarator: {
            level: 'error',
            fix: 'safe',
          },
          useTemplate: {
            level: 'error',
            fix: 'safe',
          },
          useThrowNewError: {
            level: 'error',
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
            level: 'error',
            fix: 'safe',
          },
          noSkippedTests: 'warn',
          noUnsafeNegation: {
            level: 'on',
            fix: 'safe',
          },
          noVar: 'error',
          useErrorMessage: 'error',
          useIsArray: {
            level: 'on',
            fix: 'safe',
          },
          useNumberToFixedDigitsArgument: {
            level: 'error',
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
