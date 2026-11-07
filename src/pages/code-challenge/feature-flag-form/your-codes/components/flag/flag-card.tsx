import { FlagIcon, Trash2Icon } from 'lucide-react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Separator } from '#/components/ui/separator'

import { editorFormOptions, useFormValue, withForm } from '../../form/form-hook'
import { ServeEditor } from '../serve/serve-editor'
import { Section } from '../shared/section'
import { TargetingSection } from '../targeting/targeting-section'
import { FlagSettingsSection } from './flag-settings-section'
import { MetadataSection } from './metadata-section'
import { VariationsSection } from './variations-section'

/** Everything about one flag. Sections are independent `withForm` components. */
export const FlagCard = withForm({
  ...editorFormOptions,
  props: {
    flagIndex: 0,
    onRemove: undefined as (() => void) | undefined,
  },
  render: function FlagCardView({ form, flagIndex, onRemove }) {
    const name = useFormValue(form, (v) => v.flags[flagIndex]?.key.trim() ?? '')
    const enabled = useFormValue(
      form,
      (v) => v.flags[flagIndex]?.enabled ?? true,
    )

    return (
      <Card aria-label={`Flag ${name || flagIndex + 1}`}>
        <CardHeader className="flex flex-row items-center gap-2 border-b">
          <FlagIcon
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <CardTitle className="min-w-0 truncate font-mono">
            {name || 'Untitled flag'}
          </CardTitle>
          <Badge variant={enabled ? 'secondary' : 'destructive'}>
            {enabled ? 'Enabled' : 'Disabled'}
          </Badge>
          {onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto text-muted-foreground"
              onClick={onRemove}
            >
              <Trash2Icon /> Remove flag
            </Button>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-6">
          <FlagSettingsSection form={form} flagIndex={flagIndex} />
          <Separator />
          <VariationsSection form={form} flagIndex={flagIndex} />
          <Separator />
          <TargetingSection form={form} flagIndex={flagIndex} />
          <Separator />
          <Section
            title="Default rule"
            description="Served when the flag is enabled and no targeting rule matches."
          >
            <div className="rounded-xl border bg-muted/20 p-3">
              <ServeEditor
                form={form}
                flagIndex={flagIndex}
                ruleIndex={undefined}
              />
            </div>
          </Section>
          <Separator />
          <MetadataSection form={form} flagIndex={flagIndex} />
        </CardContent>
      </Card>
    )
  },
})
