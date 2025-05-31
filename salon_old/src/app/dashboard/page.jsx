import Link from 'next/link'
import { supabaseServer } from '@/lib/supabaseServer'

export default async function Dashboard() {
  const supabase = supabaseServer()
  const { data, error } = await supabase
    .from('business_member')
    .select('role, business(id, name)')
  if (error)
    return (
      <main className="flex h-screen items-center justify-center">
        <p className="text-red-600">Database error</p>
      </main>
    )
  if (!data || data.length === 0)
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-semibold">No salons yet</h1>
        <Link href="/onboarding" className="rounded-lg bg-brand-600 px-6 py-3 text-white shadow hover:bg-brand-700">
          Create your first salon
        </Link>
      </main>
    )
  return (
    <main className="p-6 space-y-4">
      <h2 className="text-2xl">Your Salons</h2>
      <ul className="grid gap-4">
        {data.map((b) => (
          <li key={b.business.id} className="rounded-lg border p-4">
            <h3 className="font-medium">{b.business.name}</h3>
            <p className="text-sm">{b.role}</p>
            <Link href={`/dashboard/${b.business.id}`}>Manage</Link>
          </li>
        ))}
      </ul>
    </main>
  )
}