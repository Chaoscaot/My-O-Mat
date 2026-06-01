"use client"

import { useAuth, useOrganization, useUser } from "@clerk/nextjs"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import {
  ArrowRight,
  FileQuestion,
  Globe2,
  Plus,
  RadioTower,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import { EmptyState } from "./empty-state"
import { SignInPrompt } from "./sign-in-prompt"
import { type DashboardData } from "./types"

export function AppOverviewPage() {
  const { isLoaded, isSignedIn, orgId } = useAuth()
  const { organization } = useOrganization()
  const { user } = useUser()
  const {
    isAuthenticated: isConvexAuthenticated,
    isLoading: isConvexAuthLoading,
  } = useConvexAuth()
  const workspace = useMemo(
    () => ({
      clerkOrganizationId: orgId ?? null,
      name: organization?.name ?? "Personal workspace",
      description: organization
        ? "Clerk-Organisation"
        : user?.fullName
          ? `${user.fullName}s persönlicher Arbeitsbereich`
          : "Dein persönlicher Arbeitsbereich",
    }),
    [organization, orgId, user?.fullName]
  )
  const ensureActiveOrganization = useMutation(
    api.omats.ensureActiveOrganization
  )
  const dashboard = useQuery(
    api.omats.listDashboard,
    isSignedIn && isConvexAuthenticated
      ? { clerkOrganizationId: workspace.clerkOrganizationId }
      : "skip"
  )

  useEffect(() => {
    if (!isSignedIn || !isConvexAuthenticated) return
    void ensureActiveOrganization(workspace)
  }, [ensureActiveOrganization, isConvexAuthenticated, isSignedIn, workspace])

  return (
    <main className="min-h-[calc(100svh-4rem)] bg-[linear-gradient(180deg,var(--background),color-mix(in_oklch,var(--background),var(--foreground)_4%))] p-4 md:p-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Organisations-Dashboard
            </p>
            <h1 className="mt-2 font-heading text-5xl font-semibold">
              {workspace.name}
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
          <DashboardPanel dashboard={dashboard} workspace={workspace} />
        ) : null}
      </section>
    </main>
  )
}

function DashboardPanel({
  dashboard,
  workspace,
}: {
  dashboard: DashboardData
  workspace: {
    clerkOrganizationId: string | null
    name: string
    description: string
  }
}) {
  const createOmat = useMutation(api.omats.createOmat)
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState(
    "Ein eigener Wahl-O-Mat für diese Organisation."
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) return
    setIsSubmitting(true)
    try {
      const omatId = await createOmat({
        clerkOrganizationId: workspace.clerkOrganizationId,
        organizationName: workspace.name,
        organizationDescription: workspace.description,
        title,
        description,
      })
      setTitle("")
      setDescription("Ein eigener Wahl-O-Mat für diese Organisation.")
      setIsOpen(false)
      router.push(`/app/${omatId}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const omats = dashboard?.omats ?? []

  return (
    <>
      <div className="grid gap-4 md:grid-cols-[1fr_18rem]">
        <div className="border bg-card">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b p-5">
            <div>
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Aktive Clerk-Organisation
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                {dashboard?.organization.name ?? workspace.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {workspace.clerkOrganizationId
                  ? "Alle Mitglieder dieser Clerk-Organisation arbeiten in diesem Dashboard."
                  : "Dein persönliches Dashboard bleibt getrennt von geteilten Organisationen."}
              </p>
            </div>
            <Button onClick={() => setIsOpen(true)}>
              <Plus />
              Neuer O-Mat
            </Button>
          </div>

          {!dashboard ? (
            <p className="p-5 text-sm text-muted-foreground">
              Dashboard wird vorbereitet...
            </p>
          ) : null}
          {dashboard && omats.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="Noch keine O-Mats"
                text="Erstelle den ersten O-Mat für diese Organisation."
              />
            </div>
          ) : null}
          {omats.length > 0 ? (
            <div className="grid gap-2 p-5 md:grid-cols-2">
              {omats.map((omat) => (
                <Link
                  key={omat._id}
                  className="group flex min-h-28 items-start justify-between gap-4 border bg-background p-4 text-left transition hover:bg-muted"
                  href={`/app/${omat._id}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {omat.title}
                    </span>
                    <span className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {omat.description || "Kein Beschreibungstext"}
                    </span>
                    <span className="mt-4 inline-flex items-center gap-1.5 border px-2 py-1 text-xs font-semibold text-muted-foreground">
                      {omat.isPublished ? "Veröffentlicht" : "Entwurf"}
                    </span>
                  </span>
                  <ArrowRight className="mt-1 size-4 shrink-0 transition group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="grid content-start gap-3">
          <div className="border bg-card p-4">
            <RadioTower className="size-5 text-primary" />
            <p className="mt-3 text-sm font-semibold">Organisationsebene</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Wechsel oben zwischen Personal workspace und Clerk-Organisationen.
            </p>
          </div>
          <div className="border bg-card p-4">
            <FileQuestion className="size-5 text-primary" />
            <p className="mt-3 text-sm font-semibold">O-Mats</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Jeder O-Mat gehört genau zum aktuell ausgewählten Dashboard.
            </p>
          </div>
        </aside>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <form className="grid gap-5" onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Neuer O-Mat</DialogTitle>
              <DialogDescription>
                Der O-Mat wird in {workspace.name} angelegt.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="new-omat-title">Titel</Label>
                <Input
                  id="new-omat-title"
                  placeholder="z. B. Kommunalwahl 2026 in Musterstadt"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-omat-description">Beschreibung</Label>
                <Textarea
                  id="new-omat-description"
                  placeholder="z. B. Vergleiche die Positionen der Kandidierenden vor Ort."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={isSubmitting || !title.trim()} type="submit">
                {isSubmitting ? "Speichern..." : "Speichern"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
