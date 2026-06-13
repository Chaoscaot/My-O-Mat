import { mutation } from "./_generated/server"
import { requireIdentity } from "./omatShared"

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireIdentity(ctx)
    throw new Error(
      "Uploads sind nur über die validierten WebP-Endpunkte erlaubt"
    )
  },
})
