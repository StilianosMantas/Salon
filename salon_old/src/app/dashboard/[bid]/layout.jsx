import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

export default async function DashboardLayout(props) {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ⚠️ Access props.params safely AFTER all dynamic APIs
  const bid = props.params.bid
  const base = `/dashboard/${bid}`

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <aside className="w-60 shrink-0 border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="p-6 text-xl font-semibold text-gray-800 dark:text-gray-100">
          Salon Owner
        </div>
        <nav className="space-y-1 px-4 text-sm">
          <a className="block rounded px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" href={`${base}`}>
            Overview
          </a>
          <a className="block rounded px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" href={`${base}/staff`}>
            Staff
          </a>
          <a className="block rounded px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" href={`${base}/clients`}>
            Clients
          </a>
          <a className="block rounded px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" href={`${base}/services`}>
            Services
          </a>
          <a className="block rounded px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" href={`${base}/bookings`}>
            Bookings
          </a>
        </nav>
      </aside>
      <main className="flex-1">{props.children}</main>
    </div>
  )
}