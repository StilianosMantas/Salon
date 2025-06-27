'use client'

import { useState } from 'react'
import { validateSchema, clientSchema } from '@/lib/validations'
import { useClientMutations } from '@/hooks/useSupabaseData'
import { sanitizeFormData } from '@/lib/sanitization'

export default function ClientForm({ businessId, client = null, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    name: client?.name || '',
    email: client?.email || '',
    mobile: client?.mobile || ''
  })
  const [errors, setErrors] = useState({})
  
  const { createClient, updateClient, loading } = useClientMutations(businessId)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})

    // Sanitize form data first
    const sanitizedForm = sanitizeFormData(form)

    // Validate sanitized form data
    const validation = validateSchema(clientSchema, sanitizedForm)
    if (!validation.success) {
      setErrors(validation.errors)
      return
    }

    try {
      if (client) {
        await updateClient({ id: client.id, ...validation.data })
      } else {
        await createClient(validation.data)
      }
      onSuccess?.()
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="salon-field">
        <label className="salon-label">Name *</label>
        <div className="salon-control">
          <input
            className={`salon-input ${errors.name ? 'is-danger' : ''}`}
            type="text"
            placeholder="Client Name"
            value={form.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            disabled={loading}
          />
        </div>
        {errors.name && <p className="help is-danger">{errors.name}</p>}
      </div>

      <div className="salon-field">
        <label className="salon-label">Email</label>
        <div className="salon-control">
          <input
            className={`salon-input ${errors.email ? 'is-danger' : ''}`}
            type="email"
            placeholder="Email Address"
            value={form.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            disabled={loading}
          />
        </div>
        {errors.email && <p className="help is-danger">{errors.email}</p>}
      </div>

      <div className="salon-field">
        <label className="salon-label">Mobile</label>
        <div className="salon-control">
          <input
            className={`salon-input ${errors.mobile ? 'is-danger' : ''}`}
            type="text"
            placeholder="Mobile Number"
            value={form.mobile}
            onChange={(e) => handleInputChange('mobile', e.target.value)}
            disabled={loading}
          />
        </div>
        {errors.mobile && <p className="help is-danger">{errors.mobile}</p>}
      </div>

      <div className="salon-field is-grouped">
        <div className="salon-control">
          <button 
            className={`salon-button is-primary ${loading ? 'is-loading' : ''}`}
            type="submit"
            disabled={loading}
          >
            {client ? 'Update' : 'Add'} Client
          </button>
        </div>
        <div className="salon-control">
          <button 
            className="salon-button is-light"
            type="button"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  )
}