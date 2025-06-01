'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function PublicBookingEntry() {
  const { bid } = useParams()
  const router = useRouter()

  const [business, setBusiness] = useState(null)
  const [services, setServices] = useState([])
  const [selectedServiceId, setSelectedServiceId] = useState('')

  useEffect(() => {
    if (bid) {
      loadBusiness()
      loadServices()
    }
  }, [bid])

  async function loadBusiness() {
    const { data } = await supabase.from('business').select('*').eq('id', bid).single()
    setBusiness(data)
  }

  async function loadServices() {
    const { data } = await supabase.from('service').select('*').eq('business_id', bid)
    setServices(data || [])
  }

  function handleNext() {
    if (selectedServiceId) {
      router.push(`/book/${bid}/select?service=${selectedServiceId}`)
    }
  }

  return (
    <div className="container">
      <h1 className="title is-3">Book an Appointment</h1>
      {business && <p className="subtitle is-5">{business.name}</p>}

      <div className="field">
        <label className="label">Select a Service</label>
        <div className="control">
          <div className="select is-fullwidth">
            <select
              value={selectedServiceId}
              onChange={e => setSelectedServiceId(e.target.value)}>
              <option value="">-- Choose --</option>
              {services.map(service => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.duration} min)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <button
        className="button is-primary"
        onClick={handleNext}
        disabled={!selectedServiceId}>
        Next
      </button>
    </div>
  )
}
