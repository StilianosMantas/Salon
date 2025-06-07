'use client'

export default function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div className="container py-5">
      <div className="has-text-centered">
        <div className="loader is-loading" style={{ 
          width: '3rem', 
          height: '3rem', 
          margin: '0 auto 1rem auto' 
        }}></div>
        <p className="has-text-grey">{message}</p>
      </div>
    </div>
  )
}