import {
  Database,
  type LucideIcon,
  Mail,
  Server,
  ShieldCheck,
  UserCheck,
  Vote,
} from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
}

const processors = [
  {
    title: "Vercel",
    text: "Die Website wird über Vercel bereitgestellt. Beim Aufruf der Website verarbeitet Vercel technische Zugriffsdaten, etwa IP-Adresse, Zeitpunkt, angefragte Ressourcen und Browserinformationen. Die Infrastruktur nutzt unter anderem AWS in Irland beziehungsweise Europa.",
  },
  {
    title: "Convex",
    text: "Convex wird als Backend für App-Daten genutzt. Dazu können Daten verarbeitet werden, die für Nutzerkonten, Projekte, Inhalte, Antworten, Einstellungen und die Bereitstellung der My-O-Mat-Funktionen erforderlich sind.",
  },
  {
    title: "Clerk",
    text: "Clerk wird für Authentifizierung und Nutzerkonten eingesetzt. Dabei verarbeitet Clerk insbesondere Anmelde- und Kontodaten, damit Nutzer sich registrieren, anmelden und ihre Arbeitsbereiche verwenden können.",
  },
  {
    title: "PostHog",
    text: "PostHog wird zur Produktanalyse verwendet. Dabei können Nutzungsereignisse, technische Informationen und Interaktionen erfasst werden, um Stabilität, Bedienbarkeit und Funktionsumfang der Website zu verbessern.",
  },
]

export default function DatenschutzPage() {
  return (
    <main className="min-h-screen bg-[#f4efe3] text-[#1c1b17]">
      <LegalHeader />
      <section className="border-b-2 border-[#1c1b17]">
        <div className="mx-auto max-w-4xl px-4 py-14 md:px-8 md:py-20">
          <p className="mb-5 w-fit border-2 border-[#1c1b17] px-3 py-1 text-xs font-bold tracking-widest uppercase">
            Datenschutz
          </p>
          <h1 className="font-heading text-5xl leading-none font-semibold text-balance md:text-7xl">
            Datenschutzerklärung
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#514b40]">
            Diese Erklärung informiert darüber, welche personenbezogenen Daten
            bei der Nutzung von My-O-Mat verarbeitet werden.
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto grid max-w-4xl gap-6 px-4 py-12 md:px-8">
          <article className="border-2 border-[#1c1b17] bg-[#fffaf0] p-6">
            <h2 className="font-heading text-3xl font-semibold">
              Verantwortlicher
            </h2>
            <div className="mt-6 space-y-2 leading-7">
              <p className="font-semibold">Max Späth</p>
              <p>Taunusstraße 3</p>
              <p>35625 Hüttenberg</p>
              <p>Deutschland</p>
              <a
                className="inline-flex items-center gap-3 font-semibold underline decoration-2 underline-offset-4"
                href="mailto:max@maxsp.de"
              >
                <Mail className="size-5" />
                max@maxsp.de
              </a>
            </div>
          </article>

          <article className="border-2 border-[#1c1b17] bg-white p-6">
            <h2 className="font-heading text-3xl font-semibold">
              Zwecke und Rechtsgrundlagen
            </h2>
            <div className="mt-6 space-y-4 leading-7 text-[#514b40]">
              <p>
                Personenbezogene Daten werden verarbeitet, um diese Website und
                die My-O-Mat-App bereitzustellen, Nutzerkonten zu ermöglichen,
                Projekte und Inhalte zu speichern, Sicherheit herzustellen und
                die Nutzung der Anwendung nachvollziehbar zu verbessern.
              </p>
              <p>
                Rechtsgrundlagen sind insbesondere Art. 6 Abs. 1 lit. b DSGVO,
                soweit die Verarbeitung für die Nutzung der Anwendung
                erforderlich ist, Art. 6 Abs. 1 lit. f DSGVO für berechtigte
                Interessen an Betrieb, Sicherheit und Verbesserung der Website
                sowie Art. 6 Abs. 1 lit. a DSGVO, sofern eine Einwilligung
                eingeholt wird.
              </p>
            </div>
          </article>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoCard
              icon={UserCheck}
              title="Nutzerkonten"
              text="Bei Registrierung und Anmeldung werden Kontodaten verarbeitet. In der App können außerdem Projekte, Inhalte, Antworten, Einstellungen und Arbeitsbereichsdaten gespeichert werden."
            />
            <InfoCard
              icon={Database}
              title="Kontakt per E-Mail"
              text="Wenn du per E-Mail Kontakt aufnimmst, werden deine Angaben zur Bearbeitung der Anfrage und für mögliche Anschlussfragen verarbeitet."
            />
            <InfoCard
              icon={Server}
              title="Hosting"
              text="Für den Betrieb werden technische Zugriffsdaten verarbeitet. Das Hosting erfolgt über Vercel mit Infrastruktur in Europa, insbesondere AWS Irland."
            />
            <InfoCard
              icon={ShieldCheck}
              title="Sicherheit"
              text="Technische Daten können verarbeitet werden, um Missbrauch zu verhindern, Fehler zu analysieren und die Verfügbarkeit der Anwendung zu sichern."
            />
          </div>

          <article className="border-2 border-[#1c1b17] bg-white p-6">
            <h2 className="font-heading text-3xl font-semibold">
              Eingesetzte Dienste
            </h2>
            <div className="mt-6 grid gap-4">
              {processors.map((processor) => (
                <section
                  className="border-2 border-[#1c1b17] bg-[#fffaf0] p-5"
                  key={processor.title}
                >
                  <h3 className="text-xl font-semibold">{processor.title}</h3>
                  <p className="mt-3 leading-7 text-[#514b40]">
                    {processor.text}
                  </p>
                </section>
              ))}
            </div>
          </article>

          <article className="border-2 border-[#1c1b17] bg-white p-6">
            <h2 className="font-heading text-3xl font-semibold">
              Speicherdauer
            </h2>
            <p className="mt-6 leading-7 text-[#514b40]">
              Personenbezogene Daten werden nur so lange gespeichert, wie sie
              für die genannten Zwecke erforderlich sind oder gesetzliche
              Aufbewahrungspflichten bestehen. Nutzerkonto- und Projektdaten
              werden grundsätzlich bis zur Löschung des Kontos oder der
              jeweiligen Inhalte gespeichert.
            </p>
          </article>

          <article className="border-2 border-[#1c1b17] bg-white p-6">
            <h2 className="font-heading text-3xl font-semibold">
              Deine Rechte
            </h2>
            <p className="mt-6 leading-7 text-[#514b40]">
              Du hast nach Maßgabe der DSGVO Rechte auf Auskunft, Berichtigung,
              Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit
              und Widerspruch. Sofern eine Verarbeitung auf Einwilligung beruht,
              kannst du diese Einwilligung jederzeit mit Wirkung für die
              Zukunft widerrufen. Außerdem besteht ein Beschwerderecht bei
              einer Datenschutzaufsichtsbehörde.
            </p>
          </article>

          <article className="border-2 border-[#1c1b17] bg-[#1c1b17] p-6 text-[#f4efe3]">
            <h2 className="font-heading text-3xl font-semibold">Kontakt</h2>
            <p className="mt-6 leading-7 text-[#d8cfbd]">
              Für Datenschutzfragen kannst du dich jederzeit per E-Mail an{" "}
              <a
                className="font-semibold text-[#f6d96f] underline decoration-2 underline-offset-4"
                href="mailto:max@maxsp.de"
              >
                max@maxsp.de
              </a>{" "}
              wenden.
            </p>
          </article>
        </div>
      </section>
    </main>
  )
}

function InfoCard({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon
  title: string
  text: string
}) {
  return (
    <article className="border-2 border-[#1c1b17] bg-white p-5">
      <Icon className="mb-8 size-8" />
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-3 leading-7 text-[#514b40]">{text}</p>
    </article>
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
          <Link className="hover:underline" href="/impressum">
            Impressum
          </Link>
        </nav>
      </div>
    </header>
  )
}
