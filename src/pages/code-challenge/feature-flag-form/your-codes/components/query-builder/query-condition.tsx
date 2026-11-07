import { XIcon } from 'lucide-react'

import { Button } from '#/components/ui/button'

import {
  AUDIENCE_CONFIG,
  AUDIENCE_OPERATORS,
  OPERATORS,
  audienceKindOf,
  getOperator,
} from '../../model/constants'
import { splitListValue, toggleListItem } from '../../model/schema'
import type { FlagEditorValues, QueryNode } from '../../model/schema'
import { updateCondition } from '../../model/query-tree'
import {
  arrayEqual,
  editorFormOptions,
  useFormValue,
  withForm,
} from '../../form/form-hook'
import { nodePath, queryPath } from '../../form/paths'
import { DragHandle } from '../shared/sortable-list'
import type { DragHandleProps } from '../shared/sortable-list'
import { AudiencePicker } from './audience-picker'

export const ATTRIBUTE_SUGGESTIONS_ID = 'goff-attribute-suggestions'

const OPERATOR_OPTIONS = OPERATORS.map((o) => ({
  value: o.value,
  label: o.label,
}))

const EMPTY: Array<string> = []

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
  render: function QueryConditionView({
    form,
    flagIndex,
    ruleIndex,
    nodeId,
    handle,
    onRemove,
  }) {
    const node = nodePath(flagIndex, ruleIndex, nodeId)
    const selectCondition = (v: FlagEditorValues) => {
      const n = v.flags[flagIndex]?.targeting[ruleIndex]?.query.nodes[
        nodeId
      ] as QueryNode | undefined
      return n?.kind === 'condition' ? n : undefined
    }
    const operator = useFormValue(
      form,
      (v) => selectCondition(v)?.operator ?? 'eq',
    )
    const value = useFormValue(form, (v) => selectCondition(v)?.value ?? '')
    // Is this a `role` / `group` condition? Then offer the defined names.
    const audience = useFormValue(form, (v) =>
      audienceKindOf(selectCondition(v)?.attribute ?? ''),
    )
    const audienceNames = useFormValue(
      form,
      (v) =>
        audience
          ? v[audience].map((entry) => entry.name.trim()).filter(Boolean)
          : EMPTY,
      arrayEqual,
    )

    const { valueKind } = getOperator(operator)
    const showPicker = audience && AUDIENCE_OPERATORS.includes(operator)

    const pickAudience = (name: string) =>
      form.setFieldValue(queryPath(flagIndex, ruleIndex), (tree) =>
        updateCondition(tree, nodeId, {
          value: valueKind === 'list' ? toggleListItem(value, name) : name,
        }),
      )

    return (
      <div className="flex items-start gap-1.5 rounded-md border bg-background p-1.5">
        <DragHandle label="Reorder condition" {...handle} className="mt-0.5" />
        <div className="flex-1 space-y-1.5">
          <div className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_10.5rem_minmax(0,1fr)]">
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
                    placeholder={
                      valueKind === 'list' ? 'admin, editor' : 'Value'
                    }
                    description={
                      valueKind === 'list' && !showPicker
                        ? 'Comma separated values'
                        : undefined
                    }
                    autoComplete="off"
                    spellCheck={false}
                    inputClassName="font-mono"
                  />
                )}
              </form.AppField>
            )}
          </div>
          {showPicker ? (
            <AudiencePicker
              label={`${AUDIENCE_CONFIG[audience].title}:`}
              names={audienceNames}
              selected={
                valueKind === 'list' ? splitListValue(value) : [value.trim()]
              }
              multiple={valueKind === 'list'}
              onPick={pickAudience}
            />
          ) : null}
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
