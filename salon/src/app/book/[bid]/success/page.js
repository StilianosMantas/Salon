'use client'

import Link from 'next/link'

export default function BookingSuccessPage() {
  return (
    <div className="container has-text-centered">
      <h1 className="title is-3 mt-6">🎉 Booking Confirmed!</h1>
      <p className="mb-4">Thank you for your reservation. We look forward to seeing you!</p>
      <Link href="/" className="button is-link is-light">
        Return to Home
      </Link>
    </div>
  )
}

