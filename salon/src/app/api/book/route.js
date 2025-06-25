
import { createClient } from '@/lib/supabaseServer'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'

const bookingSchema = z.object({
  bid: z.string().uuid(),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid(),
  slot: z.string(),
  date: z.string(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone is required'),
})

export async function POST(request) {
  const csrfToken = request.headers.get('x-csrf-token')
  const cookieStore = cookies()
  const csrfCookie = cookieStore.get('csrf_token')

  if (!csrfToken || !csrfCookie || csrfToken !== csrfCookie.value) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }

  const supabase = await createClient()
  const body = await request.json()

  const result = bookingSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 })
  }

  const { bid, serviceId, staffId, slot, date, name, email, phone } = result.data

  try {
    const { data, error } = await supabase.rpc('create_booking', {
      p_business_id: bid,
      p_service_id: serviceId,
      p_staff_id: staffId,
      p_slot: slot,
      p_date: date,
      p_client_name: name,
      p_client_email: email,
      p_client_phone: phone,
    })

    if (error) throw error

    return NextResponse.json({ success: true, appointmentId: data })

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
