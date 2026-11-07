import { getOperator } from './constants'
import { createCondition, createGroup } from './factories'
import { splitListValue } from './schema'
import type { ConditionNode, GroupNode, QueryNode, QueryTree } from './schema'

/**
 * Pure, immutable operations on the normalized query tree.
 * Components call these through `form.setFieldValue(path, updater)`,
 * which keeps the tree logic testable without React.
 */

function getGroup(tree: QueryTree, groupId: string): GroupNode {
  const node = tree.nodes[groupId] as QueryNode | undefined
  if (node?.kind !== 'group')
    throw new Error(`Node "${groupId}" is not a group`)
  return node
}

function withNodes(
  tree: QueryTree,
  nodes: Record<string, QueryNode>,
): QueryTree {
  return { ...tree, nodes: { ...tree.nodes, ...nodes } }
}

/** Appends a new empty condition to a group. */
export function addCondition(tree: QueryTree, groupId: string): QueryTree {
  const group = getGroup(tree, groupId)
  const condition = createCondition()
  return withNodes(tree, {
    [condition.id]: condition,
    [group.id]: { ...group, childIds: [...group.childIds, condition.id] },
  })
}

/** Appends a nested group (pre-filled with one empty condition) to a group. */
export function addGroup(tree: QueryTree, groupId: string): QueryTree {
  const parent = getGroup(tree, groupId)
  const condition = createCondition()
  const group = createGroup([condition.id])
  return withNodes(tree, {
    [condition.id]: condition,
    [group.id]: group,
    [parent.id]: { ...parent, childIds: [...parent.childIds, group.id] },
  })
}

/** Updates a group's own settings (AND/OR, NOT). */
export function updateGroup(
  tree: QueryTree,
  groupId: string,
  patch: Partial<Pick<GroupNode, 'combinator' | 'negate'>>,
): QueryTree {
  const group = getGroup(tree, groupId)
  return withNodes(tree, { [group.id]: { ...group, ...patch } })
}

/** Updates fields of a condition (used by the role / group picker). */
export function updateCondition(
  tree: QueryTree,
  conditionId: string,
  patch: Partial<Pick<ConditionNode, 'attribute' | 'operator' | 'value'>>,
): QueryTree {
  const node = tree.nodes[conditionId] as QueryNode | undefined
  if (node?.kind !== 'condition') return tree
  return withNodes(tree, { [conditionId]: { ...node, ...patch } })
}

/** Removes a node and its whole subtree. The root group cannot be removed. */
export function removeNode(tree: QueryTree, nodeId: string): QueryTree {
  if (nodeId === tree.rootId) return tree

  const toDelete = new Set(collectSubtreeIds(tree, nodeId))
  const nodes: Record<string, QueryNode> = {}
  for (const [id, node] of Object.entries(tree.nodes)) {
    if (toDelete.has(id)) continue
    nodes[id] =
      node.kind === 'group' && node.childIds.includes(nodeId)
        ? { ...node, childIds: node.childIds.filter((c) => c !== nodeId) }
        : node
  }
  return { ...tree, nodes }
}

/** Reorders a child inside its group (used by drag & drop). */
export function moveChild(
  tree: QueryTree,
  groupId: string,
  fromIndex: number,
  toIndex: number,
): QueryTree {
  const group = getGroup(tree, groupId)
  if (fromIndex === toIndex) return tree
  const childIds = [...group.childIds]
  const [moved] = childIds.splice(fromIndex, 1)
  childIds.splice(toIndex, 0, moved)
  return withNodes(tree, { [group.id]: { ...group, childIds } })
}

export function collectSubtreeIds(
  tree: QueryTree,
  nodeId: string,
): Array<string> {
  const node = tree.nodes[nodeId] as QueryNode | undefined
  if (!node) return []
  if (node.kind === 'condition') return [nodeId]
  return [nodeId, ...node.childIds.flatMap((id) => collectSubtreeIds(tree, id))]
}

/** How deep a node is (root = 0). Used to cap nesting in the UI. */
export function getDepth(tree: QueryTree, nodeId: string): number {
  let depth = 0
  let current = nodeId
  for (;;) {
    const parent = Object.values(tree.nodes).find(
      (n) => n.kind === 'group' && n.childIds.includes(current),
    )
    if (!parent) return depth
    depth += 1
    current = parent.id
  }
}

/* -------------------------------------------------------------------------- */
/*                         Tree -> GO Feature Flag query                       */
/* -------------------------------------------------------------------------- */

/**
 * Serializes the tree into the GO Feature Flag rule syntax, e.g.
 * `role eq "admin" and (country in ["TH", "SG"] or beta eq true)`.
 * Incomplete conditions are skipped so the live preview stays readable
 * while the user is typing (validation reports them separately).
 */
export function toQueryString(tree: QueryTree): string {
  return serializeNode(tree, tree.rootId, true)
}

function serializeNode(
  tree: QueryTree,
  nodeId: string,
  isRoot: boolean,
): string {
  const node = tree.nodes[nodeId] as QueryNode | undefined
  if (!node) return ''
  if (node.kind === 'condition') return serializeCondition(node)

  const parts = node.childIds
    .map((id) => serializeNode(tree, id, false))
    .filter(Boolean)
  if (parts.length === 0) return ''

  const joined = parts.join(` ${node.combinator} `)
  if (node.negate) return `not (${joined})`
  return isRoot ? joined : `(${joined})`
}

function serializeCondition(condition: ConditionNode): string {
  const attribute = condition.attribute.trim()
  if (!attribute) return ''

  const { valueKind } = getOperator(condition.operator)
  switch (valueKind) {
    case 'none':
      return `${attribute} ${condition.operator}`
    case 'list': {
      const items = splitListValue(condition.value)
      if (items.length === 0) return ''
      return `${attribute} in [${items.map(formatLiteral).join(', ')}]`
    }
    case 'single': {
      const value = condition.value.trim()
      if (!value) return ''
      return `${attribute} ${condition.operator} ${formatLiteral(value)}`
    }
  }
}

/**
 * Numbers and booleans are written as-is, everything else becomes a quoted
 * string. Already-quoted input (`"123"`) is kept, so users can force a string.
 */
export function formatLiteral(raw: string): string {
  const value = raw.trim()
  if (/^-?\d+(\.\d+)?$/.test(value)) return value
  if (value === 'true' || value === 'false') return value
  if (/^".*"$/.test(value)) return value
  return JSON.stringify(value)
}
