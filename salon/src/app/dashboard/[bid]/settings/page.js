'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { bid } = useParams()
  const [settings, setSettings] = useState({
    salon_name: '',
    slot_length: 15,
    chairs_count: 1,
    advance_booking_days: 30,
    cancellation_hours: 24
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [initialSettings, setInitialSettings] = useState({})

  // Add mobile header button
  useEffect(() => {
    const placeholder = document.getElementById('mobile-add-button-placeholder')
    if (placeholder) {
      placeholder.innerHTML = ''
    }
  }, [])

  useEffect(() => {
    if (!bid) return
    fetchSettings()
  }, [bid])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('business')
        .select('salon_name, slot_length, chairs_count, advance_booking_days, cancellation_hours')
        .eq('id', bid)
        .single()

      if (error) throw error

      const settingsData = {
        salon_name: data.salon_name || '',
        slot_length: data.slot_length || 15,
        chairs_count: data.chairs_count || 1,
        advance_booking_days: data.advance_booking_days || 30,
        cancellation_hours: data.cancellation_hours || 24
      }

      setSettings(settingsData)
      setInitialSettings(settingsData)
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('business')
        .update({
          salon_name: settings.salon_name,
          slot_length: settings.slot_length,
          chairs_count: settings.chairs_count,
          advance_booking_days: settings.advance_booking_days,
          cancellation_hours: settings.cancellation_hours
        })
        .eq('id', bid)

      if (error) throw error

      setInitialSettings(settings)
      toast.success('Settings saved successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  function isFormDirty() {
    return (
      settings.salon_name !== initialSettings.salon_name ||
      settings.slot_length !== initialSettings.slot_length ||
      settings.chairs_count !== initialSettings.chairs_count ||
      settings.advance_booking_days !== initialSettings.advance_booking_days ||
      settings.cancellation_hours !== initialSettings.cancellation_hours
    )
  }

  function resetForm() {
    setSettings(initialSettings)
  }

  if (loading) {
    return <LoadingSpinner message="Loading settings..." />
  }

  return (
    <div className="container py-2 px-2" style={{ fontSize: '1.1em', paddingTop: '0.5rem' }}>
      <div className="box" style={{ margin: '0 -0.75rem', fontSize: '1.1em', marginTop: '0.75rem' }}>
        <h1 className="title is-5 mb-4">Salon Settings</h1>
        
        <div className="field">
          <label className="label">Salon Name</label>
          <div className="control">
            <input
              className="input"
              type="text"
              placeholder="Enter salon name"
              value={settings.salon_name}
              onChange={(e) => setSettings({ ...settings, salon_name: e.target.value })}
            />
          </div>
        </div>

        <div className="field">
          <label className="label">Default Appointment Slot Length (minutes)</label>
          <div className="control">
            <div className="select is-fullwidth">
              <select
                value={settings.slot_length}
                onChange={(e) => setSettings({ ...settings, slot_length: parseInt(e.target.value) })}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>
          </div>
          <p className="help">This sets the default time slots for appointments</p>
        </div>

        <div className="field">
          <label className="label">Number of Chairs/Stations</label>
          <div className="control">
            <input
              className="input"
              type="number"
              min="1"
              max="20"
              value={settings.chairs_count}
              onChange={(e) => setSettings({ ...settings, chairs_count: parseInt(e.target.value) || 1 })}
            />
          </div>
          <p className="help">How many chairs or stations are available for appointments</p>
        </div>

        <div className="field">
          <label className="label">Advance Booking (days)</label>
          <div className="control">
            <input
              className="input"
              type="number"
              min="1"
              max="365"
              value={settings.advance_booking_days}
              onChange={(e) => setSettings({ ...settings, advance_booking_days: parseInt(e.target.value) || 30 })}
            />
          </div>
          <p className="help">How many days in advance customers can book appointments</p>
        </div>

        <div className="field">
          <label className="label">Cancellation Notice (hours)</label>
          <div className="control">
            <input
              className="input"
              type="number"
              min="1"
              max="168"
              value={settings.cancellation_hours}
              onChange={(e) => setSettings({ ...settings, cancellation_hours: parseInt(e.target.value) || 24 })}
            />
          </div>
          <p className="help">Minimum hours notice required to cancel an appointment</p>
        </div>

        <hr className="my-5" />
        
        <h2 className="title is-6 mb-4">Quick Shift Templates</h2>
        <p className="mb-4 has-text-grey">Use these templates when creating shifts to save time</p>
        
        <div className="field">
          <label className="label">Available Templates</label>
          <div className="buttons are-small">
            <button
              type="button"
              className="button is-light"
              disabled
            >
              Full Day (9:00 - 17:00) with 1h break
            </button>
            <button
              type="button"
              className="button is-light"
              disabled
            >
              Morning (9:00 - 13:00)
            </button>
            <button
              type="button"
              className="button is-light"
              disabled
            >
              Afternoon (13:00 - 17:00)
            </button>
            <button
              type="button"
              className="button is-light"
              disabled
            >
              Evening (17:00 - 21:00)
            </button>
          </div>
          <p className="help">These templates are used in the Shifts page when creating new shifts</p>
        </div>

        <div className="field is-grouped">
          <div className="control">
            <button
              className={`button is-success ${saving ? 'is-loading' : ''}`}
              onClick={saveSettings}
              disabled={saving || !isFormDirty()}
            >
              Save Settings
            </button>
          </div>
          {isFormDirty() && (
            <div className="control">
              <button
                className="button"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}