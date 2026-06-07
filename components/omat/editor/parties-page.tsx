"use client"

import { FormEvent, useState } from "react"
import { ImageIcon, Pencil, Plus, Trash2, Upload } from "lucide-react"
import Image from "next/image"
import { useMutation } from "convex/react"

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
import { type Doc, type Id } from "@/convex/_generated/dataModel"
import { type EditorData } from "../types"
import {
  type PartyFormState,
  optimizePartyLogoFile,
  uploadFile,
} from "./shared"

export function PartiesPage({ editor }: { editor: NonNullable<EditorData> }) {
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl)
  const addParty = useMutation(api.parties.addParty)
  const updateParty = useMutation(api.parties.updateParty)
  const deleteParty = useMutation(api.parties.deleteParty)
  const [partyDialogOpen, setPartyDialogOpen] = useState(false)
  const [partyLogoFile, setPartyLogoFile] = useState<File | null>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [partyForm, setPartyForm] = useState<PartyFormState>({
    name: "",
    shortName: "",
    description: "",
    color: "#0f766e",
  })
  const [editingPartyId, setEditingPartyId] = useState<Id<"parties"> | null>(
    null
  )

  const editingParty = editor.parties.find(
    (party) => party._id === editingPartyId
  )

  async function submitParty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!partyForm.name.trim()) return

    setIsUploadingLogo(true)
    try {
      const logoStorageId = partyLogoFile
        ? await uploadFile(
            generateUploadUrl,
            await optimizePartyLogoFile(partyLogoFile)
          )
        : partyForm.logoStorageId

      if (editingPartyId) {
        await updateParty({
          partyId: editingPartyId,
          name: partyForm.name,
          shortName:
            partyForm.shortName || partyForm.name.slice(0, 3).toUpperCase(),
          description: partyForm.description,
          color: partyForm.color,
          logoStorageId,
        })
      } else {
        await addParty({
          omatId: editor.omat._id,
          name: partyForm.name,
          shortName:
            partyForm.shortName || partyForm.name.slice(0, 3).toUpperCase(),
          description: partyForm.description || "Neues Parteiprofil.",
          color: partyForm.color,
          logoStorageId,
        })
      }
      resetPartyForm()
    } finally {
      setIsUploadingLogo(false)
    }
  }

  function startEditing(party: Doc<"parties"> & { logoUrl: string | null }) {
    setEditingPartyId(party._id)
    setPartyForm({
      name: party.name,
      shortName: party.shortName,
      description: party.description,
      color: party.color,
      logoStorageId: party.logoStorageId,
    })
    setPartyLogoFile(null)
    setPartyDialogOpen(true)
  }

  function startCreatingParty() {
    setEditingPartyId(null)
    setPartyForm({
      name: "",
      shortName: "",
      description: "",
      color: "#0f766e",
    })
    setPartyLogoFile(null)
    setPartyDialogOpen(true)
  }

  function resetPartyForm() {
    setEditingPartyId(null)
    setPartyForm({
      name: "",
      shortName: "",
      description: "",
      color: "#0f766e",
    })
    setPartyLogoFile(null)
    setPartyDialogOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-semibold">Parteien</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Verwalte Parteiprofile und Logos für die öffentlichen Ergebnisse.
          </p>
        </div>
        <Button type="button" onClick={startCreatingParty}>
          <Plus />
          Partei erstellen
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {editor.parties.map((party) => (
          <article key={party._id} className="border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                {party.logoUrl ? (
                  <Image
                    src={party.logoUrl}
                    alt=""
                    width={48}
                    height={48}
                    unoptimized
                    className="h-12 max-w-20 shrink-0 border object-contain"
                  />
                ) : (
                  <span className="flex size-12 shrink-0 items-center justify-center border bg-muted">
                    <ImageIcon className="size-4 text-muted-foreground" />
                  </span>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-3 border"
                      style={{ backgroundColor: party.color }}
                    />
                    <h2 className="truncate font-heading text-xl font-semibold">
                      {party.name}
                    </h2>
                  </div>
                  <p className="mt-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                    {party.shortName}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  onClick={() => startEditing(party)}
                >
                  <Pencil />
                  <span className="sr-only">Partei bearbeiten</span>
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="destructive"
                  onClick={() => deleteParty({ partyId: party._id })}
                >
                  <Trash2 />
                  <span className="sr-only">Partei löschen</span>
                </Button>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {party.description}
            </p>
          </article>
        ))}
      </div>

      <Dialog open={partyDialogOpen} onOpenChange={setPartyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingParty ? "Partei bearbeiten" : "Partei erstellen"}
            </DialogTitle>
            <DialogDescription>
              Logos erscheinen in Editor-Karten und öffentlichen Ergebniszeilen.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitParty}>
            <div className="grid gap-2">
              <Label htmlFor="party-name">Parteiname</Label>
              <Input
                id="party-name"
                placeholder="z. B. Liste Zukunft Musterstadt"
                value={partyForm.name}
                onChange={(event) =>
                  setPartyForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="party-short-name">Kurzbezeichnung</Label>
              <Input
                id="party-short-name"
                placeholder="z. B. LZM"
                value={partyForm.shortName}
                onChange={(event) =>
                  setPartyForm((current) => ({
                    ...current,
                    shortName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="party-description">Beschreibung</Label>
              <Textarea
                id="party-description"
                placeholder="z. B. Eine lokale Wählergruppe mit Fokus auf Klima und Verkehr."
                value={partyForm.description}
                onChange={(event) =>
                  setPartyForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="party-color">Parteifarbe</Label>
              <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
                <input
                  id="party-color-picker"
                  className="size-10 border bg-transparent"
                  type="color"
                  value={partyForm.color}
                  onChange={(event) =>
                    setPartyForm((current) => ({
                      ...current,
                      color: event.target.value,
                    }))
                  }
                  aria-label="Parteifarbe auswählen"
                />
                <Input
                  id="party-color"
                  placeholder="z. B. #0f766e"
                  value={partyForm.color}
                  onChange={(event) =>
                    setPartyForm((current) => ({
                      ...current,
                      color: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <label className="flex min-h-24 items-center justify-center border border-dashed p-4 text-center text-sm text-muted-foreground">
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setPartyLogoFile(event.target.files?.[0] ?? null)
                }
              />
              <span className="flex flex-col items-center gap-2">
                <Upload className="size-4" />
                {partyLogoFile
                  ? partyLogoFile.name
                  : editingParty?.logoUrl
                    ? "Parteilogo ersetzen"
                    : "Parteilogo hochladen"}
              </span>
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetPartyForm}>
                Abbrechen
              </Button>
              <Button disabled={isUploadingLogo}>
                <Plus />
                {isUploadingLogo
                  ? "Wird hochgeladen"
                  : editingParty
                    ? "Partei speichern"
                    : "Partei erstellen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
