'use client'

import { useEffect } from 'react'
import { initializeCSRF } from '@/lib/csrf'

export default function CSRFProvider({ children }) {
  useEffect(() => {
    // Initialize CSRF token on mount
    initializeCSRF()
  }, [])

  return children
}