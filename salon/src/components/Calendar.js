'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Calendar({ bid, appointments = [], staff = [], chairs = [], onAppointmentClick, onTimeSlotClick }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('week') // 'day', 'week', 'month'
  const [draggedAppointment, setDraggedAppointment] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState('all') // 'all' or staff id
  const [showStaffSchedule, setShowStaffSchedule] = useState(false)

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
  }

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return ''
    return timeString.slice(0, 5)
  }

  // Get appointments for a specific date
  const getAppointmentsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    let filtered = appointments.filter(apt => apt.slotdate === dateStr)
    
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
              onClick={() => onTimeSlotClick && onTimeSlotClick(currentDate, time)}
            >
              <div className="time-label">{formatTime(time)}</div>
              <div className="slot-content">
                {dayAppointments
                  .filter(apt => apt.start_time.slice(0, 5) === time)
                  .map(apt => (
                    <div
                      key={apt.id}
                      className={`appointment-block ${apt.book_status || 'available'}`}
                      draggable={apt.client_id}
                      onDragStart={(e) => handleDragStart(e, apt)}
                      onClick={() => onAppointmentClick && onAppointmentClick(apt)}
                      style={{
                        backgroundColor: apt.book_status === 'booked' ? '#48c774' : 
                                       apt.book_status === 'completed' ? '#3273dc' :
                                       apt.book_status === 'cancelled' ? '#f14668' : '#dbdbdb'
                      }}
                    >
                      <div className="appointment-time">
                        {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                      </div>
                      {apt.client && (
                        <div className="appointment-client">{apt.client.name}</div>
                      )}
                      {apt.staff_id && (
                        <div className="appointment-staff">
                          {staff.find(s => s.id === apt.staff_id)?.name}
                        </div>
                      )}
                      <div className="appointment-reference">
                        #{apt.id.slice(-6).toUpperCase()}
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

  // Render week view with optional staff columns
  const renderWeekView = () => {
    const { start } = getViewDates()
    const weekDays = []
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      weekDays.push(day)
    }

    const timeSlots = getTimeSlots()

    if (showStaffSchedule && selectedStaff === 'all') {
      // Staff-centric view: columns are staff members, rows are times
      return (
        <div className="calendar-week-view staff-view">
          <div className="week-header">
            <div className="time-column-header"></div>
            {staff.map(staffMember => (
              <div key={staffMember.id} className="staff-header">
                <div className="staff-name">{staffMember.name}</div>
                <div className="staff-color-indicator" style={{ backgroundColor: getStaffColor(staffMember.id) }}></div>
              </div>
            ))}
          </div>
          <div className="week-body">
            {timeSlots.map(time => (
              <div key={time} className="time-row">
                <div className="time-label">{formatTime(time)}</div>
                {staff.map(staffMember => {
                  const staffAppointments = appointments.filter(apt => 
                    apt.staff_id === staffMember.id && 
                    weekDays.some(day => apt.slotdate === day.toISOString().split('T')[0]) &&
                    apt.start_time.slice(0, 5) === time
                  )

                  return (
                    <div
                      key={`${staffMember.id}-${time}`}
                      className="staff-slot"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, weekDays[0], time)} // Default to first day
                    >
                      {staffAppointments.map(apt => (
                        <div
                          key={apt.id}
                          className={`appointment-block ${apt.book_status || 'available'}`}
                          draggable={apt.client_id}
                          onDragStart={(e) => handleDragStart(e, apt)}
                          onClick={(e) => {
                            e.stopPropagation()
                            onAppointmentClick && onAppointmentClick(apt)
                          }}
                          style={{
                            backgroundColor: getStaffColor(staffMember.id),
                            opacity: apt.book_status === 'booked' ? 1 : 
                                   apt.book_status === 'completed' ? 0.8 :
                                   apt.book_status === 'cancelled' ? 0.4 : 0.6
                          }}
                        >
                          <div className="appointment-content">
                            {apt.client && <div className="client-name">{apt.client.name}</div>}
                            <div className="appointment-day">
                              {new Date(apt.slotdate).toLocaleDateString('en', { weekday: 'short' })}
                            </div>
                            <div className="appointment-time">
                              {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )
    }

    // Regular day-centric view
    return (
      <div className="calendar-week-view">
        <div className="week-header">
          <div className="time-column-header"></div>
          {weekDays.map(day => (
            <div key={day.toISOString()} className="day-header">
              <div className="day-name">{day.toLocaleDateString('en', { weekday: 'short' })}</div>
              <div className="day-number">{day.getDate()}</div>
            </div>
          ))}
        </div>
        <div className="week-body">
          {timeSlots.map(time => (
            <div key={time} className="time-row">
              <div className="time-label">{formatTime(time)}</div>
              {weekDays.map(day => {
                const dayAppointments = getAppointmentsForDate(day)
                const timeAppointments = dayAppointments.filter(apt => 
                  apt.start_time.slice(0, 5) === time
                )

                return (
                  <div
                    key={`${day.toISOString()}-${time}`}
                    className="day-slot"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day, time)}
                    onClick={() => onTimeSlotClick && onTimeSlotClick(day, time)}
                  >
                    {timeAppointments.map(apt => (
                      <div
                        key={apt.id}
                        className={`appointment-block ${apt.book_status || 'available'}`}
                        draggable={apt.client_id}
                        onDragStart={(e) => handleDragStart(e, apt)}
                        onClick={(e) => {
                          e.stopPropagation()
                          onAppointmentClick && onAppointmentClick(apt)
                        }}
                        style={{
                          backgroundColor: apt.staff_id ? getStaffColor(apt.staff_id) : 
                                         apt.book_status === 'booked' ? '#48c774' : 
                                         apt.book_status === 'completed' ? '#3273dc' :
                                         apt.book_status === 'cancelled' ? '#f14668' : '#dbdbdb',
                          borderLeft: apt.staff_id ? `4px solid ${getStaffColor(apt.staff_id)}` : 'none'
                        }}
                      >
                        <div className="appointment-content">
                          {apt.client && <div className="client-name">{apt.client.name}</div>}
                          {apt.staff_id && (
                            <div className="staff-indicator">
                              {staff.find(s => s.id === apt.staff_id)?.name}
                            </div>
                          )}
                          <div className="appointment-time">
                            {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                          </div>
                          {apt.chair_id && (
                            <div 
                              className="chair-indicator" 
                              style={{ 
                                backgroundColor: chairs.find(c => c.id === apt.chair_id)?.color || '#666'
                              }}
                              title={`Chair: ${chairs.find(c => c.id === apt.chair_id)?.name || 'Unknown'}`}
                            />
                          )}
                        </div>
                      </div>
                    ))}
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
                  onClick={() => onTimeSlotClick && onTimeSlotClick(day.date, '09:00')}
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
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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

        /* Staff Schedule Styles */
        .staff-view .week-header {
          grid-template-columns: 80px repeat(auto-fit, minmax(120px, 1fr));
        }

        .staff-view .time-row {
          grid-template-columns: 80px repeat(auto-fit, minmax(120px, 1fr));
        }

        .staff-header {
          padding: 0.75rem 0.5rem;
          text-align: center;
          border-right: 1px solid #f0f0f0;
          position: relative;
        }

        .staff-name {
          font-weight: 600;
          color: #363636;
          margin-bottom: 0.25rem;
        }

        .staff-color-indicator {
          width: 20px;
          height: 4px;
          border-radius: 2px;
          margin: 0 auto;
        }

        .staff-slot {
          border-right: 1px solid #f0f0f0;
          padding: 0.25rem;
          cursor: pointer;
          position: relative;
          min-height: 60px;
        }

        .staff-slot:hover {
          background: #f8f9fa;
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
          padding: 0.75rem 1rem;
          background: #fafafa;
          border-top: 1px solid #f0f0f0;
          font-size: 0.875rem;
          flex-wrap: wrap;
          align-items: flex-start;
        }

        .legend-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .legend-section strong {
          color: #363636;
          margin-right: 0.25rem;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 2px;
          border: 1px solid rgba(0,0,0,0.1);
        }

        /* Day View Styles */
        .calendar-day-view {
          max-height: 600px;
          overflow-y: auto;
        }

        .time-grid {
          display: flex;
          flex-direction: column;
        }

        .time-slot {
          display: flex;
          min-height: 60px;
          border-bottom: 1px solid #f0f0f0;
        }

        .time-label {
          width: 80px;
          padding: 0.5rem;
          font-size: 0.875rem;
          color: #666;
          border-right: 1px solid #f0f0f0;
          display: flex;
          align-items: flex-start;
        }

        .slot-content {
          flex: 1;
          padding: 0.25rem;
          cursor: pointer;
          position: relative;
        }

        .slot-content:hover {
          background: #f8f9fa;
        }

        /* Week View Styles */
        .calendar-week-view {
          max-height: 600px;
          overflow: auto;
        }

        .week-header {
          display: grid;
          grid-template-columns: 80px repeat(7, 1fr);
          border-bottom: 1px solid #dbdbdb;
          background: #f8f9fa;
        }

        .time-column-header {
          border-right: 1px solid #dbdbdb;
        }

        .day-header {
          padding: 0.75rem 0.5rem;
          text-align: center;
          border-right: 1px solid #f0f0f0;
        }

        .day-name {
          font-weight: 600;
          color: #363636;
        }

        .day-number {
          font-size: 1.25rem;
          color: #666;
        }

        .week-body {
          display: flex;
          flex-direction: column;
        }

        .time-row {
          display: grid;
          grid-template-columns: 80px repeat(7, 1fr);
          min-height: 60px;
          border-bottom: 1px solid #f0f0f0;
        }

        .day-slot {
          border-right: 1px solid #f0f0f0;
          padding: 0.25rem;
          cursor: pointer;
          position: relative;
        }

        .day-slot:hover {
          background: #f8f9fa;
        }

        /* Month View Styles */
        .calendar-month-view {
          height: 500px;
          display: flex;
          flex-direction: column;
        }

        .month-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background: #f8f9fa;
          border-bottom: 1px solid #dbdbdb;
        }

        .month-header .day-header {
          padding: 0.75rem;
          text-align: center;
          font-weight: 600;
          border-right: 1px solid #f0f0f0;
        }

        .month-body {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .week-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          flex: 1;
        }

        .month-day {
          border-right: 1px solid #f0f0f0;
          border-bottom: 1px solid #f0f0f0;
          padding: 0.5rem;
          cursor: pointer;
          position: relative;
          min-height: 80px;
        }

        .month-day:hover {
          background: #f8f9fa;
        }

        .month-day.other-month {
          color: #ccc;
          background: #fafafa;
        }

        .day-number {
          font-weight: 600;
          margin-bottom: 0.25rem;
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
          border-radius: 4px;
          padding: 0.5rem;
          margin-bottom: 0.25rem;
          cursor: move;
          transition: all 0.2s;
          color: white;
          font-size: 0.875rem;
        }

        .appointment-block:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .appointment-time {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .appointment-client {
          margin-bottom: 0.25rem;
        }

        .appointment-staff {
          font-size: 0.75rem;
          opacity: 0.9;
          margin-bottom: 0.25rem;
        }

        .appointment-reference {
          font-size: 0.7rem;
          opacity: 0.8;
        }

        .client-name {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .appointment-content {
          font-size: 0.8rem;
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
        @media screen and (max-width: 768px) {
          .calendar-header {
            flex-direction: column;
            gap: 1rem;
          }

          .calendar-navigation {
            width: 100%;
            justify-content: space-between;
          }

          .time-label {
            width: 60px;
            font-size: 0.75rem;
          }

          .week-header {
            grid-template-columns: 60px repeat(7, 1fr);
          }

          .time-row {
            grid-template-columns: 60px repeat(7, 1fr);
          }

          .appointment-block {
            padding: 0.25rem;
            font-size: 0.75rem;
          }

          .day-header {
            padding: 0.5rem 0.25rem;
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

            {/* Staff Schedule Toggle */}
            {view === 'week' && (
              <button 
                className={`button is-small ${showStaffSchedule ? 'is-info' : 'is-light'}`}
                onClick={() => setShowStaffSchedule(!showStaffSchedule)}
                title="Toggle staff schedule view"
              >
                <span className="icon">
                  <i className="fas fa-users"></i>
                </span>
                <span>Staff View</span>
              </button>
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