'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function PublicBookingEntry() {
  const { bid } = useParams()
  const router = useRouter()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!bid) return

    async function fetchBusiness() {
      try {
        setLoading(true)
        setError(null)
        
        console.log('Fetching business with id:', bid)
        
        const { data, error: fetchError } = await supabase
          .from('business')
          .select('*')
          .eq('id', bid)
          .single()
          
        console.log('Business fetch result:', { data, error: fetchError })
          
        if (fetchError) {
          console.error('Supabase error:', fetchError)
          if (fetchError.code === 'PGRST116') {
            setError('Salon not found. Please check the booking link.')
          } else {
            setError(`Unable to load salon information: ${fetchError.message}`)
          }
          return
        }
        
        setBusiness(data)
      } catch (err) {
        console.error('Error fetching business:', err)
        setError(`Something went wrong: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchBusiness()
  }, [bid])

  function handleStartBooking() {
    router.push(`/book/${bid}/select`)
  }

  if (loading) {
    return (
      <div className="container">
        <div className="has-text-centered py-6">
          <progress className="progress is-primary" max="100">Loading...</progress>
          <p className="mt-3">Loading salon information...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div className="notification is-danger">
          <h2 className="title is-4">Unable to Load Salon</h2>
          <p>{error}</p>
          <button 
            className="button is-light mt-3"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <h1 className="title is-2">{business?.name || 'Salon Booking'}</h1>
      <p className="subtitle is-5">
        Welcome to our online booking system. You can schedule your next appointment in just a few steps.
      </p>


      <button className="button is-primary" onClick={handleStartBooking}>
        Start Booking
      </button>
    </div>
  )
}