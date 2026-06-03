"use client"

import {
  Fragment,
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react"
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { type EditorData } from "../types"
import {
  type QuestionDoc,
  type QuestionDragState,
  type QuestionFormState,
  reorderQuestionList,
} from "./shared"

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

export function QuestionsPage({ editor }: { editor: NonNullable<EditorData> }) {
  const addQuestion = useMutation(api.questions.addQuestion)
  const updateQuestion = useMutation(api.questions.updateQuestion)
  const deleteQuestion = useMutation(api.questions.deleteQuestion)
  const reorderQuestions = useMutation(api.questions.reorderQuestions)
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
