import { v } from "convex/values"
import { mutation } from "./_generated/server"
import {
  colors,
  deleteOmatDocuments,
  ensureOrganizationForWorkspace,
  requireOmatAccess,
  slugify,
} from "./omatShared"

export const createOmat = mutation({
  args: {
    clerkOrganizationId: v.union(v.string(), v.null()),
    organizationSlug: v.optional(v.union(v.string(), v.null())),
    organizationName: v.string(),
    organizationDescription: v.string(),
    title: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const organization = await ensureOrganizationForWorkspace(ctx, {
      clerkOrganizationId: args.clerkOrganizationId,
      organizationSlug: args.organizationSlug,
      name: args.organizationName,
      description: args.organizationDescription,
    })
    const now = Date.now()
    const omatId = await ctx.db.insert("omats", {
      organizationId: organization._id,
      title: args.title.trim(),
      slug: `${slugify(args.title)}-${now.toString(36)}`,
      description: args.description.trim(),
      colorScheme: "civic",
      watermarksDisabled: false,
      visibility: "private",
      legalInfo: {
        imprintPersons: [],
      },
      isPublished: false,
      createdAt: now,
      updatedAt: now,
    })

    const partyIds = []
    for (const [index, party] of [
      ["Grüne Zukunft", "GZ", "Kommunalpolitik mit Klima zuerst"],
      ["Bürgerliche Mitte", "BM", "Pragmatische Agenda der Mitte"],
      ["Lokal Wirkt", "LW", "Fokus auf kommunale Dienste und Mittelstand"],
    ].entries()) {
      partyIds.push(
        await ctx.db.insert("parties", {
          omatId,
          name: party[0],
          shortName: party[1],
          color: colors[index],
          description: party[2],
          createdAt: now,
        })
      )
    }

    for (const [index, question] of [
      [
        "Öffentlicher Nahverkehr",
        "Der öffentliche Nahverkehr sollte ausgebaut werden, bevor neue Parkplätze entstehen.",
      ],
      [
        "Klimaprüfungen",
        "Die Stadt sollte Klimaprüfungen für größere Ausgabenentscheidungen vorschreiben.",
      ],
      [
        "Digitale Dienste",
        "Verwaltungsleistungen sollten standardmäßig zuerst digital angeboten werden.",
      ],
    ].entries()) {
      const questionId = await ctx.db.insert("questions", {
        omatId,
        title: question[0],
        text: question[1],
        context:
          "Startfrage. Ersetze sie durch eine These für deinen eigenen O-Mat.",
        order: index,
        createdAt: now,
      })
      for (const [partyIndex, partyId] of partyIds.entries()) {
        const stances = ["yes", "neutral", "no"] as const
        await ctx.db.insert("partyPositions", {
          omatId,
          partyId,
          questionId,
          stance: stances[(index + partyIndex) % stances.length],
          explanation: "Startposition für die Demo-Matrix.",
          updatedAt: now,
        })
      }
    }

    return omatId
  },
})

export const deleteOmat = mutation({
  args: {
    omatId: v.id("omats"),
  },
  handler: async (ctx, args) => {
    await requireOmatAccess(ctx, args.omatId)
    await deleteOmatDocuments(ctx, args.omatId)
  },
})
