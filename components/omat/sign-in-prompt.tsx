"use client"

import { SignInButton } from "@clerk/nextjs"
import { ArrowRight, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"

export function SignInPrompt() {
  return (
    <section className="border bg-card p-6">
      <Sparkles className="mb-5 size-5 text-primary" />
      <h2 className="font-heading text-3xl font-semibold">
        Melde dich an, um O-Mats zu verwalten.
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        Erstelle Organisationen, definiere Parteien, schreibe Fragen und
        veröffentliche eigene öffentliche O-Mats aus dem Arbeitsbereich.
      </p>
      <SignInButton>
        <Button className="mt-5">
          Anmelden
          <ArrowRight />
        </Button>
      </SignInButton>
    </section>
  )
}
