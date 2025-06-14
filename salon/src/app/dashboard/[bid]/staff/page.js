'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useStaff, useStaffMutations } from '@/hooks/useSupabaseData'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function StaffPage() {
  const { bid } = useParams()
  const { data: staff, error, isLoading } = useStaff(bid)
  const { createStaff, updateStaff, deleteStaff, loading: mutationLoading } = useStaffMutations(bid)
  
  const [formVisible, setFormVisible] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', mobile: '', id: null })
  const [editing, setEditing] = useState(false)
  const [initialForm, setInitialForm] = useState({ name: '', email: '', mobile: '', id: null })
  const [isClosing, setIsClosing] = useState(false)

  // Add mobile header button
  useEffect(() => {
    const placeholder = document.getElementById('mobile-add-button-placeholder')
    if (placeholder) {
      placeholder.innerHTML = `
        <button class="button is-rounded is-ghost" onclick="document.querySelector('[data-add-staff]').click()" style="width: 40px; height: 40px; padding: 0;">
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

  function isFormDirty(current, initial) {
    return (
      current.name.trim() !== initial.name.trim() ||
      (current.email || '').trim() !== (initial.email || '').trim() ||
      (current.mobile || '').trim() !== (initial.mobile || '').trim()
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Name is required')
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return toast.error('Invalid email')
    if (form.mobile && !/^[\d\-\s\+]+$/.test(form.mobile)) return toast.error('Invalid mobile number')

    try {
      if (editing) {
        await updateStaff({ id: form.id, name: form.name, email: form.email, mobile: form.mobile })
      } else {
        await createStaff({ name: form.name, email: form.email, mobile: form.mobile })
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
    
    setIsClosing(true)
    setTimeout(() => {
      setForm({ name: '', email: '', mobile: '', id: null })
      setInitialForm({ name: '', email: '', mobile: '', id: null })
      setEditing(false)
      setFormVisible(false)
      setIsClosing(false)
    }, 300)
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
          data-add-staff
          onClick={() => {
            setEditing(false)
            const empty = { name: '', email: '', mobile: '', id: null }
            setForm({ ...empty })
            setInitialForm({ ...empty })
            setFormVisible(true)
          }}
          disabled={mutationLoading}
        >
          + Add Staff
        </button>
      </div>
      <div className="box" style={{ margin: '0 -0.75rem', fontSize: '1.1em' }}>
        {staff && staff.length > 0 ? staff.map((s, index) => (
          <div key={s.id}>
            <div 
              className="is-flex is-justify-content-space-between is-align-items-center p-3 is-clickable" 
              onClick={() => handleEdit(s)}
              style={{ cursor: 'pointer' }}
            >
              <div>
                <strong className="is-block" style={{ fontSize: '1.1em' }}>{s.name}</strong>
                {s.mobile && <small className="is-block has-text-grey" style={{ fontSize: '0.9em' }}>{s.mobile}</small>}
                {s.email && <small className="is-block has-text-grey" style={{ fontSize: '0.9em' }}>{s.email}</small>}
              </div>
              <div>
                <span className="icon has-text-grey-light">
                  <i className="fas fa-chevron-right"></i>
                </span>
              </div>
            </div>
            {index < staff.length - 1 && <hr className="my-2" style={{ margin: '8px 0', borderColor: '#e5e5e5' }} />}
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
          <div className="modal-card" style={{ 
            animation: isClosing ? 'slideOutToRight 0.3s ease-in' : 'slideInFromRight 0.3s ease-out', 
            transformOrigin: 'center right' 
          }}>
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
                  <div className="control has-icons-right">
                    <input className="input" type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    {form.email && (
                      <span className="icon is-small is-right" style={{ pointerEvents: 'all', zIndex: 10 }}>
                        <a href={`mailto:${form.email}`} className="has-text-info" style={{ pointerEvents: 'all' }}>
                          <i className="fas fa-envelope"></i>
                        </a>
                      </span>
                    )}
                  </div>
                </div>
                <div className="field">
                  <label className="label">Mobile</label>
                  <div className="control has-icons-right">
                    <input className="input" type="text" placeholder="Mobile" value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} />
                    {form.mobile && (
                      <span className="icon is-small is-right" style={{ pointerEvents: 'all', zIndex: 10 }}>
                        <a href={`tel:${form.mobile}`} className="has-text-info" style={{ pointerEvents: 'all' }}>
                          <i className="fas fa-phone"></i>
                        </a>
                      </span>
                    )}
                  </div>
                </div>
                <div className="field">
                  <div className="control">
                    <button 
                      className={`button is-success is-fullwidth ${mutationLoading ? 'is-loading' : ''}`} 
                      type="submit"
                      disabled={mutationLoading}
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
