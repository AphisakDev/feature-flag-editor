import { describe, expect, it } from 'vitest'

import {
  createCondition,
  createEditorValues,
  createTargetingRule,
} from '../factories'
import { toGoffConfig } from '../serialize'

describe('toGoffConfig', () => {
  it('produces the expected.json shape for the default flag', () => {
    expect(toGoffConfig(createEditorValues())).toEqual({
      flags: {
        'my-first-flag': {
          variations: { Variation_1: true, Variation_2: false },
          defaultRule: { variation: 'Variation_1' },
        },
      },
    })
  })

  it('serializes targeting rules, rollouts and optional fields', () => {
    const values = createEditorValues()
    const flag = values.flags[0]
    const [on, off] = flag.variations
    on.name = 'on'
    off.name = 'off'
    flag.enabled = false
    flag.trackEvents = false
    flag.version = '1.2'
    flag.description = 'New checkout page'
    flag.metadata.push({ id: 'm1', key: 'owner', value: 'growth-team' })

    const rule = createTargetingRule(flag.variations, 0)
    const condition = createCondition({
      attribute: 'group',
      operator: 'eq',
      value: 'beta',
    })
    rule.query = {
      rootId: 'root',
      nodes: {
        root: {
          id: 'root',
          kind: 'group',
          combinator: 'and',
          negate: false,
          childIds: [condition.id],
        },
        [condition.id]: condition,
      },
    }
    rule.serve.type = 'percentage'
    rule.serve.percentages = { [on.id]: 50, [off.id]: 50 }
    flag.targeting.push(rule)
    flag.defaultRule.variationId = off.id

    expect(toGoffConfig(values).flags['my-first-flag']).toEqual({
      variations: { on: true, off: false },
      targeting: [
        {
          name: 'Rule 1',
          query: 'group eq "beta"',
          percentage: { on: 50, off: 50 },
        },
      ],
      defaultRule: { variation: 'off' },
      disable: true,
      trackEvents: false,
      version: '1.2',
      metadata: { description: 'New checkout page', owner: 'growth-team' },
    })
  })

  it('uses current variation names, so renaming never breaks references', () => {
    const values = createEditorValues()
    values.flags[0].variations[0].name = 'enabled'
    expect(toGoffConfig(values).flags['my-first-flag'].defaultRule).toEqual({
      variation: 'enabled',
    })
  })

  it('converts progressive rollout dates to ISO strings', () => {
    const values = createEditorValues()
    const serve = values.flags[0].defaultRule
    serve.type = 'progressive'
    serve.progressive.initial.date = '2026-11-07T10:00'
    const output = toGoffConfig(values).flags['my-first-flag'].defaultRule
    expect(output).toMatchObject({
      progressiveRollout: {
        initial: {
          variation: 'Variation_2',
          percentage: 0,
          date: new Date('2026-11-07T10:00').toISOString(),
        },
        end: { variation: 'Variation_2', percentage: 100 },
      },
    })
  })

  it('parses variation values according to the flag type', () => {
    const values = createEditorValues()
    const flag = values.flags[0]
    flag.type = 'json'
    flag.variations[0].value = '{"color":"red"}'
    flag.variations[1].value = '[1,2]'
    expect(toGoffConfig(values).flags['my-first-flag'].variations).toEqual({
      Variation_1: { color: 'red' },
      Variation_2: [1, 2],
    })
  })
})
