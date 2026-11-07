import type { AnyFormApi } from '@tanstack/react-form'

import { variationColor, variationEmoji } from '../model/constants'
import type { FlagEditorValues } from '../model/schema'
import { arrayEqual, useFormValue } from './form-hook'

/** Ids of the flags — the flag list re-renders only when flags are added/removed/moved. */
export function useFlagIds(form: AnyFormApi) {
  return useFormValue(form, (v) => v.flags.map((f) => f.id), arrayEqual)
}

export type VariationOption = {
  id: string
  name: string
  /** Tailwind background class for the colour dot. */
  color: string
  /** Same colour as an emoji, for `<option>` labels. */
  emoji: string
}

const optionsEqual = (a: Array<VariationOption>, b: Array<VariationOption>) =>
  a.length === b.length &&
  a.every((o, i) => o.id === b[i].id && o.name === b[i].name)

/**
 * Variations as `{ id, name, color }` for "serve" dropdowns and percentage
 * rows. Re-renders only when a variation is added, removed, moved or renamed
 * (not when its value changes).
 */
export function useVariationOptions(
  form: AnyFormApi,
  flagIndex: number,
): Array<VariationOption> {
  return useFormValue(
    form,
    (v) =>
      (v.flags[flagIndex]?.variations ?? []).map((variation, index) => ({
        id: variation.id,
        name: variation.name.trim() || `(unnamed ${index + 1})`,
        color: variationColor(index),
        emoji: variationEmoji(index),
      })),
    optionsEqual,
  )
}

/** Serve config of the default rule (no `ruleIndex`) or of a targeting rule. */
export function selectServe(
  values: FlagEditorValues,
  flagIndex: number,
  ruleIndex?: number,
) {
  const flag = values.flags.at(flagIndex)
  return ruleIndex === undefined
    ? flag?.defaultRule
    : flag?.targeting.at(ruleIndex)?.serve
}
