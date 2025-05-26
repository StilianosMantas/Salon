// src/lib/supabaseServer.ts
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
 

export const supabaseServer = () => {
  const cookieStore = cookies()                      // 1️⃣ call once
  return createServerComponentClient({
    cookies: () => cookieStore,                     // 2️⃣ pass getter
  })
}