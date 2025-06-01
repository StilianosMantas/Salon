'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function PublicBookingEntry() {
  const { bid } = useParams()
  const router = useRouter()
  const [business, setBusiness] = useState(null)

  useEffect(() => {
    if (!bid) return

    async function fetchBusiness() {
      const { data } = await supabase
        .from('business')
        .select('*')
        .eq('id', bid)
        .single()
      setBusiness(data)
    }

    fetchBusiness()
  }, [bid])

  function handleStartBooking() {
    router.push(`/book/${bid}/select`)
  }

  return (
    <div className="container">
      <h1 className="title is-2">{business?.name || 'Salon Booking'}</h1>
      <p className="subtitle is-5">
        Welcome to our online booking system. You can schedule your next appointment in just a few steps.
      </p>

      {business?.description && (
        <div className="content mb-4">
          <p>{business.description}</p>
        </div>
      )}

      <button className="button is-primary" onClick={handleStartBooking}>
        Start Booking
      </button>
    </div>
  )
}