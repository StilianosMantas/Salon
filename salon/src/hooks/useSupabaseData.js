import useSWR, { mutate } from 'swr'
import { supabase } from '@/lib/supabaseClient'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { sanitizeFormData } from '@/lib/sanitization'
import { getCSRFToken } from '@/lib/csrf'
import { compressImage } from '@/utils/imageUtils'

// Fetcher function for SWR
const fetcher = async (url) => {
  const [table, businessId, ...params] = url.split('/')
  
  let query = supabase
    .from(table)
    .select('*')
    .eq('business_id', businessId)
  
  // Only show active records for client and staff tables (if active column exists)
  // TODO: Uncomment after adding 'active' column to client and staff tables
   if (table === 'client' || table === 'staff') {
     query = query.eq('active', true)
   }
  
  query = query.order('name')
  
  const { data, error } = await query
  
  if (error) throw error
  return data
}

// Clients
export function useClients(businessId) {
  return useSWR(
    businessId ? `client/${businessId}` : null,
    fetcher
  )
}

export function useClientMutations(businessId) {
  const [loading, setLoading] = useState(false)
  
  const checkClientUniqueness = async (email, mobile, excludeId = null) => {
    try {
      let query = supabase
        .from('client')
        .select('id, email, mobile')
        .eq('business_id', businessId)
      
      if (excludeId) {
        query = query.neq('id', excludeId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      if (email) {
        const emailExists = data.some(client => client.email === email)
        if (emailExists) throw new Error('Email already exists')
      }
      
      if (mobile) {
        const mobileExists = data.some(client => client.mobile === mobile)
        if (mobileExists) throw new Error('Mobile number already exists')
      }
      
      return true
    } catch (error) {
      throw error
    }
  }
  
  const createClient = async (clientData) => {
    setLoading(true)
    try {
      // Validate CSRF token
      const csrfToken = getCSRFToken()
      if (!csrfToken) {
        throw new Error('Security validation failed. Please refresh the page.')
      }

      // Check uniqueness before creating
      await checkClientUniqueness(clientData.email, clientData.mobile)

      // Sanitize data before sending to database
      const sanitizedData = sanitizeFormData(clientData)
      
      const { data, error } = await supabase
        .from('client')
        .insert({ ...sanitizedData, business_id: businessId })
        .select()
        .single()
      
      if (error) throw error
      
      // Revalidate the data
      mutate(`client/${businessId}`)
      toast.success('Client added successfully')
      return data
    } catch (error) {
      toast.error(`Failed to add client: ${error.message}`)
      throw error
    } finally {
      // Small delay to ensure proper state update
      setTimeout(() => setLoading(false), 100)
    }
  }

  const updateClient = async ({ id, ...updates }) => {
    setLoading(true)
    try {
      // Check uniqueness before updating (excluding current record)
      await checkClientUniqueness(updates.email, updates.mobile, id)
      
      // Sanitize updates before sending to database
      const sanitizedUpdates = sanitizeFormData(updates)
      
      const { data, error } = await supabase
        .from('client')
        .update(sanitizedUpdates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      
      mutate(`client/${businessId}`)
      toast.success('Client updated successfully')
      return data
    } catch (error) {
      toast.error(`Failed to update client: ${error.message}`)
      throw error
    } finally {
      // Small delay to ensure proper state update
      setTimeout(() => setLoading(false), 100)
    }
  }

  const deleteClient = async (id) => {
    setLoading(true)
    try {
      // Check if client has any appointments before soft delete
      const { data: appointments, error: appointmentError } = await supabase
        .from('appointment')
        .select('id')
        .eq('client_id', id)
        .limit(1)
      
      if (appointmentError) throw appointmentError
      
      // For now, always hard delete until 'active' column is added
      // TODO: Implement soft delete after adding 'active' column
      const { error } = await supabase
        .from('client')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      toast.success('Client deleted successfully')
      
      mutate(`client/${businessId}`)
    } catch (error) {
      toast.error(`Failed to delete client: ${error.message}`)
      throw error
    } finally {
      // Small delay to ensure proper state update
      setTimeout(() => setLoading(false), 100)
    }
  }

  const uploadClientAvatar = async (clientId, imageFile) => {
    setLoading(true)
    try {
      // Compress image to 300x300px with 80% quality
      const compressedImage = await compressImage(imageFile, 300, 300, 0.8)
      
      // Generate unique filename
      const timestamp = Date.now()
      const fileName = `client_${clientId}_${timestamp}.jpg`
      
      // Upload to client-photos bucket (reusing existing bucket)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('client-photos')
        .upload(fileName, compressedImage, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (uploadError) throw uploadError
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('client-photos')
        .getPublicUrl(fileName)
      
      // Update client record with avatar URL
      const { data, error } = await supabase
        .from('client')
        .update({ avatar_url: publicUrl })
        .eq('id', clientId)
        .select()
        .single()
      
      if (error) throw error
      
      mutate(`client/${businessId}`)
      toast.success('Avatar uploaded successfully')
      return data
    } catch (error) {
      toast.error(`Failed to upload avatar: ${error.message}`)
      throw error
    } finally {
      setTimeout(() => setLoading(false), 100)
    }
  }

  const deleteClientAvatar = async (clientId, avatarUrl) => {
    setLoading(true)
    try {
      // Extract filename from URL
      const fileName = avatarUrl.split('/').pop()
      
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('client-photos')
        .remove([fileName])
      
      if (deleteError) throw deleteError
      
      // Update client record to remove avatar URL
      const { data, error } = await supabase
        .from('client')
        .update({ avatar_url: null })
        .eq('id', clientId)
        .select()
        .single()
      
      if (error) throw error
      
      mutate(`client/${businessId}`)
      toast.success('Avatar removed successfully')
      return data
    } catch (error) {
      toast.error(`Failed to remove avatar: ${error.message}`)
      throw error
    } finally {
      setTimeout(() => setLoading(false), 100)
    }
  }

  return { createClient, updateClient, deleteClient, checkClientUniqueness, uploadClientAvatar, deleteClientAvatar, loading }
}

// Staff
export function useStaff(businessId) {
  return useSWR(
    businessId ? `staff/${businessId}` : null,
    fetcher
  )
}

export function useStaffMutations(businessId) {
  const [loading, setLoading] = useState(false)
  
  const createStaff = async (staffData) => {
    setLoading(true)
    try {
      const sanitizedData = sanitizeFormData(staffData)
      
      const { data, error } = await supabase
        .from('staff')
        .insert({ ...sanitizedData, business_id: businessId })
        .select()
        .single()
      
      if (error) throw error
      
      mutate(`staff/${businessId}`)
      toast.success('Staff member added successfully')
      return data
    } catch (error) {
      toast.error(`Failed to add staff member: ${error.message}`)
      throw error
    } finally {
      // Small delay to ensure proper state update
      setTimeout(() => setLoading(false), 100)
    }
  }

  const updateStaff = async ({ id, ...updates }) => {
    setLoading(true)
    try {
      const sanitizedUpdates = sanitizeFormData(updates)
      
      const { data, error } = await supabase
        .from('staff')
        .update(sanitizedUpdates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      
      mutate(`staff/${businessId}`)
      toast.success('Staff member updated successfully')
      return data
    } catch (error) {
      toast.error(`Failed to update staff member: ${error.message}`)
      throw error
    } finally {
      // Small delay to ensure proper state update
      setTimeout(() => setLoading(false), 100)
    }
  }

  const deleteStaff = async (id) => {
    setLoading(true)
    try {
      // Check if staff has any appointments before delete (gracefully handle if table doesn't exist)
      try {
        const { data: appointments, error: appointmentError } = await supabase
          .from('appointment')
          .select('id')
          .eq('staff_id', id)
          .limit(1)
        
        if (appointmentError && !appointmentError.message.includes('does not exist')) {
          throw appointmentError
        }
        
        if (appointments && appointments.length > 0) {
          toast.error('Cannot delete staff member with existing appointments')
          return
        }
      } catch (appointmentError) {
        // If appointment table doesn't exist, continue with deletion
        if (!appointmentError.message?.includes('does not exist')) {
          throw appointmentError
        }
      }
      
      // For now, always hard delete until 'active' column is added
      // TODO: Implement soft delete after adding 'active' column
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      toast.success('Staff member deleted successfully')
      
      mutate(`staff/${businessId}`)
    } catch (error) {
      toast.error(`Failed to delete staff member: ${error.message}`)
      throw error
    } finally {
      // Small delay to ensure proper state update
      setTimeout(() => setLoading(false), 100)
    }
  }

  const uploadStaffAvatar = async (staffId, imageFile) => {
    setLoading(true)
    try {
      // Compress image to 300x300px with 80% quality
      const compressedImage = await compressImage(imageFile, 300, 300, 0.8)
      
      // Generate unique filename
      const timestamp = Date.now()
      const fileName = `staff_${staffId}_${timestamp}.jpg`
      
      // Upload to staff-avatars bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('staff-avatars')
        .upload(fileName, compressedImage, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (uploadError) throw uploadError
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('staff-avatars')
        .getPublicUrl(fileName)
      
      // Update staff record with avatar URL
      const { data, error } = await supabase
        .from('staff')
        .update({ avatar_url: publicUrl })
        .eq('id', staffId)
        .select()
        .single()
      
      if (error) throw error
      
      mutate(`staff/${businessId}`)
      toast.success('Avatar uploaded successfully')
      return data
    } catch (error) {
      toast.error(`Failed to upload avatar: ${error.message}`)
      throw error
    } finally {
      setTimeout(() => setLoading(false), 100)
    }
  }

  const deleteStaffAvatar = async (staffId, avatarUrl) => {
    setLoading(true)
    try {
      // Extract filename from URL
      const fileName = avatarUrl.split('/').pop()
      
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('staff-avatars')
        .remove([fileName])
      
      if (deleteError) throw deleteError
      
      // Update staff record to remove avatar URL
      const { data, error } = await supabase
        .from('staff')
        .update({ avatar_url: null })
        .eq('id', staffId)
        .select()
        .single()
      
      if (error) throw error
      
      mutate(`staff/${businessId}`)
      toast.success('Avatar removed successfully')
      return data
    } catch (error) {
      toast.error(`Failed to remove avatar: ${error.message}`)
      throw error
    } finally {
      setTimeout(() => setLoading(false), 100)
    }
  }

  const updateStaffAvatarAndSync = async (staffId, imageFile) => {
    setLoading(true)
    try {
      // Upload staff avatar
      const result = await uploadStaffAvatar(staffId, imageFile)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return result
      
      // Check if this staff member is the current user by email
      const staff = await supabase
        .from('staff')
        .select('email, avatar_url')
        .eq('id', staffId)
        .single()
      
      if (staff.data && staff.data.email === user.email) {
        // Update user profile with the same avatar
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            avatar_url: staff.data.avatar_url,
            updated_at: new Date().toISOString()
          })
      }
      
      return result
    } catch (error) {
      toast.error(`Failed to sync avatar: ${error.message}`)
      throw error
    } finally {
      setTimeout(() => setLoading(false), 100)
    }
  }

  return { createStaff, updateStaff, deleteStaff, uploadStaffAvatar, deleteStaffAvatar, updateStaffAvatarAndSync, loading }
}

// User Profile
export function useProfile() {
  const fetcher = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
    return data
  }
  
  return useSWR('profile', fetcher)
}

export function useProfileMutations() {
  const [loading, setLoading] = useState(false)
  
  const updateProfile = async (updates) => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...updates,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) throw error
      
      mutate('profile')
      toast.success('Profile updated successfully')
      return data
    } catch (error) {
      toast.error(`Failed to update profile: ${error.message}`)
      throw error
    } finally {
      setTimeout(() => setLoading(false), 100)
    }
  }
  
  const uploadProfileAvatar = async (imageFile) => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      
      // Compress image to 300x300px with 80% quality
      const compressedImage = await compressImage(imageFile, 300, 300, 0.8)
      
      // Generate unique filename
      const timestamp = Date.now()
      const fileName = `profile_${user.id}_${timestamp}.jpg`
      
      // Upload to staff-avatars bucket (reusing existing bucket)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('staff-avatars')
        .upload(fileName, compressedImage, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (uploadError) throw uploadError
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('staff-avatars')
        .getPublicUrl(fileName)
      
      // Update profile with avatar URL
      return await updateProfile({ avatar_url: publicUrl })
    } catch (error) {
      toast.error(`Failed to upload avatar: ${error.message}`)
      throw error
    } finally {
      setTimeout(() => setLoading(false), 100)
    }
  }
  
  return { updateProfile, uploadProfileAvatar, loading }
}

// Services
export function useServices(businessId) {
  return useSWR(
    businessId ? `service/${businessId}` : null,
    fetcher
  )
}

export function useServiceMutations(businessId) {
  const [loading, setLoading] = useState(false)
  
  const createService = async (serviceData) => {
    setLoading(true)
    try {
      const sanitizedData = sanitizeFormData(serviceData)
      
      const { data, error } = await supabase
        .from('service')
        .insert({ ...sanitizedData, business_id: businessId })
        .select()
        .single()
      
      if (error) throw error
      
      mutate(`service/${businessId}`)
      toast.success('Service added successfully')
      return data
    } catch (error) {
      toast.error(`Failed to add service: ${error.message}`)
      throw error
    } finally {
      // Small delay to ensure proper state update
      setTimeout(() => setLoading(false), 100)
    }
  }

  const updateService = async ({ id, ...updates }) => {
    setLoading(true)
    try {
      const sanitizedUpdates = sanitizeFormData(updates)
      
      const { data, error } = await supabase
        .from('service')
        .update(sanitizedUpdates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      
      mutate(`service/${businessId}`)
      toast.success('Service updated successfully')
      return data
    } catch (error) {
      toast.error(`Failed to update service: ${error.message}`)
      throw error
    } finally {
      // Small delay to ensure proper state update
      setTimeout(() => setLoading(false), 100)
    }
  }

  const deleteService = async (id) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('service')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      mutate(`service/${businessId}`)
      toast.success('Service deleted successfully')
    } catch (error) {
      toast.error(`Failed to delete service: ${error.message}`)
      throw error
    } finally {
      // Small delay to ensure proper state update
      setTimeout(() => setLoading(false), 100)
    }
  }

  return { createService, updateService, deleteService, loading }
}

// Shift Templates
export function useShiftTemplates(businessId) {
  return useSWR(
    businessId ? `shift_templates/${businessId}` : null,
    fetcher
  )
}

export function useShiftTemplateMutations(businessId) {
  const [loading, setLoading] = useState(false)
  
  const createShiftTemplate = async (templateData) => {
    setLoading(true)
    try {
      const sanitizedData = sanitizeFormData(templateData)
      
      const { data, error } = await supabase
        .from('shift_templates')
        .insert({ ...sanitizedData, business_id: businessId })
        .select()
        .single()
      
      if (error) throw error
      
      mutate(`shift_templates/${businessId}`)
      toast.success('Shift template added successfully')
      return data
    } catch (error) {
      toast.error(`Failed to add shift template: ${error.message}`)
      throw error
    } finally {
      setTimeout(() => setLoading(false), 100)
    }
  }

  const updateShiftTemplate = async ({ id, ...updates }) => {
    setLoading(true)
    try {
      const sanitizedUpdates = sanitizeFormData(updates)
      
      const { data, error } = await supabase
        .from('shift_templates')
        .update(sanitizedUpdates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      
      mutate(`shift_templates/${businessId}`)
      toast.success('Shift template updated successfully')
      return data
    } catch (error) {
      toast.error(`Failed to update shift template: ${error.message}`)
      throw error
    } finally {
      setTimeout(() => setLoading(false), 100)
    }
  }

  const deleteShiftTemplate = async (id) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('shift_templates')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      mutate(`shift_templates/${businessId}`)
      toast.success('Shift template deleted successfully')
    } catch (error) {
      toast.error(`Failed to delete shift template: ${error.message}`)
      throw error
    } finally {
      setTimeout(() => setLoading(false), 100)
    }
  }

  return { createShiftTemplate, updateShiftTemplate, deleteShiftTemplate, loading }
}

// Business/Salon Avatar Functions
export function useBusinessMutations(businessId) {
  const [loading, setLoading] = useState(false)
  
  const uploadBusinessAvatar = async (imageFile) => {
    setLoading(true)
    try {
      // Compress image to 300x300px with 80% quality
      const compressedImage = await compressImage(imageFile, 300, 300, 0.8)
      
      // Generate unique filename
      const timestamp = Date.now()
      const fileName = `business_${businessId}_${timestamp}.jpg`
      
      // Upload to staff-avatars bucket (reusing existing bucket)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('staff-avatars')
        .upload(fileName, compressedImage, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (uploadError) throw uploadError
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('staff-avatars')
        .getPublicUrl(fileName)
      
      // Update business record with avatar URL
      const { data, error } = await supabase
        .from('business')
        .update({ avatar_url: publicUrl })
        .eq('id', businessId)
        .select()
        .single()
      
      if (error) throw error
      
      toast.success('Salon logo uploaded successfully')
      return data
    } catch (error) {
      toast.error(`Failed to upload logo: ${error.message}`)
      throw error
    } finally {
      setTimeout(() => setLoading(false), 100)
    }
  }

  const deleteBusinessAvatar = async (avatarUrl) => {
    setLoading(true)
    try {
      // Extract filename from URL
      const fileName = avatarUrl.split('/').pop()
      
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('staff-avatars')
        .remove([fileName])
      
      if (deleteError) throw deleteError
      
      // Update business record to remove avatar URL
      const { data, error } = await supabase
        .from('business')
        .update({ avatar_url: null })
        .eq('id', businessId)
        .select()
        .single()
      
      if (error) throw error
      
      toast.success('Salon logo removed successfully')
      return data
    } catch (error) {
      toast.error(`Failed to remove logo: ${error.message}`)
      throw error
    } finally {
      setTimeout(() => setLoading(false), 100)
    }
  }

  return { uploadBusinessAvatar, deleteBusinessAvatar, loading }
}