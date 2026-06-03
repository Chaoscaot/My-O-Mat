"use client"

import { useAuth, useOrganization } from "@clerk/nextjs"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import {
  BadgeCheck,
  CircleSlash,
  Copy,
  Eye,
  ExternalLink,
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
import {
  ChangeEvent,
  Fragment,
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import { type Doc, type Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { EmptyState } from "./empty-state"
import { RunnerPanel } from "./runner-panel"
import { SignInPrompt } from "./sign-in-prompt"
import { type EditorData, type Stance } from "./types"

type EditorTab = "questions" | "parties" | "answers" | "preview" | "settings"
type ColorScheme = "civic" | "forest" | "sunset" | "mono"
type OmatVisibility = "private" | "hidden" | "public"
type QuestionFormState = {
  title: string
  text: string
  context: string
}
type QuestionDoc = Doc<"questions">
type QuestionDragState = {
  questionId: Id<"questions">
  pointerId: number
  pointerY: number
  pointerOffsetY: number
  itemHeight: number
  listRect: DOMRect
  itemRect: DOMRect
  sourceIndex: number
  targetIndex: number
}
type PartyFormState = {
  name: string
  shortName: string
  description: string
  color: string
  logoStorageId?: Id<"_storage">
}
type ImprintPersonFormState = {
  name: string
  role: string
  street: string
  postalCode: string
  city: string
  country: string
  email: string
}
type LegalInfoFormState = {
  imprintPersons: ImprintPersonFormState[]
}

function isPremiumPlan(value: unknown) {
  return typeof value === "string" && value.toLowerCase() === "premium"
}

function slugifyUrlPart(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "omat"
  )
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
  {
    value: "sunset",
    label: "Sonnenuntergang",
    swatches: ["#be123c", "#f97316"],
  },
  { value: "mono", label: "Mono", swatches: ["#18181b", "#a1a1aa"] },
]

const visibilityOptions: {
  value: OmatVisibility
  label: string
  description: string
}[] = [
  {
    value: "private",
    label: "Privat",
    description: "Nur Mitglieder der Organisation über /preview/{org}/{id}.",
  },
  {
    value: "hidden",
    label: "Versteckt",
    description: "Alle mit Link können ihn über /preview/{id} öffnen.",
  },
  {
    value: "public",
    label: "Öffentlich",
    description: "Öffentlich über /mat/{slug}.",
  },
]

const emptyImprintPerson: ImprintPersonFormState = {
  name: "",
  role: "",
  street: "",
  postalCode: "",
  city: "",
  country: "Deutschland",
  email: "",
}

const editorTabs: {
  value: EditorTab
  label: string
  icon: typeof FileQuestion
}[] = [
  { value: "questions", label: "Thesen", icon: FileQuestion },
  { value: "parties", label: "Parteien", icon: CircleSlash },
  { value: "answers", label: "Antworten", icon: Pencil },
  { value: "preview", label: "Vorschau", icon: Eye },
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

function reorderQuestionList(
  questions: QuestionDoc[],
  questionId: Id<"questions">,
  targetIndex: number
) {
  const fromIndex = questions.findIndex(
    (question) => question._id === questionId
  )
  if (fromIndex < 0) return questions

  const nextQuestions = [...questions]
  const [movedQuestion] = nextQuestions.splice(fromIndex, 1)
  nextQuestions.splice(
    Math.min(Math.max(targetIndex, 0), nextQuestions.length),
    0,
    movedQuestion
  )
  return nextQuestions
}

function QuestionDragPreview({
  dragState,
  question,
  index,
}: {
  dragState: QuestionDragState
  question: QuestionDoc
  index: number
}) {
  const top = Math.min(
    Math.max(
      dragState.pointerY - dragState.pointerOffsetY,
      dragState.listRect.top
    ),
    dragState.listRect.bottom - dragState.itemHeight
  )

  return (
    <article
      className="pointer-events-none fixed z-50 grid gap-3 border bg-card p-4 shadow-[0_18px_48px_color-mix(in_oklch,var(--foreground),transparent_84%)] ring-2 ring-ring/25 sm:grid-cols-[auto_1fr_auto]"
      style={{
        top,
        left: dragState.listRect.left,
        width: dragState.listRect.width,
        minHeight: dragState.itemRect.height,
      }}
      aria-hidden
    >
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center border bg-background font-mono text-xs">
          {index + 1}
        </span>
        <span className="flex size-8 items-center justify-center border bg-primary text-primary-foreground">
          <GripVertical className="size-4" />
        </span>
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
      <div className="hidden items-start justify-end sm:flex">
        <span className="border px-2 py-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Vorschau
        </span>
      </div>
    </article>
  )
}

function QuestionDropMarker() {
  return (
    <div
      className="pointer-events-none h-0 border-t-2 border-primary shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary),transparent_55%)]"
      aria-hidden
    />
  )
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

  const visibility =
    editor.omat.visibility ?? (editor.omat.isPublished ? "public" : "private")
  const organizationSlug =
    editor.organization.slug ?? slugifyUrlPart(editor.organization.name)
  const privateHref = `/preview/${organizationSlug}/${editor.omat._id}`
  const hiddenHref = `/preview/${editor.omat._id}`
  const publicHref = `/mat/${editor.omat.slug}`
  const shareHref =
    visibility === "public"
      ? publicHref
      : visibility === "hidden"
        ? hiddenHref
        : privateHref
  const copyPublicLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${shareHref}`)
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
            <Button type="button" variant="outline" onClick={copyPublicLink}>
              <Copy />
              {copied ? "Kopiert" : "Link kopieren"}
            </Button>
            <Button asChild>
              <Link href={shareHref}>
                <Eye />
                Vorschau
              </Link>
            </Button>
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
          <TabsContent value="preview" className="p-5">
            <PreviewPage editor={editor} />
          </TabsContent>
          <TabsContent value="settings" className="p-5">
            <SettingsPage editor={editor} />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}

function PreviewPage({ editor }: { editor: NonNullable<EditorData> }) {
  const missingQuestions = editor.questions.length === 0
  const missingParties = editor.parties.length === 0

  if (missingQuestions || missingParties) {
    return (
      <EmptyState
        title="Vorschau noch nicht bereit"
        text={[
          missingQuestions ? "Lege mindestens eine These an." : null,
          missingParties ? "Lege mindestens eine Partei an." : null,
        ]
          .filter(Boolean)
          .join(" ")}
      />
    )
  }

  return (
    <div className="overflow-hidden border bg-background">
      <RunnerPanel data={editor} preview />
    </div>
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
  const [dragState, setDragState] = useState<QuestionDragState | null>(null)
  const dragStateRef = useRef<QuestionDragState | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const isDragging = dragState !== null

  const editingQuestion = editor.questions.find(
    (question) => question._id === editingQuestionId
  )
  const draggedQuestion = dragState
    ? editor.questions.find((question) => question._id === dragState.questionId)
    : null

  useEffect(() => {
    dragStateRef.current = dragState
  }, [dragState])

  useEffect(() => {
    if (!isDragging) return

    function getTargetIndex(
      currentDragState: QuestionDragState,
      clientY: number
    ) {
      const rows = Array.from(
        listRef.current?.querySelectorAll<HTMLElement>("[data-question-row]") ??
          []
      ).filter(
        (element) => element.dataset.questionId !== currentDragState.questionId
      )
      const row = rows.find((element) => {
        const rect = element.getBoundingClientRect()
        return clientY < rect.top + rect.height / 2
      })

      if (!row) return rows.length

      const rowIndex = rows.indexOf(row)
      return rowIndex < 0 ? currentDragState.targetIndex : rowIndex
    }

    function handlePointerMove(event: PointerEvent) {
      const currentDragState = dragStateRef.current
      if (!currentDragState || event.pointerId !== currentDragState.pointerId) {
        return
      }

      const nextPointerY = Math.min(
        Math.max(event.clientY, currentDragState.listRect.top),
        currentDragState.listRect.bottom
      )
      const nextDragState = {
        ...currentDragState,
        pointerY: nextPointerY,
        targetIndex: getTargetIndex(currentDragState, nextPointerY),
      }
      dragStateRef.current = nextDragState
      setDragState(nextDragState)
    }

    async function handlePointerUp(event: PointerEvent) {
      const currentDragState = dragStateRef.current
      if (!currentDragState || event.pointerId !== currentDragState.pointerId) {
        return
      }

      dragStateRef.current = null
      setDragState(null)

      const fromIndex = editor.questions.findIndex(
        (question) => question._id === currentDragState.questionId
      )
      if (fromIndex < 0 || fromIndex === currentDragState.targetIndex) return

      const nextQuestions = reorderQuestionList(
        editor.questions,
        currentDragState.questionId,
        currentDragState.targetIndex
      )
      await reorderQuestions({
        omatId: editor.omat._id,
        questionIds: nextQuestions.map((question) => question._id),
      })
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerUp)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerUp)
    }
  }, [isDragging, editor.omat._id, editor.questions, reorderQuestions])

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

  function startQuestionDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
    questionId: Id<"questions">
  ) {
    if (event.button !== 0) return

    const row = event.currentTarget.closest<HTMLElement>("[data-question-row]")
    const list = listRef.current
    if (!row || !list) return

    const itemRect = row.getBoundingClientRect()
    const listRect = list.getBoundingClientRect()
    const targetIndex = editor.questions.findIndex(
      (question) => question._id === questionId
    )
    if (targetIndex < 0) return

    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()

    const nextDragState = {
      questionId,
      pointerId: event.pointerId,
      pointerY: event.clientY,
      pointerOffsetY: event.clientY - itemRect.top,
      itemHeight: itemRect.height,
      listRect,
      itemRect,
      sourceIndex: targetIndex,
      targetIndex,
    }
    dragStateRef.current = nextDragState
    setDragState(nextDragState)
  }

  let dropMarkerIndex = 0

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

      <div ref={listRef} className="relative space-y-3">
        {editor.questions.map((question, index) => {
          const isDragged = dragState?.questionId === question._id
          const showDropMarker =
            dragState &&
            dragState.sourceIndex !== dragState.targetIndex &&
            !isDragged &&
            dropMarkerIndex === dragState.targetIndex

          if (!isDragged) {
            dropMarkerIndex += 1
          }

          return (
            <Fragment key={question._id}>
              {showDropMarker ? <QuestionDropMarker /> : null}
              <article
                data-question-row
                data-question-id={question._id}
                className={cn(
                  "grid gap-3 border p-4 transition hover:bg-muted/50 sm:grid-cols-[auto_1fr_auto]",
                  isDragged && "border-dashed bg-muted/30 opacity-45"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center border font-mono text-xs">
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    className={cn(
                      "flex size-8 touch-none items-center justify-center border text-muted-foreground transition hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
                      isDragged && "cursor-grabbing"
                    )}
                    onPointerDown={(event) =>
                      startQuestionDrag(event, question._id)
                    }
                    aria-label={`These ${index + 1} verschieben`}
                  >
                    <GripVertical className="size-4" />
                  </button>
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
            </Fragment>
          )
        })}
        {dragState &&
        dragState.sourceIndex !== dragState.targetIndex &&
        dragState.targetIndex === editor.questions.length - 1 ? (
          <QuestionDropMarker />
        ) : null}
        {dragState && draggedQuestion ? (
          <QuestionDragPreview
            dragState={dragState}
            question={draggedQuestion}
            index={dragState.targetIndex}
          />
        ) : null}
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
            <div className="grid gap-2">
              <Label htmlFor="question-title">Kurzer Titel</Label>
              <Input
                id="question-title"
                placeholder="z. B. Bezahlbarer Wohnraum"
                value={questionForm.title}
                onChange={(event) =>
                  setQuestionForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="question-text">Vollständige These</Label>
              <Textarea
                id="question-text"
                placeholder="z. B. Die Stadt soll mehr Geld in sozialen Wohnungsbau investieren."
                value={questionForm.text}
                onChange={(event) =>
                  setQuestionForm((current) => ({
                    ...current,
                    text: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="question-context">Kontext</Label>
              <Input
                id="question-context"
                placeholder="z. B. Betrifft den städtischen Haushalt 2027."
                value={questionForm.context}
                onChange={(event) =>
                  setQuestionForm((current) => ({
                    ...current,
                    context: event.target.value,
                  }))
                }
              />
            </div>
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
              <td className="min-w-64 p-3">
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
                const position = positionByKey.get(positionKey)
                const explanation = getExplanationDraft(positionKey, position)
                return (
                  <td key={party._id} className="min-w-56 p-3">
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
                    <div className="mt-2 grid gap-2">
                      <Label
                        className="text-[0.65rem]"
                        htmlFor={`explanation-${positionKey}`}
                      >
                        Begründung
                      </Label>
                      <Textarea
                        id={`explanation-${positionKey}`}
                        className="min-h-24 resize-y text-xs leading-5"
                        placeholder="z. B. Wir stimmen zu, weil die Maßnahme bezahlbar und wirksam ist."
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
                    </div>
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
  const { isLoaded: isOrganizationLoaded, organization: clerkOrganization } =
    useOrganization()
  const generateUploadUrl = useMutation(api.omats.generateUploadUrl)
  const updateSettings = useMutation(api.omats.updateOmatSettings)
  const setOmatBackground = useMutation(api.omats.setOmatBackground)
  const [title, setTitle] = useState(editor.omat.title)
  const [description, setDescription] = useState(editor.omat.description)
  const [slug, setSlug] = useState(editor.omat.slug)
  const [visibility, setVisibility] = useState<OmatVisibility>(
    editor.omat.visibility ?? (editor.omat.isPublished ? "public" : "private")
  )
  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    editor.omat.colorScheme ?? "civic"
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
  const isClerkOrganization =
    clerkOrganization?.id === editor.organization.clerkOrganizationId
  const syncedPremiumPlan = editor.organization.plan === "premium"
  const currentClerkPlanIsPremium =
    isClerkOrganization &&
    isPremiumPlan(clerkOrganization?.publicMetadata?.plan)
  const hasPremiumPlan =
    editor.organization.clerkOrganizationId !== undefined &&
    (isOrganizationLoaded && isClerkOrganization
      ? currentClerkPlanIsPremium
      : syncedPremiumPlan)
  const selectedVisibility = visibilityOptions.find(
    (option) => option.value === visibility
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
        watermarksDisabled: hasPremiumPlan && watermarksDisabled,
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
            </div>
          </div>
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
            <Button type="button" variant="outline" onClick={addImprintPerson}>
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
                        updateImprintPerson(index, "street", event.target.value)
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
                        updateImprintPerson(index, "email", event.target.value)
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
              onValueChange={(value) => setVisibility(value as OmatVisibility)}
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
              checked={hasPremiumPlan && watermarksDisabled}
              disabled={!hasPremiumPlan}
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
  )
}
