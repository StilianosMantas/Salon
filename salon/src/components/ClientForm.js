'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'

export default function ClientForm({ client, onSave, onCancel, mutationLoading }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' })

  useEffect(() => {
    if (client) {
      setForm(client)
    } else {
      setForm({ name: '', email: '', phone: '' })
    }
  }, [client])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    onSave(form)
  }

  return (
    <div className="modal is-active">
      <div className="modal-background" onClick={onCancel}></div>
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">{client ? 'Edit' : 'Add'} Client</p>
          <button className="delete" aria-label="close" onClick={onCancel}></button>
        </header>
        <section className="modal-card-body">
          <form id="clientForm" onSubmit={handleSubmit}>
            <div className="field">
              <label className="label">Name</label>
              <div className="control">
                <input className="input" type="text" name="name" value={form.name} onChange={handleInputChange} required />
              </div>
            </div>
            <div className="field">
              <label className="label">Email</label>
              <div className="control">
                <input className="input" type="email" name="email" value={form.email} onChange={handleInputChange} />
              </div>
            </div>
            <div className="field">
              <label className="label">Phone</label>
              <div className="control">
                <input className="input" type="tel" name="phone" value={form.phone} onChange={handleInputChange} />
              </div>
            </div>
          </form>
        </section>
        <footer className="modal-card-foot">
          <button className={`button is-success ${mutationLoading ? 'is-loading' : ''}`} type="submit" form="clientForm">
            {client ? 'Update' : 'Save'}
          </button>
          <button className="button" onClick={onCancel}>Cancel</button>
        </footer>
      </div>
    </div>
  )
}
