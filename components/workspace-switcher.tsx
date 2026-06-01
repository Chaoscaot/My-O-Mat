"use client"

import { OrganizationSwitcher, useAuth } from "@clerk/nextjs"
import { LayoutDashboard, Vote } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export function WorkspaceSwitcher() {
  const { isLoaded, isSignedIn } = useAuth()
  const pathname = usePathname()
  const isEditor = pathname?.startsWith("/app/") && pathname !== "/app"

  if (!isLoaded || !isSignedIn) {
    return null
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <div className="min-w-0 shrink-0">
        <OrganizationSwitcher
          hidePersonal={false}
          afterCreateOrganizationUrl="/app"
          afterSelectOrganizationUrl="/app"
          afterSelectPersonalUrl="/app"
          skipInvitationScreen
          appearance={{
            elements: {
              rootBox: "max-w-[50vw] md:max-w-72",
              organizationSwitcherTrigger:
                "h-9 max-w-full gap-2 rounded-none border border-border bg-card px-2.5 py-1.5 text-foreground shadow-none hover:bg-muted data-[state=open]:bg-muted",
              organizationSwitcherTriggerIcon: "text-muted-foreground",
              organizationSwitcherTriggerOrganizationName:
                "truncate text-sm font-semibold",
              organizationPreviewAvatarBox:
                "size-6 rounded-[4px] bg-primary text-primary-foreground",
              organizationPreviewMainIdentifier:
                "truncate text-sm font-semibold",
              organizationPreviewSecondaryIdentifier:
                "text-xs text-muted-foreground",
            },
          }}
        />
      </div>

      <Breadcrumb className="hidden min-w-0 md:block">
        <BreadcrumbList className="flex-nowrap">
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/app">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {isEditor ? (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="flex max-w-56 items-center gap-2 truncate">
                  <Vote className="size-3.5 shrink-0" />
                  O-Mat
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : null}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  )
}
