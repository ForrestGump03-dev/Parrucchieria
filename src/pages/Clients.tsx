import { useState } from 'react';
import ClientList from '../components/ClientList';
import AppointmentForm from '../components/AppointmentForm';
import { useClients } from '../hooks/useClients';
import { type Client } from '../types';

export default function Clients() {
  const { clients, loading, fetchClients } = useClients();
  const [selectedClient, setSelectedClient] = useState<Client | undefined>(undefined);

  const handleClientSelect = (client: Client | undefined) => {
    setSelectedClient(client);
  };

  const handleClientUpdated = () => {
    fetchClients();
  };

  return (
    <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-8rem)]'>
      {/* Sidebar List */}
      <div className='lg:col-span-3 h-full'>
        <ClientList 
          clients={clients} 
          onSelect={handleClientSelect} 
          selectedClientId={selectedClient?.id}
          loading={loading}
          onClientDeleted={fetchClients}
        />
      </div>

      {/* Main Form Area */}
      <div className='lg:col-span-9 h-full overflow-y-auto'>
        <AppointmentForm 
          selectedClient={selectedClient} 
          onClientUpdated={handleClientUpdated}
          onSelectExistingClient={setSelectedClient}
        />
      </div>
    </div>
  );
}
