'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams } from 'next/navigation'
import Calendar from '@/components/Calendar'

export default function AppointmentManagementPage() {
  const { bid } = useParams()
  const [appointments, setAppointments] = useState([])
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [selectedAppointmentIds, setSelectedAppointmentIds] = useState([])
  const [staff, setStaff] = useState([])
  const [clients, setClients] = useState([])
  const [services, setServices] = useState([])
  const [chairs, setChairs] = useState([])
  const [filterStaffId, setFilterStaffId] = useState('')
  const [filterChairId, setFilterChairId] = useState('')
  const [viewMode, setViewMode] = useState('list') // 'calendar' or 'list'
  const [editingAppointment, setEditingAppointment] = useState(null)
  const [form, setForm] = useState({
    start_time: '',
    end_time: '',
    staff_id: '',
    client_id: '',
    client_search: '',
    service_ids: [],
    chair_id: ''
  })
  const [showModal, setShowModal] = useState(false)
  const [filteredClients, setFilteredClients] = useState([])
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [showActionsDropdown, setShowActionsDropdown] = useState(false)

  // Print function
  const printAppointments = () => {
    if (!appointments || appointments.length === 0) {
      if (typeof window !== 'undefined' && window.toast) {
        window.toast.error('No appointments to print for selected date')
      }
      return
    }

    const printWindow = window.open('', '_blank')
    const appointmentsByChair = appointments.reduce((groups, appointment) => {
      const chairId = appointment.chair_id || 'unassigned'
      if (!groups[chairId]) groups[chairId] = []
      groups[chairId].push(appointment)
      return groups
    }, {})

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Appointments - ${selectedDate}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .chair-section { margin-bottom: 30px; page-break-inside: avoid; }
          .chair-title { background: #f5f5f5; padding: 10px; border-left: 4px solid #3273dc; margin-bottom: 10px; }
          .appointment { border: 1px solid #ddd; margin: 5px 0; padding: 10px; border-radius: 4px; }
          .time { font-weight: bold; font-size: 1.1em; }
          .client { color: #666; margin: 5px 0; }
          .staff { color: #3273dc; font-weight: 500; }
          .reference { font-size: 0.9em; color: #999; }
          .status { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 0.85em; }
          .status-booked { background: #d4edda; color: #155724; }
          .status-completed { background: #d1ecf1; color: #0c5460; }
          .status-cancelled { background: #f8d7da; color: #721c24; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Salon Appointments</h1>
          <h2>${new Date(selectedDate).toLocaleDateString()}</h2>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
        ${Object.entries(appointmentsByChair).map(([chairId, chairAppointments]) => {
          const chair = chairId !== 'unassigned' ? chairs.find(c => c.id === chairId) : null
          return `
            <div class="chair-section">
              <div class="chair-title">
                <h3>${chair ? chair.name : 'Unassigned'} (${chairAppointments.length} appointments)</h3>
              </div>
              ${chairAppointments.map(apt => {
                const staffMember = staff.find(s => s.id === apt.staff_id)
                return `
                  <div class="appointment">
                    <div class="time">${formatTime(apt.start_time)} – ${formatTime(apt.end_time)}</div>
                    <div class="reference">Reference: #${apt.id.slice(-6).toUpperCase()}</div>
                    ${apt.client ? `<div class="client">Client: ${apt.client.name} (${apt.client.mobile})</div>` : ''}
                    ${staffMember ? `<div class="staff">Staff: ${staffMember.name}</div>` : ''}
                    ${apt.book_status ? `<span class="status status-${apt.book_status}">${apt.book_status.charAt(0).toUpperCase() + apt.book_status.slice(1)}</span>` : ''}
                  </div>
                `
              }).join('')}
            </div>
          `
        }).join('')}
      </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const fetchStaff = useCallback(async () => {
    const { data } = await supabase
      .from('staff')
      .select('id, name')
      .eq('business_id', bid)
      .order('name')
    setStaff(data || [])
  }, [bid])

  const fetchChairs = useCallback(async () => {
    const { data } = await supabase
      .from('chairs')
      .select('id, name, color, is_active')
      .eq('business_id', bid)
      .eq('is_active', true)
      .order('name')
    setChairs(data || [])
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

  const fetchAppointments = useCallback(async () => {
    let query = supabase
      .from('slot')
      .select(
        'id, slotdate, start_time, end_time, duration, staff_id, client_id, chair_id, client(name, mobile), slot_service(service_id), chairs(name, color)'
      )
      .eq('business_id', bid)
      .eq('slotdate', selectedDate)
      .order('start_time')

    if (filterStaffId) {
      query = query.eq('staff_id', filterStaffId)
    }

    if (filterChairId) {
      query = query.eq('chair_id', filterChairId)
    }

    const { data } = await query
    setAppointments(data || [])
    setSelectedAppointmentIds([])
  }, [bid, selectedDate, filterStaffId, filterChairId])

  useEffect(() => {
    if (bid) {
      fetchStaff()
      fetchClients()
      fetchServices()
      fetchChairs()
    }
  }, [bid, fetchStaff, fetchClients, fetchServices, fetchChairs])

  useEffect(() => {
    if (bid && selectedDate) fetchAppointments()
  }, [bid, selectedDate, filterStaffId, filterChairId, fetchAppointments])

  // Auto-fetch appointments when component mounts with today's date
  useEffect(() => {
    if (bid) {
      fetchAppointments()
    }
  }, [bid, fetchAppointments])

  // Filter clients based on search term
  useEffect(() => {
    if (!clients) {
      setFilteredClients([])
      return
    }
    
    if (!form.client_search.trim()) {
      setFilteredClients(clients)
      return
    }
    
    const filtered = clients.filter(client => 
      client.name.toLowerCase().includes(form.client_search.toLowerCase()) ||
      (client.mobile && client.mobile.includes(form.client_search))
    )
    setFilteredClients(filtered)
  }, [clients, form.client_search])

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (showActionsDropdown && !event.target.closest('.dropdown')) {
        setShowActionsDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showActionsDropdown])

  async function saveAppointment() {
    let client_id = form.client_id

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

    await performAppointmentUpdate(client_id)
  }

  async function performAppointmentUpdate(client_id) {
    await supabase
      .from('slot')
      .update({
        start_time: form.start_time,
        end_time: form.end_time,
        staff_id: form.staff_id || null,
        client_id: client_id || null
      })
      .eq('id', editingAppointment.id)

    await supabase.from('slot_service').delete().eq('slot_id', editingAppointment.id)

    const insertData = form.service_ids.map((service_id) => ({
      slot_id: editingAppointment.id,
      service_id
    }))
    if (insertData.length > 0) {
      await supabase.from('slot_service').insert(insertData)
    }

    closeForm(true)
    // Refresh the appointments list
    fetchAppointments()
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
        .eq('id', editingAppointment.id)

      // Reset slot_service links
      await supabase.from('slot_service').delete().eq('slot_id', editingAppointment.id)
      const insertData = form.service_ids.map((service_id) => ({
        slot_id: editingAppointment.id,
        service_id
      }))
      if (insertData.length > 0) {
        await supabase.from('slot_service').insert(insertData)
      }

      setEditingAppointment(null)
      fetchAppointments()
    } else if (choice === 'add') {
      // Fetch available free appointments with same staff, after current end_time
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
        if (typeof window !== 'undefined' && window.toast) {
          window.toast.error('Not enough consecutive free appointments to cover the services. Please select fewer services or choose a different time slot.', { duration: 5000 })
        }
        setShowModal(false)
        return
      }

      // Book those consecutive appointments
      for (let slotId of toUpdateIds) {
        await supabase
          .from('slot')
          .update({
            client_id: form.client_id,
            book_status: 'booked',
            staff_id: form.staff_id || null,
            chair_id: form.chair_id || null
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
            client_id: form.client_id || null,
            chair_id: form.chair_id || null
          })
          .eq('id', editingAppointment.id)
      }

      setEditingAppointment(null)
      fetchAppointments()
    }

    setShowModal(false)
  }

  async function clearClient(id) {
    if (!confirm('Clear client and staff from this slot? This will make the appointment available for booking again.')) return

    // Fetch the slot’s original duration to restore end_time
    const { data: slot } = await supabase
      .from('slot')
      .select('start_time, duration, staff_id')
      .eq('id', id)
      .single()

    // Clear client, staff, chair, and slot_service links
    await supabase
      .from('slot')
      .update({ client_id: null, book_status: null, staff_id: null, chair_id: null })
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

    fetchAppointments()
  }

  async function clearSelectedClients() {
    if (!selectedAppointmentIds.length) return
    if (!confirm(`Clear client and staff from ${selectedAppointmentIds.length} selected appointment(s)? These slots will become available for booking again.`)) return

    const { data: clearedSlots } = await supabase
      .from('slot')
      .update({ client_id: null, book_status: null, staff_id: null, chair_id: null })
      .in('id', selectedAppointmentIds)
      .select('id, start_time, duration')

    await supabase.from('slot_service').delete().in('slot_id', selectedAppointmentIds)

    for (let slot of clearedSlots || []) {
      const startDt = new Date(`2000-01-01T${slot.start_time}`)
      const restoredEnd = new Date(startDt.getTime() + slot.duration * 60000)
      const restoredEndStr = restoredEnd.toTimeString().substring(0, 5)
      await supabase
        .from('slot')
        .update({ end_time: restoredEndStr })
        .eq('id', slot.id)
    }

    setSelectedAppointmentIds([])
    fetchAppointments()
  }

  async function deleteSelectedAppointments() {
    if (!selectedAppointmentIds.length || !confirm(`Permanently delete ${selectedAppointmentIds.length} selected appointment(s)? This action cannot be undone and will remove these time slots completely.`)) return
    await supabase.from('slot').delete().in('id', selectedAppointmentIds)
    await supabase.from('slot_service').delete().in('slot_id', selectedAppointmentIds)
    setSelectedAppointmentIds([])
    fetchAppointments()
  }

  function toggleSelection(id) {
    setSelectedAppointmentIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    )
  }

  function editAppointment(appointment) {
    const service_ids = (appointment.slot_service || []).map((ss) => ss.service_id)
    
    // Find client - first check appointment.client, then clients array
    let client = appointment.client
    if (!client && appointment.client_id) {
      client = clients.find(c => c.id === appointment.client_id)
    }
    
    setForm({
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      staff_id: appointment.staff_id || '',
      client_id: appointment.client_id || '',
      client_search: client ? `${client.name} (${client.mobile || ''})` : '',
      service_ids: service_ids,
      chair_id: appointment.chair_id || ''
    })
    setEditingAppointment(appointment)
    setShowClientDropdown(false)
  }

  function closeForm(force = false) {
    setIsClosing(true)
    setTimeout(() => {
      setForm({
        start_time: '',
        end_time: '',
        staff_id: '',
        client_id: '',
        client_search: '',
        service_ids: [],
        chair_id: ''
      })
      setEditingAppointment(null)
      setShowClientDropdown(false)
      setIsClosing(false)
    }, 300)
  }

  function selectClient(client) {
    setForm({
      ...form,
      client_id: client.id,
      client_search: `${client.name} (${client.mobile})`
    })
    setShowClientDropdown(false)
  }

  async function addNewClient() {
    const input = form.client_search.trim()
    if (!input) {
      console.log('No input provided for new client')
      return
    }
    
    // Simple validation - if it looks like a phone number, put it in mobile field
    const mobileRegex = /^[\d\-\s\+\(\)]+$/
    const isMobile = mobileRegex.test(input)
    
    const newClientData = {
      name: isMobile ? `Customer ${input}` : input, // Always provide a name
      mobile: isMobile ? input : '',
      email: '',
      business_id: bid
    }
    
    console.log('Creating new client with data:', newClientData)
    
    try {
      const { data: newClient, error } = await supabase
        .from('client')
        .insert(newClientData)
        .select()
        .single()
      
      console.log('Supabase response:', { newClient, error })
      
      if (error) {
        console.error('Supabase error:', error)
        // Use console.error instead of alert for debugging
        return
      }
      
      if (newClient) {
        console.log('Client created successfully:', newClient)
        // Update the clients list immediately
        setClients(prev => [...prev, newClient])
        // Select the new client
        selectClient(newClient)
        // Refresh the clients data in background
        await fetchClients()
      }
    } catch (error) {
      console.error('Catch error:', error)
    }
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
    <>
      <style jsx>{`
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOutToRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        .larger-font { font-size: 1.1em; }
        .extended-card { }
        .compact-header { padding: 0.75rem 1.25rem; }
      `}</style>
    <div className="container py-5 px-4 larger-font">

      {/* Date, Staff & Chair Filters */}
      <div className="columns is-multiline mb-4">
        <div className="column is-one-third-tablet is-full-mobile">
          <label className="label">Select Date</label>
          <input
            className="input"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        <div className="column is-one-third-tablet is-full-mobile">
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
        <div className="column is-one-third-tablet is-full-mobile">
          <label className="label">Filter by Chair</label>
          <div className="select is-fullwidth">
            <select
              value={filterChairId}
              onChange={(e) => setFilterChairId(e.target.value)}
            >
              <option value="">All Chairs</option>
              {chairs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="column is-one-third-tablet is-full-mobile">
          <label className="label">View Mode</label>
          <div className="buttons has-addons">
            <button 
              className={`button ${viewMode === 'calendar' ? 'is-primary' : 'is-light'}`}
              onClick={() => setViewMode('calendar')}
            >
              <span className="icon">
                <i className="fas fa-calendar"></i>
              </span>
              <span>Calendar</span>
            </button>
            <button 
              className={`button ${viewMode === 'list' ? 'is-primary' : 'is-light'}`}
              onClick={() => setViewMode('list')}
            >
              <span className="icon">
                <i className="fas fa-list"></i>
              </span>
              <span>List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <Calendar 
          bid={bid}
          appointments={appointments}
          staff={staff}
          chairs={chairs}
          selectedDate={selectedDate}
          onAppointmentClick={(appointment) => editAppointment(appointment)}
          onDateChange={(newDate) => setSelectedDate(newDate)}
        />
      )}

      {/* List View */}
      {viewMode === 'list' && appointments.length > 0 ? (
        <>
          {/* Group appointments by chair for parallel view */}
          {(() => {
            // Group appointments by chair
            const appointmentsByChair = appointments.reduce((groups, appointment) => {
              const chairId = appointment.chair_id || 'unassigned'
              if (!groups[chairId]) {
                groups[chairId] = []
              }
              groups[chairId].push(appointment)
              return groups
            }, {})

            // Sort groups to show assigned chairs first, then unassigned
            const sortedChairIds = Object.keys(appointmentsByChair).sort((a, b) => {
              if (a === 'unassigned') return 1
              if (b === 'unassigned') return -1
              return 0
            })

            return sortedChairIds.map(chairId => {
              const chairAppointments = appointmentsByChair[chairId]
              const chair = chairId !== 'unassigned' ? chairs.find(c => c.id === chairId) : null
              
              return (
                <div key={chairId} className="box extended-card" style={{ marginBottom: '20px' }}>
                  <div className="is-flex is-justify-content-space-between is-align-items-center mb-3">
                    <div className="is-flex is-align-items-center" style={{ gap: '0.5rem' }}>
                      {chair ? (
                        <>
                          <span 
                            className="tag" 
                            style={{ 
                              backgroundColor: chair.color || '#dbdbdb', 
                              color: '#fff', 
                              border: 'none' 
                            }}
                          >
                            {chair.name}
                          </span>
                          <p className="has-text-weight-semibold">
                            {chairAppointments.length} appointment{chairAppointments.length !== 1 ? 's' : ''}
                          </p>
                        </>
                      ) : (
                        <p className="has-text-weight-semibold has-text-grey">
                          Unassigned ({chairAppointments.length} appointment{chairAppointments.length !== 1 ? 's' : ''})
                        </p>
                      )}
                    </div>
                    {selectedAppointmentIds.length > 0 && (
                      <div className="dropdown is-right is-active" style={{ position: 'relative' }}>
                        <div className="dropdown-trigger">
                          <button 
                            className="button is-small" 
                            onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                          >
                            <span className="icon is-small">
                              <i className="fas fa-ellipsis-v"></i>
                            </span>
                          </button>
                        </div>
                        {showActionsDropdown && (
                          <div className="dropdown-menu" style={{ 
                            position: 'absolute', 
                            right: 0, 
                            top: '100%', 
                            zIndex: 1000,
                            background: 'white',
                            border: '1px solid #dbdbdb',
                            borderRadius: '4px',
                            minWidth: '160px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}>
                            <div className="dropdown-content" style={{ padding: 0 }}>
                              <a
                                className="dropdown-item"
                                onClick={() => {
                                  clearSelectedClients()
                                  setShowActionsDropdown(false)
                                }}
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.5rem 1rem' }}
                              >
                                <span className="icon mr-2">
                                  <i className="fas fa-user-times"></i>
                                </span>
                                <span>Clear Clients</span>
                              </a>
                              <a
                                className="dropdown-item has-text-danger"
                                onClick={() => {
                                  deleteSelectedAppointments()
                                  setShowActionsDropdown(false)
                                }}
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.5rem 1rem' }}
                              >
                                <span className="icon mr-2">
                                  <i className="fas fa-trash"></i>
                                </span>
                                <span>Delete Appointments</span>
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {chairAppointments.map((s, index) => (
            <div key={s.id}>
              <div
                className="p-3 mb-1 is-clickable"
                style={{ cursor: 'pointer' }}
                onClick={() => editAppointment(s)}
              >
              <div className="is-flex is-align-items-start is-justify-content-space-between">
                <div 
                  className="mr-3" 
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleSelection(s.id)
                  }}
                  style={{ cursor: 'pointer', paddingTop: '2px' }}
                >
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      border: selectedAppointmentIds.includes(s.id) ? '2px solid #48c774' : '2px solid #dbdbdb',
                      backgroundColor: selectedAppointmentIds.includes(s.id) ? '#48c774' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {selectedAppointmentIds.includes(s.id) && (
                      <i className="fas fa-check" style={{ color: 'white', fontSize: '12px' }}></i>
                    )}
                  </div>
                </div>
                <div className="is-flex-grow-1">
                  <div className="is-flex is-flex-direction-column">
                    <div className="is-flex is-align-items-center mb-1" style={{ gap: '0.5rem' }}>
                      <div className="has-text-weight-semibold" style={{ fontSize: '1.1em' }}>
                        {formatTime(s.start_time)} – {formatTime(s.end_time)}
                      </div>
                      <span className="tag is-small is-light" title="Booking Reference">
                        #{s.id.slice(-6).toUpperCase()}
                      </span>
                      {s.book_status && (
                        <span className={`tag is-small ${
                          s.book_status === 'booked' ? 'is-success is-light' :
                          s.book_status === 'completed' ? 'is-info is-light' :
                          s.book_status === 'cancelled' ? 'is-danger is-light' :
                          'is-warning is-light'
                        }`}>
                          {s.book_status === 'booked' ? 'Booked' :
                           s.book_status === 'completed' ? 'Completed' :
                           s.book_status === 'cancelled' ? 'Cancelled' :
                           s.book_status}
                        </span>
                      )}
                      {s.staff_id && staff.find((st) => st.id === s.staff_id)?.name && (
                        <span className="tag is-small is-info is-light">
                          {staff.find((st) => st.id === s.staff_id).name}
                        </span>
                      )}
                      {s.chair_id && s.chairs && (
                        <span 
                          className="tag is-small" 
                          style={{ 
                            backgroundColor: s.chairs.color || '#dbdbdb', 
                            color: '#fff', 
                            border: 'none' 
                          }}
                        >
                          {s.chairs.name}
                        </span>
                      )}
                    </div>
                    {s.client && (
                      <div className="is-size-6 has-text-grey-dark">
                        {s.client.name} ({s.client.mobile})
                      </div>
                    )}
                  </div>
                </div>
                <div className="is-flex is-flex-direction-column is-align-items-end">
                  {(s.client_id || s.staff_id) && (
                    <button
                      className="button is-small is-ghost mb-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        clearClient(s.id)
                      }}
                      title="Clear client and staff"
                    >
                      <span className="icon is-small">
                        <i className="fas fa-times"></i>
                      </span>
                    </button>
                  )}
                  <span className="icon is-small has-text-grey-light">
                    <i className="fas fa-chevron-right" style={{ fontSize: '0.875rem' }}></i>
                  </span>
                </div>
              </div>
                    </div>
                    {index < chairAppointments.length - 1 && (
                      <hr className="my-2" style={{ margin: '8px 0', borderColor: '#e5e5e5' }} />
                    )}
                  </div>
                ))}
              </div>
            )
          })
        })()}
        </>
      ) : viewMode === 'list' ? (
        <div className="box extended-card" style={{ marginBottom: '20px' }}>
          <div className="has-text-centered py-4">
            <p className="has-text-grey">No appointments for selected date. Select a date with scheduled appointments.</p>
          </div>
        </div>
      ) : null}

      {/* Edit Appointment Form */}
      {editingAppointment && (
        <div className="modal is-active">
          <div className="modal-background" onClick={() => closeForm()}></div>
          <div className="modal-card" style={{ 
            animation: isClosing ? 'slideOutToRight 0.3s ease-in' : 'slideInFromRight 0.3s ease-out', 
            transformOrigin: 'center right' 
          }}>
            <header className="modal-card-head compact-header">
              <p className="modal-card-title">Edit Appointment</p>
              <button className="delete" aria-label="close" onClick={() => closeForm()}></button>
            </header>
            <section className="modal-card-body">
              <form onSubmit={(e) => { e.preventDefault(); saveAppointment(); }}>
                <div className="field">
                  <label className="label">Start Time</label>
                  <div className="control">
                    <input
                      className="input"
                      type="time"
                      value={form.start_time}
                      onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="label">End Time</label>
                  <div className="control">
                    <input
                      className="input"
                      type="time"
                      value={form.end_time}
                      onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="label">Staff</label>
                  <div className="control">
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
                </div>
                <div className="field">
                  <label className="label">Chair/Station</label>
                  <div className="control">
                    <div className="select is-fullwidth">
                      <select
                        value={form.chair_id}
                        onChange={(e) => setForm({ ...form, chair_id: e.target.value })}
                      >
                        <option value="">No specific chair</option>
                        {chairs.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="field">
                  <label className="label">Client</label>
                  <div className="control has-icons-right">
                    <input
                      className="input"
                      type="text"
                      placeholder="Search client by name or phone, or type new client info..."
                      value={form.client_search}
                      onChange={(e) => {
                        const value = e.target.value
                        setForm({ ...form, client_search: value, client_id: value ? '' : form.client_id })
                        setShowClientDropdown(true)
                      }}
                      onFocus={() => setShowClientDropdown(true)}
                      onBlur={(e) => {
                        // Delay hiding to allow click on dropdown items
                        setTimeout(() => setShowClientDropdown(false), 200)
                      }}
                    />
                    {form.client_search && (
                      <span 
                        className="icon is-small is-right is-clickable" 
                        onClick={() => setForm({ ...form, client_search: '', client_id: '' })}
                        style={{ cursor: 'pointer', pointerEvents: 'all' }}
                      >
                        <i className="fas fa-times has-text-grey"></i>
                      </span>
                    )}
                  </div>
                  {showClientDropdown && (
                    <div className="dropdown-content" style={{ 
                      position: 'absolute', 
                      zIndex: 1000, 
                      background: 'white', 
                      border: '1px solid #dbdbdb', 
                      borderRadius: '4px',
                      width: '100%',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      marginTop: '4px'
                    }}>
                      {filteredClients.length > 0 ? (
                        filteredClients.map(client => (
                          <div
                            key={client.id}
                            className="dropdown-item"
                            style={{ padding: '8px 12px', cursor: 'pointer' }}
                            onClick={() => selectClient(client)}
                          >
                            <strong>{client.name}</strong>
                            <br />
                            <small className="has-text-grey">{client.mobile}</small>
                          </div>
                        ))
                      ) : (
                        <div className="dropdown-item" style={{ padding: '8px 12px' }}>
                          No clients found
                        </div>
                      )}
                      {form.client_search.trim() && (
                        <div
                          className="dropdown-item has-text-link"
                          style={{ padding: '8px 12px', cursor: 'pointer', borderTop: '1px solid #dbdbdb' }}
                          onClick={addNewClient}
                        >
                          <i className="fas fa-plus mr-2"></i>
                          Add &quot;{form.client_search}&quot; as new client
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="field">
                  <label className="label">Services</label>
                  <div className="control">
                    {services.map((s) => (
                      <div 
                        key={s.id} 
                        className="is-flex is-align-items-center p-2 is-clickable mb-2"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          const service_ids = form.service_ids.includes(s.id)
                            ? form.service_ids.filter((id) => id !== s.id)
                            : [...form.service_ids, s.id]
                          setForm({ ...form, service_ids })
                        }}
                      >
                        <div
                          className="mr-3"
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            border: form.service_ids.includes(s.id) ? '2px solid #48c774' : '2px solid #dbdbdb',
                            backgroundColor: form.service_ids.includes(s.id) ? '#48c774' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {form.service_ids.includes(s.id) && (
                            <i className="fas fa-check" style={{ color: 'white', fontSize: '12px' }}></i>
                          )}
                        </div>
                        <span>{s.name} ({s.duration}min)</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <div className="control">
                    <button 
                      className="button is-success is-fullwidth" 
                      type="submit"
                    >
                      Update Appointment
                    </button>
                  </div>
                </div>
                <div className="field">
                  <div className="control">
                    <button 
                      className="button is-fullwidth" 
                      type="button" 
                      onClick={() => closeForm()}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </section>
          </div>
        </div>
      )}

      {/* Modal for Duration Mismatch */}
      {showModal && (
        <div className="modal is-active" style={{ zIndex: 1050 }}>
          <div className="modal-background"></div>
          <div className="modal-card">
            <header className="modal-card-head">
              <p className="modal-card-title">Appointment Duration Mismatch</p>
            </header>
            <section className="modal-card-body">
              <p>The selected services require more time than the current appointment duration. Choose how to proceed:</p>
            </section>
            <footer className="modal-card-foot">
              <button className="button is-info" onClick={() => handleExtendChoice('extend')}>
                Extend Appointment
              </button>
              <button className="button is-success" onClick={() => handleExtendChoice('add')}>
                Add Consecutive Appointments
              </button>
              <button className="button" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
    </>
  )
}