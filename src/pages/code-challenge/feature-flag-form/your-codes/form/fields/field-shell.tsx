import type { ReactNode } from 'react'

import { Label } from '#/components/ui/label'
import { cn } from '#/lib/utils'

export type FieldShellProps = {
  /** Used for `<label htmlFor>` and for "jump to field" from the issues list. */
  id: string
  label?: ReactNode
  /** Visually hide the label (it is still read by screen readers). */
  hideLabel?: boolean
  description?: ReactNode
  error?: string
  className?: string
  children: ReactNode
}

export const errorIdOf = (id: string) => `${id}-error`

/** Label + control + description/error, shared by every field component. */
export function FieldShell({
  id,
  label,
  hideLabel,
  description,
  error,
  className,
  children,
}: FieldShellProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      {label ? (
        <Label
          htmlFor={id}
          className={cn(
            'text-xs font-medium text-muted-foreground',
            hideLabel && 'sr-only',
          )}
        >
          {label}
        </Label>
      ) : null}
      {children}
      <FieldMessage
        id={errorIdOf(id)}
        error={error}
        description={description}
      />
    </div>
  )
}

export function FieldMessage({
  id,
  error,
  description,
}: {
  id?: string
  error?: string
  description?: ReactNode
}) {
  if (error) {
    return (
      <p id={id} role="alert" className="text-xs text-destructive">
        {error}
      </p>
    )
  }
  if (description) {
    return <p className="text-xs text-muted-foreground">{description}</p>
  }
  return null
}
