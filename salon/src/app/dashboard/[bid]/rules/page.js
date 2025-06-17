'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams } from 'next/navigation'
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function RulesPage() {
  const { bid } = useParams()
  const [rules, setRules] = useState([])
  const [overrides, setOverrides] = useState([])
  const [dateOverride, setDateOverride] = useState({ slotdate: '', start_time: '', end_time: '', is_closed: false })
  const [newRanges, setNewRanges] = useState({})
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [slotLength, setSlotLength] = useState(15)
  const [generatedDates, setGeneratedDates] = useState([])
  const [chairs, setChairs] = useState([])
  const [showAddForm, setShowAddForm] = useState({})
  const [formVisible, setFormVisible] = useState(false)
  const [currentDay, setCurrentDay] = useState(null)
  const [form, setForm] = useState({ start_time: '', end_time: '' })
  const [isClosing, setIsClosing] = useState(false)
  const [showOverrideForm, setShowOverrideForm] = useState(false)
  const [overrideForm, setOverrideForm] = useState({ slotdate: '', start_time: '', end_time: '', is_closed: false })
  const [isOverrideClosing, setIsOverrideClosing] = useState(false)

  const fetchData = useCallback(async () => {
    const { data: rulesData } = await supabase.from('business_rules').select('*').eq('business_id', bid).order('weekday')
    const { data: overridesData } = await supabase.from('business_overrides').select('*').eq('business_id', bid).order('slotdate')
    const { data: businessData } = await supabase.from('business').select('slot_length').eq('id', bid).single()
    const { data: slotsData } = await supabase.from('slot').select('slotdate').eq('business_id', bid)
    const { data: chairsData } = await supabase.from('chairs').select('id, name').eq('business_id', bid).eq('is_active', true).order('name')
    const datesSet = Array.from(new Set(slotsData?.map(s => s.slotdate)))
    setRules(rulesData || [])
    setOverrides(overridesData || [])
    setSlotLength(businessData?.slot_length || 15)
    setChairs(chairsData || [])
    setGeneratedDates(datesSet)
  }, [bid])

  useEffect(() => {
    if (!bid) return
    fetchData()
  }, [bid, fetchData])

  async function saveRule(day, range) {
    const overlap = rules.some(r => r.weekday === day &&
      ((range.start_time >= r.start_time && range.start_time < r.end_time) ||
       (range.end_time > r.start_time && range.end_time <= r.end_time) ||
       (range.start_time <= r.start_time && range.end_time >= r.end_time)))
    if (overlap) {
      alert('This time range overlaps with an existing rule.')
      return
    }
    await supabase.from('business_rules').insert({
      business_id: bid,
      weekday: day,
      start_time: range.start_time,
      end_time: range.end_time,
      is_closed: false
    })
    fetchData()
  }

  async function deleteRule(id) {
    const confirmed = confirm('Delete this rule?')
    if (!confirmed) return
    await supabase.from('business_rules').delete().eq('id', id)
    fetchData()
  }

  async function saveOverride() {
    const { slotdate, start_time, end_time, is_closed } = dateOverride
    if (!slotdate) return
    await supabase.from('business_overrides').upsert({ business_id: bid, slotdate, start_time, end_time, is_closed })
    setDateOverride({ slotdate: '', start_time: '', end_time: '', is_closed: false })
    fetchData()
  }

  async function deleteOverride(id) {
    const confirmed = confirm('Delete override?')
    if (!confirmed) return
    await supabase.from('business_overrides').delete().eq('id', id)
    fetchData()
  }

  function handleNewRangeChange(day, field, value) {
    setNewRanges(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }))
  }

  function addRange(day) {
    const range = newRanges[day]
    if (range?.start_time && range?.end_time) {
      saveRule(day, range)
      setNewRanges(prev => ({ ...prev, [day]: { start_time: '', end_time: '' } }))
    }
  }

  function openAddForm(day) {
    setCurrentDay(day)
    setForm({ start_time: '', end_time: '' })
    setFormVisible(true)
  }

  function closeForm() {
    setIsClosing(true)
    setTimeout(() => {
      setForm({ start_time: '', end_time: '' })
      setCurrentDay(null)
      setFormVisible(false)
      setIsClosing(false)
    }, 300)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.start_time || !form.end_time) return alert('Please fill all fields')
    
    await saveRule(currentDay, form)
    closeForm()
  }

  function openOverrideForm() {
    setOverrideForm({ slotdate: '', start_time: '', end_time: '', is_closed: false })
    setShowOverrideForm(true)
  }

  function closeOverrideForm() {
    setIsOverrideClosing(true)
    setTimeout(() => {
      setOverrideForm({ slotdate: '', start_time: '', end_time: '', is_closed: false })
      setShowOverrideForm(false)
      setIsOverrideClosing(false)
    }, 300)
  }

  async function handleOverrideSubmit(e) {
    e.preventDefault()
    if (!overrideForm.slotdate) return alert('Please select a date')
    if (!overrideForm.is_closed && (!overrideForm.start_time || !overrideForm.end_time)) {
      return alert('Please fill start and end times or mark as closed')
    }
    
    await supabase.from('business_overrides').upsert({
      business_id: bid,
      slotdate: overrideForm.slotdate,
      start_time: overrideForm.start_time,
      end_time: overrideForm.end_time,
      is_closed: overrideForm.is_closed
    })
    closeOverrideForm()
    fetchData()
  }

  async function generateSlots() {
    if (!rangeStart || !rangeEnd) return alert('Please provide a valid date range')
    
    if (chairs.length === 0) {
      return alert('No active chairs found. Please add active chairs before generating slots.')
    }

    const start = new Date(rangeStart)
    const end = new Date(rangeEnd)
    let totalSlotsCreated = 0

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]

      const override = overrides.find(o => o.slotdate === dateStr)
      let periods = []

      if (override) {
        if (!override.is_closed) periods.push({ start_time: override.start_time, end_time: override.end_time })
      } else {
        const weekday = (d.getDay() + 6) % 7 // Monday = 0
        const dailyRules = rules.filter(r => r.weekday === weekday && !r.is_closed)
        periods = dailyRules.map(r => ({ start_time: r.start_time, end_time: r.end_time }))
      }

      // Generate slots for each active chair
      for (const chair of chairs) {
        for (const p of periods) {
          const [sh, sm] = p.start_time.split(':').map(Number)
          const [eh, em] = p.end_time.split(':').map(Number)
          const startMin = sh * 60 + sm
          const endMin = eh * 60 + em

          for (let m = startMin; m + slotLength <= endMin; m += slotLength) {
            const h = String(Math.floor(m / 60)).padStart(2, '0')
            const min = String(m % 60).padStart(2, '0')
            const startTime = `${h}:${min}`

            const endSlotMin = m + slotLength
            const eh2 = String(Math.floor(endSlotMin / 60)).padStart(2, '0')
            const em2 = String(endSlotMin % 60).padStart(2, '0')
            const endTime = `${eh2}:${em2}`

            // Check if slot already exists for this chair, date, and time
            const { data: existing } = await supabase
              .from('slot')
              .select('id')
              .eq('business_id', bid)
              .eq('slotdate', dateStr)
              .eq('start_time', startTime)
              .eq('chair_id', chair.id)

            if (!existing || existing.length === 0) {
              await supabase.from('slot').insert({
                business_id: bid,
                slotdate: dateStr,
                start_time: startTime,
                end_time: endTime,
                duration: slotLength,
                chair_id: chair.id
              })
              totalSlotsCreated++
            }
          }
        }
      }
    }

    alert(`Slots generated: ${totalSlotsCreated} slots created across ${chairs.length} chair(s)`)
    fetchData()
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
      `}</style>
    <div className="container py-5 px-4">
      <h1 className="title is-4 mb-4">Business Open Hours</h1>

      <div className="columns is-multiline mb-5">
        <div className="column is-half-tablet is-full-mobile">
          <label className="label">Start Date</label>
          <input className="input" type="date" value={rangeStart} onChange={e => setRangeStart(e.target.value)} />
        </div>
        <div className="column is-half-tablet is-full-mobile">
          <label className="label">End Date</label>
          <input className="input" type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} />
        </div>
        <div className="column is-full">
          <button className="button is-info is-fullwidth-mobile" onClick={generateSlots}>
            Generate Slots {chairs.length > 0 ? `(${chairs.length} chair${chairs.length > 1 ? 's' : ''})` : ''}
          </button>
          {chairs.length > 0 && (
            <p className="help mt-2">
              Slots will be created for: {chairs.map(c => c.name).join(', ')}
            </p>
          )}
          {chairs.length === 0 && (
            <p className="help has-text-danger mt-2">
              No active chairs found. Please add chairs before generating slots.
            </p>
          )}
        </div>
      </div>
        <h2 className="label is-6 mb-3">Weekly Schedule</h2>
      <div className="box mb-5">
        
        {weekdays.map((day, i) => {
          const dayRules = rules.filter(r => r.weekday === i)
          return (
            <div key={i} className="mb-5">
              <div className="is-flex is-justify-content-space-between is-align-items-center mb-2">
                <div className="has-text-weight-semibold">{day}</div>
                <button 
                  className="button is-small is-rounded is-ghost"
                  onClick={() => openAddForm(i)}
                  style={{ width: '32px', height: '32px', padding: '0' }}
                >
                  <span className="icon is-small">
                    <i className="fas fa-plus"></i>
                  </span>
                </button>
              </div>
              
              {dayRules.length > 0 ? dayRules.map(rule => (
                <div key={rule.id} className="box p-3 mb-2">
                  <div className="is-flex is-justify-content-space-between is-align-items-center">
                    <div className="is-hidden-mobile">
                      <span className="has-text-weight-semibold">{rule.start_time.slice(0,5)} - {rule.end_time.slice(0,5)}</span>
                    </div>
                    <div className="is-hidden-tablet is-flex is-align-items-center" style={{ gap: '0.5rem' }}>
                      <span className="has-text-weight-semibold" style={{ fontSize: '0.875rem' }}>{rule.start_time.slice(0,5)} - {rule.end_time.slice(0,5)}</span>
                      <button className="button is-small is-danger is-light" onClick={() => deleteRule(rule.id)}>
                        <span className="icon is-small">
                          <i className="fas fa-trash"></i>
                        </span>
                      </button>
                    </div>
                    <div className="is-hidden-mobile" style={{ marginLeft: 'auto' }}>
                      <button className="button is-small is-danger is-light" onClick={() => deleteRule(rule.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="box p-3 mb-2 has-background-light">
                  <div className="is-flex is-justify-content-space-between is-align-items-center">
                    <span className="has-text-grey">No hours set - click + to add</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
        <h2 className="label is-6 mb-3">Date Overrides</h2>
      <div className="box">
        
        <div className="columns is-multiline is-vcentered mb-4">
          <div className="column is-one-third-tablet is-full-mobile">
            <label className="label">Override Date</label>
            <input className="input" type="date" value={dateOverride.slotdate} onChange={e => setDateOverride({ ...dateOverride, slotdate: e.target.value })} />
          </div>
          <div className="column is-one-quarter-tablet is-half-mobile">
            <label className="label">Start Time</label>
            <input className="input" type="time" value={dateOverride.start_time} onChange={e => setDateOverride({ ...dateOverride, start_time: e.target.value })} />
          </div>
          <div className="column is-one-quarter-tablet is-half-mobile">
            <label className="label">End Time</label>
            <input className="input" type="time" value={dateOverride.end_time} onChange={e => setDateOverride({ ...dateOverride, end_time: e.target.value })} />
          </div>
          <div className="column is-full-mobile">
            <div className="field is-grouped is-grouped-centered-mobile">
              <div className="control">
                <label className="checkbox">
                  <input type="checkbox" checked={dateOverride.is_closed} onChange={e => setDateOverride({ ...dateOverride, is_closed: e.target.checked })} /> Mark as Closed Day
                </label>
              </div>
              <div className="control">
                <button className="button is-success" onClick={saveOverride}>Save Override</button>
              </div>
            </div>
          </div>
        </div>
        <div className="content">
          {(() => {
            const futureOverrides = overrides.filter(o => new Date(o.slotdate) >= new Date().setHours(0,0,0,0))
            return futureOverrides.length === 0 ? (
              <p className="has-text-grey">No upcoming date overrides</p>
            ) : (
              futureOverrides.map(o => (
              <div key={o.id} className="box p-3 mb-3">
                <div className="is-flex is-flex-direction-column is-flex-direction-row-tablet is-justify-content-space-between is-align-items-start is-align-items-center-tablet">
                  <div className="mb-2 mb-0-tablet">
                    <div className="has-text-weight-semibold">{o.slotdate}</div>
                    <div className="is-size-7 has-text-grey">
                      {o.is_closed ? 'Closed' : `${o.start_time?.slice(0,5)} – ${o.end_time?.slice(0,5)}`}
                    </div>
                    {generatedDates.includes(o.slotdate) && (
                      <span className="tag is-info is-size-7 mt-1">Slots Generated</span>
                    )}
                  </div>
                  <button className="button is-small is-danger is-light is-fullwidth-mobile" onClick={() => deleteOverride(o.id)}>Delete</button>
                </div>
              </div>
              ))
            )
          })()}
        </div>
      </div>

      {formVisible && (
        <div className="modal is-active">
          <div className="modal-background" onClick={() => closeForm()}></div>
          <div className="modal-card" style={{ 
            animation: isClosing ? 'slideOutToRight 0.3s ease-in' : 'slideInFromRight 0.3s ease-out', 
            transformOrigin: 'center right' 
          }}>
            <header className="modal-card-head">
              <p className="modal-card-title">Add Time Range for {weekdays[currentDay]}</p>
              <button className="delete" aria-label="close" onClick={() => closeForm()}></button>
            </header>
            <section className="modal-card-body">
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label className="label">Start Time</label>
                  <div className="control">
                    <input 
                      className="input" 
                      type="time" 
                      value={form.start_time} 
                      onChange={e => setForm({ ...form, start_time: e.target.value })} 
                      required 
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
                      onChange={e => setForm({ ...form, end_time: e.target.value })} 
                      required 
                    />
                  </div>
                </div>
                <div className="field">
                  <div className="control">
                    <button className="button is-success is-fullwidth" type="submit">
                      Add Range
                    </button>
                  </div>
                </div>
                <div className="field">
                  <div className="control">
                    <button className="button is-fullwidth" type="button" onClick={() => closeForm()}>
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </section>
          </div>
        </div>
      )}

      {showOverrideForm && (
        <div className="modal is-active">
          <div className="modal-background" onClick={() => closeOverrideForm()}></div>
          <div className="modal-card" style={{ 
            animation: isOverrideClosing ? 'slideOutToRight 0.3s ease-in' : 'slideInFromRight 0.3s ease-out', 
            transformOrigin: 'center right' 
          }}>
            <header className="modal-card-head">
              <p className="modal-card-title">Add Date Override</p>
              <button className="delete" aria-label="close" onClick={() => closeOverrideForm()}></button>
            </header>
            <section className="modal-card-body">
              <form onSubmit={handleOverrideSubmit}>
                <div className="field">
                  <label className="label">Override Date</label>
                  <div className="control">
                    <input 
                      className="input" 
                      type="date" 
                      value={overrideForm.slotdate} 
                      onChange={e => setOverrideForm({ ...overrideForm, slotdate: e.target.value })} 
                      required 
                    />
                  </div>
                </div>
                <div className="field">
                  <div className="control">
                    <label className="checkbox">
                      <input 
                        type="checkbox" 
                        checked={overrideForm.is_closed} 
                        onChange={e => setOverrideForm({ ...overrideForm, is_closed: e.target.checked })} 
                      /> Mark as Closed Day
                    </label>
                  </div>
                </div>
                {!overrideForm.is_closed && (
                  <>
                    <div className="field">
                      <label className="label">Start Time</label>
                      <div className="control">
                        <input 
                          className="input" 
                          type="time" 
                          value={overrideForm.start_time} 
                          onChange={e => setOverrideForm({ ...overrideForm, start_time: e.target.value })} 
                          required 
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label className="label">End Time</label>
                      <div className="control">
                        <input 
                          className="input" 
                          type="time" 
                          value={overrideForm.end_time} 
                          onChange={e => setOverrideForm({ ...overrideForm, end_time: e.target.value })} 
                          required 
                        />
                      </div>
                    </div>
                  </>
                )}
                <div className="field">
                  <div className="control">
                    <button className="button is-success is-fullwidth" type="submit">
                      Add Override
                    </button>
                  </div>
                </div>
                <div className="field">
                  <div className="control">
                    <button className="button is-fullwidth" type="button" onClick={() => closeOverrideForm()}>
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </section>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
