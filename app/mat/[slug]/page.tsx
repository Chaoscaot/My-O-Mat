import { OmatRunnerPage } from "@/components/omat/omat-runner-page"
import { api } from "@/convex/_generated/api"
import { preloadQuery } from "convex/nextjs"

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const preloaded = await preloadQuery(api.omats.getPublished, { slug })

  return <OmatRunnerPage preload={preloaded} />
}
