"use client"

import { useMemo, useState } from "react"
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Lock,
  MoreHorizontal,
  RefreshCcw,
  Send,
  Trash2,
} from "lucide-react"
import { useMutation, useQuery } from "convex/react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type Id } from "@/convex/_generated/dataModel"
import { api } from "@/convex/_generated/api"
import { EmptyState } from "../empty-state"
import { type EditorData } from "../types"

export function QuestionnairesPage({
  editor,
}: {
  editor: NonNullable<EditorData>
}) {
  const questionnaires = useQuery(api.questionnaires.listQuestionnaires, {
    omatId: editor.omat._id,
  })
  const createQuestionnaire = useMutation(
    api.questionnaires.createQuestionnaire
  )
  const resetQuestionnaire = useMutation(api.questionnaires.resetQuestionnaire)
  const removeQuestionnaire = useMutation(
    api.questionnaires.removeQuestionnaire
  )
  const closeQuestionnaire = useMutation(api.questionnaires.closeQuestionnaire)
  const [copiedPartyId, setCopiedPartyId] = useState<Id<"parties"> | null>(null)
  const [busyPartyId, setBusyPartyId] = useState<Id<"parties"> | null>(null)

  const questionnaireByPartyId = useMemo(
    () =>
      new Map(
        (questionnaires ?? []).map((questionnaire) => [
          questionnaire.partyId,
          questionnaire,
        ])
      ),
    [questionnaires]
  )

  async function ensureQuestionnaireLink(partyId: Id<"parties">) {
    const existing = questionnaireByPartyId.get(partyId)
    if (existing) return existing

    setBusyPartyId(partyId)
    try {
      return await createQuestionnaire({
        omatId: editor.omat._id,
        partyId,
      })
    } finally {
      setBusyPartyId(null)
    }
  }

  async function copyQuestionnaireLink(partyId: Id<"parties">) {
    const questionnaire = await ensureQuestionnaireLink(partyId)
    await navigator.clipboard.writeText(
      `${window.location.origin}/fragebogen/${questionnaire.token}`
    )
    setCopiedPartyId(partyId)
    window.setTimeout(() => setCopiedPartyId(null), 1600)
  }

  async function openQuestionnaireLink(partyId: Id<"parties">) {
    const questionnaire = await ensureQuestionnaireLink(partyId)
    window.open(`/fragebogen/${questionnaire.token}`, "_blank", "noreferrer")
  }

  const submittedCount =
    questionnaires?.filter(
      (questionnaire) => questionnaire.status === "submitted"
    ).length ?? 0

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-semibold">Fragebogen</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Erzeuge pro Partei einen privaten Link. Eingereichte Antworten
            werden als Fragebogen gespeichert und im Antworten-Tab zur Übernahme
            angezeigt. Entfernte Links werden ungültig, die Thesen bleiben
            erhalten.
          </p>
        </div>
        <div className="grid grid-cols-2 border text-center text-sm">
          <div className="min-w-24 border-r px-3 py-2">
            <div className="font-heading text-2xl font-semibold">
              {submittedCount}
            </div>
            <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground uppercase">
              Eingereicht
            </div>
          </div>
          <div className="min-w-24 px-3 py-2">
            <div className="font-heading text-2xl font-semibold">
              {editor.parties.length}
            </div>
            <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground uppercase">
              Parteien
            </div>
          </div>
        </div>
      </div>

      {editor.parties.length === 0 ? (
        <EmptyState
          title="Keine Parteien"
          text="Lege zuerst Parteien an, um Fragebogen-Links zu erzeugen."
        />
      ) : (
        <div className="overflow-hidden border bg-background">
          {editor.parties.map((party) => {
            const questionnaire = questionnaireByPartyId.get(party._id)
            const isSubmitted = questionnaire?.status === "submitted"
            const isClosed = questionnaire?.status === "closed"
            const isBusy = busyPartyId === party._id
            const href = questionnaire
              ? `/fragebogen/${questionnaire.token}`
              : null
            const answerCount = questionnaire?.answerCount ?? 0

            return (
              <article
                key={party._id}
                className="grid gap-3 border-b p-4 last:border-b-0 xl:grid-cols-[minmax(18rem,1fr)_minmax(28rem,1.4fr)_auto]"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className="mt-1 size-3 shrink-0 border"
                    style={{ backgroundColor: party.color }}
                  />
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h3 className="truncate font-heading text-xl font-semibold">
                        {party.name}
                      </h3>
                      <span className="border px-2 py-1 text-[0.65rem] font-semibold tracking-widest text-muted-foreground uppercase">
                        {party.shortName}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                      {isClosed ? (
                        <span className="inline-flex items-center gap-1 font-semibold tracking-widest text-muted-foreground uppercase">
                          <Lock className="size-3" />
                          Geschlossen
                        </span>
                      ) : isSubmitted ? (
                        <span className="inline-flex items-center gap-1 font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-300">
                          <CheckCircle2 className="size-3" />
                          Eingereicht
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold tracking-widest text-muted-foreground uppercase">
                          <Send className="size-3" />
                          Offen
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {answerCount}
                        </span>{" "}
                        / {editor.questions.length} Thesen
                      </span>
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="flex h-10 min-w-0 items-center border px-3 text-sm">
                      {href ? (
                        <span className="truncate font-mono text-xs text-muted-foreground">
                          {href}
                        </span>
                      ) : (
                        <span className="truncate text-muted-foreground">
                          Noch kein Fragebogen-Link erzeugt
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={href ? "outline" : "default"}
                        onClick={() => copyQuestionnaireLink(party._id)}
                        disabled={isBusy}
                      >
                        <Copy />
                        {copiedPartyId === party._id
                          ? "Kopiert"
                          : href
                            ? "Kopieren"
                            : "Link erzeugen"}
                      </Button>
                      {href ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => openQuestionnaireLink(party._id)}
                          disabled={isBusy}
                          aria-label={`Fragebogen für ${party.name} öffnen`}
                        >
                          <ExternalLink />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-start justify-end">
                  {questionnaire ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Fragebogen-Aktionen für ${party.name}`}
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!isClosed ? (
                          <>
                            <DropdownMenuItem
                              onClick={() =>
                                closeQuestionnaire({
                                  questionnaireId: questionnaire._id,
                                })
                              }
                            >
                              <Lock />
                              Link schließen
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                resetQuestionnaire({
                                  questionnaireId: questionnaire._id,
                                })
                              }
                            >
                              <RefreshCcw />
                              Zurücksetzen
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        ) : null}
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() =>
                            removeQuestionnaire({
                              questionnaireId: questionnaire._id,
                            })
                          }
                        >
                          <Trash2 />
                          Link entfernen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
