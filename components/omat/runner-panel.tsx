"use client"

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  CopyPlus,
  ExternalLink,
  FileText,
  Info,
  ListChecks,
  MessageSquareText,
  Minus,
  RotateCcw,
  SkipForward,
  X,
} from "lucide-react"
import Image from "next/image"
import posthog from "posthog-js"
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import { cn } from "@/lib/utils"
import { scoreParties } from "./matching"
import { type AnswerState, type AnswerValue, type RunnerData } from "./types"
import { EmptyState } from "./empty-state"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

const answerOptions: {
  value: AnswerValue
  label: string
  icon: typeof Check
}[] = [
  { value: "yes", label: "Stimme Zu", icon: Check },
  { value: "neutral", label: "Neutral", icon: Minus },
  { value: "no", label: "Stimme Nicht Zu", icon: X },
  { value: "skip", label: "Überspringen", icon: SkipForward },
]

export function RunnerPanel({
  data,
  preview = false,
}: {
  data: RunnerData
  preview?: boolean
}) {
  if (data === undefined) {
    return (
      <EmptyState
        title="Live-O-Mat wird geladen"
        text="Der Antwortablauf wird vorbereitet."
      />
    )
  }

  if (!data) {
    return (
      <EmptyState
        title="Kein öffentlicher O-Mat gefunden"
        text="Der angefragte O-Mat ist nicht veröffentlicht oder existiert nicht."
      />
    )
  }

  return (
    <div
      className={cn(
        data.omat.colorScheme === "forest" &&
          "[--primary:oklch(0.45_0.13_152)] [--ring:oklch(0.62_0.16_145)]",
        data.omat.colorScheme === "sunset" &&
          "[--primary:oklch(0.57_0.21_24)] [--ring:oklch(0.7_0.18_54)]",
        data.omat.colorScheme === "mono" &&
          "[--primary:oklch(0.22_0_0)] [--ring:oklch(0.65_0_0)]"
      )}
    >
      <RunnerContent key={data.omat._id} data={data} preview={preview} />
    </div>
  )
}

function RunnerContent({
  data,
  preview,
}: {
  data: NonNullable<RunnerData>
  preview: boolean
}) {
  const [answers, setAnswers] = useState<AnswerState>({})
  const [stage, setStage] = useState<"answering" | "doubling" | "results">(
    "answering"
  )
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [expandedPartyId, setExpandedPartyId] = useState<string | null>(null)
  const [legalDialogOpen, setLegalDialogOpen] = useState(false)
  const results = useMemo(
    () => scoreParties(data.parties, data.questions, data.positions, answers),
    [answers, data]
  )
  const positionByKey = useMemo(
    () =>
      new Map(
        data.positions.map((position) => [
          `${position.partyId}:${position.questionId}`,
          position,
        ])
      ),
    [data.positions]
  )
  const currentQuestion = data.questions[currentQuestionIndex]
  const currentAnswer = currentQuestion ? answers[currentQuestion._id] : null
  const answeredQuestions = data.questions.filter(
    (question) => answers[question._id]?.value !== undefined
  )
  const weightedQuestions = data.questions.filter(
    (question) => answers[question._id]?.doubled
  )
  const answeredCount = Object.values(answers).filter(
    (answer) => answer.value !== "skip"
  ).length
  const progress =
    data.questions.length === 0
      ? 0
      : (currentQuestionIndex / (data.questions.length - 1)) * 100
  const explanationQuestions = answeredQuestions.filter(
    (question) => answers[question._id]?.value !== "skip"
  )
  const showWatermarks = !data.omat.watermarksDisabled
  const showEyeCandy = !data.omat.eyeCandyDisabled
  const trackRunnerEvent = useCallback(
    (event: string, properties: Record<string, unknown> = {}) => {
      if (preview) return

      posthog.capture(event, {
        omat_id: data.omat._id,
        omat_slug: data.omat.slug,
        color_scheme: data.omat.colorScheme ?? "civic",
        question_count: data.questions.length,
        party_count: data.parties.length,
        has_background: Boolean(data.omat.backgroundUrl),
        eye_candy_disabled: Boolean(data.omat.eyeCandyDisabled),
        watermarks_disabled: Boolean(data.omat.watermarksDisabled),
        ...properties,
      })
    },
    [
      data.omat._id,
      data.omat.backgroundUrl,
      data.omat.colorScheme,
      data.omat.eyeCandyDisabled,
      data.omat.slug,
      data.omat.watermarksDisabled,
      data.parties.length,
      data.questions.length,
      preview,
    ]
  )

  useEffect(() => {
    trackRunnerEvent("runner_viewed")
  }, [trackRunnerEvent])

  const answerQuestion = (value: AnswerValue) => {
    if (!currentQuestion) return

    setAnswers((current) => ({
      ...current,
      [currentQuestion._id]: {
        value,
        doubled:
          value === "skip"
            ? false
            : (current[currentQuestion._id]?.doubled ?? false),
      },
    }))
  }

  const goToNextQuestion = () => {
    if (currentQuestionIndex < data.questions.length - 1) {
      setCurrentQuestionIndex((index) => index + 1)
      return
    }

    setStage("doubling")
  }

  const goToPreviousQuestion = () => {
    setCurrentQuestionIndex((index) => Math.max(0, index - 1))
  }

  const resetFlow = (source: "answering" | "results") => {
    trackRunnerEvent("runner_reset", {
      source,
      stage,
      current_question_index: currentQuestionIndex + 1,
      response_count: Object.keys(answers).length,
      answered_count: answeredCount,
      skipped_count: countAnswersByValue(answers).skip,
      weighted_count: weightedQuestions.length,
      finished: stage === "results",
    })
    setAnswers({})
    setCurrentQuestionIndex(0)
    setStage("answering")
  }

  const setNoDoubledQuestions = () => {
    trackRunnerEvent("runner_weighting_selected", {
      selection_action: "clear",
      previous_weighted_count: weightedQuestions.length,
      weighted_count: 0,
      weighted_question_ids: [],
    })
    setAnswers((current) =>
      Object.fromEntries(
        Object.entries(current).map(([questionId, answer]) => [
          questionId,
          { ...answer, doubled: false },
        ])
      )
    )
  }

  const toggleQuestionWeight = (
    question: (typeof data.questions)[number],
    index: number
  ) => {
    const isCurrentlyWeighted = Boolean(answers[question._id]?.doubled)
    const nextWeightedQuestionIds = Object.entries(answers)
      .filter(([questionId, answer]) =>
        questionId === question._id ? !isCurrentlyWeighted : answer.doubled
      )
      .map(([questionId]) => questionId)

    trackRunnerEvent("runner_weighting_selected", {
      selection_action: isCurrentlyWeighted ? "deselect" : "select",
      question_id: question._id,
      question_index: index + 1,
      weighted_count: nextWeightedQuestionIds.length,
      weighted_question_ids: nextWeightedQuestionIds,
    })

    setAnswers((current) => ({
      ...current,
      [question._id]: {
        value: current[question._id]?.value ?? "neutral",
        doubled: !current[question._id]?.doubled,
      },
    }))
  }

  const showResults = () => {
    const answerCounts = countAnswersByValue(answers)
    const topResult = results[0]

    trackRunnerEvent("runner_finished", {
      response_count: Object.keys(answers).length,
      answered_count: answeredCount,
      completion_rate:
        data.questions.length === 0 ? 0 : answeredCount / data.questions.length,
      weighted_count: weightedQuestions.length,
      weighted_question_ids: weightedQuestions.map((question) => question._id),
      yes_count: answerCounts.yes,
      neutral_count: answerCounts.neutral,
      no_count: answerCounts.no,
      skipped_count: answerCounts.skip,
      top_party_id: topResult?.party._id,
      top_match: topResult?.match,
      top_results: results.slice(0, 3).map(({ party, match }, index) => ({
        party_id: party._id,
        rank: index + 1,
        match,
      })),
      result_count: results.length,
    })
    setStage("results")
  }

  const toggleResultDetails = (party: (typeof data.parties)[number]) => {
    setExpandedPartyId((current) => (current === party._id ? null : party._id))
  }

  return (
    <section
      className={cn(
        "omat-runner-shell relative isolate min-h-svh overflow-hidden px-4 py-24 md:px-8",
        !showEyeCandy && "is-plain-background",
        preview && "min-h-[38rem] px-3 py-16 md:px-5",
        data.omat.backgroundUrl && "bg-background"
      )}
    >
      {data.omat.backgroundUrl ? (
        <>
          <Image
            src={data.omat.backgroundUrl}
            alt=""
            fill
            preload={!preview}
            sizes="100vw"
            className="absolute inset-0 z-0 object-cover"
          />
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-background/80"
            aria-hidden="true"
          />
        </>
      ) : null}
      {showEyeCandy ? (
        <div className="omat-runner-streams" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : null}

      <div
        className={cn(
          "omat-runner-brand absolute top-4 left-4 z-10 max-w-[calc(100vw-8rem)] md:top-6 md:left-8 md:max-w-xs",
          preview && "md:left-5"
        )}
      >
        <h1 className="mt-1 truncate font-heading text-2xl font-semibold">
          {data.omat.title}
        </h1>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "absolute top-4 right-4 z-10 bg-card/90 backdrop-blur md:top-6 md:right-8",
          preview && "md:right-5"
        )}
        onClick={() => setLegalDialogOpen(true)}
      >
        <Info />
        Rechtliches
      </Button>

      <RunnerLegalDialog
        data={data}
        open={legalDialogOpen}
        onOpenChange={setLegalDialogOpen}
      />

      {stage === "answering" && currentQuestion ? (
        <div
          key="answering"
          className={cn(
            "omat-runner-stage relative z-10 mx-auto flex min-h-[calc(100svh-12rem)] w-full max-w-3xl items-center",
            preview && "min-h-[26rem]"
          )}
        >
          <div className="omat-runner-card w-full border bg-card">
            <div className="border-b p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="mt-1 font-heading text-2xl font-semibold">
                    {currentQuestion.title ||
                      `These ${currentQuestionIndex + 1}`}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    These {currentQuestionIndex + 1} von {data.questions.length}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resetFlow("answering")}
                >
                  <RotateCcw />
                  Zurücksetzen
                </Button>
              </div>
              <Progress className="omat-progress" value={progress} />
            </div>

            <div className="p-5">
              <div
                key={currentQuestion._id}
                className="omat-question-block mb-5 flex items-start gap-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center border font-mono text-xs">
                  {currentQuestionIndex + 1}
                </span>
                <div>
                  <h3 className="text-lg leading-7 font-medium">
                    {currentQuestion.text}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {currentQuestion.context}
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-4">
                {answerOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.value}
                      className={cn(
                        "omat-answer-button flex h-12 items-center justify-center gap-2 border text-xs font-semibold tracking-widest uppercase transition hover:bg-muted",
                        currentAnswer?.value === option.value &&
                          "is-selected bg-foreground text-background hover:bg-foreground hover:text-background"
                      )}
                      onClick={() => answerQuestion(option.value)}
                    >
                      <Icon className="size-3.5" />
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t p-5">
              <Button
                variant="outline"
                onClick={goToPreviousQuestion}
                disabled={currentQuestionIndex === 0}
              >
                <ArrowLeft />
                Zurück
              </Button>
              {showWatermarks ? (
                <p className="text-xs text-muted-foreground">
                  Erstellt mit{" "}
                  <Link href={"/"} className="hover:underline">
                    My-O-Mat
                  </Link>
                </p>
              ) : null}
              <Button onClick={goToNextQuestion} disabled={!currentAnswer}>
                {currentQuestionIndex === data.questions.length - 1
                  ? "Gewichtungen wählen"
                  : "Weiter"}
                <ArrowRight />
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {stage === "doubling" ? (
        <div
          key="doubling"
          className={cn(
            "omat-runner-stage relative z-10 mx-auto flex min-h-[calc(100svh-12rem)] w-full max-w-4xl items-center",
            preview && "min-h-[26rem]"
          )}
        >
          <div className="omat-runner-card w-full border bg-card">
            <div className="border-b p-5">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Gewichtungen wählen
              </p>
              <h2 className="mt-1 font-heading text-2xl font-semibold">
                Wichtige Antworten gewichten
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {weightedQuestions.length === 0
                  ? "Keine Thesen sind gewichtet."
                  : `${weightedQuestions.length} ${
                      weightedQuestions.length === 1 ? "These" : "Thesen"
                    } gewichtet.`}
              </p>
            </div>

            <div className="divide-y">
              {answeredQuestions
                .filter((question) => answers[question._id]?.value !== "skip")
                .map((question, index) => {
                  const answer = answers[question._id]
                  return (
                    <button
                      key={question._id}
                      className={cn(
                        "omat-weight-row grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 p-4 text-left transition hover:bg-muted",
                        answer?.doubled && "is-weighted bg-muted"
                      )}
                      style={{ animationDelay: `${index * 45}ms` }}
                      onClick={() => toggleQuestionWeight(question, index)}
                    >
                      <span className="flex size-8 items-center justify-center border font-mono text-xs">
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {question.title || question.text}
                        </span>
                        <span className="mt-1 block truncate text-sm text-muted-foreground">
                          {question.text}
                        </span>
                        <span className="mt-1 block text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                          Antwort: {formatAnswerValue(answer?.value)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "omat-weight-toggle flex h-9 items-center gap-2 border px-3 text-xs font-semibold tracking-widest uppercase",
                          answer?.doubled &&
                            "border-foreground bg-foreground text-background"
                        )}
                      >
                        <CopyPlus className="size-3.5" />
                        Gewichten
                      </span>
                    </button>
                  )
                })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t p-5">
              <Button variant="outline" onClick={() => setStage("answering")}>
                <ArrowLeft />
                Zurück
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={setNoDoubledQuestions}>
                  <ListChecks />
                  Keine
                </Button>
                <Button onClick={showResults}>
                  <BarChart3 />
                  Ergebnisse anzeigen
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {stage === "results" ? (
        <div
          key="results"
          className={cn(
            "omat-runner-stage relative z-10 mx-auto flex min-h-[calc(100svh-12rem)] w-full max-w-4xl items-center",
            preview && "min-h-[26rem]"
          )}
        >
          {showEyeCandy ? (
            <div className="omat-confetti" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          ) : null}
          <div className="omat-runner-card w-full border bg-card">
            <div className="border-b p-5">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Ergebnisse anzeigen
              </p>
              <h2 className="mt-1 font-heading text-2xl font-semibold">
                Beste Übereinstimmung
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {answeredCount} von {data.questions.length} Thesen beantwortet,
                davon {weightedQuestions.length} gewichtet.
              </p>
            </div>
            <div className="divide-y">
              {results.map(({ party, match }, index) => (
                <article key={party._id}>
                  <button
                    className={cn(
                      "omat-result-row grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 p-4 text-left transition hover:bg-muted",
                      expandedPartyId === party._id && "bg-muted"
                    )}
                    style={{ animationDelay: `${index * 70}ms` }}
                    aria-expanded={expandedPartyId === party._id}
                    onClick={() => toggleResultDetails(party)}
                  >
                    <span className="font-mono text-xs text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {party.logoUrl ? (
                          <Image
                            src={party.logoUrl}
                            alt=""
                            width={32}
                            height={32}
                            unoptimized
                            className="h-8 max-w-14 shrink-0 border object-contain"
                          />
                        ) : (
                          <span
                            className="size-3 border"
                            style={{ backgroundColor: party.color }}
                          />
                        )}
                        <span className="truncate font-semibold">
                          {party.name}
                        </span>
                      </div>
                      <div className="mt-2 h-2 bg-muted">
                        <div
                          className="omat-match-fill h-full bg-foreground"
                          style={{ width: `${match}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-right">
                      <span className="block font-heading text-2xl font-semibold">
                        {match}%
                      </span>
                      <span className="mt-1 flex items-center justify-end gap-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                        <MessageSquareText className="size-3.5" />
                        Details
                      </span>
                    </span>
                  </button>
                  {expandedPartyId === party._id ? (
                    <div className="omat-detail-panel border-t bg-muted/30 p-5">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                            <MessageSquareText className="size-3.5" />
                            Begründungen
                          </p>
                          <h3 className="mt-1 truncate font-heading text-xl font-semibold">
                            {party.name}
                          </h3>
                        </div>
                        <span className="font-heading text-2xl font-semibold">
                          {match}%
                        </span>
                      </div>
                      <div className="space-y-3">
                        {explanationQuestions.map((question, questionIndex) => {
                          const position = positionByKey.get(
                            `${party._id}:${question._id}`
                          )
                          const answer = answers[question._id]
                          return (
                            <article
                              key={question._id}
                              className="border bg-card p-4"
                            >
                              <div className="flex items-start gap-3">
                                <span className="flex size-8 shrink-0 items-center justify-center border font-mono text-xs">
                                  {questionIndex + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-medium">
                                    {question.title || question.text}
                                  </h4>
                                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                                    <span>
                                      Du: {formatAnswerValue(answer?.value)}
                                    </span>
                                    <span>
                                      Partei:{" "}
                                      {formatAnswerValue(position?.stance)}
                                    </span>
                                  </div>
                                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                    {position?.explanation ||
                                      "Keine Begründung hinterlegt."}
                                  </p>
                                </div>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 border-t p-5">
              <Button variant="outline" onClick={() => setStage("doubling")}>
                <ArrowLeft />
                Zurück
              </Button>
              {showWatermarks ? (
                <p className="text-muted-foreground">
                  Erstellt mit{" "}
                  <Link href={"/"} className="hover:underline">
                    My-O-Mat
                  </Link>
                </p>
              ) : null}
              <Button variant="outline" onClick={() => resetFlow("results")}>
                <RotateCcw />
                Neu starten
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function RunnerLegalDialog({
  data,
  open,
  onOpenChange,
}: {
  data: NonNullable<RunnerData>
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const legalInfo = data.omat.legalInfo
  const imprintPersons = legalInfo?.imprintPersons ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rechtliches</DialogTitle>
          <DialogDescription>
            Impressum für diesen O-Mat sowie Links zum Webseiten-Impressum und
            zur Datenschutzerklärung.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="border p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              <FileText className="size-3.5" />
              O-Mat-Impressum
            </div>
            {imprintPersons.length > 0 ? (
              <div className="grid gap-3">
                {imprintPersons.map((person, index) => (
                  <article
                    key={`${person.name}-${index}`}
                    className="border p-4"
                  >
                    <h3 className="font-heading text-lg font-semibold">
                      {person.name}
                    </h3>
                    {person.role ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {person.role}
                      </p>
                    ) : null}
                    <div className="mt-3 space-y-1 text-sm leading-6">
                      {person.street ? <p>{person.street}</p> : null}
                      {person.postalCode || person.city ? (
                        <p>
                          {[person.postalCode, person.city]
                            .filter(Boolean)
                            .join(" ")}
                        </p>
                      ) : null}
                      {person.country ? <p>{person.country}</p> : null}
                      {person.email ? (
                        <a
                          className="inline-flex font-medium underline underline-offset-4"
                          href={`mailto:${person.email}`}
                        >
                          {person.email}
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                Für diesen O-Mat ist kein Impressum hinterlegt.
              </p>
            )}
          </section>

          <section className="grid gap-2">
            <LegalDialogLink href="/impressum">
              Webseiten-Impressum
            </LegalDialogLink>
            <LegalDialogLink href="/datenschutz">
              Datenschutzerklärung
            </LegalDialogLink>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function LegalDialogLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  return (
    <Link
      className="inline-flex items-center justify-between gap-3 border px-4 py-3 text-sm font-medium transition hover:bg-muted"
      href={href}
      target="_blank"
    >
      {children}
      <ExternalLink className="size-3.5" />
    </Link>
  )
}

function formatAnswerValue(value: AnswerValue | undefined) {
  return answerOptions.find((option) => option.value === value)?.label ?? ""
}

function countAnswersByValue(answers: AnswerState) {
  return Object.values(answers).reduce(
    (counts, answer) => {
      counts[answer.value] += 1
      return counts
    },
    { yes: 0, neutral: 0, no: 0, skip: 0 } satisfies Record<AnswerValue, number>
  )
}
