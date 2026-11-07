import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVerticalIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'

import { cn } from '#/lib/utils'

/** Props spread onto the drag handle button of an item. */
export type DragHandleProps = ComponentProps<'button'>

type SortableListProps = {
  ids: ReadonlyArray<string>
  onMove: (fromIndex: number, toIndex: number) => void
  renderItem: (id: string, index: number, handle: DragHandleProps) => ReactNode
  className?: string
}

/**
 * Generic vertical drag & drop list (dnd-kit). It knows nothing about the
 * form: it reports `onMove(from, to)` and the caller decides how to update
 * state (`form.moveFieldValue` for arrays, `moveChild` for query groups).
 * Supports mouse, touch and keyboard (focus the handle, Space, arrows, Space).
 */
export function SortableList({
  ids,
  onMove,
  renderItem,
  className,
}: SortableListProps) {
  const sensors = useSensors(
    // A small distance lets clicks on inputs inside an item work normally.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from !== -1 && to !== -1) onMove(from, to)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={ids as Array<string>}
        strategy={verticalListSortingStrategy}
      >
        <div className={className}>
          {ids.map((id, index) => (
            <SortableItem key={id} id={id}>
              {(handle) => renderItem(id, index, handle)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableItem({
  id,
  children,
}: {
  id: string
  children: (handle: DragHandleProps) => ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={cn('relative', isDragging && 'z-10 opacity-80 shadow-lg')}
    >
      {children({ ref: setActivatorNodeRef, ...attributes, ...listeners })}
    </div>
  )
}

export function DragHandle({
  label,
  className,
  ...props
}: DragHandleProps & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title="Drag to reorder"
      className={cn(
        'flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing',
        className,
      )}
      {...props}
    >
      <GripVerticalIcon className="size-4" />
    </button>
  )
}
