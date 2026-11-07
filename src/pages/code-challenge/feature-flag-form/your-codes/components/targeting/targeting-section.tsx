import { PlusIcon } from 'lucide-react'

import { Button } from '#/components/ui/button'

import { createTargetingRule } from '../../model/factories'
import {
  arrayEqual,
  editorFormOptions,
  useFormValue,
  withForm,
} from '../../form/form-hook'
import { flagPath } from '../../form/paths'
import { EmptyState, Section } from '../shared/section'
import { SortableList } from '../shared/sortable-list'
import { TargetingRuleCard } from './targeting-rule-card'

/**
 * Ordered list of targeting rules. GO Feature Flag evaluates them top to
 * bottom and serves the first match, so order matters — hence drag & drop.
 */
export const TargetingSection = withForm({
  ...editorFormOptions,
  props: { flagIndex: 0 },
  render: function TargetingSectionView({ form, flagIndex }) {
    const targeting = `${flagPath(flagIndex)}.targeting` as const
    const ids = useFormValue(
      form,
      (v) => (v.flags[flagIndex]?.targeting ?? []).map((rule) => rule.id),
      arrayEqual,
    )

    const addRule = () => {
      const variations = form.getFieldValue(`${flagPath(flagIndex)}.variations`)
      form.pushFieldValue(
        targeting,
        createTargetingRule(variations, ids.length),
      )
    }

    return (
      <Section
        title="Targeting rules"
        description="Serve specific variations to users matching a query. The first matching rule wins — drag to change priority."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={addRule}>
            <PlusIcon /> Add rule
          </Button>
        }
      >
        {ids.length === 0 ? (
          <EmptyState>
            No targeting rules — every user gets the default rule.
          </EmptyState>
        ) : (
          <SortableList
            ids={ids}
            className="space-y-3"
            onMove={(from, to) => form.moveFieldValues(targeting, from, to)}
            renderItem={(_id, index, handle) => (
              <TargetingRuleCard
                form={form}
                flagIndex={flagIndex}
                ruleIndex={index}
                handle={handle}
                onRemove={() => form.removeFieldValue(targeting, index)}
              />
            )}
          />
        )}
      </Section>
    )
  },
})
