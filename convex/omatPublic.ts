import { v } from "convex/values"
import { query } from "./_generated/server"
import {
  getOmatVisibility,
  getRunnerData,
  hasOrganizationAccess,
  normalizeSlug,
} from "./omatShared"

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("omats")
      .withIndex("by_isPublished", (q) => q.eq("isPublished", true))
      .order("desc")
      .take(20)
  },
})

export const getPublished = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const omat = await ctx.db
      .query("omats")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique()
    if (!omat || !omat.isPublished) {
      return null
    }
    if (getOmatVisibility(omat) !== "public") {
      return null
    }
    return await getRunnerData(ctx, omat)
  },
})

export const getHiddenPreview = query({
  args: { ref: v.string() },
  handler: async (ctx, args) => {
    const omatId = ctx.db.normalizeId("omats", args.ref)
    const omat = omatId ? await ctx.db.get(omatId) : null
    if (!omat || getOmatVisibility(omat) !== "hidden") {
      return null
    }
    return await getRunnerData(ctx, omat)
  },
})

export const getOrganizationPreview = query({
  args: { orgSlug: v.string(), omatRef: v.string() },
  handler: async (ctx, args) => {
    const omatId = ctx.db.normalizeId("omats", args.omatRef)
    const omat = omatId ? await ctx.db.get(omatId) : null
    if (!omat) {
      return null
    }

    const identity = await ctx.auth.getUserIdentity()
    const organization = await ctx.db.get(omat.organizationId)
    if (
      !identity ||
      !organization ||
      !hasOrganizationAccess(identity, organization)
    ) {
      return null
    }
    const organizationSlug =
      organization.slug ?? normalizeSlug(organization.name)
    if (organizationSlug !== normalizeSlug(args.orgSlug)) {
      return null
    }
    return await getRunnerData(ctx, omat)
  },
})
