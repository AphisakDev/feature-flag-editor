import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

import { editorFormOptions, useFormValue, withForm } from '../../form/form-hook'
import { servePath } from '../../form/paths'
import { selectServe } from '../../form/selectors'
import type { VariationOption } from '../../form/selectors'
import { VariationDot } from '../shared/section'

/** Splits 100% across `count` buckets; the remainder goes to the first ones. */
export function splitEvenly(count: number): Array<number> {
  if (count === 0) return []
  const base = Math.floor(100 / count)
  const remainder = 100 - base * count
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0))
}

/** One percentage input per variation, with a live stacked bar and total. */
export const PercentageRollout = withForm({
  ...editorFormOptions,
  props: {
    flagIndex: 0,
    ruleIndex: undefined as number | undefined,
    variations: [] as Array<VariationOption>,
  },
  render: function PercentageRollout({
    form,
    flagIndex,
    ruleIndex,
    variations,
  }) {
    const path = servePath(flagIndex, ruleIndex)
    const percentages = useFormValue(
      form,
      (v) => selectServe(v, flagIndex, ruleIndex)?.percentages,
    )
    const values = variations.map((v) => {
      const value = percentages?.[v.id]
      return typeof value === 'number' && Number.isFinite(value) ? value : 0
    })
    const total = values.reduce((sum, value) => sum + value, 0)

    const distributeEvenly = () => {
      const split = splitEvenly(variations.length)
      form.setFieldValue(
        `${path}.percentages`,
        Object.fromEntries(variations.map((v, i) => [v.id, split[i]])),
      )
    }

    return (
      <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">
          Users are split into buckets; a given user always gets the same
          variation.
        </p>

        <div
          className="flex h-2 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`Rollout split, total ${total}%`}
        >
          {variations.map((v, i) => (
            <div
              key={v.id}
              className={cn('h-full transition-all', v.color)}
              style={{ width: `${Math.min(values[i], 100)}%` }}
            />
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {variations.map((v) => (
            <div key={v.id} className="flex items-start gap-2">
              <div className="flex h-8 min-w-0 flex-1 items-center gap-2 text-sm">
                <VariationDot color={v.color} />
                <span className="truncate font-mono">{v.name}</span>
              </div>
              <form.AppField name={`${path}.percentages.${v.id}`}>
                {(field) => (
                  <field.NumberField
                    label={`Percentage for ${v.name}`}
                    hideLabel
                    min={0}
                    max={100}
                    step={1}
                    suffix="%"
                    className="w-24"
                  />
                )}
              </form.AppField>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={cn(
              'text-sm font-medium tabular-nums',
              total === 100
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-destructive',
            )}
          >
            Total: {Number.isInteger(total) ? total : total.toFixed(2)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={distributeEvenly}
          >
            Split evenly
          </Button>
        </div>
        <form.AppField name={`${path}.percentages`}>
          {(field) => <field.ErrorMessage />}
        </form.AppField>
      </div>
    )
  },
})
