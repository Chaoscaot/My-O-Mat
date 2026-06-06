"use client"

import { useQuery } from "convex/react"

import { EmptyState } from "./empty-state"
import { SignInPrompt } from "./sign-in-prompt"
import { api } from "@/convex/_generated/api"
import { EditorPanel } from "./editor/editor-panel"

export function OmatEditorPage({ omatRef }: { omatRef: string }) {
  const editor = useQuery(api.omatEditor.getEditorByRef, { ref: omatRef })

  return (
    <main className="min-h-[calc(100svh-4rem)] bg-[linear-gradient(180deg,var(--background),color-mix(in_oklch,var(--background),var(--foreground)_4%))] p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {editor ? (
          <EditorPanel editor={editor} />
        ) : (
          <EmptyState
            title="O-Mat wird geladen"
            text="Bitte warten, während dein O-Mat vorbereitet wird."
          />
        )}
      </div>
    </main>
  )
}
