'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useClients, useClientMutations } from '@/hooks/useSupabaseData'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function ClientsPage() {
  const { bid } = useParams()
  const { data: clients, error, isLoading } = useClients(bid)
  const { createClient, updateClient, deleteClient, loading: mutationLoading } = useClientMutations(bid)
  
  const [formVisible, setFormVisible] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', mobile: '', id: null })
  const [editing, setEditing] = useState(false)
  const [initialForm, setInitialForm] = useState({ name: '', email: '', mobile: '', id: null })
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredClients, setFilteredClients] = useState([])

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
  
  // Add mobile header button
  useEffect(() => {
    const placeholder = document.getElementById('mobile-add-button-placeholder')
    if (placeholder) {
      placeholder.innerHTML = `
        <button class="button is-small is-link" onclick="document.querySelector('[data-add-client]').click()">
          <span class="icon is-small">
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
        await updateClient({ id: form.id, name: form.name, email: form.email, mobile: form.mobile })
      } else {
        await createClient({ name: form.name, email: form.email, mobile: form.mobile })
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
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  }

  function closeForm(force = false) {
    if (!force && isFormDirty(form, initialForm)) {
      const confirmDiscard = window.confirm('You have unsaved changes. Discard them?')
      if (!confirmDiscard) return
    }
    setForm({ name: '', email: '', mobile: '', id: null })
    setInitialForm({ name: '', email: '', mobile: '', id: null })
    setEditing(false)
    setFormVisible(false)
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
    <div className="container py-5 px-4">
      <div className="is-flex is-justify-content-space-between is-align-items-center mb-4">
        <div className="field has-addons is-flex-grow-1 mr-4">
          <div className="control has-icons-left is-expanded">
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
          </div>
        </div>
        <button
          className="button is-link is-hidden-mobile"
          data-add-client
          onClick={() => {
            setEditing(false)
            const empty = { name: '', email: '', mobile: '', id: null }
            setForm({ ...empty })
            setInitialForm({ ...empty })
            setFormVisible(true)
          }}
          disabled={mutationLoading}
        >
          + Add Client
        </button>
      </div>
      <div className="box">
        {filteredClients && filteredClients.length > 0 ? filteredClients.map((c, index) => (
          <div key={c.id}>
            <div 
              className="is-flex is-justify-content-space-between is-align-items-center py-2 px-3 is-clickable" 
              onClick={() => handleEdit(c)}
              style={{ cursor: 'pointer' }}
            >
              <div>
                <strong className="is-block">{c.name}</strong>
                {c.email && <small className="is-block has-text-grey">{c.email}</small>}
                {c.mobile && <small className="is-block has-text-grey">{c.mobile}</small>}
              </div>
              <div>
                <span className="icon">
                  <i className="fas fa-chevron-right"></i>
                </span>
              </div>
            </div>
            {index < filteredClients.length - 1 && <hr className="my-2" />}
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
          <div className="modal-card">
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
                <footer className="modal-card-foot" style={{ backgroundColor: 'transparent', display: 'block' }}>
                  <div className="field is-grouped is-grouped-multiline is-grouped-right-tablet">
                    <div className="control is-expanded-mobile">
                      <button 
                        className={`button is-success is-fullwidth ${mutationLoading ? 'is-loading' : ''}`} 
                        type="submit"
                        disabled={mutationLoading}
                      >
                        {editing ? 'Update' : 'Add'}
                      </button>
                    </div>
                    <div className="control is-expanded-mobile">
                      <button 
                        className="button is-fullwidth" 
                        type="button" 
                        onClick={() => closeForm()}
                        disabled={mutationLoading}
                      >
                        Cancel
                      </button>
                    </div>
                    {editing && (
                      <div className="control is-expanded-mobile">
                        <button 
                          className="button is-danger is-fullwidth" 
                          type="button" 
                          onClick={() => handleDelete(form.id)}
                          disabled={mutationLoading}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </footer>
              </form>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}