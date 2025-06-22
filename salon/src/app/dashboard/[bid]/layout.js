'use client'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useProfile } from '@/hooks/useSupabaseData'

export default function Layout({ children, params }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bid, setBid] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const pathname = usePathname()
  const { data: profile } = useProfile()

  // Keyboard navigation
  useEffect(() => {
    if (!bid) return // Don't setup keyboard navigation until bid is available
    
    const base = `/dashboard/${bid}`
    const handleKeyDown = (e) => {
      // Alt + key combinations for navigation
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        switch(e.key) {
          case '1':
            e.preventDefault()
            window.location.href = base
            break
          case '2':
            e.preventDefault()
            window.location.href = `${base}/appointments`
            break
          case '3':
            e.preventDefault()
            window.location.href = `${base}/clients`
            break
          case '4':
            e.preventDefault()
            window.location.href = `${base}/staff`
            break
          case 'Escape':
            e.preventDefault()
            setSidebarOpen(false)
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [bid])

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
    if (pathname.includes('/settings')) return 'Settings'
    if (pathname.includes('/shifts')) return 'Shifts'
    if (pathname.includes('/chairs')) return 'Chairs'
    if (pathname.includes('/profile')) return 'Profile'
    return 'Salon Dashboard'
  }

  return (
    <div>
      <style jsx>{`
        .tooltip {
          position: relative;
        }
        .tooltip::after {
          content: attr(data-tooltip);
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-left: 10px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          border-radius: 4px;
          font-size: 0.875rem;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.2s, visibility 0.2s;
          z-index: 1000;
          pointer-events: none;
        }
        .tooltip::before {
          content: '';
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-left: 4px;
          border: 6px solid transparent;
          border-right-color: rgba(0, 0, 0, 0.9);
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.2s, visibility 0.2s;
          z-index: 1000;
          pointer-events: none;
        }
        .tooltip:hover::after,
        .tooltip:hover::before {
          opacity: 1;
          visibility: visible;
        }
        .sidebar-transition {
          transition: width 0.3s ease, padding 0.3s ease;
        }
        .text-fade {
          transition: opacity 0.2s ease;
        }
      `}</style>
      {/* Mobile header */}
      <nav className="navbar is-hidden-tablet" style={{ padding: '0.5rem 1.25rem', position: 'sticky', top: 0, zIndex: 30, backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: '44pt' }}>
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
        {/* Mobile search bar for clients and staff pages */}
        {(pathname.includes('/clients') || pathname.includes('/staff')) && (
          <div className="field has-addons" style={{ margin: '0.5rem 0 0 0' }}>
            <div className="control has-icons-left has-icons-right is-expanded">
              <input
                id="mobile-search-input"
                className="input is-small"
                type="text"
                placeholder={pathname.includes('/clients') ? 'Search clients...' : 'Search staff...'}
              />
              <span className="icon is-small is-left">
                <i className="fas fa-search"></i>
              </span>
              <span 
                id="mobile-search-clear"
                className="icon is-small is-right is-clickable" 
                style={{ cursor: 'pointer', pointerEvents: 'all', display: 'none' }}
              >
                <i className="fas fa-times has-text-grey"></i>
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
            <h2 className="title is-5 mb-0 has-text-weight-bold">Salon Dashboard</h2>
            <button 
              className="delete is-large" 
              onClick={() => setSidebarOpen(false)}
              aria-label="close"
              style={{ flexShrink: 0 }}
            >
            </button>
          </div>
          
          <h2 className="title is-4 mb-5 is-hidden-mobile" style={{ textAlign: 'center' }}>Salon</h2>
          
          {/* Mobile User Profile Section */}
          {user && (
            <div className="box mb-4" style={{ padding: '1rem' }}>
              <div className="is-flex is-align-items-center">
                <div className="mr-3">
                  {profile?.avatar_url ? (
                    <figure className="image is-48x48">
                      <img 
                        className="is-rounded" 
                        src={profile.avatar_url} 
                        alt="Your avatar"
                        style={{ objectFit: 'cover' }}
                      />
                    </figure>
                  ) : (
                    <div className="has-background-grey-light is-flex is-justify-content-center is-align-items-center" style={{ width: '48px', height: '48px', borderRadius: '50%' }}>
                      <span className="icon has-text-grey">
                        <i className="fas fa-user"></i>
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="has-text-weight-semibold">{profile?.full_name || user.email}</p>
                  <p className="is-size-7 has-text-grey">{profile?.role || 'Staff'}</p>
                </div>
              </div>
            </div>
          )}
          
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
                <Link href={`${base}/shifts`} onClick={() => setSidebarOpen(false)} className={isActiveRoute(`${base}/shifts`) ? 'is-active' : ''}>
                  <span className="icon-text">
                    <span className="icon">
                      <i className="fas fa-clock"></i>
                    </span>
                    <span>Shifts</span>
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
              <li style={{ marginBottom: '0.5rem' }}>
                <Link href={`${base}/chairs`} onClick={() => setSidebarOpen(false)} className={isActiveRoute(`${base}/chairs`) ? 'is-active' : ''}>
                  <span className="icon-text">
                    <span className="icon">
                      <i className="fas fa-chair"></i>
                    </span>
                    <span>Chairs</span>
                  </span>
                </Link>
                <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link href={`${base}/settings`} onClick={() => setSidebarOpen(false)} className={isActiveRoute(`${base}/settings`) ? 'is-active' : ''}>
                  <span className="icon-text">
                    <span className="icon">
                      <i className="fas fa-wrench"></i>
                    </span>
                    <span>Settings</span>
                  </span>
                </Link>
                <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link href={`${base}/profile`} onClick={() => setSidebarOpen(false)} className={isActiveRoute(`${base}/profile`) ? 'is-active' : ''}>
                  <span className="icon-text">
                    <span className="icon">
                      <i className="fas fa-user"></i>
                    </span>
                    <span>Profile</span>
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
        <aside className={`column is-narrow has-background-light is-hidden-touch sidebar-transition`} style={{ 
          borderRight: '1px solid #dbdbdb', 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100vh', 
          width: sidebarCollapsed ? '80px' : '280px',
          padding: sidebarCollapsed ? '1.5rem 1rem' : '1.5rem'
        }}>
          <div className={`is-flex is-align-items-center mb-5 ${sidebarCollapsed ? 'is-justify-content-center' : 'is-justify-content-space-between'}`} style={{ minHeight: '2rem' }}>
            {!sidebarCollapsed && (
              <h2 className="title is-4 mb-0">
                Salon Dashboard
              </h2>
            )}
            <button 
              className="button is-small is-ghost"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{ flexShrink: 0 }}
            >
              <span className="icon">
                <i className={`fas fa-chevron-${sidebarCollapsed ? 'right' : 'left'}`}></i>
              </span>
            </button>
          </div>
          
          {/* User Profile Section */}
          {user && (
            <div className="box mb-4" style={{ padding: '1rem' }}>
              <div className={`is-flex is-align-items-center ${sidebarCollapsed ? 'is-justify-content-center' : ''}`}>
                <div className={sidebarCollapsed ? '' : 'mr-3'}>
                  {profile?.avatar_url ? (
                    <figure className="image is-48x48">
                      <img 
                        className="is-rounded" 
                        src={profile.avatar_url} 
                        alt="Your avatar"
                        style={{ objectFit: 'cover' }}
                      />
                    </figure>
                  ) : (
                    <div className="has-background-grey-light is-flex is-justify-content-center is-align-items-center" style={{ width: '48px', height: '48px', borderRadius: '50%' }}>
                      <span className="icon has-text-grey">
                        <i className="fas fa-user"></i>
                      </span>
                    </div>
                  )}
                </div>
                {!sidebarCollapsed && (
                  <div className="text-fade">
                    <p className="has-text-weight-semibold">{profile?.full_name || user.email}</p>
                    <p className="is-size-7 has-text-grey">{profile?.role || 'Staff'}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="menu" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <ul className="menu-list" style={{ flex: 1 }}>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link 
                  href={base} 
                  className={`${isActiveRoute(base) ? 'is-active' : ''} ${sidebarCollapsed ? 'tooltip' : ''}`}
                  data-tooltip={sidebarCollapsed ? 'Overview' : ''}
                  style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
                >
                  <span className={sidebarCollapsed ? '' : 'icon-text'}>
                    <span className="icon">
                      <i className="fas fa-chart-bar"></i>
                    </span>
                    {!sidebarCollapsed && <span className="text-fade">Overview</span>}
                  </span>
                </Link>
                {!sidebarCollapsed && <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />}
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link 
                  href={`${base}/staff`} 
                  className={`${isActiveRoute(`${base}/staff`) ? 'is-active' : ''} ${sidebarCollapsed ? 'tooltip' : ''}`}
                  data-tooltip={sidebarCollapsed ? 'Staff' : ''}
                  style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
                >
                  <span className={sidebarCollapsed ? '' : 'icon-text'}>
                    <span className="icon">
                      <i className="fas fa-users"></i>
                    </span>
                    {!sidebarCollapsed && <span className="text-fade">Staff</span>}
                  </span>
                </Link>
                {!sidebarCollapsed && <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />}
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link 
                  href={`${base}/clients`} 
                  className={`${isActiveRoute(`${base}/clients`) ? 'is-active' : ''} ${sidebarCollapsed ? 'tooltip' : ''}`}
                  data-tooltip={sidebarCollapsed ? 'Clients' : ''}
                  style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
                >
                  <span className={sidebarCollapsed ? '' : 'icon-text'}>
                    <span className="icon">
                      <i className="fas fa-user-friends"></i>
                    </span>
                    {!sidebarCollapsed && <span className="text-fade">Clients</span>}
                  </span>
                </Link>
                {!sidebarCollapsed && <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />}
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link 
                  href={`${base}/services`} 
                  className={`${isActiveRoute(`${base}/services`) ? 'is-active' : ''} ${sidebarCollapsed ? 'tooltip' : ''}`}
                  data-tooltip={sidebarCollapsed ? 'Services' : ''}
                  style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
                >
                  <span className={sidebarCollapsed ? '' : 'icon-text'}>
                    <span className="icon">
                      <i className="fas fa-scissors"></i>
                    </span>
                    {!sidebarCollapsed && <span className="text-fade">Services</span>}
                  </span>
                </Link>
                {!sidebarCollapsed && <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />}
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link 
                  href={`${base}/shifts`} 
                  className={`${isActiveRoute(`${base}/shifts`) ? 'is-active' : ''} ${sidebarCollapsed ? 'tooltip' : ''}`}
                  data-tooltip={sidebarCollapsed ? 'Shifts' : ''}
                  style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
                >
                  <span className={sidebarCollapsed ? '' : 'icon-text'}>
                    <span className="icon">
                      <i className="fas fa-clock"></i>
                    </span>
                    {!sidebarCollapsed && <span className="text-fade">Shifts</span>}
                  </span>
                </Link>
                {!sidebarCollapsed && <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />}
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link 
                  href={`${base}/appointments`} 
                  className={`${isActiveRoute(`${base}/appointments`) ? 'is-active' : ''} ${sidebarCollapsed ? 'tooltip' : ''}`}
                  data-tooltip={sidebarCollapsed ? 'Appointments' : ''}
                  style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
                >
                  <span className={sidebarCollapsed ? '' : 'icon-text'}>
                    <span className="icon">
                      <i className="fas fa-calendar-alt"></i>
                    </span>
                    {!sidebarCollapsed && <span className="text-fade">Appointments</span>}
                  </span>
                </Link>
                {!sidebarCollapsed && <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />}
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link 
                  href={`${base}/rules`} 
                  className={`${isActiveRoute(`${base}/rules`) ? 'is-active' : ''} ${sidebarCollapsed ? 'tooltip' : ''}`}
                  data-tooltip={sidebarCollapsed ? 'Rules' : ''}
                  style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
                >
                  <span className={sidebarCollapsed ? '' : 'icon-text'}>
                    <span className="icon">
                      <i className="fas fa-cog"></i>
                    </span>
                    {!sidebarCollapsed && <span className="text-fade">Rules</span>}
                  </span>
                </Link>
                {!sidebarCollapsed && <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />}
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link 
                  href={`${base}/chairs`} 
                  className={`${isActiveRoute(`${base}/chairs`) ? 'is-active' : ''} ${sidebarCollapsed ? 'tooltip' : ''}`}
                  data-tooltip={sidebarCollapsed ? 'Chairs' : ''}
                  style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
                >
                  <span className={sidebarCollapsed ? '' : 'icon-text'}>
                    <span className="icon">
                      <i className="fas fa-chair"></i>
                    </span>
                    {!sidebarCollapsed && <span className="text-fade">Chairs</span>}
                  </span>
                </Link>
                {!sidebarCollapsed && <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />}
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link 
                  href={`${base}/settings`} 
                  className={`${isActiveRoute(`${base}/settings`) ? 'is-active' : ''} ${sidebarCollapsed ? 'tooltip' : ''}`}
                  data-tooltip={sidebarCollapsed ? 'Settings' : ''}
                  style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
                >
                  <span className={sidebarCollapsed ? '' : 'icon-text'}>
                    <span className="icon">
                      <i className="fas fa-wrench"></i>
                    </span>
                    {!sidebarCollapsed && <span className="text-fade">Settings</span>}
                  </span>
                </Link>
                {!sidebarCollapsed && <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />}
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <Link 
                  href={`${base}/profile`} 
                  className={`${isActiveRoute(`${base}/profile`) ? 'is-active' : ''} ${sidebarCollapsed ? 'tooltip' : ''}`}
                  data-tooltip={sidebarCollapsed ? 'Profile' : ''}
                  style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
                >
                  <span className={sidebarCollapsed ? '' : 'icon-text'}>
                    <span className="icon">
                      <i className="fas fa-user"></i>
                    </span>
                    {!sidebarCollapsed && <span className="text-fade">Profile</span>}
                  </span>
                </Link>
                {!sidebarCollapsed && <hr style={{ margin: '0.5rem 0', borderColor: '#e0e0e0' }} />}
              </li>
              <li>
                <div style={{ padding: '0.5rem 0.75rem', textAlign: sidebarCollapsed ? 'center' : 'left' }}>
                  <LogoutButton collapsed={sidebarCollapsed} />
                </div>
              </li>
            </ul>
          </div>
        </aside>

        <main className="column responsive-container" style={{ 
          paddingBottom: '70pt', 
          width: sidebarCollapsed ? 'calc(100% - 80px)' : 'calc(100% - 280px)' 
        }}>
          {/* Desktop page title */}
          <div className="is-hidden-touch" style={{ padding: '1.5rem 1.5rem 0', marginBottom: '1rem' }}>
            <h1 className="title is-4">{getPageTitle()}</h1>
          </div>
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="navbar is-fixed-bottom is-hidden-tablet" style={{ backgroundColor: 'white', borderTop: '1px solid #dbdbdb', height: '50pt', zIndex: 30 }}>
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