import type { ReactNode } from 'react'

import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { cn } from '#/lib/utils'

import { useFieldContext } from '../form-context'
import { FieldShell, errorIdOf } from './field-shell'
import { useFieldError } from './use-field-error'

export type SelectOption = { value: string; label: string }

type SelectFieldProps = {
  label?: ReactNode
  hideLabel?: boolean
  options: ReadonlyArray<SelectOption>
  /** Shown (disabled) when the current value matches no option. */
  placeholder?: string
  className?: string
  selectClassName?: string
}

/**
 * Native `<select>` styled by shadcn: accessible, keyboard friendly and works
 * on mobile without extra JS.
 */
export function SelectField({
  label,
  hideLabel,
  options,
  placeholder = 'Select…',
  className,
  selectClassName,
}: SelectFieldProps) {
  const field = useFieldContext<string>()
  const error = useFieldError(field)
  const hasMatch = options.some((o) => o.value === field.state.value)

  return (
    <FieldShell
      id={field.name}
      label={label}
      hideLabel={hideLabel}
      error={error}
      className={className}
    >
      <NativeSelect
        id={field.name}
        name={field.name}
        value={hasMatch ? field.state.value : ''}
        onChange={(event) => field.handleChange(event.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorIdOf(field.name) : undefined}
        className={cn('w-full', selectClassName)}
      >
        {!hasMatch ? (
          <NativeSelectOption value="" disabled>
            {placeholder}
          </NativeSelectOption>
        ) : null}
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </FieldShell>
  )
}
