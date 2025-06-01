'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams } from 'next/navigation'

export default function StaffPage() {
  const { bid } = useParams()
  const [staff, setStaff] = useState([])
  const [formVisible, setFormVisible] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', id: null })
  const [editing, setEditing] = useState(false)
  const [initialForm, setInitialForm] = useState({ name: '', email: '', id: null })

  useEffect(() => {
    if (!bid) return
    fetchStaff()
  }, [bid])

  async function fetchStaff() {
    const { data } = await supabase.from('staff').select('*').eq('business_id', bid)
    setStaff(data)
  }

  function isFormDirty(current, initial) {
    return (
      current.name.trim() !== initial.name.trim() ||
      (current.email || '').trim() !== (initial.email || '').trim()
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return alert('Name is required')
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return alert('Invalid email')

    if (editing) {
      await supabase.from('staff').update({ name: form.name, email: form.email }).eq('id', form.id)
    } else {
      await supabase.from('staff').insert({ business_id: bid, name: form.name, email: form.email })
    }
    closeForm(true)
    fetchStaff()
  }

  function handleEdit(member) {
    const copy = { ...member }
    setForm(copy)
    setInitialForm(copy)
    setEditing(true)
    setFormVisible(true)
  }

  async function deleteStaff(id) {
    const confirmDelete = window.confirm('Are you sure you want to delete this staff member?')
    if (!confirmDelete) return
    await supabase.from('staff').delete().eq('id', id)
    fetchStaff()
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

  return (
    <div className="container py-5 px-4">
      <div className="is-flex is-justify-content-space-between is-align-items-center mb-5">
        <h1 className="title is-4">Staff</h1>
        <button className="button is-link" onClick={() => {
          setEditing(false)
          const empty = { name: '', email: '', id: null }
          setForm({ ...empty })
          setInitialForm({ ...empty })
          setFormVisible(true)
        }}>
          + Add Staff
        </button>
      </div>
      <div className="box">
        {staff.map((s, index) => (
          <div key={s.id}>
            <div className="is-flex is-justify-content-space-between is-align-items-center py-2 px-3">
              <div>
                <strong>{s.name}</strong><br />
                <small>{s.email}</small>
              </div>
              <div>
                <button className="button is-small is-info mr-2" onClick={() => handleEdit(s)}>Edit</button>
                <button className="button is-small is-danger" onClick={() => deleteStaff(s.id)}>Delete</button>
              </div>
            </div>
            {index < staff.length - 1 && <hr className="my-2" />}
          </div>
        ))}
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
