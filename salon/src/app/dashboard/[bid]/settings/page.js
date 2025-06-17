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
  const [shiftTemplates, setShiftTemplates] = useState([
    { id: 1, name: 'Full Day (9:00 - 17:00) with 1h break', start_time: '09:00', end_time: '17:00', break_start: '12:00', break_end: '13:00' },
    { id: 2, name: 'Morning (9:00 - 13:00)', start_time: '09:00', end_time: '13:00', break_start: '', break_end: '' },
    { id: 3, name: 'Afternoon (13:00 - 17:00)', start_time: '13:00', end_time: '17:00', break_start: '', break_end: '' },
    { id: 4, name: 'Evening (17:00 - 21:00)', start_time: '17:00', end_time: '21:00', break_start: '', break_end: '' }
  ])
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    start_time: '',
    end_time: '',
    break_start: '',
    break_end: ''
  })

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

  function openTemplateForm(template = null) {
    if (template) {
      setEditingTemplate(template)
      setTemplateForm({
        name: template.name,
        start_time: template.start_time,
        end_time: template.end_time,
        break_start: template.break_start || '',
        break_end: template.break_end || ''
      })
    } else {
      setEditingTemplate({})
      setTemplateForm({
        name: '',
        start_time: '09:00',
        end_time: '17:00',
        break_start: '',
        break_end: ''
      })
    }
  }

  function closeTemplateForm() {
    setEditingTemplate(null)
    setTemplateForm({
      name: '',
      start_time: '',
      end_time: '',
      break_start: '',
      break_end: ''
    })
  }

  function saveTemplate() {
    if (!templateForm.name.trim() || !templateForm.start_time || !templateForm.end_time) {
      toast.error('Please fill in all required fields')
      return
    }

    const newTemplate = {
      id: (editingTemplate && editingTemplate.id) ? editingTemplate.id : Date.now(),
      name: templateForm.name.trim(),
      start_time: templateForm.start_time,
      end_time: templateForm.end_time,
      break_start: templateForm.break_start || '',
      break_end: templateForm.break_end || ''
    }

    if (editingTemplate && editingTemplate.id) {
      setShiftTemplates(prev => prev.map(t => t.id === editingTemplate.id ? newTemplate : t))
      toast.success('Template updated successfully')
    } else {
      setShiftTemplates(prev => [...prev, newTemplate])
      toast.success('Template added successfully')
    }

    closeTemplateForm()
  }

  function deleteTemplate(id) {
    if (!window.confirm('Are you sure you want to delete this template?')) return
    
    setShiftTemplates(prev => prev.filter(t => t.id !== id))
    toast.success('Template deleted successfully')
    
    if (editingTemplate && editingTemplate.id === id) {
      closeTemplateForm()
    }
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
              readOnly
              style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
            />
          </div>
          <p className="help">Salon name is read-only. Contact support to change.</p>
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
        
        <div className="is-flex is-justify-content-space-between is-align-items-center mb-4">
          <div>
            <h2 className="title is-6 mb-1">Quick Shift Templates</h2>
            <p className="has-text-grey">Manage templates used when creating shifts</p>
          </div>
          <button
            className="button is-link is-small"
            onClick={() => openTemplateForm()}
          >
            + Add Template
          </button>
        </div>
        
        <div className="field">
          {shiftTemplates.length > 0 ? (
            <div className="box" style={{ padding: '1rem' }}>
              {shiftTemplates.map((template, index) => (
                <div key={template.id}>
                  <div 
                    className="is-flex is-justify-content-space-between is-align-items-center p-2 is-clickable"
                    onClick={() => openTemplateForm(template)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div>
                      <strong className="is-block">{template.name}</strong>
                      <small className="has-text-grey">
                        {template.start_time} - {template.end_time}
                        {template.break_start && template.break_end && ` (Break: ${template.break_start} - ${template.break_end})`}
                      </small>
                    </div>
                    <div className="is-flex is-align-items-center" style={{ gap: '0.5rem' }}>
                      <button
                        className="button is-small is-ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteTemplate(template.id)
                        }}
                        title="Delete template"
                      >
                        <span className="icon is-small">
                          <i className="fas fa-trash"></i>
                        </span>
                      </button>
                      <span className="icon is-small has-text-grey-light">
                        <i className="fas fa-chevron-right"></i>
                      </span>
                    </div>
                  </div>
                  {index < shiftTemplates.length - 1 && <hr className="my-1" style={{ margin: '4px 0' }} />}
                </div>
              ))}
            </div>
          ) : (
            <div className="box has-text-centered py-4">
              <p className="has-text-grey">No templates configured yet. Add your first template to get started.</p>
            </div>
          )}
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

      {/* Template Edit Modal */}
      {editingTemplate !== null && (
        <div className="modal is-active">
          <div className="modal-background" onClick={closeTemplateForm}></div>
          <div className="modal-card">
            <header className="modal-card-head">
              <p className="modal-card-title">
                {editingTemplate && editingTemplate.id ? 'Edit Template' : 'Add Template'}
              </p>
              <button className="delete" aria-label="close" onClick={closeTemplateForm}></button>
            </header>
            <section className="modal-card-body">
              <div className="field">
                <label className="label">Template Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g., Full Day, Morning Shift"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                />
              </div>

              <div className="columns">
                <div className="column">
                  <label className="label">Start Time</label>
                  <input
                    className="input"
                    type="time"
                    value={templateForm.start_time}
                    onChange={(e) => setTemplateForm({ ...templateForm, start_time: e.target.value })}
                  />
                </div>
                <div className="column">
                  <label className="label">End Time</label>
                  <input
                    className="input"
                    type="time"
                    value={templateForm.end_time}
                    onChange={(e) => setTemplateForm({ ...templateForm, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="columns">
                <div className="column">
                  <label className="label">Break Start (Optional)</label>
                  <input
                    className="input"
                    type="time"
                    value={templateForm.break_start}
                    onChange={(e) => setTemplateForm({ ...templateForm, break_start: e.target.value })}
                  />
                </div>
                <div className="column">
                  <label className="label">Break End (Optional)</label>
                  <input
                    className="input"
                    type="time"
                    value={templateForm.break_end}
                    onChange={(e) => setTemplateForm({ ...templateForm, break_end: e.target.value })}
                  />
                </div>
              </div>

              <div className="field">
                <div className="control">
                  <button 
                    className="button is-success is-fullwidth" 
                    onClick={saveTemplate}
                  >
                    {editingTemplate && editingTemplate.id ? 'Update Template' : 'Add Template'}
                  </button>
                </div>
              </div>

              <div className="field">
                <div className="control">
                  <button 
                    className="button is-fullwidth" 
                    onClick={closeTemplateForm}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}