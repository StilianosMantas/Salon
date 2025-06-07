'use client'

import { SWRConfig } from 'swr'

export default function SWRProvider({ children }) {
  return (
    <SWRConfig 
      value={{
        revalidateOnFocus: false,
        dedupingInterval: 2000,
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        onError: (error) => {
          // Don't retry on auth errors
          if (error?.status === 401 || error?.status === 403) {
            console.error('Authentication error:', error)
          }
        },
      }}
    >
      {children}
    </SWRConfig>
  )
}