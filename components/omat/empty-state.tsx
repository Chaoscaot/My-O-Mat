import { FileQuestion } from "lucide-react"

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <section className="flex min-h-[320px] items-center justify-center border bg-card p-6 text-center">
      <div>
        <div className="mx-auto mb-5 flex size-12 items-center justify-center border">
          <FileQuestion className="size-5" />
        </div>
        <h2 className="font-heading text-3xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      </div>
    </section>
  )
}
