'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useClients, useClientMutations } from '@/hooks/useSupabaseData'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function ClientsPage() {
  const { bid } = useParams()
  const { data: clients, error, isLoading } = useClients(bid)
  const { createClient, updateClient, deleteClient, checkClientUniqueness, loading: mutationLoading } = useClientMutations(bid)

  // Export functions
  const exportToCSV = () => {
    if (!filteredClients || filteredClients.length === 0) {
      toast.error('No clients to export')
      return
    }

    const headers = ['Name', 'Email', 'Mobile', 'Notes', 'Created Date']
    const csvContent = [
      headers.join(','),
      ...filteredClients.map(client => [
        `"${client.name || ''}"`,
        `"${client.email || ''}"`,
        `"${client.mobile || ''}"`,
        `"${(client.notes || '').replace(/"/g, '""')}"`,
        `"${new Date(client.created_at).toLocaleDateString()}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `clients-export-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    toast.success(`Exported ${filteredClients.length} clients to CSV`)
  }

  const exportToJSON = () => {
    if (!filteredClients || filteredClients.length === 0) {
      toast.error('No clients to export')
      return
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      totalClients: filteredClients.length,
      clients: filteredClients.map(client => ({
        name: client.name,
        email: client.email,
        mobile: client.mobile,
        notes: client.notes,
        createdAt: client.created_at
      }))
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `clients-export-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    toast.success(`Exported ${filteredClients.length} clients to JSON`)
  }
  
  const [formVisible, setFormVisible] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', mobile: '', notes: '', id: null })
  const [editing, setEditing] = useState(false)
  const [initialForm, setInitialForm] = useState({ name: '', email: '', mobile: '', notes: '', id: null })
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredClients, setFilteredClients] = useState([])
  const [isClosing, setIsClosing] = useState(false)

  // Filter clients based on search term
  useEffect(() => {
    if (!clients) {
      setFilteredClients([])
      return
    }
    
    if (!searchTerm.trim()) {
      setFilteredClients(clients)
      return
    }
    
    const filtered = clients.filter(client => 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.mobile && client.mobile.includes(searchTerm))
    )
    setFilteredClients(filtered)
  }, [clients, searchTerm])
  
  // Add mobile header button and sync search
  useEffect(() => {
    const placeholder = document.getElementById('mobile-add-button-placeholder')
    if (placeholder) {
      placeholder.innerHTML = `
        <button class="button is-rounded is-ghost" onclick="document.querySelector('[data-add-client]').click()" style="width: 40px; height: 40px; padding: 0;">
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
      (current.mobile || '').trim() !== (initial.mobile || '').trim() ||
      (current.notes || '').trim() !== (initial.notes || '').trim()
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Name is required')
    if (!form.mobile?.trim()) return toast.error('Mobile number is required')
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return toast.error('Invalid email')
    if (form.mobile && !isValidGreekPhone(form.mobile)) return toast.error('Invalid Greek phone number format')

    try {
      if (editing) {
        await updateClient({ id: form.id, name: form.name, email: form.email, mobile: form.mobile, notes: form.notes })
      } else {
        await createClient({ name: form.name, email: form.email, mobile: form.mobile, notes: form.notes })
      }
      closeForm(true)
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  }

  function handleEdit(client) {
    const copy = { ...client }
    setForm(copy)
    setInitialForm(copy)
    setEditing(true)
    setFormVisible(true)
  }

  async function handleDelete(id) {
    const confirmDelete = window.confirm('Are you sure you want to delete this client?')
    if (!confirmDelete) return

    try {
      await deleteClient(id)
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
      setForm({ name: '', email: '', mobile: '', notes: '', id: null })
      setInitialForm({ name: '', email: '', mobile: '', notes: '', id: null })
      setEditing(false)
      setFormVisible(false)
      setIsClosing(false)
    }, 300)
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading clients..." />
  }

  if (error) {
    return (
      <div className="container py-5 px-4">
        <div className="notification is-danger">
          <h2 className="title is-4">Unable to Load Clients</h2>
          <p className="mb-3">We couldn&apos;t load your client list. This might be due to a connection issue or temporary server problem.</p>
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
              placeholder="Search clients..."
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
        <div className="buttons">
          <div className="dropdown is-hoverable">
            <div className="dropdown-trigger">
              <button className="button is-light" aria-haspopup="true" aria-controls="dropdown-menu">
                <span className="icon">
                  <i className="fas fa-download"></i>
                </span>
                <span>Export</span>
                <span className="icon is-small">
                  <i className="fas fa-angle-down" aria-hidden="true"></i>
                </span>
              </button>
            </div>
            <div className="dropdown-menu" id="dropdown-menu" role="menu">
              <div className="dropdown-content">
                <button className="dropdown-item button is-ghost" onClick={exportToCSV}>
                  <span className="icon mr-2">
                    <i className="fas fa-file-csv"></i>
                  </span>
                  Export as CSV
                </button>
                <button className="dropdown-item button is-ghost" onClick={exportToJSON}>
                  <span className="icon mr-2">
                    <i className="fas fa-file-code"></i>
                  </span>
                  Export as JSON
                </button>
              </div>
            </div>
          </div>
          <button
            className="button is-link"
            data-add-client
            onClick={() => {
              setEditing(false)
              const empty = { name: '', email: '', mobile: '', notes: '', id: null }
              setForm({ ...empty })
              setInitialForm({ ...empty })
              setFormVisible(true)
            }}
            disabled={mutationLoading}
          >
            + Add Client
          </button>
        </div>
      </div>
      <div className="box extended-card" style={{ fontSize: '1.1em', marginBottom: '20px', marginTop: '0.75rem' }}>
        {filteredClients && filteredClients.length > 0 ? filteredClients.map((c, index) => (
          <div key={c.id}>
            <div 
              className="is-flex is-justify-content-space-between is-align-items-center p-1 is-clickable" 
              onClick={() => handleEdit(c)}
              style={{ cursor: 'pointer' }}
            >
              <div>
                <strong className="is-block" style={{ fontSize: '1.1em' }}>{c.name}</strong>
                {c.email && (
                  <a 
                    href={`mailto:${c.email}`} 
                    className="is-block has-text-grey" 
                    style={{ fontSize: '0.9em' }}
                    title={`Email ${c.name}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="icon is-small mr-1">
                      <i className="fas fa-envelope"></i>
                    </span>
                    {c.email}
                  </a>
                )}
                {c.mobile && (
                  <a 
                    href={`tel:${c.mobile}`} 
                    className="is-block has-text-grey" 
                    style={{ fontSize: '0.9em' }}
                    title={`Call ${c.name}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="icon is-small mr-1">
                      <i className="fas fa-phone"></i>
                    </span>
                    {formatPhoneNumber(c.mobile)}
                  </a>
                )}
              </div>
              <div>
                <span className="icon is-small has-text-grey-light">
                  <i className="fas fa-chevron-right" style={{ fontSize: '0.875rem' }}></i>
                </span>
              </div>
            </div>
            {index < filteredClients.length - 1 && <hr className="my-2" style={{ margin: '8px 0', borderColor: '#e5e5e5' }} />}
          </div>
        )) : (
          <div className="has-text-centered py-4">
            <p className="has-text-grey">{searchTerm ? 'No clients match your search.' : 'No clients found. Add your first client to get started.'}</p>
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
              <p className="modal-card-title">{editing ? 'Edit Client' : 'Add Client'}</p>
              <button className="delete" aria-label="close" onClick={() => closeForm()}></button>
            </header>
            <section className="modal-card-body">
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label className="label">Name</label>
                  <div className="control">
                    <input
                      className="input"
                      type="text"
                      placeholder="Client Name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="label">Email</label>
                  <div className="control has-icons-right">
                    <input
                      className="input"
                      type="email"
                      placeholder="Email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
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
                    <input
                      className="input"
                      type="text"
                      placeholder="Mobile"
                      value={form.mobile}
                      onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                      required
                    />
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
                  <label className="label">Notes</label>
                  <div className="control">
                    <textarea
                      className="textarea"
                      placeholder="Additional notes about the client..."
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      rows="3"
                    />
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