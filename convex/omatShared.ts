import { v } from "convex/values"
import { type Doc, type Id } from "./_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "./_generated/server"

export const colors = ["#0f766e", "#b91c1c", "#4338ca", "#a16207", "#be185d"]
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
const questionnaireTokenPattern = /^[0-9a-f]{32}$/
const imageContentType = "image/webp"
const maxImageBytes = 5 * 1024 * 1024
export const maxBackgroundImageBytes = 1024 * 1024
export const maxBackgroundImageWidth = 1920
export const maxBackgroundImageHeight = 1080
export const maxPartyLogoImageBytes = 100 * 1024
export type OrganizationPlan = "free" | "premium"
export type OmatVisibility = "private" | "hidden" | "public"
type Identity = Awaited<ReturnType<typeof requireIdentity>>
export type Workspace = {
  id: string
  clerkOrganizationId: string
  slug: string
  plan: OrganizationPlan
}

export async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error("Nicht angemeldet")
  }
  return identity
}

export function hasWorkspaceAccess(identity: Identity, workspaceId: string) {
  const activeOrganizationId = getActiveOrganizationClaim(identity)
  return workspaceId === `${organizationWorkspacePrefix}${activeOrganizationId}`
}

export function getActiveOrganizationClaim(
  identity: Awaited<ReturnType<typeof requireIdentity>>
) {
  const orgId = identity.org_id
  return typeof orgId === "string" ? orgId : null
}

export function getActiveOrganizationSlug(
  identity: Awaited<ReturnType<typeof requireIdentity>>
) {
  const orgSlug = identity.org_slug
  if (typeof orgSlug !== "string" || !orgSlug.trim()) {
    throw new Error(
      "Der Clerk-Organisationsslug fehlt im Convex-JWT. Ergänze im Clerk-JWT-Template convex org_slug mit {{org.slug}}."
    )
  }
  return normalizeSlug(orgSlug)
}

export function getActiveOrganizationPlan(
  identity: Awaited<ReturnType<typeof requireIdentity>>
): OrganizationPlan {
  const plan = identity.org_plan
  return typeof plan === "string" && plan.toLowerCase() === "premium"
    ? "premium"
    : "free"
}

export function getWorkspaceId(
  identity: Awaited<ReturnType<typeof requireIdentity>>
) {
  const activeOrganizationId = getActiveOrganizationClaim(identity)
  if (!activeOrganizationId) {
    throw new Error(
      "Die aktive Clerk-Organisation fehlt im Convex-JWT. Ergänze im Clerk-JWT-Template convex org_id mit {{org.id}} und org_slug mit {{org.slug}}."
    )
  }

  return {
    clerkWorkspaceId: `${organizationWorkspacePrefix}${activeOrganizationId}`,
    clerkOrganizationId: activeOrganizationId,
  }
}

export function getWorkspaceFromIdentity(
  identity: Awaited<ReturnType<typeof requireIdentity>>
): Workspace {
  const workspace = getWorkspaceId(identity)

  return {
    id: workspace.clerkWorkspaceId,
    clerkOrganizationId: workspace.clerkOrganizationId,
    slug: getActiveOrganizationSlug(identity),
    plan: getActiveOrganizationPlan(identity),
  }
}

export async function getActiveWorkspace(ctx: QueryCtx | MutationCtx) {
  const identity = await requireIdentity(ctx)
  return getWorkspaceFromIdentity(identity)
}

export async function requireWorkspaceAccess(
  ctx: QueryCtx | MutationCtx,
  workspaceId: string
) {
  const identity = await requireIdentity(ctx)
  if (!hasWorkspaceAccess(identity, workspaceId)) {
    throw new Error("Nicht autorisiert")
  }
  return getWorkspaceFromIdentity(identity)
}

export async function requireOmatAccess(
  ctx: QueryCtx | MutationCtx,
  omatId: Id<"omats">
) {
  const omat = await ctx.db.get(omatId)
  if (!omat) {
    throw new Error("O-Mat nicht gefunden")
  }
  const workspace = await requireWorkspaceAccess(ctx, omat.organizationId)
  return { omat, workspace }
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

export function normalizeQuestionnaireToken(token: string) {
  const normalizedToken = token.trim().toLowerCase()
  if (!questionnaireTokenPattern.test(normalizedToken)) {
    throw new Error("Fragebogen nicht gefunden")
  }
  return normalizedToken
}

export async function requireImageStorage(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
  options: {
    maxBytes?: number | null
    label?: string
  } = {}
) {
  const label = options.label ?? "Bilder"
  const metadata = await ctx.db.system.get(storageId)
  if (!metadata) {
    throw new Error("Datei nicht gefunden")
  }
  if (metadata.contentType !== imageContentType) {
    throw new Error("Nur WebP-Bilder sind erlaubt")
  }
  const maxBytes =
    options.maxBytes === undefined ? maxImageBytes : options.maxBytes
  if (maxBytes !== null && metadata.size > maxBytes) {
    throw new Error(
      `${label} dürfen höchstens ${formatBytes(maxBytes)} groß sein`
    )
  }
}

export async function requireBackgroundImageStorage(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
  options: { premium: boolean } = { premium: false }
) {
  await requireImageStorage(ctx, storageId, {
    maxBytes: options.premium ? null : maxBackgroundImageBytes,
    label: "Hintergrundbilder",
  })
}

export async function requirePartyLogoStorage(
  ctx: MutationCtx,
  storageId: Id<"_storage">
) {
  await requireImageStorage(ctx, storageId, {
    maxBytes: maxPartyLogoImageBytes,
    label: "Parteilogos",
  })
}

export function requireBackgroundImageBytes(
  contentType: string,
  bytes: Uint8Array
) {
  requireWebpImageBytes(contentType, bytes, "Hintergrundbilder")
  if (bytes.byteLength > maxBackgroundImageBytes) {
    throw new Error(
      `Hintergrundbilder dürfen höchstens ${formatBytes(maxBackgroundImageBytes)} groß sein`
    )
  }

  const dimensions = getImageDimensions(contentType, bytes)
  if (!dimensions) {
    throw new Error("Bildabmessungen konnten nicht gelesen werden")
  }
  if (
    dimensions.width > maxBackgroundImageWidth ||
    dimensions.height > maxBackgroundImageHeight
  ) {
    throw new Error(
      `Hintergrundbilder dürfen höchstens ${maxBackgroundImageWidth} x ${maxBackgroundImageHeight} Pixel groß sein`
    )
  }
}

export function requirePremiumBackgroundImageBytes(
  contentType: string,
  bytes: Uint8Array
) {
  requireWebpImageBytes(contentType, bytes, "Hintergrundbilder")
}

export function requirePartyLogoBytes(contentType: string, bytes: Uint8Array) {
  requireWebpImageBytes(contentType, bytes, "Parteilogos")
  if (bytes.byteLength > maxPartyLogoImageBytes) {
    throw new Error(
      `Parteilogos dürfen höchstens ${formatBytes(maxPartyLogoImageBytes)} groß sein`
    )
  }
}

function requireWebpImageBytes(
  contentType: string,
  bytes: Uint8Array,
  label: string
) {
  if (contentType !== imageContentType) {
    throw new Error("Nur WebP-Bilder sind erlaubt")
  }
  if (!getWebpDimensions(bytes)) {
    throw new Error(`${label} müssen gültige WebP-Bilder sein`)
  }
}

function formatBytes(bytes: number) {
  if (bytes % (1024 * 1024) === 0) {
    return `${bytes / (1024 * 1024)} MB`
  }
  if (bytes % 1024 === 0) {
    return `${bytes / 1024} KB`
  }
  return `${bytes} Byte`
}

function getImageDimensions(contentType: string, bytes: Uint8Array) {
  if (contentType === "image/webp") {
    return getWebpDimensions(bytes)
  }
  return null
}

function getWebpDimensions(bytes: Uint8Array) {
  if (
    bytes.length < 30 ||
    readAscii(bytes, 0, 4) !== "RIFF" ||
    readAscii(bytes, 8, 4) !== "WEBP"
  ) {
    return null
  }

  const format = readAscii(bytes, 12, 4)
  if (format === "VP8 ") {
    if (bytes.length < 30) {
      return null
    }
    return {
      width: readUint16LittleEndian(bytes, 26) & 0x3fff,
      height: readUint16LittleEndian(bytes, 28) & 0x3fff,
    }
  }
  if (format === "VP8L") {
    if (bytes.length < 25) {
      return null
    }
    const bits =
      bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24)
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    }
  }
  if (format === "VP8X") {
    if (bytes.length < 30) {
      return null
    }
    return {
      width: readUint24LittleEndian(bytes, 24) + 1,
      height: readUint24LittleEndian(bytes, 27) + 1,
    }
  }

  return null
}

function readUint16LittleEndian(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8)
}

function readUint24LittleEndian(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16)
}

function readAscii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.slice(offset, offset + length))
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
      eyeCandyDisabled: Boolean(assets.omat.eyeCandyDisabled),
      watermarksDisabled: assets.omat.watermarksDisabled,
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
  const normalizedToken = normalizeQuestionnaireToken(token)
  const questionnaire = await ctx.db
    .query("questionnaires")
    .withIndex("by_token", (q) => q.eq("token", normalizedToken))
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
