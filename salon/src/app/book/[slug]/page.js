'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function BookingPage() {
  const { slug } = useParams()
  const [business, setBusiness] = useState(null)
  const [services, setServices] = useState([])
  const [staff, setStaff] = useState([])
  const [selectedService, setSelectedService] = useState('')
  const [selectedStaff, setSelectedStaff] = useState('any')
  const [slots, setSlots] = useState([])
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetchBusiness()
  }, [])

  async function fetchBusiness() {
    const { data: biz } = await supabase.from('business').select('*').eq('name', slug).single()
    if (!biz) return
    setBusiness(biz)
    const [{ data: svc }, { data: stf }] = await Promise.all([
      supabase.from('service').select('*').eq('business_id', biz.id),
      supabase.from('staff').select('*').eq('business_id', biz.id)
    ])
    setServices(svc || [])
    setStaff(stf || [])
  }

  useEffect(() => {
    if (selectedService && date) fetchSlots()
  }, [selectedService, date, selectedStaff])

  async function fetchSlots() {
    const service = services.find(s => s.id == selectedService)
    const { data: rules } = await supabase
      .from('business_rules')
      .select('*')
      .eq('business_id', business.id)
      .eq('weekday', new Date(date).getDay())
    if (!rules) return

    const start = rules.find(r => !r.is_closed)?.start_time
    const end = rules.find(r => !r.is_closed)?.end_time
    const slots = []
    const step = service.duration
    let t = new Date(`${date}T${start}`)
    const limit = new Date(`${date}T${end}`)
    while (t < limit) {
      const next = new Date(t.getTime() + step * 60000)
      slots.push(t.toTimeString().slice(0, 5))
      t = next
    }

    const { data: existing } = await supabase
      .from('slot')
      .select('start_time')
      .eq('slotdate', date)
      .eq('business_id', business.id)

    const used = new Set((existing || []).map(e => e.start_time))
    setSlots(slots.filter(s => !used.has(s)))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedService || !date || !time || !name || !email) return
    const service = services.find(s => s.id == selectedService)
    const [{ data: client }] = await Promise.all([
      supabase.from('client').upsert({ email, name, business_id: business.id }, { onConflict: 'email' }).select().single()
    ])

    const assignedStaff = selectedStaff === 'any' ? staff[0]?.id : selectedStaff
    const start = time
    const end = new Date(new Date(`${date}T${start}`).getTime() + service.duration * 60000).toTimeString().slice(0, 5)

    await supabase.from('slot').insert({
      business_id: business.id,
      client_id: client.id,
      staff_id: assignedStaff,
      duration: service.duration,
      slotdate: date,
      start_time: start,
      end_time: end,
      book_status: 1
    })

    setDone(true)
  }

  if (!business) return <p className="p-6">Loading…</p>
  if (done) return <div className="p-6"><h3 className="title">Thank you!</h3><p>Your booking is confirmed.</p></div>

  return (
    <div className="p-6">
      <h2 className="title is-4">Book at {business.name}</h2>
      <form onSubmit={handleSubmit} className="box">
        <div className="field">
          <label className="label">Service</label>
          <div className="select">
            <select value={selectedService} onChange={e => setSelectedService(e.target.value)} required>
              <option value="">Choose a service</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration} min)</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="label">Staff</label>
          <div className="select">
            <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
              <option value="any">Any available</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="label">Date</label>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
        </div>

        {slots.length > 0 && (
          <div className="field">
            <label className="label">Time</label>
            <div className="select">
              <select value={time} onChange={e => setTime(e.target.value)} required>
                <option value="">Choose time</option>
                {slots.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="field">
          <label className="label">Name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} required />
        </div>

        <div className="field">
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>

        <button className="button is-primary mt-4">Book Now</button>
      </form>
    </div>
  )
}
