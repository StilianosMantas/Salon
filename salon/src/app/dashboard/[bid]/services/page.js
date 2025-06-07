'use client'

import { useState } from 'react'
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
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  }

  function closeForm(force = false) {
    if (!force && isFormDirty(form, initialForm)) {
      const confirmDiscard = window.confirm('You have unsaved changes. Discard them?')
      if (!confirmDiscard) return
    }
    setForm({ name: '', description: '', duration: 15, cost: '', id: null })
    setInitialForm({ name: '', description: '', duration: 15, cost: '', id: null })
    setEditing(false)
    setFormVisible(false)
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
    <div className="container py-5 px-4">
      <div className="is-flex is-justify-content-space-between is-align-items-center mb-5">
        <h1 className="title is-4">Services</h1>
        <button 
          className="button is-link" 
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
      <div className="box">
        {services && services.length > 0 ? services.map((s, index) => (
          <div key={s.id}>
            <div className="is-flex is-justify-content-space-between is-align-items-center py-2 px-3">
              <div>
                <strong>{s.name}</strong><br />
                <small>{s.description}</small><br />
                <span>{s.duration} min - {s.cost ? `${s.cost}€` : 'Free'}</span>
              </div>
              <div>
                <button 
                  className="button is-small is-info mr-2" 
                  onClick={() => handleEdit(s)}
                  disabled={mutationLoading}
                >
                  Edit
                </button>
                <button 
                  className="button is-small is-danger" 
                  onClick={() => handleDelete(s.id)}
                  disabled={mutationLoading}
                >
                  Delete
                </button>
              </div>
            </div>
            {index < services.length - 1 && <hr className="my-2" />}
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
          <div className="modal-card">
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
                <footer className="modal-card-foot">
                  <button 
                    className={`button is-success ${mutationLoading ? 'is-loading' : ''}`} 
                    type="submit"
                    disabled={mutationLoading}
                  >
                    {editing ? 'Update' : 'Add'}
                  </button>
                  <button 
                    className="button" 
                    type="button" 
                    onClick={() => closeForm()}
                    disabled={mutationLoading}
                  >
                    Cancel
                  </button>
                </footer>
              </form>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
