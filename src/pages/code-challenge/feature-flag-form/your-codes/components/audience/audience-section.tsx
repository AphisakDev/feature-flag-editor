import { PlusIcon, ShieldIcon, Trash2Icon, UsersIcon } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'

import { AUDIENCE_CONFIG, AUDIENCE_KINDS } from '../../model/constants'
import type { AudienceKind } from '../../model/constants'
import { createAudienceEntry } from '../../model/factories'
import {
  arrayEqual,
  editorFormOptions,
  useFormValue,
  withForm,
} from '../../form/form-hook'

const ICONS: Record<AudienceKind, typeof ShieldIcon> = {
  roles: ShieldIcon,
  groups: UsersIcon,
}

/**
 * Shared catalog of roles and groups. Conditions on `role` / `group` pick
 * from these names and are validated against them.
 */
export const AudienceSection = withForm({
  ...editorFormOptions,
  render: function AudienceSectionView({ form }) {
    return (
      <Card aria-labelledby="audience-title">
        <CardHeader className="border-b">
          <CardTitle id="audience-title">Roles &amp; Groups</CardTitle>
          <p className="text-sm text-muted-foreground">
            Shared by all flags. Conditions on <code>role</code> or{' '}
            <code>group</code> can only use these names.
          </p>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          {AUDIENCE_KINDS.map((kind) => (
            <AudienceList key={kind} form={form} kind={kind} />
          ))}
        </CardContent>
      </Card>
    )
  },
})

const AudienceList = withForm({
  ...editorFormOptions,
  props: { kind: 'roles' as AudienceKind },
  render: function AudienceListView({ form, kind }) {
    const { title, singular, placeholder, attribute } = AUDIENCE_CONFIG[kind]
    const Icon = ICONS[kind]
    const ids = useFormValue(
      form,
      (v) => v[kind].map((entry) => entry.id),
      arrayEqual,
    )

    return (
      <section aria-label={title} className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold">
            <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
            {title}
            <span className="font-mono text-xs font-normal text-muted-foreground">
              ({attribute})
            </span>
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => form.pushFieldValue(kind, createAudienceEntry())}
          >
            <PlusIcon /> Add {singular}
          </Button>
        </div>

        {ids.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
            No {title.toLowerCase()} yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {ids.map((id, index) => (
              <li key={id} className="flex items-start gap-2">
                <form.AppField name={`${kind}[${index}].name`}>
                  {(field) => (
                    <field.TextField
                      label={`${title} name`}
                      hideLabel
                      placeholder={placeholder}
                      autoComplete="off"
                      spellCheck={false}
                      className="w-36 shrink-0"
                      inputClassName="font-mono"
                    />
                  )}
                </form.AppField>
                <form.AppField name={`${kind}[${index}].description`}>
                  {(field) => (
                    <field.TextField
                      label={`${title} description`}
                      hideLabel
                      placeholder="Description (optional)"
                      autoComplete="off"
                      className="flex-1"
                    />
                  )}
                </form.AppField>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${singular} ${index + 1}`}
                  onClick={() => form.removeFieldValue(kind, index)}
                >
                  <Trash2Icon />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    )
  },
})
