import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  organizations: defineTable({
    name: v.string(),
    description: v.string(),
    clerkWorkspaceId: v.optional(v.string()),
    clerkOrganizationId: v.optional(v.string()),
    plan: v.optional(v.union(v.literal("free"), v.literal("premium"))),
    ownerTokenIdentifier: v.string(),
    createdAt: v.number(),
  })
    .index("by_ownerTokenIdentifier", ["ownerTokenIdentifier"])
    .index("by_clerkWorkspaceId", ["clerkWorkspaceId"]),

  omats: defineTable({
    organizationId: v.id("organizations"),
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
})
