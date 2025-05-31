
import './globals.css'
export default function RootLayout({ children }) {
  return (
    <html><head>
      <link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/bulma@0.9.4/css/bulma.min.css"
/></head>
      <body>{children}</body>
    </html>
  )
}
