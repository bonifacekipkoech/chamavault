import type { Metadata } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'ChamaVault', template: '%s | ChamaVault' },
  description: 'Digital Chama & Investment Group Management — contributions, loans, meetings, and governance in one place.',
  keywords: ['chama', 'investment group', 'SACCO', 'Kenya', 'M-Pesa', 'savings'],
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  )
}
