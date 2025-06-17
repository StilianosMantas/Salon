'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useStaff } from '@/hooks/useSupabaseData'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function ShiftsPage() {
  const { bid } = useParams()
  const { data: staff, error: staffError, isLoading: staffLoading } = useStaff(bid)
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState('')
  const [selectedWeek, setSelectedWeek] = useState('')
  const [formVisible, setFormVisible] = useState(false)
  const [editingShift, setEditingShift] = useState(null)
  const [shiftForm, setShiftForm] = useState({
    staff_id: '',
    date: '',
    start_time: '',
    end_time: '',
    break_start: '',
    break_end: '',
    notes: ''
  })
  const [isClosing, setIsClosing] = useState(false)

  // Add mobile header button
  useEffect(() => {
    const placeholder = document.getElementById('mobile-add-button-placeholder')
    if (placeholder) {
      placeholder.innerHTML = `
        <button class="button is-rounded is-ghost" onclick="document.querySelector('[data-add-shift]').click()" style="width: 40px; height: 40px; padding: 0;">
          <span class="icon">
            <i class="fas fa-plus"></i>
          </span>
        </button>
      `
    }
    return () => {
      if (placeholder) {
        placeholder.innerHTML = ''
      }
    }
  }, [])

  // Handle ESC key to close form
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && formVisible) {
        closeForm()
      }
    }

    if (formVisible) {
      document.addEventListener('keydown', handleEscKey)
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [formVisible])

  const fetchShifts = useCallback(async () => {
    if (!bid) return
    
    try {
      setLoading(true)
      let query = supabase
        .from('staff_shifts')
        .select(`
          *,
          staff:staff_id (
            id,
            name
          )
        `)
        .eq('business_id', bid)
        .order('date')
        .order('start_time')

      // Filter by staff if selected
      if (selectedStaff) {
        query = query.eq('staff_id', selectedStaff)
      }

      // Filter by week if selected
      if (selectedWeek) {
        const weekStart = new Date(selectedWeek)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        
        query = query
          .gte('date', weekStart.toISOString().split('T')[0])
          .lte('date', weekEnd.toISOString().split('T')[0])
      }

      const { data, error } = await query

      if (error) throw error
      setShifts(data || [])
    } catch (error) {
      console.error('Error fetching shifts:', error)
      toast.error('Failed to load shifts')
    } finally {
      setLoading(false)
    }
  }, [bid, selectedStaff, selectedWeek])

  useEffect(() => {
    fetchShifts()
  }, [fetchShifts])

  // Set default week to current week
  useEffect(() => {
    if (!selectedWeek) {
      const today = new Date()
      const monday = new Date(today)
      monday.setDate(today.getDate() - today.getDay() + 1)
      setSelectedWeek(monday.toISOString().split('T')[0])
    }
  }, [selectedWeek])

  async function saveShift() {
    setSaving(true)
    try {
      const shiftData = {
        business_id: bid,
        staff_id: shiftForm.staff_id,
        date: shiftForm.date,
        start_time: shiftForm.start_time,
        end_time: shiftForm.end_time,
        break_start: shiftForm.break_start || null,
        break_end: shiftForm.break_end || null,
        notes: shiftForm.notes || null
      }

      if (editingShift) {
        const { error } = await supabase
          .from('staff_shifts')
          .update(shiftData)
          .eq('id', editingShift.id)
        
        if (error) throw error
        toast.success('Shift updated successfully')
      } else {
        const { error } = await supabase
          .from('staff_shifts')
          .insert(shiftData)
        
        if (error) throw error
        toast.success('Shift created successfully')
      }

      closeForm()
      fetchShifts()
    } catch (error) {
      console.error('Error saving shift:', error)
      toast.error(`Failed to ${editingShift ? 'update' : 'create'} shift: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function deleteShift(id) {
    if (!window.confirm('Are you sure you want to delete this shift?')) return

    try {
      const { error } = await supabase
        .from('staff_shifts')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast.success('Shift deleted successfully')
      closeForm() // Auto-close form after successful deletion
      fetchShifts()
    } catch (error) {
      console.error('Error deleting shift:', error)
      toast.error('Failed to delete shift')
    }
  }

  function openAddForm(prefillStaffId = '', prefillDate = '') {
    setEditingShift(null)
    setShiftForm({
      staff_id: prefillStaffId || selectedStaff || '',
      date: prefillDate || selectedWeek || new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '17:00',
      break_start: '12:00',
      break_end: '13:00',
      notes: ''
    })
    setFormVisible(true)
  }

  function openEditForm(shift) {
    setEditingShift(shift)
    setShiftForm({
      staff_id: shift.staff_id,
      date: shift.date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      break_start: shift.break_start || '',
      break_end: shift.break_end || '',
      notes: shift.notes || ''
    })
    setFormVisible(true)
  }

  function closeForm() {
    setIsClosing(true)
    setTimeout(() => {
      setFormVisible(false)
      setEditingShift(null)
      setIsClosing(false)
    }, 300)
  }

  function getWeekDates(weekStart) {
    const dates = []
    const start = new Date(weekStart)
    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      dates.push(date.toISOString().split('T')[0])
    }
    return dates
  }

  function formatTime(time) {
    return time ? time.slice(0, 5) : ''
  }

  function calculateHours(startTime, endTime, breakStart, breakEnd) {
    if (!startTime || !endTime) return 0
    
    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(`2000-01-01T${endTime}`)
    let totalHours = (end - start) / (1000 * 60 * 60)
    
    if (breakStart && breakEnd) {
      const breakStartTime = new Date(`2000-01-01T${breakStart}`)
      const breakEndTime = new Date(`2000-01-01T${breakEnd}`)
      const breakHours = (breakEndTime - breakStartTime) / (1000 * 60 * 60)
      totalHours -= breakHours
    }
    
    return Math.max(0, totalHours)
  }

  if (staffLoading || loading) {
    return <LoadingSpinner message="Loading shifts..." />
  }

  if (staffError) {
    return (
      <div className="container py-5 px-4">
        <div className="notification is-danger">
          <h2 className="title is-4">Unable to Load Staff</h2>
          <p>Please ensure staff members are available before managing shifts.</p>
        </div>
      </div>
    )
  }

  const weekDates = selectedWeek ? getWeekDates(selectedWeek) : []

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
      `}</style>
      
      <div className="container py-2 px-2" style={{ fontSize: '1.1em', paddingTop: '0.5rem' }}>
        {/* Filters */}
        <div className="columns is-multiline mb-4 is-hidden-mobile">
          <div className="column is-half">
            <label className="label">Filter by Staff</label>
            <div className="select is-fullwidth">
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
              >
                <option value="">All Staff</option>
                {staff?.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="column is-half">
            <label className="label">Week Starting</label>
            <input
              className="input"
              type="date"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
            />
          </div>
        </div>

        <div className="is-flex is-justify-content-space-between is-align-items-center mb-4 is-hidden-mobile" style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
          <h1 className="title is-5">Staff Shifts</h1>
          <button
            className="button is-link"
            data-add-shift
            onClick={openAddForm}
          >
            + Add Shift
          </button>
        </div>

        {/* Week View */}
        <div className="box" style={{ margin: '0 -0.75rem', fontSize: '1.1em', marginTop: '0.75rem' }}>
          {weekDates.length > 0 ? (
            <div className="table-container">
              <table className="table is-fullwidth is-hoverable">
                <thead>
                  <tr>
                    <th>Staff</th>
                    {weekDates.map((date, index) => (
                      <th key={date} className="has-text-centered">
                        <div>{weekdays[index]}</div>
                        <div className="is-size-7 has-text-grey">
                          {new Date(date).toLocaleDateString()}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staff?.map(staffMember => (
                    <tr key={staffMember.id}>
                      <td className="has-text-weight-semibold">{staffMember.name}</td>
                      {weekDates.map(date => {
                        const dayShifts = shifts.filter(s => 
                          s.staff_id === staffMember.id && s.date === date
                        )
                        
                        return (
                          <td key={date} className="has-text-centered" style={{ minWidth: '120px' }}>
                            {dayShifts.map(shift => (
                              <div 
                                key={shift.id}
                                className="box p-2 mb-1 is-clickable"
                                onClick={() => openEditForm(shift)}
                                style={{ 
                                  backgroundColor: '#f0f8ff', 
                                  border: '1px solid #dbdbdb',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem'
                                }}
                              >
                                <div className="has-text-weight-semibold">
                                  {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                </div>
                                <div className="is-size-7 has-text-grey">
                                  {calculateHours(shift.start_time, shift.end_time, shift.break_start, shift.break_end).toFixed(1)}h
                                </div>
                              </div>
                            ))}
                            {dayShifts.length === 0 && (
                              <button 
                                className="button is-small is-ghost"
                                onClick={() => openAddForm(staffMember.id, date)}
                              >
                                <span className="icon is-small">
                                  <i className="fas fa-plus"></i>
                                </span>
                              </button>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="has-text-centered py-4">
              <p className="has-text-grey">Select a week to view shifts</p>
            </div>
          )}
        </div>

        {/* Shift Form Modal */}
        {formVisible && (
          <div className="modal is-active">
            <div className="modal-background" onClick={closeForm}></div>
            <div className="modal-card" style={{ 
              animation: isClosing ? 'slideOutToRight 0.3s ease-in' : 'slideInFromRight 0.3s ease-out', 
              transformOrigin: 'center right' 
            }}>
              <header className="modal-card-head">
                <p className="modal-card-title">
                  {editingShift ? 'Edit Shift' : 'Add Shift'}
                </p>
                <button className="delete" aria-label="close" onClick={closeForm}></button>
              </header>
              <section className="modal-card-body">
                <div className="field">
                  <label className="label">Staff Member</label>
                  <div className="select is-fullwidth">
                    <select
                      value={shiftForm.staff_id}
                      onChange={(e) => setShiftForm({ ...shiftForm, staff_id: e.target.value })}
                      required
                    >
                      <option value="">Select Staff</option>
                      {staff?.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label className="label">Date</label>
                  <input
                    className="input"
                    type="date"
                    value={shiftForm.date}
                    onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })}
                    required
                  />
                </div>

                <div className="columns">
                  <div className="column">
                    <label className="label">Start Time</label>
                    <input
                      className="input"
                      type="time"
                      value={shiftForm.start_time}
                      onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="column">
                    <label className="label">End Time</label>
                    <input
                      className="input"
                      type="time"
                      value={shiftForm.end_time}
                      onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label">Quick Templates</label>
                  <div className="buttons are-small">
                    <button
                      type="button"
                      className="button is-light"
                      onClick={() => setShiftForm({ ...shiftForm, start_time: '09:00', end_time: '17:00', break_start: '12:00', break_end: '13:00' })}
                    >
                      Full Day (9-5)
                    </button>
                    <button
                      type="button"
                      className="button is-light"
                      onClick={() => setShiftForm({ ...shiftForm, start_time: '09:00', end_time: '13:00', break_start: '', break_end: '' })}
                    >
                      Morning (9-1)
                    </button>
                    <button
                      type="button"
                      className="button is-light"
                      onClick={() => setShiftForm({ ...shiftForm, start_time: '13:00', end_time: '17:00', break_start: '', break_end: '' })}
                    >
                      Afternoon (1-5)
                    </button>
                    <button
                      type="button"
                      className="button is-light"
                      onClick={() => setShiftForm({ ...shiftForm, start_time: '17:00', end_time: '21:00', break_start: '', break_end: '' })}
                    >
                      Evening (5-9)
                    </button>
                  </div>
                </div>

                <div className="columns">
                  <div className="column">
                    <label className="label">Break Start (Optional)</label>
                    <input
                      className="input"
                      type="time"
                      value={shiftForm.break_start}
                      onChange={(e) => setShiftForm({ ...shiftForm, break_start: e.target.value })}
                    />
                  </div>
                  <div className="column">
                    <label className="label">Break End (Optional)</label>
                    <input
                      className="input"
                      type="time"
                      value={shiftForm.break_end}
                      onChange={(e) => setShiftForm({ ...shiftForm, break_end: e.target.value })}
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label">Notes (Optional)</label>
                  <textarea
                    className="textarea"
                    placeholder="Additional notes about this shift..."
                    value={shiftForm.notes}
                    onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
                    rows="2"
                  />
                </div>

                <div className="field">
                  <div className="control">
                    <button 
                      className={`button is-success is-fullwidth ${saving ? 'is-loading' : ''}`} 
                      onClick={saveShift}
                      disabled={saving || !shiftForm.staff_id || !shiftForm.date || !shiftForm.start_time || !shiftForm.end_time}
                    >
                      {editingShift ? 'Update Shift' : 'Add Shift'}
                    </button>
                  </div>
                </div>

                <div className="field">
                  <div className="control">
                    <button 
                      className="button is-fullwidth" 
                      onClick={closeForm}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                {editingShift && (
                  <div className="field">
                    <div className="control">
                      <button 
                        className="button is-fullwidth has-text-danger" 
                        onClick={() => deleteShift(editingShift.id)}
                        disabled={saving}
                        style={{ backgroundColor: 'white', borderColor: '#ff3860', color: '#ff3860' }}
                      >
                        Delete Shift
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </>
  )
}