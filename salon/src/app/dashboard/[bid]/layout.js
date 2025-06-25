import DashboardNav from '@/components/DashboardNav'

export default function DashboardLayout({ children, params }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login')
      } else if (session) {
        setUser(session.user)
      }
      setLoading(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [router, supabase.auth])

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  return (
    <div className="columns is-gapless">
      {/* Desktop Sidebar */}
      <div className="column is-2 is-hidden-mobile has-background-light" style={{ minHeight: '100vh' }}>
        <DashboardNav bid={params.bid} />
      </div>

      {/* Mobile Sidebar */}
      <div className={`modal ${isSidebarOpen ? 'is-active' : ''} is-hidden-desktop`}>
        <div className="modal-background" onClick={() => setIsSidebarOpen(false)}></div>
        <div className="modal-card" style={{ margin: '0', width: '250px', height: '100%', position: 'fixed', left: 0, top: 0 }}>
          <section className="modal-card-body has-background-light">
            <DashboardNav bid={params.bid} onLinkClick={() => setIsSidebarOpen(false)} />
          </section>
        </div>
      </div>

      <div className="column is-10">
        {/* Mobile Header */}
        <div className="is-hidden-desktop mobile-header">
          <nav className="navbar is-light">
            <div className="navbar-brand">
              <a className="navbar-item" onClick={() => setIsSidebarOpen(true)}>
                <span className="icon"><i className="fas fa-bars"></i></span>
              </a>
            </div>
          </nav>
        </div>
        
        <main className="p-4 has-bottom-nav">
          {children}
        </main>
      </div>
    </div>
  )