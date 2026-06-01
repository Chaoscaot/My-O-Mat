"use client"

import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs"
import { BookOpenCheck } from "lucide-react"
import Link from "next/link"

export function AuthNav() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return <div className="h-9 w-24 border bg-muted/40" aria-hidden />
  }

  if (isSignedIn) {
    return (
      <>
        <Link
          className="h-9 border px-4 py-2 text-xs font-semibold tracking-widest uppercase"
          href="/app"
        >
          Arbeitsbereich
        </Link>
        <UserButton />
      </>
    )
  }

  return (
    <>
      <SignInButton>
        <button className="h-9 border px-4 text-xs font-semibold tracking-widest uppercase">
          Anmelden
        </button>
      </SignInButton>
      <SignUpButton>
        <button className="inline-flex h-9 items-center gap-2 bg-foreground px-4 text-xs font-semibold tracking-widest text-background uppercase">
          <BookOpenCheck className="size-3.5" />
          Registrieren
        </button>
      </SignUpButton>
    </>
  )
}
