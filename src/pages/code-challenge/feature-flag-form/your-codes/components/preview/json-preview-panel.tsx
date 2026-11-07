import Editor from '@monaco-editor/react'
import {
  CheckIcon,
  CircleCheckIcon,
  CopyIcon,
  DownloadIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'

import { validateEditor } from '../../model/issues'
import type { ValidationIssue } from '../../model/issues'
import type { FlagEditorValues } from '../../model/schema'
import { toGoffConfig } from '../../model/serialize'
import { editorFormOptions, withForm } from '../../form/form-hook'
import { IssuesList } from './issues-list'
import { useIsDarkMode } from './use-is-dark-mode'

export const PREVIEW_FILE_NAME = 'flags.json'

/**
 * Connects the form to the preview: `form.Subscribe` re-renders only this
 * subtree whenever any value changes; the rest of the editor is unaffected.
 */
export const JsonPreviewPanel = withForm({
  ...editorFormOptions,
  render: function JsonPreviewPanelView({ form }) {
    const revealIssue = (issue: ValidationIssue) => {
      // Mark the field as touched so its inline error becomes visible...
      // (issue paths are runtime strings, hence the cast to a field name)
      const name = issue.fieldName as Parameters<typeof form.getFieldMeta>[0]
      if (form.getFieldMeta(name)) {
        form.setFieldMeta(name, (meta) => ({ ...meta, isTouched: true }))
      }
      // ...and bring it into view.
      const element = document.getElementById(issue.fieldName)
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      element?.focus({ preventScroll: true })
    }

    return (
      <form.Subscribe selector={(state) => state.values}>
        {(values) => (
          <JsonPreview
            values={values}
            onSelectIssue={revealIssue}
            exportButton={
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <Button type="submit" size="sm" disabled={isSubmitting}>
                    <DownloadIcon /> Export
                  </Button>
                )}
              </form.Subscribe>
            }
          />
        )}
      </form.Subscribe>
    )
  },
})

type JsonPreviewProps = {
  values: FlagEditorValues
  onSelectIssue: (issue: ValidationIssue) => void
  exportButton: React.ReactNode
}

/**
 * Presentational part: builds the GO Feature Flag JSON and the issue list.
 * `useDeferredValue` lets React prioritise keystrokes in the inputs over
 * re-rendering Monaco and re-running validation on large configs.
 */
function JsonPreview({
  values,
  onSelectIssue,
  exportButton,
}: JsonPreviewProps) {
  const deferredValues = useDeferredValue(values)
  const json = useMemo(
    () => JSON.stringify(toGoffConfig(deferredValues), null, 2),
    [deferredValues],
  )
  const issues = useMemo(() => validateEditor(deferredValues), [deferredValues])
  const isValid = issues.length === 0
  const isDark = useIsDarkMode()
  const { copied, copy } = useCopyToClipboard()

  return (
    <section
      aria-labelledby="json-preview-title"
      className="overflow-hidden rounded-xl border bg-card shadow-sm"
    >
      <header className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <div className="mr-auto">
          <h2 id="json-preview-title" className="font-semibold">
            Live preview
          </h2>
          <p className="font-mono text-xs text-muted-foreground">
            {PREVIEW_FILE_NAME}
          </p>
        </div>
        <Badge
          variant={isValid ? 'secondary' : 'destructive'}
          role="status"
          aria-live="polite"
        >
          {isValid ? <CircleCheckIcon /> : <TriangleAlertIcon />}
          {isValid
            ? 'Valid'
            : `${issues.length} ${issues.length === 1 ? 'issue' : 'issues'}`}
        </Badge>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => copy(json)}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
        {exportButton}
      </header>

      <div className="h-[min(60vh,560px)] min-h-72" data-testid="json-preview">
        <Editor
          language="json"
          value={json}
          theme={isDark ? 'vs-dark' : 'light'}
          loading={
            <Skeleton className="m-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)]" />
          }
          options={{
            readOnly: true,
            domReadOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            tabSize: 2,
            wordWrap: 'on',
            renderLineHighlight: 'none',
            automaticLayout: true,
          }}
        />
      </div>

      <IssuesList issues={issues} onSelect={onSelectIssue} />
    </section>
  )
}

function useCopyToClipboard() {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timeout)
  }, [copied])

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
  }
  return { copied, copy }
}
