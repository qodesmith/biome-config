/**
 * NOTE:
 * Run this file AFTER upgrading the Biome version.
 */

import type {FixKind, RulePlainConfiguration, Rules} from './biomeSchema'

import {$} from 'bun'
import path from 'node:path'

import configurationSchema from '@biomejs/biome/configuration_schema.json'

function camelCaseToHyphens(str: string): string {
  return str
    .split('')
    .map(char => {
      return char === char.toUpperCase() ? `-${char.toLowerCase()}` : char
    })
    .join('')
}

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
  url: string
}
type RuleData = Partial<Record<RuleGroup, RuleInfo[]>>

const promises: Promise<void>[] = []
const ruleGroupDefinitionNames = Object.keys(
  configurationSchema.definitions.Rules.properties
)
  .filter(property => {
    const obj =
      configurationSchema.definitions.Rules.properties[property as keyof Rules]

    // Ensure the object is a rule-group definition.
    return !('type' in obj)
  })
  .sort() as RuleGroup[]
const ruleData: RuleData = {}
const ruleBaseUrl = 'https://biomejs.dev/linter/rules'

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
    const url = `${ruleBaseUrl}/${camelCaseToHyphens(ruleName)}/`

    // Skip group properties that aren't an actual rule.
    if ('type' in ruleProperties) {
      continue
    }

    const promise = $`bunx biome explain ${ruleName}`
      .text()
      .then(output => {
        if (output.includes('Unrecognized option')) {
          // biome-ignore lint/suspicious/noConsole: it's ok here
          console.error('Rule not recognized:', ruleName)
          return
        }

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

        rules.push({
          name: ruleName,
          recommended,
          fix,
          severity,
          description,
          url,
        })
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

/////////////////////////////////////////////
// Step 2: Determine new and removed rules //
/////////////////////////////////////////////

const ruleToGroup = Object.entries(ruleData).reduce<Record<string, RuleGroup>>(
  (acc, [groupName, rules]) => {
    rules.forEach(rule => {
      acc[rule.name] = groupName as RuleGroup
    })

    return acc
  },
  {}
)

const ruleDataOnDisk = (await Bun.file(
  path.resolve(import.meta.dirname, './ruleData.json')
)
  .json()

  // In case the file doesn't exist on disk (1st time running this script).
  .catch(() => ({}))) as RuleData
const isFirstRun = Object.keys(ruleDataOnDisk).length === 0
const ruleToGroupOnDisk = Object.entries(ruleDataOnDisk).reduce<Record<string, RuleGroup>>(
  (acc, [groupName, rules]) => {
    rules.forEach(rule => {
      acc[rule.name] = groupName as RuleGroup
    })

    return acc
  }, {}
)

const rulesOnDisk = new Set(
  isFirstRun
    ? []
    : Object.values(ruleDataOnDisk).reduce((acc, groupRules) => {
        groupRules.forEach(rule => acc.push(rule.name))
        return acc
      }, [] as string[])
)

const currentRules = new Set(
  isFirstRun
    ? []
    : Object.values(ruleData).reduce((acc, groupRules) => {
        groupRules.forEach(rule => acc.push(rule.name))
        return acc
      }, [] as string[])
)

type RuleChange = {name: string; url: string; group: RuleGroup}
type PromotedRule = {name: string; url: string; oldGroup: RuleGroup; newGroup: RuleGroup}

const newRules: RuleChange[] = []
currentRules.forEach(name => {
  if (!rulesOnDisk.has(name)) {
    newRules.push({
      name,
      url: `${ruleBaseUrl}/${camelCaseToHyphens(name)}/`,
      group: ruleToGroup[name],
    })
  }
})

const deletedRules: RuleChange[] = []
rulesOnDisk.forEach(name => {
  if (!currentRules.has(name)) {
    deletedRules.push({
      name,
      url: `${ruleBaseUrl}/${camelCaseToHyphens(name)}/`,
      group: ruleToGroupOnDisk[name],
    })
  }
})

const promotedRules: PromotedRule[] = []
rulesOnDisk.forEach(name => {
  const isDeletedRule = !currentRules.has(name)
  const groupOnDisk = ruleToGroupOnDisk[name]
  const currentGroup = ruleToGroup[name]

  if (!isDeletedRule && groupOnDisk !== currentGroup) {
    promotedRules.push({
      name,
      url: `${ruleBaseUrl}/${camelCaseToHyphens(name)}/`,
      oldGroup: groupOnDisk,
      newGroup: currentGroup
    })
  }
})

/////////////////////////////////////
// Step 3: Write the data to files //
/////////////////////////////////////

await Bun.write(
  path.resolve(import.meta.dirname, './ruleData.json'),
  `${JSON.stringify(ruleData, null, 2)}\n`
)

await Bun.write(
  path.resolve(import.meta.dirname, './ruleChanges.json'),
  `${JSON.stringify({newRules, deletedRules, promotedRules}, null, 2)}\n`
)

console.log('Rule generation complete!')
