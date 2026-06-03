import { v } from "convex/values"
import { mutation } from "./_generated/server"
import { requireOmatAccess, upsertPartyPosition } from "./omatShared"

export const setPosition = mutation({
  args: {
    omatId: v.id("omats"),
    partyId: v.id("parties"),
    questionId: v.id("questions"),
    stance: v.union(v.literal("yes"), v.literal("neutral"), v.literal("no")),
    explanation: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOmatAccess(ctx, args.omatId)
    return await upsertPartyPosition(ctx, {
      omatId: args.omatId,
      partyId: args.partyId,
      questionId: args.questionId,
      stance: args.stance,
      explanation: args.explanation.trim(),
      updatedAt: Date.now(),
    })
  },
})
