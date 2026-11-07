import { createFormHook, formOptions, useStore } from '@tanstack/react-form'
import type { AnyFormApi } from '@tanstack/react-form'

import { createEditorValues } from '../model/factories'
import { flagEditorSchema } from '../model/schema'
import type { FlagEditorValues } from '../model/schema'
import { ErrorMessage } from './fields/error-message'
import { NumberField } from './fields/number-field'
import { SelectField } from './fields/select-field'
import { SwitchField } from './fields/switch-field'
import { TextField, TextareaField } from './fields/text-field'
import { fieldContext, formContext } from './form-context'

/**
 * App-specific form hook: `form.AppField` can render any of these
 * components as `<field.TextField />`, so section components never repeat
 * the label / value / onChange / error wiring.
 */
export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    TextareaField,
    NumberField,
    SelectField,
    SwitchField,
    ErrorMessage,
  },
  formComponents: {},
})

/**
 * Shared options so `withForm` sub-components get the exact same types as
 * the form created in `FeatureFlagEditor`. The zod schema is used directly
 * as a Standard Schema validator: every issue is routed to the field whose
 * name matches the issue path.
 */
export const editorFormOptions = formOptions({
  defaultValues: createEditorValues(),
  validators: {
    onChange: flagEditorSchema,
  },
})

/**
 * Subscribe to a slice of the form values. Components only re-render when
 * their slice changes (compared with `isEqual`), which keeps typing in one
 * condition from re-rendering the rest of the editor.
 *
 * Selectors must tolerate missing indexes (`?.`): when an item is removed,
 * subscribers can run once more before React unmounts them.
 */
export function useFormValue<T>(
  form: AnyFormApi,
  selector: (values: FlagEditorValues) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  return useStore(
    form.store,
    (state) => selector(state.values as FlagEditorValues),
    isEqual,
  )
}

/** Element-wise equality for arrays of primitives (e.g. a list of ids). */
export function arrayEqual<T>(a: ReadonlyArray<T>, b: ReadonlyArray<T>) {
  return (
    a.length === b.length && a.every((item, index) => Object.is(item, b[index]))
  )
}
