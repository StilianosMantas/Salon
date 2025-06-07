'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useStaff, useStaffMutations } from '@/hooks/useSupabaseData'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function StaffPage() {
  const { bid } = useParams()
  const { data: staff, error, isLoading } = useStaff(bid)
  const { createStaff, updateStaff, deleteStaff, loading: mutationLoading } = useStaffMutations(bid)
  
  const [formVisible, setFormVisible] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', id: null })
  const [editing, setEditing] = useState(false)
  const [initialForm, setInitialForm] = useState({ name: '', email: '', id: null })

  function isFormDirty(current, initial) {
    return (
      current.name.trim() !== initial.name.trim() ||
      (current.email || '').trim() !== (initial.email || '').trim()
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Name is required')
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return toast.error('Invalid email')

    try {
      if (editing) {
        await updateStaff({ id: form.id, name: form.name, email: form.email })
      } else {
        await createStaff({ name: form.name, email: form.email })
      }
      closeForm(true)
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  }

  function handleEdit(member) {
    const copy = { ...member }
    setForm(copy)
    setInitialForm(copy)
    setEditing(true)
    setFormVisible(true)
  }

  async function handleDelete(id) {
    const confirmDelete = window.confirm('Are you sure you want to delete this staff member?')
    if (!confirmDelete) return
    
    try {
      await deleteStaff(id)
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  }

  function closeForm(force = false) {
    if (!force && isFormDirty(form, initialForm)) {
      const confirmDiscard = window.confirm('You have unsaved changes. Discard them?')
      if (!confirmDiscard) return
    }
    setForm({ name: '', email: '', id: null })
    setInitialForm({ name: '', email: '', id: null })
    setEditing(false)
    setFormVisible(false)
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading staff..." />
  }

  if (error) {
    return (
      <div className="container py-5 px-4">
        <div className="notification is-danger">
          <h2 className="title is-4">Unable to Load Staff</h2>
          <p className="mb-3">We couldn&apos;t load your staff list. This might be due to a connection issue or temporary server problem.</p>
          <div className="content">
            <p><strong>What you can try:</strong></p>
            <ul>
              <li>Check your internet connection</li>
              <li>Refresh the page using the button below</li>
              <li>If the problem persists, please contact support</li>
            </ul>
          </div>
          <button className="button is-primary mt-3" onClick={() => window.location.reload()}>
            <span className="icon">
              <i className="fas fa-redo"></i>
            </span>
            <span>Refresh Page</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-5 px-4">
      <div className="is-flex is-justify-content-space-between is-align-items-center mb-5">
        <h1 className="title is-4">Staff</h1>
        <button 
          className="button is-link" 
          onClick={() => {
            setEditing(false)
            const empty = { name: '', email: '', id: null }
            setForm({ ...empty })
            setInitialForm({ ...empty })
            setFormVisible(true)
          }}
          disabled={mutationLoading}
        >
          + Add Staff
        </button>
      </div>
      <div className="box">
        {staff && staff.length > 0 ? staff.map((s, index) => (
          <div key={s.id}>
            <div className="is-flex is-justify-content-space-between is-align-items-center py-2 px-3">
              <div>
                <strong>{s.name}</strong><br />
                <small>{s.email}</small>
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
            {index < staff.length - 1 && <hr className="my-2" />}
          </div>
        )) : (
          <div className="has-text-centered py-4">
            <p className="has-text-grey">No staff members found. Add your first staff member to get started.</p>
          </div>
        )}
      </div>

      {formVisible && (
        <div className="modal is-active">
          <div className="modal-background" onClick={() => closeForm()}></div>
          <div className="modal-card">
            <header className="modal-card-head">
              <p className="modal-card-title">{editing ? 'Edit Staff' : 'Add Staff'}</p>
              <button className="delete" aria-label="close" onClick={() => closeForm()}></button>
            </header>
            <section className="modal-card-body">
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label className="label">Name</label>
                  <div className="control">
                    <input className="input" type="text" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                </div>
                <div className="field">
                  <label className="label">Email</label>
                  <div className="control">
                    <input className="input" type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
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
