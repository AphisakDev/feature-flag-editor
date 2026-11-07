import { Trash2Icon } from 'lucide-react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

import { toQueryString } from '../../model/query-tree'
import type { FlagEditorValues, TargetingRule } from '../../model/schema'
import { editorFormOptions, useFormValue, withForm } from '../../form/form-hook'
import { rulePath } from '../../form/paths'
import { QueryGroup } from '../query-builder/query-group'
import { ServeEditor } from '../serve/serve-editor'
import { DragHandle } from '../shared/sortable-list'
import type { DragHandleProps } from '../shared/sortable-list'

/** One targeting rule: name, condition tree ("If") and what to serve ("Then"). */
export const TargetingRuleCard = withForm({
  ...editorFormOptions,
  props: {
    flagIndex: 0,
    ruleIndex: 0,
    handle: {} as DragHandleProps,
    onRemove: () => {},
  },
  render: function TargetingRuleCardView({
    form,
    flagIndex,
    ruleIndex,
    handle,
    onRemove,
  }) {
    const rule = rulePath(flagIndex, ruleIndex)
    const selectRule = (v: FlagEditorValues): TargetingRule | undefined =>
      v.flags[flagIndex]?.targeting[ruleIndex]
    const rootId = useFormValue(form, (v) => selectRule(v)?.query.rootId ?? '')
    const disabled = useFormValue(form, (v) => selectRule(v)?.disabled ?? false)
    // A compact, human-readable summary of the rule, updated live.
    const summary = useFormValue(form, (v) => {
      const query = selectRule(v)?.query
      return query ? toQueryString(query) : ''
    })

    return (
      <article
        aria-label={`Targeting rule ${ruleIndex + 1}`}
        className={cn(
          'rounded-xl border bg-card shadow-xs transition-opacity',
          disabled && 'opacity-60',
        )}
      >
        <header className="flex items-start gap-2 border-b p-3">
          <DragHandle
            label={`Reorder rule ${ruleIndex + 1}`}
            {...handle}
            className="mt-0.5"
          />
          <Badge variant="secondary" className="mt-1.5 tabular-nums">
            #{ruleIndex + 1}
          </Badge>
          <form.AppField name={`${rule}.name`}>
            {(field) => (
              <field.TextField
                label="Rule name"
                hideLabel
                placeholder="Rule name (optional)"
                autoComplete="off"
                className="flex-1"
                inputClassName="font-medium"
              />
            )}
          </form.AppField>
          <form.AppField name={`${rule}.disabled`}>
            {(field) => (
              <field.SwitchField label="Disabled" className="mt-1.5 shrink-0" />
            )}
          </form.AppField>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove rule ${ruleIndex + 1}`}
            onClick={onRemove}
          >
            <Trash2Icon />
          </Button>
        </header>

        <div className="space-y-4 p-3">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              If
            </h4>
            {rootId ? (
              <QueryGroup
                form={form}
                flagIndex={flagIndex}
                ruleIndex={ruleIndex}
                groupId={rootId}
                depth={0}
                handle={undefined}
                onRemove={undefined}
              />
            ) : null}
            <p
              className="truncate font-mono text-xs text-muted-foreground"
              title={summary}
            >
              <span className="font-sans font-medium">Query: </span>
              {summary || '— incomplete —'}
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Then
            </h4>
            <ServeEditor
              form={form}
              flagIndex={flagIndex}
              ruleIndex={ruleIndex}
            />
          </div>
        </div>
      </article>
    )
  },
})
