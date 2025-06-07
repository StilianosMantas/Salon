'use client'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function Layout({ children, params }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bid, setBid] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // Extract bid from params
    const getBid = async () => {
      const resolvedParams = await params
      setBid(resolvedParams.bid)
    }
    getBid()
  }, [params])

  useEffect(() => {
    checkAuth()
    
    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null)
        // Don't redirect here to avoid loops, just clear user state
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    setLoading(false)
  }

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />
  }

  if (!user) {
    return (
      <div className="container py-5">
        <div className="notification is-warning">
          <h2 className="title is-4">Access Denied</h2>
          <p>You need to be logged in to access this page.</p>
          <a href="/login" className="button is-primary mt-3">
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  const base = `/dashboard/${bid}`

  // Helper function to check if route is active
  const isActiveRoute = (route) => {
    if (route === base && pathname === base) return true
    if (route !== base && pathname.startsWith(route)) return true
    return false
  }

  return (
    <div>
      {/* Mobile header */}
      <nav className="navbar is-hidden-tablet" style={{ padding: '1rem' }}>
        <div className="navbar-brand">
          <h2 className="title is-5 mb-0">Salon Dashboard</h2>
          <button 
            className="button is-ghost"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="icon">
              <i className="fas fa-bars"></i>
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="mobile-overlay is-hidden-tablet"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <div className="columns is-gapless" style={{ minHeight: '100vh' }}>
        {/* Mobile sidebar */}
        <aside className={`column is-narrow has-background-light p-5 mobile-sidebar ${sidebarOpen ? 'is-active' : ''} is-hidden-tablet`} style={{ borderRight: '1px solid #dbdbdb' }}>
          <div className="is-flex is-justify-content-space-between is-align-items-center mb-4 is-hidden-tablet">
            <h2 className="title is-5 mb-0">Salon Dashboard</h2>
            <button 
              className="delete is-large"
              onClick={() => setSidebarOpen(false)}
            ></button>
          </div>
          
          <h2 className="title is-4 mb-5 is-hidden-mobile">Salon Dashboard</h2>
          
          <div className="menu">
            <div className="is-flex is-align-items-center mb-4">
              <span className="is-size-7 has-text-grey mr-3">
                Welcome
              </span>
              <LogoutButton />
            </div>
            <ul className="menu-list">
              <li><Link href={base} onClick={() => setSidebarOpen(false)} className={isActiveRoute(base) ? 'is-active' : ''}>Overview</Link></li>
              <li><Link href={`${base}/staff`} onClick={() => setSidebarOpen(false)} className={isActiveRoute(`${base}/staff`) ? 'is-active' : ''}>Staff</Link></li>
              <li><Link href={`${base}/clients`} onClick={() => setSidebarOpen(false)} className={isActiveRoute(`${base}/clients`) ? 'is-active' : ''}>Clients</Link></li>
              <li><Link href={`${base}/services`} onClick={() => setSidebarOpen(false)} className={isActiveRoute(`${base}/services`) ? 'is-active' : ''}>Services</Link></li>
              <li><Link href={`${base}/slots`} onClick={() => setSidebarOpen(false)} className={isActiveRoute(`${base}/slots`) ? 'is-active' : ''}>Appointments</Link></li>
              <li><Link href={`${base}/rules`} onClick={() => setSidebarOpen(false)} className={isActiveRoute(`${base}/rules`) ? 'is-active' : ''}>Rules</Link></li>
            </ul>
          </div>
        </aside>

        {/* Desktop sidebar */}
        <aside className="column is-narrow has-background-light p-5 is-hidden-touch" style={{ borderRight: '1px solid #dbdbdb' }}>
          <h2 className="title is-4 mb-5">Salon Dashboard</h2>
          <div className="menu">
            <div className="is-flex is-align-items-center mb-4">
              <span className="is-size-7 has-text-grey mr-3">
                Welcome
              </span>
              <LogoutButton />
            </div>
            <ul className="menu-list">
              <li><Link href={base} className={isActiveRoute(base) ? 'is-active' : ''}>Overview</Link></li>
              <li><Link href={`${base}/staff`} className={isActiveRoute(`${base}/staff`) ? 'is-active' : ''}>Staff</Link></li>
              <li><Link href={`${base}/clients`} className={isActiveRoute(`${base}/clients`) ? 'is-active' : ''}>Clients</Link></li>
              <li><Link href={`${base}/services`} className={isActiveRoute(`${base}/services`) ? 'is-active' : ''}>Services</Link></li>
              <li><Link href={`${base}/slots`} className={isActiveRoute(`${base}/slots`) ? 'is-active' : ''}>Appointments</Link></li>
              <li><Link href={`${base}/rules`} className={isActiveRoute(`${base}/rules`) ? 'is-active' : ''}>Rules</Link></li>
            </ul>
          </div>
        </aside>

        <main className="column responsive-container">
          {children}
        </main>
      </div>
    </div>
  )
}