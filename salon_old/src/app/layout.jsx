 

import './globals.css'
import { Inter } from 'next/font/google'
import clsx from 'clsx'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              const t=localStorage.getItem('theme');
              if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){
                document.documentElement.classList.add('dark');
              }
            `
          }}
        />
      </head>
      <body className={clsx(inter.className, 'min-h-screen')}>{children}</body>
    </html>
  )
}