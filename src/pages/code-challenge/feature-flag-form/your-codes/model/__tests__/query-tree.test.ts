import { describe, expect, it } from 'vitest'

import { createCondition, createGroup } from '../factories'
import {
  addCondition,
  addGroup,
  formatLiteral,
  getDepth,
  moveChild,
  removeNode,
  toQueryString,
} from '../query-tree'
import type { ConditionNode, QueryNode, QueryTree } from '../schema'

/** Small builder so tests read like the query they produce. */
function tree(
  root: { combinator?: 'and' | 'or'; negate?: boolean },
  children: Array<QueryNode>,
  extra: Array<QueryNode> = [],
): QueryTree {
  const group = { ...createGroup(children.map((c) => c.id)), ...root }
  return {
    rootId: group.id,
    nodes: Object.fromEntries(
      [group, ...children, ...extra].map((n) => [n.id, n]),
    ),
  }
}

const cond = (
  attribute: string,
  operator: ConditionNode['operator'],
  value = '',
) => createCondition({ attribute, operator, value })

describe('toQueryString', () => {
  it('joins root conditions with the combinator', () => {
    const query = tree({ combinator: 'or' }, [
      cond('role', 'eq', 'admin'),
      cond('age', 'gt', '18'),
    ])
    expect(toQueryString(query)).toBe('role eq "admin" or age gt 18')
  })

  it('wraps nested groups in parentheses and supports NOT', () => {
    const a = cond('country', 'eq', 'TH')
    const b = cond('beta', 'eq', 'true')
    const nested = {
      ...createGroup([a.id, b.id]),
      combinator: 'or' as const,
      negate: true,
    }
    const query = tree({}, [cond('role', 'eq', 'admin'), nested], [a, b])
    expect(toQueryString(query)).toBe(
      'role eq "admin" and not (country eq "TH" or beta eq true)',
    )
  })

  it('formats list and presence operators', () => {
    const query = tree({}, [
      cond('group', 'in', 'beta, internal'),
      cond('email', 'pr'),
    ])
    expect(toQueryString(query)).toBe(
      'group in ["beta", "internal"] and email pr',
    )
  })

  it('skips incomplete conditions so the preview stays valid while typing', () => {
    const query = tree({}, [
      cond('', 'eq', 'x'),
      cond('plan', 'eq', ''),
      cond('plan', 'eq', 'pro'),
    ])
    expect(toQueryString(query)).toBe('plan eq "pro"')
  })
})

describe('formatLiteral', () => {
  it.each([
    ['42', '42'],
    ['-1.5', '-1.5'],
    ['true', 'true'],
    ['admin', '"admin"'],
    ['"123"', '"123"'],
    ['say "hi"', '"say \\"hi\\""'],
  ])('%s -> %s', (input, expected) => {
    expect(formatLiteral(input)).toBe(expected)
  })
})

describe('tree operations', () => {
  it('adds conditions and nested groups without mutating the input', () => {
    const start = tree({}, [cond('a', 'pr')])
    const withGroup = addGroup(start, start.rootId)
    const withCondition = addCondition(withGroup, start.rootId)

    expect(start.nodes[start.rootId]).toMatchObject({
      childIds: [expect.any(String)],
    })
    const root = withCondition.nodes[start.rootId]
    expect(root.kind === 'group' && root.childIds).toHaveLength(3)
    expect(Object.keys(withCondition.nodes)).toHaveLength(5) // root, a, group, its condition, new condition
  })

  it('removes a group together with its whole subtree', () => {
    const start = tree({}, [cond('a', 'pr')])
    const withGroup = addGroup(start, start.rootId)
    const root = withGroup.nodes[withGroup.rootId]
    const groupId = root.kind === 'group' ? root.childIds[1] : ''

    const removed = removeNode(withGroup, groupId)
    expect(Object.keys(removed.nodes)).toHaveLength(2)
    expect(removeNode(removed, removed.rootId)).toBe(removed) // root is protected
  })

  it('reorders children and reports depth', () => {
    const a = cond('a', 'pr')
    const b = cond('b', 'pr')
    const start = tree({}, [a, b])
    const moved = moveChild(start, start.rootId, 0, 1)
    expect(toQueryString(moved)).toBe('b pr and a pr')

    const nested = addGroup(start, start.rootId)
    const root = nested.nodes[nested.rootId]
    const groupId = root.kind === 'group' ? root.childIds[2] : ''
    expect(getDepth(nested, nested.rootId)).toBe(0)
    expect(getDepth(nested, groupId)).toBe(1)
  })
})
