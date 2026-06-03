"use client"

import { useAuth } from "@clerk/nextjs"
import { useConvexAuth, useQuery } from "convex/react"

import { EmptyState } from "./empty-state"
import { SignInPrompt } from "./sign-in-prompt"
import { api } from "@/convex/_generated/api"
import { EditorPanel } from "./editor/editor-panel"

export function OmatEditorPage({ omatRef }: { omatRef: string }) {
  const { isLoaded, isSignedIn } = useAuth()
  const {
    isAuthenticated: isConvexAuthenticated,
    isLoading: isConvexAuthLoading,
  } = useConvexAuth()
  const editor = useQuery(
    api.omatEditor.getEditorByRef,
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
