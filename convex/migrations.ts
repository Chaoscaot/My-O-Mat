import { Migrations } from "@convex-dev/migrations"
import { components } from "./_generated/api"
import { type DataModel } from "./_generated/dataModel"

const organizationWorkspacePrefix = "org:"

export const migrations = new Migrations<DataModel>(components.migrations)

export const migrateOmatOrganizationIdsToClerkFormat = migrations.define({
  table: "omats",
  migrateOne: async (ctx, omat) => {
    if (omat.organizationId.startsWith(organizationWorkspacePrefix)) {
      return
    }

    const organizationId = ctx.db.normalizeId(
      "organizations",
      omat.organizationId
    )
    if (!organizationId) {
      throw new Error(
        `O-Mat ${omat._id} has an organizationId that is neither Clerk-formatted nor an organizations id`
      )
    }

    const organization = await ctx.db.get(organizationId)
    if (!organization) {
      throw new Error(
        `O-Mat ${omat._id} references missing organization ${organizationId}`
      )
    }

    const clerkWorkspaceId =
      organization.clerkWorkspaceId ??
      (organization.clerkOrganizationId
        ? `${organizationWorkspacePrefix}${organization.clerkOrganizationId}`
        : null)

    if (!clerkWorkspaceId?.startsWith(organizationWorkspacePrefix)) {
      throw new Error(
        `Organization ${organizationId} does not have a Clerk organization id`
      )
    }

    await ctx.db.patch(omat._id, {
      organizationId: clerkWorkspaceId,
      updatedAt: Date.now(),
    })
  },
})
