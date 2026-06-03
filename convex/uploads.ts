import { mutation } from "./_generated/server"
import { requireIdentity } from "./omatShared"

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireIdentity(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})
