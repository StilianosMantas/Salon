'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getCSRFToken, initializeCSRF } from '@/lib/csrf'
import { bookingSchema, validateSchema } from '@/lib/validations'
import { sanitizeFormData } from '@/lib/sanitization'

export default function ConfirmBookingPage() {
  const { bid } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()

  const slotId = searchParams.get('slot')
  const serviceIds = searchParams.getAll('service')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const [csrfToken, setCsrfToken] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    // Initialize CSRF token
    const token = initializeCSRF()
    setCsrfToken(token)

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user)
        setEmail(user.email)
      }
    })
  }, [])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setFieldErrors({})

    try {
      const payload = {
        name,
        email,
        phone,
        bid,
        slotId,
        serviceIds,
      }
      
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.details) {
            const errors = {}
            for (const field in data.details.fieldErrors) {
                errors[field] = data.details.fieldErrors[field][0]
            }
            setFieldErrors(errors)
            setError('Please correct the errors below.')
        } else {
            throw new Error(data.error || 'An unknown error occurred.')
        }
      } else {
        const successUrl = new URL(`/book/${bid}/success`, window.location.origin)
        successUrl.searchParams.set('appointmentId', data.appointmentId)
        router.push(successUrl.pathname + successUrl.search)
      }

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1 className="title is-3">Confirm Your Booking</h1>
      {!user && (
        <div className="box mb-4">
          <p className="mb-2">You can sign in to autofill your details:</p>
          <button className="button is-info" onClick={signInWithGoogle}>Sign in with Google</button>
          <p className="mt-2">Or continue as guest below.</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="box">
        {/* CSRF Token */}
        <input type="hidden" name="csrf_token" value={csrfToken || ''} />
        
        <div className="field">
          <label className="label">Full Name</label>
          <div className="control">
            <input 
              className={`input ${fieldErrors.name ? 'is-danger' : ''}`} 
              required 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
          {fieldErrors.name && <p className="help is-danger">{fieldErrors.name}</p>}
        </div>

        <div className="field">
          <label className="label">Email</label>
          <div className="control">
            <input 
              className={`input ${fieldErrors.email ? 'is-danger' : ''}`} 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />
          </div>
          {fieldErrors.email && <p className="help is-danger">{fieldErrors.email}</p>}
        </div>

        <div className="field">
          <label className="label">Phone</label>
          <div className="control">
            <input 
              className={`input ${fieldErrors.phone ? 'is-danger' : ''}`} 
              required 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
            />
          </div>
          {fieldErrors.phone && <p className="help is-danger">{fieldErrors.phone}</p>}
        </div>

        {error && <p className="has-text-danger">{error}</p>}

        <div className="control mt-4">
          <button className={`button is-primary ${loading ? 'is-loading' : ''}`} type="submit">
            Confirm Booking
          </button>
        </div>
      </form>
    </div>
  )
}
