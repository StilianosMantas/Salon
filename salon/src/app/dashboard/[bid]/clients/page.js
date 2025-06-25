import ClientForm from '@/components/ClientForm'

export default function ClientsPage() {
  const { bid } = useParams()
  const { data: clients, error, isLoading, mutate } = useClients(bid)
  const { createClient, updateClient, deleteClient, loading: mutationLoading } = useClientMutations(bid)

  const [formVisible, setFormVisible] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const handleSave = async (clientData) => {
    try {
      if (editingClient) {
        await updateClient({ ...clientData, id: editingClient.id })
      } else {
        await createClient(clientData)
      }
      setFormVisible(false)
      setEditingClient(null)
    } catch (error) {
      // Error is handled in the hook
    }
  }

  const openForm = (client = null) => {
    setEditingClient(client)
    setFormVisible(true)
  }

  const closeForm = () => {
    setFormVisible(false)
    setEditingClient(null)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      await deleteClient(id)
    }
  }

  const filteredClients = clients?.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.phone && client.phone.includes(searchTerm))
  ) || []