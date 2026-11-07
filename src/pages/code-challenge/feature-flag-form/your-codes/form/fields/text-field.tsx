import type { ComponentProps, ReactNode } from 'react'

import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { cn } from '#/lib/utils'

import { useFieldContext } from '../form-context'
import { FieldShell, errorIdOf } from './field-shell'
import { useFieldError } from './use-field-error'

type BaseProps = {
  label?: ReactNode
  hideLabel?: boolean
  description?: ReactNode
  className?: string
  inputClassName?: string
}

type TextFieldProps = BaseProps &
  Pick<
    ComponentProps<'input'>,
    'placeholder' | 'type' | 'list' | 'autoComplete' | 'spellCheck'
  >

export function TextField({
  label,
  hideLabel,
  description,
  className,
  inputClassName,
  type = 'text',
  ...inputProps
}: TextFieldProps) {
  const field = useFieldContext<string>()
  const error = useFieldError(field)

  return (
    <FieldShell
      id={field.name}
      label={label}
      hideLabel={hideLabel}
      description={description}
      error={error}
      className={className}
    >
      <Input
        {...inputProps}
        id={field.name}
        name={field.name}
        type={type}
        value={field.state.value}
        onChange={(event) => field.handleChange(event.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorIdOf(field.name) : undefined}
        className={inputClassName}
      />
    </FieldShell>
  )
}

type TextareaFieldProps = BaseProps &
  Pick<ComponentProps<'textarea'>, 'placeholder' | 'rows' | 'spellCheck'>

export function TextareaField({
  label,
  hideLabel,
  description,
  className,
  inputClassName,
  ...textareaProps
}: TextareaFieldProps) {
  const field = useFieldContext<string>()
  const error = useFieldError(field)

  return (
    <FieldShell
      id={field.name}
      label={label}
      hideLabel={hideLabel}
      description={description}
      error={error}
      className={className}
    >
      <Textarea
        {...textareaProps}
        id={field.name}
        name={field.name}
        value={field.state.value}
        onChange={(event) => field.handleChange(event.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorIdOf(field.name) : undefined}
        className={cn('min-h-16', inputClassName)}
      />
    </FieldShell>
  )
}
