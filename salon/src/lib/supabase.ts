// works for the **App Router** (Next.js 13/14)

import { cookies } from 'next/headers'
import {
  createClientComponentClient,
  createServerComponentClient,
} from '@supabase/auth-helpers-nextjs'
//import type { Database } from '@/types/supabase'          // optional generated types

/** Supabase for *client* components (`'use client'`) */
export const createSupabaseBrowserClient = () =>
  createClientComponentClient()

export const createSupabaseServerClient = () =>
  createServerComponentClient({ cookies })