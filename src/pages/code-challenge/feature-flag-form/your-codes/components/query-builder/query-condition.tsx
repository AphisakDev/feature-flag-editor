import { XIcon } from 'lucide-react'

import { Button } from '#/components/ui/button'

import { OPERATORS, getOperator } from '../../model/constants'
import type { QueryNode } from '../../model/schema'
import { editorFormOptions, useFormValue, withForm } from '../../form/form-hook'
import { nodePath } from '../../form/paths'
import { DragHandle } from '../shared/sortable-list'
import type { DragHandleProps } from '../shared/sortable-list'

export const ATTRIBUTE_SUGGESTIONS_ID = 'goff-attribute-suggestions'

const OPERATOR_OPTIONS = OPERATORS.map((o) => ({
  value: o.value,
  label: o.label,
}))

/** One `attribute operator value` row, e.g. `role eq "admin"`. */
export const QueryCondition = withForm({
  ...editorFormOptions,
  props: {
    flagIndex: 0,
    ruleIndex: 0,
    nodeId: '',
    handle: {} as DragHandleProps,
    onRemove: () => {},
  },
  render: function QueryCondition({
    form,
    flagIndex,
    ruleIndex,
    nodeId,
    handle,
    onRemove,
  }) {
    const node = nodePath(flagIndex, ruleIndex, nodeId)
    const operator = useFormValue(form, (v) => {
      const n = v.flags[flagIndex]?.targeting[ruleIndex]?.query.nodes[
        nodeId
      ] as QueryNode | undefined
      return n?.kind === 'condition' ? n.operator : 'eq'
    })
    const { valueKind } = getOperator(operator)

    return (
      <div className="flex items-start gap-1.5 rounded-md border bg-background p-1.5">
        <DragHandle label="Reorder condition" {...handle} className="mt-0.5" />
        <div className="grid flex-1 gap-1.5 sm:grid-cols-[minmax(0,1fr)_10.5rem_minmax(0,1fr)]">
          <form.AppField name={`${node}.attribute`}>
            {(field) => (
              <field.TextField
                label="Attribute"
                hideLabel
                placeholder="Attribute (e.g. role)"
                list={ATTRIBUTE_SUGGESTIONS_ID}
                autoComplete="off"
                spellCheck={false}
                inputClassName="font-mono"
              />
            )}
          </form.AppField>
          <form.AppField name={`${node}.operator`}>
            {(field) => (
              <field.SelectField
                label="Operator"
                hideLabel
                options={OPERATOR_OPTIONS}
              />
            )}
          </form.AppField>
          {valueKind === 'none' ? (
            <p className="flex h-8 items-center px-1 text-xs text-muted-foreground">
              No value needed
            </p>
          ) : (
            <form.AppField name={`${node}.value`}>
              {(field) => (
                <field.TextField
                  label="Value"
                  hideLabel
                  placeholder={valueKind === 'list' ? 'admin, editor' : 'Value'}
                  description={
                    valueKind === 'list' ? 'Comma separated values' : undefined
                  }
                  autoComplete="off"
                  spellCheck={false}
                  inputClassName="font-mono"
                />
              )}
            </form.AppField>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Remove condition"
          onClick={onRemove}
        >
          <XIcon />
        </Button>
      </div>
    )
  },
})
