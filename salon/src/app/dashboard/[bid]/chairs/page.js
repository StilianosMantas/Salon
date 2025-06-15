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
    fetchChairs()
  }, [fetchChairs])

  async function saveChair() {
    setSaving(true)
    try {
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

        <div className="box" style={{ margin: '0 -0.75rem', fontSize: '1.1em', marginTop: '0.75rem' }}>
          {chairs && chairs.length > 0 ? (
            <div className="table-container">
              <table className="table is-fullwidth is-hoverable">
                <thead>
                  <tr>
                    <th>Color</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {chairs.map(chair => (
                    <tr key={chair.id} className={!chair.is_active ? 'has-text-grey' : ''}>
                      <td>
                        <div 
                          className="box p-2"
                          style={{ 
                            backgroundColor: chair.color, 
                            width: '30px', 
                            height: '30px',
                            minWidth: '30px'
                          }}
                        ></div>
                      </td>
                      <td className="has-text-weight-semibold">
                        {chair.name}
                        {!chair.is_active && (
                          <span className="tag is-light ml-2">Inactive</span>
                        )}
                      </td>
                      <td>{chair.description || <span className="has-text-grey">No description</span>}</td>
                      <td>
                        <button
                          className={`button is-small ${chair.is_active ? 'is-success' : 'is-warning'}`}
                          onClick={() => toggleChairStatus(chair.id, chair.is_active)}
                        >
                          {chair.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td>
                        <div className="buttons">
                          <button
                            className="button is-small is-info"
                            onClick={() => openEditForm(chair)}
                          >
                            <span className="icon">
                              <i className="fas fa-edit"></i>
                            </span>
                          </button>
                          <button
                            className="button is-small has-text-danger"
                            onClick={() => deleteChair(chair.id, chair.name)}
                            style={{ backgroundColor: 'white', borderColor: '#ff3860', color: '#ff3860' }}
                          >
                            <span className="icon">
                              <i className="fas fa-trash"></i>
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="has-text-centered py-4">
              <p className="has-text-grey mb-3">No chairs configured yet.</p>
              <button className="button is-link" onClick={openAddForm}>
                Add Your First Chair
              </button>
            </div>
          )}
        </div>

        {/* Database Schema Information */}
        <div className="box" style={{ margin: '0 -0.75rem', fontSize: '1em', marginTop: '1rem', backgroundColor: '#f8f9fa' }}>
          <h2 className="title is-6 mb-3">Database Schema Requirements</h2>
          <div className="content">
            <p className="mb-3">To support multiple chairs, the following database changes are needed:</p>
            
            <h3 className="subtitle is-6">1. Create Chairs Table</h3>
            <pre className="has-background-white p-3 mb-3" style={{ fontSize: '0.85rem' }}>
{`CREATE TABLE chairs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES business(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3273dc',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);`}
            </pre>

            <h3 className="subtitle is-6">2. Add Chair Reference to Appointments</h3>
            <pre className="has-background-white p-3 mb-3" style={{ fontSize: '0.85rem' }}>
{`ALTER TABLE appointment 
ADD COLUMN chair_id UUID REFERENCES chairs(id);

-- Optional: Add index for better performance
CREATE INDEX idx_appointment_chair_id ON appointment(chair_id);`}
            </pre>

            <h3 className="subtitle is-6">3. Add Chair Reference to Slots</h3>
            <pre className="has-background-white p-3" style={{ fontSize: '0.85rem' }}>
{`ALTER TABLE slot 
ADD COLUMN chair_id UUID REFERENCES chairs(id);

-- Optional: Add index for better performance
CREATE INDEX idx_slot_chair_id ON slot(chair_id);`}
            </pre>

            <div className="notification is-info mt-4">
              <p><strong>Note:</strong> After implementing these database changes, you&apos;ll need to:</p>
              <ul>
                <li>Update appointment booking logic to consider chair availability</li>
                <li>Modify slot generation to create slots per chair</li>
                <li>Update the appointments view to show chair assignments</li>
                <li>Add chair selection to appointment forms</li>
              </ul>
            </div>
          </div>
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
              </section>
            </div>
          </div>
        )}
      </div>
    </>
  )
}