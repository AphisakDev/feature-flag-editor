import type { FlagType } from './constants'
import { defaultVariationValue } from './variation-value'
import type {
  AudienceEntry,
  ConditionNode,
  FlagEditorValues,
  FlagValues,
  GroupNode,
  MetadataEntry,
  QueryTree,
  Serve,
  TargetingRule,
  Variation,
} from './schema'

/** Stable client-side id used for React keys, drag & drop and cross references. */
export function createId(): string {
  return crypto.randomUUID()
}

export function createVariation(type: FlagType, index: number): Variation {
  return {
    id: createId(),
    name: `Variation_${index + 1}`,
    value: defaultVariationValue(type, index),
  }
}

export function createCondition(
  overrides: Partial<Omit<ConditionNode, 'id' | 'kind'>> = {},
): ConditionNode {
  return {
    id: createId(),
    kind: 'condition',
    attribute: '',
    operator: 'eq',
    value: '',
    ...overrides,
  }
}

export function createGroup(childIds: Array<string> = []): GroupNode {
  return {
    id: createId(),
    kind: 'group',
    combinator: 'and',
    negate: false,
    childIds,
  }
}

/** A new query starts as a root AND-group holding one empty condition. */
export function createQueryTree(): QueryTree {
  const condition = createCondition()
  const root = createGroup([condition.id])
  return {
    rootId: root.id,
    nodes: { [root.id]: root, [condition.id]: condition },
  }
}

/** `<input type="datetime-local">` value, e.g. `2026-11-07T09:30`. */
export function toDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const DAY_MS = 24 * 60 * 60 * 1000

export function createServe(
  variations: Array<Variation>,
  now = new Date(),
): Serve {
  const first = variations.at(0)?.id ?? ''
  const last = variations.at(-1)?.id ?? first
  return {
    type: 'variation',
    variationId: first,
    percentages: Object.fromEntries(variations.map((v) => [v.id, 0])),
    progressive: {
      initial: { variationId: last, percentage: 0, date: toDateTimeLocal(now) },
      end: {
        variationId: last,
        percentage: 100,
        date: toDateTimeLocal(new Date(now.getTime() + 10 * DAY_MS)),
      },
    },
  }
}

export function createTargetingRule(
  variations: Array<Variation>,
  index: number,
): TargetingRule {
  return {
    id: createId(),
    name: `Rule ${index + 1}`,
    disabled: false,
    query: createQueryTree(),
    serve: createServe(variations),
  }
}

export function createMetadataEntry(): MetadataEntry {
  return { id: createId(), key: '', value: '' }
}

export function createFlag(index = 0): FlagValues {
  const type: FlagType = 'boolean'
  const variations = [createVariation(type, 0), createVariation(type, 1)]
  return {
    id: createId(),
    key: index === 0 ? 'my-first-flag' : `my-flag-${index + 1}`,
    description: '',
    enabled: true,
    trackEvents: true,
    version: '',
    type,
    variations,
    targeting: [],
    defaultRule: createServe(variations),
    metadata: [],
  }
}

export function createAudienceEntry(
  name = '',
  description = '',
): AudienceEntry {
  return { id: createId(), name, description }
}

export function createEditorValues(): FlagEditorValues {
  return {
    // A few common audiences to start from; fully editable in the UI.
    roles: [
      createAudienceEntry('admin', 'Full access'),
      createAudienceEntry('editor', 'Can edit content'),
      createAudienceEntry('viewer', 'Read-only'),
    ],
    groups: [
      createAudienceEntry('beta-testers', 'Opted in to early features'),
      createAudienceEntry('internal', 'Company employees'),
    ],
    flags: [createFlag(0)],
  }
}
