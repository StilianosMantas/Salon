import BookingWidget from '@/components/BookingWidget'
import { supabaseServer } from '@/lib/supabaseServer'

export default async function Tenant({ params }: { params: { slug: string } }) {
  const supabase    = supabaseServer()
  const { data }    = await supabase
    .from('business')
    .select('name, description')
    .eq('id', params.slug)
    .single()

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-6">
      <h1 className="text-3xl font-semibold">{data?.name}</h1>
      <p>{data?.description}</p>
      <BookingWidget />
    </main>
  )
}