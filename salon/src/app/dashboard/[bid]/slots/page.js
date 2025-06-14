'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams } from 'next/navigation'

export default function SlotManagementPage() {
  const { bid } = useParams()
  const [slots, setSlots] = useState([])
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [selectedSlotIds, setSelectedSlotIds] = useState([])
  const [staff, setStaff] = useState([])
  const [clients, setClients] = useState([])
  const [services, setServices] = useState([])
  const [filterStaffId, setFilterStaffId] = useState('')
  const [editingSlot, setEditingSlot] = useState(null)
  const [form, setForm] = useState({
    start_time: '',
    end_time: '',
    staff_id: '',
    client_id: '',
    new_client_name: '',
    new_client_mobile: '',
    service_ids: []
  })
  const [showModal, setShowModal] = useState(false)

  const fetchStaff = useCallback(async () => {
    const { data } = await supabase
      .from('staff')
      .select('id, name')
      .eq('business_id', bid)
      .order('name')
    setStaff(data || [])
  }, [bid])

  const fetchClients = useCallback(async () => {
    const { data } = await supabase
      .from('client')
      .select('id, name, mobile')
      .eq('business_id', bid)
      .order('name')
    setClients(data || [])
  }, [bid])

  const fetchServices = useCallback(async () => {
    const { data } = await supabase
      .from('service')
      .select('id, name, duration')
      .eq('business_id', bid)
      .order('name')
    setServices(data || [])
  }, [bid])

  const fetchSlots = useCallback(async () => {
    let query = supabase
      .from('slot')
      .select(
        'id, slotdate, start_time, end_time, duration, staff_id, client_id, client(name, mobile), slot_service(service_id)'
      )
      .eq('business_id', bid)
      .eq('slotdate', selectedDate)
      .order('start_time')

    if (filterStaffId) {
      query = query.eq('staff_id', filterStaffId)
    }

    const { data } = await query
    setSlots(data || [])
    setSelectedSlotIds([])
  }, [bid, selectedDate, filterStaffId])

  useEffect(() => {
    if (bid) {
      fetchStaff()
      fetchClients()
      fetchServices()
    }
  }, [bid, fetchStaff, fetchClients, fetchServices])

  useEffect(() => {
    if (bid && selectedDate) fetchSlots()
  }, [bid, selectedDate, filterStaffId, fetchSlots])

  // Auto-fetch slots when component mounts with today's date
  useEffect(() => {
    if (bid) {
      fetchSlots()
    }
  }, [bid, fetchSlots])

  async function saveSlot() {
    let client_id = form.client_id

    if (!client_id && form.new_client_name) {
      const { data: newClient } = await supabase
        .from('client')
        .insert({
          name: form.new_client_name,
          mobile: form.new_client_mobile,
          business_id: bid
        })
        .select()
        .single()
      if (newClient) client_id = newClient.id
    }

    const start = new Date(`2000-01-01T${form.start_time}`)
    const end = new Date(`2000-01-01T${form.end_time}`)
    const actualDuration = (end.getTime() - start.getTime()) / (1000 * 60)

    let totalDuration = 0
    for (let id of form.service_ids) {
      const service = services.find((s) => s.id === id)
      if (service) totalDuration += service.duration
    }

    if (totalDuration > actualDuration) {
      setShowModal(true)
      return
    }

    await performSlotUpdate(client_id)
  }

  async function performSlotUpdate(client_id) {
    await supabase
      .from('slot')
      .update({
        start_time: form.start_time,
        end_time: form.end_time,
        staff_id: form.staff_id || null,
        client_id: client_id || null
      })
      .eq('id', editingSlot.id)

    await supabase.from('slot_service').delete().eq('slot_id', editingSlot.id)

    const insertData = form.service_ids.map((service_id) => ({
      slot_id: editingSlot.id,
      service_id
    }))
    if (insertData.length > 0) {
      await supabase.from('slot_service').insert(insertData)
    }

    setEditingSlot(null)
    fetchSlots()
  }

  async function handleExtendChoice(choice) {
    const start = new Date(`2000-01-01T${form.start_time}`)
    let totalDuration = 0
    for (let id of form.service_ids) {
      const service = services.find((s) => s.id === id)
      if (service) totalDuration += service.duration
    }

    if (choice === 'extend') {
      // Calculate new end_time string
      const newEnd = new Date(start.getTime() + totalDuration * 60000)
      const newEndStr = newEnd.toTimeString().substring(0, 5)

      // Update the original slot, preserving client/staff
      await supabase
        .from('slot')
        .update({
          start_time: form.start_time,
          end_time: newEndStr,
          staff_id: form.staff_id || null,
          client_id: form.client_id || null
        })
        .eq('id', editingSlot.id)

      // Reset slot_service links
      await supabase.from('slot_service').delete().eq('slot_id', editingSlot.id)
      const insertData = form.service_ids.map((service_id) => ({
        slot_id: editingSlot.id,
        service_id
      }))
      if (insertData.length > 0) {
        await supabase.from('slot_service').insert(insertData)
      }

      setEditingSlot(null)
      fetchSlots()
    } else if (choice === 'add') {
      // Fetch available free slots with same staff, after current end_time
      const { data: available } = await supabase
        .from('slot')
        .select('id, start_time, end_time, duration')
        .eq('business_id', bid)
        .eq('slotdate', selectedDate)
        .is('client_id', null)
        .eq('staff_id', form.staff_id)
        .order('start_time')

      let accumulated =
        (new Date(`2000-01-01T${form.end_time}`).getTime() - start.getTime()) /
        (1000 * 60)
      if (accumulated < 0) accumulated = 0

      const needed = totalDuration - accumulated
      let sum = 0
      let toUpdateIds = []

      for (let s of available || []) {
        if (s.start_time === form.end_time || toUpdateIds.length > 0) {
          toUpdateIds.push(s.id)
          sum += s.duration
          if (sum >= needed) break
        }
      }

      if (sum < needed) {
        alert('Not enough consecutive free slots to cover the services.')
        setShowModal(false)
        return
      }

      // Book those consecutive slots
      for (let slotId of toUpdateIds) {
        await supabase
          .from('slot')
          .update({
            client_id: form.client_id,
            book_status: 'booked',
            staff_id: form.staff_id || null
          })
          .eq('id', slotId)
      }

      // Insert slot_service links for each new slot
      const insertData = toUpdateIds.flatMap((slot_id) =>
        form.service_ids.map((service_id) => ({ slot_id, service_id }))
      )
      if (insertData.length > 0) {
        await supabase.from('slot_service').insert(insertData)
      }

      // Extend the original slot’s end_time to match last booked slot
      const lastSlot = available.find((s) => toUpdateIds.includes(s.id))
      if (lastSlot) {
        await supabase
          .from('slot')
          .update({
            start_time: form.start_time,
            end_time: lastSlot.end_time,
            staff_id: form.staff_id || null,
            client_id: form.client_id || null
          })
          .eq('id', editingSlot.id)
      }

      setEditingSlot(null)
      fetchSlots()
    }

    setShowModal(false)
  }

  async function clearClient(id) {
    if (!confirm('Clear client and staff from this slot?')) return

    // Fetch the slot’s original duration to restore end_time
    const { data: slot } = await supabase
      .from('slot')
      .select('start_time, duration, staff_id')
      .eq('id', id)
      .single()

    // Clear client, staff, and slot_service links
    await supabase
      .from('slot')
      .update({ client_id: null, book_status: null, staff_id: null })
      .eq('id', id)
    await supabase.from('slot_service').delete().eq('slot_id', id)

    if (slot) {
      const startDt = new Date(`2000-01-01T${slot.start_time}`)
      const restoredEnd = new Date(startDt.getTime() + slot.duration * 60000)
      const restoredEndStr = restoredEnd.toTimeString().substring(0, 5)
      await supabase
        .from('slot')
        .update({ end_time: restoredEndStr })
        .eq('id', id)
    }

    fetchSlots()
  }

  async function clearSelectedClients() {
    if (!selectedSlotIds.length) return
    if (!confirm('Clear client and staff from selected slots?')) return

    const { data: clearedSlots } = await supabase
      .from('slot')
      .update({ client_id: null, book_status: null, staff_id: null })
      .in('id', selectedSlotIds)
      .select('id, start_time, duration')

    await supabase.from('slot_service').delete().in('slot_id', selectedSlotIds)

    for (let slot of clearedSlots || []) {
      const startDt = new Date(`2000-01-01T${slot.start_time}`)
      const restoredEnd = new Date(startDt.getTime() + slot.duration * 60000)
      const restoredEndStr = restoredEnd.toTimeString().substring(0, 5)
      await supabase
        .from('slot')
        .update({ end_time: restoredEndStr })
        .eq('id', slot.id)
    }

    fetchSlots()
  }

  async function deleteSelectedSlots() {
    if (!selectedSlotIds.length || !confirm('Delete selected slots?')) return
    await supabase.from('slot').delete().in('id', selectedSlotIds)
    await supabase.from('slot_service').delete().in('slot_id', selectedSlotIds)
    fetchSlots()
  }

  function toggleSelection(id) {
    setSelectedSlotIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    )
  }

  function editSlot(slot) {
    const service_ids = (slot.slot_service || []).map((ss) => ss.service_id)
    setForm({
      start_time: slot.start_time,
      end_time: slot.end_time,
      staff_id: slot.staff_id || '',
      client_id: slot.client_id || '',
      new_client_name: '',
      new_client_mobile: '',
      service_ids: service_ids
    })
    setEditingSlot(slot)
  }

  function formatTime(t) {
    return t?.slice(0, 5)
  }

  function staffColor(id) {
    const colors = [
      'has-text-primary',
      'has-text-link',
      'has-text-success',
      'has-text-danger',
      'has-text-warning',
      'has-text-info'
    ]
    const index = staff.findIndex((s) => s.id === id)
    return colors[index % colors.length] || ''
  }

  return (
    <div className="container py-5 px-4">
      <h1 className="title is-4 mb-4">Slot Management</h1>

      {/* Date & Staff Filter */}
      <div className="columns is-multiline mb-4">
        <div className="column is-half-tablet is-full-mobile">
          <label className="label">Select Date</label>
          <input
            className="input"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        <div className="column is-half-tablet is-full-mobile">
          <label className="label">Filter by Staff</label>
          <div className="select is-fullwidth">
            <select
              value={filterStaffId}
              onChange={(e) => setFilterStaffId(e.target.value)}
            >
              <option value="">All Staff</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Slot List */}
      {slots.length > 0 ? (
        <div className="box">
          <div className="buttons mb-4 is-flex-wrap-wrap">
            <button
              className="button is-warning is-light is-fullwidth-mobile mb-2"
              onClick={clearSelectedClients}
            >
              Clear Clients
            </button>
            <button
              className="button is-danger is-light is-fullwidth-mobile mb-2"
              onClick={deleteSelectedSlots}
            >
              Delete Slots
            </button>
          </div>
          {slots.map((s, index) => (
            <div key={s.id}>
              <div
                className=" p-2 mb-1 is-clickable"
                style={{ cursor: 'pointer', border: '1px solid #dbdbdb' }}
                onClick={() => editSlot(s)}
              >
              <div className="is-flex is-align-items-start is-justify-content-space-between">
                <label 
                  className="checkbox mr-3" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedSlotIds.includes(s.id)}
                    onChange={() => toggleSelection(s.id)}
                  />
                </label>
                <div className="is-flex-grow-1">
                  <div className="is-flex is-flex-direction-column">
                    <div className="has-text-weight-semibold mb-1">
                      {formatTime(s.start_time)} – {formatTime(s.end_time)}
                    </div>
                    {s.staff_id && staff.find((st) => st.id === s.staff_id)?.name && (
                      <div className={`is-size-7 mb-1 ${staffColor(s.staff_id)}`}>
                        Staff: {staff.find((st) => st.id === s.staff_id).name}
                      </div>
                    )}
                    {s.client && (
                      <div className="is-size-7 has-text-grey-dark">
                        Client: {s.client.name} ({s.client.mobile})
                      </div>
                    )}
                  </div>
                </div>
                <button
                  className="button is-small is-warning is-light"
                  onClick={(e) => {
                    e.stopPropagation()
                    clearClient(s.id)
                  }}
                >
                  Clear
                </button>
              </div>
              </div>
              {index < slots.length - 1 && (
                <hr className="my-2" style={{ margin: '8px 0', borderColor: '#e5e5e5' }} />
              )}
            </div>
          ))}
        </div>
      ) : (
        <p>No slots for selected date</p>
      )}

      {/* Edit Slot Drawer */}
      {editingSlot && (
        <>
          {/* Mobile backdrop */}
          <div 
            className="is-hidden-tablet"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 40
            }}
            onClick={() => setEditingSlot(null)}
          ></div>
          
          <div
            className="box"
            style={{
              width: '100%',
              maxWidth: '360px',
              position: 'fixed',
              top: '0',
              right: '0',
              height: '100vh',
              overflowY: 'auto',
              background: 'white',
              boxShadow: '-4px 0 8px rgba(0,0,0,0.1)',
              zIndex: 50,
              padding: '1.5rem'
            }}
          >
          <div className="is-flex is-justify-content-space-between is-align-items-center mb-4">
            <h2 className="title is-5 mb-0">Edit Slot</h2>
            <button 
              className="delete is-large is-hidden-tablet"
              onClick={() => setEditingSlot(null)}
            ></button>
          </div>
          <div className="field">
            <label className="label">Start Time</label>
            <input
              className="input"
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label">End Time</label>
            <input
              className="input"
              type="time"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label">Staff</label>
            <div className="select is-fullwidth">
              <select
                value={form.staff_id}
                onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
              >
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label className="label">Client</label>
            <div className="select is-fullwidth">
              <select
                value={form.client_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    client_id: e.target.value,
                    new_client_name: '',
                    new_client_mobile: ''
                  })
                }
              >
                <option value="">None</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.mobile})
                  </option>
                ))}
              </select>
            </div>
          </div>
          {!form.client_id && (
            <>
              <div className="field">
                <label className="label">New Client Name</label>
                <input
                  className="input"
                  value={form.new_client_name}
                  onChange={(e) =>
                    setForm({ ...form, new_client_name: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label className="label">New Client Mobile</label>
                <input
                  className="input"
                  value={form.new_client_mobile}
                  onChange={(e) =>
                    setForm({ ...form, new_client_mobile: e.target.value })
                  }
                />
              </div>
            </>
          )}
          <div className="field">
            <label className="label">Services</label>
            <div className="control">
              {services.map((s) => (
                <label className="checkbox" key={s.id}>
                  <input
                    type="checkbox"
                    checked={form.service_ids.includes(s.id)}
                    onChange={() => {
                      const service_ids = form.service_ids.includes(s.id)
                        ? form.service_ids.filter((id) => id !== s.id)
                        : [...form.service_ids, s.id]
                      setForm({ ...form, service_ids })
                    }}
                  />
                  <span className="ml-2">
                    {s.name} ({s.duration}min)
                  </span>
                  <br />
                </label>
              ))}
            </div>
          </div>
          <div className="buttons mt-4">
            <button className="button is-primary" onClick={saveSlot}>
              Save
            </button>
            <button className="button" onClick={() => setEditingSlot(null)}>
              Cancel
            </button>
          </div>
        </div>
        </>
      )}

      {/* Modal for Duration Mismatch */}
      {showModal && (
        <div className="modal is-active">
          <div className="modal-background"></div>
          <div className="modal-card">
            <header className="modal-card-head">
              <p className="modal-card-title">Slot Duration Mismatch</p>
            </header>
            <section className="modal-card-body">
              <p>The selected services require more time than the current slot duration. Choose how to proceed:</p>
            </section>
            <footer className="modal-card-foot">
              <button className="button is-info" onClick={() => handleExtendChoice('extend')}>
                Extend Slot
              </button>
              <button className="button is-success" onClick={() => handleExtendChoice('add')}>
                Add Consecutive Slots
              </button>
              <button className="button" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}