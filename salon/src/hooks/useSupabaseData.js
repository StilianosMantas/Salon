import useSWR, { mutate } from 'swr'
import { supabase } from '@/lib/supabaseClient'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { sanitizeFormData } from '@/lib/sanitization'
import { getCSRFToken } from '@/lib/csrf'

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

  return { createClient, updateClient, deleteClient, checkClientUniqueness, loading }
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

  return { createStaff, updateStaff, deleteStaff, loading }
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