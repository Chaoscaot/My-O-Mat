import { Mail, MapPin, Vote } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Impressum",
}

export default function ImpressumPage() {
  return (
    <main className="min-h-screen bg-[#f4efe3] text-[#1c1b17]">
      <LegalHeader />
      <section className="border-b-2 border-[#1c1b17]">
        <div className="mx-auto max-w-4xl px-4 py-14 md:px-8 md:py-20">
          <p className="mb-5 w-fit border-2 border-[#1c1b17] px-3 py-1 text-xs font-bold tracking-widest uppercase">
            Anbieterkennzeichnung
          </p>
          <h1 className="font-heading text-5xl leading-none font-semibold text-balance md:text-7xl">
            Impressum
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#514b40]">
            Angaben gemäß § 5 TMG und verantwortlich für die Inhalte dieser
            Website.
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto grid max-w-4xl gap-6 px-4 py-12 md:px-8">
          <article className="border-2 border-[#1c1b17] bg-[#fffaf0] p-6">
            <h2 className="font-heading text-3xl font-semibold">Anbieter</h2>
            <div className="mt-6 space-y-2 leading-7">
              <p className="font-semibold">Max Späth</p>
              <p>Taunusstraße 3</p>
              <p>35625 Hüttenberg</p>
              <p>Deutschland</p>
            </div>
          </article>

          <article className="border-2 border-[#1c1b17] bg-white p-6">
            <h2 className="font-heading text-3xl font-semibold">Kontakt</h2>
            <div className="mt-6 flex flex-col gap-3">
              <a
                className="inline-flex w-fit items-center gap-3 font-semibold underline decoration-2 underline-offset-4"
                href="mailto:max@maxsp.de"
              >
                <Mail className="size-5" />
                max@maxsp.de
              </a>
              <p className="flex items-center gap-3 text-[#514b40]">
                <MapPin className="size-5" />
                Hüttenberg, Deutschland
              </p>
            </div>
          </article>

          <article className="border-2 border-[#1c1b17] bg-white p-6">
            <h2 className="font-heading text-3xl font-semibold">
              Verantwortlich für Inhalte
            </h2>
            <p className="mt-6 leading-7">
              Verantwortlich für Inhalte nach § 18 Abs. 2 MStV ist Max Späth,
              Taunusstraße 3, 35625 Hüttenberg.
            </p>
          </article>

          <article className="border-2 border-[#1c1b17] bg-white p-6">
            <h2 className="font-heading text-3xl font-semibold">
              Online-Streitbeilegung
            </h2>
            <p className="mt-6 leading-7 text-[#514b40]">
              Die Europäische Kommission stellt eine Plattform zur
              Online-Streitbeilegung bereit. Diese ist unter{" "}
              <a
                className="font-semibold underline decoration-2 underline-offset-4"
                href="https://ec.europa.eu/consumers/odr/"
                rel="noreferrer"
                target="_blank"
              >
                https://ec.europa.eu/consumers/odr/
              </a>{" "}
              erreichbar. Ich bin nicht verpflichtet und nicht bereit, an
              Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
              teilzunehmen.
            </p>
          </article>
        </div>
      </section>
    </main>
  )
}

function LegalHeader() {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-[#1c1b17] bg-[#f4efe3]/92 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-4xl items-center gap-4 px-4 md:px-8">
        <Link className="flex items-center gap-3" href="/">
          <span className="flex size-9 items-center justify-center border-2 border-[#1c1b17] bg-[#1c1b17] text-[#f4efe3]">
            <Vote className="size-4" />
          </span>
          <span className="font-heading text-xl font-semibold">My-O-Mat</span>
        </Link>
        <nav className="ml-auto flex items-center gap-4 text-xs font-bold tracking-widest uppercase">
          <Link className="hover:underline" href="/datenschutz">
            Datenschutz
          </Link>
        </nav>
      </div>
    </header>
  )
}
