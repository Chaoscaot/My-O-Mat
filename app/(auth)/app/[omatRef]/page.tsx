import { OmatEditorPage } from "@/components/omat/omat-editor-page"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "O-Mat bearbeiten",
}

export default async function Page({
  params,
}: {
  params: Promise<{ omatRef: string }>
}) {
  const { omatRef } = await params

  return <OmatEditorPage omatRef={omatRef} />
}
