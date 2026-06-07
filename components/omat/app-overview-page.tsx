"use client"

import { useOrganization } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"
import { ArrowRight, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import { EmptyState } from "./empty-state"
import { type DashboardData } from "./types"

export function AppOverviewPage() {
  const { organization } = useOrganization()

  const dashboard = useQuery(api.workspaces.listDashboard, {})

  return (
    <main className="min-h-[calc(100svh-4rem)] bg-[linear-gradient(180deg,var(--background),color-mix(in_oklch,var(--background),var(--foreground)_4%))] p-4 md:p-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Organisations-Dashboard
            </p>
            <h1 className="mt-2 font-heading text-5xl font-semibold">
              {organization?.name}
            </h1>
          </div>
          <CreateOmatButton />
        </div>
        {dashboard ? (
          <DashboardPanel dashboard={dashboard} />
        ) : (
          <EmptyState
            title="Lade Arbeitsbereich..."
            text="Bitte warten, während dein Arbeitsbereich vorbereitet wird."
          />
        )}
      </section>
    </main>
  )
}

function CreateOmatButton() {
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Neuer O-Mat
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form className="grid gap-5" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Neuer O-Mat</DialogTitle>
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
  )
}

function DashboardPanel({ dashboard }: { dashboard: DashboardData }) {
  const omats = dashboard?.omats ?? []
  const { organization } = useOrganization()

  return (
    <>
      <div className="flex flex-col gap-4">
        {dashboard && omats.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Noch keine O-Mats"
              text="Erstelle den ersten O-Mat für diese Organisation."
            />
          </div>
        ) : null}
        {omats.length > 0 ? (
          <div className="flex flex-col gap-2">
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
                    {omat.visibility === "hidden"
                      ? "Versteckt"
                      : omat.visibility === "public" || omat.isPublished
                        ? "Öffentlich"
                        : "Privat"}
                  </span>
                </span>
                <ArrowRight className="mt-1 size-4 shrink-0 transition group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </>
  )
}
