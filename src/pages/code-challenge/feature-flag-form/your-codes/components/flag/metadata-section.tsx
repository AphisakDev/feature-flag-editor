import { PlusIcon, Trash2Icon } from 'lucide-react'

import { Button } from '#/components/ui/button'

import { createMetadataEntry } from '../../model/factories'
import {
  arrayEqual,
  editorFormOptions,
  useFormValue,
  withForm,
} from '../../form/form-hook'
import { flagPath } from '../../form/paths'
import { Section } from '../shared/section'

/** Free-form key/value pairs exported under `metadata` (owner, jira ticket...). */
export const MetadataSection = withForm({
  ...editorFormOptions,
  props: { flagIndex: 0 },
  render: function MetadataSectionView({ form, flagIndex }) {
    const metadata = `${flagPath(flagIndex)}.metadata` as const
    const ids = useFormValue(
      form,
      (v) => (v.flags[flagIndex]?.metadata ?? []).map((m) => m.id),
      arrayEqual,
    )

    return (
      <Section
        title="Metadata"
        description="Extra information about the flag, e.g. owner or issue link."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => form.pushFieldValue(metadata, createMetadataEntry())}
          >
            <PlusIcon /> Add metadata
          </Button>
        }
      >
        {ids.length > 0 ? (
          <div className="space-y-2">
            {ids.map((id, index) => (
              <div key={id} className="flex items-start gap-2">
                <form.AppField name={`${metadata}[${index}].key`}>
                  {(field) => (
                    <field.TextField
                      label="Key"
                      hideLabel
                      placeholder="owner"
                      autoComplete="off"
                      className="flex-1"
                      inputClassName="font-mono"
                    />
                  )}
                </form.AppField>
                <form.AppField name={`${metadata}[${index}].value`}>
                  {(field) => (
                    <field.TextField
                      label="Value"
                      hideLabel
                      placeholder="growth-team"
                      autoComplete="off"
                      className="flex-[2]"
                    />
                  )}
                </form.AppField>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove metadata ${index + 1}`}
                  onClick={() => form.removeFieldValue(metadata, index)}
                >
                  <Trash2Icon />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </Section>
    )
  },
})
