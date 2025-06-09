'use client'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function Layout({ children, params }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bid, setBid] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // Extract bid from params
    const getBid = async () => {
      const resolvedParams = await params
      setBid(resolvedParams.bid)
    }
    getBid()
  }, [params])

  const checkAuth = useCallback(async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Dashboard auth check:', { hasUser: !!user, error: !!error, pathname })
      }
      
      if (error) {
        console.error('Auth error in dashboard:', error)
        setUser(null)
      } else {
        setUser(user)
      }
      
      setAuthChecked(true)
    } catch (err) {
      console.error('Failed to check auth:', err)
      setUser(null)
      setAuthChecked(true)
    } finally {
      setLoading(false)
    }
  }, [pathname])

  useEffect(() => {
    checkAuth()
    
    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Dashboard auth state change:', { event, hasUser: !!session?.user })
      }
      
      if (event === 'SIGNED_OUT') {
        setUser(null)
        window.location.replace('/login')
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        setLoading(false)
        setAuthChecked(true)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [checkAuth])

  // Handle authentication timeout
  useEffect(() => {
    if (!loading && !user && authChecked) {
      // If we've checked auth and there's no user, redirect after a brief delay
      const timeout = setTimeout(() => {
        if (process.env.NODE_ENV === 'development') {
          console.log('No user found after auth check, redirecting to login')
        }
        window.location.replace('/login')
      }, 1000)
      
      return () => clearTimeout(timeout)
    }
  }, [loading, user, authChecked])

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />
  }

  if (!user) {
    // Show loading while we're still checking auth or waiting for redirect
    return <LoadingSpinner message="Checking authentication..." />
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
        <div className="navbar-brand is-flex is-justify-content-space-between is-align-items-center" style={{ width: '100%' }}>
          <h2 className="title is-5 mb-0">Salon Dashboard</h2>
          <button 
            className="button is-ghost"
            onClick={() => setSidebarOpen(true)}
            style={{ marginLeft: 'auto' }}
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
        <aside className={`column is-narrow has-background-light p-5 mobile-sidebar ${sidebarOpen ? 'is-active' : ''} is-hidden-tablet`} style={{ borderRight: '1px solid #dbdbdb', display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <div className="is-flex is-justify-content-space-between is-align-items-center mb-4 is-hidden-tablet">
            <h2 className="title is-5 mb-0">Salon Dashboard</h2>
            <button 
              className="delete is-large"
              onClick={() => setSidebarOpen(false)}
            ></button>
          </div>
          
          <h2 className="title is-4 mb-5 is-hidden-mobile">Salon Dashboard</h2>
          
          <div className="menu" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <ul className="menu-list" style={{ flex: 1 }}>
              <li><Link href={base} onClick={() => setSidebarOpen(false)} className={isActiveRoute(base) ? 'is-active' : ''}>Overview</Link></li>
              <li><Link href={`${base}/staff`} onClick={() => setSidebarOpen(false)} className={isActiveRoute(`${base}/staff`) ? 'is-active' : ''}>Staff</Link></li>
              <li><Link href={`${base}/clients`} onClick={() => setSidebarOpen(false)} className={isActiveRoute(`${base}/clients`) ? 'is-active' : ''}>Clients</Link></li>
              <li><Link href={`${base}/services`} onClick={() => setSidebarOpen(false)} className={isActiveRoute(`${base}/services`) ? 'is-active' : ''}>Services</Link></li>
              <li><Link href={`${base}/slots`} onClick={() => setSidebarOpen(false)} className={isActiveRoute(`${base}/slots`) ? 'is-active' : ''}>Appointments</Link></li>
              <li><Link href={`${base}/rules`} onClick={() => setSidebarOpen(false)} className={isActiveRoute(`${base}/rules`) ? 'is-active' : ''}>Rules</Link></li>
            </ul>
            <div className="mt-auto pt-4 border-top">
              <div className="is-flex is-flex-direction-column is-align-items-start">
                <span className="is-size-7 has-text-grey mb-2">
                  Welcome
                </span>
                <LogoutButton />
              </div>
            </div>
          </div>
        </aside>

        {/* Desktop sidebar */}
        <aside className="column is-narrow has-background-light p-5 is-hidden-touch" style={{ borderRight: '1px solid #dbdbdb', display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <h2 className="title is-4 mb-5">Salon Dashboard</h2>
          <div className="menu" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <ul className="menu-list" style={{ flex: 1 }}>
              <li><Link href={base} className={isActiveRoute(base) ? 'is-active' : ''}>Overview</Link></li>
              <li><Link href={`${base}/staff`} className={isActiveRoute(`${base}/staff`) ? 'is-active' : ''}>Staff</Link></li>
              <li><Link href={`${base}/clients`} className={isActiveRoute(`${base}/clients`) ? 'is-active' : ''}>Clients</Link></li>
              <li><Link href={`${base}/services`} className={isActiveRoute(`${base}/services`) ? 'is-active' : ''}>Services</Link></li>
              <li><Link href={`${base}/slots`} className={isActiveRoute(`${base}/slots`) ? 'is-active' : ''}>Appointments</Link></li>
              <li><Link href={`${base}/rules`} className={isActiveRoute(`${base}/rules`) ? 'is-active' : ''}>Rules</Link></li>
            </ul>
            <div className="mt-auto pt-4" style={{ borderTop: '1px solid #dbdbdb' }}>
              <div className="is-flex is-flex-direction-column is-align-items-start">
                <span className="is-size-7 has-text-grey mb-2">
                  Welcome
                </span>
                <LogoutButton />
              </div>
            </div>
          </div>
        </aside>

        <main className="column responsive-container">
          {children}
        </main>
      </div>
    </div>
  )
}