import { editorFormOptions, withForm } from '../../form/form-hook'
import type { ServePath } from '../../form/paths'
import type { SelectOption } from '../../form/fields/select-field'

const STEPS = [
  { key: 'initial', label: 'Start' },
  { key: 'end', label: 'End' },
] as const

/**
 * Progressive rollout: the percentage of users getting a variation grows
 * linearly from the start step to the end step over time.
 */
export const ProgressiveRollout = withForm({
  ...editorFormOptions,
  props: {
    path: 'flags[0].defaultRule' as ServePath,
    variationOptions: [] as Array<SelectOption>,
  },
  render: function ProgressiveRollout({ form, path, variationOptions }) {
    return (
      <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">
          The rollout percentage increases progressively between the start and
          the end date.
        </p>
        {STEPS.map(({ key, label }) => {
          const step = `${path}.progressive.${key}` as const
          return (
            <fieldset
              key={key}
              className="grid gap-2 sm:grid-cols-[4rem_minmax(0,1.3fr)_minmax(0,1fr)_6rem] sm:items-start"
            >
              <legend className="sr-only">{label} of the rollout</legend>
              <span
                aria-hidden="true"
                className="flex h-8 items-center text-sm font-medium"
              >
                {label}
              </span>
              <form.AppField name={`${step}.date`}>
                {(field) => (
                  <field.TextField
                    label={`${label} date`}
                    hideLabel
                    type="datetime-local"
                  />
                )}
              </form.AppField>
              <form.AppField name={`${step}.variationId`}>
                {(field) => (
                  <field.SelectField
                    label={`${label} variation`}
                    hideLabel
                    options={variationOptions}
                    placeholder="Variation"
                  />
                )}
              </form.AppField>
              <form.AppField name={`${step}.percentage`}>
                {(field) => (
                  <field.NumberField
                    label={`${label} percentage`}
                    hideLabel
                    min={0}
                    max={100}
                    suffix="%"
                  />
                )}
              </form.AppField>
            </fieldset>
          )
        })}
      </div>
    )
  },
})
