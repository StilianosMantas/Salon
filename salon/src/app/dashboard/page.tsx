import { supabaseServer } from '@/lib/supabaseServer'
import Link from 'next/link'

export default async function Dashboard() {
  const supabase = supabaseServer()

  const { data } = await supabase
    .from('business_member')
    .select('business:id,business!inner(name),role')

  return (
    <main className="p-6 space-y-4">
      <h2 className="text-2xl">Your Salons</h2>
      <ul className="grid gap-4">
        {data?.map(b => (
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