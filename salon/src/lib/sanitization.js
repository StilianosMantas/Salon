import DOMPurify from 'dompurify'

// Create sanitization utility
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input
  
  // For server-side rendering, we need to check if window exists
  if (typeof window === 'undefined') {
    // Server-side: basic HTML entity encoding
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .trim()
  }
  
  // Client-side: use DOMPurify
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [] // Strip all attributes
  }).trim()
}

// Sanitize objects recursively
export const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj
  
  const sanitized = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value)
    } else if (Array.isArray(value)) {
      // Handle arrays - for PostgreSQL array columns, ensure proper format
      sanitized[key] = value.filter(item => item !== null && item !== undefined)
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value)
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}

// Sanitize form data specifically
export const sanitizeFormData = (formData) => {
  return sanitizeObject(formData)
}