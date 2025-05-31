import { createClient } from '@/lib/supabaseServer'

export default async function DashboardPage({ params }) {
  const { bid } = await params
  const supabase = await createClient()

  // Example: Fetch number of staff and clients (will handle auth errors gracefully)
  const { data: staff } = await supabase.from('staff').select('*').eq('business_id', bid)
  const { data: clients } = await supabase.from('client').select('*').eq('business_id', bid)

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Welcome to Your Salon</h1>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border rounded bg-white shadow-sm">
          <h2 className="text-lg font-semibold">Staff Members</h2>
          <p className="text-3xl">{staff?.length || 0}</p>
        </div>
        <div className="p-4 border rounded bg-white shadow-sm">
          <h2 className="text-lg font-semibold">Clients</h2>
          <p className="text-3xl">{clients?.length || 0}</p>
        </div>
      </div>
    </div>
  )
}