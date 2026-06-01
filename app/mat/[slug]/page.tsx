import { OmatRunnerPage } from "@/components/omat/omat-runner-page"
import { api } from "@/convex/_generated/api"
import { preloadQuery } from "convex/nextjs"
import type { Metadata } from "next"

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params

  return {
    title: `O-Mat spielen: ${slug}`,
  }
}

export default async function Page({
  params,
}: PageProps) {
  const { slug } = await params
  const preloaded = await preloadQuery(api.omats.getPublished, { slug })

  return <OmatRunnerPage preload={preloaded} />
}
