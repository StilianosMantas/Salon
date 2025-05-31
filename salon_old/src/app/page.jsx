import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseServer } from '@/lib/supabaseServer'

export default async function Home() {
  const supabase = supabaseServer()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-gray-50 dark:bg-gray-900 text-center">
      <h1 className="max-w-2xl text-5xl font-bold">Salon booking that just works</h1>
      <p className="max-w-xl text-lg">Free while you onboard your first ten salons.</p>
      <Link href="/login" className="rounded-xl bg-brand-600 px-8 py-3 text-white shadow hover:bg-brand-700">
        Sign in / Sign up
      </Link>
    </main>
  )
}