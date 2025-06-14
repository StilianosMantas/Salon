import useSWR, { mutate } from 'swr'
import { supabase } from '@/lib/supabaseClient'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { sanitizeFormData } from '@/lib/sanitization'
import { getCSRFToken } from '@/lib/csrf'

// Fetcher function for SWR
const fetcher = async (url) => {
  const [table, businessId, ...params] = url.split('/')
  
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('business_id', businessId)
    .order('name')
  
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
  
  const createClient = async (clientData) => {
    setLoading(true)
    try {
      // Validate CSRF token
      const csrfToken = getCSRFToken()
      if (!csrfToken) {
        throw new Error('Security validation failed. Please refresh the page.')
      }

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
      const { error } = await supabase
        .from('client')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      mutate(`client/${businessId}`)
      toast.success('Client deleted successfully')
    } catch (error) {
      toast.error(`Failed to delete client: ${error.message}`)
      throw error
    } finally {
      // Small delay to ensure proper state update
      setTimeout(() => setLoading(false), 100)
    }
  }

  return { createClient, updateClient, deleteClient, loading }
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
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      mutate(`staff/${businessId}`)
      toast.success('Staff member deleted successfully')
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