import type { ReactNode } from 'react'

import { cn } from '#/lib/utils'

type SectionProps = {
  title: string
  description?: ReactNode
  /** Buttons shown on the right of the title. */
  actions?: ReactNode
  className?: string
  children: ReactNode
}

/** Titled block inside a flag card (Variations, Targeting, Default...). */
export function Section({
  title,
  description,
  actions,
  className,
  children,
}: SectionProps) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  )
}

export function VariationDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block size-2.5 shrink-0 rounded-full', color)}
    />
  )
}
