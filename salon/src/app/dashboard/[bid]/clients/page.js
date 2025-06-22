'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useClients, useClientMutations } from '@/hooks/useSupabaseData'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabaseClient'
import { isImageFile, isValidFileSize } from '@/utils/imageUtils'

export default function ClientsPage() {
  const { bid } = useParams()
  const { data: clients, error, isLoading } = useClients(bid)
  const { createClient, updateClient, deleteClient, checkClientUniqueness, uploadClientAvatar, deleteClientAvatar, loading: mutationLoading } = useClientMutations(bid)

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
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    mobile: '', 
    notes: '', 
    preferences: '',
    allergies: '',
    preferred_staff: '',
    preferred_services: [],
    avatar_url: null,
    id: null 
  })
  const [editing, setEditing] = useState(false)
  const [initialForm, setInitialForm] = useState({ 
    name: '', 
    email: '', 
    mobile: '', 
    notes: '', 
    preferences: '',
    allergies: '',
    preferred_staff: '',
    preferred_services: [],
    avatar_url: null,
    id: null 
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredClients, setFilteredClients] = useState([])
  const [isClosing, setIsClosing] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [showClientDetails, setShowClientDetails] = useState(false)
  const [clientHistory, setClientHistory] = useState([])
  const [staff, setStaff] = useState([])
  const [services, setServices] = useState([])
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [clientPhotos, setClientPhotos] = useState([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoView, setPhotoView] = useState(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [photoType, setPhotoType] = useState('before') // 'before' or 'after'
  const [photoNotes, setPhotoNotes] = useState('')
  const [showCommunicationModal, setShowCommunicationModal] = useState(false)
  const [communicationHistory, setCommunicationHistory] = useState([])
  const [messageForm, setMessageForm] = useState({ type: 'sms', subject: '', message: '' })
  const [sendingMessage, setSendingMessage] = useState(false)

  // Fetch staff and services for preferences
  useEffect(() => {
    const fetchStaffAndServices = async () => {
      try {
        const { data: staffData } = await supabase
          .from('staff')
          .select('id, name')
          .eq('business_id', bid)
          .order('name')
        
        const { data: servicesData } = await supabase
          .from('service')
          .select('id, name')
          .eq('business_id', bid)
          .order('name')
        
        setStaff(staffData || [])
        setServices(servicesData || [])
      } catch (error) {
        console.error('Error fetching staff and services:', error)
      }
    }

    if (bid) {
      fetchStaffAndServices()
    }
  }, [bid])

  // Fetch client appointment history
  const fetchClientHistory = async (clientId) => {
    try {
      const { data: history } = await supabase
        .from('slot')
        .select(`
          id,
          slotdate,
          start_time,
          end_time,
          book_status,
          created_at,
          staff:staff_id (name),
          slot_service (
            service:service_id (name)
          )
        `)
        .eq('business_id', bid)
        .eq('client_id', clientId)
        .order('slotdate', { ascending: false })
        .limit(20)

      setClientHistory(history || [])
    } catch (error) {
      console.error('Error fetching client history:', error)
      setClientHistory([])
    }
  }

  // Fetch client photos
  const fetchClientPhotos = async (clientId) => {
    try {
      const { data: photos } = await supabase
        .from('client_photos')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      setClientPhotos(photos || [])
    } catch (error) {
      console.error('Error fetching client photos:', error)
      setClientPhotos([])
    }
  }

  // Upload photo
  const uploadPhoto = async (file, type, notes) => {
    if (!selectedClient) return

    setUploadingPhoto(true)
    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${selectedClient.id}_${type}_${Date.now()}.${fileExt}`
      const filePath = `client-photos/${fileName}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('client-photos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('client-photos')
        .getPublicUrl(filePath)

      // Save photo record to database
      const { error: dbError } = await supabase
        .from('client_photos')
        .insert({
          client_id: selectedClient.id,
          business_id: bid,
          photo_url: publicUrl,
          photo_type: type,
          notes: notes,
          file_name: fileName
        })

      if (dbError) throw dbError

      // Refresh photos
      await fetchClientPhotos(selectedClient.id)
      toast.success('Photo uploaded successfully')
      setShowPhotoModal(false)
      setPhotoNotes('')
    } catch (error) {
      console.error('Error uploading photo:', error)
      toast.error('Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  // Delete photo
  const deletePhoto = async (photo) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('client-photos')
        .remove([photo.file_name])

      if (storageError) console.warn('Storage deletion error:', storageError)

      // Delete from database
      const { error: dbError } = await supabase
        .from('client_photos')
        .delete()
        .eq('id', photo.id)

      if (dbError) throw dbError

      // Refresh photos
      await fetchClientPhotos(selectedClient.id)
      toast.success('Photo deleted successfully')
    } catch (error) {
      console.error('Error deleting photo:', error)
      toast.error('Failed to delete photo')
    }
  }

  // Fetch communication history
  const fetchCommunicationHistory = async (clientId) => {
    try {
      const { data: history } = await supabase
        .from('client_communications')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(50)

      setCommunicationHistory(history || [])
    } catch (error) {
      console.error('Error fetching communication history:', error)
      setCommunicationHistory([])
    }
  }

  // Send message to client
  const sendMessage = async () => {
    if (!selectedClient || !messageForm.message.trim()) {
      toast.error('Please enter a message')
      return
    }

    if (messageForm.type === 'email' && !messageForm.subject.trim()) {
      toast.error('Please enter a subject for email')
      return
    }

    setSendingMessage(true)
    try {
      // Save communication record to database
      const { error } = await supabase
        .from('client_communications')
        .insert({
          client_id: selectedClient.id,
          business_id: bid,
          type: messageForm.type,
          subject: messageForm.subject || null,
          message: messageForm.message,
          status: 'sent',
          sent_at: new Date().toISOString()
        })

      if (error) throw error

      // Here you would integrate with actual SMS/Email service
      // For now, we'll just simulate the sending
      if (messageForm.type === 'sms') {
        // Integration with SMS service (Twilio, etc.)
        console.log(`SMS to ${selectedClient.mobile}: ${messageForm.message}`)
        toast.success(`SMS sent to ${selectedClient.name}`)
      } else {
        // Integration with Email service (SendGrid, etc.)
        console.log(`Email to ${selectedClient.email}: ${messageForm.subject} - ${messageForm.message}`)
        toast.success(`Email sent to ${selectedClient.name}`)
      }

      // Refresh communication history
      await fetchCommunicationHistory(selectedClient.id)
      
      // Reset form
      setMessageForm({ type: 'sms', subject: '', message: '' })
      setShowCommunicationModal(false)
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  // Open communication center
  const openCommunicationCenter = (client) => {
    setSelectedClient(client)
    setShowCommunicationModal(true)
    fetchCommunicationHistory(client.id)
  }

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
  }, [formVisible]) // closeForm is hoisted function declaration, safe to use

  function isFormDirty(current, initial) {
    return (
      current.name.trim() !== initial.name.trim() ||
      (current.email || '').trim() !== (initial.email || '').trim() ||
      (current.mobile || '').trim() !== (initial.mobile || '').trim() ||
      (current.notes || '').trim() !== (initial.notes || '').trim() ||
      (current.preferences || '').trim() !== (initial.preferences || '').trim() ||
      (current.allergies || '').trim() !== (initial.allergies || '').trim() ||
      (current.preferred_staff || '').trim() !== (initial.preferred_staff || '').trim() ||
      JSON.stringify(current.preferred_services || []) !== JSON.stringify(initial.preferred_services || []) ||
      avatarFile !== null
    )
  }

  function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return

    if (!isImageFile(file)) {
      toast.error('Please select a valid image file')
      return
    }

    if (!isValidFileSize(file, 10)) {
      toast.error('File size must be less than 10MB')
      return
    }

    setAvatarFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target.result)
    }
    reader.readAsDataURL(file)
  }

  async function handleAvatarUpload() {
    if (!avatarFile || !form.id) return
    
    try {
      await uploadClientAvatar(form.id, avatarFile)
      setAvatarFile(null)
      setAvatarPreview(null)
    } catch (error) {
      // Error handled in hook
    }
  }

  async function handleAvatarDelete() {
    if (!form.avatar_url || !form.id) return
    
    try {
      await deleteClientAvatar(form.id, form.avatar_url)
    } catch (error) {
      // Error handled in hook
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Name is required')
    if (!form.mobile?.trim()) return toast.error('Mobile number is required')
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return toast.error('Invalid email')
    if (form.mobile && !isValidGreekPhone(form.mobile)) return toast.error('Invalid Greek phone number format')

    try {
      const clientData = {
        id: form.id,
        name: form.name,
        email: form.email,
        mobile: form.mobile,
        notes: form.notes,
        preferences: form.preferences,
        allergies: form.allergies,
        preferred_staff: form.preferred_staff || null,
        preferred_services: form.preferred_services
      }

      let result
      if (editing) {
        result = await updateClient(clientData)
      } else {
        result = await createClient(clientData)
      }
      
      // Handle avatar upload if there's a file
      if (avatarFile && result) {
        await uploadClientAvatar(result.id, avatarFile)
      }
      
      closeForm(true)
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  }

  function handleEdit(client) {
    const copy = { 
      ...client,
      preferences: client.preferences || '',
      allergies: client.allergies || '',
      preferred_staff: client.preferred_staff || '',
      preferred_services: client.preferred_services || []
    }
    setForm(copy)
    setInitialForm(copy)
    setEditing(true)
    setFormVisible(true)
  }

  function viewClientDetails(client) {
    setSelectedClient(client)
    setShowClientDetails(true)
    fetchClientHistory(client.id)
    fetchClientPhotos(client.id)
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
      const emptyForm = { 
        name: '', 
        email: '', 
        mobile: '', 
        notes: '', 
        preferences: '',
        allergies: '',
        preferred_staff: '',
        preferred_services: [],
        avatar_url: null,
        id: null 
      }
      setForm(emptyForm)
      setInitialForm(emptyForm)
      setAvatarFile(null)
      setAvatarPreview(null)
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
    <div className="container py-2 px-2">
      <div className="is-flex is-justify-content-space-between is-align-items-center mb-4 is-hidden-mobile" style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
        <div className="control has-icons-left has-icons-right is-flex-grow-1 mr-4">
          <input
            className="salon-input"
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
              const empty = { 
                name: '', 
                email: '', 
                mobile: '', 
                notes: '', 
                preferences: '',
                allergies: '',
                preferred_staff: '',
                preferred_services: [],
                avatar_url: null,
                id: null 
              }
              setForm({ ...empty })
              setInitialForm({ ...empty })
              setAvatarFile(null)
              setAvatarPreview(null)
              setFormVisible(true)
            }}
            disabled={mutationLoading}
          >
            + Add Client
          </button>
        </div>
      </div>
      <div className="box extended-card">
        {filteredClients && filteredClients.length > 0 ? filteredClients.map((c, index) => (
          <div key={c.id}>
            <div className="is-flex is-justify-content-space-between is-align-items-center p-1">
              <div className="is-flex is-align-items-center is-flex-grow-1 is-clickable"
                onClick={() => handleEdit(c)}
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
                {c.mobile && (
                  <div className="is-block has-text-grey" style={{ fontSize: '0.75em' }}>
                    <span className="icon is-small mr-1">
                      <i className="fas fa-phone"></i>
                    </span>
                    {formatPhoneNumber(c.mobile)}
                  </div>
                )}
                {(c.allergies || c.preferences) && (
                  <div className="mt-1">
                    {c.allergies && (
                      <span className="tag is-warning is-small mr-1" title="Allergies">
                        <span className="icon is-small">
                          <i className="fas fa-exclamation-triangle"></i>
                        </span>
                        <span>Allergies</span>
                      </span>
                    )}
                    {c.preferences && (
                      <span className="tag is-info is-small" title="Has preferences">
                        <span className="icon is-small">
                          <i className="fas fa-heart"></i>
                        </span>
                        <span>Preferences</span>
                      </span>
                    )}
                  </div>
                )}
                </div>
              </div>
              <div className="is-flex is-align-items-center" style={{ gap: '0.5rem' }}>
                <button
                  className="button is-small is-primary is-outlined"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (c.mobile) {
                      window.open(`tel:${c.mobile}`, '_self')
                    }
                  }}
                  title="Call client"
                  disabled={!c.mobile}
                >
                  <span className="icon">
                    <i className="fas fa-phone"></i>
                  </span>
                  <span>Call</span>
                </button>
                <button
                  className="button is-small is-info is-outlined"
                  onClick={(e) => {
                    e.stopPropagation()
                    viewClientDetails(c)
                  }}
                  title="View client details and history"
                >
                  <span className="icon">
                    <i className="fas fa-eye"></i>
                  </span>
                  <span>Details</span>
                </button>
                <button
                  className="button is-small is-success is-outlined"
                  onClick={(e) => {
                    e.stopPropagation()
                    openCommunicationCenter(c)
                  }}
                  title="Send message to client"
                  disabled={!c.mobile && !c.email}
                >
                  <span className="icon">
                    <i className="fas fa-comments"></i>
                  </span>
                  <span>Message</span>
                </button>
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
                <div className="salon-field">
                  <label className="salon-label">Name</label>
                  <div className="salon-control">
                    <input
                      className="salon-input"
                      type="text"
                      placeholder="Client Name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="salon-field">
                  <label className="salon-label">Avatar</label>
                  <div className="is-flex is-align-items-center mb-3">
                    {(avatarPreview || form.avatar_url) && (
                      <figure className="image is-64x64 mr-3">
                        <img 
                          className="is-rounded" 
                          src={avatarPreview || form.avatar_url} 
                          alt="Avatar preview"
                          style={{ objectFit: 'cover' }}
                        />
                      </figure>
                    )}
                    <div className="file">
                      <label className="file-label">
                        <input 
                          className="file-input" 
                          type="file" 
                          accept="image/*"
                          onChange={handleAvatarChange}
                          disabled={mutationLoading}
                        />
                        <span className="file-cta">
                          <span className="file-icon">
                            <i className="fas fa-upload"></i>
                          </span>
                          <span className="file-label">
                            Choose avatar
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>
                  {editing && form.avatar_url && (
                    <div className="control">
                      <button 
                        className="button is-small is-danger is-outlined" 
                        type="button"
                        onClick={handleAvatarDelete}
                        disabled={mutationLoading}
                      >
                        <span className="icon">
                          <i className="fas fa-trash"></i>
                        </span>
                        <span>Remove Avatar</span>
                      </button>
                    </div>
                  )}
                  {avatarFile && editing && (
                    <div className="control mt-2">
                      <button 
                        className={`button is-small is-info ${mutationLoading ? 'is-loading' : ''}`} 
                        type="button"
                        onClick={handleAvatarUpload}
                        disabled={mutationLoading}
                      >
                        <span className="icon">
                          <i className="fas fa-upload"></i>
                        </span>
                        <span>Upload Avatar</span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="salon-field">
                  <label className="salon-label">Email</label>
                  <div className="salon-control has-icons-right">
                    <input
                      className="salon-input"
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
                <div className="salon-field">
                  <label className="salon-label">Mobile</label>
                  <div className="salon-control has-icons-right">
                    <input
                      className="salon-input"
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
                <div className="salon-field">
                  <label className="salon-label">Preferences</label>
                  <div className="salon-control">
                    <textarea
                      className="salon-textarea"
                      placeholder="Client preferences (e.g., preferred styling, timing, etc.)"
                      value={form.preferences}
                      onChange={(e) => setForm({ ...form, preferences: e.target.value })}
                      rows="2"
                    />
                  </div>
                </div>
                <div className="salon-field">
                  <label className="salon-label">Allergies & Sensitivities</label>
                  <div className="salon-control">
                    <textarea
                      className="salon-textarea"
                      placeholder="Important: List any known allergies or sensitivities"
                      value={form.allergies}
                      onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                      rows="2"
                    />
                  </div>
                  {form.allergies && (
                    <p className="help is-warning">
                      <span className="icon is-small">
                        <i className="fas fa-exclamation-triangle"></i>
                      </span>
                      Always verify allergies before service
                    </p>
                  )}
                </div>
                <div className="salon-field">
                  <label className="salon-label">Preferred Staff</label>
                  <div className="salon-control">
                    <div className="salon-select">
                      <select
                        value={form.preferred_staff}
                        onChange={(e) => setForm({ ...form, preferred_staff: e.target.value })}
                      >
                        <option value="">No preference</option>
                        {staff.map(staffMember => (
                          <option key={staffMember.id} value={staffMember.id}>
                            {staffMember.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="salon-field">
                  <label className="salon-label">Preferred Services</label>
                  <div className="salon-control">
                    {services.map(service => (
                      <label key={service.id} className="checkbox is-block mb-2">
                        <input
                          type="checkbox"
                          checked={form.preferred_services.includes(service.id)}
                          onChange={(e) => {
                            const updatedServices = e.target.checked
                              ? [...form.preferred_services, service.id]
                              : form.preferred_services.filter(id => id !== service.id)
                            setForm({ ...form, preferred_services: updatedServices })
                          }}
                        />
                        <span className="ml-2">{service.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="salon-field">
                  <label className="salon-label">Notes</label>
                  <div className="salon-control">
                    <textarea
                      className="salon-textarea"
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

      {/* Client Details Modal */}
      {showClientDetails && selectedClient && (
        <div className="modal is-active">
          <div className="modal-background" onClick={() => setShowClientDetails(false)}></div>
          <div className="modal-card" style={{ maxWidth: '800px', width: '90vw' }}>
            <header className="modal-card-head">
              <p className="modal-card-title">
                <span className="icon mr-2">
                  <i className="fas fa-user"></i>
                </span>
                {selectedClient.name} - Client Details
              </p>
              <button className="delete" aria-label="close" onClick={() => setShowClientDetails(false)}></button>
            </header>
            <section className="modal-card-body">
              <div className="columns">
                <div className="column is-half">
                  <h5 className="title is-5 mb-4">Contact Information</h5>
                  <div className="field">
                    <label className="label">Email</label>
                    <div className="field has-addons">
                      <div className="control is-expanded">
                        <input className="input" type="text" value={selectedClient.email || 'Not provided'} readOnly />
                      </div>
                      {selectedClient.email && (
                        <div className="control">
                          <a href={`mailto:${selectedClient.email}`} className="button is-info is-outlined">
                            <span className="icon">
                              <i className="fas fa-envelope"></i>
                            </span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="field">
                    <label className="label">Mobile</label>
                    <div className="field has-addons">
                      <div className="control is-expanded">
                        <input className="input" type="text" value={selectedClient.mobile || 'Not provided'} readOnly />
                      </div>
                      {selectedClient.mobile && (
                        <div className="control">
                          <a href={`tel:${selectedClient.mobile}`} className="button is-success is-outlined">
                            <span className="icon">
                              <i className="fas fa-phone"></i>
                            </span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <h5 className="title is-5 mb-4 mt-5">Preferences & Requirements</h5>
                  {selectedClient.allergies && (
                    <div className="field">
                      <label className="label has-text-warning">
                        <span className="icon">
                          <i className="fas fa-exclamation-triangle"></i>
                        </span>
                        Allergies & Sensitivities
                      </label>
                      <div className="notification is-warning is-light">
                        <p>{selectedClient.allergies}</p>
                      </div>
                    </div>
                  )}
                  {selectedClient.preferences && (
                    <div className="field">
                      <label className="label">Preferences</label>
                      <div className="content">
                        <p>{selectedClient.preferences}</p>
                      </div>
                    </div>
                  )}
                  {selectedClient.preferred_staff && (
                    <div className="field">
                      <label className="label">Preferred Staff</label>
                      <div className="content">
                        <span className="tag is-info">
                          {staff.find(s => s.id === selectedClient.preferred_staff)?.name || 'Unknown Staff'}
                        </span>
                      </div>
                    </div>
                  )}
                  {selectedClient.preferred_services && selectedClient.preferred_services.length > 0 && (
                    <div className="field">
                      <label className="label">Preferred Services</label>
                      <div className="content">
                        <div className="tags">
                          {selectedClient.preferred_services.map(serviceId => (
                            <span key={serviceId} className="tag is-link is-light">
                              {services.find(s => s.id === serviceId)?.name || 'Unknown Service'}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedClient.notes && (
                    <div className="field">
                      <label className="label">Notes</label>
                      <div className="content">
                        <p>{selectedClient.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="column is-half">
                  <h5 className="title is-5 mb-4">Photo Gallery</h5>
                  <div className="field">
                    <button 
                      className="button is-primary is-small mb-3"
                      onClick={() => setShowPhotoModal(true)}
                    >
                      <span className="icon">
                        <i className="fas fa-camera"></i>
                      </span>
                      <span>Add Photo</span>
                    </button>
                  </div>
                  
                  {clientPhotos.length > 0 ? (
                    <div className="photo-gallery" style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem' }}>
                      <div className="columns is-multiline is-mobile">
                        {clientPhotos.map(photo => (
                          <div key={photo.id} className="column is-half-mobile is-one-third-tablet">
                            <div className="card">
                              <div className="card-image">
                                <figure className="image is-square">
                                  <img 
                                    src={photo.photo_url} 
                                    alt={`${photo.photo_type} photo`}
                                    style={{ objectFit: 'cover', cursor: 'pointer' }}
                                    onClick={() => setPhotoView(photo)}
                                  />
                                </figure>
                              </div>
                              <div className="card-content is-size-7 p-2">
                                <span className={`tag is-small ${
                                  photo.photo_type === 'before' ? 'is-warning' : 'is-success'
                                }`}>
                                  {photo.photo_type}
                                </span>
                                {photo.notes && (
                                  <p className="mt-1" title={photo.notes}>
                                    {photo.notes.length > 20 ? `${photo.notes.substring(0, 20)}...` : photo.notes}
                                  </p>
                                )}
                                <p className="has-text-grey is-size-7">
                                  {new Date(photo.created_at).toLocaleDateString()}
                                </p>
                                <button 
                                  className="button is-small is-danger is-outlined mt-1"
                                  onClick={() => deletePhoto(photo)}
                                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                                >
                                  <span className="icon is-small">
                                    <i className="fas fa-trash"></i>
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="has-text-centered py-3 mb-3">
                      <p className="has-text-grey">No photos uploaded yet.</p>
                    </div>
                  )}
                  
                  <h5 className="title is-5 mb-4">Appointment History</h5>
                  {clientHistory.length > 0 ? (
                    <div className="timeline" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      {clientHistory.map((appointment, index) => (
                        <div key={appointment.id} className="timeline-item">
                          <div className="timeline-marker" style={{
                            backgroundColor: appointment.book_status === 'completed' ? '#48c774' :
                                           appointment.book_status === 'cancelled' ? '#f14668' :
                                           appointment.book_status === 'booked' ? '#3273dc' : '#dbdbdb'
                          }}></div>
                          <div className="timeline-content">
                            <p className="heading">{new Date(appointment.slotdate).toLocaleDateString()}</p>
                            <div className="content">
                              <p>
                                <strong>{appointment.start_time.slice(0,5)} - {appointment.end_time.slice(0,5)}</strong>
                                {appointment.staff && (
                                  <span className="tag is-small is-info is-light ml-2">
                                    {appointment.staff.name}
                                  </span>
                                )}
                              </p>
                              {appointment.slot_service && appointment.slot_service.length > 0 && (
                                <div className="tags">
                                  {appointment.slot_service.map((ss, idx) => (
                                    <span key={idx} className="tag is-small is-light">
                                      {ss.service?.name || 'Unknown Service'}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <span className={`tag is-small ${
                                appointment.book_status === 'completed' ? 'is-success' :
                                appointment.book_status === 'cancelled' ? 'is-danger' :
                                appointment.book_status === 'booked' ? 'is-info' : 'is-light'
                              }`}>
                                {appointment.book_status || 'Available'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="has-text-centered py-4">
                      <p className="has-text-grey">No appointment history found.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
            <footer className="modal-card-foot">
              <button 
                className="button is-primary"
                onClick={() => {
                  setShowClientDetails(false)
                  handleEdit(selectedClient)
                }}
              >
                <span className="icon">
                  <i className="fas fa-edit"></i>
                </span>
                <span>Edit Client</span>
              </button>
              <button className="button" onClick={() => setShowClientDetails(false)}>Close</button>
            </footer>
          </div>
        </div>
      )}

      {/* Photo Upload Modal */}
      {showPhotoModal && (
        <div className="modal is-active">
          <div className="modal-background" onClick={() => setShowPhotoModal(false)}></div>
          <div className="modal-card">
            <header className="modal-card-head">
              <p className="modal-card-title">
                <span className="icon mr-2">
                  <i className="fas fa-camera"></i>
                </span>
                Add Photo for {selectedClient?.name}
              </p>
              <button className="delete" onClick={() => setShowPhotoModal(false)}></button>
            </header>
            <section className="modal-card-body">
              <div className="salon-field">
                <label className="salon-label">Photo Type</label>
                <div className="salon-control">
                  <div className="salon-select">
                    <select 
                      value={photoType} 
                      onChange={(e) => setPhotoType(e.target.value)}
                    >
                      <option value="before">Before</option>
                      <option value="after">After</option>
                      <option value="reference">Reference</option>
                      <option value="consultation">Consultation</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="salon-field">
                <label className="salon-label">Photo</label>
                <div className="salon-control">
                  <input 
                    className="salon-input" 
                    type="file" 
                    accept="image/*" 
                    id="photo-upload"
                    onChange={(e) => {
                      const file = e.target.files[0]
                      if (file) {
                        uploadPhoto(file, photoType, photoNotes)
                      }
                    }}
                  />
                </div>
                <p className="help">Accepted formats: JPG, PNG, GIF (max 5MB)</p>
              </div>
              
              <div className="salon-field">
                <label className="salon-label">Notes (Optional)</label>
                <div className="salon-control">
                  <textarea 
                    className="salon-textarea" 
                    placeholder="Add notes about this photo..."
                    value={photoNotes}
                    onChange={(e) => setPhotoNotes(e.target.value)}
                    rows="3"
                  />
                </div>
              </div>
            </section>
            <footer className="modal-card-foot">
              <button 
                className="button is-primary"
                onClick={() => document.getElementById('photo-upload').click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <span className="icon">
                    <i className="fas fa-spinner fa-spin"></i>
                  </span>
                ) : (
                  <span className="icon">
                    <i className="fas fa-upload"></i>
                  </span>
                )}
                <span>{uploadingPhoto ? 'Uploading...' : 'Choose Photo'}</span>
              </button>
              <button className="button" onClick={() => setShowPhotoModal(false)}>Cancel</button>
            </footer>
          </div>
        </div>
      )}

      {/* Photo View Modal */}
      {photoView && (
        <div className="modal is-active">
          <div className="modal-background" onClick={() => setPhotoView(null)}></div>
          <div className="modal-card" style={{ maxWidth: '800px' }}>
            <header className="modal-card-head">
              <p className="modal-card-title">
                <span className={`tag mr-2 ${
                  photoView.photo_type === 'before' ? 'is-warning' : 
                  photoView.photo_type === 'after' ? 'is-success' : 'is-info'
                }`}>
                  {photoView.photo_type}
                </span>
                Photo - {selectedClient?.name}
              </p>
              <button className="delete" onClick={() => setPhotoView(null)}></button>
            </header>
            <section className="modal-card-body has-text-centered">
              <figure className="image">
                <img src={photoView.photo_url} alt={`${photoView.photo_type} photo`} style={{ maxHeight: '500px', width: 'auto' }} />
              </figure>
              {photoView.notes && (
                <div className="content mt-4">
                  <p><strong>Notes:</strong> {photoView.notes}</p>
                </div>
              )}
              <p className="has-text-grey mt-2">
                Uploaded on {new Date(photoView.created_at).toLocaleDateString()}
              </p>
            </section>
            <footer className="modal-card-foot">
              <button 
                className="button is-danger"
                onClick={() => {
                  setPhotoView(null)
                  deletePhoto(photoView)
                }}
              >
                <span className="icon">
                  <i className="fas fa-trash"></i>
                </span>
                <span>Delete Photo</span>
              </button>
              <button className="button" onClick={() => setPhotoView(null)}>Close</button>
            </footer>
          </div>
        </div>
      )}

      {/* Communication Center Modal */}
      {showCommunicationModal && selectedClient && (
        <div className="modal is-active">
          <div className="modal-background" onClick={() => setShowCommunicationModal(false)}></div>
          <div className="modal-card" style={{ maxWidth: '700px', width: '90vw' }}>
            <header className="modal-card-head">
              <p className="modal-card-title">
                <span className="icon mr-2">
                  <i className="fas fa-comments"></i>
                </span>
                Communication Center - {selectedClient.name}
              </p>
              <button className="delete" onClick={() => setShowCommunicationModal(false)}></button>
            </header>
            <section className="modal-card-body">
              <div className="columns">
                <div className="column is-half">
                  <h5 className="title is-5 mb-4">Send Message</h5>
                  
                  <div className="salon-field">
                    <label className="salon-label">Message Type</label>
                    <div className="salon-control">
                      <div className="salon-select">
                        <select 
                          value={messageForm.type} 
                          onChange={(e) => setMessageForm({ ...messageForm, type: e.target.value })}
                        >
                          <option value="sms" disabled={!selectedClient.mobile}>
                            SMS {!selectedClient.mobile ? '(No mobile number)' : ''}
                          </option>
                          <option value="email" disabled={!selectedClient.email}>
                            Email {!selectedClient.email ? '(No email address)' : ''}
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {messageForm.type === 'email' && (
                    <div className="salon-field">
                      <label className="salon-label">Subject</label>
                      <div className="salon-control">
                        <input 
                          className="salon-input" 
                          type="text" 
                          placeholder="Email subject..."
                          value={messageForm.subject}
                          onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  <div className="salon-field">
                    <label className="salon-label">Message</label>
                    <div className="salon-control">
                      <textarea 
                        className="salon-textarea" 
                        placeholder={messageForm.type === 'sms' ? 'SMS message...' : 'Email message...'}
                        value={messageForm.message}
                        onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                        rows="5"
                      />
                    </div>
                    <p className="help">
                      {messageForm.type === 'sms' && selectedClient.mobile && `Sending to: ${formatPhoneNumber(selectedClient.mobile)}`}
                      {messageForm.type === 'email' && selectedClient.email && `Sending to: ${selectedClient.email}`}
                    </p>
                  </div>

                  <div className="field">
                    <div className="control">
                      <button 
                        className={`button is-success is-fullwidth ${sendingMessage ? 'is-loading' : ''}`}
                        onClick={sendMessage}
                        disabled={sendingMessage || !messageForm.message.trim() || 
                                 (messageForm.type === 'sms' && !selectedClient.mobile) ||
                                 (messageForm.type === 'email' && !selectedClient.email)}
                      >
                        <span className="icon">
                          <i className={`fas ${messageForm.type === 'sms' ? 'fa-sms' : 'fa-envelope'}`}></i>
                        </span>
                        <span>Send {messageForm.type === 'sms' ? 'SMS' : 'Email'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Templates */}
                  <div className="salon-field">
                    <label className="salon-label">Quick Templates</label>
                    <div className="buttons">
                      <button 
                        className="button is-small is-light"
                        onClick={() => setMessageForm({ 
                          ...messageForm, 
                          message: 'Hi! This is a friendly reminder about your upcoming appointment. Please confirm if you can make it. Thank you!'
                        })}
                      >
                        Appointment Reminder
                      </button>
                      <button 
                        className="button is-small is-light"
                        onClick={() => setMessageForm({ 
                          ...messageForm, 
                          message: 'Thank you for visiting us today! We hope you love your new look. Please feel free to share any feedback.'
                        })}
                      >
                        Follow-up
                      </button>
                      <button 
                        className="button is-small is-light"
                        onClick={() => setMessageForm({ 
                          ...messageForm, 
                          message: 'We have a special promotion this month! Contact us to learn more about our latest offers.'
                        })}
                      >
                        Promotion
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="column is-half">
                  <h5 className="title is-5 mb-4">Communication History</h5>
                  {communicationHistory.length > 0 ? (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      {communicationHistory.map(comm => (
                        <div key={comm.id} className="card mb-3">
                          <div className="card-content p-3">
                            <div className="is-flex is-justify-content-space-between is-align-items-center mb-2">
                              <span className={`tag is-small ${
                                comm.type === 'sms' ? 'is-success' : 'is-info'
                              }`}>
                                {comm.type.toUpperCase()}
                              </span>
                              <span className="has-text-grey is-size-7">
                                {new Date(comm.created_at).toLocaleDateString()} at {new Date(comm.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                            {comm.subject && (
                              <p className="has-text-weight-semibold mb-1">{comm.subject}</p>
                            )}
                            <p className="is-size-7">{comm.message}</p>
                            <div className="is-flex is-justify-content-space-between mt-2">
                              <span className={`tag is-small ${
                                comm.status === 'sent' ? 'is-success' : 
                                comm.status === 'delivered' ? 'is-info' : 
                                comm.status === 'failed' ? 'is-danger' : 'is-light'
                              }`}>
                                {comm.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="has-text-centered py-4">
                      <p className="has-text-grey">No communication history found.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
            <footer className="modal-card-foot">
              <button className="button" onClick={() => setShowCommunicationModal(false)}>Close</button>
            </footer>
          </div>
        </div>
      )}
    </div>
    </>
  )
}