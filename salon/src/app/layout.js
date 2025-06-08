
import './globals.css'
import ErrorBoundary from '@/components/ErrorBoundary'
import ToastProvider from '@/components/ToastProvider'
import SWRProvider from '@/components/QueryProvider'
import CSRFProvider from '@/components/CSRFProvider'
import NavigationLoader from '@/components/NavigationLoader'

export default function RootLayout({ children }) {
  return (
    <html><head>
      <title>Salon Pro - Professional Salon Management</title>
      <meta name="description" content="Professional salon booking and management system. Book appointments online or manage your salon operations." />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bulma@0.9.4/css/bulma.min.css"
      />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />
    </head>
      <body>
        <CSRFProvider>
          <SWRProvider>
            <ErrorBoundary>
              <NavigationLoader />
              {children}
              <ToastProvider />
            </ErrorBoundary>
          </SWRProvider>
        </CSRFProvider>
      </body>
    </html>
  )
}
