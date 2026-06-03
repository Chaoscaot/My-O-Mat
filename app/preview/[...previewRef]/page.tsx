import {
  HiddenOmatPreviewPage,
  OrganizationOmatPreviewPage,
} from "@/components/omat/omat-preview-page"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

type PageProps = {
  params: Promise<{ previewRef: string[] }>
}

function parsePreviewRef(previewRef: string[]) {
  if (previewRef.length === 1) {
    return { kind: "hidden" as const, omatRef: previewRef[0] }
  }
  if (previewRef.length === 2) {
    return {
      kind: "organization" as const,
      orgSlug: previewRef[0],
      omatRef: previewRef[1],
    }
  }
  return null
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { previewRef } = await params
  const parsed = parsePreviewRef(previewRef)

  return {
    title: parsed
      ? `O-Mat Vorschau: ${previewRef.join("/")}`
      : "O-Mat Vorschau",
  }
}

export default async function Page({ params }: PageProps) {
  const { previewRef } = await params
  const parsed = parsePreviewRef(previewRef)

  if (!parsed) {
    notFound()
  }

  if (parsed.kind === "hidden") {
    return <HiddenOmatPreviewPage omatRef={parsed.omatRef} />
  }

  return (
    <OrganizationOmatPreviewPage
      orgSlug={parsed.orgSlug}
      omatRef={parsed.omatRef}
    />
  )
}
