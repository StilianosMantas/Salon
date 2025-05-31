'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function Login() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) router.replace('/dashboard')
    })
    return () => subscription.unsubscribe()
  }, [router, supabase])
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
      <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} redirectTo={`${location.origin}/login`} />
    </main>
  )
}