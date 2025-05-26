import { ReactNode } from 'react'
import Link from 'next/link'
import { supabaseServer } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode
  params: { bid: string }
}) {
  const supabase = supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const base = `/dashboard/${params.bid}`

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-60 shrink-0 border-r bg-white">
        <div className="p-6 text-xl font-semibold">Salon Owner</div>
        <nav className="space-y-1 px-4 text-sm">
          <Link className="block rounded px-3 py-2 hover:bg-gray-100" href={base}>
            Overview
          </Link>
          <Link className="block rounded px-3 py-2 hover:bg-gray-100" href={`${base}/calendar`}>
            Calendar
          </Link>
          <Link className="block rounded px-3 py-2 hover:bg-gray-100" href={`${base}/services`}>
            Services
          </Link>
          <Link className="block rounded px-3 py-2 hover:bg-gray-100" href={`${base}/clients`}>
            Clients
          </Link>
          <Link className="block rounded px-3 py-2 hover:bg-gray-100" href={`${base}/staff`}>
            Staff
          </Link>
          <Link className="block rounded px-3 py-2 hover:bg-gray-100" href={`${base}/settings`}>
            Settings
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}