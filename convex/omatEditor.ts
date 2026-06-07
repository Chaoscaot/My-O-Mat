import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import {
  assertPublishableLegalInfo,
  assertUniqueSlug,
  colorSchemeValidator,
  getActiveOrganizationPlan,
  legalInfoValidator,
  normalizeLegalInfo,
  normalizeSlug,
  requireImageStorage,
  requireIdentity,
  requireOmatAccess,
  requireWorkspaceAccess,
  visibilityValidator,
  withAssetUrls,
} from "./omatShared"

export const getEditor = query({
  args: { omatId: v.id("omats") },
  handler: async (ctx, args) => {
    const { omat, workspace } = await requireOmatAccess(ctx, args.omatId)
    const parties = await ctx.db
      .query("parties")
      .withIndex("by_omatId", (q) => q.eq("omatId", args.omatId))
      .collect()
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_omatId_and_order", (q) => q.eq("omatId", args.omatId))
      .collect()
    const positions = await ctx.db
      .query("partyPositions")
      .withIndex("by_omatId", (q) => q.eq("omatId", args.omatId))
      .collect()

    const assets = await withAssetUrls(ctx, omat, parties)
    return {
      workspace,
      omat: assets.omat,
      parties: assets.parties,
      questions,
      positions,
    }
  },
})

export const getEditorByRef = query({
  args: { ref: v.string() },
  handler: async (ctx, args) => {
    const omatId = ctx.db.normalizeId("omats", args.ref)
    let omat = omatId ? await ctx.db.get(omatId) : null

    if (!omat) {
      omat = await ctx.db
        .query("omats")
        .withIndex("by_slug", (q) => q.eq("slug", args.ref))
        .unique()
    }

    if (!omat) {
      return null
    }

    const workspace = await requireWorkspaceAccess(ctx, omat.organizationId)
    const parties = await ctx.db
      .query("parties")
      .withIndex("by_omatId", (q) => q.eq("omatId", omat._id))
      .collect()
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_omatId_and_order", (q) => q.eq("omatId", omat._id))
      .collect()
    const positions = await ctx.db
      .query("partyPositions")
      .withIndex("by_omatId", (q) => q.eq("omatId", omat._id))
      .collect()

    const assets = await withAssetUrls(ctx, omat, parties)
    return {
      workspace,
      omat: assets.omat,
      parties: assets.parties,
      questions,
      positions,
    }
  },
})

export const updateOmat = mutation({
  args: {
    omatId: v.id("omats"),
    title: v.string(),
    description: v.string(),
    isPublished: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { omat } = await requireOmatAccess(ctx, args.omatId)
    const legalInfo =
      omat.legalInfo ??
      normalizeLegalInfo({
        imprintPersons: [],
      })
    if (args.isPublished) {
      assertPublishableLegalInfo(legalInfo)
    }
    await ctx.db.patch(args.omatId, {
      title: args.title.trim(),
      description: args.description.trim(),
      isPublished: args.isPublished,
      visibility: args.isPublished ? "public" : "private",
      updatedAt: Date.now(),
    })
  },
})

export const updateOmatSettings = mutation({
  args: {
    omatId: v.id("omats"),
    title: v.string(),
    description: v.string(),
    slug: v.string(),
    colorScheme: colorSchemeValidator,
    eyeCandyDisabled: v.boolean(),
    watermarksDisabled: v.boolean(),
    legalInfo: legalInfoValidator,
    visibility: visibilityValidator,
    isPublished: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireOmatAccess(ctx, args.omatId)
    const identity = await requireIdentity(ctx)
    const plan = getActiveOrganizationPlan(identity)
    if (args.watermarksDisabled && plan !== "premium") {
      throw new Error(
        "Wasserzeichen können nur in Premium-Organisationen deaktiviert werden"
      )
    }
    const slug = normalizeSlug(args.slug)
    await assertUniqueSlug(ctx, slug, args.omatId)
    const legalInfo = normalizeLegalInfo(args.legalInfo)
    if (args.visibility !== "private") {
      assertPublishableLegalInfo(legalInfo)
    }
    await ctx.db.patch(args.omatId, {
      title: args.title.trim(),
      description: args.description.trim(),
      slug,
      colorScheme: args.colorScheme,
      eyeCandyDisabled: args.eyeCandyDisabled,
      watermarksDisabled: args.watermarksDisabled && plan === "premium",
      legalInfo,
      visibility: args.visibility,
      isPublished: args.visibility === "public",
      updatedAt: Date.now(),
    })
  },
})

export const setOmatBackground = mutation({
  args: {
    omatId: v.id("omats"),
    storageId: v.union(v.id("_storage"), v.null()),
  },
  handler: async (ctx, args) => {
    const { omat } = await requireOmatAccess(ctx, args.omatId)
    if (args.storageId) {
      await requireImageStorage(ctx, args.storageId)
    }
    await ctx.db.patch(args.omatId, {
      backgroundStorageId: args.storageId ?? undefined,
      updatedAt: Date.now(),
    })
    if (
      omat.backgroundStorageId &&
      omat.backgroundStorageId !== args.storageId
    ) {
      await ctx.storage.delete(omat.backgroundStorageId)
    }
  },
})
