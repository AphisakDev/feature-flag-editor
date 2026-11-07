/**
 * Static configuration for the Feature Flag editor.
 * Adding a new operator / flag type / serve strategy starts here.
 */

export const FLAG_TYPES = ['boolean', 'string', 'number', 'json'] as const
export type FlagType = (typeof FLAG_TYPES)[number]

export const FLAG_TYPE_LABELS: Record<FlagType, string> = {
  boolean: 'Boolean',
  string: 'String',
  number: 'Number',
  json: 'JSON',
}

/**
 * Operators supported by the GO Feature Flag query language
 * (https://gofeatureflag.org/docs/configure_flag/target-with-flags).
 * `valueKind` drives both the UI (which input to show) and validation.
 */
export const OPERATORS = [
  { value: 'eq', label: 'Equals', valueKind: 'single' },
  { value: 'ne', label: 'Not equals', valueKind: 'single' },
  { value: 'lt', label: 'Less than', valueKind: 'single' },
  { value: 'gt', label: 'Greater than', valueKind: 'single' },
  { value: 'le', label: 'Less than or equal', valueKind: 'single' },
  { value: 'ge', label: 'Greater than or equal', valueKind: 'single' },
  { value: 'co', label: 'Contains', valueKind: 'single' },
  { value: 'sw', label: 'Starts with', valueKind: 'single' },
  { value: 'ew', label: 'Ends with', valueKind: 'single' },
  { value: 'in', label: 'In list', valueKind: 'list' },
  { value: 'pr', label: 'Is present', valueKind: 'none' },
] as const

export type Operator = (typeof OPERATORS)[number]['value']
export type OperatorValueKind = (typeof OPERATORS)[number]['valueKind']

export const OPERATOR_VALUES = OPERATORS.map((o) => o.value) as [
  Operator,
  ...Operator[],
]

export function getOperator(value: Operator) {
  return OPERATORS.find((o) => o.value === value) ?? OPERATORS[0]
}

export const COMBINATORS = ['and', 'or'] as const
export type Combinator = (typeof COMBINATORS)[number]

/** How a rule (or the default rule) decides which variation to serve. */
export const SERVE_TYPES = ['variation', 'percentage', 'progressive'] as const
export type ServeType = (typeof SERVE_TYPES)[number]

export const SERVE_TYPE_LABELS: Record<ServeType, string> = {
  variation: 'A single variation',
  percentage: 'A percentage rollout',
  progressive: 'A progressive rollout',
}

/** Common evaluation-context attributes, offered as autocomplete suggestions. */
export const ATTRIBUTE_SUGGESTIONS = [
  'targetingKey',
  'group',
  'role',
  'email',
  'country',
  'plan',
  'beta',
  'appVersion',
] as const

/**
 * Colour per variation (by position). The emoji mirrors the dot colour so
 * native `<select>` options can show it too, like the GO Feature Flag editor.
 */
export const VARIATION_PALETTE = [
  { dot: 'bg-emerald-500', emoji: '🟢' },
  { dot: 'bg-orange-500', emoji: '🟠' },
  { dot: 'bg-sky-500', emoji: '🔵' },
  { dot: 'bg-violet-500', emoji: '🟣' },
  { dot: 'bg-yellow-400', emoji: '🟡' },
  { dot: 'bg-red-500', emoji: '🔴' },
  { dot: 'bg-amber-800', emoji: '🟤' },
  { dot: 'bg-zinc-500', emoji: '⚫' },
] as const

export function variationColor(index: number) {
  return VARIATION_PALETTE[index % VARIATION_PALETTE.length].dot
}

export function variationEmoji(index: number) {
  return VARIATION_PALETTE[index % VARIATION_PALETTE.length].emoji
}

/** Reserved because the "Description" field is written into `metadata.description`. */
export const RESERVED_METADATA_KEYS = ['description'] as const

/**
 * Audiences managed in the "Roles & Groups" panel. A condition on the
 * matching attribute (`role eq "admin"`, `group in ["beta"]`) must reference
 * one of the defined names.
 */
export const AUDIENCE_KINDS = ['roles', 'groups'] as const
export type AudienceKind = (typeof AUDIENCE_KINDS)[number]

export const AUDIENCE_CONFIG: Record<
  AudienceKind,
  { attribute: string; singular: string; title: string; placeholder: string }
> = {
  roles: {
    attribute: 'role',
    singular: 'role',
    title: 'Roles',
    placeholder: 'admin',
  },
  groups: {
    attribute: 'group',
    singular: 'group',
    title: 'Groups',
    placeholder: 'beta-testers',
  },
}

/** `role` -> `roles`, `group` -> `groups`, anything else -> undefined. */
export function audienceKindOf(attribute: string): AudienceKind | undefined {
  return AUDIENCE_KINDS.find(
    (k) => AUDIENCE_CONFIG[k].attribute === attribute.trim(),
  )
}

/** Operators whose value is compared to a whole role / group name. */
export const AUDIENCE_OPERATORS: ReadonlyArray<Operator> = ['eq', 'ne', 'in']
