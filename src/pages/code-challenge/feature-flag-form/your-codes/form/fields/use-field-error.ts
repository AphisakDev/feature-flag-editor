import { useStore } from '@tanstack/react-form'
import type { AnyFieldApi } from '@tanstack/react-form'

/**
 * - `touched` (default): only after the user edited the field or tried to export.
 *   New empty rows don't start out red.
 * - `always`: for aggregate errors that are useful immediately
 *   (e.g. "percentages must add up to 100").
 */
export type ErrorVisibility = 'touched' | 'always'

/** Returns the first error message of a field, if it should be shown. */
export function useFieldError(
  field: AnyFieldApi,
  visibility: ErrorVisibility = 'touched',
): string | undefined {
  const errors = useStore(field.store, (state) => state.meta.errors)
  const isTouched = useStore(field.store, (state) => state.meta.isTouched)
  const hasSubmitted = useStore(
    field.form.store,
    (state) => state.submissionAttempts > 0,
  )

  if (visibility === 'touched' && !isTouched && !hasSubmitted) return undefined
  return firstMessage(errors)
}

/**
 * Errors can be plain strings or Standard Schema issues (`{ message }`),
 * possibly grouped in arrays depending on which validator produced them.
 */
export function firstMessage(
  errors: ReadonlyArray<unknown>,
): string | undefined {
  for (const error of errors.flat()) {
    if (typeof error === 'string' && error) return error
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message)
    }
  }
  return undefined
}
