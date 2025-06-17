'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useServices, useServiceMutations } from '@/hooks/useSupabaseData'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function ServicesPage() {
  const { bid } = useParams()
  const { data: services, error, isLoading } = useServices(bid)
  const { createService, updateService, deleteService, loading: mutationLoading } = useServiceMutations(bid)
  
  const [formVisible, setFormVisible] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', duration: 15, cost: '', id: null })
  const [editing, setEditing] = useState(false)
  const [initialForm, setInitialForm] = useState({ name: '', description: '', duration: 15, cost: '', id: null })
  const [isClosing, setIsClosing] = useState(false)

  // Add mobile header button
  useEffect(() => {
    const placeholder = document.getElementById('mobile-add-button-placeholder')
    if (placeholder) {
      placeholder.innerHTML = `
        <button class="button is-rounded is-ghost" onclick="document.querySelector('[data-add-service]').click()" style="width: 40px; height: 40px; padding: 0;">
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

  function isFormDirty(current, initial) {
    return (
      current.name.trim() !== initial.name.trim() ||
      (current.description || '').trim() !== (initial.description || '').trim() ||
      current.duration !== initial.duration ||
      (current.cost || '') !== (initial.cost || '')
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Name is required')
    if (form.duration <= 0) return toast.error('Duration must be positive')
    if (form.cost && isNaN(form.cost)) return toast.error('Cost must be a number')

    try {
      if (editing) {
        await updateService({ id: form.id, name: form.name, description: form.description, duration: form.duration, cost: form.cost })
      } else {
        await createService({ name: form.name, description: form.description, duration: form.duration, cost: form.cost })
      }
      closeForm(true)
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  }

  function handleEdit(service) {
    const copy = { ...service }
    setForm(copy)
    setInitialForm(copy)
    setEditing(true)
    setFormVisible(true)
  }

  async function handleDelete(id) {
    const confirmDelete = window.confirm('Are you sure you want to delete this service?')
    if (!confirmDelete) return
    
    try {
      await deleteService(id)
      closeForm(true) // Auto-close form after successful deletion
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  }

  function closeForm(force = false) {
    if (!force && isFormDirty(form, initialForm)) {
      const confirmDiscard = window.confirm('You have unsaved changes. Discard them?')
      if (!confirmDiscard) return
    }
    
    setIsClosing(true)
    setTimeout(() => {
      setForm({ name: '', description: '', duration: 15, cost: '', id: null })
      setInitialForm({ name: '', description: '', duration: 15, cost: '', id: null })
      setEditing(false)
      setFormVisible(false)
      setIsClosing(false)
    }, 300)
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading services..." />
  }

  if (error) {
    return (
      <div className="container py-5 px-4">
        <div className="notification is-danger">
          <h2 className="title is-4">Unable to Load Services</h2>
          <p>There was an error loading the services list. Please try again.</p>
          <button className="button is-light mt-3" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    )
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
    <div className="container py-5 px-4" style={{ fontSize: '1.1em' }}>
      <div className="is-flex is-justify-content-end mb-4">
        <button 
          className="button is-link is-hidden-mobile" 
          data-add-service
          onClick={() => {
            setEditing(false)
            const empty = { name: '', description: '', duration: 15, cost: '', id: null }
            setForm({ ...empty })
            setInitialForm({ ...empty })
            setFormVisible(true)
          }}
          disabled={mutationLoading}
        >
          + Add Service
        </button>
      </div>
      <div className="box" style={{ margin: '0 -0.75rem', fontSize: '1.1em', marginBottom: '20px' }}>
        {services && services.length > 0 ? services.map((s, index) => (
          <div key={s.id}>
            <div 
              className="is-flex is-justify-content-space-between is-align-items-center p-1 is-clickable" 
              onClick={() => handleEdit(s)}
              style={{ cursor: 'pointer' }}
            >
              <div>
                <strong className="is-block" style={{ fontSize: '1.1em' }}>{s.name}</strong>
                {s.description && <small className="is-block has-text-grey" style={{ fontSize: '0.9em' }}>{s.description}</small>}
                <span className="is-block has-text-info" style={{ fontSize: '0.9em' }}>{s.duration} min - {s.cost ? `${s.cost}€` : 'Free'}</span>
              </div>
              <div>
                <span className="icon is-small has-text-grey-light">
                  <i className="fas fa-chevron-right" style={{ fontSize: '0.875rem' }}></i>
                </span>
              </div>
            </div>
            {index < services.length - 1 && <hr className="my-2" style={{ margin: '8px 0', borderColor: '#e5e5e5' }} />}
          </div>
        )) : (
          <div className="has-text-centered py-4">
            <p className="has-text-grey">No services found. Add your first service to get started.</p>
          </div>
        )}
      </div>

      {formVisible && (
        <div className="modal is-active">
          <div className="modal-background" onClick={() => closeForm()}></div>
          <div className="modal-card" style={{ 
            animation: isClosing ? 'slideOutToRight 0.3s ease-in' : 'slideInFromRight 0.3s ease-out', 
            transformOrigin: 'center right' 
          }}>
            <header className="modal-card-head">
              <p className="modal-card-title">{editing ? 'Edit Service' : 'Add Service'}</p>
              <button className="delete" aria-label="close" onClick={() => closeForm()}></button>
            </header>
            <section className="modal-card-body">
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label className="label">Name</label>
                  <div className="control">
                    <input className="input" type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                </div>
                <div className="field">
                  <label className="label">Description</label>
                  <div className="control">
                    <input className="input" type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                </div>
                <div className="field">
                  <label className="label">Duration (min)</label>
                  <div className="control">
                    <input className="input" type="number" value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) })} />
                  </div>
                </div>
                <div className="field">
                  <label className="label">Cost (€)</label>
                  <div className="control">
                    <input className="input" type="text" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />
                  </div>
                </div>
                <div className="field">
                  <div className="control">
                    <button 
                      className={`button is-success is-fullwidth ${mutationLoading ? 'is-loading' : ''}`} 
                      type="submit"
                      disabled={mutationLoading || (editing && !isFormDirty(form, initialForm))}
                    >
                      {editing ? 'Update' : 'Add'}
                    </button>
                  </div>
                </div>
                <div className="field">
                  <div className="control">
                    <button 
                      className="button is-fullwidth" 
                      type="button" 
                      onClick={() => closeForm()}
                      disabled={mutationLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                {editing && (
                  <div className="field">
                    <div className="control">
                      <button 
                        className="button is-danger is-fullwidth" 
                        type="button" 
                        onClick={() => handleDelete(form.id)}
                        disabled={mutationLoading}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </section>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
