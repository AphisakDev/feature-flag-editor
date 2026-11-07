import type { ReactNode } from 'react'

import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import { cn } from '#/lib/utils'

import { useFieldContext } from '../form-context'

type SwitchFieldProps = {
  label: ReactNode
  description?: ReactNode
  className?: string
}

export function SwitchField({
  label,
  description,
  className,
}: SwitchFieldProps) {
  const field = useFieldContext<boolean>()

  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <Switch
        id={field.name}
        name={field.name}
        checked={field.state.value}
        onCheckedChange={(checked) => field.handleChange(checked)}
        onBlur={field.handleBlur}
        className="mt-0.5"
      />
      <div className="grid gap-0.5">
        <Label htmlFor={field.name} className="text-sm font-medium">
          {label}
        </Label>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  )
}
