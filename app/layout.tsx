import { ClerkProvider } from "@clerk/nextjs"
import { deDE } from "@clerk/localizations"
import { Geist_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google"

import "./globals.css"
import { ConvexClientProvider } from "@/components/convex-client-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const fontSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
})

const fontHeading = Newsreader({
  subsets: ["latin"],
  variable: "--font-display",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        fontHeading.variable,
        "font-sans",
        fontSans.variable
      )}
    >
      <body>
        <ClerkProvider localization={deDE}>
          <ConvexClientProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
