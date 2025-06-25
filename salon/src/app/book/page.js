'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function BookingDiscoveryPage() {
  const [salons, setSalons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchSalons()
  }, [])

  async function fetchSalons() {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('business')
        .select('id, name')
        .not('id', 'is', null)
        .limit(20)

      if (error) {
        console.error("Error fetching salons:", error)
        throw new Error("We couldn't retrieve the list of available salons at the moment. Please try again later.")
      }

      setSalons(data || [])

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading available salons..." />
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="notification is-danger">
          <h2 className="title is-4">Unable to Load Salons</h2>
          <p className="mb-3">{error}</p>
          <div className="content">
            <p><strong>What you can try:</strong></p>
            <ul>
              <li>Check your internet connection</li>
              <li>Refresh the page using the button below</li>
              <li>Contact support if the problem persists</li>
            </ul>
          </div>
          <div className="buttons">
            <button 
              className="button is-primary"
              onClick={fetchSalons}
            >
              <span className="icon">
                <i className="fas fa-redo"></i>
              </span>
              <span>Try Again</span>
            </button>
            <button 
              className="button is-info"
              onClick={() => window.location.reload()}
            >
              <span className="icon">
                <i className="fas fa-refresh"></i>
              </span>
              <span>Reload Page</span>
            </button>
            <Link href="/" className="button is-light">
              <span className="icon">
                <i className="fas fa-home"></i>
              </span>
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (salons.length === 0) {
    return (
      <div className="container py-5">
        <div className="has-text-centered">
          <div className="notification is-info">
            <h2 className="title is-4">No Salons Available</h2>
            <p className="mb-4">There are currently no salons available for booking.</p>
            <Link href="/" className="button is-primary">
              <span className="icon">
                <i className="fas fa-home"></i>
              </span>
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-5">
      <div className="has-text-centered mb-6">
        <h1 className="title is-2">Choose Your Salon</h1>
        <p className="subtitle is-4">Select a salon to book your appointment</p>
      </div>

      <div className="columns is-multiline">
        {salons.map((salon) => (
          <div key={salon.id} className="column is-one-third">
            <div className="card">
              <div className="card-content">
                <div className="media">
                  <div className="media-left">
                    <figure className="image is-48x48">
                      <div className="has-background-primary has-text-white is-flex is-align-items-center is-justify-content-center" style={{ width: '48px', height: '48px', borderRadius: '6px' }}>
                        <i className="fas fa-cut fa-lg"></i>
                      </div>
                    </figure>
                  </div>
                  <div className="media-content">
                    <p className="title is-5">{salon.name}</p>
                  </div>
                </div>


                <div className="has-text-centered">
                  <Link 
                    href={`/book/${salon.id}`} 
                    className="button is-primary is-medium is-fullwidth"
                  >
                    <span className="icon">
                      <i className="fas fa-calendar-plus"></i>
                    </span>
                    <span>Book Appointment</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="has-text-centered mt-6">
        <Link href="/" className="button is-light">
          <span className="icon">
            <i className="fas fa-arrow-left"></i>
          </span>
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  )
}