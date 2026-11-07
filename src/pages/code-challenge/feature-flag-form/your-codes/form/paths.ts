/**
 * Typed builders for TanStack Form field names. Template literal types keep
 * them compatible with `DeepKeys<FlagEditorValues>`, so a typo in a path is
 * a compile error rather than a silently broken field.
 */

export const flagPath = (flagIndex: number) => `flags[${flagIndex}]` as const

export const rulePath = (flagIndex: number, ruleIndex: number) =>
  `flags[${flagIndex}].targeting[${ruleIndex}]` as const

export const queryPath = (flagIndex: number, ruleIndex: number) =>
  `${rulePath(flagIndex, ruleIndex)}.query` as const

export const nodePath = (
  flagIndex: number,
  ruleIndex: number,
  nodeId: string,
) => `${queryPath(flagIndex, ruleIndex)}.nodes.${nodeId}` as const

/** A serve config lives either on the default rule or on a targeting rule. */
export type ServePath =
  | `flags[${number}].defaultRule`
  | `flags[${number}].targeting[${number}].serve`

/** Where a serve config lives. Omit `ruleIndex` for the flag's default rule. */
export function servePath(flagIndex: number, ruleIndex?: number): ServePath {
  return ruleIndex === undefined
    ? `${flagPath(flagIndex)}.defaultRule`
    : `${rulePath(flagIndex, ruleIndex)}.serve`
}
