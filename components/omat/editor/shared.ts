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

type UploadKind = "background" | "partyLogo"
type BackgroundUploadMode = "standard" | "premium4k"
type GetConvexToken = () => Promise<string | null>

export async function uploadBackgroundFile(
  getToken: GetConvexToken,
  file: File,
  mode: BackgroundUploadMode = "standard"
) {
  return await uploadWebpImageFile(getToken, file, "background", {
    mode,
    maxBytes: mode === "premium4k" ? null : 1024 * 1024,
    maxWidth: mode === "premium4k" ? null : 1920,
    maxHeight: mode === "premium4k" ? null : 1080,
  })
}

export async function uploadPartyLogoFile(
  getToken: GetConvexToken,
  file: File
) {
  return await uploadWebpImageFile(getToken, file, "partyLogo", {
    mode: "standard",
    maxBytes: 100 * 1024,
    maxWidth: 512,
    maxHeight: 512,
  })
}

async function uploadWebpImageFile(
  getToken: GetConvexToken,
  file: File,
  kind: UploadKind,
  compression: {
    mode: BackgroundUploadMode
    maxBytes: number | null
    maxWidth: number | null
    maxHeight: number | null
  }
) {
  const uploadUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL
  if (!uploadUrl) {
    throw new Error("Upload-Endpunkt ist nicht konfiguriert")
  }

  const token = await getToken()
  if (!token) {
    throw new Error("Nicht angemeldet")
  }

  const webp = await compressImageToWebp(file, compression)
  const imageUploadUrl = new URL(`${uploadUrl}/upload/image`)
  imageUploadUrl.searchParams.set("kind", kind)
  if (kind === "background") {
    imageUploadUrl.searchParams.set("mode", compression.mode)
  }

  const result = await fetch(imageUploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "image/webp",
    },
    body: webp,
  })
  const body = (await result.json()) as {
    storageId?: Id<"_storage">
    error?: string
  }
  if (!result.ok || !body.storageId) {
    throw new Error(body.error ?? "Upload fehlgeschlagen")
  }
  return body.storageId
}

async function compressImageToWebp(
  file: File,
  options: {
    maxBytes: number | null
    maxWidth: number | null
    maxHeight: number | null
  }
) {
  const { image, release } = await loadImage(file)
  try {
    const scale = Math.min(
      1,
      options.maxWidth ? options.maxWidth / image.naturalWidth : 1,
      options.maxHeight ? options.maxHeight / image.naturalHeight : 1
    )
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext("2d")
    if (!context) {
      throw new Error("Bild konnte nicht komprimiert werden")
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    if (options.maxBytes === null) {
      return await canvasToWebpBlob(canvas, 0.9)
    }

    for (const quality of [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42]) {
      const blob = await canvasToWebpBlob(canvas, quality)
      if (blob.size <= options.maxBytes) {
        return blob
      }
    }

    throw new Error(
      `Bild konnte nicht unter ${formatFileSize(options.maxBytes)} komprimiert werden`
    )
  } finally {
    release()
  }
}

export async function getImageDimensions(file: File) {
  const { image, release } = await loadImage(file)
  try {
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
    }
  } finally {
    release()
  }
}

async function loadImage(file: File) {
  const objectUrl = URL.createObjectURL(file)
  const image = new window.Image()
  image.decoding = "async"
  image.src = objectUrl
  await image.decode()
  return {
    image,
    release: () => URL.revokeObjectURL(objectUrl),
  }
}

function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("WebP-Komprimierung wird nicht unterstützt"))
          return
        }
        if (blob.type !== "image/webp") {
          reject(new Error("WebP-Komprimierung wird nicht unterstützt"))
          return
        }
        resolve(blob)
      },
      "image/webp",
      quality
    )
  })
}

function formatFileSize(bytes: number) {
  return bytes % (1024 * 1024) === 0
    ? `${bytes / (1024 * 1024)} MB`
    : `${Math.round(bytes / 1024)} KB`
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

export async function optimizeBackgroundImageFile(file: File) {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file
  }

  const image = await loadImageFile(file)
  const targetRatio = 16 / 9
  const maxWidth = 1920
  const maxHeight = 1080
  const sourceWidth = image.naturalWidth || image.width
  const sourceHeight = image.naturalHeight || image.height
  const sourceRatio = sourceWidth / sourceHeight
  const cropWidth =
    sourceRatio > targetRatio
      ? Math.round(sourceHeight * targetRatio)
      : sourceWidth
  const cropHeight =
    sourceRatio > targetRatio
      ? sourceHeight
      : Math.round(sourceWidth / targetRatio)
  const cropX = Math.max(0, Math.round((sourceWidth - cropWidth) / 2))
  const cropY = Math.max(0, Math.round((sourceHeight - cropHeight) / 2))
  const scale = Math.min(1, maxWidth / cropWidth, maxHeight / cropHeight)
  const width = Math.max(1, Math.round(cropWidth * scale))
  const height = Math.max(1, Math.round(cropHeight * scale))
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")

  if (!context) {
    return file
  }

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = "high"
  context.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    width,
    height
  )

  const optimizedBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", 0.82)
  })

  if (!optimizedBlob) {
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
