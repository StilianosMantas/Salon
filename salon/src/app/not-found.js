import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="hero is-fullheight">
      <div className="hero-body">
        <div className="container has-text-centered">
          <div className="columns is-vcentered">
            <div className="column is-6 is-offset-3">
              <div className="content">
                <div className="icon is-large has-text-grey-light mb-4">
                  <i className="fas fa-exclamation-triangle fa-4x"></i>
                </div>
                <h1 className="title is-1 has-text-grey">404</h1>
                <h2 className="subtitle is-3 has-text-grey">Page Not Found</h2>
                <p className="is-size-5 has-text-grey mb-6">
                  Sorry, the page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
                
                <div className="buttons is-centered">
                  <Link href="/" className="button is-primary is-medium">
                    <span className="icon">
                      <i className="fas fa-home"></i>
                    </span>
                    <span>Go Home</span>
                  </Link>
                  <Link href="/book" className="button is-info is-medium">
                    <span className="icon">
                      <i className="fas fa-calendar-plus"></i>
                    </span>
                    <span>Book Appointment</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}