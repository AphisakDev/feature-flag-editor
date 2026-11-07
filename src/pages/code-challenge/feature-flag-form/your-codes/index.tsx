import { ClientOnly } from '@tanstack/react-router'

import Header from '#/components/features/header'
import { Skeleton } from '#/components/ui/skeleton'

import { FeatureFlagEditor } from './components/feature-flag-editor'

function YourCode() {
  return (
    <section>
      <Header
        title="Feature Flag Editor"
        subTitle="Build GO Feature Flag configurations with nested targeting rules — the JSON preview updates as you type."
      />
      {/* The editor is a purely client-side tool (random ids, Monaco, clipboard),
          so it renders after hydration to avoid SSR mismatches. */}
      <ClientOnly fallback={<EditorSkeleton />}>
        <FeatureFlagEditor />
      </ClientOnly>
    </section>
  )
}

function EditorSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(400px,0.85fr)]">
      <Skeleton className="h-[640px] rounded-xl" />
      <Skeleton className="h-[480px] rounded-xl" />
    </div>
  )
}

export default YourCode
