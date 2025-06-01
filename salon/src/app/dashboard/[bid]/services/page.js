'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams } from 'next/navigation'

export default function ServicesPage() {
  const { bid } = useParams()
  const [services, setServices] = useState([])
  const [formVisible, setFormVisible] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', duration: 15, cost: '', id: null })
  const [editing, setEditing] = useState(false)
  const [initialForm, setInitialForm] = useState({})

  useEffect(() => {
    if (!bid) return
    fetchServices()
  }, [bid])

  async function fetchServices() {
    const { data } = await supabase.from('service').select('*').eq('business_id', bid)
    setServices(data)
  }

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
    if (!form.name.trim()) return alert('Name is required')
    if (form.duration <= 0) return alert('Duration must be positive')
    if (form.cost && isNaN(form.cost)) return alert('Cost must be a number')

    if (editing) {
      await supabase.from('service').update({ name: form.name, description: form.description, duration: form.duration, cost: form.cost }).eq('id', form.id)
    } else {
      await supabase.from('service').insert({ business_id: bid, name: form.name, description: form.description, duration: form.duration, cost: form.cost })
    }
    closeForm(true)
    fetchServices()
  }

  function handleEdit(service) {
    const copy = { ...service }
    setForm(copy)
    setInitialForm(copy)
    setEditing(true)
    setFormVisible(true)
  }

  async function deleteService(id) {
    const confirmDelete = window.confirm('Are you sure you want to delete this service?')
    if (!confirmDelete) return
    await supabase.from('service').delete().eq('id', id)
    fetchServices()
  }

  function closeForm(force = false) {
    if (!force && isFormDirty(form, initialForm)) {
      const confirmDiscard = window.confirm('You have unsaved changes. Discard them?')
      if (!confirmDiscard) return
    }
    setForm({ name: '', description: '', duration: 15, cost: '', id: null })
    setInitialForm({})
    setEditing(false)
    setFormVisible(false)
  }

  return (
    <div className="container py-5 px-4">
      <div className="is-flex is-justify-content-space-between is-align-items-center mb-5">
        <h1 className="title is-4">Services</h1>
        <button className="button is-link" onClick={() => {
          const empty = { name: '', description: '', duration: 15, cost: '', id: null }
          setForm({ ...empty })
          setInitialForm({ ...empty })
          setEditing(false)
          setFormVisible(true)
        }}>
          + Add Service
        </button>
      </div>
      <div className="box">
        {services.map((s, index) => (
          <div key={s.id}>
            <div className="is-flex is-justify-content-space-between is-align-items-center py-2 px-3">
              <div>
                <strong>{s.name}</strong><br />
                <small>{s.description}</small><br />
                <span>{s.duration} min - {s.cost ? `${s.cost}€` : 'Free'}</span>
              </div>
              <div>
                <button className="button is-small is-info mr-2" onClick={() => handleEdit(s)}>Edit</button>
                <button className="button is-small is-danger" onClick={() => deleteService(s.id)}>Delete</button>
              </div>
            </div>
            {index < services.length - 1 && <hr className="my-2" />}
          </div>
        ))}
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
