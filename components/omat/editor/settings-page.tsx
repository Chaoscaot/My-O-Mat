"use client"

import { useAuth, useOrganization } from "@clerk/nextjs"
import { ChangeEvent, FormEvent, useState } from "react"
import {
  BadgeCheck,
  ExternalLink,
  ImageIcon,
  Palette,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import Link from "next/link"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import { cn } from "@/lib/utils"
import { type EditorData } from "../types"
import {
  type ColorScheme,
  type ImprintPersonFormState,
  type LegalInfoFormState,
  type OmatVisibility,
  colorSchemes,
  emptyImprintPerson,
  getImageDimensions,
  isPremiumPlan,
  uploadBackgroundFile,
  visibilityOptions,
} from "./shared"

const fullHdWidth = 1920
const fullHdHeight = 1080

export function SettingsPage({ editor }: { editor: NonNullable<EditorData> }) {
  const { organization: clerkOrganization } = useOrganization()
  const { getToken } = useAuth()
  const updateSettings = useMutation(api.omatEditor.updateOmatSettings)
  const setOmatBackground = useMutation(api.omatEditor.setOmatBackground)
  const [title, setTitle] = useState(editor.omat.title)
  const [description, setDescription] = useState(editor.omat.description)
  const [slug, setSlug] = useState(editor.omat.slug)
  const [visibility, setVisibility] = useState<OmatVisibility>(
    editor.omat.visibility ?? (editor.omat.isPublished ? "public" : "private")
  )
  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    editor.omat.colorScheme ?? "civic"
  )
  const [eyeCandyDisabled, setEyeCandyDisabled] = useState(
    Boolean(editor.omat.eyeCandyDisabled)
  )
  const [watermarksDisabled, setWatermarksDisabled] = useState(
    Boolean(editor.omat.watermarksDisabled)
  )
  const [legalInfo, setLegalInfo] = useState<LegalInfoFormState>({
    imprintPersons: editor.omat.legalInfo?.imprintPersons.length
      ? editor.omat.legalInfo.imprintPersons
      : [],
  })
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle")
  const [saveError, setSaveError] = useState(
    "Einstellungen konnten nicht gespeichert werden"
  )
  const [isUploadingBackground, setIsUploadingBackground] = useState(false)
  const [backgroundUploadError, setBackgroundUploadError] = useState<
    string | null
  >(null)
  const [largeBackgroundUpload, setLargeBackgroundUpload] =
    useState<File | null>(null)
  const selectedVisibility = visibilityOptions.find(
    (option) => option.value === visibility
  )
  const isPremiumOrganization = isPremiumPlan(
    clerkOrganization?.publicMetadata.plan
  )
  const hasImprintPerson = legalInfo.imprintPersons.some((person) =>
    person.name.trim()
  )

  async function submitSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveState("idle")
    try {
      await updateSettings({
        omatId: editor.omat._id,
        title,
        description,
        slug,
        colorScheme,
        eyeCandyDisabled,
        watermarksDisabled: isPremiumOrganization && watermarksDisabled,
        legalInfo,
        visibility,
        isPublished: visibility === "public",
      })
      setSaveState("saved")
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Einstellungen konnten nicht gespeichert werden"
      )
      setSaveState("error")
    }
  }

  function addImprintPerson() {
    setLegalInfo((current) => ({
      ...current,
      imprintPersons: [...current.imprintPersons, { ...emptyImprintPerson }],
    }))
  }

  function updateImprintPerson(
    index: number,
    field: keyof ImprintPersonFormState,
    value: string
  ) {
    setLegalInfo((current) => ({
      ...current,
      imprintPersons: current.imprintPersons.map((person, personIndex) =>
        personIndex === index ? { ...person, [field]: value } : person
      ),
    }))
  }

  function removeImprintPerson(index: number) {
    const imprintPersons = legalInfo.imprintPersons.filter(
      (_, personIndex) => personIndex !== index
    )
    setLegalInfo((current) => ({ ...current, imprintPersons }))
    if (!imprintPersons.some((person) => person.name.trim())) {
      setVisibility("private")
    }
  }

  async function uploadBackground(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setBackgroundUploadError(null)
    setLargeBackgroundUpload(null)
    try {
      const dimensions = await getImageDimensions(file)
      if (dimensions.width > fullHdWidth || dimensions.height > fullHdHeight) {
        setLargeBackgroundUpload(file)
        return
      }
      await startBackgroundUpload(file, "standard")
    } catch (error) {
      setBackgroundUploadError(
        error instanceof Error
          ? error.message
          : "Hintergrundbild konnte nicht gelesen werden"
      )
    } finally {
      event.target.value = ""
    }
  }

  async function startBackgroundUpload(
    file: File,
    mode: "standard" | "premium4k"
  ) {
    setIsUploadingBackground(true)
    setBackgroundUploadError(null)
    try {
      const storageId = await uploadBackgroundFile(getToken, file, mode)
      await setOmatBackground({
        omatId: editor.omat._id,
        storageId,
      })
      setLargeBackgroundUpload(null)
    } catch (error) {
      setBackgroundUploadError(
        error instanceof Error
          ? error.message
          : "Hintergrundbild konnte nicht hochgeladen werden"
      )
    } finally {
      setIsUploadingBackground(false)
    }
  }

  return (
    <>
      <form
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
        onSubmit={submitSettings}
      >
        <div className="space-y-5">
          <div className="border p-5">
            <div className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Grundeinstellungen
            </div>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="settings-title">Titel</Label>
                <Input
                  id="settings-title"
                  placeholder="z. B. Jugend-O-Mat 2026"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="settings-description">Beschreibung</Label>
                <Textarea
                  id="settings-description"
                  placeholder="z. B. Ein öffentlicher Vergleich zu Bildung, Klima und Mobilität."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="settings-slug">Eigener Slug</Label>
                <Input
                  id="settings-slug"
                  placeholder="z. B. jugend-o-mat-2026"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="border p-5">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              <Palette className="size-3.5" />
              Farbschema
            </div>
            <Select
              value={colorScheme}
              onValueChange={(value) => setColorScheme(value as ColorScheme)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Schema wählen" />
              </SelectTrigger>
              <SelectContent>
                {colorSchemes.map((scheme) => (
                  <SelectItem key={scheme.value} value={scheme.value}>
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-flex gap-1">
                        {scheme.swatches.map((swatch) => (
                          <span
                            key={swatch}
                            className="size-3 border"
                            style={{ backgroundColor: swatch }}
                          />
                        ))}
                      </span>
                      {scheme.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border p-5">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              <ImageIcon className="size-3.5" />
              Hintergrund
            </div>
            <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
              <div className="aspect-video overflow-hidden border bg-muted">
                {editor.omat.backgroundUrl ? (
                  <Image
                    src={editor.omat.backgroundUrl}
                    alt=""
                    width={256}
                    height={144}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                    Kein Bild
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center gap-3">
                <label className="inline-flex h-10 w-fit items-center justify-center gap-1.5 border border-border px-4 text-xs font-semibold tracking-widest whitespace-nowrap uppercase transition hover:bg-muted">
                  <Upload className="size-3.5" />
                  {isUploadingBackground
                    ? "Wird hochgeladen"
                    : "Hintergrund hochladen"}
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    onChange={uploadBackground}
                    disabled={isUploadingBackground}
                  />
                </label>
                {editor.omat.backgroundUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setOmatBackground({
                        omatId: editor.omat._id,
                        storageId: null,
                      })
                    }
                  >
                    <X />
                    Hintergrund entfernen
                  </Button>
                ) : null}
                {backgroundUploadError ? (
                  <p className="text-xs font-semibold text-destructive">
                    {backgroundUploadError}
                  </p>
                ) : null}
              </div>
            </div>
            <label className="mt-4 flex items-center justify-between gap-4 border-t pt-4">
              <span className="flex items-start gap-3">
                <Sparkles className="mt-0.5 size-4 text-muted-foreground" />
                <span>
                  <span className="block text-sm font-medium">
                    Eye-Candy im Hintergrund entfernen
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Zeigt im O-Mat nur noch das Hintergrundbild ohne animierte
                    Grid-, Licht- und Konfetti-Effekte.
                  </span>
                </span>
              </span>
              <Switch
                checked={eyeCandyDisabled}
                onCheckedChange={setEyeCandyDisabled}
              />
            </label>
          </div>

          <div className="border p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  O-Mat-Impressum
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Mindestens eine verantwortliche Person ist für die
                  Veröffentlichung erforderlich.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addImprintPerson}
              >
                <Plus />
                Person hinzufügen
              </Button>
            </div>

            <div className="space-y-4">
              {legalInfo.imprintPersons.length === 0 ? (
                <div className="border border-dashed p-5 text-sm text-muted-foreground">
                  Noch keine Person im O-Mat-Impressum hinterlegt.
                </div>
              ) : null}
              {legalInfo.imprintPersons.map((person, index) => (
                <article key={index} className="border p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="font-heading text-lg font-semibold">
                      Person {index + 1}
                    </h3>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="destructive"
                      onClick={() => removeImprintPerson(index)}
                    >
                      <Trash2 />
                      <span className="sr-only">Person entfernen</span>
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor={`imprint-name-${index}`}>Name</Label>
                      <Input
                        id={`imprint-name-${index}`}
                        value={person.name}
                        onChange={(event) =>
                          updateImprintPerson(index, "name", event.target.value)
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`imprint-role-${index}`}>Rolle</Label>
                      <Input
                        id={`imprint-role-${index}`}
                        placeholder="z. B. Verantwortlich nach § 18 Abs. 2 MStV"
                        value={person.role}
                        onChange={(event) =>
                          updateImprintPerson(index, "role", event.target.value)
                        }
                      />
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <Label htmlFor={`imprint-street-${index}`}>Straße</Label>
                      <Input
                        id={`imprint-street-${index}`}
                        value={person.street}
                        onChange={(event) =>
                          updateImprintPerson(
                            index,
                            "street",
                            event.target.value
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`imprint-postal-${index}`}>PLZ</Label>
                      <Input
                        id={`imprint-postal-${index}`}
                        value={person.postalCode}
                        onChange={(event) =>
                          updateImprintPerson(
                            index,
                            "postalCode",
                            event.target.value
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`imprint-city-${index}`}>Ort</Label>
                      <Input
                        id={`imprint-city-${index}`}
                        value={person.city}
                        onChange={(event) =>
                          updateImprintPerson(index, "city", event.target.value)
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`imprint-country-${index}`}>Land</Label>
                      <Input
                        id={`imprint-country-${index}`}
                        value={person.country}
                        onChange={(event) =>
                          updateImprintPerson(
                            index,
                            "country",
                            event.target.value
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`imprint-email-${index}`}>E-Mail</Label>
                      <Input
                        id={`imprint-email-${index}`}
                        type="email"
                        value={person.email}
                        onChange={(event) =>
                          updateImprintPerson(
                            index,
                            "email",
                            event.target.value
                          )
                        }
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="border p-5">
            <div className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Veröffentlichung
            </div>
            <div className="grid gap-2">
              <Label htmlFor="settings-visibility">Sichtbarkeit</Label>
              <Select
                value={visibility}
                onValueChange={(value) =>
                  setVisibility(value as OmatVisibility)
                }
              >
                <SelectTrigger id="settings-visibility" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visibilityOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      disabled={!hasImprintPerson && option.value !== "private"}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedVisibility?.description}
                {!hasImprintPerson && visibility === "private"
                  ? " Versteckt und öffentlich sind erst nach einer Person im O-Mat-Impressum möglich."
                  : null}
              </p>
            </div>
          </div>

          <div className="border p-5">
            <div className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Branding
            </div>
            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-medium">
                  Wasserzeichen deaktivieren
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Nur Premium-Organisationen können My-O-Mat-Hinweise im Runner
                  ausblenden.
                </span>
              </span>
              <Switch
                checked={isPremiumOrganization && watermarksDisabled}
                disabled={!isPremiumOrganization}
                onCheckedChange={setWatermarksDisabled}
              />
            </label>
          </div>

          <div className="border p-5">
            <div className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Rechtstexte
            </div>
            <div className="grid gap-2">
              <Link
                className="inline-flex items-center justify-between gap-3 border px-3 py-2 text-sm font-medium hover:bg-muted"
                href="/impressum"
                target="_blank"
              >
                Webseiten-Impressum
                <ExternalLink className="size-3.5" />
              </Link>
              <Link
                className="inline-flex items-center justify-between gap-3 border px-3 py-2 text-sm font-medium hover:bg-muted"
                href="/datenschutz"
                target="_blank"
              >
                Datenschutzerklärung
                <ExternalLink className="size-3.5" />
              </Link>
            </div>
          </div>

          <div className="border p-5">
            <div className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Vorschau
            </div>
            <div
              className={cn(
                "border p-4",
                colorScheme === "forest" && "bg-emerald-950 text-emerald-50",
                colorScheme === "sunset" && "bg-rose-950 text-orange-50",
                colorScheme === "mono" && "bg-zinc-950 text-zinc-50",
                colorScheme === "civic" && "bg-slate-950 text-amber-50"
              )}
            >
              <p className="text-xs font-semibold tracking-widest uppercase opacity-70">
                {
                  colorSchemes.find((scheme) => scheme.value === colorScheme)
                    ?.label
                }
              </p>
              <h2 className="mt-2 font-heading text-2xl font-semibold">
                {title}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button>
              <BadgeCheck />
              Einstellungen speichern
            </Button>
            {saveState === "saved" ? (
              <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Gespeichert
              </span>
            ) : null}
            {saveState === "error" ? (
              <span className="text-xs font-semibold tracking-widest text-destructive uppercase">
                {saveError}
              </span>
            ) : null}
          </div>
        </aside>
      </form>

      <Dialog
        open={Boolean(largeBackgroundUpload)}
        onOpenChange={(open) => {
          if (!open && !isUploadingBackground) {
            setLargeBackgroundUpload(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>4K-Hintergründe</DialogTitle>
            <DialogDescription>
              Für große Hintergrundbilder verfügbar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={!largeBackgroundUpload || isUploadingBackground}
              onClick={() => {
                if (largeBackgroundUpload) {
                  startBackgroundUpload(largeBackgroundUpload, "standard")
                }
              }}
            >
              Full HD verwenden
            </Button>
            <Button
              type="button"
              disabled={
                !largeBackgroundUpload ||
                !isPremiumOrganization ||
                isUploadingBackground
              }
              onClick={() => {
                if (largeBackgroundUpload) {
                  startBackgroundUpload(largeBackgroundUpload, "premium4k")
                }
              }}
            >
              <BadgeCheck />
              4K-Upload
            </Button>
          </DialogFooter>
          {!isPremiumOrganization ? (
            <p className="text-xs font-semibold text-muted-foreground">
              Nur für Premium-Organisationen.
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
