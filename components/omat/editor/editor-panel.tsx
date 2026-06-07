"use client"

import { useState } from "react"
import { Copy, Eye } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "../empty-state"
import { RunnerPanel } from "../runner-panel"
import { type EditorData } from "../types"
import { AnswersPage } from "./answers-page"
import { PartiesPage } from "./parties-page"
import { QuestionsPage } from "./questions-page"
import { QuestionnairesPage } from "./questionnaires-page"
import { SettingsPage } from "./settings-page"
import { type EditorTab, editorTabs } from "./shared"
import { useOrganization } from "@clerk/nextjs"

export function EditorPanel({ editor }: { editor: EditorData }) {
  const [activeTab, setActiveTab] = useState<EditorTab>("questions")
  const [copied, setCopied] = useState(false)
  const { organization } = useOrganization()

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
  const privateHref = `/preview/${organization?.slug}/${editor.omat._id}`
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
              {organization?.name}
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
          <TabsContent value="questionnaires" className="p-5">
            <QuestionnairesPage editor={editor} />
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
