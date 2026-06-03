import { v } from "convex/values"
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"
import { type Id } from "./_generated/dataModel"

const colors = ["#0f766e", "#b91c1c", "#4338ca", "#a16207", "#be185d"]
const personalWorkspacePrefix = "personal:"
const organizationWorkspacePrefix = "org:"

const colorSchemeValidator = v.union(
  v.literal("civic"),
  v.literal("forest"),
  v.literal("sunset"),
  v.literal("mono")
)
const imprintPersonValidator = v.object({
  name: v.string(),
  role: v.string(),
  street: v.string(),
  postalCode: v.string(),
  city: v.string(),
  country: v.string(),
  email: v.string(),
})
const legalInfoValidator = v.object({
  imprintPersons: v.array(imprintPersonValidator),
})
type OrganizationPlan = "free" | "premium"

async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error("Nicht angemeldet")
  }
  return identity
}

function getActiveOrganizationClaim(
  identity: Awaited<ReturnType<typeof requireIdentity>>
) {
  const orgId = identity.org_id
  return typeof orgId === "string" ? orgId : null
}

function getActiveOrganizationPlan(
  identity: Awaited<ReturnType<typeof requireIdentity>>
): OrganizationPlan {
  if (!getActiveOrganizationClaim(identity)) {
    return "free"
  }

  const plan = identity.org_plan
  return typeof plan === "string" && plan.toLowerCase() === "premium"
    ? "premium"
    : "free"
}

function getWorkspaceId(
  identity: Awaited<ReturnType<typeof requireIdentity>>,
  clerkOrganizationId: string | null
) {
  if (!clerkOrganizationId) {
    return {
      clerkWorkspaceId: `${personalWorkspacePrefix}${identity.tokenIdentifier}`,
      clerkOrganizationId: undefined,
    }
  }

  const activeOrganizationId = getActiveOrganizationClaim(identity)
  if (activeOrganizationId !== clerkOrganizationId) {
    throw new Error(
      "Die aktive Clerk-Organisation fehlt im Convex-JWT. Ergänze im Clerk-JWT-Template convex den Claim org_id mit {{org.id}}."
    )
  }

  return {
    clerkWorkspaceId: `${organizationWorkspacePrefix}${clerkOrganizationId}`,
    clerkOrganizationId,
  }
}

async function getOrganizationByWorkspaceId(
  ctx: QueryCtx | MutationCtx,
  clerkWorkspaceId: string
) {
  return await ctx.db
    .query("organizations")
    .withIndex("by_clerkWorkspaceId", (q) =>
      q.eq("clerkWorkspaceId", clerkWorkspaceId)
    )
    .unique()
}

async function ensureOrganizationForWorkspace(
  ctx: MutationCtx,
  args: {
    clerkOrganizationId: string | null
    name: string
    description: string
  }
) {
  const identity = await requireIdentity(ctx)
  const workspace = getWorkspaceId(identity, args.clerkOrganizationId)
  const plan = workspace.clerkOrganizationId
    ? getActiveOrganizationPlan(identity)
    : "free"
  const existing = await getOrganizationByWorkspaceId(
    ctx,
    workspace.clerkWorkspaceId
  )
  const name = args.name.trim() || "Personal workspace"
  const description = args.description.trim()

  if (existing) {
    await ctx.db.patch(existing._id, {
      name,
      description,
      clerkOrganizationId: workspace.clerkOrganizationId,
      plan,
      ownerTokenIdentifier: identity.tokenIdentifier,
    })
    return existing
  }

  const organizationId = await ctx.db.insert("organizations", {
    name,
    description,
    clerkWorkspaceId: workspace.clerkWorkspaceId,
    clerkOrganizationId: workspace.clerkOrganizationId,
    plan,
    ownerTokenIdentifier: identity.tokenIdentifier,
    createdAt: Date.now(),
  })
  const organization = await ctx.db.get(organizationId)
  if (!organization) {
    throw new Error("Organisation konnte nicht erstellt werden")
  }
  return organization
}

async function requireOrganizationAccess(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">
) {
  const identity = await requireIdentity(ctx)
  const organization = await ctx.db.get(organizationId)
  if (!organization) {
    throw new Error("Organisation nicht gefunden")
  }
  if (organization.clerkOrganizationId) {
    if (
      getActiveOrganizationClaim(identity) !== organization.clerkOrganizationId
    ) {
      throw new Error("Nicht autorisiert")
    }
    return organization
  }
  if (
    organization.ownerTokenIdentifier !== identity.tokenIdentifier &&
    organization.clerkWorkspaceId !==
      `${personalWorkspacePrefix}${identity.tokenIdentifier}`
  ) {
    throw new Error("Nicht autorisiert")
  }
  return organization
}

async function requireOmatAccess(
  ctx: QueryCtx | MutationCtx,
  omatId: Id<"omats">
) {
  const omat = await ctx.db.get(omatId)
  if (!omat) {
    throw new Error("O-Mat nicht gefunden")
  }
  const organization = await requireOrganizationAccess(ctx, omat.organizationId)
  return { omat, organization }
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)

  return slug || "omat"
}

function normalizeSlug(value: string) {
  return slugify(value).slice(0, 48)
}

function normalizeLegalInfo(args: {
  imprintPersons: {
    name: string
    role: string
    street: string
    postalCode: string
    city: string
    country: string
    email: string
  }[]
}) {
  return {
    imprintPersons: args.imprintPersons
      .map((person) => ({
        name: person.name.trim(),
        role: person.role.trim(),
        street: person.street.trim(),
        postalCode: person.postalCode.trim(),
        city: person.city.trim(),
        country: person.country.trim(),
        email: person.email.trim(),
      }))
      .filter((person) => person.name.length > 0)
      .slice(0, 10),
  }
}

function assertPublishableLegalInfo(legalInfo: {
  imprintPersons: { name: string }[]
}) {
  if (legalInfo.imprintPersons.length === 0) {
    throw new Error(
      "Füge mindestens eine Person im O-Mat-Impressum hinzu, bevor du veröffentlichst"
    )
  }
}

async function assertUniqueSlug(
  ctx: QueryCtx | MutationCtx,
  slug: string,
  currentOmatId: Id<"omats">
) {
  const existing = await ctx.db
    .query("omats")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique()

  if (existing && existing._id !== currentOmatId) {
    throw new Error("Dieser öffentliche Slug wird bereits verwendet")
  }
}

async function withAssetUrls<
  TOmat extends { backgroundStorageId?: Id<"_storage"> },
  TParty extends { logoStorageId?: Id<"_storage"> },
>(ctx: QueryCtx, omat: TOmat, parties: TParty[]) {
  const backgroundUrl = omat.backgroundStorageId
    ? await ctx.storage.getUrl(omat.backgroundStorageId)
    : null
  const partiesWithLogoUrls = []
  for (const party of parties) {
    partiesWithLogoUrls.push({
      ...party,
      logoUrl: party.logoStorageId
        ? await ctx.storage.getUrl(party.logoStorageId)
        : null,
    })
  }

  return {
    omat: { ...omat, backgroundUrl },
    parties: partiesWithLogoUrls,
  }
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireIdentity(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

export const listDashboard = query({
  args: {
    clerkOrganizationId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const workspace = getWorkspaceId(identity, args.clerkOrganizationId)
    const organization = await getOrganizationByWorkspaceId(
      ctx,
      workspace.clerkWorkspaceId
    )
    if (!organization) {
      return null
    }
    const omats = await ctx.db
      .query("omats")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organization._id)
      )
      .order("desc")
      .take(50)
    return { organization, omats }
  },
})

export const ensureActiveOrganization = mutation({
  args: {
    clerkOrganizationId: v.union(v.string(), v.null()),
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    return await ensureOrganizationForWorkspace(ctx, args)
  },
})

export const createOmat = mutation({
  args: {
    clerkOrganizationId: v.union(v.string(), v.null()),
    organizationName: v.string(),
    organizationDescription: v.string(),
    title: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const organization = await ensureOrganizationForWorkspace(ctx, {
      clerkOrganizationId: args.clerkOrganizationId,
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

async function deleteOmatDocuments(ctx: MutationCtx, omatId: Id<"omats">) {
  const positions = await ctx.db
    .query("partyPositions")
    .withIndex("by_omatId", (q) => q.eq("omatId", omatId))
    .collect()
  for (const position of positions) {
    await ctx.db.delete(position._id)
  }

  const questions = await ctx.db
    .query("questions")
    .withIndex("by_omatId_and_order", (q) => q.eq("omatId", omatId))
    .collect()
  for (const question of questions) {
    await ctx.db.delete(question._id)
  }

  const parties = await ctx.db
    .query("parties")
    .withIndex("by_omatId", (q) => q.eq("omatId", omatId))
    .collect()
  for (const party of parties) {
    await ctx.db.delete(party._id)
  }

  await ctx.db.delete(omatId)
}

export const deleteOmat = mutation({
  args: {
    omatId: v.id("omats"),
  },
  handler: async (ctx, args) => {
    await requireOmatAccess(ctx, args.omatId)
    await deleteOmatDocuments(ctx, args.omatId)
  },
})

export const getEditor = query({
  args: { omatId: v.id("omats") },
  handler: async (ctx, args) => {
    const { omat, organization } = await requireOmatAccess(ctx, args.omatId)
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
      organization,
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

    const organization = await requireOrganizationAccess(
      ctx,
      omat.organizationId
    )
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
      organization,
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
    watermarksDisabled: v.boolean(),
    legalInfo: legalInfoValidator,
    isPublished: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { organization } = await requireOmatAccess(ctx, args.omatId)
    const identity = await requireIdentity(ctx)
    const plan = organization.clerkOrganizationId
      ? getActiveOrganizationPlan(identity)
      : "free"
    if (args.watermarksDisabled && plan !== "premium") {
      throw new Error(
        "Wasserzeichen können nur in Premium-Organisationen deaktiviert werden"
      )
    }
    const slug = normalizeSlug(args.slug)
    await assertUniqueSlug(ctx, slug, args.omatId)
    const legalInfo = normalizeLegalInfo(args.legalInfo)
    if (args.isPublished) {
      assertPublishableLegalInfo(legalInfo)
    }
    if (organization.plan !== plan) {
      await ctx.db.patch(organization._id, { plan })
    }
    await ctx.db.patch(args.omatId, {
      title: args.title.trim(),
      description: args.description.trim(),
      slug,
      colorScheme: args.colorScheme,
      watermarksDisabled: args.watermarksDisabled && plan === "premium",
      legalInfo,
      isPublished: args.isPublished,
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
    await ctx.db.delete(args.partyId)
    return null
  },
})

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
    const existing = await ctx.db
      .query("partyPositions")
      .withIndex("by_partyId_and_questionId", (q) =>
        q.eq("partyId", args.partyId).eq("questionId", args.questionId)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        stance: args.stance,
        explanation: args.explanation.trim(),
        updatedAt: Date.now(),
      })
      return existing._id
    }

    return await ctx.db.insert("partyPositions", {
      omatId: args.omatId,
      partyId: args.partyId,
      questionId: args.questionId,
      stance: args.stance,
      explanation: args.explanation.trim(),
      updatedAt: Date.now(),
    })
  },
})

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
    const organization = await ctx.db.get(omat.organizationId)
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
      omat: {
        ...assets.omat,
        watermarksDisabled:
          assets.omat.watermarksDisabled && organization?.plan === "premium",
      },
      parties: assets.parties,
      questions,
      positions,
    }
  },
})
