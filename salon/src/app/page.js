
import Link from 'next/link'
export default function HomePage() {
  return (
    <div>
      <h1>Welcome to Salon System</h1>
      <Link href="/login">Login</Link>
      <Link href="/book/sample-salon">Book a Slot</Link>
    </div>
  )
}
