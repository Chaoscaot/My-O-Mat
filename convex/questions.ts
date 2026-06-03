import { v } from "convex/values"
import { mutation } from "./_generated/server"
import { requireOmatAccess } from "./omatShared"

export const addQuestion = mutation({
  args: {
    omatId: v.id("omats"),
    title: v.string(),
    text: v.string(),
    context: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOmatAccess(ctx, args.omatId)
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_omatId_and_order", (q) => q.eq("omatId", args.omatId))
      .collect()
    const now = Date.now()
    const questionId = await ctx.db.insert("questions", {
      omatId: args.omatId,
      title: args.title.trim(),
      text: args.text.trim(),
      context: args.context.trim(),
      order: questions.length,
      createdAt: now,
    })
    const parties = await ctx.db
      .query("parties")
      .withIndex("by_omatId", (q) => q.eq("omatId", args.omatId))
      .collect()
    for (const party of parties) {
      await ctx.db.insert("partyPositions", {
        omatId: args.omatId,
        partyId: party._id,
        questionId,
        stance: "neutral",
        explanation: "",
        updatedAt: now,
      })
    }
    return questionId
  },
})

export const updateQuestion = mutation({
  args: {
    questionId: v.id("questions"),
    title: v.string(),
    text: v.string(),
    context: v.string(),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId)
    if (!question) {
      throw new Error("These nicht gefunden")
    }
    await requireOmatAccess(ctx, question.omatId)
    await ctx.db.patch(args.questionId, {
      title: args.title.trim(),
      text: args.text.trim(),
      context: args.context.trim(),
    })
  },
})

export const deleteQuestion = mutation({
  args: {
    questionId: v.id("questions"),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId)
    if (!question) {
      return null
    }
    await requireOmatAccess(ctx, question.omatId)

    const positions = await ctx.db
      .query("partyPositions")
      .withIndex("by_omatId_and_questionId", (q) =>
        q.eq("omatId", question.omatId).eq("questionId", args.questionId)
      )
      .collect()
    for (const position of positions) {
      await ctx.db.delete(position._id)
    }

    const questionnaireAnswers = await ctx.db
      .query("questionnaireAnswers")
      .withIndex("by_omatId", (q) => q.eq("omatId", question.omatId))
      .filter((q) => q.eq(q.field("questionId"), args.questionId))
      .collect()
    for (const answer of questionnaireAnswers) {
      await ctx.db.delete(answer._id)
    }

    await ctx.db.delete(args.questionId)

    const remainingQuestions = await ctx.db
      .query("questions")
      .withIndex("by_omatId_and_order", (q) => q.eq("omatId", question.omatId))
      .collect()
    for (const [index, item] of remainingQuestions.entries()) {
      if (item.order !== index) {
        await ctx.db.patch(item._id, { order: index })
      }
    }
    return null
  },
})

export const reorderQuestions = mutation({
  args: {
    omatId: v.id("omats"),
    questionIds: v.array(v.id("questions")),
  },
  handler: async (ctx, args) => {
    await requireOmatAccess(ctx, args.omatId)
    for (const [index, questionId] of args.questionIds.entries()) {
      const question = await ctx.db.get(questionId)
      if (!question || question.omatId !== args.omatId) {
        throw new Error("These gehört nicht zu diesem O-Mat")
      }
      await ctx.db.patch(questionId, { order: index })
    }
  },
})
