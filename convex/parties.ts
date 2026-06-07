import { v } from "convex/values"
import { mutation } from "./_generated/server"
import {
  colors,
  deleteQuestionnaireAnswers,
  requireImageStorage,
  requireOmatAccess,
} from "./omatShared"

export const addParty = mutation({
  args: {
    omatId: v.id("omats"),
    name: v.string(),
    shortName: v.string(),
    description: v.string(),
    color: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireOmatAccess(ctx, args.omatId)
    if (args.logoStorageId) {
      await requireImageStorage(ctx, args.logoStorageId)
    }
    const parties = await ctx.db
      .query("parties")
      .withIndex("by_omatId", (q) => q.eq("omatId", args.omatId))
      .collect()
    const now = Date.now()
    const partyId = await ctx.db.insert("parties", {
      omatId: args.omatId,
      name: args.name.trim(),
      shortName: args.shortName.trim(),
      color: args.color?.trim() || colors[parties.length % colors.length],
      description: args.description.trim(),
      logoStorageId: args.logoStorageId,
      createdAt: now,
    })
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_omatId_and_order", (q) => q.eq("omatId", args.omatId))
      .collect()
    for (const question of questions) {
      await ctx.db.insert("partyPositions", {
        omatId: args.omatId,
        partyId,
        questionId: question._id,
        stance: "neutral",
        explanation: "",
        updatedAt: now,
      })
    }
    return partyId
  },
})

export const updateParty = mutation({
  args: {
    partyId: v.id("parties"),
    name: v.string(),
    shortName: v.string(),
    color: v.string(),
    description: v.string(),
    logoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const party = await ctx.db.get(args.partyId)
    if (!party) {
      throw new Error("Partei nicht gefunden")
    }
    await requireOmatAccess(ctx, party.omatId)
    if (args.logoStorageId) {
      await requireImageStorage(ctx, args.logoStorageId)
    }
    await ctx.db.patch(args.partyId, {
      name: args.name.trim(),
      shortName: args.shortName.trim(),
      color: args.color.trim(),
      description: args.description.trim(),
      logoStorageId: args.logoStorageId,
    })
    if (
      party.logoStorageId &&
      args.logoStorageId &&
      party.logoStorageId !== args.logoStorageId
    ) {
      await ctx.storage.delete(party.logoStorageId)
    }
  },
})

export const setPartyLogo = mutation({
  args: {
    partyId: v.id("parties"),
    storageId: v.union(v.id("_storage"), v.null()),
  },
  handler: async (ctx, args) => {
    const party = await ctx.db.get(args.partyId)
    if (!party) {
      throw new Error("Partei nicht gefunden")
    }
    await requireOmatAccess(ctx, party.omatId)
    if (args.storageId) {
      await requireImageStorage(ctx, args.storageId)
    }
    await ctx.db.patch(args.partyId, {
      logoStorageId: args.storageId ?? undefined,
    })
    if (party.logoStorageId && party.logoStorageId !== args.storageId) {
      await ctx.storage.delete(party.logoStorageId)
    }
  },
})

export const deleteParty = mutation({
  args: {
    partyId: v.id("parties"),
  },
  handler: async (ctx, args) => {
    const party = await ctx.db.get(args.partyId)
    if (!party) {
      return null
    }
    await requireOmatAccess(ctx, party.omatId)
    const positions = await ctx.db
      .query("partyPositions")
      .withIndex("by_partyId_and_questionId", (q) =>
        q.eq("partyId", args.partyId)
      )
      .collect()
    for (const position of positions) {
      await ctx.db.delete(position._id)
    }
    const questionnaireAnswers = await ctx.db
      .query("questionnaireAnswers")
      .withIndex("by_partyId_and_questionId", (q) =>
        q.eq("partyId", args.partyId)
      )
      .collect()
    for (const answer of questionnaireAnswers) {
      await ctx.db.delete(answer._id)
    }
    const questionnaires = await ctx.db
      .query("questionnaires")
      .withIndex("by_partyId", (q) => q.eq("partyId", args.partyId))
      .collect()
    for (const questionnaire of questionnaires) {
      await deleteQuestionnaireAnswers(ctx, questionnaire._id)
      await ctx.db.delete(questionnaire._id)
    }
    await ctx.db.delete(args.partyId)
    return null
  },
})
