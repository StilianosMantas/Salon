'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import dayjs from 'dayjs'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function SelectSlotPage() {
  const { bid } = useParams()
  const router = useRouter()

  const [services, setServices] = useState([])
  const [selectedServices, setSelectedServices] = useState([])
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [availableSlots, setAvailableSlots] = useState([])
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [slotsLoading, setSlotsLoading] = useState(false)

  // 1) Load all services for this salon
  useEffect(() => {
    if (!bid) return

    async function fetchServices() {
      try {
        setLoading(true)
        setError(null)
        
        const { data, error: fetchError } = await supabase
          .from('service')
          .select('*')
          .eq('business_id', bid)

        if (fetchError) {
          console.error("Error fetching services:", fetchError)
          throw new Error("We couldn't load the services for this salon. Please try again later.")
        }
        
        if (!data || data.length === 0) {
          setError('No services available for booking at this time. The salon may not have configured any services yet.')
          return
        }
        
        setServices(data)
      } catch (err) {
        setError(err.message)
        setServices([])
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [bid])

  // 2) Whenever date or selectedServices change, recalc available slots
  useEffect(() => {
    if (!bid || selectedServices.length === 0) {
      setAvailableSlots([])
      return
    }

    // Calculate total duration of selected services
    const totalDuration = services
      .filter((s) => selectedServices.includes(s.id))
      .reduce((sum, s) => sum + s.duration, 0)

    async function fetchSlots() {
      try {
        setSlotsLoading(true)
        
        const { data, error: fetchError } = await supabase
          .from('slot')
          .select('id, start_time, end_time, duration')
          .eq('business_id', bid)
          .eq('slotdate', date)
          .is('client_id', null)
          .order('start_time')

        if (fetchError) {
          throw new Error('Failed to load available slots')
        }

        if (!Array.isArray(data) || data.length === 0) {
          setAvailableSlots([])
          return
        }

        const result = []
        let i = 0

        while (i < data.length) {
          let total = data[i].duration
          let j = i + 1

          while (total < totalDuration && j < data.length) {
            const prev = data[j - 1]
            const next = data[j]
            if (prev.end_time === next.start_time) {
              total += next.duration
              j++
            } else {
              break
            }
          }

          if (total >= totalDuration) {
            result.push({
              id: data[i].id,
              start_time: data[i].start_time,
              end_time: data[j - 1].end_time
            })
          }
          i++
        }

        setAvailableSlots(result)
      } catch (err) {
        // Don't show error for slot fetching, just show no slots available
        setAvailableSlots([])
      } finally {
        setSlotsLoading(false)
      }
    }

    fetchSlots()
  }, [bid, date, selectedServices, services])

  function handleNext() {
    if (selectedSlotId && selectedServices.length > 0) {
      const query = new URLSearchParams()
      query.set('slot', selectedSlotId)
      selectedServices.forEach((id) => query.append('service', id))
      router.push(`/book/${bid}/confirm?${query.toString()}`)
    }
  }

  function handleServiceToggle(id) {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    )
  }

  // Manual refresh button handler
  async function handleRefresh() {
    if (!bid || selectedServices.length === 0) {
      setAvailableSlots([])
      return
    }

    const totalDuration = services
      .filter((s) => selectedServices.includes(s.id))
      .reduce((sum, s) => sum + s.duration, 0)

    const { data, error } = await supabase
      .from('slot')
      .select('id, start_time, end_time, duration')
      .eq('business_id', bid)
      .eq('slotdate', date)
      .is('client_id', null)
      .order('start_time')

    if (error) {
      console.error('Error fetching slots on refresh:', error)
      setAvailableSlots([])
      return
    }

    if (!Array.isArray(data) || data.length === 0) {
      setAvailableSlots([])
      return
    }

    const result = []
    let i = 0

    while (i < data.length) {
      let total = data[i].duration
      let j = i + 1

      while (total < totalDuration && j < data.length) {
        const prev = data[j - 1]
        const next = data[j]
        if (prev.end_time === next.start_time) {
          total += next.duration
          j++
        } else {
          break
        }
      }

      if (total >= totalDuration) {
        result.push({
          id: data[i].id,
          start_time: data[i].start_time,
          end_time: data[j - 1].end_time
        })
      }
      i++
    }

    setAvailableSlots(result)
  }

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading services..." />
  }

  if (error) {
    return (
      <div className="container">
        <div className="notification is-danger">
          <h2 className="title is-4">Unable to Load Services</h2>
          <p className="mb-3">{error}</p>
          <div className="content">
            <p><strong>What you can try:</strong></p>
            <ul>
              <li>Check your internet connection</li>
              <li>Make sure you&apos;re using the correct booking link</li>
              <li>Try refreshing the page using the button below</li>
              <li>Contact the salon directly if the problem persists</li>
            </ul>
          </div>
          <div className="buttons">
            <button 
              className="button is-primary"
              onClick={() => window.location.reload()}
            >
              <span className="icon">
                <i className="fas fa-redo"></i>
              </span>
              <span>Try Again</span>
            </button>
            <button 
              className="button is-light"
              onClick={() => router.push(`/book/${bid}`)}
            >
              <span className="icon">
                <i className="fas fa-arrow-left"></i>
              </span>
              <span>Go Back</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="is-flex is-align-items-center mb-4">
        <button 
          className="button is-ghost mr-3"
          onClick={() => router.push(`/book/${bid}`)}
        >
          <span className="icon">
            <i className="fas fa-arrow-left"></i>
          </span>
          <span>Back</span>
        </button>
        <h1 className="title is-3 mb-0">Choose a Time Slot</h1>
      </div>

      <div className="field">
        <label className="label">Select Services</label>
        <div className="box">
          {services.map((service) => (
            <label key={service.id} className="checkbox is-block">
              <input
                type="checkbox"
                checked={selectedServices.includes(service.id)}
                onChange={() => handleServiceToggle(service.id)}
              />
              <span className="ml-2">
                <strong>{service.name}</strong> ({service.duration} mins)
                {service.cost && <span className="has-text-grey"> - €{service.cost}</span>}
              </span>
              {service.description && (
                <p className="is-size-7 has-text-grey ml-5 mt-1">{service.description}</p>
              )}
            </label>
          ))}
        </div>
        
        {/* Selected Services Summary */}
        {selectedServices.length > 0 && (
          <div className="notification is-info">
            <h4 className="title is-6">Selected Services</h4>
            {services
              .filter(s => selectedServices.includes(s.id))
              .map(service => (
                <div key={service.id} className="is-flex is-justify-content-space-between">
                  <span>{service.name} ({service.duration} mins)</span>
                  {service.cost && <span>€{service.cost}</span>}
                </div>
              ))}
            <hr className="my-2" />
            <div className="is-flex is-justify-content-space-between has-text-weight-bold">
              <span>Total Duration: {services.filter(s => selectedServices.includes(s.id)).reduce((sum, s) => sum + s.duration, 0)} minutes</span>
              <span>
                Total Cost: €{services.filter(s => selectedServices.includes(s.id)).reduce((sum, s) => sum + (parseFloat(s.cost) || 0), 0).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="field is-flex is-justify-content-space-between is-align-items-end">
        <div className="control">
          <label className="label">Date</label>
          <input
            type="date"
            className="input"
            value={date}
            min={dayjs().format('YYYY-MM-DD')}
            max={dayjs().add(3, 'month').format('YYYY-MM-DD')}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="control">
          <button className="button is-link" onClick={handleRefresh}>
            Refresh Slots
          </button>
        </div>
      </div>

      {slotsLoading ? (
        <div className="box has-text-centered">
          <progress className="progress is-small is-primary" max="100">Loading slots...</progress>
          <p className="mt-2">Finding available time slots...</p>
        </div>
      ) : availableSlots.length > 0 ? (
        <div className="box">
          <h4 className="title is-6 mb-3">Available Time Slots</h4>
          {availableSlots.map((slot) => (
            <label key={slot.id} className={`radio is-block p-3 mb-2 ${selectedSlotId === slot.id ? 'has-background-link-light' : 'has-background-light'}`} style={{ borderRadius: '6px', border: selectedSlotId === slot.id ? '2px solid #3273dc' : '1px solid #dbdbdb' }}>
              <input
                type="radio"
                name="slot"
                value={slot.id}
                checked={selectedSlotId === slot.id}
                onChange={() => setSelectedSlotId(slot.id)}
              />
              <span className="ml-2 is-flex is-justify-content-space-between is-align-items-center">
                <span>
                  <strong>{slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}</strong>
                  <br />
                  <small className="has-text-grey">
                    Duration: {services.filter(s => selectedServices.includes(s.id)).reduce((sum, s) => sum + s.duration, 0)} minutes
                  </small>
                </span>
                {selectedServices.length > 0 && (
                  <span className="tag is-primary">
                    €{services.filter(s => selectedServices.includes(s.id)).reduce((sum, s) => sum + (parseFloat(s.cost) || 0), 0).toFixed(2)}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      ) : selectedServices.length > 0 ? (
        <div className="notification is-warning">
          <p>No available time slots for the selected date and services. Please try a different date or select fewer services.</p>
        </div>
      ) : (
        <div className="notification is-info">
          <p>Please select one or more services to see available time slots.</p>
        </div>
      )}

      <div className="field mt-4">
        <div className="control">
          <button
            className={`button is-primary is-fullwidth`}
            onClick={handleNext}
            disabled={!selectedSlotId || selectedServices.length === 0}
            title={!selectedSlotId || selectedServices.length === 0 ? 'Please select a service and a time slot to continue' : 'Continue to booking details'}
          >
            Continue to Booking Details
          </button>
        </div>
      </div>
    </div>
  )
}