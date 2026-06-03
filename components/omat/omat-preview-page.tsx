"use client"

import { useAuth } from "@clerk/nextjs"
import { useConvexAuth, useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import { EmptyState } from "./empty-state"
import { RunnerPanel } from "./runner-panel"
import { SignInPrompt } from "./sign-in-prompt"

export function HiddenOmatPreviewPage({ omatRef }: { omatRef: string }) {
  const data = useQuery(api.omatPublic.getHiddenPreview, { ref: omatRef })

  return <PreviewShell data={data} />
}

export function OrganizationOmatPreviewPage({
  orgSlug,
  omatRef,
}: {
  orgSlug: string
  omatRef: string
}) {
  const { isLoaded, isSignedIn } = useAuth()
  const {
    isAuthenticated: isConvexAuthenticated,
    isLoading: isConvexAuthLoading,
  } = useConvexAuth()
  const data = useQuery(
    api.omatPublic.getOrganizationPreview,
    isSignedIn && isConvexAuthenticated ? { orgSlug, omatRef } : "skip"
  )

  if (!isLoaded || isConvexAuthLoading) {
    return (
      <PreviewShell
        data={undefined}
        loadingTitle="Private Vorschau wird geladen"
      />
    )
  }

  if (!isSignedIn) {
    return <PreviewAuthShell />
  }

  if (!isConvexAuthenticated) {
    return (
      <PreviewShell
        data={null}
        emptyTitle="Arbeitsbereich-Anmeldung ist nicht bereit"
        emptyText="Clerk ist angemeldet, stellt aber noch kein Convex-JWT bereit."
      />
    )
  }

  return <PreviewShell data={data} />
}

function PreviewAuthShell() {
  return (
    <main className="min-h-svh bg-[linear-gradient(180deg,var(--background),color-mix(in_oklch,var(--background),var(--foreground)_4%))] p-4 md:p-8">
      <section className="mx-auto max-w-3xl">
        <SignInPrompt />
      </section>
    </main>
  )
}

function PreviewShell({
  data,
  loadingTitle = "Vorschau wird geladen",
  emptyTitle = "Kein O-Mat gefunden",
  emptyText = "Der angefragte O-Mat ist für diesen Link nicht verfügbar.",
}: {
  data: Parameters<typeof RunnerPanel>[0]["data"]
  loadingTitle?: string
  emptyTitle?: string
  emptyText?: string
}) {
  if (data === undefined) {
    return (
      <main className="min-h-svh bg-[linear-gradient(180deg,var(--background),color-mix(in_oklch,var(--background),var(--foreground)_4%))] p-4 md:p-8">
        <EmptyState
          title={loadingTitle}
          text="Der Antwortablauf wird vorbereitet."
        />
      </main>
    )
  }

  if (!data) {
    return (
      <main className="min-h-svh bg-[linear-gradient(180deg,var(--background),color-mix(in_oklch,var(--background),var(--foreground)_4%))] p-4 md:p-8">
        <EmptyState title={emptyTitle} text={emptyText} />
      </main>
    )
  }

  return (
    <main className="min-h-svh bg-[linear-gradient(180deg,var(--background),color-mix(in_oklch,var(--background),var(--foreground)_4%))]">
      <div className="min-h-svh">
        <RunnerPanel data={data} />
      </div>
    </main>
  )
}
