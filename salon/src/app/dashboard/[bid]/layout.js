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

  // Get current page title based on pathname
  const getPageTitle = () => {
    if (pathname === base) return 'Overview'
    if (pathname.includes('/staff')) return 'Staff'
    if (pathname.includes('/clients')) return 'Clients'
    if (pathname.includes('/services')) return 'Services'
    if (pathname.includes('/appointments')) return 'Appointments'
    if (pathname.includes('/rules')) return 'Rules'
    return 'Salon Dashboard'
  }

  return (
    <div>
      {/* Mobile header */}
      <nav className="navbar is-hidden-tablet" style={{ padding: '0.75rem 1.25rem', position: 'sticky', top: 0, zIndex: 30, backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div className="navbar-brand" style={{ width: '100%', display: 'flex', alignItems: 'center', position: 'relative' }}>
          <button 
            className="button is-ghost" 
            onClick={() => setSidebarOpen(true)}
            style={{ position: 'absolute', left: '0', zIndex: 10 }}
          >
            <span className="icon">
              <i className="fas fa-bars"></i>
            </span>
          </button>
          <h2 className="title is-5 mb-0" style={{ width: '100%', textAlign: 'center', padding: '0 3.5rem' }}>{getPageTitle()}</h2>
          <div id="mobile-add-button-placeholder" style={{ position: 'absolute', right: '0', zIndex: 10 }}></div>
        </div>
        {/* Mobile search bar for clients page */}
        {pathname.includes('/clients') && (
          <div className="field has-addons" style={{ margin: '0.5rem 0 0 0' }}>
            <div className="control has-icons-left is-expanded">
              <input
                id="mobile-search-input"
                className="input is-small"
                type="text"
                placeholder="Search clients..."
              />
              <span className="icon is-small is-left">
                <i className="fas fa-search"></i>
              </span>
            </div>
          </div>
        )}
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
        <aside className={`column is-narrow has-background-light mobile-sidebar ${sidebarOpen ? 'is-active' : ''} is-hidden-tablet`} style={{ borderRight: '1px solid #dbdbdb', display: 'flex', flexDirection: 'column', height: '100vh', padding: '1.5rem', width: '280px', maxWidth: '80vw' }}>
          <div className="is-flex is-justify-content-space-between is-align-items-center mb-4 is-hidden-tablet">
            <h2 className="title is-5 mb-0">Salon</h2>
            <button 
              className="delete"
              onClick={() => setSidebarOpen(false)}
              aria-label="close"
            >
            </button>
          </div>
          
          <h2 className="title is-4 mb-5 is-hidden-mobile" style={{ textAlign: 'center' }}>Salon</h2>
          
          <div className="menu" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <ul className="menu-list" style={{ flex: 1 }}>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link href={base} onClick={() => setSidebarOpen(false)} className={isActiveRoute(base) ? 'is-active' : ''}>
                  <span className="icon-text">
                    <span className="icon">
                      <i className="fas fa-chart-bar"></i>
                    </span>
                    <span>Overview</span>
                  </span>
                </Link>
                <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link href={`${base}/staff`} onClick={() => setSidebarOpen(false)} className={isActiveRoute(`${base}/staff`) ? 'is-active' : ''}>
                  <span className="icon-text">
                    <span className="icon">
                      <i className="fas fa-users"></i>
                    </span>
                    <span>Staff</span>
                  </span>
                </Link>
                <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link href={`${base}/clients`} onClick={() => setSidebarOpen(false)} className={isActiveRoute(`${base}/clients`) ? 'is-active' : ''}>
                  <span className="icon-text">
                    <span className="icon">
                      <i className="fas fa-user-friends"></i>
                    </span>
                    <span>Clients</span>
                  </span>
                </Link>
                <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link href={`${base}/services`} onClick={() => setSidebarOpen(false)} className={isActiveRoute(`${base}/services`) ? 'is-active' : ''}>
                  <span className="icon-text">
                    <span className="icon">
                      <i className="fas fa-scissors"></i>
                    </span>
                    <span>Services</span>
                  </span>
                </Link>
                <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link href={`${base}/appointments`} onClick={() => setSidebarOpen(false)} className={isActiveRoute(`${base}/appointments`) ? 'is-active' : ''}>
                  <span className="icon-text">
                    <span className="icon">
                      <i className="fas fa-calendar-alt"></i>
                    </span>
                    <span>Appointments</span>
                  </span>
                </Link>
                <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link href={`${base}/rules`} onClick={() => setSidebarOpen(false)} className={isActiveRoute(`${base}/rules`) ? 'is-active' : ''}>
                  <span className="icon-text">
                    <span className="icon">
                      <i className="fas fa-cog"></i>
                    </span>
                    <span>Rules</span>
                  </span>
                </Link>
                <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />
              </li>
              <li>
                <div style={{ padding: '0.5rem 0.75rem' }}>
                  <LogoutButton />
                </div>
              </li>
            </ul>
          </div>
        </aside>

        {/* Desktop sidebar */}
        <aside className="column is-narrow has-background-light p-5 is-hidden-touch" style={{ borderRight: '1px solid #dbdbdb', display: 'flex', flexDirection: 'column', height: '100vh', width: '280px' }}>
          <h2 className="title is-4 mb-5">Salon Dashboard</h2>
          <div className="menu" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <ul className="menu-list" style={{ flex: 1 }}>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link href={base} className={isActiveRoute(base) ? 'is-active' : ''}>
                  <span className="icon-text">
                    <span className="icon">
                      <i className="fas fa-chart-bar"></i>
                    </span>
                    <span>Overview</span>
                  </span>
                </Link>
                <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link href={`${base}/staff`} className={isActiveRoute(`${base}/staff`) ? 'is-active' : ''}>
                  <span className="icon-text">
                    <span className="icon">
                      <i className="fas fa-users"></i>
                    </span>
                    <span>Staff</span>
                  </span>
                </Link>
                <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link href={`${base}/clients`} className={isActiveRoute(`${base}/clients`) ? 'is-active' : ''}>
                  <span className="icon-text">
                    <span className="icon">
                      <i className="fas fa-user-friends"></i>
                    </span>
                    <span>Clients</span>
                  </span>
                </Link>
                <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link href={`${base}/services`} className={isActiveRoute(`${base}/services`) ? 'is-active' : ''}>
                  <span className="icon-text">
                    <span className="icon">
                      <i className="fas fa-scissors"></i>
                    </span>
                    <span>Services</span>
                  </span>
                </Link>
                <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link href={`${base}/appointments`} className={isActiveRoute(`${base}/appointments`) ? 'is-active' : ''}>
                  <span className="icon-text">
                    <span className="icon">
                      <i className="fas fa-calendar-alt"></i>
                    </span>
                    <span>Appointments</span>
                  </span>
                </Link>
                <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link href={`${base}/rules`} className={isActiveRoute(`${base}/rules`) ? 'is-active' : ''}>
                  <span className="icon-text">
                    <span className="icon">
                      <i className="fas fa-cog"></i>
                    </span>
                    <span>Rules</span>
                  </span>
                </Link>
                <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />
              </li>
              <li>
                <div style={{ padding: '0.5rem 0.75rem' }}>
                  <LogoutButton />
                </div>
              </li>
            </ul>
          </div>
        </aside>

        <main className="column responsive-container" style={{ paddingBottom: '80px' }}>
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="navbar is-fixed-bottom is-hidden-tablet" style={{ backgroundColor: 'white', borderTop: '1px solid #dbdbdb', height: '60px', zIndex: 30 }}>
        <div className="navbar-menu" style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', width: '100%', margin: 0 }}>
          <Link href={base} className={`navbar-item has-text-centered ${isActiveRoute(base) ? 'has-text-link' : 'has-text-grey'}`} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0.5rem', minHeight: 'auto' }}>
            <span className="icon">
              <i className="fas fa-chart-bar"></i>
            </span>
          </Link>
          <Link href={`${base}/appointments`} className={`navbar-item has-text-centered ${isActiveRoute(`${base}/appointments`) ? 'has-text-link' : 'has-text-grey'}`} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0.5rem', minHeight: 'auto' }}>
            <span className="icon">
              <i className="fas fa-calendar-alt"></i>
            </span>
          </Link>
          <Link href={`${base}/clients`} className={`navbar-item has-text-centered ${isActiveRoute(`${base}/clients`) ? 'has-text-link' : 'has-text-grey'}`} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0.5rem', minHeight: 'auto' }}>
            <span className="icon">
              <i className="fas fa-user-friends"></i>
            </span>
          </Link>
          <Link href={`${base}/staff`} className={`navbar-item has-text-centered ${isActiveRoute(`${base}/staff`) ? 'has-text-link' : 'has-text-grey'}`} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0.5rem', minHeight: 'auto' }}>
            <span className="icon">
              <i className="fas fa-users"></i>
            </span>
          </Link>
        </div>
      </nav>
    </div>
  )
}