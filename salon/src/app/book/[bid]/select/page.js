'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import dayjs from 'dayjs'

export default function SelectSlotPage() {
  const { bid } = useParams()
  const router = useRouter()

  const [services, setServices] = useState([])
  const [selectedServices, setSelectedServices] = useState([])
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [availableSlots, setAvailableSlots] = useState([])
  const [selectedSlotId, setSelectedSlotId] = useState('')

  useEffect(() => {
    if (bid) {
      loadServices()
    }
  }, [bid])

  useEffect(() => {
    if (selectedServices.length > 0) {
      const totalDuration = services
        .filter(s => selectedServices.includes(s.id))
        .reduce((sum, s) => sum + s.duration, 0)
      loadAvailableSlots(totalDuration)
    } else {
      setAvailableSlots([])
    }
  }, [date, selectedServices])

  async function loadServices() {
    const { data } = await supabase.from('service').select('*').eq('business_id', bid)
    setServices(data)
  }

  async function loadAvailableSlots(duration) {
    const { data } = await supabase
      .from('slot')
      .select('id, start_time, end_time, duration')
      .eq('business_id', bid)
      .eq('slotdate', date)
      .is('client_id', null)
      .order('start_time')

    const result = []
    let i = 0
    while (i < data.length) {
      let total = data[i].duration
      let j = i + 1
      while (total < duration && j < data.length) {
        const prev = data[j - 1]
        const next = data[j]
        if (prev.end_time === next.start_time) {
          total += next.duration
          j++
        } else {
          break
        }
      }
      if (total >= duration) {
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

  function handleNext() {
    if (selectedSlotId && selectedServices.length > 0) {
      const query = new URLSearchParams()
      query.set('slot', selectedSlotId)
      selectedServices.forEach(id => query.append('service', id))
      router.push(`/book/${bid}/confirm?${query.toString()}`)
    }
  }

  function handleServiceToggle(id) {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    )
  }

  return (
    <div className="container">
      <h1 className="title is-3">Choose a Time Slot-</h1>

      <div className="field">
        <label className="label">Select Services</label>
        <div className="box">
          {services.map(service => (
            <label key={service.id} className="checkbox is-block">
              <input
                type="checkbox"
                checked={selectedServices.includes(service.id)}
                onChange={() => handleServiceToggle(service.id)}
              />
              <span className="ml-2">{service.name} ({service.duration} mins)</span>
            </label>
          ))}
        </div>
      </div>

      <div className="field is-flex is-justify-content-space-between is-align-items-end">
        <div className="control">
          <label className="label">Date</label>
          <input
            type="date"
            className="input"
            value={date}
            onChange={e => setDate(e.target.value)} />
        </div>
        <div className="control">
          <button className="button is-link" onClick={() => {
            const totalDuration = services
              .filter(s => selectedServices.includes(s.id))
              .reduce((sum, s) => sum + s.duration, 0)
            loadAvailableSlots(totalDuration)
          }}>
            Refresh Slots
          </button>
        </div>
      </div>

      {availableSlots.length > 0 ? (
        <div className="box">
          {availableSlots.map(slot => (
            <label key={slot.id} className="radio is-block">
              <input
                type="radio"
                name="slot"
                value={slot.id}
                checked={selectedSlotId === slot.id}
                onChange={() => setSelectedSlotId(slot.id)}
              />
              <span className="ml-2">{slot.start_time.substring(0,5)} - {slot.end_time.substring(0,5)}</span>
            </label>
          ))}
        </div>
      ) : <p>No available slots on this day.</p>}

      <button
        className="button is-primary mt-4"
        onClick={handleNext}
        disabled={!selectedSlotId || selectedServices.length === 0}>
        Continue
      </button>
    </div>
  )
}
