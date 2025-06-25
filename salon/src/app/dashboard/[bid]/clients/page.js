'use client'
import ClientForm from '@/components/ClientForm'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useClients, useClientMutations } from '@/hooks/useSupabaseData'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function ClientsPage() {
  const { bid } = useParams()
  const { data: clients, error, isLoading, mutate } = useClients(bid)
  const { createClient, updateClient, deleteClient, loading: mutationLoading } = useClientMutations(bid)

  const [formVisible, setFormVisible] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const handleSave = async (clientData) => {
    try {
      if (editingClient) {
        await updateClient({ ...clientData, id: editingClient.id })
      } else {
        await createClient(clientData)
      }
      setFormVisible(false)
      setEditingClient(null)
    } catch (error) {
      // Error is handled in the hook
    }
  }

  const openForm = (client = null) => {
    setEditingClient(client)
    setFormVisible(true)
  }

  const closeForm = () => {
    setFormVisible(false)
    setEditingClient(null)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      await deleteClient(id)
    }
  }

  const filteredClients = clients?.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.phone && client.phone.includes(searchTerm))
  ) || []

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
      <div className="container py-2 px-2">
        <div className="is-flex is-justify-content-space-between is-align-items-center mb-4 is-hidden-mobile" style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
          <div className="control has-icons-left has-icons-right is-flex-grow-1 mr-4">
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
              >
                <i className="fas fa-times"></i>
              </span>
            )}
          </div>
          <button
            className="button is-link"
            onClick={() => openForm()}
            disabled={mutationLoading}
          >
            + Add Client
          </button>
        </div>
        <div className="box extended-card">
          {filteredClients && filteredClients.length > 0 ? filteredClients.map((c, index) => (
            <div key={c.id}>
              <div className="is-flex is-justify-content-space-between is-align-items-center p-1">
                <div className="is-flex is-align-items-center is-flex-grow-1 is-clickable"
                  onClick={() => openForm(c)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="mr-3">
                    {c.avatar_url ? (
                      <figure className="image is-48x48">
                        <img 
                          className="is-rounded" 
                          src={c.avatar_url} 
                          alt={`${c.name} avatar`}
                          style={{ objectFit: 'cover' }}
                        />
                      </figure>
                    ) : (
                      <div className="has-background-grey-light is-flex is-justify-content-center is-align-items-center" style={{ width: '48px', height: '48px', borderRadius: '50%' }}>
                        <span className="icon has-text-grey">
                          <i className="fas fa-user"></i>
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <strong className="is-block" style={{ fontSize: '0.85em' }}>{c.name}</strong>
                  </div>
                </div>
                <div className="is-flex is-align-items-center" style={{ gap: '0.5rem' }}>
                  <button
                    className="button is-small is-danger is-light"
                    onClick={() => handleDelete(c.id)}
                    disabled={mutationLoading}
                  >
                    <span className="icon">
                      <i className="fas fa-trash"></i>
                    </span>
                  </button>
                </div>
              </div>
              {index < filteredClients.length - 1 && <hr className="my-2" style={{ margin: '8px 0', borderColor: '#e5e5e5' }} />}
            </div>
          )) : (
            <div className="has-text-centered p-4">
              {searchTerm ? (
                <p>No clients found matching &quot;{searchTerm}&quot;.</p>
              ) : (
                <p>No clients found. Click &quot;Add Client&quot; to get started.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {formVisible && (
        <ClientForm 
          client={editingClient}
          onSave={handleSave}
          onCancel={closeForm}
          mutationLoading={mutationLoading}
        />
      )}
    </>
  )
}