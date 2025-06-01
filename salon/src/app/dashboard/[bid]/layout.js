'use client'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Layout({ children, params }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bid, setBid] = useState(null)

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
    return (
      <div className="container py-5">
        <div className="notification is-info">
          <h2 className="title is-4">Loading...</h2>
        </div>
      </div>
    )
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

  return (
    <div className="columns is-gapless" style={{ minHeight: '100vh' }}>

      <aside className="column is-narrow has-background-light p-5" style={{ borderRight: '1px solid #dbdbdb' }}>
        <h2 className="title is-4 mb-5">Salon Dashboard</h2>
        <div className="menu">
                      <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome
              </span>
              <LogoutButton />
            </div>
          <ul className="menu-list">
            <li><Link href={base}>Overview</Link></li>
            <li><Link href={`${base}/staff`}>Staff</Link></li>
            <li><Link href={`${base}/clients`}>Clients</Link></li>
            <li><Link href={`${base}/services`}>Services</Link></li>
            <li><Link href={`${base}/slots`}>Appointments</Link></li>
            <li><Link href={`${base}/rules`}>Rules</Link></li>
             
          </ul>
        </div>
      </aside>
      <main className="column p-6">
        {children}
      </main>
    </div>
  )
}