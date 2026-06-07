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
    const party = await ctx.db.get(args.partyId)
    if (!party || party.omatId !== args.omatId) {
      throw new Error("Partei gehört nicht zu diesem O-Mat")
    }
    const question = await ctx.db.get(args.questionId)
    if (!question || question.omatId !== args.omatId) {
      throw new Error("These gehört nicht zu diesem O-Mat")
    }
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
