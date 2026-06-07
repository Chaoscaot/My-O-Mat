import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  omats: defineTable({
    organizationId: v.string(),
    title: v.string(),
    slug: v.string(),
    description: v.string(),
    backgroundStorageId: v.optional(v.id("_storage")),
    colorScheme: v.optional(
      v.union(
        v.literal("civic"),
        v.literal("forest"),
        v.literal("sunset"),
        v.literal("mono")
      )
    ),
    visibility: v.optional(
      v.union(v.literal("private"), v.literal("hidden"), v.literal("public"))
    ),
    watermarksDisabled: v.optional(v.boolean()),
    legalInfo: v.optional(
      v.object({
        imprintPersons: v.array(
          v.object({
            name: v.string(),
            role: v.string(),
            street: v.string(),
            postalCode: v.string(),
            city: v.string(),
            country: v.string(),
            email: v.string(),
          })
        ),
      })
    ),
    isPublished: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organizationId", ["organizationId"])
    .index("by_slug", ["slug"])
    .index("by_isPublished", ["isPublished"]),

  parties: defineTable({
    omatId: v.id("omats"),
    name: v.string(),
    shortName: v.string(),
    color: v.string(),
    description: v.string(),
    logoStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
  }).index("by_omatId", ["omatId"]),

  questions: defineTable({
    omatId: v.id("omats"),
    title: v.optional(v.string()),
    text: v.string(),
    context: v.string(),
    order: v.number(),
    createdAt: v.number(),
  }).index("by_omatId_and_order", ["omatId", "order"]),

  partyPositions: defineTable({
    omatId: v.id("omats"),
    partyId: v.id("parties"),
    questionId: v.id("questions"),
    stance: v.union(v.literal("yes"), v.literal("neutral"), v.literal("no")),
    explanation: v.string(),
    updatedAt: v.number(),
  })
    .index("by_omatId", ["omatId"])
    .index("by_omatId_and_questionId", ["omatId", "questionId"])
    .index("by_partyId_and_questionId", ["partyId", "questionId"]),

  questionnaires: defineTable({
    omatId: v.id("omats"),
    partyId: v.id("parties"),
    token: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("submitted"),
      v.literal("closed")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    submittedAt: v.optional(v.number()),
  })
    .index("by_omatId", ["omatId"])
    .index("by_partyId", ["partyId"])
    .index("by_token", ["token"]),

  questionnaireAnswers: defineTable({
    questionnaireId: v.id("questionnaires"),
    omatId: v.id("omats"),
    partyId: v.id("parties"),
    questionId: v.id("questions"),
    stance: v.optional(
      v.union(v.literal("yes"), v.literal("neutral"), v.literal("no"))
    ),
    explanation: v.string(),
    updatedAt: v.number(),
  })
    .index("by_questionnaireId", ["questionnaireId"])
    .index("by_questionnaireId_and_questionId", [
      "questionnaireId",
      "questionId",
    ])
    .index("by_omatId", ["omatId"])
    .index("by_partyId_and_questionId", ["partyId", "questionId"]),
})
