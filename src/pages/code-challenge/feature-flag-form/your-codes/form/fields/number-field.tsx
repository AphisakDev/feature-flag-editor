import type { ReactNode } from 'react'

import { Input } from '#/components/ui/input'
import { cn } from '#/lib/utils'

import { useFieldContext } from '../form-context'
import { FieldShell, errorIdOf } from './field-shell'
import { useFieldError } from './use-field-error'

type NumberFieldProps = {
  label?: ReactNode
  hideLabel?: boolean
  className?: string
  inputClassName?: string
  min?: number
  max?: number
  step?: number
  /** Text shown inside the input on the right, e.g. `%`. */
  suffix?: string
}

/**
 * Stores a real `number` in the form. An empty input becomes `NaN`,
 * which the zod schema reports as "Enter a percentage" instead of
 * silently turning into 0.
 */
export function NumberField({
  label,
  hideLabel,
  className,
  inputClassName,
  suffix,
  ...inputProps
}: NumberFieldProps) {
  const field = useFieldContext<number | undefined>()
  const error = useFieldError(field)
  const value = field.state.value

  return (
    <FieldShell
      id={field.name}
      label={label}
      hideLabel={hideLabel}
      error={error}
      className={className}
    >
      <div className="relative">
        <Input
          {...inputProps}
          id={field.name}
          name={field.name}
          type="number"
          inputMode="decimal"
          value={value === undefined || Number.isNaN(value) ? '' : value}
          onChange={(event) => field.handleChange(event.target.valueAsNumber)}
          onBlur={field.handleBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorIdOf(field.name) : undefined}
          className={cn('tabular-nums', suffix && 'pr-7', inputClassName)}
        />
        {suffix ? (
          <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </FieldShell>
  )
}
