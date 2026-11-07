import { PlusIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '#/components/ui/button'

import { ATTRIBUTE_SUGGESTIONS } from '../model/constants'
import { createEditorValues, createFlag } from '../model/factories'
import { toGoffConfig } from '../model/serialize'
import { editorFormOptions, useAppForm } from '../form/form-hook'
import { useFlagIds } from '../form/selectors'
import { FlagCard } from './flag/flag-card'
import {
  JsonPreviewPanel,
  PREVIEW_FILE_NAME,
} from './preview/json-preview-panel'
import { ATTRIBUTE_SUGGESTIONS_ID } from './query-builder/query-condition'

type FeatureFlagEditorProps = {
  /** Called with the GO Feature Flag config after a successful export. */
  onExport?: (json: string) => void
}

/**
 * Root of the editor: owns the form instance and lays out the flags (left)
 * and the live JSON preview (right, sticky on large screens).
 */
export function FeatureFlagEditor({
  onExport = downloadJson,
}: FeatureFlagEditorProps) {
  // Lazy initial state: ids are generated once per mount.
  const [defaultValues] = useState(createEditorValues)

  const form = useAppForm({
    ...editorFormOptions,
    defaultValues,
    // Only called when the zod schema passes.
    onSubmit: ({ value }) => {
      onExport(JSON.stringify(toGoffConfig(value), null, 2))
    },
  })

  const flagIds = useFlagIds(form)

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
      className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(400px,0.85fr)]"
    >
      <div className="space-y-6">
        {flagIds.map((id, index) => (
          <FlagCard
            key={id}
            form={form}
            flagIndex={index}
            onRemove={
              flagIds.length > 1
                ? () => form.removeFieldValue('flags', index)
                : undefined
            }
          />
        ))}
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed"
          onClick={() =>
            form.pushFieldValue('flags', createFlag(flagIds.length))
          }
        >
          <PlusIcon /> Add another flag
        </Button>
      </div>

      <aside className="xl:sticky xl:top-4">
        <JsonPreviewPanel form={form} />
      </aside>

      {/* Autocomplete for condition attributes, shared by every condition row. */}
      <datalist id={ATTRIBUTE_SUGGESTIONS_ID}>
        {ATTRIBUTE_SUGGESTIONS.map((attribute) => (
          <option key={attribute} value={attribute} />
        ))}
      </datalist>
    </form>
  )
}

function downloadJson(json: string) {
  const url = URL.createObjectURL(
    new Blob([json], { type: 'application/json' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = PREVIEW_FILE_NAME
  link.click()
  URL.revokeObjectURL(url)
}
