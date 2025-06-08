'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function NavigationLoader() {
  const [loading, setLoading] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleStart = () => setLoading(true)
    const handleComplete = () => setLoading(false)

    // Listen for route changes
    let timeout

    const startLoading = () => {
      timeout = setTimeout(() => setLoading(true), 100)
    }

    const stopLoading = () => {
      clearTimeout(timeout)
      setLoading(false)
    }

    // Reset loading when pathname changes
    stopLoading()

    // Intercept navigation
    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState

    window.history.pushState = function(...args) {
      startLoading()
      return originalPushState.apply(this, args)
    }

    window.history.replaceState = function(...args) {
      startLoading()
      return originalReplaceState.apply(this, args)
    }

    // Listen for popstate (back/forward buttons)
    window.addEventListener('popstate', startLoading)

    return () => {
      clearTimeout(timeout)
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
      window.removeEventListener('popstate', startLoading)
    }
  }, [pathname])

  if (!loading) return null

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(2px)'
      }}
    >
      <progress className="progress is-small is-primary" max="100" style={{ margin: 0, borderRadius: 0 }}>
        Loading...
      </progress>
    </div>
  )
}