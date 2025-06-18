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
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredStaff, setFilteredStaff] = useState([])

  // Format phone number for display (Greek format)
  function formatPhoneNumber(phone) {
    if (!phone) return phone
    // Remove all non-digits and plus signs
    const cleaned = phone.replace(/[^\d+]/g, '')
    
    // Greek mobile format: +30 6XX XXX XXXX or 6XX XXX XXXX
    if (cleaned.startsWith('+306') && cleaned.length === 13) {
      return `+30 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`
    }
    if (cleaned.startsWith('6') && cleaned.length === 10) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
    }
    // Greek landline format: +30 2X XXXX XXXX or 2X XXXX XXXX
    if (cleaned.startsWith('+302') && cleaned.length === 13) {
      return `+30 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 9)} ${cleaned.slice(9)}`
    }
    if (cleaned.startsWith('2') && cleaned.length === 10) {
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`
    }
    // Return original if doesn't match Greek format
    return phone
  }

  // Validate Greek phone number
  function isValidGreekPhone(phone) {
    if (!phone) return false
    const cleaned = phone.replace(/[^\d+]/g, '')
    
    // Greek mobile: +30 6XX XXX XXXX or 6XX XXX XXXX
    if (cleaned.startsWith('+306') && cleaned.length === 13) return true
    if (cleaned.startsWith('6') && cleaned.length === 10) return true
    
    // Greek landline: +30 2X XXXX XXXX or 2X XXXX XXXX  
    if (cleaned.startsWith('+302') && cleaned.length === 13) return true
    if (cleaned.startsWith('2') && cleaned.length === 10) return true
    
    return false
  }

  // Filter staff based on search term
  useEffect(() => {
    if (!staff) {
      setFilteredStaff([])
      return
    }
    
    if (!searchTerm.trim()) {
      setFilteredStaff(staff)
      return
    }
    
    const filtered = staff.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.mobile && s.mobile.includes(searchTerm))
    )
    setFilteredStaff(filtered)
  }, [staff, searchTerm])

  // Add mobile header button and sync search
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

    // Sync mobile search with state
    const mobileSearchInput = document.getElementById('mobile-search-input')
    const mobileSearchClear = document.getElementById('mobile-search-clear')
    if (mobileSearchInput) {
      mobileSearchInput.value = searchTerm
      mobileSearchInput.addEventListener('input', (e) => {
        setSearchTerm(e.target.value)
      })
    }
    if (mobileSearchClear) {
      mobileSearchClear.style.display = searchTerm ? 'flex' : 'none'
      mobileSearchClear.addEventListener('click', () => {
        setSearchTerm('')
      })
    }

    return () => {
      if (placeholder) {
        placeholder.innerHTML = ''
      }
      if (mobileSearchInput) {
        mobileSearchInput.removeEventListener('input', (e) => {
          setSearchTerm(e.target.value)
        })
      }
      if (mobileSearchClear) {
        mobileSearchClear.removeEventListener('click', () => {
          setSearchTerm('')
        })
      }
    }
  }, [searchTerm])

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
      (current.email || '').trim() !== (initial.email || '').trim() ||
      (current.mobile || '').trim() !== (initial.mobile || '').trim()
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Name is required')
    if (!form.email?.trim()) return toast.error('Email is required')
    if (!form.mobile?.trim()) return toast.error('Mobile number is required')
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return toast.error('Invalid email')
    if (!isValidGreekPhone(form.mobile)) return toast.error('Invalid Greek phone number format')

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
    <div className="container py-2 px-2" style={{ fontSize: '1.1em', paddingTop: '0.5rem', maxWidth: 'calc(100vw - 300px)' }}>
      <div className="is-flex is-justify-content-space-between is-align-items-center mb-4 is-hidden-mobile" style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
        <div className="field has-addons is-flex-grow-1 mr-4">
          <div className="control has-icons-left has-icons-right is-expanded">
            <input
              className="input"
              type="text"
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="icon is-small is-left">
              <i className="fas fa-search"></i>
            </span>
            {searchTerm && (
              <span 
                className="icon is-small is-right is-clickable" 
                onClick={() => setSearchTerm('')}
                style={{ cursor: 'pointer', pointerEvents: 'all' }}
              >
                <i className="fas fa-times has-text-grey"></i>
              </span>
            )}
          </div>
        </div>
        <button 
          className="button is-link" 
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
      <div className="box extended-card" style={{ fontSize: '1.1em', marginBottom: '20px', marginTop: '0.75rem' }}>
        {filteredStaff && filteredStaff.length > 0 ? filteredStaff.map((s, index) => (
          <div key={s.id}>
            <div 
              className="is-flex is-justify-content-space-between is-align-items-center p-1 is-clickable" 
              onClick={() => handleEdit(s)}
              style={{ cursor: 'pointer' }}
            >
              <div>
                <strong className="is-block" style={{ fontSize: '1.1em' }}>{s.name}</strong>
                {s.mobile && <small className="is-block has-text-grey" style={{ fontSize: '0.9em' }}>{formatPhoneNumber(s.mobile)}</small>}
                {s.email && <small className="is-block has-text-grey" style={{ fontSize: '0.9em' }}>{s.email}</small>}
              </div>
              <div>
                <span className="icon is-small has-text-grey-light">
                  <i className="fas fa-chevron-right" style={{ fontSize: '0.875rem' }}></i>
                </span>
              </div>
            </div>
            {index < filteredStaff.length - 1 && <hr className="my-2" style={{ margin: '8px 0', borderColor: '#e5e5e5' }} />}
          </div>
        )) : (
          <div className="has-text-centered py-4">
            <p className="has-text-grey">{searchTerm ? 'No staff match your search.' : 'No staff members found. Add your first staff member to get started.'}</p>
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
                    <input className="input" type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
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
                    <input className="input" type="tel" placeholder="Mobile" value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} required />
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
                        className="button is-fullwidth has-text-danger" 
                        type="button" 
                        onClick={() => handleDelete(form.id)}
                        disabled={mutationLoading}
                        style={{ backgroundColor: 'white', borderColor: '#ff3860', color: '#ff3860' }}
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
