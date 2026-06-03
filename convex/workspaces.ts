import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import {
  ensureOrganizationForWorkspace,
  getOrganizationByWorkspaceId,
  getWorkspaceId,
  requireIdentity,
} from "./omatShared"

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
    organizationSlug: v.optional(v.union(v.string(), v.null())),
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    return await ensureOrganizationForWorkspace(ctx, args)
  },
})
