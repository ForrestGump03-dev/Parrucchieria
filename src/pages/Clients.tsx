import { useState, useCallback } from 'react';
import ClientList from '../components/ClientList';
import AppointmentForm from '../components/AppointmentForm';
import { type Client } from '../types';

export default function Clients() {
  const [selectedClient, setSelectedClient] = useState<Client | undefined>(undefined);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleClientSelect = (client: Client | undefined) => {
    setSelectedClient(client);
  };

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-8rem)]'>
      {/* Sidebar List */}
      <div className='lg:col-span-3 h-full'>
        <ClientList 
          onSelect={handleClientSelect} 
          selectedClientId={selectedClient?.id}
          onClientDeleted={triggerRefresh}
          refreshTrigger={refreshTrigger}
        />
      </div>

      {/* Main Form Area */}
      <div className='lg:col-span-9 h-full overflow-y-auto'>
        <AppointmentForm 
          selectedClient={selectedClient} 
          onClientUpdated={triggerRefresh}
          onSelectExistingClient={setSelectedClient}
        />
      </div>
    </div>
  );
}

