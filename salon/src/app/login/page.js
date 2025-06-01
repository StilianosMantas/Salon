'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('magic')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    let mounted = true
    
    // Handle authentication state changes (including magic link callbacks)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', { event, user: session?.user?.id })
      if (event === 'SIGNED_IN' && session?.user && !redirecting && mounted) {
        console.log('User signed in, attempting redirect')
        setRedirecting(true)
        setLoading(true)
        await redirectToSalon(session.user.id)
      }
    })

    // Check if user is already logged in
    const checkInitialUser = async () => {
      if (redirecting || !mounted) return
      console.log('Checking if user is already logged in...')
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Current user:', user?.id)
      if (user && mounted) {
        console.log('User already logged in, redirecting...')
        setRedirecting(true)
        await redirectToSalon(user.id)
      }
    }
    
    checkInitialUser()

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])


  async function redirectToSalon(userId) {
    console.log('Redirecting user to dashboard/3:', userId)
    
    // Check if we're already on a dashboard page to prevent loops
    if (window.location.pathname.startsWith('/dashboard')) {
      console.log('Already on dashboard, skipping redirect')
      return
    }
    
    // Simple redirect without database lookup for now
    window.location.href = '/dashboard/3'
  }

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

  if (redirecting) {
    return (
      <div className="container py-5">
        <div className="columns is-centered">
          <div className="column is-half">
            <div className="box has-text-centered">
              <div className="is-loading-custom">
                <div className="notification is-info">
                  <h2 className="title is-4">Redirecting to Dashboard...</h2>
                  <p>Please wait while we redirect you.</p>
                </div>
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

              <div className="field">
                <label className="label">Email</label>
                <div className="control">
                  <input 
                    className="input" 
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
                <div className="field">
                  <label className="label">Password</label>
                  <div className="control">
                    <input 
                      className="input" 
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

              <div className="field">
                <div className="control">
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

              <div className="field">
                <div className="control">
                  <button 
                    className={`button is-primary is-fullwidth ${loading ? 'is-loading' : ''}`} 
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