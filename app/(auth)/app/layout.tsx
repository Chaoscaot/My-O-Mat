import { AuthNav } from "@/components/auth-nav"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"
import { Vote } from "lucide-react"
import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:px-8">
        <Link className="flex shrink-0 items-center gap-3" href="/">
          <div className="flex size-9 items-center justify-center border bg-foreground text-background">
            <Vote className="size-4" />
          </div>
        </Link>
        <WorkspaceSwitcher />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <AuthNav />
        </div>
      </header>
      {children}
    </>
  )
}
