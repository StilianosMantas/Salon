
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="hero is-fullheight is-primary">
      <div className="hero-body">
        <div className="container has-text-centered">
          <div className="columns is-vcentered">
            <div className="column is-8 is-offset-2">
              <h1 className="title is-1 has-text-white mb-6">
                Welcome to Salon Pro
              </h1>
              <h2 className="subtitle is-3 has-text-white-ter mb-6">
                Professional salon booking and management system
              </h2>
              <p className="is-size-5 has-text-white-bis mb-6">
                Streamline your salon operations with our comprehensive booking platform. 
                Manage appointments, staff, and clients all in one place.
              </p>
              
              <div className="columns is-mobile is-multiline is-centered">
                <div className="column is-half-mobile is-one-third-tablet is-narrow-desktop">
                  <div className="box has-text-centered p-6">
                    <div className="icon is-large has-text-primary mb-4">
                      <i className="fas fa-calendar-check fa-3x"></i>
                    </div>
                    <h3 className="title is-4 has-text-dark">Book Appointment</h3>
                    <p className="has-text-grey mb-4">
                      Schedule your next salon visit quickly and easily
                    </p>
                    <Link href="/book" className="button is-primary is-large is-fullwidth">
                      <span className="icon">
                        <i className="fas fa-calendar-plus"></i>
                      </span>
                      <span>Book Now</span>
                    </Link>
                  </div>
                </div>
                
                <div className="column is-half-mobile is-one-third-tablet is-narrow-desktop">
                  <div className="box has-text-centered p-6">
                    <div className="icon is-large has-text-info mb-4">
                      <i className="fas fa-user-cog fa-3x"></i>
                    </div>
                    <h3 className="title is-4 has-text-dark">Salon Staff</h3>
                    <p className="has-text-grey mb-4">
                      Access your salon dashboard and manage operations
                    </p>
                    <Link href="/login" className="button is-info is-large is-fullwidth">
                      <span className="icon">
                        <i className="fas fa-sign-in-alt"></i>
                      </span>
                      <span>Staff Login</span>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="content has-text-white-ter mt-6">
                <div className="columns is-mobile is-multiline">
                  <div className="column is-one-third">
                    <div className="has-text-centered">
                      <span className="icon is-large has-text-white">
                        <i className="fas fa-clock fa-2x"></i>
                      </span>
                      <h4 className="title is-6 has-text-white mt-2">24/7 Booking</h4>
                      <p className="is-size-7">Book appointments anytime, anywhere</p>
                    </div>
                  </div>
                  <div className="column is-one-third">
                    <div className="has-text-centered">
                      <span className="icon is-large has-text-white">
                        <i className="fas fa-mobile-alt fa-2x"></i>
                      </span>
                      <h4 className="title is-6 has-text-white mt-2">Mobile Friendly</h4>
                      <p className="is-size-7">Optimized for all devices</p>
                    </div>
                  </div>
                  <div className="column is-one-third">
                    <div className="has-text-centered">
                      <span className="icon is-large has-text-white">
                        <i className="fas fa-bell fa-2x"></i>
                      </span>
                      <h4 className="title is-6 has-text-white mt-2">Reminders</h4>
                      <p className="is-size-7">Never miss an appointment</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="hero-foot">
        <div className="container has-text-centered pb-4">
          <p className="has-text-white-ter is-size-7">
            © 2024 Salon Pro. Professional salon management made simple.
          </p>
        </div>
      </div>
    </div>
  )
}
