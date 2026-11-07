import { toQueryString } from './query-tree'
import type {
  FlagEditorValues,
  FlagValues,
  RolloutStep,
  Serve,
  Variation,
} from './schema'
import { parseVariationValue } from './variation-value'

/**
 * Output types — the GO Feature Flag configuration format
 * (https://gofeatureflag.org/docs/configure_flag/flag_format), wrapped in a
 * top-level `flags` object as shown in the challenge's `expected.json`.
 */

type GoffRolloutStep = { variation: string; percentage: number; date: string }

export type GoffServe =
  | { variation: string }
  | { percentage: Record<string, number> }
  | { progressiveRollout: { initial: GoffRolloutStep; end: GoffRolloutStep } }

export type GoffRule = GoffServe & {
  name?: string
  query: string
  disable?: boolean
}

export type GoffFlag = {
  variations: Record<string, unknown>
  targeting?: Array<GoffRule>
  defaultRule: GoffServe
  disable?: boolean
  trackEvents?: boolean
  version?: string
  metadata?: Record<string, string>
}

export type GoffConfig = { flags: Record<string, GoffFlag> }

/** Converts the form state into the JSON shown in the preview / exported. */
export function toGoffConfig(values: FlagEditorValues): GoffConfig {
  const flags: Record<string, GoffFlag> = {}
  values.flags.forEach((flag, index) => {
    const key = flag.key.trim() || `untitled-flag-${index + 1}`
    flags[key] = toGoffFlag(flag)
  })
  return { flags }
}

export function toGoffFlag(flag: FlagValues): GoffFlag {
  const nameOf = createVariationLookup(flag.variations)

  const targeting = flag.targeting.map(
    (rule): GoffRule => ({
      ...(rule.name.trim() ? { name: rule.name.trim() } : {}),
      query: toQueryString(rule.query),
      ...toGoffServe(rule.serve, flag.variations, nameOf),
      ...(rule.disabled ? { disable: true } : {}),
    }),
  )

  // Key order mirrors the GO Feature Flag docs: variations, targeting, defaultRule.
  const output: GoffFlag = {
    variations: Object.fromEntries(
      flag.variations.map((v) => [
        v.name.trim(),
        parseVariationValue(flag.type, v.value),
      ]),
    ),
    ...(targeting.length > 0 ? { targeting } : {}),
    defaultRule: toGoffServe(flag.defaultRule, flag.variations, nameOf),
  }

  // Only write optional fields when they differ from GO Feature Flag's defaults.
  if (!flag.enabled) output.disable = true
  if (!flag.trackEvents) output.trackEvents = false
  if (flag.version.trim()) output.version = flag.version.trim()

  const metadata: Record<string, string> = {}
  if (flag.description.trim()) metadata.description = flag.description.trim()
  for (const entry of flag.metadata) {
    if (entry.key.trim()) metadata[entry.key.trim()] = entry.value
  }
  if (Object.keys(metadata).length > 0) output.metadata = metadata

  return output
}

/** Rules reference variations by id; the output uses their (editable) names. */
function createVariationLookup(variations: Array<Variation>) {
  const byId = new Map(variations.map((v) => [v.id, v.name.trim()]))
  return (id: string) => byId.get(id) ?? ''
}

function toGoffServe(
  serve: Serve,
  variations: Array<Variation>,
  nameOf: (id: string) => string,
): GoffServe {
  switch (serve.type) {
    case 'variation':
      return { variation: nameOf(serve.variationId) }
    case 'percentage':
      return {
        percentage: Object.fromEntries(
          variations.map((v) => [v.name.trim(), serve.percentages[v.id] ?? 0]),
        ),
      }
    case 'progressive': {
      const step = (s: RolloutStep): GoffRolloutStep => ({
        variation: nameOf(s.variationId),
        percentage: s.percentage,
        date: toIsoDate(s.date),
      })
      return {
        progressiveRollout: {
          initial: step(serve.progressive.initial),
          end: step(serve.progressive.end),
        },
      }
    }
  }
}

function toIsoDate(local: string): string {
  const time = Date.parse(local)
  return Number.isNaN(time) ? local : new Date(time).toISOString()
}
