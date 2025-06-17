'use client'
import { useClients, useStaff } from '@/hooks/useSupabaseData'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function DashboardPage({ params }) {
  const [bid, setBid] = useState(null)
  
  useEffect(() => {
    const getBid = async () => {
      const resolvedParams = await params
      setBid(resolvedParams.bid)
    }
    getBid()
  }, [params])

  const { data: staff, isLoading: staffLoading } = useStaff(bid)
  const { data: clients, isLoading: clientsLoading } = useClients(bid)
  
  if (staffLoading || clientsLoading || !bid) {
    return <LoadingSpinner message="Loading dashboard..." />
  }

  return (
    <div className="container py-5 px-4">
      <h1 className="title is-4 mb-5">Welcome to Your Salon</h1>
      <div className="columns">
        <div className="column is-half">
          <Link href={`/dashboard/${bid}/staff`}>
            <div className="box has-text-centered is-clickable" style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
              <h2 className="subtitle is-5">Staff Members</h2>
              <p className="title is-2 has-text-primary">{staff?.length || 0}</p>
            </div>
          </Link>
        </div>
        <div className="column is-half">
          <Link href={`/dashboard/${bid}/clients`}>
            <div className="box has-text-centered is-clickable" style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
              <h2 className="subtitle is-5">Clients</h2>
              <p className="title is-2 has-text-info">{clients?.length || 0}</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}