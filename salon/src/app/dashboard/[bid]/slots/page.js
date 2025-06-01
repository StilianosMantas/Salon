'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams } from 'next/navigation'

export default function SlotManagementPage() {
  const { bid } = useParams()
  const [slots, setSlots] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlotIds, setSelectedSlotIds] = useState([])
  const [staff, setStaff] = useState([])
  const [clients, setClients] = useState([])
  const [services, setServices] = useState([])
  const [filterStaffId, setFilterStaffId] = useState('')
  const [editingSlot, setEditingSlot] = useState(null)
  const [form, setForm] = useState({ start_time: '', end_time: '', staff_id: '', client_id: '', new_client_name: '', new_client_mobile: '', service_id: '' })

  useEffect(() => {
    if (bid) {
      fetchStaff()
      fetchClients()
      fetchServices()
    }
  }, [bid])

  useEffect(() => {
    if (bid && selectedDate) fetchSlots()
  }, [bid, selectedDate, filterStaffId])

  async function fetchStaff() {
    const { data } = await supabase.from('staff').select('id, name').eq('business_id', bid).order('name')
    setStaff(data || [])
  }

  async function fetchClients() {
    const { data } = await supabase.from('client').select('id, name, mobile').eq('business_id', bid).order('name')
    setClients(data || [])
  }

  async function fetchServices() {
    const { data } = await supabase.from('service').select('id, name, duration').eq('business_id', bid).order('name')
    setServices(data || [])
  }

  async function fetchSlots() {
    let query = supabase
      .from('slot')
      .select('*, client(name, mobile)')
      .eq('business_id', bid)
      .eq('slotdate', selectedDate)
      .order('start_time')

    if (filterStaffId) query = query.eq('staff_id', filterStaffId)

    const { data } = await query
    setSlots(data || [])
    setSelectedSlotIds([])
  }

  async function saveSlot() {
    let client_id = form.client_id

    if (!client_id && form.new_client_name) {
      const { data: newClient, error } = await supabase.from('client').insert({
        name: form.new_client_name,
        mobile: form.new_client_mobile,
        business_id: bid
      }).select().single()
      if (newClient) client_id = newClient.id
    }

    const selectedService = services.find(s => s.id === form.service_id)
    const start = new Date(`2000-01-01T${form.start_time}`)
    const end = new Date(`2000-01-01T${form.end_time}`)
    const actualDuration = (end - start) / (1000 * 60)

    if (selectedService && selectedService.duration > actualDuration) {
      const extend = confirm(`Selected service requires ${selectedService.duration} minutes but the slot is only ${actualDuration} minutes. Do you want to extend the slot?`)
      if (!extend) return
    }

    await supabase.from('slot').update({
      start_time: form.start_time,
      end_time: form.end_time,
      staff_id: form.staff_id || null,
      client_id: client_id || null,
      service_id: form.service_id || null,
    }).eq('id', editingSlot.id)

    setEditingSlot(null)
    fetchSlots()
  }

  async function clearClient(id) {
    if (!confirm('Clear client and staff from this slot?')) return
    await supabase.from('slot').update({ client_id: null, book_status: null, staff_id: null }).eq('id', id)
    fetchSlots()
  }

  async function clearSelectedClients() {
    if (!selectedSlotIds.length || !confirm('Clear client and staff from selected slots?')) return
    await supabase.from('slot').update({ client_id: null, book_status: null, staff_id: null }).in('id', selectedSlotIds)
    fetchSlots()
  }

  async function deleteSelectedSlots() {
    if (!selectedSlotIds.length || !confirm('Delete selected slots?')) return
    await supabase.from('slot').delete().in('id', selectedSlotIds)
    fetchSlots()
  }

  function toggleSelection(id) {
    setSelectedSlotIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id])
  }

  function editSlot(slot) {
    setForm({
      start_time: slot.start_time,
      end_time: slot.end_time,
      staff_id: slot.staff_id || '',
      client_id: slot.client_id || '',
      new_client_name: '',
      new_client_mobile: '',
      service_id: slot.service_id || ''
    })
    setEditingSlot(slot)
  }

  function formatTime(t) {
    return t?.slice(0, 5)
  }

  function staffColor(id) {
    const colors = ['has-text-primary', 'has-text-link', 'has-text-success', 'has-text-danger', 'has-text-warning', 'has-text-info']
    const index = staff.findIndex(s => s.id === id)
    return colors[index % colors.length] || ''
  }

  return (
    <div className="container py-5 px-4">
      <h1 className="title is-4 mb-4">Slot Management</h1>

      <div className="columns is-multiline mb-4">
        <div className="column is-one-quarter">
          <label className="label">Select Date</label>
          <input className="input" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        </div>
        <div className="column is-one-quarter">
          <label className="label">Filter by Staff</label>
          <div className="select is-fullwidth">
            <select value={filterStaffId} onChange={e => setFilterStaffId(e.target.value)}>
              <option value="">All Staff</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {slots.length > 0 ? (
        <div className="box">
          <div className="buttons mb-4">
            <button className="button is-warning is-light" onClick={clearSelectedClients}>Clear Clients</button>
            <button className="button is-danger is-light" onClick={deleteSelectedSlots}>Delete Slots</button>
          </div>
          {slots.map(s => (
            <div
              key={s.id}
              className="is-flex is-align-items-center is-justify-content-space-between mb-2"
            >
              <label className="checkbox mr-3">
                <input
                  type="checkbox"
                  checked={selectedSlotIds.includes(s.id)}
                  onChange={() => toggleSelection(s.id)}
                />
              </label>
              <div className="is-flex-grow-1" onClick={() => editSlot(s)}>
                <span>
                  {formatTime(s.start_time)} – {formatTime(s.end_time)}
                  {s.staff_id && staff.find(st => st.id === s.staff_id)?.name && (
                    <span className={`ml-2 ${staffColor(s.staff_id)}`}>{staff.find(st => st.id === s.staff_id).name}</span>
                  )}
                  {s.client && <span className="ml-2"> · {s.client.name} ({s.client.mobile})</span>}
                </span>
              </div>
              <button className="button is-small is-warning is-light" onClick={() => clearClient(s.id)}>Clear</button>
            </div>
          ))}
        </div>
      ) : <p>No slots for selected date</p>}

      {editingSlot && (
        <div className="box is-pulled-right" style={{ width: '360px', position: 'fixed', top: '80px', right: '0', height: 'calc(100% - 80px)', overflowY: 'auto', background: 'white', boxShadow: '-4px 0 8px rgba(0,0,0,0.1)' }}>
          <h2 className="title is-5">Edit Slot</h2>
          <div className="field">
            <label className="label">Start Time</label>
            <input className="input" type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">End Time</label>
            <input className="input" type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">Staff</label>
            <div className="select is-fullwidth">
              <select value={form.staff_id} onChange={e => setForm({ ...form, staff_id: e.target.value })}>
                <option value="">Unassigned</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label className="label">Client</label>
            <div className="select is-fullwidth">
              <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value, new_client_name: '', new_client_mobile: '' })}>
                <option value="">None</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.mobile})</option>)}
              </select>
            </div>
          </div>
          {!form.client_id && (
            <>
              <div className="field">
                <label className="label">New Client Name</label>
                <input className="input" value={form.new_client_name} onChange={e => setForm({ ...form, new_client_name: e.target.value })} />
              </div>
              <div className="field">
                <label className="label">New Client Mobile</label>
                <input className="input" value={form.new_client_mobile} onChange={e => setForm({ ...form, new_client_mobile: e.target.value })} />
              </div>
            </>
          )}
          <div className="field">
            <label className="label">Service</label>
            <div className="select is-fullwidth">
              <select value={form.service_id} onChange={e => setForm({ ...form, service_id: e.target.value })}>
                <option value="">Select Service</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration}min)</option>)}
              </select>
            </div>
          </div>
          <div className="buttons mt-4">
            <button className="button is-primary" onClick={saveSlot}>Save</button>
            <button className="button" onClick={() => setEditingSlot(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
