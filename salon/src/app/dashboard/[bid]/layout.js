import Link from 'next/link'

export default async function Layout(props) {
  const { children, params } = await props
  const { bid } = await params

  const base = `/dashboard/${bid}`

  return (
    <div className="columns is-gapless" style={{ minHeight: '100vh' }}>
      <aside className="column is-narrow has-background-light p-5" style={{ borderRight: '1px solid #dbdbdb' }}>
        <h2 className="title is-4 mb-5">Salon Dashboard</h2>
        <div className="menu">
          <ul className="menu-list">
            <li><Link href={base}>Overview</Link></li>
            <li><Link href={`${base}/staff`}>Staff</Link></li>
            <li><Link href={`${base}/clients`}>Clients</Link></li>
            <li><Link href={`${base}/services`}>Services</Link></li>
            <li><Link href={`${base}/slots`}>Appointments</Link></li>
             
          </ul>
        </div>
      </aside>
      <main className="column p-6">
        {children}
      </main>
    </div>
  )
}