'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function Login() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  /* ✧ redirect the moment a session exists */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (session) router.replace('/dashboard')
    })
    return () => subscription.unsubscribe()
  }, [router, supabase])

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        redirectTo={`${location.origin}/login`}   /* magic-link resumes here */
      />
    </main>
  )
}