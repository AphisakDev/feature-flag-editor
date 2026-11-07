import { describe, expect, it } from 'vitest'

import {
  createEditorValues,
  createFlag,
  createTargetingRule,
} from '../factories'
import { validateEditor } from '../issues'
import { addGroup } from '../query-tree'
import type { ConditionNode, FlagEditorValues } from '../schema'

function issuesFor(values: FlagEditorValues) {
  return validateEditor(values).map((i) => `${i.fieldName}: ${i.message}`)
}

function conditionIds(values: FlagEditorValues, ruleIndex = 0) {
  const nodes = values.flags[0].targeting[ruleIndex].query.nodes
  return Object.values(nodes)
    .filter((n): n is ConditionNode => n.kind === 'condition')
    .map((n) => n.id)
}

describe('flagEditorSchema', () => {
  it('accepts the default editor values', () => {
    expect(validateEditor(createEditorValues())).toEqual([])
  })

  it('requires a flag name and reports it once, on the right field', () => {
    const values = createEditorValues()
    values.flags[0].key = '   '
    expect(issuesFor(values)).toEqual(['flags[0].key: Flag name is required'])
    values.flags[0].key = 'has space'
    expect(issuesFor(values)).toEqual([
      'flags[0].key: Use only letters, numbers, "_", "-" or "."',
    ])
  })

  it('still runs cross-field checks when a simple field is invalid', () => {
    const values = createEditorValues()
    values.flags[0].key = ''
    values.flags[0].variations[1].value = 'maybe'
    const issues = issuesFor(values)
    expect(issues).toContain('flags[0].key: Flag name is required')
    expect(issues).toContain(
      'flags[0].variations[1].value: Must be true or false',
    )
  })

  it('validates variation values against the flag type', () => {
    const values = createEditorValues()
    values.flags[0].type = 'number'
    values.flags[0].variations[0].value = 'abc'
    values.flags[0].variations[1].value = '12.5'
    expect(issuesFor(values)).toEqual([
      'flags[0].variations[0].value: Must be a number (e.g. 42 or 0.5)',
    ])
  })

  it('rejects duplicate variation names and duplicate flag names', () => {
    const values = createEditorValues()
    values.flags[0].variations[1].name = values.flags[0].variations[0].name
    values.flags.push({ ...createFlag(1), key: values.flags[0].key })
    const issues = issuesFor(values)
    expect(issues).toContain(
      'flags[0].variations[1].name: Variation names must be unique',
    )
    expect(issues).toContain('flags[1].key: Flag names must be unique')
  })

  it('validates nested conditions down to the leaf field', () => {
    const values = createEditorValues()
    const flag = values.flags[0]
    const rule = createTargetingRule(flag.variations, 0)
    rule.query = addGroup(rule.query, rule.query.rootId)
    flag.targeting.push(rule)

    // Both the root condition and the nested group's condition are empty.
    const issues = issuesFor(values)
    for (const id of conditionIds(values)) {
      expect(issues).toContain(
        `flags[0].targeting[0].query.nodes.${id}.attribute: Attribute is required`,
      )
    }
  })

  it('requires a value unless the operator is "is present"', () => {
    const values = createEditorValues()
    const flag = values.flags[0]
    flag.targeting.push(createTargetingRule(flag.variations, 0))
    const [id] = conditionIds(values)
    const condition = flag.targeting[0].query.nodes[id] as ConditionNode
    condition.attribute = 'beta'

    expect(issuesFor(values)).toContain(
      `flags[0].targeting[0].query.nodes.${id}.value: A value is required for "Equals"`,
    )
    condition.operator = 'pr'
    expect(issuesFor(values)).toEqual([])
  })

  it('requires percentage rollouts to add up to 100', () => {
    const values = createEditorValues()
    const serve = values.flags[0].defaultRule
    const [a, b] = values.flags[0].variations
    serve.type = 'percentage'
    serve.percentages = { [a.id]: 30, [b.id]: 50 }
    expect(issuesFor(values)).toEqual([
      'flags[0].defaultRule.percentages: Percentages must add up to 100% (currently 80%)',
    ])
    serve.percentages[b.id] = 70
    expect(issuesFor(values)).toEqual([])
  })

  it('flags a serve that points to a deleted variation', () => {
    const values = createEditorValues()
    const flag = values.flags[0]
    flag.defaultRule.variationId = flag.variations[1].id
    flag.variations.splice(1, 1)
    expect(issuesFor(values)).toEqual([
      'flags[0].defaultRule.variationId: Select a variation to serve',
    ])
  })

  it('requires the progressive rollout to end after it starts', () => {
    const values = createEditorValues()
    const serve = values.flags[0].defaultRule
    serve.type = 'progressive'
    serve.progressive.end.date = serve.progressive.initial.date
    expect(issuesFor(values)).toEqual([
      'flags[0].defaultRule.progressive.end.date: End date must be after the start date',
    ])
  })
})
