import { useFieldContext } from '../form-context'
import { FieldMessage } from './field-shell'
import { useFieldError } from './use-field-error'
import type { ErrorVisibility } from './use-field-error'

/**
 * Renders only the error of a field. Used for errors that belong to a
 * container rather than an input, e.g. `...serve.percentages` (sum != 100)
 * or `...nodes.<id>.childIds` (empty group).
 */
export function ErrorMessage({
  visibility = 'always',
}: {
  visibility?: ErrorVisibility
}) {
  const field = useFieldContext<unknown>()
  const error = useFieldError(field, visibility)
  if (!error) return null
  return (
    // `id` lets the issues list scroll to this message.
    <div id={field.name} tabIndex={-1} className="outline-none">
      <FieldMessage error={error} />
    </div>
  )
}
