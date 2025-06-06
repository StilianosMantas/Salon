import Link from 'next/link'
import { createClient } from '@/lib/supabaseServer'

export default async function DashboardSelectPage() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  // Get user's salon memberships with business names if user exists
  const { data: memberships, error: membershipError } = user
    ? await supabase
        .from('business_member')
        .select(`
          business_id,
          business:business_id (
            name,
            description
          )
        `)
        .eq('user_id', user.id)
    : { data: null, error: null }

  if (membershipError || !memberships || memberships.length === 0) {
    return (
      <div className="container py-5">
        <div className="notification is-warning">
          <h1 className="title">Welcome to Your Salon Dashboard</h1>
          <p>You don&apos;t have access to any salons yet. Please contact your salon administrator to get access.</p>
          <Link href="/login">
            <button className="button is-primary mt-3">
              Back to Login
            </button>
          </Link>
        </div>
      </div>
    )
  }

  // If user has access to only one salon, show it but don't redirect
  if (memberships.length === 1) {
    return (
      <div className="container py-5">
        <h1 className="title">Your Salon</h1>
        <div className="columns">
          <div className="column is-one-third">
            <div className="card">
              <div className="card-content">
                <div className="content">
                  <h2 className="subtitle">
                    {memberships[0].business?.name || `Salon ${memberships[0].business_id}`}
                  </h2>
                  {memberships[0].business?.description && (
                    <p className="content">{memberships[0].business.description}</p>
                  )}
                  <Link href={`/dashboard/${memberships[0].business_id}`}>
                    <button className="button is-primary">
                      Access Dashboard
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // If user has access to multiple salons, show selection
  return (
    <div className="container py-5">
      <h1 className="title">Select Salon</h1>
      <div className="columns">
        {memberships.map((membership) => (
          <div key={membership.business_id} className="column is-one-third">
            <div className="card">
              <div className="card-content">
                <div className="content">
                  <h2 className="subtitle">
                    {membership.business?.name || `Salon ${membership.business_id}`}
                  </h2>
                  {membership.business?.description && (
                    <p className="content">{membership.business.description}</p>
                  )}
                  <Link href={`/dashboard/${membership.business_id}`}>
                    <button className="button is-primary">
                      Access Dashboard
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}