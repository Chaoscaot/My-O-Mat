import {
  CircleSlash,
  ClipboardList,
  Eye,
  FileQuestion,
  Pencil,
  Settings,
} from "lucide-react"

import { type Doc, type Id } from "@/convex/_generated/dataModel"
import { type Stance } from "../types"

export type EditorTab =
  | "questions"
  | "parties"
  | "questionnaires"
  | "answers"
  | "preview"
  | "settings"
export type ColorScheme = "civic" | "forest" | "sunset" | "mono"
export type OmatVisibility = "private" | "hidden" | "public"
export type QuestionFormState = {
  title: string
  text: string
  context: string
}
export type QuestionDoc = Doc<"questions">
export type QuestionDragState = {
  questionId: Id<"questions">
  pointerId: number
  pointerY: number
  pointerOffsetY: number
  itemHeight: number
  listRect: DOMRect
  itemRect: DOMRect
  sourceIndex: number
  targetIndex: number
}
export type PartyFormState = {
  name: string
  shortName: string
  description: string
  color: string
  logoStorageId?: Id<"_storage">
}
export type ImprintPersonFormState = {
  name: string
  role: string
  street: string
  postalCode: string
  city: string
  country: string
  email: string
}
export type LegalInfoFormState = {
  imprintPersons: ImprintPersonFormState[]
}

export function isPremiumPlan(value: unknown) {
  return typeof value === "string" && value.toLowerCase() === "premium"
}

export function slugifyUrlPart(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "omat"
  )
}

export const stanceOptions: { value: Stance; label: string }[] = [
  { value: "yes", label: "Ja" },
  { value: "neutral", label: "Neutral" },
  { value: "no", label: "Nein" },
]

export function getStanceLabel(stance: Stance) {
  return (
    stanceOptions.find((option) => option.value === stance)?.label ?? stance
  )
}

export const colorSchemes: {
  value: ColorScheme
  label: string
  swatches: string[]
}[] = [
  { value: "civic", label: "Bürgerlich", swatches: ["#334155", "#f59e0b"] },
  { value: "forest", label: "Wald", swatches: ["#166534", "#84cc16"] },
  {
    value: "sunset",
    label: "Sonnenuntergang",
    swatches: ["#be123c", "#f97316"],
  },
  { value: "mono", label: "Mono", swatches: ["#18181b", "#a1a1aa"] },
]

export const visibilityOptions: {
  value: OmatVisibility
  label: string
  description: string
}[] = [
  {
    value: "private",
    label: "Privat",
    description: "Nur Mitglieder der Organisation über /preview/{org}/{id}.",
  },
  {
    value: "hidden",
    label: "Versteckt",
    description: "Alle mit Link können ihn über /preview/{id} öffnen.",
  },
  {
    value: "public",
    label: "Öffentlich",
    description: "Öffentlich über /mat/{slug}.",
  },
]

export const emptyImprintPerson: ImprintPersonFormState = {
  name: "",
  role: "",
  street: "",
  postalCode: "",
  city: "",
  country: "Deutschland",
  email: "",
}

export const editorTabs: {
  value: EditorTab
  label: string
  icon: typeof FileQuestion
}[] = [
  { value: "questions", label: "Thesen", icon: FileQuestion },
  { value: "parties", label: "Parteien", icon: CircleSlash },
  { value: "questionnaires", label: "Fragebogen", icon: ClipboardList },
  { value: "answers", label: "Antworten", icon: Pencil },
  { value: "preview", label: "Vorschau", icon: Eye },
  { value: "settings", label: "Einstellungen", icon: Settings },
]

export async function uploadFile(
  generateUploadUrl: (args: Record<string, never>) => Promise<string>,
  file: File
) {
  const uploadUrl = await generateUploadUrl({})
  const result = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  })
  if (!result.ok) {
    throw new Error("Upload fehlgeschlagen")
  }
  const { storageId } = (await result.json()) as { storageId: Id<"_storage"> }
  return storageId
}

export async function optimizePartyLogoFile(file: File) {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file
  }

  const image = await loadImageFile(file)
  const maxSize = 512
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")

  if (!context) {
    return file
  }

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = "high"
  context.drawImage(image, 0, 0, width, height)

  const optimizedBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", 0.82)
  })

  if (!optimizedBlob || optimizedBlob.size >= file.size) {
    return file
  }

  return new File([optimizedBlob], replaceFileExtension(file.name, "webp"), {
    type: "image/webp",
    lastModified: Date.now(),
  })
}

async function loadImageFile(file: File) {
  const objectUrl = URL.createObjectURL(file)
  const image = new window.Image()
  image.src = objectUrl
  try {
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function replaceFileExtension(fileName: string, extension: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "")
  return `${baseName}.${extension}`
}

export function reorderQuestionList(
  questions: QuestionDoc[],
  questionId: Id<"questions">,
  targetIndex: number
) {
  const fromIndex = questions.findIndex(
    (question) => question._id === questionId
  )
  if (fromIndex < 0) return questions

  const nextQuestions = [...questions]
  const [movedQuestion] = nextQuestions.splice(fromIndex, 1)
  nextQuestions.splice(
    Math.min(Math.max(targetIndex, 0), nextQuestions.length),
    0,
    movedQuestion
  )
  return nextQuestions
}
