"use client"

import { Preloaded, usePreloadedQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import { RunnerPanel } from "./runner-panel"

export function OmatRunnerPage({
  preload,
}: {
  preload: Preloaded<typeof api.omats.getPublished>
}) {
  const data = usePreloadedQuery(preload)

  return (
    <main className="min-h-svh bg-[linear-gradient(180deg,var(--background),color-mix(in_oklch,var(--background),var(--foreground)_4%))]">
      <div className="min-h-svh">
        <RunnerPanel data={data} />
      </div>
    </main>
  )
}
