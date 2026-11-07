import { z } from 'zod'

import {
  AUDIENCE_CONFIG,
  AUDIENCE_KINDS,
  AUDIENCE_OPERATORS,
  COMBINATORS,
  audienceKindOf,
  FLAG_TYPES,
  OPERATOR_VALUES,
  RESERVED_METADATA_KEYS,
  SERVE_TYPES,
  getOperator,
} from './constants'
import { validateVariationValue } from './variation-value'

/**
 * Single source of truth for the editor's data shape.
 * - TypeScript types are inferred from these schemas (see bottom of file).
 * - The same schema is passed to TanStack Form as the form-level validator,
 *   so every issue's `path` lands on the matching field (e.g.
 *   `flags[0].targeting[1].query.nodes.<id>.value`).
 *
 * Structural rules live on each schema; rules that need to look at sibling
 * data (variation references, duplicate names, percentages that must add up
 * to 100) live in `superRefine` on the closest common parent.
 */

const ID = z.string().min(1)
// Patterns accept "" so an empty field only gets the "is required" message.
const SLUG = /^[\w.-]*$/
const SLUG_MESSAGE = 'Use only letters, numbers, "_", "-" or "."'
const ATTRIBUTE = /^([A-Za-z_][\w.-]*)?$/

const requiredSlug = (label: string) =>
  z.string().trim().min(1, `${label} is required`).regex(SLUG, SLUG_MESSAGE)

const percentSchema = z
  .number({ error: 'Enter a percentage' })
  .min(0, 'Must be at least 0%')
  .max(100, 'Must be at most 100%')

/* -------------------------------------------------------------------------- */
/*                                Query builder                               */
/* -------------------------------------------------------------------------- */

export const conditionNodeSchema = z
  .object({
    id: ID,
    kind: z.literal('condition'),
    attribute: z
      .string()
      .trim()
      .min(1, 'Attribute is required')
      .regex(
        ATTRIBUTE,
        'Start with a letter; use letters, numbers, "_", "-", "."',
      ),
    operator: z.enum(OPERATOR_VALUES),
    value: z.string(),
  })
  .superRefine((condition, ctx) => {
    const { valueKind, label } = getOperator(condition.operator)
    if (valueKind === 'none') return

    const items =
      valueKind === 'list'
        ? splitListValue(condition.value)
        : [condition.value.trim()].filter(Boolean)

    if (items.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message:
          valueKind === 'list'
            ? 'Add at least one value (comma separated)'
            : `A value is required for "${label}"`,
      })
    }
  })

export const groupNodeSchema = z.object({
  id: ID,
  kind: z.literal('group'),
  combinator: z.enum(COMBINATORS),
  /** Wraps the whole group in `not (...)`. */
  negate: z.boolean(),
  /** Ordered ids of child nodes (conditions or nested groups). */
  childIds: z.array(ID),
})

export const queryNodeSchema = z.discriminatedUnion('kind', [
  conditionNodeSchema,
  groupNodeSchema,
])

/**
 * The (recursive) condition tree is stored *normalized*: a flat map of nodes
 * where groups reference children by id. See NOTES.md for why.
 */
export const queryTreeSchema = z
  .object({
    rootId: ID,
    nodes: z.record(z.string(), queryNodeSchema),
  })
  .superRefine((tree, ctx) => {
    const root = tree.nodes[tree.rootId] as QueryNode | undefined
    if (!root || root.kind !== 'group') {
      ctx.addIssue({
        code: 'custom',
        path: ['rootId'],
        message: 'Missing root group',
      })
      return
    }
    for (const node of Object.values(tree.nodes)) {
      if (node.kind !== 'group') continue
      if (node.childIds.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['nodes', node.id, 'childIds'],
          message: 'A group needs at least one condition',
        })
      }
      node.childIds.forEach((childId, index) => {
        if (!(childId in tree.nodes)) {
          ctx.addIssue({
            code: 'custom',
            path: ['nodes', node.id, 'childIds', index],
            message: `Unknown child "${childId}"`,
          })
        }
      })
    }
  })

/* -------------------------------------------------------------------------- */
/*                                Serve / rules                               */
/* -------------------------------------------------------------------------- */

const rolloutStepSchema = z.object({
  variationId: z.string(),
  percentage: percentSchema,
  /** Value of an `<input type="datetime-local">` (local time, no zone). */
  date: z.string(),
})

/**
 * Shape of "what to serve". Which branch is relevant depends on `type`;
 * the branch-specific checks run in `validateServe` because they need the
 * flag's variations.
 */
export const serveSchema = z.object({
  type: z.enum(SERVE_TYPES),
  variationId: z.string(),
  /** variationId -> percentage. Keyed by id so renaming a variation is safe. */
  percentages: z.record(z.string(), percentSchema),
  progressive: z.object({
    initial: rolloutStepSchema,
    end: rolloutStepSchema,
  }),
})

export const targetingRuleSchema = z.object({
  id: ID,
  name: z.string().trim().max(100, 'Keep the rule name under 100 characters'),
  disabled: z.boolean(),
  query: queryTreeSchema,
  serve: serveSchema,
})

export const variationSchema = z.object({
  id: ID,
  name: requiredSlug('Variation name'),
  value: z.string(),
})

export const metadataEntrySchema = z.object({
  id: ID,
  key: requiredSlug('Key'),
  value: z.string(),
})

/* -------------------------------------------------------------------------- */
/*                                    Flag                                    */
/* -------------------------------------------------------------------------- */

export const flagSchema = z
  .object({
    id: ID,
    key: requiredSlug('Flag name').max(
      100,
      'Keep the flag name under 100 characters',
    ),
    description: z
      .string()
      .max(500, 'Keep the description under 500 characters'),
    enabled: z.boolean(),
    trackEvents: z.boolean(),
    version: z
      .string()
      .trim()
      .regex(/^$|^\d+(\.\d+){0,2}$/, 'Use a version like 1, 1.2 or 1.2.3'),
    type: z.enum(FLAG_TYPES),
    variations: z.array(variationSchema).min(1, 'Add at least one variation'),
    targeting: z.array(targetingRuleSchema),
    defaultRule: serveSchema,
    metadata: z.array(metadataEntrySchema),
  })
  .superRefine((flag, ctx) => {
    // Variation values must match the flag type.
    flag.variations.forEach((variation, index) => {
      const error = validateVariationValue(flag.type, variation.value)
      if (error) {
        ctx.addIssue({
          code: 'custom',
          path: ['variations', index, 'value'],
          message: error,
        })
      }
    })

    reportDuplicates(
      flag.variations.map((v) => v.name.trim()),
      (index) => ['variations', index, 'name'],
      'Variation names must be unique',
      ctx,
    )
    reportDuplicates(
      flag.metadata.map((m) => m.key.trim()),
      (index) => ['metadata', index, 'key'],
      'Metadata keys must be unique',
      ctx,
    )
    flag.metadata.forEach((entry, index) => {
      if (
        (RESERVED_METADATA_KEYS as ReadonlyArray<string>).includes(
          entry.key.trim(),
        )
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['metadata', index, 'key'],
          message: `"${entry.key.trim()}" is reserved — use the Description field instead`,
        })
      }
    })

    const variationIds = flag.variations.map((v) => v.id)
    validateServe(flag.defaultRule, variationIds, ['defaultRule'], ctx)
    flag.targeting.forEach((rule, index) => {
      validateServe(
        rule.serve,
        variationIds,
        ['targeting', index, 'serve'],
        ctx,
      )
    })
  })

/* -------------------------------------------------------------------------- */
/*                               Roles & Groups                               */
/* -------------------------------------------------------------------------- */

export const audienceEntrySchema = z.object({
  id: ID,
  name: requiredSlug('Name'),
  description: z.string().max(200, 'Keep the description under 200 characters'),
})

/* -------------------------------------------------------------------------- */
/*                                   Editor                                   */
/* -------------------------------------------------------------------------- */

export const flagEditorSchema = z
  .object({
    /** Shared by every flag; used by conditions on `role` / `group`. */
    roles: z.array(audienceEntrySchema),
    groups: z.array(audienceEntrySchema),
    flags: z.array(flagSchema).min(1, 'Add at least one flag'),
  })
  .superRefine((editor, ctx) => {
    reportDuplicates(
      editor.flags.map((f) => f.key.trim()),
      (index) => ['flags', index, 'key'],
      'Flag names must be unique',
      ctx,
    )
    for (const kind of AUDIENCE_KINDS) {
      reportDuplicates(
        editor[kind].map((entry) => entry.name.trim()),
        (index) => [kind, index, 'name'],
        `${AUDIENCE_CONFIG[kind].title} must be unique`,
        ctx,
      )
    }
    validateAudienceReferences(editor, ctx)
  })

/**
 * `role eq "x"` / `group in [...]` must use names defined in Roles & Groups,
 * so a typo in a role can't silently target nobody.
 */
function validateAudienceReferences(
  editor: FlagEditorValues,
  ctx: z.RefinementCtx,
) {
  const known = Object.fromEntries(
    AUDIENCE_KINDS.map((kind) => [
      kind,
      new Set(editor[kind].map((entry) => entry.name.trim())),
    ]),
  ) as Record<(typeof AUDIENCE_KINDS)[number], Set<string>>

  editor.flags.forEach((flag, flagIndex) => {
    flag.targeting.forEach((rule, ruleIndex) => {
      for (const node of Object.values(rule.query.nodes)) {
        if (node.kind !== 'condition') continue
        const kind = audienceKindOf(node.attribute)
        if (!kind || !AUDIENCE_OPERATORS.includes(node.operator)) continue

        const values =
          node.operator === 'in'
            ? splitListValue(node.value)
            : [node.value.trim()].filter(Boolean)
        const unknown = values
          .map((value) => value.replace(/^"(.*)"$/, '$1'))
          .filter((value) => !known[kind].has(value))

        if (unknown.length > 0) {
          const { singular } = AUDIENCE_CONFIG[kind]
          ctx.addIssue({
            code: 'custom',
            path: [
              'flags',
              flagIndex,
              'targeting',
              ruleIndex,
              'query',
              'nodes',
              node.id,
              'value',
            ],
            message: `Unknown ${singular}${unknown.length > 1 ? 's' : ''} ${unknown
              .map((v) => `"${v}"`)
              .join(
                ', ',
              )} — define ${unknown.length > 1 ? 'them' : 'it'} in Roles & Groups`,
          })
        }
      }
    })
  })
}

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

type Path = Array<string | number>

/** Splits the value of an `in` condition: `admin, editor` -> ['admin', 'editor']. */
export function splitListValue(value: string): Array<string> {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

/** Adds `item` to a comma separated list, or removes it if already there. */
export function toggleListItem(value: string, item: string): string {
  const items = splitListValue(value)
  return (
    items.includes(item)
      ? items.filter((existing) => existing !== item)
      : [...items, item]
  ).join(', ')
}

function reportDuplicates(
  values: Array<string>,
  pathOf: (index: number) => Path,
  message: string,
  ctx: z.RefinementCtx,
) {
  const seen = new Set<string>()
  values.forEach((value, index) => {
    if (!value) return
    if (seen.has(value)) {
      ctx.addIssue({ code: 'custom', path: pathOf(index), message })
    }
    seen.add(value)
  })
}

function validateServe(
  serve: Serve,
  variationIds: Array<string>,
  basePath: Path,
  ctx: z.RefinementCtx,
) {
  const isKnown = (id: string) => variationIds.includes(id)

  switch (serve.type) {
    case 'variation':
      if (!isKnown(serve.variationId)) {
        ctx.addIssue({
          code: 'custom',
          path: [...basePath, 'variationId'],
          message: 'Select a variation to serve',
        })
      }
      return

    case 'percentage': {
      const total = variationIds.reduce(
        (sum, id) => sum + (serve.percentages[id] ?? 0),
        0,
      )
      // Round to avoid floating point noise like 99.99999999.
      if (Math.round(total * 1000) / 1000 !== 100) {
        ctx.addIssue({
          code: 'custom',
          path: [...basePath, 'percentages'],
          message: `Percentages must add up to 100% (currently ${formatPercent(total)}%)`,
        })
      }
      return
    }

    case 'progressive': {
      const { initial, end } = serve.progressive
      for (const [step, key] of [
        [initial, 'initial'],
        [end, 'end'],
      ] as const) {
        const stepPath = [...basePath, 'progressive', key]
        if (!isKnown(step.variationId)) {
          ctx.addIssue({
            code: 'custom',
            path: [...stepPath, 'variationId'],
            message: 'Select a variation',
          })
        }
        if (Number.isNaN(Date.parse(step.date))) {
          ctx.addIssue({
            code: 'custom',
            path: [...stepPath, 'date'],
            message: 'Pick a valid date',
          })
        }
      }
      if (Date.parse(end.date) <= Date.parse(initial.date)) {
        ctx.addIssue({
          code: 'custom',
          path: [...basePath, 'progressive', 'end', 'date'],
          message: 'End date must be after the start date',
        })
      }
    }
  }
}

function formatPercent(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export type ConditionNode = z.input<typeof conditionNodeSchema>
export type GroupNode = z.input<typeof groupNodeSchema>
export type QueryNode = z.input<typeof queryNodeSchema>
export type QueryTree = z.input<typeof queryTreeSchema>
export type Serve = z.input<typeof serveSchema>
export type RolloutStep = z.input<typeof rolloutStepSchema>
export type TargetingRule = z.input<typeof targetingRuleSchema>
export type Variation = z.input<typeof variationSchema>
export type MetadataEntry = z.input<typeof metadataEntrySchema>
export type AudienceEntry = z.input<typeof audienceEntrySchema>
export type FlagValues = z.input<typeof flagSchema>
export type FlagEditorValues = z.input<typeof flagEditorSchema>
