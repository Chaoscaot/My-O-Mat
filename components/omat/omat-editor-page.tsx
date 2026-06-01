"use client"

import { useAuth } from "@clerk/nextjs"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import {
  BadgeCheck,
  CircleSlash,
  Copy,
  Eye,
  FileQuestion,
  GripVertical,
  ImageIcon,
  Palette,
  Pencil,
  Plus,
  Settings,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { ChangeEvent, FormEvent, useMemo, useState } from "react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import { type Doc, type Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { EmptyState } from "./empty-state"
import { SignInPrompt } from "./sign-in-prompt"
import { type EditorData, type Stance } from "./types"

type EditorTab = "questions" | "parties" | "answers" | "settings"
type ColorScheme = "civic" | "forest" | "sunset" | "mono"
type QuestionFormState = {
  title: string
  text: string
  context: string
}
type PartyFormState = {
  name: string
  shortName: string
  description: string
  color: string
  logoStorageId?: Id<"_storage">
}

const stanceOptions: { value: Stance; label: string }[] = [
  { value: "yes", label: "Ja" },
  { value: "neutral", label: "Neutral" },
  { value: "no", label: "Nein" },
]

const colorSchemes: {
  value: ColorScheme
  label: string
  swatches: string[]
}[] = [
  { value: "civic", label: "Bürgerlich", swatches: ["#334155", "#f59e0b"] },
  { value: "forest", label: "Wald", swatches: ["#166534", "#84cc16"] },
  { value: "sunset", label: "Sonnenuntergang", swatches: ["#be123c", "#f97316"] },
  { value: "mono", label: "Mono", swatches: ["#18181b", "#a1a1aa"] },
]

const editorTabs: {
  value: EditorTab
  label: string
  icon: typeof FileQuestion
}[] = [
  { value: "questions", label: "Thesen", icon: FileQuestion },
  { value: "parties", label: "Parteien", icon: CircleSlash },
  { value: "answers", label: "Antworten", icon: Pencil },
  { value: "settings", label: "Einstellungen", icon: Settings },
]

async function uploadFile(
  generateUploadUrl: (args: Record<string, never>) => Promise<string>,
  file: File
) {
  const uploadUrl = await generateUploadUrl({})
  const result = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  })
  if (!result.ok) {
    throw new Error("Upload fehlgeschlagen")
  }
  const { storageId } = (await result.json()) as { storageId: Id<"_storage"> }
  return storageId
}

export function OmatEditorPage({ omatRef }: { omatRef: string }) {
  const { isLoaded, isSignedIn } = useAuth()
  const {
    isAuthenticated: isConvexAuthenticated,
    isLoading: isConvexAuthLoading,
  } = useConvexAuth()
  const editor = useQuery(
    api.omats.getEditorByRef,
    isSignedIn && isConvexAuthenticated ? { ref: omatRef } : "skip"
  )

  return (
    <main className="min-h-[calc(100svh-4rem)] bg-[linear-gradient(180deg,var(--background),color-mix(in_oklch,var(--background),var(--foreground)_4%))] p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
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
          <EditorPanel editor={editor} />
        ) : null}
      </div>
    </main>
  )
}

function EditorPanel({ editor }: { editor: EditorData }) {
  const [activeTab, setActiveTab] = useState<EditorTab>("questions")
  const [copied, setCopied] = useState(false)

  if (editor === undefined) {
    return (
      <EmptyState
        title="Editor wird geladen"
        text="Thesen, Parteien und Positionen werden geladen."
      />
    )
  }

  if (!editor) {
    return (
      <EmptyState
        title="O-Mat nicht gefunden"
        text="Prüfe den Editor-Link oder öffne einen O-Mat aus dem Arbeitsbereich."
      />
    )
  }

  const publicHref = `/mat/${editor.omat.slug}`
  const copyPublicLink = async () => {
    await navigator.clipboard.writeText(
      `${window.location.origin}${publicHref}`
    )
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <section className="space-y-6">
      <div className="border bg-card">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {editor.organization.name}
            </p>
            <h1 className="mt-2 truncate font-heading text-4xl font-semibold">
              {editor.omat.title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {editor.omat.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={copyPublicLink}
              disabled={!editor.omat.isPublished}
            >
              <Copy />
              {copied ? "Kopiert" : "Öffentlichen Link kopieren"}
            </Button>
            {editor.omat.isPublished ? (
              <Button asChild>
                <Link href={publicHref}>
                  <Eye />
                  Vorschau
                </Link>
              </Button>
            ) : (
              <Button type="button" variant="outline" disabled>
                <BadgeCheck />
                Vorschau
              </Button>
            )}
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as EditorTab)}
        >
          <div className="overflow-x-auto border-b p-3">
            <TabsList className="w-full justify-start" variant="line">
              {editorTabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    <Icon />
                    {tab.label}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          <TabsContent value="questions" className="p-5">
            <QuestionsPage editor={editor} />
          </TabsContent>
          <TabsContent value="parties" className="p-5">
            <PartiesPage editor={editor} />
          </TabsContent>
          <TabsContent value="answers" className="p-0">
            <AnswersPage editor={editor} />
          </TabsContent>
          <TabsContent value="settings" className="p-5">
            <SettingsPage editor={editor} />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}

function QuestionsPage({ editor }: { editor: NonNullable<EditorData> }) {
  const addQuestion = useMutation(api.omats.addQuestion)
  const updateQuestion = useMutation(api.omats.updateQuestion)
  const deleteQuestion = useMutation(api.omats.deleteQuestion)
  const reorderQuestions = useMutation(api.omats.reorderQuestions)
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false)
  const [questionForm, setQuestionForm] = useState<QuestionFormState>({
    title: "",
    text: "",
    context: "",
  })
  const [editingQuestionId, setEditingQuestionId] =
    useState<Id<"questions"> | null>(null)
  const [draggedQuestionId, setDraggedQuestionId] =
    useState<Id<"questions"> | null>(null)

  const editingQuestion = editor.questions.find(
    (question) => question._id === editingQuestionId
  )

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!questionForm.title.trim() || !questionForm.text.trim()) return

    if (editingQuestionId) {
      await updateQuestion({
        questionId: editingQuestionId,
        title: questionForm.title,
        text: questionForm.text,
        context: questionForm.context,
      })
      setEditingQuestionId(null)
    } else {
      await addQuestion({
        omatId: editor.omat._id,
        title: questionForm.title,
        text: questionForm.text,
        context: questionForm.context,
      })
    }
    resetQuestionForm()
  }

  function startEditing(question: Doc<"questions">) {
    setEditingQuestionId(question._id)
    setQuestionForm({
      title: question.title || question.text,
      text: question.text,
      context: question.context,
    })
    setQuestionDialogOpen(true)
  }

  function startCreatingQuestion() {
    setEditingQuestionId(null)
    setQuestionForm({ title: "", text: "", context: "" })
    setQuestionDialogOpen(true)
  }

  function resetQuestionForm() {
    setEditingQuestionId(null)
    setQuestionForm({ title: "", text: "", context: "" })
    setQuestionDialogOpen(false)
  }

  async function moveQuestion(targetQuestionId: Id<"questions">) {
    if (!draggedQuestionId || draggedQuestionId === targetQuestionId) return

    const fromIndex = editor.questions.findIndex(
      (question) => question._id === draggedQuestionId
    )
    const toIndex = editor.questions.findIndex(
      (question) => question._id === targetQuestionId
    )
    if (fromIndex < 0 || toIndex < 0) return

    const nextQuestions = [...editor.questions]
    const [movedQuestion] = nextQuestions.splice(fromIndex, 1)
    nextQuestions.splice(toIndex, 0, movedQuestion)
    await reorderQuestions({
      omatId: editor.omat._id,
      questionIds: nextQuestions.map((question) => question._id),
    })
    setDraggedQuestionId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-semibold">Thesen</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ziehe Thesen, um die öffentliche Antwortreihenfolge zu ändern.
          </p>
        </div>
        <Button type="button" onClick={startCreatingQuestion}>
          <Plus />
          These erstellen
        </Button>
      </div>

      <div className="space-y-3">
        {editor.questions.map((question, index) => (
          <article
            key={question._id}
            draggable
            onDragStart={() => setDraggedQuestionId(question._id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => moveQuestion(question._id)}
            className={cn(
              "grid gap-3 border p-4 transition hover:bg-muted/50 sm:grid-cols-[auto_1fr_auto]",
              draggedQuestionId === question._id && "opacity-50"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center border font-mono text-xs">
                {index + 1}
              </span>
              <GripVertical className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="leading-6 font-medium">
                {question.title || question.text}
              </h2>
              <p className="mt-1 text-sm leading-6">{question.text}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {question.context || "Kein Kontext hinzugefügt."}
              </p>
            </div>
            <div className="flex gap-2 sm:justify-end">
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                onClick={() => startEditing(question)}
              >
                <Pencil />
                <span className="sr-only">These bearbeiten</span>
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="destructive"
                onClick={() => deleteQuestion({ questionId: question._id })}
              >
                <Trash2 />
                <span className="sr-only">These löschen</span>
              </Button>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? "These bearbeiten" : "These erstellen"}
            </DialogTitle>
            <DialogDescription>
              Verwende einen kurzen Titel für die Übersicht und die vollständige
              These für den öffentlichen Durchlauf.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitQuestion}>
            <Input
              placeholder="Kurzer Titel"
              value={questionForm.title}
              onChange={(event) =>
                setQuestionForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
            <Textarea
              placeholder="Vollständige These"
              value={questionForm.text}
              onChange={(event) =>
                setQuestionForm((current) => ({
                  ...current,
                  text: event.target.value,
                }))
              }
            />
            <Input
              placeholder="Optionaler Kontext"
              value={questionForm.context}
              onChange={(event) =>
                setQuestionForm((current) => ({
                  ...current,
                  context: event.target.value,
                }))
              }
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={resetQuestionForm}
              >
                Abbrechen
              </Button>
              <Button>
                <Plus />
                {editingQuestion ? "These speichern" : "These erstellen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PartiesPage({ editor }: { editor: NonNullable<EditorData> }) {
  const generateUploadUrl = useMutation(api.omats.generateUploadUrl)
  const addParty = useMutation(api.omats.addParty)
  const updateParty = useMutation(api.omats.updateParty)
  const deleteParty = useMutation(api.omats.deleteParty)
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
        ? await uploadFile(generateUploadUrl, partyLogoFile)
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
                    className="size-12 shrink-0 border object-cover"
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
            <Input
              placeholder="Parteiname"
              value={partyForm.name}
              onChange={(event) =>
                setPartyForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
            <Input
              placeholder="Kurzbezeichnung"
              value={partyForm.shortName}
              onChange={(event) =>
                setPartyForm((current) => ({
                  ...current,
                  shortName: event.target.value,
                }))
              }
            />
            <Textarea
              placeholder="Beschreibung"
              value={partyForm.description}
              onChange={(event) =>
                setPartyForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
            <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
              <input
                className="size-10 border bg-transparent"
                type="color"
                value={partyForm.color}
                onChange={(event) =>
                  setPartyForm((current) => ({
                    ...current,
                    color: event.target.value,
                  }))
                }
                aria-label="Parteifarbe"
              />
              <Input
                value={partyForm.color}
                onChange={(event) =>
                  setPartyForm((current) => ({
                    ...current,
                    color: event.target.value,
                  }))
                }
              />
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

function AnswersPage({ editor }: { editor: NonNullable<EditorData> }) {
  const setPosition = useMutation(api.omats.setPosition)
  const [explanationDrafts, setExplanationDrafts] = useState<
    Record<string, string>
  >({})
  const positionByKey = useMemo(
    () =>
      new Map(
        editor.positions.map((position) => [
          `${position.partyId}:${position.questionId}`,
          position,
        ])
      ),
    [editor.positions]
  )
  const getExplanationDraft = (
    key: string,
    position: Doc<"partyPositions"> | undefined
  ) => explanationDrafts[key] ?? position?.explanation ?? ""

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/60">
            <th className="w-[34%] p-3 text-left font-semibold">These</th>
            {editor.parties.map((party) => (
              <th key={party._id} className="p-3 text-left font-semibold">
                <span className="inline-flex items-center gap-2">
                  <span
                    className="size-2.5 border"
                    style={{ backgroundColor: party.color }}
                  />
                  {party.shortName}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {editor.questions.map((question) => (
            <tr key={question._id} className="border-b align-top last:border-0">
              <td className="p-3">
                <div className="font-medium">
                  {question.title || question.text}
                </div>
                <div className="mt-1 text-sm">{question.text}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {question.context}
                </div>
              </td>
              {editor.parties.map((party) => {
                const positionKey = `${party._id}:${question._id}`
                const position = positionByKey.get(
                  positionKey
                )
                const explanation = getExplanationDraft(positionKey, position)
                return (
                  <td key={party._id} className="p-3">
                    <div className="grid grid-cols-3 border">
                      {stanceOptions.map((option) => (
                        <button
                          key={option.value}
                          className={cn(
                            "h-8 border-r px-1 text-[0.65rem] font-semibold uppercase last:border-r-0 hover:bg-muted",
                            position?.stance === option.value &&
                              "bg-foreground text-background hover:bg-foreground hover:text-background"
                          )}
                          onClick={() =>
                            setPosition({
                              omatId: editor.omat._id,
                              partyId: party._id,
                              questionId: question._id,
                              stance: option.value,
                              explanation,
                            })
                          }
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <Textarea
                      className="mt-2 min-h-24 resize-y text-xs leading-5"
                      placeholder="Begründung"
                      value={explanation}
                      onChange={(event) =>
                        setExplanationDrafts((current) => ({
                          ...current,
                          [positionKey]: event.target.value,
                        }))
                      }
                      onBlur={() =>
                        setPosition({
                          omatId: editor.omat._id,
                          partyId: party._id,
                          questionId: question._id,
                          stance: position?.stance ?? "neutral",
                          explanation,
                        })
                      }
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SettingsPage({ editor }: { editor: NonNullable<EditorData> }) {
  const generateUploadUrl = useMutation(api.omats.generateUploadUrl)
  const updateSettings = useMutation(api.omats.updateOmatSettings)
  const setOmatBackground = useMutation(api.omats.setOmatBackground)
  const [title, setTitle] = useState(editor.omat.title)
  const [description, setDescription] = useState(editor.omat.description)
  const [slug, setSlug] = useState(editor.omat.slug)
  const [isPublished, setIsPublished] = useState(editor.omat.isPublished)
  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    editor.omat.colorScheme ?? "civic"
  )
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle")
  const [isUploadingBackground, setIsUploadingBackground] = useState(false)

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
        isPublished,
      })
      setSaveState("saved")
    } catch {
      setSaveState("error")
    }
  }

  async function uploadBackground(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingBackground(true)
    try {
      const storageId = await uploadFile(generateUploadUrl, file)
      await setOmatBackground({
        omatId: editor.omat._id,
        storageId,
      })
    } finally {
      setIsUploadingBackground(false)
      event.target.value = ""
    }
  }

  return (
    <form
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
      onSubmit={submitSettings}
    >
      <div className="space-y-5">
        <div className="border p-5">
          <div className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Grundeinstellungen
          </div>
          <Input
            placeholder="Titel"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Textarea
            placeholder="Beschreibung"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <Input
            placeholder="Eigener Slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
          />
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
                  unoptimized
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
                {isUploadingBackground ? "Wird hochgeladen" : "Hintergrund hochladen"}
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
            </div>
          </div>
        </div>
      </div>

      <aside className="space-y-5">
        <div className="border p-5">
          <div className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Veröffentlichung
          </div>
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium">Öffentlicher Zugriff</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Ermöglicht das Kopieren und Anzeigen des öffentlichen O-Mats.
              </span>
            </span>
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          </label>
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
              Slug nicht verfügbar
            </span>
          ) : null}
        </div>
      </aside>
    </form>
  )
}
