import { FolderPlusIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import type { JSX } from 'react'

import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

import { COMBINATORS } from '../../model/constants'
import {
  addCondition,
  addGroup,
  moveChild,
  removeNode,
  updateGroup,
} from '../../model/query-tree'
import type { FlagEditorValues, QueryNode, QueryTree } from '../../model/schema'
import {
  arrayEqual,
  editorFormOptions,
  useFormValue,
  withForm,
} from '../../form/form-hook'
import { nodePath, queryPath } from '../../form/paths'
import { DragHandle, SortableList } from '../shared/sortable-list'
import type { DragHandleProps } from '../shared/sortable-list'
import { QueryCondition } from './query-condition'

/** Root group + 3 nested levels is plenty for real targeting and keeps the UI readable. */
export const MAX_GROUP_DEPTH = 3

const DEPTH_ACCENTS = [
  'border-l-sky-500',
  'border-l-violet-500',
  'border-l-amber-500',
  'border-l-pink-500',
]

const EMPTY: Array<string> = []

/**
 * A group of conditions joined by AND / OR, optionally negated.
 * Renders itself recursively for nested groups. The data is a flat map of
 * nodes (see model/query-tree.ts), so each group only subscribes to its own
 * `childIds` and re-renders when *its* children change.
 */
export const QueryGroup = withForm({
  ...editorFormOptions,
  props: {
    flagIndex: 0,
    ruleIndex: 0,
    groupId: '',
    depth: 0,
    /** Absent for the root group (it cannot be dragged or removed). */
    handle: undefined as DragHandleProps | undefined,
    onRemove: undefined as (() => void) | undefined,
  },
  render: function QueryGroupView({
    form,
    flagIndex,
    ruleIndex,
    groupId,
    depth,
    handle,
    onRemove,
  }): JSX.Element {
    const query = queryPath(flagIndex, ruleIndex)
    const node = nodePath(flagIndex, ruleIndex, groupId)

    const selectNodes = (v: FlagEditorValues) =>
      v.flags[flagIndex]?.targeting[ruleIndex]?.query.nodes ?? {}
    const childIds = useFormValue(
      form,
      (v) => {
        const group = selectNodes(v)[groupId] as QueryNode | undefined
        return group?.kind === 'group' ? group.childIds : EMPTY
      },
      arrayEqual,
    )
    const childKinds = useFormValue(
      form,
      (v) => {
        const nodes = selectNodes(v)
        return childIds.map((id) => (nodes[id] as QueryNode | undefined)?.kind)
      },
      arrayEqual,
    )
    const combinator = useFormValue(form, (v) => {
      const group = selectNodes(v)[groupId] as QueryNode | undefined
      return group?.kind === 'group' ? group.combinator : 'and'
    })
    const negate = useFormValue(form, (v) => {
      const group = selectNodes(v)[groupId] as QueryNode | undefined
      return group?.kind === 'group' && group.negate
    })

    /** All structural edits go through pure functions from model/query-tree.ts. */
    const updateTree = (update: (tree: QueryTree) => QueryTree) =>
      form.setFieldValue(query, update)

    const isRoot = depth === 0
    const canNest = depth < MAX_GROUP_DEPTH

    return (
      <div
        role="group"
        aria-label={isRoot ? 'Conditions' : `Nested group, level ${depth}`}
        className={cn(
          'space-y-2 rounded-lg border border-l-4 p-2.5',
          DEPTH_ACCENTS[depth % DEPTH_ACCENTS.length],
          isRoot ? 'bg-muted/30' : 'bg-card',
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          {handle ? <DragHandle label="Reorder group" {...handle} /> : null}

          <div
            role="radiogroup"
            aria-label="Match"
            className="inline-flex rounded-md border bg-background p-0.5"
          >
            {COMBINATORS.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={combinator === value}
                onClick={() =>
                  updateTree((tree) =>
                    updateGroup(tree, groupId, { combinator: value }),
                  )
                }
                className={cn(
                  'rounded px-2.5 py-0.5 text-xs font-semibold uppercase transition-colors',
                  combinator === value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {value}
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-pressed={negate}
            title="Negate the whole group: not (...)"
            onClick={() =>
              updateTree((tree) =>
                updateGroup(tree, groupId, { negate: !negate }),
              )
            }
            className={cn(
              'rounded-md border px-2 py-0.5 text-xs font-semibold uppercase transition-colors',
              negate
                ? 'border-destructive/40 bg-destructive/10 text-destructive'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Not
          </button>

          <div className="ml-auto flex flex-wrap items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => updateTree((tree) => addCondition(tree, groupId))}
            >
              <PlusIcon /> Condition
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={!canNest}
              title={
                canNest
                  ? undefined
                  : `Groups can be nested ${MAX_GROUP_DEPTH} levels deep`
              }
              onClick={() => updateTree((tree) => addGroup(tree, groupId))}
            >
              <FolderPlusIcon /> Group
            </Button>
            {onRemove ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Remove group"
                onClick={onRemove}
              >
                <Trash2Icon />
              </Button>
            ) : null}
          </div>
        </div>

        <SortableList
          ids={childIds}
          className="space-y-1.5"
          onMove={(from, to) =>
            updateTree((tree) => moveChild(tree, groupId, from, to))
          }
          renderItem={(childId, index, childHandle) => {
            const removeChild = () =>
              updateTree((tree) => removeNode(tree, childId))
            return (
              <>
                {index > 0 ? (
                  <span className="mb-1.5 ml-9 block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {combinator}
                  </span>
                ) : null}
                {childKinds[index] === 'group' ? (
                  <QueryGroup
                    form={form}
                    flagIndex={flagIndex}
                    ruleIndex={ruleIndex}
                    groupId={childId}
                    depth={depth + 1}
                    handle={childHandle}
                    onRemove={removeChild}
                  />
                ) : (
                  <QueryCondition
                    form={form}
                    flagIndex={flagIndex}
                    ruleIndex={ruleIndex}
                    nodeId={childId}
                    handle={childHandle}
                    onRemove={removeChild}
                  />
                )}
              </>
            )
          }}
        />

        <form.AppField name={`${node}.childIds`}>
          {(field) => <field.ErrorMessage />}
        </form.AppField>
      </div>
    )
  },
})
