import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpenCheck,
  Check,
  ClipboardList,
  FileText,
  Globe2,
  Layers3,
  MessageSquareQuote,
  PenLine,
  Scale,
  Share2,
  Sparkles,
  Users,
  Vote,
} from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { AuthNav } from "@/components/auth-nav"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Eigene Wahlhelfer erstellen",
}

const navItems = [
  ["Ablauf", "#ablauf"],
  ["Werkzeuge", "#werkzeuge"],
  ["Beispiele", "#beispiele"],
  ["Starten", "#starten"],
]

const workflow = [
  {
    icon: PenLine,
    title: "Thesen entwerfen",
    text: "Formuliere politische, schulische oder lokale Thesen und ordne sie nach Themen.",
  },
  {
    icon: Users,
    title: "Positionen einsammeln",
    text: "Lade Parteien, Gruppen oder Kandidierende ein und sammle Antworten mit Begründung.",
  },
  {
    icon: Scale,
    title: "Matching erklären",
    text: "Nutzer gewichten Aussagen und sehen nachvollziehbar, wo Übereinstimmungen entstehen.",
  },
  {
    icon: Share2,
    title: "Öffentlich teilen",
    text: "Veröffentliche deinen My-O-Mat als Link für Website, QR-Code, Unterricht oder Veranstaltung.",
  },
]

const featureColumns = [
  {
    eyebrow: "Redaktion",
    title: "Alles bleibt sortiert.",
    points: [
      "Themenfelder",
      "Begründungen",
      "Antwortstatus",
      "Veröffentlichung",
    ],
  },
  {
    eyebrow: "Teilnahme",
    title: "Mehr als Ja oder Nein.",
    points: ["Zustimmung", "Neutral", "Ablehnung", "Gewichtung"],
  },
  {
    eyebrow: "Auswertung",
    title: "Ergebnisse werden lesbar.",
    points: ["Matchwerte", "Positionen", "Differenzen", "Share-Link"],
  },
]

const examples = [
  ["Schulwahl", "Politikunterricht, Projektwoche oder SV-Wahl"],
  ["Kommunalwahl", "Lokale Themen für Stadtteil, Gemeinde oder Jugendrat"],
  ["Vereinswahl", "Kandidierende und Programme klar vergleichbar machen"],
  ["Podium", "Publikum vor oder nach einer Debatte einbinden"],
]

const stats = [
  ["30+", "Thesen sauber strukturieren"],
  ["4", "Antwortoptionen inklusive Gewichtung"],
  ["1", "öffentlicher Link für alle Teilnehmenden"],
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f4efe3] text-[#1c1b17]">
      <header className="sticky top-0 z-50 border-b-2 border-[#1c1b17] bg-[#f4efe3]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:px-8">
          <Link className="flex items-center gap-3" href="/">
            <span className="flex size-9 items-center justify-center border-2 border-[#1c1b17] bg-[#1c1b17] text-[#f4efe3]">
              <Vote className="size-4" />
            </span>
            <span className="leading-none">
              <span className="block font-heading text-xl font-semibold">
                My-O-Mat
              </span>
              <span className="hidden text-[0.65rem] font-bold tracking-widest text-[#6a6254] uppercase sm:block">
                Erstelle deinen Wahlhelfer
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map(([label, href]) => (
              <a
                className="px-3 py-2 text-xs font-bold tracking-widest text-[#6a6254] uppercase transition hover:bg-[#1c1b17] hover:text-[#f4efe3]"
                href={href}
                key={href}
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <AuthNav />
          </div>
        </div>
      </header>

      <HeroSection />
      <MarqueeBand />
      <WorkflowSection />
      <WorkbenchSection />
      <ExamplesSection />
      <ProofSection />
      <FinalCta />
      <LegalFooter />
    </main>
  )
}

function HeroSection() {
  return (
    <section className="border-b-2 border-[#1c1b17]">
      <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl gap-10 px-4 py-12 md:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
        <div>
          <p className="mb-5 w-fit border-2 border-[#1c1b17] px-3 py-1 text-xs font-bold tracking-widest uppercase">
            Wahl-O-Mat selbst bauen
          </p>
          <h1 className="max-w-4xl font-heading text-6xl leading-[0.9] font-semibold text-balance md:text-8xl">
            Baut euren eigenen Wahl-O-Mat wie eine Redaktion.
          </h1>
          <p className="mt-7 max-w-2xl text-xl leading-8 text-[#514b40]">
            My-O-Mat bringt Thesen, Positionen, Begründungen und
            Veröffentlichung in einen klaren Arbeitsfluss. Für Schulen, Vereine,
            Kommunen, Initiativen und Medienprojekte, die Orientierung
            nachvollziehbar machen wollen.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild className="bg-[#1c1b17] text-[#f4efe3]">
              <Link href="/app">
                Arbeitsbereich öffnen
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-[#1c1b17]">
              <a href="#ablauf">
                Ablauf ansehen
                <Layers3 />
              </a>
            </Button>
          </div>
        </div>

        <ProductFrontPage />
      </div>
    </section>
  )
}

function ProductFrontPage() {
  return (
    <div className="border-2 border-[#1c1b17] bg-[#fffaf0] shadow-[18px_18px_0_#1c1b17]">
      <div className="grid grid-cols-3 border-b-2 border-[#1c1b17] text-center text-xs font-bold tracking-widest uppercase">
        <span className="border-r-2 border-[#1c1b17] p-3">These</span>
        <span className="border-r-2 border-[#1c1b17] p-3">Position</span>
        <span className="p-3">Match</span>
      </div>
      <div className="p-5">
        <div className="mb-5 border-2 border-[#1c1b17] bg-[#f6d96f] p-4">
          <p className="text-xs font-bold tracking-widest uppercase">
            Beispielthese
          </p>
          <p className="mt-3 font-heading text-3xl leading-tight font-semibold">
            Öffentliche Räume sollen stärker autofrei geplant werden.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            "Thesen clustern",
            "Antworten gewichten",
            "Gruppen einladen",
            "Ergebnisse veröffentlichen",
          ].map((feature, index) => (
            <div
              className="border-2 border-[#1c1b17] bg-white p-4"
              key={feature}
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="text-xs font-bold tracking-widest uppercase">
                  0{index + 1}
                </span>
                <BadgeCheck className="size-4" />
              </div>
              <p className="font-semibold">{feature}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MarqueeBand() {
  return (
    <div className="border-b-2 border-[#1c1b17] bg-[#1c1b17] py-4 text-[#f4efe3]">
      <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 px-4 text-xs font-bold tracking-widest uppercase md:px-8">
        <span>These</span>
        <span>Begründung</span>
        <span>Gewichtung</span>
        <span>Positionen</span>
        <span>Veröffentlichung</span>
        <span>Auswertung</span>
      </div>
    </div>
  )
}

function WorkflowSection() {
  return (
    <section className="scroll-mt-20 border-b-2 border-[#1c1b17]" id="ablauf">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mb-4 text-xs font-bold tracking-widest uppercase">
              Ablauf
            </p>
            <h2 className="font-heading text-5xl leading-none font-semibold text-balance md:text-7xl">
              Vom leeren Dokument zum öffentlichen Mat.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {workflow.map(({ icon: Icon, title, text }, index) => (
              <article
                className="border-2 border-[#1c1b17] bg-white p-5"
                key={title}
              >
                <div className="mb-10 flex items-center justify-between">
                  <Icon className="size-8" />
                  <span className="text-xs font-bold tracking-widest uppercase">
                    Schritt {index + 1}
                  </span>
                </div>
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mt-3 leading-7 text-[#5f574a]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function WorkbenchSection() {
  return (
    <section
      className="scroll-mt-20 border-b-2 border-[#1c1b17]"
      id="werkzeuge"
    >
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="border-2 border-[#1c1b17] bg-[#fffaf0]">
            <div className="flex items-center justify-between border-b-2 border-[#1c1b17] p-4">
              <p className="text-xs font-bold tracking-widest uppercase">
                Redaktionspult
              </p>
              <Sparkles className="size-4" />
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-[0.85fr_1.15fr]">
              <div className="space-y-3">
                {["Mobilität", "Klima", "Bildung", "Finanzen"].map((item) => (
                  <div
                    className="flex items-center justify-between border-2 border-[#1c1b17] bg-white p-3 text-sm font-semibold"
                    key={item}
                  >
                    {item}
                    <Check className="size-4" />
                  </div>
                ))}
              </div>
              <div className="border-2 border-[#1c1b17] bg-[#f6d96f] p-5">
                <p className="text-xs font-bold tracking-widest uppercase">
                  Aktuelle These
                </p>
                <h3 className="mt-5 font-heading text-4xl leading-none font-semibold">
                  Schulwege sollen vor Unterrichtsbeginn autofrei sein.
                </h3>
                <div className="mt-8 grid gap-2 sm:grid-cols-3">
                  {["Dafür", "Neutral", "Dagegen"].map((answer) => (
                    <span
                      className="border-2 border-[#1c1b17] bg-[#fffaf0] p-3 text-center text-xs font-bold tracking-widest uppercase"
                      key={answer}
                    >
                      {answer}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-4 text-xs font-bold tracking-widest uppercase">
              Werkzeuge
            </p>
            <h2 className="font-heading text-5xl leading-none font-semibold text-balance md:text-7xl">
              Alles, was einen Wahlhelfer glaubwürdig macht.
            </h2>
            <div className="mt-8 grid gap-3">
              {featureColumns.map((column) => (
                <article
                  className="border-2 border-[#1c1b17] bg-white p-5"
                  key={column.eyebrow}
                >
                  <p className="text-xs font-bold tracking-widest text-[#756b59] uppercase">
                    {column.eyebrow}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold">
                    {column.title}
                  </h3>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {column.points.map((point) => (
                      <span
                        className="border border-[#1c1b17] px-3 py-1 text-xs font-bold tracking-widest uppercase"
                        key={point}
                      >
                        {point}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ExamplesSection() {
  return (
    <section
      className="scroll-mt-20 border-b-2 border-[#1c1b17]"
      id="beispiele"
    >
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mb-4 text-xs font-bold tracking-widest uppercase">
              Beispiele
            </p>
            <h2 className="max-w-3xl font-heading text-5xl leading-none font-semibold text-balance md:text-7xl">
              Ein Format für jede kleine und große Wahl.
            </h2>
          </div>
          <p className="max-w-md text-lg leading-8 text-[#5f574a]">
            My-O-Mat funktioniert überall dort, wo Menschen Positionen
            vergleichen, Thesen erklären und Entscheidungen zugänglich machen
            wollen.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {examples.map(([title, text]) => (
            <article
              className="group border-2 border-[#1c1b17] bg-white p-5 transition hover:-translate-y-1 hover:shadow-[10px_10px_0_#1c1b17]"
              key={title}
            >
              <FileText className="mb-14 size-8 transition group-hover:rotate-3" />
              <h3 className="font-heading text-4xl font-semibold">{title}</h3>
              <p className="mt-3 text-[#5f574a]">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProofSection() {
  return (
    <section className="border-b-2 border-[#1c1b17] bg-[#fffaf0]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-20 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="border-2 border-[#1c1b17] bg-[#1c1b17] p-6 text-[#f4efe3]">
          <MessageSquareQuote className="mb-16 size-10 text-[#f6d96f]" />
          <p className="font-heading text-4xl leading-tight font-semibold">
            „Endlich können wir zeigen, warum Positionen auseinanderliegen,
            statt nur ein Ergebnis auszuspucken.“
          </p>
          <p className="mt-6 text-sm font-bold tracking-widest text-[#cfc6b2] uppercase">
            Beispielstimme aus einem Projektteam
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map(([value, label]) => (
            <div className="border-2 border-[#1c1b17] bg-white p-5" key={value}>
              <p className="font-heading text-6xl font-semibold">{value}</p>
              <p className="mt-5 leading-7 text-[#5f574a]">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="scroll-mt-20" id="starten">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8">
        <div className="border-2 border-[#1c1b17] bg-[#f6d96f] p-6 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="mb-5 text-xs font-bold tracking-widest uppercase">
                Jetzt starten
              </p>
              <h2 className="max-w-4xl font-heading text-5xl leading-none font-semibold text-balance md:text-7xl">
                Der nächste Wahl-O-Mat muss nicht von einer großen Redaktion
                kommen.
              </h2>
            </div>
            <div className="border-2 border-[#1c1b17] bg-[#fffaf0] p-5">
              <div className="mb-8 grid grid-cols-3 gap-2">
                <BookOpenCheck className="size-8" />
                <ClipboardList className="size-8" />
                <BarChart3 className="size-8" />
              </div>
              <p className="leading-7 text-[#5f574a]">
                Lege ein Projekt an, schreibe die ersten Thesen und lade dein
                Team in den Arbeitsbereich ein.
              </p>
              <Button
                asChild
                className="mt-6 w-full bg-[#1c1b17] text-[#f4efe3]"
              >
                <Link href="/app">
                  My-O-Mat erstellen
                  <Globe2 />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function LegalFooter() {
  return (
    <footer className="border-t-2 border-[#1c1b17] bg-[#1c1b17] text-[#f4efe3]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm md:flex-row md:items-center md:justify-between md:px-8">
        <p className="font-heading text-xl font-semibold">My-O-Mat</p>
        <nav className="flex flex-wrap gap-4 text-xs font-bold tracking-widest uppercase">
          <Link className="hover:text-[#f6d96f]" href="/impressum">
            Impressum
          </Link>
          <Link className="hover:text-[#f6d96f]" href="/datenschutz">
            Datenschutz
          </Link>
        </nav>
      </div>
    </footer>
  )
}
