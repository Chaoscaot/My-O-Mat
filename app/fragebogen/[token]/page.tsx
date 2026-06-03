import { QuestionnairePage } from "@/components/omat/questionnaire-page"
import type { Metadata } from "next"

type PageProps = {
  params: Promise<{ token: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params

  return {
    title: `Fragebogen: ${token.slice(0, 8)}`,
  }
}

export default async function Page({ params }: PageProps) {
  const { token } = await params

  return <QuestionnairePage token={token} />
}
