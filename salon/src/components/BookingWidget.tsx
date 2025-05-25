'use client'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createSupabaseServerClient } from '@/lib/supabase'
import { format } from 'date-fns'

type Slot = { id: number; slotdate: string; start_time: string }

export default function BookingWidget() {
  const { slug } = useParams<{ slug: string }>()
  const supabase = createSupabaseServerClient()

  const [date,  setDate]  = useState(new Date())
  const [slots, setSlots] = useState<Slot[]>([])

  useEffect(() => {
    supabase
      .from('slot')
      .select('id, slotdate, start_time')
      .eq('business_id', slug)
      .eq('slotdate', format(date, 'yyyy-MM-dd'))
      .eq('book_status', 'free')
      .then(({ data }) => setSlots(data ?? []))
  }, [date, slug])

  const book = async (id: number) => {
    await supabase.from('slot')
      .update({ book_status: 'booked' })
      .eq('id', id)
    alert('Booked! 🎉')
  }

  return (
    <div className="space-y-4">
      <input
        type="date"
        value={format(date, 'yyyy-MM-dd')}
        onChange={e => setDate(new Date(e.target.value))}
        className="border p-2 rounded"
      />
      <ul className="grid grid-cols-2 gap-2">
        {slots.map(s => (
          <li key={s.id}>
            <button
              onClick={() => book(s.id)}
              className="w-full rounded-lg border p-2 hover:bg-gray-100"
            >
              {format(new Date(`${s.slotdate}T${s.start_time}`), 'HH:mm')}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}