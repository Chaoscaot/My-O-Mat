import { v } from "convex/values"
import { type Doc, type Id } from "./_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "./_generated/server"

export const colors = ["#0f766e", "#b91c1c", "#4338ca", "#a16207", "#be185d"]
const personalWorkspacePrefix = "personal:"
const organizationWorkspacePrefix = "org:"

export const colorSchemeValidator = v.union(
  v.literal("civic"),
  v.literal("forest"),
  v.literal("sunset"),
  v.literal("mono")
)
export const visibilityValidator = v.union(
  v.literal("private"),
  v.literal("hidden"),
  v.literal("public")
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
export const legalInfoValidator = v.object({
  imprintPersons: v.array(imprintPersonValidator),
})
export const stanceValidator = v.union(
  v.literal("yes"),
  v.literal("neutral"),
  v.literal("no")
)
export const questionnaireAnswerValidator = v.object({
  questionId: v.id("questions"),
  stance: stanceValidator,
  explanation: v.string(),
})
export const questionnaireDraftAnswerValidator = v.object({
  questionId: v.id("questions"),
  stance: v.union(stanceValidator, v.null()),
  explanation: v.string(),
})
export type OrganizationPlan = "free" | "premium"
export type OmatVisibility = "private" | "hidden" | "public"
type Identity = Awaited<ReturnType<typeof requireIdentity>>

export async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error("Nicht angemeldet")
  }
  return identity
}

export function hasOrganizationAccess(
  identity: Identity,
  organization: Doc<"organizations">
) {
  if (organization.clerkOrganizationId) {
    return (
      getActiveOrganizationClaim(identity) === organization.clerkOrganizationId
    )
  }
  return (
    organization.ownerTokenIdentifier === identity.tokenIdentifier ||
    organization.clerkWorkspaceId ===
      `${personalWorkspacePrefix}${identity.tokenIdentifier}`
  )
}

export function getActiveOrganizationClaim(
  identity: Awaited<ReturnType<typeof requireIdentity>>
) {
  const orgId = identity.org_id
  return typeof orgId === "string" ? orgId : null
}

export function getActiveOrganizationPlan(
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

export function getWorkspaceId(
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

export async function getOrganizationByWorkspaceId(
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

export async function ensureOrganizationForWorkspace(
  ctx: MutationCtx,
  args: {
    clerkOrganizationId: string | null
    organizationSlug?: string | null
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
  const slug = normalizeSlug(args.organizationSlug ?? name)

  if (existing) {
    await ctx.db.patch(existing._id, {
      name,
      slug,
      description,
      clerkOrganizationId: workspace.clerkOrganizationId,
      plan,
      ownerTokenIdentifier: identity.tokenIdentifier,
    })
    return existing
  }

  const organizationId = await ctx.db.insert("organizations", {
    name,
    slug,
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

export async function requireOrganizationAccess(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">
) {
  const identity = await requireIdentity(ctx)
  const organization = await ctx.db.get(organizationId)
  if (!organization) {
    throw new Error("Organisation nicht gefunden")
  }
  if (!hasOrganizationAccess(identity, organization)) {
    throw new Error("Nicht autorisiert")
  }
  return organization
}

export async function requireOmatAccess(
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

export function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)

  return slug || "omat"
}

export function normalizeSlug(value: string) {
  return slugify(value).slice(0, 48)
}

export function getOmatVisibility(omat: {
  visibility?: OmatVisibility
  isPublished: boolean
}) {
  return omat.visibility ?? (omat.isPublished ? "public" : "private")
}

function createQuestionnaireToken() {
  return crypto.randomUUID().replace(/-/g, "")
}

export function normalizeLegalInfo(args: {
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

export function assertPublishableLegalInfo(legalInfo: {
  imprintPersons: { name: string }[]
}) {
  if (legalInfo.imprintPersons.length === 0) {
    throw new Error(
      "Füge mindestens eine Person im O-Mat-Impressum hinzu, bevor du veröffentlichst"
    )
  }
}

export async function assertUniqueSlug(
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

export async function getRunnerData(ctx: QueryCtx, omat: Doc<"omats">) {
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
      visibility: getOmatVisibility(omat),
      watermarksDisabled:
        assets.omat.watermarksDisabled && organization?.plan === "premium",
    },
    parties: assets.parties,
    questions,
    positions,
  }
}

export async function getOrCreateQuestionnaire(
  ctx: MutationCtx,
  omatId: Id<"omats">,
  partyId: Id<"parties">
) {
  const existing = await ctx.db
    .query("questionnaires")
    .withIndex("by_partyId", (q) => q.eq("partyId", partyId))
    .filter((q) => q.eq(q.field("omatId"), omatId))
    .unique()

  if (existing) {
    return existing
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = createQuestionnaireToken()
    const existingToken = await ctx.db
      .query("questionnaires")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique()
    if (existingToken) {
      continue
    }

    const now = Date.now()
    const questionnaireId = await ctx.db.insert("questionnaires", {
      omatId,
      partyId,
      token,
      status: "open",
      createdAt: now,
      updatedAt: now,
    })
    const questionnaire = await ctx.db.get(questionnaireId)
    if (!questionnaire) {
      throw new Error("Fragebogen konnte nicht erstellt werden")
    }
    return questionnaire
  }

  throw new Error("Fragebogen-Token konnte nicht erzeugt werden")
}

export async function upsertPartyPosition(
  ctx: MutationCtx,
  args: {
    omatId: Id<"omats">
    partyId: Id<"parties">
    questionId: Id<"questions">
    stance: "yes" | "neutral" | "no"
    explanation: string
    updatedAt: number
  }
) {
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
      updatedAt: args.updatedAt,
    })
    return existing._id
  }

  return await ctx.db.insert("partyPositions", {
    omatId: args.omatId,
    partyId: args.partyId,
    questionId: args.questionId,
    stance: args.stance,
    explanation: args.explanation.trim(),
    updatedAt: args.updatedAt,
  })
}

export async function deleteQuestionnaireAnswers(
  ctx: MutationCtx,
  questionnaireId: Id<"questionnaires">
) {
  const answers = await ctx.db
    .query("questionnaireAnswers")
    .withIndex("by_questionnaireId", (q) =>
      q.eq("questionnaireId", questionnaireId)
    )
    .collect()
  for (const answer of answers) {
    await ctx.db.delete(answer._id)
  }
}

export async function requireQuestionnaireByToken(
  ctx: MutationCtx,
  token: string
) {
  const questionnaire = await ctx.db
    .query("questionnaires")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique()
  if (!questionnaire) {
    throw new Error("Fragebogen nicht gefunden")
  }

  const party = await ctx.db.get(questionnaire.partyId)
  if (!party || party.omatId !== questionnaire.omatId) {
    throw new Error("Partei nicht gefunden")
  }

  return questionnaire
}

export async function upsertQuestionnaireAnswer(
  ctx: MutationCtx,
  args: {
    questionnaireId: Id<"questionnaires">
    omatId: Id<"omats">
    partyId: Id<"parties">
    questionId: Id<"questions">
    stance: "yes" | "neutral" | "no" | undefined
    explanation: string
    updatedAt: number
  }
) {
  const question = await ctx.db.get(args.questionId)
  if (!question || question.omatId !== args.omatId) {
    throw new Error("These gehört nicht zu diesem Fragebogen")
  }

  const existingAnswer = await ctx.db
    .query("questionnaireAnswers")
    .withIndex("by_questionnaireId_and_questionId", (q) =>
      q
        .eq("questionnaireId", args.questionnaireId)
        .eq("questionId", args.questionId)
    )
    .unique()

  if (existingAnswer) {
    await ctx.db.patch(existingAnswer._id, {
      stance: args.stance,
      explanation: args.explanation.trim(),
      updatedAt: args.updatedAt,
    })
    return existingAnswer._id
  }

  return await ctx.db.insert("questionnaireAnswers", {
    questionnaireId: args.questionnaireId,
    omatId: args.omatId,
    partyId: args.partyId,
    questionId: args.questionId,
    stance: args.stance,
    explanation: args.explanation.trim(),
    updatedAt: args.updatedAt,
  })
}

export async function withAssetUrls<
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

export async function deleteOmatDocuments(
  ctx: MutationCtx,
  omatId: Id<"omats">
) {
  const positions = await ctx.db
    .query("partyPositions")
    .withIndex("by_omatId", (q) => q.eq("omatId", omatId))
    .collect()
  for (const position of positions) {
    await ctx.db.delete(position._id)
  }

  const questionnaireAnswers = await ctx.db
    .query("questionnaireAnswers")
    .withIndex("by_omatId", (q) => q.eq("omatId", omatId))
    .collect()
  for (const answer of questionnaireAnswers) {
    await ctx.db.delete(answer._id)
  }

  const questionnaires = await ctx.db
    .query("questionnaires")
    .withIndex("by_omatId", (q) => q.eq("omatId", omatId))
    .collect()
  for (const questionnaire of questionnaires) {
    await ctx.db.delete(questionnaire._id)
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
