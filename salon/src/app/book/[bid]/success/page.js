'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function BookingSuccessPage() {
  const { bid } = useParams()
  const searchParams = useSearchParams()
  const [bookingDetails, setBookingDetails] = useState(null)
  const [loading, setLoading] = useState(true)

  const bookingRef = searchParams.get('ref')
  const slotId = searchParams.get('slot')
  const clientId = searchParams.get('client')

  useEffect(() => {
    async function fetchBookingDetails() {
      if (!slotId || !clientId) {
        setLoading(false)
        return
      }

      try {
        // Fetch slot details with business name
        const { data: slotData, error: slotError } = await supabase
          .from('slot')
          .select(`
            id,
            start_time,
            end_time,
            date,
            business:business_id (
              name,
              address
            )
          `)
          .eq('id', slotId)
          .single()

        if (slotError) throw slotError

        // Fetch client details
        const { data: clientData, error: clientError } = await supabase
          .from('client')
          .select('name, email, mobile')
          .eq('id', clientId)
          .single()

        if (clientError) throw clientError

        // Fetch services for this slot
        const { data: servicesData, error: servicesError } = await supabase
          .from('slot_service')
          .select(`
            service:service_id (
              name,
              duration,
              cost
            )
          `)
          .eq('slot_id', slotId)

        if (servicesError) throw servicesError

        setBookingDetails({
          slot: slotData,
          client: clientData,
          services: servicesData.map(s => s.service)
        })
      } catch (error) {
        console.error('Error fetching booking details:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBookingDetails()
  }, [slotId, clientId])

  if (loading) {
    return <LoadingSpinner message="Loading booking details..." />
  }

  return (
    <div className="container">
      <div className="columns is-centered">
        <div className="column is-two-thirds">
          <div className="has-text-centered mt-6 mb-5">
            <h1 className="title is-3">🎉 Booking Confirmed!</h1>
            <p className="subtitle">Thank you for your reservation. We look forward to seeing you!</p>
          </div>

          <div className="box">
            <h2 className="title is-5 mb-4">Booking Details</h2>
            
            {bookingRef && (
              <div className="field">
                <label className="label">Booking Reference</label>
                <div className="control">
                  <input className="input" value={bookingRef} readOnly />
                </div>
                <p className="help">Please save this reference number for your records</p>
              </div>
            )}

            {bookingDetails && (
              <>
                <div className="field">
                  <label className="label">Business</label>
                  <div className="control">
                    <input className="input" value={bookingDetails.slot.business?.name || `Business ${bid}`} readOnly />
                  </div>
                </div>

                <div className="field">
                  <label className="label">Client Name</label>
                  <div className="control">
                    <input className="input" value={bookingDetails.client.name} readOnly />
                  </div>
                </div>

                <div className="field">
                  <label className="label">Date & Time</label>
                  <div className="control">
                    <input 
                      className="input" 
                      value={`${bookingDetails.slot.date} at ${bookingDetails.slot.start_time} - ${bookingDetails.slot.end_time}`} 
                      readOnly 
                    />
                  </div>
                </div>

                {bookingDetails.services.length > 0 && (
                  <div className="field">
                    <label className="label">Services</label>
                    <div className="control">
                      {bookingDetails.services.map((service, index) => (
                        <div key={index} className="box is-light mb-2">
                          <strong>{service.name}</strong>
                          <div className="is-size-7">
                            Duration: {service.duration} minutes | Cost: €{service.cost}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="field">
                  <label className="label">Contact Information</label>
                  <div className="control">
                    <div className="content">
                      <p><strong>Email:</strong> {bookingDetails.client.email}</p>
                      <p><strong>Phone:</strong> {bookingDetails.client.mobile}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="has-text-centered mt-5">
            <Link href="/" className="button is-link">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

