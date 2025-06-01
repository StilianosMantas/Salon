'use client'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LogoutButton({ className = "" }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    console.log('Logout button clicked')
    setLoading(true)
    
    try {
      // Sign out from Supabase with scope 'global' to clear all sessions
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      
      if (error) {
        console.error('Error logging out:', error.message)
      }
      
      // Clear all cookies manually (this is the key part!)
      const cookiesToClear = [
        'sb-xwbvyxgsjorwgidgwrvm-auth-token',
        'sb-xwbvyxgsjorwgidgwrvm-auth-token.0',
        'sb-xwbvyxgsjorwgidgwrvm-auth-token.1',
        'sb-xwbvyxgsjorwgidgwrvm-auth-token.2',
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
      
      console.log('Cookies and storage cleared')
      
      // Force complete page reload to login page to ensure everything is cleared
      window.location.replace('/login')
      
    } catch (error) {
      console.error('Unexpected error:', error)
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
      className={`button is-small is-danger ${loading ? 'is-loading' : ''} ${className}`}
    >
      {loading ? 'Logging out...' : 'Logout'}
    </button>
  )
}