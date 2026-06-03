"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, ClipboardList } from "lucide-react"
import { useMutation, useQuery } from "convex/react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import { type Doc, type Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { type EditorData, type Stance } from "../types"
import { getStanceLabel, stanceOptions } from "./shared"

export function AnswersPage({ editor }: { editor: NonNullable<EditorData> }) {
  const setPosition = useMutation(api.positions.setPosition)
  const questionnaireAnswers = useQuery(
    api.questionnaires.listQuestionnaireAnswersForReview,
    { omatId: editor.omat._id }
  )
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
  const questionnaireAnswerByKey = useMemo(
    () =>
      new Map(
        (questionnaireAnswers ?? []).map((answer) => [
          `${answer.partyId}:${answer.questionId}`,
          answer,
        ])
      ),
    [questionnaireAnswers]
  )
  const getExplanationDraft = (
    key: string,
    position: Doc<"partyPositions"> | undefined
  ) => explanationDrafts[key] ?? position?.explanation ?? ""

  async function acceptQuestionnaireAnswer(args: {
    key: string
    partyId: Id<"parties">
    questionId: Id<"questions">
    stance: Stance
    explanation: string
  }) {
    setExplanationDrafts((current) => ({
      ...current,
      [args.key]: args.explanation,
    }))
    await setPosition({
      omatId: editor.omat._id,
      partyId: args.partyId,
      questionId: args.questionId,
      stance: args.stance,
      explanation: args.explanation,
    })
  }

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
                const questionnaireAnswer =
                  questionnaireAnswerByKey.get(positionKey)
                const questionnaireStance = questionnaireAnswer?.stance
                const isSubmittedQuestionnaireAnswer =
                  questionnaireAnswer?.questionnaireStatus === "submitted"
                const isClosedQuestionnaireAnswer =
                  questionnaireAnswer?.questionnaireStatus === "closed"
                const explanation = getExplanationDraft(positionKey, position)
                return (
                  <td key={party._id} className="min-w-56 p-3">
                    {questionnaireAnswer ? (
                      <div className="mb-3 border bg-muted/40 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="inline-flex items-center gap-2 text-[0.65rem] font-semibold tracking-widest text-muted-foreground uppercase">
                            <ClipboardList className="size-3" />
                            {isSubmittedQuestionnaireAnswer
                              ? "Fragebogen"
                              : isClosedQuestionnaireAnswer
                                ? "Geschlossen"
                                : "Vorläufig"}
                          </div>
                          {questionnaireStance ? (
                            <span className="border px-2 py-1 text-[0.65rem] font-semibold tracking-widest uppercase">
                              {getStanceLabel(questionnaireStance)}
                            </span>
                          ) : (
                            <span className="border px-2 py-1 text-[0.65rem] font-semibold tracking-widest text-muted-foreground uppercase">
                              Ohne Position
                            </span>
                          )}
                        </div>
                        {questionnaireAnswer.explanation ? (
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            {questionnaireAnswer.explanation}
                          </p>
                        ) : (
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            Noch keine Begründung gespeichert.
                          </p>
                        )}
                        {questionnaireStance ? (
                          <Button
                            type="button"
                            className="mt-3 w-full"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              acceptQuestionnaireAnswer({
                                key: positionKey,
                                partyId: party._id,
                                questionId: question._id,
                                stance: questionnaireStance,
                                explanation: questionnaireAnswer.explanation,
                              })
                            }
                          >
                            <CheckCircle2 />
                            Übernehmen
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
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
