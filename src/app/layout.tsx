// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pump Agent',
  description: 'Launch tokens on pump.fun directly from Telegram',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=yes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}