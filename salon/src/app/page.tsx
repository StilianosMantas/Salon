import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-gradient-to-br from-rose-50 to-amber-50 p-6 text-center">
      <h1 className="max-w-2xl text-5xl font-extrabold leading-tight tracking-tight text-gray-900">
        Salon booking that&nbsp;just&nbsp;works
      </h1>
      <p className="max-w-xl text-lg text-gray-600">
        Give clients a two-tap experience and keep chairs full—all on the free
        tier while you grow your first ten salons.
      </p>
      <Link
        href="/login"
        className="rounded-xl bg-rose-600 px-8 py-3 text-lg font-medium text-white shadow-md transition hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-300"
      >
        Sign in / Sign up
      </Link>
    </main>
  )
}