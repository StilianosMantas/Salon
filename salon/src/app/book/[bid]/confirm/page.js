'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function ConfirmBookingPage() {
  const { bid } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()

  const slotId = searchParams.get('slot')
  const serviceId = searchParams.get('service')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
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

    try {
      const { data: client, error: clientError } = await supabase
        .from('client')
        .upsert({
          name,
          email,
          mobile: phone,
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

      const { error: serviceLinkError } = await supabase
        .from('slot_service')
        .upsert({ slot_id: slotId, service_id: serviceId })

      if (serviceLinkError) throw serviceLinkError

      router.push(`/book/${bid}/success`)
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
        <div className="field">
          <label className="label">Full Name</label>
          <div className="control">
            <input className="input" required value={name} onChange={e => setName(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label className="label">Email</label>
          <div className="control">
            <input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label className="label">Phone</label>
          <div className="control">
            <input className="input" required value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
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
