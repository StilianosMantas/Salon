// CSRF protection utilities
export const generateCSRFToken = () => {
  if (typeof window === 'undefined') return null
  
  // Generate a random token
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export const setCSRFToken = (token) => {
  if (typeof window === 'undefined') return
  sessionStorage.setItem('csrf_token', token)
}

export const getCSRFToken = () => {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('csrf_token')
}

export const validateCSRFToken = (token) => {
  const storedToken = getCSRFToken()
  return storedToken && storedToken === token
}

// Initialize CSRF token on page load
export const initializeCSRF = () => {
  if (typeof window === 'undefined') return null
  
  let token = getCSRFToken()
  if (!token) {
    token = generateCSRFToken()
    setCSRFToken(token)
  }
  return token
}