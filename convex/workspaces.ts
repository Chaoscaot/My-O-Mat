import { query } from "./_generated/server"
import { getActiveWorkspace } from "./omatShared"

export const listDashboard = query({
  args: {},
  handler: async (ctx) => {
    const workspace = await getActiveWorkspace(ctx)
    const omats = await ctx.db
      .query("omats")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", workspace.id)
      )
      .order("desc")
      .take(50)
    return { workspace, omats }
  },
})
