'use client'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LogoutButton({ className = "" }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Logout button clicked')
    }
    setLoading(true)
    
    try {
      // Sign out from Supabase with scope 'global' to clear all sessions
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      
      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error logging out:', error.message)
        }
      }
      
      // Clear all cookies manually (this is the key part!)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      let projectRef = 'default'
      
      try {
        if (supabaseUrl && typeof window !== 'undefined') {
          projectRef = new URL(supabaseUrl).hostname.split('.')[0]
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Could not extract project ref from Supabase URL:', error)
        }
      }
      
      const cookiesToClear = [
        `sb-${projectRef}-auth-token`,
        `sb-${projectRef}-auth-token.0`,
        `sb-${projectRef}-auth-token.1`,
        `sb-${projectRef}-auth-token.2`,
        'sb-access-token',
        'sb-refresh-token'
      ]
      
      cookiesToClear.forEach(cookieName => {
        // Clear cookie for current domain
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        // Clear cookie for all subdomains
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`
        // Clear cookie for parent domain
        const parentDomain = window.location.hostname.split('.').slice(-2).join('.')
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${parentDomain};`
      })
      
      // Clear localStorage and sessionStorage
      localStorage.clear()
      sessionStorage.clear()
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Cookies and storage cleared')
      }
      
      // Force complete page reload to login page to ensure everything is cleared
      window.location.replace('/login')
      
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Unexpected error:', error)
      }
      // Even if there's an error, try to clear everything
      localStorage.clear()
      sessionStorage.clear()
      window.location.replace('/login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={`button is-small is-outlined is-danger ${loading ? 'is-loading' : ''} ${className}`}
      style={{ 
        borderRadius: '6px',
        fontWeight: '500',
        width: '100%',
        justifyContent: 'center'
      }}
    >
      <span className="icon is-small">
        <i className="fas fa-sign-out-alt"></i>
      </span>
      <span>{loading ? 'Logging out...' : 'Logout'}</span>
    </button>
  )
}