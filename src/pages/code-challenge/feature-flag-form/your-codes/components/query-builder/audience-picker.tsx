import { CheckIcon } from 'lucide-react'

import { cn } from '#/lib/utils'

type AudiencePickerProps = {
  label: string
  /** Names defined in Roles & Groups. */
  names: ReadonlyArray<string>
  selected: ReadonlyArray<string>
  /** `in` operator: chips toggle; otherwise a chip replaces the value. */
  multiple: boolean
  onPick: (name: string) => void
}

/** Clickable chips for the roles / groups defined in the catalog. */
export function AudiencePicker({
  label,
  names,
  selected,
  multiple,
  onPick,
}: AudiencePickerProps) {
  if (names.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        None defined yet — add some in Roles &amp; Groups above.
      </p>
    )
  }

  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap items-center gap-1"
    >
      <span className="mr-1 text-xs text-muted-foreground">{label}</span>
      {names.map((name) => {
        const isSelected = selected.includes(name)
        return (
          <button
            key={name}
            type="button"
            aria-pressed={isSelected}
            title={multiple ? 'Toggle' : 'Use this value'}
            onClick={() => onPick(name)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs transition-colors',
              isSelected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:border-foreground/40 hover:text-foreground',
            )}
          >
            {isSelected ? <CheckIcon className="size-3" /> : null}
            {name}
          </button>
        )
      })}
    </div>
  )
}
