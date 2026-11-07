import { CircleAlertIcon } from 'lucide-react'

import type { ValidationIssue } from '../../model/issues'

type IssuesListProps = {
  issues: Array<ValidationIssue>
  onSelect: (issue: ValidationIssue) => void
}

/** Every validation problem with its location; clicking one jumps to the field. */
export function IssuesList({ issues, onSelect }: IssuesListProps) {
  if (issues.length === 0) return null

  return (
    <div className="border-t">
      <h3 className="px-4 pt-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {issues.length} {issues.length === 1 ? 'issue' : 'issues'} to fix
      </h3>
      <ul className="max-h-56 space-y-0.5 overflow-y-auto p-2">
        {issues.map((issue) => (
          <li key={`${issue.fieldName}:${issue.message}`}>
            <button
              type="button"
              onClick={() => onSelect(issue)}
              className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
            >
              <CircleAlertIcon
                className="mt-0.5 size-4 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-xs text-muted-foreground">
                  {issue.location}
                </span>
                <span className="block">{issue.message}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
