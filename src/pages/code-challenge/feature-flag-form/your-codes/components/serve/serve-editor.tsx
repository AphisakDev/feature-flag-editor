import { useMemo } from 'react'

import { SERVE_TYPES, SERVE_TYPE_LABELS } from '../../model/constants'
import { editorFormOptions, useFormValue, withForm } from '../../form/form-hook'
import { servePath } from '../../form/paths'
import { selectServe, useVariationOptions } from '../../form/selectors'
import { PercentageRollout, splitEvenly } from './percentage-rollout'
import { ProgressiveRollout } from './progressive-rollout'

const SERVE_TYPE_OPTIONS = SERVE_TYPES.map((type) => ({
  value: type,
  label: SERVE_TYPE_LABELS[type],
}))

/**
 * "Serve" picker shared by targeting rules and the default rule.
 * Omit `ruleIndex` to edit the flag's default rule.
 */
export const ServeEditor = withForm({
  ...editorFormOptions,
  props: { flagIndex: 0, ruleIndex: undefined as number | undefined },
  render: function ServeEditor({ form, flagIndex, ruleIndex }) {
    const path = servePath(flagIndex, ruleIndex)
    const type = useFormValue(
      form,
      (v) => selectServe(v, flagIndex, ruleIndex)?.type ?? 'variation',
    )
    const variations = useVariationOptions(form, flagIndex)
    const variationSelectOptions = useMemo(
      () =>
        variations.map((o) => ({ value: o.id, label: `${o.emoji} ${o.name}` })),
      [variations],
    )

    /** Switching to a percentage rollout starts from an even split instead of 0%. */
    const prefillPercentages = (nextType: string) => {
      if (nextType !== 'percentage') return
      const current = form.getFieldValue(`${path}.percentages`)
      const total = variations.reduce((sum, v) => sum + (current[v.id] || 0), 0)
      if (total > 0) return
      const split = splitEvenly(variations.length)
      form.setFieldValue(
        `${path}.percentages`,
        Object.fromEntries(variations.map((v, i) => [v.id, split[i]])),
      )
    }

    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <form.AppField
            name={`${path}.type`}
            listeners={{ onChange: ({ value }) => prefillPercentages(value) }}
          >
            {(field) => (
              <field.SelectField label="Serve" options={SERVE_TYPE_OPTIONS} />
            )}
          </form.AppField>
          {type === 'variation' ? (
            <form.AppField name={`${path}.variationId`}>
              {(field) => (
                <field.SelectField
                  label="Variation"
                  options={variationSelectOptions}
                  placeholder="Select a variation"
                />
              )}
            </form.AppField>
          ) : null}
        </div>

        {type === 'percentage' ? (
          <PercentageRollout
            form={form}
            flagIndex={flagIndex}
            ruleIndex={ruleIndex}
            variations={variations}
          />
        ) : null}
        {type === 'progressive' ? (
          <ProgressiveRollout
            form={form}
            path={path}
            variationOptions={variationSelectOptions}
          />
        ) : null}
      </div>
    )
  },
})
