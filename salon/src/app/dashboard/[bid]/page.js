import { createClient } from '@/lib/supabaseServer'

export default async function DashboardPage({ params }) {
  const { bid } = await params
  const supabase = await createClient()

  // Parallel queries for better performance
  const [
    { data: staff },
    { data: clients }
  ] = await Promise.all([
    supabase.from('staff').select('id').eq('business_id', bid),
    supabase.from('client').select('id').eq('business_id', bid)
  ])

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