import type { Metadata } from 'next'
import { Syne, DM_Mono } from 'next/font/google'
import './globals.css'

const syne = Syne({ variable: '--font-syne', subsets: ['latin'], weight: ['400','500','600','700','800'] })
const dmMono = DM_Mono({ variable: '--font-mono', subsets: ['latin'], weight: ['400','500'] })

export const metadata: Metadata = {
  title: 'Pump Agent — Launch Tokens with Telegram',
  description: 'Launch meme tokens on pump.fun directly from Telegram. Earn 90% of trading fees.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${syne.variable} ${dmMono.variable}`}>
        {children}
      </body>
    </html>
  )
}