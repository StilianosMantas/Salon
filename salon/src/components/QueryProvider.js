'use client'

import { SWRConfig } from 'swr'

export default function SWRProvider({ children }) {
  return (
    <SWRConfig 
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 5000,
        focusThrottleInterval: 10000,
        errorRetryCount: 2,
        errorRetryInterval: 3000,
        refreshInterval: 0,
        refreshWhenHidden: false,
        refreshWhenOffline: false,
        onError: (error) => {
          // Don't retry on auth errors
          if (error?.status === 401 || error?.status === 403) {
            console.error('Authentication error:', error)
          }
        },
        onLoadingSlow: () => {
          console.warn('SWR request is taking longer than expected')
        },
      }}
    >
      {children}
    </SWRConfig>
  )
}