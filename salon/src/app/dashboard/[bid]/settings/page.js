'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useShiftTemplates, useShiftTemplateMutations, useBusinessMutations } from '@/hooks/useSupabaseData'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'
import { isImageFile, isValidFileSize } from '@/utils/imageUtils'

export default function SettingsPage() {
  const { bid } = useParams()
  const [settings, setSettings] = useState({
    salon_name: '',
    slot_length: 15,
    chairs_count: 1,
    advance_booking_days: 30,
    cancellation_hours: 24,
    avatar_url: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [initialSettings, setInitialSettings] = useState({})
  
  // Use database-backed shift templates
  const { data: shiftTemplates, error: templatesError, isLoading: templatesLoading } = useShiftTemplates(bid)
  const { createShiftTemplate, updateShiftTemplate, deleteShiftTemplate, loading: templateMutationLoading } = useShiftTemplateMutations(bid)
  
  // Business avatar functionality
  const { uploadBusinessAvatar, deleteBusinessAvatar, loading: avatarLoading } = useBusinessMutations(bid)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  
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
      // Try to get avatar_url, but fall back if column doesn't exist
      let query = 'salon_name, slot_length, chairs_count, advance_booking_days, cancellation_hours'
      
      // Check if avatar_url column exists by trying to select it
      const testQuery = await supabase
        .from('business')
        .select('avatar_url')
        .eq('id', bid)
        .limit(1)
      
      // If avatar_url column exists, include it in the main query
      if (!testQuery.error) {
        query += ', avatar_url'
      }
      
      const { data, error } = await supabase
        .from('business')
        .select(query)
        .eq('id', bid)
        .single()

      if (error) throw error

      const settingsData = {
        salon_name: data.salon_name || '',
        slot_length: data.slot_length || 15,
        chairs_count: data.chairs_count || 1,
        advance_booking_days: data.advance_booking_days || 30,
        cancellation_hours: data.cancellation_hours || 24,
        avatar_url: data.avatar_url || ''
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
      // Prepare update object
      const updateData = {
        salon_name: settings.salon_name,
        slot_length: settings.slot_length,
        chairs_count: settings.chairs_count,
        advance_booking_days: settings.advance_booking_days,
        cancellation_hours: settings.cancellation_hours
      }
      
      // Only include avatar_url if the column exists
      const testQuery = await supabase
        .from('business')
        .select('avatar_url')
        .eq('id', bid)
        .limit(1)
      
      if (!testQuery.error) {
        updateData.avatar_url = settings.avatar_url
      }
      
      const { error } = await supabase
        .from('business')
        .update(updateData)
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
      settings.cancellation_hours !== initialSettings.cancellation_hours ||
      settings.avatar_url !== initialSettings.avatar_url
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

  async function saveTemplate() {
    if (!templateForm.name.trim() || !templateForm.start_time || !templateForm.end_time) {
      toast.error('Please fill in all required fields')
      return
    }

    const templateData = {
      name: templateForm.name.trim(),
      start_time: templateForm.start_time,
      end_time: templateForm.end_time,
      break_start: templateForm.break_start || null,
      break_end: templateForm.break_end || null
    }

    try {
      if (editingTemplate && editingTemplate.id) {
        await updateShiftTemplate({ id: editingTemplate.id, ...templateData })
      } else {
        await createShiftTemplate(templateData)
      }
      closeTemplateForm()
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  }

  async function deleteTemplate(id) {
    if (!window.confirm('Are you sure you want to delete this template?')) return
    
    try {
      await deleteShiftTemplate(id)
      
      if (editingTemplate && editingTemplate.id === id) {
        closeTemplateForm()
      }
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  }

  // Avatar handling functions
  function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return

    if (!isImageFile(file)) {
      toast.error('Please select a valid image file')
      return
    }

    if (!isValidFileSize(file, 10)) {
      toast.error('File size must be less than 10MB')
      return
    }

    setAvatarFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target.result)
    }
    reader.readAsDataURL(file)
  }

  async function handleAvatarUpload() {
    if (!avatarFile) return
    
    try {
      const result = await uploadBusinessAvatar(avatarFile)
      setSettings({ ...settings, avatar_url: result.avatar_url })
      setAvatarFile(null)
      setAvatarPreview(null)
    } catch (error) {
      // Error handled in hook
    }
  }

  async function handleAvatarDelete() {
    if (!settings.avatar_url) return
    
    if (!window.confirm('Are you sure you want to remove the salon logo?')) return
    
    try {
      await deleteBusinessAvatar(settings.avatar_url)
      setSettings({ ...settings, avatar_url: '' })
      setAvatarFile(null)
      setAvatarPreview(null)
    } catch (error) {
      // Error handled in hook
    }
  }

  if (loading || templatesLoading) {
    return <LoadingSpinner message="Loading settings..." />
  }

  if (templatesError) {
    return (
      <div className="notification is-danger">
        <p>Error loading shift templates: {templatesError.message}</p>
      </div>
    )
  }

  return (
    <div className="container py-2 px-2" style={{ fontSize: '1.1em', paddingTop: '0.5rem' }}>
      <div className="box extended-card" style={{ 
        margin: '0 -0.75rem', 
        fontSize: '1.1em', 
        marginTop: '0.75rem'
      }}>
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
          <label className="label">Salon Logo</label>
          <div className="is-flex is-align-items-center mb-3">
            {(avatarPreview || settings.avatar_url) && (
              <figure className="image is-64x64 mr-3">
                <img 
                  className="is-rounded" 
                  src={avatarPreview || settings.avatar_url} 
                  alt="Salon logo preview"
                  style={{ objectFit: 'cover' }}
                />
              </figure>
            )}
            <div className="file">
              <label className="file-label">
                <input 
                  className="file-input" 
                  type="file" 
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={avatarLoading}
                />
                <span className="file-cta">
                  <span className="file-icon">
                    <i className="fas fa-upload"></i>
                  </span>
                  <span className="file-label">Choose logo</span>
                </span>
              </label>
            </div>
          </div>
          
          {avatarFile && (
            <div className="field is-grouped">
              <div className="control">
                <button
                  className={`button is-success is-small ${avatarLoading ? 'is-loading' : ''}`}
                  onClick={handleAvatarUpload}
                  disabled={avatarLoading}
                >
                  Upload Logo
                </button>
              </div>
              <div className="control">
                <button
                  className="button is-small"
                  onClick={() => {
                    setAvatarFile(null)
                    setAvatarPreview(null)
                  }}
                  disabled={avatarLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {settings.avatar_url && !avatarFile && (
            <div className="field">
              <div className="control">
                <button
                  className={`button is-danger is-small ${avatarLoading ? 'is-loading' : ''}`}
                  onClick={handleAvatarDelete}
                  disabled={avatarLoading}
                >
                  Remove Logo
                </button>
              </div>
            </div>
          )}
          
          <p className="help">Upload a logo for your salon. Recommended size: 300x300px</p>
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
                      <strong className="is-block" style={{ fontSize: '0.85em' }}>{template.name}</strong>
                      <div className="has-text-grey" style={{ fontSize: '0.75em' }}>
                        {template.start_time} - {template.end_time}
                        {template.break_start && template.break_end && ` (Break: ${template.break_start} - ${template.break_end})`}
                      </div>
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
              disabled={saving || avatarLoading || !isFormDirty()}
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