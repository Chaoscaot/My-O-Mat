"use client"

import { useMutation, useQuery } from "convex/react"
import { CheckCircle2, ClipboardList, Lock, Save, Send } from "lucide-react"
import { FormEvent, useMemo, useState } from "react"

import { EmptyState } from "@/components/omat/empty-state"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import { type Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { type Stance } from "./types"

const stanceOptions: { value: Stance; label: string; text: string }[] = [
  { value: "yes", label: "Ja", text: "Zustimmung" },
  { value: "neutral", label: "Neutral", text: "Teils/teils" },
  { value: "no", label: "Nein", text: "Ablehnung" },
]

type QuestionnaireDraft = Record<
  string,
  {
    stance: Stance | ""
    explanation: string
  }
>

export function QuestionnairePage({ token }: { token: string }) {
  const questionnaire = useQuery(api.questionnaires.getQuestionnaireByToken, {
    token,
  })
  const saveQuestionnaireDraft = useMutation(
    api.questionnaires.saveQuestionnaireDraft
  )
  const submitQuestionnaire = useMutation(
    api.questionnaires.submitQuestionnaire
  )
  const [drafts, setDrafts] = useState<QuestionnaireDraft>({})
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle")
  const [submitState, setSubmitState] = useState<
    "idle" | "submitting" | "submitted" | "error"
  >("idle")
  const [submitError, setSubmitError] = useState("")

  const answerByQuestionId = useMemo(
    () =>
      new Map(
        (questionnaire?.answers ?? []).map((answer) => [
          answer.questionId,
          answer,
        ])
      ),
    [questionnaire?.answers]
  )

  function getDraft(questionId: Id<"questions">) {
    const answer = answerByQuestionId.get(questionId)
    return {
      stance: drafts[questionId]?.stance ?? answer?.stance ?? "",
      explanation: drafts[questionId]?.explanation ?? answer?.explanation ?? "",
    }
  }

  const completion = useMemo(() => {
    if (!questionnaire) return { done: 0, total: 0, complete: false }
    const done = questionnaire.questions.filter((question) => {
      const answer = answerByQuestionId.get(question._id)
      const draft = {
        stance: drafts[question._id]?.stance ?? answer?.stance ?? "",
        explanation:
          drafts[question._id]?.explanation ?? answer?.explanation ?? "",
      }
      return Boolean(draft?.stance && draft.explanation.trim())
    }).length
    return {
      done,
      total: questionnaire.questions.length,
      complete:
        questionnaire.questions.length > 0 &&
        done === questionnaire.questions.length,
    }
  }, [answerByQuestionId, drafts, questionnaire])
  const isClosed = questionnaire?.questionnaire.status === "closed"

  function setQuestionDraft(
    questionId: Id<"questions">,
    draft: { stance: Stance | ""; explanation: string }
  ) {
    setDrafts((current) => ({
      ...current,
      [questionId]: draft,
    }))
    setSubmitState("idle")
  }

  async function saveQuestionDraft(
    questionId: Id<"questions">,
    draft: { stance: Stance | ""; explanation: string }
  ) {
    if (!draft.stance && !draft.explanation.trim()) return
    if (isClosed) return

    setSaveState("saving")
    try {
      await saveQuestionnaireDraft({
        token,
        answer: {
          questionId,
          stance: draft.stance || null,
          explanation: draft.explanation,
        },
      })
      setSaveState("saved")
    } catch {
      setSaveState("error")
    }
  }

  async function saveStartedDrafts() {
    if (!questionnaire) return
    if (isClosed) return

    setSaveState("saving")
    try {
      for (const question of questionnaire.questions) {
        const draft = getDraft(question._id)
        if (!draft.stance && !draft.explanation.trim()) {
          continue
        }
        await saveQuestionnaireDraft({
          token,
          answer: {
            questionId: question._id,
            stance: draft.stance || null,
            explanation: draft.explanation,
          },
        })
      }
      setSaveState("saved")
    } catch {
      setSaveState("error")
    }
  }

  if (questionnaire === undefined) {
    return (
      <main className="min-h-svh bg-background p-4 md:p-8">
        <EmptyState
          title="Fragebogen wird geladen"
          text="Der private Link wird geprüft."
        />
      </main>
    )
  }

  if (!questionnaire) {
    return (
      <main className="min-h-svh bg-background p-4 md:p-8">
        <EmptyState
          title="Fragebogen nicht gefunden"
          text="Prüfe den Link oder fordere einen neuen Fragebogen an."
        />
      </main>
    )
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!questionnaire || !completion.complete || isClosed) return

    setSubmitState("submitting")
    setSubmitError("")
    try {
      await submitQuestionnaire({
        token,
        answers: questionnaire.questions.map((question) => {
          const draft = getDraft(question._id)
          return {
            questionId: question._id as Id<"questions">,
            stance: draft.stance as Stance,
            explanation: draft.explanation,
          }
        }),
      })
      setSubmitState("submitted")
    } catch (error) {
      setSubmitState("error")
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Der Fragebogen konnte nicht gesendet werden."
      )
    }
  }

  return (
    <main className="min-h-svh bg-[linear-gradient(180deg,var(--background),color-mix(in_oklch,var(--background),var(--foreground)_5%))] p-4 md:p-8">
      <form className="mx-auto max-w-5xl space-y-5" onSubmit={submit}>
        <header className="border bg-card p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                <ClipboardList className="size-4" />
                Fragebogen
              </p>
              <h1 className="mt-3 font-heading text-4xl font-semibold">
                {questionnaire.omat.title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {questionnaire.omat.description}
              </p>
            </div>
            <div className="min-w-44 border px-4 py-3">
              <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Partei
              </div>
              <div className="mt-2 flex items-center gap-2 font-heading text-2xl font-semibold">
                <span
                  className="size-3 border"
                  style={{ backgroundColor: questionnaire.party.color }}
                />
                {questionnaire.party.shortName}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {questionnaire.party.name}
              </div>
            </div>
          </div>
          <div className="mt-5 border-t pt-4 text-sm text-muted-foreground">
            {isClosed ? (
              <span className="inline-flex items-center gap-2">
                <Lock className="size-4" />
                Dieser Fragebogen-Link ist geschlossen. Änderungen sind nicht
                mehr möglich.
              </span>
            ) : (
              <>
                {completion.done} von {completion.total} Thesen vollständig
                beantwortet. Jede These benötigt eine Position und eine
                Begründung.
              </>
            )}
          </div>
        </header>

        <div className="space-y-4">
          {questionnaire.questions.map((question, index) => {
            const draft = getDraft(question._id)
            return (
              <section key={question._id} className="border bg-card p-5">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                      These {index + 1}
                    </div>
                    <h2 className="mt-2 font-heading text-2xl font-semibold">
                      {question.title || question.text}
                    </h2>
                    <p className="mt-2 leading-7">{question.text}</p>
                    {question.context ? (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {question.context}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid content-start gap-3">
                    <Label>Position</Label>
                    <div className="grid grid-cols-3 border">
                      {stanceOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={cn(
                            "grid min-h-14 place-items-center border-r px-2 text-center text-xs font-semibold last:border-r-0 hover:bg-muted",
                            draft.stance === option.value &&
                              "bg-foreground text-background hover:bg-foreground"
                          )}
                          onClick={() => {
                            if (isClosed) return
                            const nextDraft = {
                              ...draft,
                              stance: option.value,
                            }
                            setQuestionDraft(question._id, nextDraft)
                            void saveQuestionDraft(question._id, nextDraft)
                          }}
                          disabled={isClosed}
                        >
                          <span>{option.label}</span>
                          <span className="text-[0.65rem] opacity-70">
                            {option.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-2">
                  <Label htmlFor={`explanation-${question._id}`}>
                    Begründung
                  </Label>
                  <Textarea
                    id={`explanation-${question._id}`}
                    className="min-h-28"
                    placeholder="Begründet eure Position zur These nachvollziehbar."
                    value={draft.explanation}
                    disabled={isClosed}
                    onChange={(event) =>
                      setQuestionDraft(question._id, {
                        ...draft,
                        explanation: event.target.value,
                      })
                    }
                    onBlur={() => void saveQuestionDraft(question._id, draft)}
                  />
                </div>
              </section>
            )
          })}
        </div>

        <footer className="sticky bottom-0 border bg-card/95 p-4 backdrop-blur">
          <div className="flex flex-col items-start justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {submitState === "submitted" ? (
                <span className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="size-4" />
                  Fragebogen wurde eingereicht.
                </span>
              ) : submitState === "error" ? (
                <span className="text-destructive">{submitError}</span>
              ) : isClosed ? (
                <span className="inline-flex items-center gap-2">
                  <Lock className="size-4" />
                  Link geschlossen. Dieser Fragebogen kann nicht mehr bearbeitet
                  werden.
                </span>
              ) : saveState === "saving" ? (
                "Zwischenstand wird gespeichert."
              ) : saveState === "saved" ? (
                "Zwischenstand gespeichert."
              ) : saveState === "error" ? (
                <span className="text-destructive">
                  Zwischenstand konnte nicht gespeichert werden.
                </span>
              ) : (
                "Die Antworten werden nach dem Senden der Redaktion zur Übernahme angezeigt."
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void saveStartedDrafts()}
                disabled={isClosed || saveState === "saving"}
              >
                <Save />
                Zwischenstand speichern
              </Button>
              <Button
                type="submit"
                disabled={
                  isClosed ||
                  !completion.complete ||
                  submitState === "submitting"
                }
              >
                <Send />
                {submitState === "submitting"
                  ? "Wird gesendet"
                  : "Fragebogen senden"}
              </Button>
            </div>
          </div>
        </footer>
      </form>
    </main>
  )
}
