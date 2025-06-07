import { createClient } from '@/lib/supabaseServer'

export default async function DashboardPage({ params }) {
  const { bid } = await params
  const supabase = await createClient()

  // Example: Fetch number of staff and clients (will handle auth errors gracefully)
  const { data: staff } = await supabase.from('staff').select('*').eq('business_id', bid)
  const { data: clients } = await supabase.from('client').select('*').eq('business_id', bid)

  return (
    <div>
      <h1 className="title is-4 mb-5">Welcome to Your Salon</h1>
      <div className="columns">
        <div className="column is-half">
          <div className="box has-text-centered">
            <h2 className="subtitle is-5">Staff Members</h2>
            <p className="title is-2 has-text-primary">{staff?.length || 0}</p>
          </div>
        </div>
        <div className="column is-half">
          <div className="box has-text-centered">
            <h2 className="subtitle is-5">Clients</h2>
            <p className="title is-2 has-text-info">{clients?.length || 0}</p>
          </div>
        </div>
      </div>
    </div>
  )
}