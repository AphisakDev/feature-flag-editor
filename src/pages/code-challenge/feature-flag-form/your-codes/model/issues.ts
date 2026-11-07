import { flagEditorSchema } from './schema'
import type { FlagEditorValues, QueryNode } from './schema'

export type ValidationIssue = {
  /** TanStack Form field name, e.g. `flags[0].variations[1].name`. */
  fieldName: string
  /** Human readable location, e.g. `my-flag › Rule 1 › Condition 2`. */
  location: string
  message: string
}

/** `['flags', 0, 'key']` -> `flags[0].key` (the field-name format TanStack Form uses). */
export function toFieldName(path: ReadonlyArray<PropertyKey>): string {
  return path.reduce<string>((name, segment) => {
    if (typeof segment === 'number') return `${name}[${segment}]`
    const key = String(segment)
    return name ? `${name}.${key}` : key
  }, '')
}

export function validateEditor(
  values: FlagEditorValues,
): Array<ValidationIssue> {
  const result = flagEditorSchema.safeParse(values)
  if (result.success) return []
  return result.error.issues.map((issue) => ({
    fieldName: toFieldName(issue.path),
    location: describeLocation(values, issue.path),
    message: issue.message,
  }))
}

const SECTION_LABELS: Record<string, string> = {
  key: 'Flag name',
  description: 'Description',
  version: 'Version',
  variations: 'Variations',
  defaultRule: 'Default rule',
  metadata: 'Metadata',
}

/** Builds a breadcrumb so users know *where* an error is, not just what it is. */
export function describeLocation(
  values: FlagEditorValues,
  path: ReadonlyArray<PropertyKey>,
): string {
  const [, flagIndex, section, itemIndex, ...rest] = path
  if (typeof flagIndex !== 'number') return 'Editor'

  const flag = values.flags.at(flagIndex)
  const parts = [flag?.key.trim() || `Flag ${flagIndex + 1}`]
  if (typeof section !== 'string') return parts[0]

  if (section === 'targeting' && typeof itemIndex === 'number') {
    const rule = flag?.targeting.at(itemIndex)
    parts.push(rule?.name.trim() || `Rule ${itemIndex + 1}`)
    if (rule && rest[0] === 'query' && rest[1] === 'nodes') {
      const node = rule.query.nodes[String(rest[2])] as QueryNode | undefined
      if (node) parts.push(node.kind === 'group' ? 'Group' : 'Condition')
    } else if (rest[0] === 'serve') {
      parts.push('Serve')
    }
  } else {
    parts.push(SECTION_LABELS[section] ?? section)
    if (typeof itemIndex === 'number') parts.push(`#${itemIndex + 1}`)
  }
  return parts.join(' › ')
}
