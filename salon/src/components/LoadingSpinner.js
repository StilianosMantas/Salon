'use client'

export default function LoadingSpinner({ message = 'Loading...', fullScreen = false }) {
  const spinner = (
    <div className="loader-wrapper is-flex is-flex-direction-column is-align-items-center is-justify-content-center">
      <div className="loader is-loading"></div>
      {message && <p className="mt-4 has-text-grey">{message}</p>}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="modal is-active">
        <div className="modal-background"></div>
        <div className="modal-content has-text-centered">
          {spinner}
        </div>
      </div>
    )
  }

  return spinner
}