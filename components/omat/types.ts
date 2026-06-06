import { type Doc } from "@/convex/_generated/dataModel"

export type AnswerValue = "yes" | "neutral" | "no" | "skip"
export type Stance = "yes" | "neutral" | "no"
export type AnswerState = Record<
  string,
  { value: AnswerValue; doubled: boolean }
>

export type DashboardData = { omats: Doc<"omats">[] } | null | undefined

export type RunnerData =
  | {
      omat: Doc<"omats"> & { backgroundUrl: string | null }
      parties: (Doc<"parties"> & { logoUrl: string | null })[]
      questions: Doc<"questions">[]
      positions: Doc<"partyPositions">[]
    }
  | null
  | undefined

export type EditorData = RunnerData | null | undefined
