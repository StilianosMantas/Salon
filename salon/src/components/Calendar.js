'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Calendar({ bid, appointments = [], staff = [], chairs = [], selectedDate, onAppointmentClick, onDateChange }) {
  const [currentDate, setCurrentDate] = useState(() => {
    if (selectedDate) {
      return new Date(selectedDate + 'T00:00:00')
    }
    return new Date()
  })
  const [view, setView] = useState('week') // 'day', 'week', 'month'
  const [draggedAppointment, setDraggedAppointment] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState('all') // 'all' or staff id

  // Sync currentDate with selectedDate prop
  useEffect(() => {
    if (selectedDate) {
      const newDate = new Date(selectedDate + 'T00:00:00')
      if (newDate.getTime() !== currentDate.getTime()) {
        setCurrentDate(newDate)
      }
    }
  }, [selectedDate, currentDate])

  // Get start and end dates for current view
  const getViewDates = useCallback(() => {
    const start = new Date(currentDate)
    const end = new Date(currentDate)

    switch (view) {
      case 'day':
        return { start, end }
      case 'week':
        start.setDate(currentDate.getDate() - currentDate.getDay())
        end.setDate(start.getDate() + 6)
        return { start, end }
      case 'month':
        start.setDate(1)
        end.setMonth(start.getMonth() + 1)
        end.setDate(0)
        return { start, end }
      default:
        return { start, end }
    }
  }, [currentDate, view])

  // Navigate calendar
  const navigate = (direction) => {
    const newDate = new Date(currentDate)
    switch (view) {
      case 'day':
        newDate.setDate(newDate.getDate() + direction)
        break
      case 'week':
        newDate.setDate(newDate.getDate() + (direction * 7))
        break
      case 'month':
        newDate.setMonth(newDate.getMonth() + direction)
        break
    }
    setCurrentDate(newDate)
    // Update parent component's selected date
    if (onDateChange) {
      onDateChange(newDate.toISOString().split('T')[0])
    }
  }

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return ''
    return timeString.slice(0, 5)
  }

  // Format ID for display
  const formatId = (id) => {
    if (!id) return 'N/A'
    return String(id).slice(-6).toUpperCase()
  }

  // Get appointments for a specific date
  const getAppointmentsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    let filtered = appointments.filter(apt => {
      // Handle both slotdate and calculated date from appointments
      const appointmentDate = apt.slotdate || dateStr
      return appointmentDate === dateStr
    })
    
    // Filter by selected staff if not showing all
    if (selectedStaff !== 'all') {
      filtered = filtered.filter(apt => apt.staff_id === selectedStaff)
    }
    
    return filtered
  }

  // Get staff color for visualization
  const getStaffColor = (staffId) => {
    const colors = [
      '#3273dc', '#48c774', '#f14668', '#ff9f43', '#9c88ff', '#54a0ff'
    ]
    const index = staff.findIndex(s => s.id === staffId)
    return colors[index % colors.length] || '#dbdbdb'
  }

  // Get staff schedule for a specific date (availability)
  const getStaffScheduleForDate = (date, staffId) => {
    // This would typically come from a staff_schedule table
    // For now, we'll show a default schedule
    return {
      startTime: '09:00',
      endTime: '17:00',
      breaks: [{ start: '12:00', end: '13:00' }],
      isWorking: true
    }
  }

  // Get time slots for the view (9 AM to 8 PM in 30-minute intervals)
  const getTimeSlots = () => {
    const slots = []
    for (let hour = 9; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(time)
      }
    }
    return slots
  }

  // Handle drag start
  const handleDragStart = (e, appointment) => {
    setDraggedAppointment(appointment)
    e.dataTransfer.effectAllowed = 'move'
  }

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  // Handle drop
  const handleDrop = async (e, newDate, newTime) => {
    e.preventDefault()
    
    if (!draggedAppointment) return

    setIsLoading(true)
    try {
      // Calculate new end time based on appointment duration
      const [startHour, startMinute] = newTime.split(':').map(Number)
      const originalStart = new Date(`2000-01-01T${draggedAppointment.start_time}`)
      const originalEnd = new Date(`2000-01-01T${draggedAppointment.end_time}`)
      const duration = (originalEnd - originalStart) / (1000 * 60) // duration in minutes

      const newEndTime = new Date(2000, 0, 1, startHour, startMinute + duration)
      const newEndTimeStr = `${newEndTime.getHours().toString().padStart(2, '0')}:${newEndTime.getMinutes().toString().padStart(2, '0')}`

      // Update appointment in database
      const { error } = await supabase
        .from('slot')
        .update({
          slotdate: newDate.toISOString().split('T')[0],
          start_time: newTime,
          end_time: newEndTimeStr
        })
        .eq('id', draggedAppointment.id)

      if (error) throw error

      // Trigger refresh of appointments
      if (window.location.reload) {
        window.location.reload()
      }

    } catch (error) {
      console.error('Error moving appointment:', error)
      if (typeof window !== 'undefined' && window.toast) {
        window.toast.error('Failed to move appointment')
      }
    } finally {
      setIsLoading(false)
      setDraggedAppointment(null)
    }
  }

  // Render day view
  const renderDayView = () => {
    const timeSlots = getTimeSlots()
    const dayAppointments = getAppointmentsForDate(currentDate)

    return (
      <div className="calendar-day-view">
        <div className="time-grid">
          {timeSlots.map(time => (
            <div 
              key={time} 
              className="time-slot"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, currentDate, time)}
            >
              <div className="time-label">{formatTime(time)}</div>
              <div className="slot-content">
                {dayAppointments
                  .filter(apt => apt.start_time && apt.start_time.slice(0, 5) === time)
                  .map(apt => (
                    <div
                      key={apt.id}
                      className={`appointment-block ${apt.client_id ? (apt.book_status || 'booked') : 'available'}`}
                      draggable={apt.client_id}
                      onDragStart={(e) => handleDragStart(e, apt)}
                      onClick={() => onAppointmentClick && onAppointmentClick(apt)}
                      style={{
                        backgroundColor: apt.client_id ? (
                          apt.book_status === 'booked' ? '#48c774' : 
                          apt.book_status === 'completed' ? '#3273dc' :
                          apt.book_status === 'cancelled' ? '#f14668' : '#48c774'
                        ) : '#e9ecef',
                        color: apt.client_id ? 'white' : '#666'
                      }}
                    >
                      <div className="appointment-time">
                        {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                      </div>
                      {apt.client ? (
                        <div className="appointment-client">{apt.client.name}</div>
                      ) : (
                        <div className="appointment-client">Available</div>
                      )}
                      {apt.staff_id && (
                        <div className="appointment-staff">
                          {staff.find(s => s.id === apt.staff_id)?.name}
                        </div>
                      )}
                      <div className="appointment-reference">
                        #{formatId(apt.id)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Render week view with chairs/stations as columns (Outlook-style)
  const renderWeekView = () => {
    const { start } = getViewDates()
    const weekDays = []
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      weekDays.push(day)
    }

    const timeSlots = getTimeSlots()
    const availableChairs = chairs.length > 0 ? chairs : [{ id: 'default', name: 'Station 1', color: '#3273dc' }]

    // Chairs-centric view: columns are chairs/stations, rows are times
    return (
      <div className="calendar-week-view chairs-view">
        <div className="week-header">
          <div className="time-column-header">
            <div className="time-header-text">Time</div>
          </div>
          {availableChairs.map(chair => (
            <div key={chair.id} className="chair-header">
              <div className="chair-name">{chair.name}</div>
              <div className="chair-color-indicator" style={{ backgroundColor: chair.color || '#3273dc' }}></div>
            </div>
          ))}
        </div>
        <div className="week-body">
          {timeSlots.map(time => (
            <div key={time} className="time-row">
              <div className="time-label">{formatTime(time)}</div>
              {availableChairs.map(chair => {
                // Get appointments for this chair and time across all days of the week
                const chairAppointments = appointments.filter(apt => 
                  (apt.chair_id === chair.id || (chair.id === 'default' && !apt.chair_id)) &&
                  weekDays.some(day => apt.slotdate === day.toISOString().split('T')[0]) &&
                  apt.start_time && apt.start_time.slice(0, 5) === time
                )

                return (
                  <div
                    key={`${chair.id}-${time}`}
                    className="chair-slot"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, weekDays[0], time)} // Default to first day
                  >
                    <div className="appointments-container">
                      {chairAppointments.map(apt => (
                        <div
                          key={apt.id}
                          className={`appointment-block ${apt.client_id ? (apt.book_status || 'booked') : 'available'}`}
                          draggable={apt.client_id}
                          onDragStart={(e) => handleDragStart(e, apt)}
                          onClick={(e) => {
                            e.stopPropagation()
                            onAppointmentClick && onAppointmentClick(apt)
                          }}
                          style={{
                            backgroundColor: apt.client_id ? (
                              apt.staff_id ? getStaffColor(apt.staff_id) : 
                              apt.book_status === 'booked' ? '#48c774' : 
                              apt.book_status === 'completed' ? '#3273dc' :
                              apt.book_status === 'cancelled' ? '#f14668' : '#48c774'
                            ) : '#e9ecef',
                            borderLeft: chair.color ? `4px solid ${chair.color}` : 'none',
                            color: apt.client_id ? 'white' : '#666'
                          }}
                        >
                          <div className="appointment-content">
                            {apt.client ? (
                              <div className="client-name">{apt.client.name}</div>
                            ) : (
                              <div className="client-name">Available</div>
                            )}
                            <div className="appointment-day">
                              {new Date(apt.slotdate).toLocaleDateString('en', { weekday: 'short' })}
                            </div>
                            <div className="appointment-time">
                              {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                            </div>
                            {apt.staff_id && (
                              <div className="staff-indicator">
                                {staff.find(s => s.id === apt.staff_id)?.name}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {/* Add empty slots to indicate available times */}
                      {chairAppointments.length === 0 && (
                        <div 
                          className="empty-slot"
                          onClick={(e) => {
                            // Create a new appointment at this time slot
                            const newAppt = {
                              id: `new-${chair.id}-${time}`,
                              start_time: time,
                              end_time: time,
                              chair_id: chair.id,
                              slotdate: weekDays[0].toISOString().split('T')[0]
                            }
                            onAppointmentClick && onAppointmentClick(newAppt)
                          }}
                        >
                          <span className="add-appointment-text">+</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Render month view
  const renderMonthView = () => {
    const { start } = getViewDates()
    const firstDay = new Date(start.getFullYear(), start.getMonth(), 1)
    const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    
    // Get first day of calendar grid (might be from previous month)
    const calendarStart = new Date(firstDay)
    calendarStart.setDate(calendarStart.getDate() - firstDay.getDay())
    
    const weeks = []
    const currentDay = new Date(calendarStart)
    
    for (let week = 0; week < 6; week++) {
      const days = []
      for (let day = 0; day < 7; day++) {
        const dayAppointments = getAppointmentsForDate(currentDay)
        days.push({
          date: new Date(currentDay),
          appointments: dayAppointments,
          isCurrentMonth: currentDay.getMonth() === start.getMonth()
        })
        currentDay.setDate(currentDay.getDate() + 1)
      }
      weeks.push(days)
    }

    return (
      <div className="calendar-month-view">
        <div className="month-header">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="day-header">{day}</div>
          ))}
        </div>
        <div className="month-body">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="week-row">
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`month-day ${!day.isCurrentMonth ? 'other-month' : ''}`}
                  onClick={() => {
                    if (onDateChange) {
                      onDateChange(day.date.toISOString().split('T')[0])
                    }
                  }}
                >
                  <div className="day-number">{day.date.getDate()}</div>
                  <div className="day-appointments">
                    {day.appointments.slice(0, 3).map(apt => (
                      <div
                        key={apt.id}
                        className={`appointment-indicator ${apt.book_status || 'available'}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          onAppointmentClick && onAppointmentClick(apt)
                        }}
                        title={`${apt.client?.name || 'Available'} - ${formatTime(apt.start_time)}`}
                      />
                    ))}
                    {day.appointments.length > 3 && (
                      <div className="more-appointments">+{day.appointments.length - 3}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx>{`
        .calendar-container {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          margin: 1rem 0;
          border: 1px solid #e9ecef;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #dbdbdb;
          background: #f8f9fa;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .calendar-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .staff-filter {
          min-width: 120px;
        }

        .calendar-navigation {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .nav-button {
          background: white;
          border: 1px solid #dbdbdb;
          border-radius: 4px;
          padding: 0.5rem 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .nav-button:hover {
          background: #f5f5f5;
        }

        .calendar-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #363636;
        }

        .view-switcher {
          display: flex;
          border: 1px solid #dbdbdb;
          border-radius: 4px;
          overflow: hidden;
        }

        .view-button {
          background: white;
          border: none;
          padding: 0.5rem 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .view-button.active {
          background: #3273dc;
          color: white;
        }

        .view-button:hover:not(.active) {
          background: #f5f5f5;
        }

        .calendar-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #f0f8ff;
          border: 1px solid #3273dc;
          border-radius: 4px;
          color: #3273dc;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .staff-indicator {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.9);
          margin-bottom: 0.25rem;
        }

        .appointment-day {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.8);
          margin-bottom: 0.25rem;
        }

        /* Chair/Resource Integration */
        .chair-indicator {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.8);
        }

        /* Legend */
        .calendar-legend {
          display: flex;
          gap: 2rem;
          padding: 1rem;
          background: #f8f9fa;
          border-top: 2px solid #e9ecef;
          font-size: 0.875rem;
          flex-wrap: wrap;
          align-items: flex-start;
          border-bottom-left-radius: 6px;
          border-bottom-right-radius: 6px;
        }

        .legend-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 0.5rem;
        }

        .legend-section strong {
          color: #363636;
          margin-right: 0.5rem;
          font-weight: 600;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          padding: 0.25rem 0.5rem;
          background: white;
          border-radius: 4px;
          border: 1px solid #e9ecef;
        }

        .legend-color {
          width: 14px;
          height: 14px;
          border-radius: 3px;
          border: 1px solid rgba(0,0,0,0.1);
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        /* Day View Styles */
        .calendar-day-view {
          max-height: 70vh;
          overflow-y: auto;
          border: 1px solid #dbdbdb;
          border-radius: 6px;
          background: white;
        }

        .time-grid {
          display: flex;
          flex-direction: column;
        }

        .time-slot {
          display: flex;
          min-height: 60px;
          border-bottom: 1px solid #f0f0f0;
          transition: background-color 0.2s ease;
        }

        .time-slot:hover {
          background: #fafafa;
        }

        .time-label {
          width: 80px;
          padding: 0.75rem 0.5rem;
          font-size: 0.875rem;
          color: #666;
          border-right: 1px solid #f0f0f0;
          display: flex;
          align-items: flex-start;
          background: #f8f9fa;
          font-weight: 500;
        }

        .slot-content {
          flex: 1;
          padding: 0.5rem;
          cursor: pointer;
          position: relative;
          min-height: 60px;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .slot-content:hover {
          background: #f8f9fa;
        }

        /* Week View Styles - Chairs/Stations Layout */
        .calendar-week-view {
          max-height: 70vh;
          overflow: auto;
          border: 1px solid #dbdbdb;
          border-radius: 6px;
          background: white;
        }

        .calendar-week-view.chairs-view .week-header {
          display: grid;
          grid-template-columns: 80px repeat(auto-fit, minmax(200px, 1fr));
          border-bottom: 2px solid #dbdbdb;
          background: #f8f9fa;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .time-column-header {
          border-right: 1px solid #dbdbdb;
          background: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem 0.5rem;
        }

        .time-header-text {
          font-weight: 600;
          color: #363636;
          font-size: 0.875rem;
        }

        .chair-header {
          padding: 1rem 0.5rem;
          text-align: center;
          border-right: 1px solid #e0e0e0;
          background: #f8f9fa;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .chair-name {
          font-weight: 600;
          color: #363636;
          font-size: 0.875rem;
        }

        .chair-color-indicator {
          width: 20px;
          height: 4px;
          border-radius: 2px;
        }

        .week-body {
          display: flex;
          flex-direction: column;
        }

        .calendar-week-view.chairs-view .time-row {
          display: grid;
          grid-template-columns: 80px repeat(auto-fit, minmax(200px, 1fr));
          min-height: 60px;
          border-bottom: 1px solid #f0f0f0;
        }

        .time-row:hover {
          background: #fafafa;
        }

        .chair-slot {
          border-right: 1px solid #f0f0f0;
          padding: 0.5rem;
          cursor: pointer;
          position: relative;
          min-height: 60px;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          transition: background-color 0.2s ease;
          overflow: visible;
          box-sizing: border-box;
        }

        .chair-slot:hover {
          background: #f8f9fa;
        }

        .appointments-container {
          display: flex;
          flex-direction: row;
          flex-wrap: nowrap;
          gap: 0.25rem;
          align-items: stretch;
          width: 100%;
          min-height: 100%;
          overflow-x: auto;
        }

        .appointments-container .appointment-block {
          flex: 0 0 auto;
          min-width: 120px;
          max-width: 180px;
          width: auto;
        }

        .empty-slot {
          width: 100%;
          height: 100%;
          min-height: 50px;
          border: 2px dashed #e0e0e0;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background: transparent;
        }

        .empty-slot:hover {
          border-color: #3273dc;
          background: rgba(50, 115, 220, 0.05);
        }

        .add-appointment-text {
          color: #666;
          font-size: 1.2rem;
          font-weight: 300;
        }

        .empty-slot:hover .add-appointment-text {
          color: #3273dc;
        }

        /* Improve touch targets for tablets */
        @media (hover: none) and (pointer: coarse) {
          .day-slot {
            min-height: 80px;
            padding: 0.75rem;
          }

          .slot-content {
            min-height: 80px;
            padding: 0.75rem;
          }

          .appointment-block {
            min-height: 60px;
            padding: 1rem;
            font-size: 0.9rem;
            touch-action: manipulation;
          }

          .time-slot {
            min-height: 80px;
          }
        }

        /* Month View Styles */
        .calendar-month-view {
          height: 70vh;
          display: flex;
          flex-direction: column;
          border: 1px solid #dbdbdb;
          border-radius: 6px;
          background: white;
          overflow: hidden;
        }

        .month-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background: #f8f9fa;
          border-bottom: 2px solid #dbdbdb;
        }

        .month-header .day-header {
          padding: 1rem;
          text-align: center;
          font-weight: 600;
          border-right: 1px solid #e0e0e0;
          color: #363636;
          font-size: 0.875rem;
        }

        .month-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .week-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          flex: 1;
        }

        .month-day {
          border-right: 1px solid #f0f0f0;
          border-bottom: 1px solid #f0f0f0;
          padding: 0.75rem;
          cursor: pointer;
          position: relative;
          min-height: 100px;
          transition: background-color 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .month-day:hover {
          background: #f8f9fa;
        }

        .month-day.other-month {
          color: #bbb;
          background: #fafafa;
        }

        .month-day.other-month:hover {
          background: #f0f0f0;
        }

        .day-number {
          font-weight: 700;
          margin-bottom: 0.5rem;
          font-size: 1.1rem;
          color: #363636;
        }

        .month-day.other-month .day-number {
          color: #bbb;
        }

        .day-appointments {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .appointment-indicator {
          height: 4px;
          border-radius: 2px;
          margin-bottom: 1px;
        }

        .appointment-indicator.booked {
          background: #48c774;
        }

        .appointment-indicator.completed {
          background: #3273dc;
        }

        .appointment-indicator.cancelled {
          background: #f14668;
        }

        .appointment-indicator.available {
          background: #dbdbdb;
        }

        .more-appointments {
          font-size: 0.75rem;
          color: #666;
          margin-top: 0.25rem;
        }

        /* Appointment Block Styles */
        .appointment-block {
          border-radius: 6px;
          padding: 0.75rem;
          margin-bottom: 0.5rem;
          cursor: move;
          transition: all 0.2s ease;
          color: white;
          font-size: 0.875rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: none;
          min-height: 50px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          overflow: hidden;
          text-overflow: ellipsis;
          word-wrap: break-word;
        }

        .appointment-block:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          z-index: 5;
        }

        .appointment-block.available {
          background: #e9ecef !important;
          color: #666 !important;
          border: 2px dashed #ced4da;
          opacity: 0.7;
        }

        .appointment-block.booked {
          background: linear-gradient(135deg, #48c774, #3ec06d) !important;
        }

        .appointment-block.completed {
          background: linear-gradient(135deg, #3273dc, #2366d1) !important;
        }

        .appointment-block.cancelled {
          background: linear-gradient(135deg, #f14668, #ef2648) !important;
          opacity: 0.8;
        }

        .appointment-time {
          font-weight: 700;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        .appointment-client {
          margin-bottom: 0.25rem;
          font-weight: 600;
          font-size: 0.85rem;
        }

        .appointment-staff {
          font-size: 0.75rem;
          opacity: 0.9;
          margin-bottom: 0.25rem;
          font-weight: 500;
        }

        .appointment-reference {
          font-size: 0.7rem;
          opacity: 0.8;
          font-weight: 500;
        }

        .client-name {
          font-weight: 700;
          margin-bottom: 0.25rem;
          font-size: 0.85rem;
        }

        .appointment-content {
          font-size: 0.8rem;
          line-height: 1.3;
        }

        /* Loading State */
        .calendar-loading {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255,255,255,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }

        /* Responsive Design */
        
        /* iPad Pro and larger tablets */
        @media screen and (min-width: 769px) and (max-width: 1024px) {
          .calendar-container {
            margin: 0.5rem 0;
          }

          .calendar-header {
            padding: 1rem;
            gap: 1rem;
          }

          .calendar-controls {
            justify-content: center;
            gap: 1rem;
          }

          .time-label {
            width: 70px;
            font-size: 0.8rem;
            padding: 0.75rem 0.5rem;
          }

          .week-header {
            grid-template-columns: 70px repeat(7, 1fr);
          }

          .time-row {
            grid-template-columns: 70px repeat(7, 1fr);
            min-height: 70px;
          }

          .day-slot {
            padding: 0.5rem;
            min-height: 70px;
          }

          .slot-content {
            padding: 0.5rem;
            min-height: 70px;
          }

          .appointment-block {
            padding: 0.75rem;
            font-size: 0.8rem;
            margin-bottom: 0.5rem;
            min-height: 55px;
            max-width: 100%;
            word-wrap: break-word;
            overflow: hidden;
          }

          .appointment-time {
            font-size: 0.85rem;
            margin-bottom: 0.4rem;
            line-height: 1.2;
          }

          .appointment-client {
            font-size: 0.75rem;
            line-height: 1.2;
          }

          .appointment-staff {
            font-size: 0.7rem;
          }

          .day-header {
            padding: 1rem 0.5rem;
          }

          .day-name {
            font-size: 0.8rem;
          }

          .day-number {
            font-size: 1.4rem;
          }

          .calendar-day-view,
          .calendar-week-view,
          .calendar-month-view {
            max-height: 75vh;
          }

          .month-day {
            padding: 0.75rem;
            min-height: 110px;
          }

          /* Fix grid overflow issues on iPad */
          .week-body,
          .time-grid {
            overflow-x: auto;
            min-width: 100%;
          }

          .time-row,
          .week-header {
            min-width: 100%;
          }

          /* Improve appointment positioning */
          .appointment-block {
            position: relative;
            width: calc(100% - 4px);
            box-sizing: border-box;
          }

          /* Chairs view improvements for iPad */
          .calendar-week-view.chairs-view .week-header {
            grid-template-columns: 70px repeat(auto-fit, minmax(160px, 1fr));
          }

          .calendar-week-view.chairs-view .time-row {
            grid-template-columns: 70px repeat(auto-fit, minmax(160px, 1fr));
          }

          .chair-slot {
            min-height: 70px;
            padding: 0.5rem;
          }

          /* Ensure grid stability on iPad */
          .calendar-week-view {
            width: 100%;
            min-width: 0;
          }

          .week-header,
          .time-row {
            width: 100%;
            min-width: 0;
          }

          /* Fix text wrapping in appointment blocks */
          .appointment-time,
          .appointment-client,
          .appointment-staff {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
          }
        }

        @media screen and (max-width: 1024px) {
          .calendar-header {
            flex-direction: column;
            gap: 1rem;
            padding: 0.75rem;
          }

          .calendar-controls {
            justify-content: center;
            flex-wrap: wrap;
          }
        }

        /* iPad Mini and smaller tablets in portrait */
        @media screen and (min-width: 481px) and (max-width: 768px) {
          .calendar-container {
            margin: 0.25rem 0;
          }

          .time-label {
            width: 60px;
            font-size: 0.75rem;
            padding: 0.6rem 0.4rem;
          }

          .week-header {
            grid-template-columns: 60px repeat(7, 1fr);
          }

          .time-row {
            grid-template-columns: 60px repeat(7, 1fr);
            min-height: 65px;
          }

          .day-slot {
            padding: 0.4rem;
            min-height: 65px;
          }

          .slot-content {
            padding: 0.4rem;
            min-height: 65px;
          }

          .appointment-block {
            padding: 0.6rem;
            font-size: 0.75rem;
            margin-bottom: 0.4rem;
            min-height: 50px;
          }

          .appointment-time {
            font-size: 0.8rem;
            margin-bottom: 0.3rem;
          }

          .appointment-client {
            font-size: 0.7rem;
          }

          .appointment-staff {
            font-size: 0.65rem;
          }

          .day-header {
            padding: 0.8rem 0.4rem;
          }

          .day-name {
            font-size: 0.75rem;
          }

          .day-number {
            font-size: 1.3rem;
          }

          .calendar-day-view,
          .calendar-week-view,
          .calendar-month-view {
            max-height: 70vh;
          }

          .month-day {
            padding: 0.6rem;
            min-height: 95px;
          }
        }

        @media screen and (max-width: 768px) {
          .calendar-header {
            flex-direction: column;
            gap: 1rem;
            padding: 0.5rem;
          }

          .calendar-navigation {
            width: 100%;
            justify-content: space-between;
          }

          .calendar-title {
            font-size: 1rem;
          }

          .time-label {
            width: 50px;
            font-size: 0.75rem;
            padding: 0.5rem 0.25rem;
          }

          .week-header {
            grid-template-columns: 50px repeat(7, 1fr);
          }

          .time-row {
            grid-template-columns: 50px repeat(7, 1fr);
            min-height: 50px;
          }

          .day-header {
            padding: 0.5rem 0.25rem;
          }

          .day-name {
            font-size: 0.7rem;
          }

          .day-number {
            font-size: 1.1rem;
          }

          .appointment-block {
            padding: 0.5rem;
            font-size: 0.75rem;
            margin-bottom: 0.25rem;
            min-height: 40px;
          }

          .appointment-time {
            font-size: 0.75rem;
            margin-bottom: 0.25rem;
          }

          .appointment-client {
            font-size: 0.7rem;
          }

          .appointment-staff {
            font-size: 0.65rem;
          }

          .day-slot {
            padding: 0.25rem;
          }

          .slot-content {
            padding: 0.25rem;
          }

          .month-day {
            padding: 0.5rem;
            min-height: 80px;
          }

          .calendar-day-view,
          .calendar-week-view,
          .calendar-month-view {
            max-height: 60vh;
          }
        }

        @media screen and (max-width: 480px) {
          .view-switcher {
            width: 100%;
          }

          .view-button {
            flex: 1;
            font-size: 0.875rem;
            padding: 0.5rem;
          }

          .staff-filter {
            width: 100%;
          }

          .calendar-navigation {
            gap: 0.5rem;
          }

          .nav-button {
            padding: 0.5rem;
          }

          .calendar-title {
            font-size: 0.9rem;
            text-align: center;
          }

          .time-label {
            width: 40px;
            font-size: 0.7rem;
          }

          .week-header {
            grid-template-columns: 40px repeat(7, 1fr);
          }

          .time-row {
            grid-template-columns: 40px repeat(7, 1fr);
            min-height: 45px;
          }

          .appointment-block {
            padding: 0.25rem;
            font-size: 0.7rem;
            min-height: 35px;
          }

          .calendar-legend {
            padding: 0.75rem;
            gap: 1rem;
            font-size: 0.75rem;
          }

          .legend-section {
            gap: 0.5rem;
            width: 100%;
            justify-content: flex-start;
          }

          .legend-item {
            font-size: 0.7rem;
            padding: 0.25rem;
            gap: 0.25rem;
          }

          .legend-color {
            width: 12px;
            height: 12px;
          }
        }
      `}</style>

      <div className="calendar-container">
        {isLoading && (
          <div className="calendar-loading">
            <div className="button is-loading is-ghost">Loading...</div>
          </div>
        )}
        
        <div className="calendar-header">
          <div className="calendar-navigation">
            <button className="nav-button" onClick={() => navigate(-1)}>
              <span className="icon">
                <i className="fas fa-chevron-left"></i>
              </span>
            </button>
            <div className="calendar-title">
              {view === 'day' && currentDate.toLocaleDateString('en', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
              {view === 'week' && `Week of ${getViewDates().start.toLocaleDateString('en', { 
                month: 'short', 
                day: 'numeric' 
              })}`}
              {view === 'month' && currentDate.toLocaleDateString('en', { 
                year: 'numeric', 
                month: 'long' 
              })}
            </div>
            <button className="nav-button" onClick={() => navigate(1)}>
              <span className="icon">
                <i className="fas fa-chevron-right"></i>
              </span>
            </button>
          </div>
          
          <div className="calendar-controls">
            <div className="view-switcher">
              <button 
                className={`view-button ${view === 'day' ? 'active' : ''}`}
                onClick={() => setView('day')}
              >
                Day
              </button>
              <button 
                className={`view-button ${view === 'week' ? 'active' : ''}`}
                onClick={() => setView('week')}
              >
                Week
              </button>
              <button 
                className={`view-button ${view === 'month' ? 'active' : ''}`}
                onClick={() => setView('month')}
              >
                Month
              </button>
            </div>

            {/* Staff Filter */}
            <div className="staff-filter">
              <div className="select is-small">
                <select 
                  value={selectedStaff} 
                  onChange={(e) => setSelectedStaff(e.target.value)}
                >
                  <option value="all">All Staff</option>
                  {staff.map(staffMember => (
                    <option key={staffMember.id} value={staffMember.id}>
                      {staffMember.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Chairs View Info */}
            {view === 'week' && (
              <div className="calendar-info">
                <span className="icon">
                  <i className="fas fa-chair"></i>
                </span>
                <span>Stations/Chairs View</span>
              </div>
            )}
          </div>
        </div>

        <div className="calendar-body">
          {view === 'day' && renderDayView()}
          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </div>

        {/* Calendar Legend */}
        <div className="calendar-legend">
          <div className="legend-section">
            <strong>Status:</strong>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#48c774' }}></div>
              <span>Booked</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#3273dc' }}></div>
              <span>Completed</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#f14668' }}></div>
              <span>Cancelled</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#dbdbdb' }}></div>
              <span>Available</span>
            </div>
          </div>
          
          {staff.length > 0 && selectedStaff === 'all' && (
            <div className="legend-section">
              <strong>Staff:</strong>
              {staff.map(staffMember => (
                <div key={staffMember.id} className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: getStaffColor(staffMember.id) }}></div>
                  <span>{staffMember.name}</span>
                </div>
              ))}
            </div>
          )}

          {chairs.length > 0 && (
            <div className="legend-section">
              <strong>Chairs:</strong>
              {chairs.slice(0, 4).map(chair => (
                <div key={chair.id} className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: chair.color || '#666' }}></div>
                  <span>{chair.name}</span>
                </div>
              ))}
              {chairs.length > 4 && <span>+{chairs.length - 4} more</span>}
            </div>
          )}
        </div>
      </div>
    </>
  )
}