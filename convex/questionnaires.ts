import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import {
  deleteQuestionnaireAnswers,
  getOrCreateQuestionnaire,
  questionnaireAnswerValidator,
  questionnaireDraftAnswerValidator,
  requireOmatAccess,
  requireQuestionnaireByToken,
  upsertQuestionnaireAnswer,
} from "./omatShared"

export const listQuestionnaires = query({
  args: { omatId: v.id("omats") },
  handler: async (ctx, args) => {
    await requireOmatAccess(ctx, args.omatId)
    const questionnaires = await ctx.db
      .query("questionnaires")
      .withIndex("by_omatId", (q) => q.eq("omatId", args.omatId))
      .collect()
    const answers = await ctx.db
      .query("questionnaireAnswers")
      .withIndex("by_omatId", (q) => q.eq("omatId", args.omatId))
      .collect()

    return questionnaires.map((questionnaire) => ({
      ...questionnaire,
      answerCount: answers.filter(
        (answer) => answer.questionnaireId === questionnaire._id
      ).length,
    }))
  },
})

export const listQuestionnaireAnswersForReview = query({
  args: { omatId: v.id("omats") },
  handler: async (ctx, args) => {
    await requireOmatAccess(ctx, args.omatId)
    const questionnaires = await ctx.db
      .query("questionnaires")
      .withIndex("by_omatId", (q) => q.eq("omatId", args.omatId))
      .collect()
    const questionnaireById = new Map(
      questionnaires.map((questionnaire) => [questionnaire._id, questionnaire])
    )
    const answers = await ctx.db
      .query("questionnaireAnswers")
      .withIndex("by_omatId", (q) => q.eq("omatId", args.omatId))
      .collect()

    return answers
      .filter((answer) => questionnaireById.has(answer.questionnaireId))
      .map((answer) => ({
        ...answer,
        questionnaireStatus:
          questionnaireById.get(answer.questionnaireId)?.status ?? "open",
      }))
  },
})

export const createQuestionnaire = mutation({
  args: {
    omatId: v.id("omats"),
    partyId: v.id("parties"),
  },
  handler: async (ctx, args) => {
    await requireOmatAccess(ctx, args.omatId)
    const party = await ctx.db.get(args.partyId)
    if (!party || party.omatId !== args.omatId) {
      throw new Error("Partei gehört nicht zu diesem O-Mat")
    }
    return await getOrCreateQuestionnaire(ctx, args.omatId, args.partyId)
  },
})

export const resetQuestionnaire = mutation({
  args: { questionnaireId: v.id("questionnaires") },
  handler: async (ctx, args) => {
    const questionnaire = await ctx.db.get(args.questionnaireId)
    if (!questionnaire) {
      return null
    }
    await requireOmatAccess(ctx, questionnaire.omatId)
    await deleteQuestionnaireAnswers(ctx, args.questionnaireId)
    await ctx.db.patch(args.questionnaireId, {
      status: "open",
      submittedAt: undefined,
      updatedAt: Date.now(),
    })
    return null
  },
})

export const removeQuestionnaire = mutation({
  args: { questionnaireId: v.id("questionnaires") },
  handler: async (ctx, args) => {
    const questionnaire = await ctx.db.get(args.questionnaireId)
    if (!questionnaire) {
      return null
    }
    await requireOmatAccess(ctx, questionnaire.omatId)
    await deleteQuestionnaireAnswers(ctx, args.questionnaireId)
    await ctx.db.delete(args.questionnaireId)
    return null
  },
})

export const closeQuestionnaire = mutation({
  args: { questionnaireId: v.id("questionnaires") },
  handler: async (ctx, args) => {
    const questionnaire = await ctx.db.get(args.questionnaireId)
    if (!questionnaire) {
      return null
    }
    await requireOmatAccess(ctx, questionnaire.omatId)
    await ctx.db.patch(args.questionnaireId, {
      status: "closed",
      updatedAt: Date.now(),
    })
    return null
  },
})

export const getQuestionnaireByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const questionnaire = await ctx.db
      .query("questionnaires")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique()
    if (!questionnaire) {
      return null
    }

    const omat = await ctx.db.get(questionnaire.omatId)
    const party = await ctx.db.get(questionnaire.partyId)
    if (!omat || !party) {
      return null
    }

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_omatId_and_order", (q) => q.eq("omatId", omat._id))
      .collect()
    const answers = await ctx.db
      .query("questionnaireAnswers")
      .withIndex("by_questionnaireId", (q) =>
        q.eq("questionnaireId", questionnaire._id)
      )
      .collect()

    return {
      questionnaire,
      omat,
      party,
      questions,
      answers,
    }
  },
})

export const saveQuestionnaireDraft = mutation({
  args: {
    token: v.string(),
    answer: questionnaireDraftAnswerValidator,
  },
  handler: async (ctx, args) => {
    const questionnaire = await requireQuestionnaireByToken(ctx, args.token)
    if (questionnaire.status === "closed") {
      throw new Error("Dieser Fragebogen-Link ist geschlossen")
    }
    const now = Date.now()
    await upsertQuestionnaireAnswer(ctx, {
      questionnaireId: questionnaire._id,
      omatId: questionnaire.omatId,
      partyId: questionnaire.partyId,
      questionId: args.answer.questionId,
      stance: args.answer.stance ?? undefined,
      explanation: args.answer.explanation,
      updatedAt: now,
    })
    await ctx.db.patch(questionnaire._id, {
      status: "open",
      submittedAt: undefined,
      updatedAt: now,
    })
    return questionnaire._id
  },
})

export const submitQuestionnaire = mutation({
  args: {
    token: v.string(),
    answers: v.array(questionnaireAnswerValidator),
  },
  handler: async (ctx, args) => {
    const questionnaire = await requireQuestionnaireByToken(ctx, args.token)
    if (questionnaire.status === "closed") {
      throw new Error("Dieser Fragebogen-Link ist geschlossen")
    }
    const now = Date.now()
    for (const answer of args.answers) {
      await upsertQuestionnaireAnswer(ctx, {
        questionnaireId: questionnaire._id,
        omatId: questionnaire.omatId,
        partyId: questionnaire.partyId,
        questionId: answer.questionId,
        stance: answer.stance,
        explanation: answer.explanation,
        updatedAt: now,
      })
    }

    await ctx.db.patch(questionnaire._id, {
      status: "submitted",
      submittedAt: now,
      updatedAt: now,
    })
    return questionnaire._id
  },
})
