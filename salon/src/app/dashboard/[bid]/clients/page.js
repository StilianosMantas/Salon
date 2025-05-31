'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams } from 'next/navigation'

export default function ClientsPage() {
  const { bid } = useParams()
  const [clients, setClients] = useState([])
  const [formVisible, setFormVisible] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', mobile: '', id: null })
  const [editing, setEditing] = useState(false)
  const [initialForm, setInitialForm] = useState({ name: '', email: '', mobile: '', id: null })

  useEffect(() => {
    if (bid) {
      fetchClients()
    }
  }, [bid])

  async function fetchClients() {
    const { data } = await supabase.from('client').select('*').eq('business_id', bid)
    setClients(data)
  }

  function isFormDirty(current, initial) {
    return (
      current.name.trim() !== initial.name.trim() ||
      (current.email || '').trim() !== (initial.email || '').trim() ||
      (current.mobile || '').trim() !== (initial.mobile || '').trim()
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return alert('Name is required')
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return alert('Invalid email')
    if (form.mobile && !/^[\d\-\s\+]+$/.test(form.mobile)) return alert('Invalid mobile number')

    if (editing) {
      await supabase.from('client').update({ name: form.name, email: form.email, mobile: form.mobile }).eq('id', form.id)
    } else {
      await supabase.from('client').insert({ business_id: bid, name: form.name, email: form.email, mobile: form.mobile })
    }
    closeForm(true)
    fetchClients()
  }

  function handleEdit(client) {
    const copy = { ...client }
    setForm(copy)
    setInitialForm(copy)
    setEditing(true)
    setFormVisible(true)
  }

  async function deleteClient(id) {
    const confirmDelete = window.confirm('Are you sure you want to delete this client?')
    if (!confirmDelete) return
    await supabase.from('client').delete().eq('id', id)
    fetchClients()
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

  return (
    <div className="container py-5 px-4">
      <div className="is-flex is-justify-content-space-between is-align-items-center mb-5">
        <h1 className="title is-4">Clients</h1>
        <button className="button is-link" onClick={() => {
          setEditing(false)
          const empty = { name: '', email: '', mobile: '', id: null }
          setForm({ ...empty })
          setInitialForm({ ...empty })
          setFormVisible(true)
        }}>
          + Add Client
        </button>
      </div>
      <div className="box">
        {clients.map((c, index) => (
          <div key={c.id}>
            <div className="is-flex is-justify-content-space-between is-align-items-center py-2 px-3">
              <div>
                <strong>{c.name}</strong><br />
                <small>{c.email}</small><br />
                <small>{c.mobile}</small>
              </div>
              <div>
                <button className="button is-small is-info mr-2" onClick={() => handleEdit(c)}>Edit</button>
                <button className="button is-small is-danger" onClick={() => deleteClient(c.id)}>Delete</button>
              </div>
            </div>
            {index < clients.length - 1 && <hr className="my-2" />}
          </div>
        ))}
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
                    <input className="input" type="text" placeholder="Client Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                </div>
                <div className="field">
                  <label className="label">Email</label>
                  <div className="control">
                    <input className="input" type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="field">
                  <label className="label">Mobile</label>
                  <div className="control">
                    <input className="input" type="text" placeholder="Mobile" value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} />
                  </div>
                </div>
                <footer className="modal-card-foot">
                  <button className="button is-success" type="submit">{editing ? 'Update' : 'Add'}</button>
                  <button className="button" type="button" onClick={() => closeForm()}>Cancel</button>
                </footer>
              </form>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}