import { PlusIcon, Trash2Icon } from 'lucide-react'

import { Button } from '#/components/ui/button'

import { variationColor } from '../../model/constants'
import { createVariation } from '../../model/factories'
import {
  arrayEqual,
  editorFormOptions,
  useFormValue,
  withForm,
} from '../../form/form-hook'
import { flagPath } from '../../form/paths'
import { Section, VariationDot } from '../shared/section'
import { DragHandle, SortableList } from '../shared/sortable-list'
import type { DragHandleProps } from '../shared/sortable-list'

const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'true' },
  { value: 'false', label: 'false' },
]

/** The values a flag can return (e.g. `on: true`, `off: false`). */
export const VariationsSection = withForm({
  ...editorFormOptions,
  props: { flagIndex: 0 },
  render: function VariationsSection({ form, flagIndex }) {
    const flag = flagPath(flagIndex)
    const ids = useFormValue(
      form,
      (v) => (v.flags[flagIndex]?.variations ?? []).map((x) => x.id),
      arrayEqual,
    )

    const addVariation = () => {
      const type = form.getFieldValue(`${flag}.type`)
      form.pushFieldValue(
        `${flag}.variations`,
        createVariation(type, ids.length),
      )
    }

    return (
      <Section
        title="Variations"
        description="The values this flag can return. Drag to reorder."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addVariation}
          >
            <PlusIcon /> Add variation
          </Button>
        }
      >
        <SortableList
          ids={ids}
          className="space-y-2"
          onMove={(from, to) =>
            form.moveFieldValues(`${flag}.variations`, from, to)
          }
          renderItem={(_id, index, handle) => (
            <VariationRow
              form={form}
              flagIndex={flagIndex}
              index={index}
              handle={handle}
              canRemove={ids.length > 1}
            />
          )}
        />
        <form.AppField name={`${flag}.variations`}>
          {(field) => <field.ErrorMessage />}
        </form.AppField>
      </Section>
    )
  },
})

const VariationRow = withForm({
  ...editorFormOptions,
  props: {
    flagIndex: 0,
    index: 0,
    handle: {} as DragHandleProps,
    canRemove: true,
  },
  render: function VariationRow({ form, flagIndex, index, handle, canRemove }) {
    const variation = `${flagPath(flagIndex)}.variations[${index}]` as const
    const type = useFormValue(form, (v) => v.flags[flagIndex]?.type ?? 'string')

    return (
      <div className="flex items-start gap-2 rounded-lg border bg-background/50 p-2">
        <DragHandle label={`Reorder variation ${index + 1}`} {...handle} />
        <div className="flex h-8 items-center">
          <VariationDot color={variationColor(index)} />
        </div>
        <div className="grid flex-1 gap-2 sm:grid-cols-2">
          <form.AppField name={`${variation}.name`}>
            {(field) => (
              <field.TextField
                label="Name"
                hideLabel
                placeholder="Variation name"
                autoComplete="off"
                inputClassName="font-mono"
              />
            )}
          </form.AppField>
          <form.AppField name={`${variation}.value`}>
            {(field) =>
              type === 'boolean' ? (
                <field.SelectField
                  label="Value"
                  hideLabel
                  options={BOOLEAN_OPTIONS}
                />
              ) : type === 'json' ? (
                <field.TextareaField
                  label="Value"
                  hideLabel
                  rows={2}
                  spellCheck={false}
                  placeholder='{"key": "value"}'
                  inputClassName="font-mono text-xs"
                />
              ) : (
                <field.TextField
                  label="Value"
                  hideLabel
                  placeholder={type === 'number' ? '42' : 'Value'}
                  autoComplete="off"
                  inputClassName="font-mono"
                />
              )
            }
          </form.AppField>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove variation ${index + 1}`}
          disabled={!canRemove}
          onClick={() =>
            form.removeFieldValue(`${flagPath(flagIndex)}.variations`, index)
          }
        >
          <Trash2Icon />
        </Button>
      </div>
    )
  },
})
