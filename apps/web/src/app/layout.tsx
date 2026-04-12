import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { TenantProvider } from '@/components/layout/TenantProvider'
import { QueryClientProvider } from '@/components/layout/QueryClientProvider'

import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Entity Seven',
  description: 'Entity Seven SaaS Billing Platform',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const messages = await getMessages()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background text-foreground antialiased", inter.className)}>
        <NextIntlClientProvider messages={messages}>
          <QueryClientProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
              <TenantProvider>
                {children}
              </TenantProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
