import { serve } from 'https://deno.land/x/sift@0.6.0/mod.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

serve(async (req) => {
  const body = await req.json()
  const { name, slot_length } = body

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  )

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return new Response('unauthenticated', { status: 401 })
  }

  const { data, error } = await supabase
    .from('business')
    .insert({ name, slot_length, owner_id: user.id })
    .select('id')
    .single()

  if (error) {
    return new Response(error.message, { status: 400 })
  }

  await supabase
    .from('business_member')
    .insert({ business_id: data.id, user_id: user.id, role: 'owner' })

  return new Response(
    JSON.stringify({ id: data.id }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})