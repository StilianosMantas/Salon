'use client'
import { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (!bid) return
    fetchData()
  }, [bid])

  async function fetchData() {
    const { data: rulesData } = await supabase.from('business_rules').select('*').eq('business_id', bid).order('weekday')
    const { data: overridesData } = await supabase.from('business_overrides').select('*').eq('business_id', bid).order('slotdate')
    const { data: businessData } = await supabase.from('business').select('slot_length').eq('id', bid).single()
    const { data: slotsData } = await supabase.from('slot').select('slotdate').eq('business_id', bid)
    const datesSet = Array.from(new Set(slotsData?.map(s => s.slotdate)))
    setRules(rulesData || [])
    setOverrides(overridesData || [])
    setSlotLength(businessData?.slot_length || 15)
    setGeneratedDates(datesSet)
  }

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

  async function generateSlots() {
    if (!rangeStart || !rangeEnd) return alert('Please provide a valid date range')

    const start = new Date(rangeStart)
    const end = new Date(rangeEnd)

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

          const { data: existing } = await supabase
            .from('slot')
            .select('id')
            .eq('business_id', bid)
            .eq('slotdate', dateStr)
            .eq('start_time', startTime)

          if (!existing || existing.length === 0) {
            await supabase.from('slot').insert({
              business_id: bid,
              slotdate: dateStr,
              start_time: startTime,
              end_time: endTime,
              duration: slotLength
            })
          }
        }
      }
    }

    alert('Slots generated')
    fetchData()
  }

  return (
    <div className="container py-5 px-4">
      <h1 className="title is-4 mb-4">Business Open Hours</h1>

      <div className="columns mb-5">
        <div className="column is-3">
          <input className="input" type="date" value={rangeStart} onChange={e => setRangeStart(e.target.value)} />
        </div>
        <div className="column is-3">
          <input className="input" type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} />
        </div>
        <div className="column is-narrow">
          <button className="button is-info" onClick={generateSlots}>Generate Slots</button>
        </div>
      </div>

      <div className="box mb-5">
        <h2 className="subtitle is-6 mb-3">Weekly Schedule</h2>
        {weekdays.map((day, i) => (
          <div key={i} className="mb-5">
            <div className="mb-2 has-text-weight-semibold">{day}</div>
            {(rules.filter(r => r.weekday === i)).map(rule => (
              <div key={rule.id} className="columns is-vcentered mb-2">
                <div className="column is-2">
                  <input className="input is-small" style={{ maxWidth: '120px' }} type="time" value={rule.start_time || ''} readOnly />
                </div>
                <div className="column is-2">
                  <input className="input is-small" style={{ maxWidth: '120px' }} type="time" value={rule.end_time || ''} readOnly />
                </div>
                <div className="column is-narrow">
                  <button className="button is-small is-danger is-light" onClick={() => deleteRule(rule.id)}>Delete</button>
                </div>
              </div>
            ))}
            <div className="columns is-vcentered mb-2">
              <div className="column is-2">
                <input className="input is-small" style={{ maxWidth: '120px' }} type="time" value={newRanges[i]?.start_time || ''} onChange={e => handleNewRangeChange(i, 'start_time', e.target.value)} />
              </div>
              <div className="column is-2">
                <input className="input is-small" style={{ maxWidth: '120px' }} type="time" value={newRanges[i]?.end_time || ''} onChange={e => handleNewRangeChange(i, 'end_time', e.target.value)} />
              </div>
              <div className="column is-narrow">
                <button className="button is-small is-success" onClick={() => addRange(i)}>Add</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="box">
        <h2 className="subtitle is-6 mb-3">Date Overrides</h2>
        <div className="columns is-multiline is-vcentered mb-4">
          <div className="column is-3">
            <input className="input" type="date" value={dateOverride.slotdate} onChange={e => setDateOverride({ ...dateOverride, slotdate: e.target.value })} />
          </div>
          <div className="column is-2">
            <input className="input" type="time" value={dateOverride.start_time} onChange={e => setDateOverride({ ...dateOverride, start_time: e.target.value })} />
          </div>
          <div className="column is-2">
            <input className="input" type="time" value={dateOverride.end_time} onChange={e => setDateOverride({ ...dateOverride, end_time: e.target.value })} />
          </div>
          <div className="column is-narrow">
            <label className="checkbox">
              <input type="checkbox" checked={dateOverride.is_closed} onChange={e => setDateOverride({ ...dateOverride, is_closed: e.target.checked })} /> Closed
            </label>
          </div>
          <div className="column is-narrow">
            <button className="button is-success" onClick={saveOverride}>Save</button>
          </div>
        </div>
        <ul>
          {overrides.map(o => (
            <li key={o.id} className="mb-2">
              <strong>{o.slotdate}</strong>: {o.is_closed ? 'Closed' : `${o.start_time}–${o.end_time}`} 
              <button className="button is-small is-danger is-light ml-3" onClick={() => deleteOverride(o.id)}>Delete</button>
              {generatedDates.includes(o.slotdate) && <span className="tag is-info ml-2">Slots Generated</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
