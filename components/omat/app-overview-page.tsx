"use client"

import { useAuth } from "@clerk/nextjs"
import { useConvexAuth, useQuery } from "convex/react"
import { ArrowRight, Globe2 } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import { EmptyState } from "./empty-state"
import { SignInPrompt } from "./sign-in-prompt"
import { type DashboardData } from "./types"

export function AppOverviewPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const {
    isAuthenticated: isConvexAuthenticated,
    isLoading: isConvexAuthLoading,
  } = useConvexAuth()
  const dashboard = useQuery(
    api.omats.listDashboard,
    isSignedIn && isConvexAuthenticated ? {} : "skip"
  )

  return (
    <main className="min-h-[calc(100svh-4rem)] bg-[linear-gradient(180deg,var(--background),color-mix(in_oklch,var(--background),var(--foreground)_4%))] p-4 md:p-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Arbeitsbereich
            </p>
            <h1 className="mt-2 font-heading text-5xl font-semibold">
              Organisationen und O-Mats
            </h1>
          </div>
          <Button asChild variant="outline">
            <Link href="/">
              <Globe2 />
              Öffentliche Startseite
            </Link>
          </Button>
        </div>

        {!isLoaded ? (
          <EmptyState
            title="Anmeldung wird geladen"
            text="Die Clerk-Sitzung wird geprüft."
          />
        ) : null}
        {isLoaded && !isSignedIn ? <SignInPrompt /> : null}
        {isLoaded && isSignedIn && isConvexAuthLoading ? (
          <EmptyState
            title="Arbeitsbereich wird verbunden"
            text="Deine authentifizierte Convex-Sitzung wird vorbereitet."
          />
        ) : null}
        {isLoaded &&
        isSignedIn &&
        !isConvexAuthLoading &&
        !isConvexAuthenticated ? (
          <EmptyState
            title="Arbeitsbereich-Anmeldung ist nicht bereit"
            text="Clerk ist angemeldet, stellt aber kein JWT-Template namens convex mit der Audience convex aus."
          />
        ) : null}
        {isLoaded && isSignedIn && isConvexAuthenticated ? (
          <DashboardPanel dashboard={dashboard} />
        ) : null}
      </section>
    </main>
  )
}

function DashboardPanel({ dashboard }: { dashboard: DashboardData }) {
  return (
    <div className="space-y-4">
      {!dashboard ? (
        <p className="text-sm text-muted-foreground">
          Organisationen werden geladen...
        </p>
      ) : null}
      {dashboard?.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Erstelle deine erste Organisation, um O-Mats zu verwalten.
        </p>
      ) : null}
      {dashboard?.map(({ organization, omats }) => (
        <div key={organization._id} className="border bg-card p-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">{organization.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {organization.description}
              </p>
            </div>
            <span className="border px-2 py-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {omats.length} O-Mats
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {omats.map((omat) => (
              <Link
                key={omat._id}
                className="flex items-center justify-between border p-3 text-left text-sm transition hover:bg-muted"
                href={`/app/${omat._id}`}
              >
                <span>
                  <span className="block font-semibold">{omat.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {omat.isPublished ? "Veröffentlicht" : "Entwurf"}
                  </span>
                </span>
                <ArrowRight className="size-4" />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
