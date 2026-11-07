import { FLAG_TYPES, FLAG_TYPE_LABELS } from '../../model/constants'
import type { FlagType } from '../../model/constants'
import { defaultVariationValue } from '../../model/variation-value'
import { editorFormOptions, withForm } from '../../form/form-hook'
import { flagPath } from '../../form/paths'

const FLAG_TYPE_OPTIONS = FLAG_TYPES.map((type) => ({
  value: type,
  label: FLAG_TYPE_LABELS[type],
}))

/** Flag metadata: name, description, status, type, tracking and version. */
export const FlagSettingsSection = withForm({
  ...editorFormOptions,
  props: { flagIndex: 0 },
  render: function FlagSettingsSectionView({ form, flagIndex }) {
    const flag = flagPath(flagIndex)

    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <form.AppField name={`${flag}.key`}>
            {(field) => (
              <field.TextField
                label="Flag name"
                placeholder="my-new-feature"
                autoComplete="off"
                spellCheck={false}
                inputClassName="font-mono"
              />
            )}
          </form.AppField>

          <form.AppField
            name={`${flag}.type`}
            listeners={{
              // Switching type resets values so they stay valid for the new type
              // (same behaviour as the GO Feature Flag editor).
              onChange: ({ value }) => {
                form.setFieldValue(`${flag}.variations`, (variations) =>
                  variations.map((variation, index) => ({
                    ...variation,
                    value: defaultVariationValue(value as FlagType, index),
                  })),
                )
              },
            }}
          >
            {(field) => (
              <field.SelectField
                label="Flag type"
                options={FLAG_TYPE_OPTIONS}
              />
            )}
          </form.AppField>

          <form.AppField name={`${flag}.version`}>
            {(field) => (
              <field.TextField
                label="Version"
                placeholder="e.g. 1.0.0"
                autoComplete="off"
              />
            )}
          </form.AppField>
        </div>

        <form.AppField name={`${flag}.description`}>
          {(field) => (
            <field.TextareaField
              label="Description"
              placeholder="What does this flag control? (exported as metadata.description)"
              rows={2}
            />
          )}
        </form.AppField>

        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <form.AppField name={`${flag}.enabled`}>
            {(field) => (
              <field.SwitchField
                label="Enabled"
                description="When off, the flag is disabled and SDKs return the default value."
              />
            )}
          </form.AppField>
          <form.AppField name={`${flag}.trackEvents`}>
            {(field) => (
              <field.SwitchField
                label="Track events"
                description="Send evaluation events to the exporter."
              />
            )}
          </form.AppField>
        </div>
      </div>
    )
  },
})
