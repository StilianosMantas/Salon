'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import dayjs from 'dayjs'

export default function SelectSlotPage() {
  const { bid } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()

  const serviceId = searchParams.get('service')
  const [service, setService] = useState(null)
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [availableSlots, setAvailableSlots] = useState([])
  const [selectedSlotId, setSelectedSlotId] = useState('')

  useEffect(() => {
    if (bid && serviceId) {
      loadService()
    }
  }, [bid, serviceId])

  useEffect(() => {
    if (service) {
      loadAvailableSlots(service.duration)
    }
  }, [date, service])

  async function loadService() {
    const { data } = await supabase.from('service').select('*').eq('id', serviceId).single()
    setService(data)
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
    if (selectedSlotId) {
      router.push(`/book/${bid}/confirm?slot=${selectedSlotId}&service=${serviceId}`)
    }
  }

  return (
    <div className="container">
      <h1 className="title is-3">Choose a Time Slot</h1>
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
          <button className="button is-link" onClick={() => loadAvailableSlots(service?.duration)}>
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
        disabled={!selectedSlotId}>
        Continue
      </button>
    </div>
  )
}
