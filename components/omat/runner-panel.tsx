"use client"

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  CopyPlus,
  ListChecks,
  MessageSquareText,
  Minus,
  RotateCcw,
  SkipForward,
  X,
} from "lucide-react"
import Image from "next/image"
import { useMemo, useState } from "react"

import { cn } from "@/lib/utils"
import { scoreParties } from "./matching"
import { type AnswerState, type AnswerValue, type RunnerData } from "./types"
import { EmptyState } from "./empty-state"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

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

export function RunnerPanel({ data }: { data: RunnerData }) {
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
      <RunnerContent key={data.omat._id} data={data} />
    </div>
  )
}

function RunnerContent({ data }: { data: NonNullable<RunnerData> }) {
  const [answers, setAnswers] = useState<AnswerState>({})
  const [stage, setStage] = useState<"answering" | "doubling" | "results">(
    "answering"
  )
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [expandedPartyId, setExpandedPartyId] = useState<string | null>(null)
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
      : ((currentQuestionIndex + 1) / data.questions.length) * 100
  const explanationQuestions = answeredQuestions.filter(
    (question) => answers[question._id]?.value !== "skip"
  )

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

  const resetFlow = () => {
    setAnswers({})
    setCurrentQuestionIndex(0)
    setStage("answering")
  }

  const setNoDoubledQuestions = () => {
    setAnswers((current) =>
      Object.fromEntries(
        Object.entries(current).map(([questionId, answer]) => [
          questionId,
          { ...answer, doubled: false },
        ])
      )
    )
  }

  return (
    <section
      className={cn(
        "relative isolate min-h-svh bg-cover bg-center px-4 py-24 md:px-8",
        data.omat.backgroundUrl &&
          "before:pointer-events-none before:absolute before:inset-0 before:z-0 before:bg-background/80"
      )}
      style={
        data.omat.backgroundUrl
          ? { backgroundImage: `url(${data.omat.backgroundUrl})` }
          : undefined
      }
    >
      <div className="absolute top-4 left-4 z-10 max-w-[calc(100vw-2rem)] md:top-6 md:left-8 md:max-w-xs">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Live-O-Mat
        </p>
        <h1 className="mt-1 truncate font-heading text-2xl font-semibold">
          {data.omat.title}
        </h1>
      </div>

      {stage === "answering" && currentQuestion ? (
        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-12rem)] w-full max-w-3xl items-center">
          <div className="w-full border bg-card">
            <div className="border-b p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                    Fragen beantworten
                  </p>
                  <h2 className="mt-1 font-heading text-2xl font-semibold">
                    {currentQuestion.title ||
                      `Frage ${currentQuestionIndex + 1}`}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Frage {currentQuestionIndex + 1} von {data.questions.length}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={resetFlow}>
                  <RotateCcw />
                  Zurücksetzen
                </Button>
              </div>
              <Progress value={progress} />
            </div>

            <div className="p-5">
              <div className="mb-5 flex items-start gap-3">
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
                        "flex h-12 items-center justify-center gap-2 border text-xs font-semibold tracking-widest uppercase transition hover:bg-muted",
                        currentAnswer?.value === option.value &&
                          "bg-foreground text-background hover:bg-foreground hover:text-background"
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
                onClick={() =>
                  setCurrentQuestionIndex((index) => Math.max(0, index - 1))
                }
                disabled={currentQuestionIndex === 0}
              >
                <ArrowLeft />
                Zurück
              </Button>
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
        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-12rem)] w-full max-w-4xl items-center">
          <div className="w-full border bg-card">
            <div className="border-b p-5">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Gewichtungen wählen
              </p>
              <h2 className="mt-1 font-heading text-2xl font-semibold">
                Wichtige Antworten gewichten
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {weightedQuestions.length === 0
                  ? "Keine Fragen sind gewichtet."
                  : `${weightedQuestions.length} ${
                      weightedQuestions.length === 1 ? "Frage" : "Fragen"
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
                        "grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 p-4 text-left transition hover:bg-muted",
                        answer?.doubled && "bg-muted"
                      )}
                      onClick={() =>
                        setAnswers((current) => ({
                          ...current,
                          [question._id]: {
                            value: current[question._id]?.value ?? "neutral",
                            doubled: !current[question._id]?.doubled,
                          },
                        }))
                      }
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
                          "flex h-9 items-center gap-2 border px-3 text-xs font-semibold tracking-widest uppercase",
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
                <Button onClick={() => setStage("results")}>
                  <BarChart3 />
                  Ergebnisse anzeigen
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {stage === "results" ? (
        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-12rem)] w-full max-w-4xl items-center">
          <div className="w-full border bg-card">
            <div className="border-b p-5">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Ergebnisse anzeigen
              </p>
              <h2 className="mt-1 font-heading text-2xl font-semibold">
                Beste Übereinstimmung
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {answeredCount} von {data.questions.length} Fragen beantwortet,
                davon {weightedQuestions.length} gewichtet.
              </p>
            </div>
            <div className="divide-y">
              {results.map(({ party, match }, index) => (
                <article key={party._id}>
                  <button
                    className={cn(
                      "grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 p-4 text-left transition hover:bg-muted",
                      expandedPartyId === party._id && "bg-muted"
                    )}
                    aria-expanded={expandedPartyId === party._id}
                    onClick={() =>
                      setExpandedPartyId((current) =>
                        current === party._id ? null : party._id
                      )
                    }
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
                            className="size-8 shrink-0 border object-cover"
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
                          className="h-full bg-foreground"
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
                    <div className="border-t bg-muted/30 p-5">
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
              <Button variant="outline" onClick={resetFlow}>
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

function formatAnswerValue(value: AnswerValue | undefined) {
  return answerOptions.find((option) => option.value === value)?.label ?? ""
}
