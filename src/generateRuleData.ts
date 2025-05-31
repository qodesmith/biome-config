import type {FixKind, RulePlainConfiguration, Rules} from './biomeSchema'

import {$} from 'bun'
import path from 'node:path'

import configurationSchema from '@biomejs/biome/configuration_schema.json'

///////////////////////////////////////////////////////
// Step 1: Aggregate data on all rules               //
// https://next.biomejs.dev/linter/javascript/rules/ //
///////////////////////////////////////////////////////

type RuleGroup = NonNullable<
  {
    [K in keyof Rules]: NonNullable<Rules[K]> extends boolean ? never : K
  }[keyof Rules]
>
type RuleInfo = {
  name: string
  recommended: boolean
  fix: FixKind
  severity: Omit<RulePlainConfiguration, 'off' | 'on'>
  description: string
}
type RuleData = Partial<Record<RuleGroup, RuleInfo[]>>

const promises: Promise<void>[] = []
const ruleGroupDefinitionNames = Object.keys(
  configurationSchema.definitions.Rules.properties
)
  .filter(property => {
    const obj =
      configurationSchema.definitions.Rules.properties[property as keyof Rules]
    return !('type' in obj)
  })
  .sort() as RuleGroup[]
const ruleData: RuleData = {}

for (const ruleGroupName of ruleGroupDefinitionNames) {
  const capitalizedRuleGroupName =
    `${ruleGroupName[0].toUpperCase()}${ruleGroupName.slice(1)}` as Capitalize<RuleGroup>
  const ruleGroup = configurationSchema.definitions[capitalizedRuleGroupName]
  const ruleNames = Object.keys(ruleGroup.properties).filter(name => {
    const obj = ruleGroup.properties[name as keyof typeof ruleGroup.properties]
    return !('type' in obj)
  })
  const rules: RuleInfo[] = []
  ruleData[ruleGroupName] = rules

  for (const ruleName of ruleNames) {
    const ruleProperties =
      ruleGroup.properties[ruleName as keyof typeof ruleGroup.properties]
    const description = ruleProperties.description

    // Skip group properties that aren't an actual rule.
    if ('type' in ruleProperties) {
      continue
    }

    const promise = $`bunx biome explain ${ruleName}`
      .text()
      .then(output => {
        const recommended = output.includes('This rule is recommended')
        const fix: RuleInfo['fix'] = (() => {
          switch (true) {
            case output.includes('No fix available'):
              return 'none'
            case output.includes('Fix: unsafe'):
              return 'unsafe'
            case output.includes('Fix: safe'):
              return 'safe'
            default:
              throw new Error(`Could not parse fix for rule - ${ruleName}`)
          }
        })()
        const severity: RuleInfo['severity'] = (() => {
          switch (true) {
            case output.includes('Default severity: info'):
              return 'info'
            case output.includes('Default severity: warn'):
              return 'warn'
            case output.includes('Default severity: error'):
              return 'error'
            default:
              throw new Error(`Could not parse severity for rule - ${ruleName}`)
          }
        })()

        rules.push({name: ruleName, recommended, fix, severity, description})
      })
      .catch(error => {
        // biome-ignore lint/suspicious/noConsole: it's ok here
        console.error(`Error with rule - ${ruleName}`, error)
      })

    promises.push(promise)
  }
}

await Promise.all(promises)

// Sort each group's entries by name for consistent diffing when changes occur.
for (const arr of Object.values(ruleData)) {
  arr.sort((a, b) => {
    const nameA = a.name
    const nameB = b.name

    return nameA < nameB ? -1 : nameA > nameB ? 1 : 0
  })
}

//////////////////////////////////////
// Step 2: Write the data to a file //
//////////////////////////////////////

await Bun.write(
  path.resolve(import.meta.dirname, './ruleData.json'),
  `${JSON.stringify(ruleData, null, 2)}\n`
)
