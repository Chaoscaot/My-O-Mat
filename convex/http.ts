import { httpRouter } from "convex/server"
import { httpAction, type ActionCtx } from "./_generated/server"
import {
  getActiveOrganizationPlan,
  requireBackgroundImageBytes,
  requirePartyLogoBytes,
  requirePremiumBackgroundImageBytes,
} from "./omatShared"

const http = httpRouter()
type UploadKind = "background" | "partyLogo"
type BackgroundMode = "standard" | "premium4k"
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

http.route({
  path: "/upload/background",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }),
})

http.route({
  path: "/upload/background",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    return uploadImage(ctx, request, "background")
  }),
})

http.route({
  path: "/upload/image",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }),
})

http.route({
  path: "/upload/image",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    return uploadImage(ctx, request, getUploadKind(request))
  }),
})

async function uploadImage(
  ctx: ActionCtx,
  request: Request,
  kind: UploadKind | null
) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    return jsonResponse({ error: "Nicht angemeldet" }, 401)
  }

  if (!kind) {
    return jsonResponse({ error: "Upload-Typ ist ungültig" }, 400)
  }

  const contentType = getContentType(request)
  if (!contentType) {
    return jsonResponse({ error: "Nur WebP-Bilder sind erlaubt" }, 400)
  }

  try {
    const bytes = new Uint8Array(await request.arrayBuffer())
    if (kind === "background") {
      const mode = getBackgroundMode(request)
      if (mode === "premium4k") {
        if (getActiveOrganizationPlan(identity) !== "premium") {
          return jsonResponse(
            {
              error: "4K-Uploads sind nur für Premium-Organisationen verfügbar",
            },
            403
          )
        }
        requirePremiumBackgroundImageBytes(contentType, bytes)
      } else {
        requireBackgroundImageBytes(contentType, bytes)
      }
    } else {
      requirePartyLogoBytes(contentType, bytes)
    }
    const storageId = await ctx.storage.store(
      new Blob([bytes], { type: "image/webp" })
    )
    return jsonResponse({ storageId }, 200)
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Bild konnte nicht hochgeladen werden",
      },
      400
    )
  }
}

function getUploadKind(request: Request): UploadKind | null {
  const kind = new URL(request.url).searchParams.get("kind")
  return kind === "background" || kind === "partyLogo" ? kind : null
}

function getBackgroundMode(request: Request): BackgroundMode {
  const mode = new URL(request.url).searchParams.get("mode")
  return mode === "premium4k" ? "premium4k" : "standard"
}

function getContentType(request: Request) {
  return request.headers
    .get("content-type")
    ?.split(";")[0]
    ?.trim()
    .toLowerCase()
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}

export default http
