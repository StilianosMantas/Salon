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

    // Validate CSRF token
    const currentToken = getCSRFToken()
    if (!currentToken || currentToken !== csrfToken) {
      setError('Security validation failed. Please refresh the page and try again.')
      setLoading(false)
      return
    }

    // Prepare form data
    const formData = { name, email, phone }
    
    // Sanitize inputs
    const sanitizedForm = sanitizeFormData(formData)
    
    // Validate form data
    const validation = validateSchema(bookingSchema, sanitizedForm)
    if (!validation.success) {
      setFieldErrors(validation.errors)
      setLoading(false)
      return
    }

    try {
      const { data: client, error: clientError } = await supabase
        .from('client')
        .upsert({
          name: sanitizedForm.name,
          email: sanitizedForm.email,
          mobile: sanitizedForm.phone,
          business_id: bid
        }, { onConflict: ['email', 'business_id'] })
        .select('id')
        .single()

      if (clientError) throw clientError

      const { error: slotError } = await supabase
        .from('slot')
        .update({ client_id: client.id, book_status: 'booked' })
        .eq('id', slotId)

      if (slotError) throw slotError

      // Insert all selected services
      const serviceLinks = serviceIds.map(serviceId => ({
        slot_id: slotId,
        service_id: serviceId
      }))
      
      const { error: serviceLinkError } = await supabase
        .from('slot_service')
        .upsert(serviceLinks)

      if (serviceLinkError) throw serviceLinkError

      // Generate booking reference
      const bookingRef = `BK${Date.now().toString().slice(-8)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`
      
      // Create URL with booking details
      const successUrl = new URL(`/book/${bid}/success`, window.location.origin)
      successUrl.searchParams.set('ref', bookingRef)
      successUrl.searchParams.set('slot', slotId)
      successUrl.searchParams.set('client', client.id)
      
      router.push(successUrl.pathname + successUrl.search)
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
