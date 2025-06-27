'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('magic')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [redirecting, setRedirecting] = useState(false)
  const [lookingUpSalon, setLookingUpSalon] = useState(false)

  const redirectToSalon = useCallback(async (userId) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Redirecting user to salon')
    }
    
    // Check if we're already on a dashboard page to prevent loops
    if (window.location.pathname.startsWith('/dashboard')) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Already on dashboard, skipping redirect')
      }
      return
    }
    
    try {
      setLookingUpSalon(true)
      // Look up user's salon memberships
      const { data: memberships, error } = await supabase
        .from('business_member')
        .select('business_id, business(id, name)')
        .eq('user_id', userId)
      
      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching user memberships:', error)
        }
        setMessage('Error accessing your salon. Please contact support.')
        return
      }
      
      if (!memberships || memberships.length === 0) {
        setMessage('No salon access found. Please contact your salon administrator.')
        return
      }
      
      // If user has access to only one salon, redirect directly
      if (memberships.length === 1) {
        // Use location.replace to avoid back button issues
        window.location.replace(`/dashboard/${memberships[0].business_id}`)
      } else {
        // If multiple salons, redirect to selection page
        window.location.replace('/dashboard')
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Unexpected error during redirect:', error)
      }
      setMessage('Something went wrong. Please try again.')
    } finally {
      setLookingUpSalon(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    
    // Handle authentication state changes (including magic link callbacks)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Auth state change:', { event, hasUser: !!session?.user })
      }
      if (event === 'SIGNED_IN' && session?.user && !redirecting && mounted) {
        if (process.env.NODE_ENV === 'development') {
          console.log('User signed in, attempting redirect')
        }
        setRedirecting(true)
        setLoading(true)
        // Add a small delay to ensure session is fully established
        setTimeout(async () => {
          await redirectToSalon(session.user.id)
        }, 500)
      }
    })

    // Check if user is already logged in
    const checkInitialUser = async () => {
      if (redirecting || !mounted) return
      if (process.env.NODE_ENV === 'development') {
        console.log('Checking if user is already logged in...')
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (process.env.NODE_ENV === 'development') {
        console.log('Current user:', !!user)
      }
      if (user && mounted) {
        if (process.env.NODE_ENV === 'development') {
          console.log('User already logged in, redirecting...')
        }
        setRedirecting(true)
        // Add small delay for consistency
        setTimeout(async () => {
          await redirectToSalon(user.id)
        }, 300)
      }
    }
    
    checkInitialUser()

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [redirectToSalon, redirecting])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    
    if (mode === 'magic') {
      const { error } = await supabase.auth.signInWithOtp({ 
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/login`
        }
      })
      if (error) {
        setMessage(error.message)
      } else {
        setMessage('Check your email for the login link!')
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage(error.message)
      } else if (data?.user) {
        await redirectToSalon(data.user.id)
      }
    }
    setLoading(false)
  }

  if (redirecting || lookingUpSalon) {
    return (
      <div className="container py-5">
        <div className="columns is-centered">
          <div className="column is-half">
            <div className="box has-text-centered">
              <div className="notification is-info">
                <h2 className="title is-4">
                  {lookingUpSalon ? 'Finding Your Salon...' : 'Redirecting to Dashboard...'}
                </h2>
                <p>
                  {lookingUpSalon ? 'Please wait while we look up your salon access.' : 'Please wait while we redirect you.'}
                </p>
                <progress className="progress is-small is-primary mt-3" max="100">15%</progress>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-5">
      <div className="columns is-centered">
        <div className="column is-half">
          <div className="box">
            <form onSubmit={handleLogin}>
              <h2 className="title is-4 has-text-centered">Salon Login</h2>
              
              {message && (
                <div className={`notification ${message.includes('error') || message.includes('No salon') ? 'is-danger' : 'is-info'}`}>
                  {message}
                </div>
              )}

              <div className="salon-field">
                <label className="salon-label">Email</label>
                <div className="salon-control">
                  <input 
                    className="salon-input" 
                    type="email" 
                    placeholder="Enter your email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                    disabled={loading}
                  />
                </div>
              </div>

              {mode === 'password' && (
                <div className="salon-field">
                  <label className="salon-label">Password</label>
                  <div className="salon-control">
                    <input 
                      className="salon-input" 
                      type="password" 
                      placeholder="Enter your password" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      required 
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              <div className="salon-field">
                <div className="salon-control">
                  <label className="radio">
                    <input 
                      type="radio" 
                      name="mode" 
                      value="magic" 
                      checked={mode === 'magic'} 
                      onChange={() => setMode('magic')}
                      disabled={loading}
                    />
                    Magic Link
                  </label>
                  <label className="radio ml-4">
                    <input 
                      type="radio" 
                      name="mode" 
                      value="password" 
                      checked={mode === 'password'} 
                      onChange={() => setMode('password')}
                      disabled={loading}
                    />
                    Email/Password
                  </label>
                </div>
              </div>

              <div className="salon-field">
                <div className="salon-control">
                  <button 
                    className={`salon-button is-primary is-fullwidth ${loading ? 'is-loading' : ''}`} 
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Signing In...' : 'Login'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}