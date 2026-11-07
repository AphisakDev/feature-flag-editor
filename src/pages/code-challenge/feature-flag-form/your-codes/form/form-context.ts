import { createFormHookContexts } from '@tanstack/react-form'

/**
 * React contexts that connect the reusable field components (`TextField`,
 * `SelectField`...) to whichever `form.AppField` renders them.
 * Kept in its own module to avoid a circular import between the field
 * components and `form-hook.ts`.
 */
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts()
