import { OmatEditorPage } from "@/components/omat/omat-editor-page"

export default async function Page({
  params,
}: {
  params: Promise<{ omatRef: string }>
}) {
  const { omatRef } = await params

  return <OmatEditorPage omatRef={omatRef} />
}
