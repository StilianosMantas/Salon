
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
      
      {/* PWA Meta Tags */}
      <meta name="application-name" content="Salon Pro" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Salon Pro" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="msapplication-config" content="/icons/browserconfig.xml" />
      <meta name="msapplication-TileColor" content="#3273dc" />
      <meta name="msapplication-tap-highlight" content="no" />
      <meta name="theme-color" content="#3273dc" />

      {/* PWA Icons */}
      <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
      <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />

      <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-96x96.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-72x72.png" />
      <link rel="manifest" href="/manifest.json" />
      <link rel="mask-icon" href="/icons/icon-512x512.png" color="#3273dc" />
      <link rel="shortcut icon" href="/favicon.ico" />

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
