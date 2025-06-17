'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function ChairsPage() {
  const { bid } = useParams()
  const [chairs, setChairs] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formVisible, setFormVisible] = useState(false)
  const [editingChair, setEditingChair] = useState(null)
  const [maxChairs, setMaxChairs] = useState(20)
  const [chairForm, setChairForm] = useState({
    name: '',
    description: '',
    color: '#3273dc',
    is_active: true
  })
  const [isClosing, setIsClosing] = useState(false)

  // Add mobile header button
  useEffect(() => {
    const placeholder = document.getElementById('mobile-add-button-placeholder')
    if (placeholder) {
      placeholder.innerHTML = `
        <button class="button is-rounded is-ghost" onclick="document.querySelector('[data-add-chair]').click()" style="width: 40px; height: 40px; padding: 0;">
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

  // Fetch max chairs setting
  const fetchMaxChairs = useCallback(async () => {
    if (!bid) return
    
    try {
      const { data, error } = await supabase
        .from('business')
        .select('chairs_count')
        .eq('id', bid)
        .single()

      if (error) throw error
      setMaxChairs(data.chairs_count || 20)
    } catch (error) {
      console.error('Error fetching max chairs:', error)
      setMaxChairs(20) // Default fallback
    }
  }, [bid])

  const fetchChairs = useCallback(async () => {
    if (!bid) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('chairs')
        .select('*')
        .eq('business_id', bid)
        .order('name')

      if (error) throw error
      setChairs(data || [])
    } catch (error) {
      console.error('Error fetching chairs:', error)
      toast.error('Failed to load chairs')
    } finally {
      setLoading(false)
    }
  }, [bid])

  useEffect(() => {
    fetchMaxChairs()
    fetchChairs()
  }, [fetchMaxChairs, fetchChairs])

  async function saveChair() {
    setSaving(true)
    try {
      // Validate max chairs limit when adding new chair
      if (!editingChair && chairs.length >= maxChairs) {
        toast.error(`Maximum number of chairs (${maxChairs}) reached. Update the limit in Settings if needed.`)
        setSaving(false)
        return
      }

      const chairData = {
        business_id: bid,
        name: chairForm.name.trim(),
        description: chairForm.description?.trim() || null,
        color: chairForm.color,
        is_active: chairForm.is_active
      }

      if (editingChair) {
        const { error } = await supabase
          .from('chairs')
          .update(chairData)
          .eq('id', editingChair.id)
        
        if (error) throw error
        toast.success('Chair updated successfully')
      } else {
        const { error } = await supabase
          .from('chairs')
          .insert(chairData)
        
        if (error) throw error
        toast.success('Chair created successfully')
      }

      closeForm()
      fetchChairs()
    } catch (error) {
      console.error('Error saving chair:', error)
      toast.error(`Failed to ${editingChair ? 'update' : 'create'} chair: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function deleteChair(id, chairName) {
    if (!window.confirm(`Are you sure you want to delete "${chairName}"? This cannot be undone.`)) return

    try {
      // Check if chair has any appointments
      const { data: appointments, error: appointmentError } = await supabase
        .from('appointment')
        .select('id')
        .eq('chair_id', id)
        .limit(1)

      if (appointmentError) throw appointmentError

      if (appointments && appointments.length > 0) {
        toast.error('Cannot delete chair with existing appointments. Mark as inactive instead.')
        return
      }

      const { error } = await supabase
        .from('chairs')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast.success('Chair deleted successfully')
      closeForm() // Auto-close form after successful deletion
      fetchChairs()
    } catch (error) {
      console.error('Error deleting chair:', error)
      toast.error('Failed to delete chair')
    }
  }

  async function toggleChairStatus(id, currentStatus) {
    try {
      const { error } = await supabase
        .from('chairs')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error
      
      toast.success(`Chair ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
      fetchChairs()
    } catch (error) {
      console.error('Error updating chair status:', error)
      toast.error('Failed to update chair status')
    }
  }

  function openAddForm() {
    setEditingChair(null)
    setChairForm({
      name: '',
      description: '',
      color: '#3273dc',
      is_active: true
    })
    setFormVisible(true)
  }

  function openEditForm(chair) {
    setEditingChair(chair)
    setChairForm({
      name: chair.name,
      description: chair.description || '',
      color: chair.color,
      is_active: chair.is_active
    })
    setFormVisible(true)
  }

  function closeForm() {
    setIsClosing(true)
    setTimeout(() => {
      setFormVisible(false)
      setEditingChair(null)
      setIsClosing(false)
    }, 300)
  }

  if (loading) {
    return <LoadingSpinner message="Loading chairs..." />
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
      
      <div className="container py-2 px-2" style={{ fontSize: '1.1em', paddingTop: '0.5rem' }}>
        <div className="is-flex is-justify-content-space-between is-align-items-center mb-4 is-hidden-mobile">
          <h1 className="title is-5">Chairs & Stations</h1>
          <button
            className="button is-link"
            data-add-chair
            onClick={openAddForm}
          >
            + Add Chair
          </button>
        </div>

        <div className="box" style={{ margin: '0 -0.75rem', fontSize: '1.1em', marginBottom: '20px', marginTop: '0.75rem' }}>
          {chairs && chairs.length > 0 ? chairs.map((chair, index) => (
            <div key={chair.id}>
              <div 
                className="is-flex is-justify-content-space-between is-align-items-center p-1 is-clickable" 
                onClick={() => openEditForm(chair)}
                style={{ cursor: 'pointer' }}
              >
                <div className="is-flex is-align-items-center" style={{ gap: '1rem' }}>
                  <div 
                    className="box p-2"
                    style={{ 
                      backgroundColor: chair.color, 
                      width: '24px', 
                      height: '24px',
                      minWidth: '24px',
                      margin: 0
                    }}
                  ></div>
                  <div>
                    <strong className="is-block" style={{ fontSize: '1.1em' }}>
                      {chair.name}
                      {!chair.is_active && (
                        <span className="tag is-light ml-2 is-small">Inactive</span>
                      )}
                    </strong>
                    {chair.description && <small className="is-block has-text-grey" style={{ fontSize: '0.9em' }}>{chair.description}</small>}
                  </div>
                </div>
                <div>
                  <span className="icon is-small has-text-grey-light">
                    <i className="fas fa-chevron-right" style={{ fontSize: '0.875rem' }}></i>
                  </span>
                </div>
              </div>
              {index < chairs.length - 1 && <hr className="my-2" style={{ margin: '8px 0', borderColor: '#e5e5e5' }} />}
            </div>
          )) : (
            <div className="has-text-centered py-4">
              <p className="has-text-grey">{chairs?.length === 0 ? 'No chairs configured yet. Add your first chair to get started.' : 'Loading chairs...'}</p>
            </div>
          )}
        </div>


        {/* Chair Form Modal */}
        {formVisible && (
          <div className="modal is-active">
            <div className="modal-background" onClick={closeForm}></div>
            <div className="modal-card" style={{ 
              animation: isClosing ? 'slideOutToRight 0.3s ease-in' : 'slideInFromRight 0.3s ease-out', 
              transformOrigin: 'center right' 
            }}>
              <header className="modal-card-head">
                <p className="modal-card-title">
                  {editingChair ? 'Edit Chair' : 'Add Chair'}
                </p>
                <button className="delete" aria-label="close" onClick={closeForm}></button>
              </header>
              <section className="modal-card-body">
                <div className="field">
                  <label className="label">Chair Name</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="e.g., Chair 1, Station A, VIP Suite"
                    value={chairForm.name}
                    onChange={(e) => setChairForm({ ...chairForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="field">
                  <label className="label">Description (Optional)</label>
                  <textarea
                    className="textarea"
                    placeholder="Additional details about this chair/station..."
                    value={chairForm.description}
                    onChange={(e) => setChairForm({ ...chairForm, description: e.target.value })}
                    rows="2"
                  />
                </div>

                <div className="field">
                  <label className="label">Color</label>
                  <div className="is-flex is-align-items-center" style={{ gap: '1rem' }}>
                    <input
                      className="input"
                      type="color"
                      value={chairForm.color}
                      onChange={(e) => setChairForm({ ...chairForm, color: e.target.value })}
                      style={{ width: '60px', height: '40px', padding: '4px' }}
                    />
                    <span className="has-text-grey">Used for visual identification in schedules</span>
                  </div>
                </div>

                <div className="field">
                  <div className="control">
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={chairForm.is_active}
                        onChange={(e) => setChairForm({ ...chairForm, is_active: e.target.checked })}
                      />
                      {' '}Active (available for bookings)
                    </label>
                  </div>
                </div>

                <div className="field">
                  <div className="control">
                    <button 
                      className={`button is-success is-fullwidth ${saving ? 'is-loading' : ''}`} 
                      onClick={saveChair}
                      disabled={saving || !chairForm.name.trim()}
                    >
                      {editingChair ? 'Update Chair' : 'Add Chair'}
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
                
                {editingChair && (
                  <>
                    <div className="field">
                      <div className="control">
                        <button 
                          className={`button is-fullwidth ${chairForm.is_active ? 'is-warning' : 'is-success'}`}
                          onClick={() => toggleChairStatus(editingChair.id, editingChair.is_active)}
                          disabled={saving}
                        >
                          {chairForm.is_active ? 'Deactivate Chair' : 'Activate Chair'}
                        </button>
                      </div>
                    </div>
                    <div className="field">
                      <div className="control">
                        <button 
                          className="button is-fullwidth has-text-danger" 
                          onClick={() => deleteChair(editingChair.id, editingChair.name)}
                          disabled={saving}
                          style={{ backgroundColor: 'white', borderColor: '#ff3860', color: '#ff3860' }}
                        >
                          Delete Chair
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </>
  )
}