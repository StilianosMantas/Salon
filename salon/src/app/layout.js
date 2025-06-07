
import './globals.css'
import ErrorBoundary from '@/components/ErrorBoundary'
import ToastProvider from '@/components/ToastProvider'
import SWRProvider from '@/components/QueryProvider'
import CSRFProvider from '@/components/CSRFProvider'

export default function RootLayout({ children }) {
  return (
    <html><head>
      <link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/bulma@0.9.4/css/bulma.min.css"
/></head>
      <body>
        <CSRFProvider>
          <SWRProvider>
            <ErrorBoundary>
              {children}
              <ToastProvider />
            </ErrorBoundary>
          </SWRProvider>
        </CSRFProvider>
      </body>
    </html>
  )
}
