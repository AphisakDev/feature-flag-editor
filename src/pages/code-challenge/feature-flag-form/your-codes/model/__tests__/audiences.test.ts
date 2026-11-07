import { describe, expect, it } from 'vitest'

import {
  createAudienceEntry,
  createCondition,
  createEditorValues,
  createTargetingRule,
} from '../factories'
import { validateEditor } from '../issues'
import type { ConditionNode, FlagEditorValues } from '../schema'
import { toGoffConfig } from '../serialize'

/** Editor values with one rule whose single condition is `condition`. */
function withCondition(condition: Partial<ConditionNode>) {
  const values = createEditorValues()
  const flag = values.flags[0]
  const rule = createTargetingRule(flag.variations, 0)
  const node = createCondition(condition)
  rule.query = {
    rootId: 'root',
    nodes: {
      root: {
        id: 'root',
        kind: 'group',
        combinator: 'and',
        negate: false,
        childIds: [node.id],
      },
      [node.id]: node,
    },
  }
  flag.targeting.push(rule)
  return { values, nodeId: node.id }
}

const issuesFor = (values: FlagEditorValues) =>
  validateEditor(values).map((i) => `${i.location} | ${i.message}`)

describe('roles & groups', () => {
  it('accepts conditions that use defined roles and groups', () => {
    expect(
      validateEditor(
        withCondition({ attribute: 'role', operator: 'eq', value: 'admin' })
          .values,
      ),
    ).toEqual([])
    expect(
      validateEditor(
        withCondition({
          attribute: 'group',
          operator: 'in',
          value: 'beta-testers, "internal"',
        }).values,
      ),
    ).toEqual([])
  })

  it('reports unknown names on the condition value', () => {
    const { values, nodeId } = withCondition({
      attribute: 'group',
      operator: 'in',
      value: 'beta-testers, vip, staff',
    })
    const [issue] = validateEditor(values)
    expect(issue.fieldName).toBe(
      `flags[0].targeting[0].query.nodes.${nodeId}.value`,
    )
    expect(issue.message).toBe(
      'Unknown groups "vip", "staff" — define them in Roles & Groups',
    )
  })

  it('only checks whole-name operators on role / group attributes', () => {
    // "contains" matches partial values, so it is not checked.
    expect(
      validateEditor(
        withCondition({ attribute: 'role', operator: 'co', value: 'adm' })
          .values,
      ),
    ).toEqual([])
    // Other attributes are free-form.
    expect(
      validateEditor(
        withCondition({ attribute: 'country', operator: 'eq', value: 'TH' })
          .values,
      ),
    ).toEqual([])
  })

  it('validates the catalog itself', () => {
    const values = createEditorValues()
    values.roles.push(createAudienceEntry('admin'))
    values.groups.push(createAudienceEntry(''))
    expect(issuesFor(values)).toEqual([
      'Roles & Groups › Groups #3 | Name is required',
      'Roles & Groups › Roles #4 | Roles must be unique',
    ])
  })

  it('is editor-only data and does not change the GO Feature Flag output', () => {
    const values = createEditorValues()
    expect(Object.keys(toGoffConfig(values))).toEqual(['flags'])
  })
})
