"use client"

import { useAuth } from "@clerk/nextjs"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import {
  Building2,
  Check,
  ChevronDown,
  FilePenLine,
  LayoutDashboard,
  Plus,
  Trash2,
  Vote,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { FormEvent, useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import { type Doc } from "@/convex/_generated/dataModel"

type DashboardRow = {
  organization: Doc<"organizations">
  omats: Doc<"omats">[]
}

type DialogMode =
  | { kind: "createOrganization" }
  | { kind: "editOrganization"; organization: Doc<"organizations"> }
  | { kind: "createOmat"; organization: Doc<"organizations"> }
  | { kind: "editOmat"; omat: Doc<"omats"> }

type DeleteTarget =
  | { kind: "organization"; organization: Doc<"organizations"> }
  | { kind: "omat"; omat: Doc<"omats"> }

export function WorkspaceSwitcher() {
  const { isLoaded, isSignedIn } = useAuth()
  const { isAuthenticated } = useConvexAuth()
  const pathname = usePathname()
  const router = useRouter()
  const dashboard = useQuery(
    api.omats.listDashboard,
    isSignedIn && isAuthenticated ? {} : "skip"
  )
  const createOrganization = useMutation(api.omats.createOrganization)
  const updateOrganization = useMutation(api.omats.updateOrganization)
  const deleteOrganization = useMutation(api.omats.deleteOrganization)
  const createOmat = useMutation(api.omats.createOmat)
  const updateOmat = useMutation(api.omats.updateOmat)
  const deleteOmat = useMutation(api.omats.deleteOmat)
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentRef = pathname?.startsWith("/app/")
    ? decodeURIComponent(pathname.split("/")[2] ?? "")
    : ""

  let selected: {
    organization: Doc<"organizations">
    omat: Doc<"omats">
  } | null = null
  for (const row of dashboard ?? []) {
    const omat = row.omats.find(
      (item) => item._id === currentRef || item.slug === currentRef
    )
    if (omat) {
      selected = { organization: row.organization, omat }
      break
    }
  }

  if (!isLoaded || !isSignedIn) {
    return null
  }

  function openDialog(mode: DialogMode) {
    setDialogMode(mode)
    if (mode.kind === "createOrganization") {
      setName("")
      setDescription("")
      return
    }
    if (mode.kind === "createOmat") {
      setName("")
      setDescription("Ein eigener Wahl-O-Mat für diese Organisation.")
      return
    }
    if (mode.kind === "editOrganization") {
      setName(mode.organization.name)
      setDescription(mode.organization.description)
      return
    }
    setName(mode.omat.title)
    setDescription(mode.omat.description)
  }

  async function submitDialog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!dialogMode || !name.trim()) return
    setIsSubmitting(true)
    try {
      if (dialogMode.kind === "createOrganization") {
        await createOrganization({ name, description })
      }
      if (dialogMode.kind === "editOrganization") {
        await updateOrganization({
          organizationId: dialogMode.organization._id,
          name,
          description,
        })
      }
      if (dialogMode.kind === "createOmat") {
        const id = await createOmat({
          organizationId: dialogMode.organization._id,
          title: name,
          description,
        })
        router.push(`/app/${id}`)
      }
      if (dialogMode.kind === "editOmat") {
        await updateOmat({
          omatId: dialogMode.omat._id,
          title: name,
          description,
          isPublished: dialogMode.omat.isPublished,
        })
      }
      setDialogMode(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    if (deleteTarget.kind === "organization") {
      await deleteOrganization({
        organizationId: deleteTarget.organization._id,
      })
    } else {
      await deleteOmat({ omatId: deleteTarget.omat._id })
    }
    if (
      deleteTarget.kind === "organization" ||
      deleteTarget.omat._id === selected?.omat._id
    ) {
      router.push("/app")
    }
    setDeleteTarget(null)
  }

  const rows = dashboard ?? []
  const activeOrg = selected?.organization
  const activeOmat = selected?.omat

  return (
    <>
      <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/app">Arbeitsbereich</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {activeOrg ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage className="max-w-40 truncate">
                    {activeOrg.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : null}
            {activeOmat ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage className="max-w-56 truncate">
                    {activeOmat.title}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : null}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="max-w-[44vw] justify-between px-3 md:max-w-80 md:min-w-64"
            variant="outline"
            size="sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Building2 className="size-3.5" />
              <span className="truncate">
                {activeOmat?.title ?? activeOrg?.name ?? "Arbeitsbereich wählen"}
              </span>
            </span>
            <ChevronDown className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Arbeitsbereich</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href="/app">
              <LayoutDashboard />
              Übersicht
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {rows.length === 0 ? (
            <DropdownMenuLabel>Noch keine Organisationen</DropdownMenuLabel>
          ) : null}
          {rows.map((row: DashboardRow) => (
            <div key={row.organization._id}>
              <DropdownMenuLabel className="flex items-center justify-between gap-2">
                <span className="truncate">{row.organization.name}</span>
                <span>{row.omats.length}</span>
              </DropdownMenuLabel>
              {row.omats.map((omat) => (
                <DropdownMenuItem key={omat._id} asChild>
                  <Link href={`/app/${omat._id}`}>
                    <Vote />
                    <span className="min-w-0 flex-1 truncate">
                      {omat.title}
                    </span>
                    {activeOmat?._id === omat._id ? <Check /> : null}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  openDialog({
                    kind: "createOmat",
                    organization: row.organization,
                  })
                }}
              >
                <Plus />
                Neuer O-Mat
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  openDialog({
                    kind: "editOrganization",
                    organization: row.organization,
                  })
                }}
              >
                <FilePenLine />
                Organisation bearbeiten
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={(event) => {
                  event.preventDefault()
                  setDeleteTarget({
                    kind: "organization",
                    organization: row.organization,
                  })
                }}
              >
                <Trash2 />
                Organisation löschen
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </div>
          ))}
          {activeOmat ? (
            <>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  openDialog({ kind: "editOmat", omat: activeOmat })
                }}
              >
                <FilePenLine />
                Ausgewählten O-Mat bearbeiten
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={(event) => {
                  event.preventDefault()
                  setDeleteTarget({ kind: "omat", omat: activeOmat })
                }}
              >
                <Trash2 />
                Ausgewählten O-Mat löschen
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault()
              openDialog({ kind: "createOrganization" })
            }}
          >
            <Plus />
            Neue Organisation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={!!dialogMode}
        onOpenChange={(open) => !open && setDialogMode(null)}
      >
        <DialogContent>
          <form className="grid gap-5" onSubmit={submitDialog}>
            <DialogHeader>
              <DialogTitle>{dialogTitle(dialogMode)}</DialogTitle>
              <DialogDescription>
                {dialogDescription(dialogMode)}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <Input
                placeholder={
                  dialogMode?.kind.includes("Omat")
                    ? "O-Mat-Titel"
                    : "Name der Organisation"
                }
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <Textarea
                placeholder="Kurze Beschreibung"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <DialogFooter>
              <Button disabled={isSubmitting || !name.trim()} type="submit">
                {isSubmitting ? "Speichern..." : "Speichern"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTitle(deleteTarget)}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === "organization"
                ? "Dadurch werden die Organisation und alle enthaltenen O-Mats gelöscht."
                : "Dadurch werden der ausgewählte O-Mat sowie seine Parteien, Thesen und Positionen gelöscht."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function dialogTitle(mode: DialogMode | null) {
  if (mode?.kind === "createOrganization") return "Neue Organisation"
  if (mode?.kind === "editOrganization") return "Organisation bearbeiten"
  if (mode?.kind === "createOmat") return "Neuer O-Mat"
  return "O-Mat bearbeiten"
}

function dialogDescription(mode: DialogMode | null) {
  if (mode?.kind === "createOrganization") {
    return "Erstelle einen übergeordneten Arbeitsbereich für zusammengehörige O-Mats."
  }
  if (mode?.kind === "createOmat") {
    return `Erstelle einen O-Mat in ${mode.organization.name}.`
  }
  return "Aktualisiere den Namen und die Beschreibung im Arbeitsbereich."
}

function deleteTitle(target: DeleteTarget | null) {
  if (target?.kind === "organization") return "Organisation löschen"
  if (target?.kind === "omat") return "O-Mat löschen"
  return "Löschen"
}
