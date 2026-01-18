import { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views, type View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, addMinutes } from 'date-fns';
import { it } from 'date-fns/locale';
import { Trash2, Edit } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

import { useAppointments } from '../hooks/useAppointments';
import { useClients } from '../hooks/useClients';
import AgendaModal from '../components/AgendaModal';
import ConfirmModal from '../components/ConfirmModal';
import DeleteClientToast from '../components/DeleteClientToast';
import { type Appointment } from '../types';

const locales = {
  'it': it,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

const parseDateTime = (dateStr: string, timeStr: string) => {
  return new Date(`${dateStr}T${timeStr}:00`);
};

export default function Agenda() {
  const { getAppointmentsForRange, updateAppointment, deleteAppointment } = useAppointments();
  const { deleteClient } = useClients();
  const [events, setEvents] = useState<any[]>([]);
  const [view, setView] = useState<View>(Views.DAY);
  const [date, setDate] = useState(new Date());
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, event: any } | null>(null);
  
  // Custom Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Toast State
  const [deleteToast, setDeleteToast] = useState<{
    isVisible: boolean;
    clientId: string;
    clientName: string;
  }>({ isVisible: false, clientId: '', clientName: '' });

  const fetchEvents = useCallback(async () => {
    // Calcola il range in base alla vista
    const start = new Date(date);
    start.setDate(start.getDate() - 35);
    const end = new Date(date);
    end.setDate(end.getDate() + 35);

    try {
      const data = await getAppointmentsForRange(start, end);
      const calendarEvents = (data || []).map((apt: Appointment) => {
        const start = parseDateTime(apt.date, apt.start_time || '00:00');
        const end = addMinutes(start, 30); // Default 30 min duration for better visualization
        
        return {
          id: apt.id,
          title: `${apt.clients?.first_name} ${apt.clients?.last_name}`, 
          desc: apt.treatment,
          start,
          end,
          resource: apt
        };
      });
      setEvents(calendarEvents);
    } catch (e) {
      console.error(e);
    }
  }, [date, getAppointmentsForRange]);

  useEffect(() => {
    fetchEvents();
    // Close context menu on click elsewhere
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [fetchEvents]);

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setSelectedDate(start);
    setEditingAppointment(null);
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event: any) => {
    // Left click opens edit directly (or could confirm)
    setEditingAppointment(event.resource);
    setIsModalOpen(true);
  };
  
  // Custom Event component to handle right click
  const EventComponent = ({ event }: any) => {
    return (
      <div 
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({ 
            x: e.clientX, 
            y: e.clientY, 
            event 
          });
        }}
        className="h-full w-full flex flex-col text-xs leading-tight overflow-hidden"
        title={`${event.title} - ${event.desc}`}
      >
        <span className="font-bold truncate">{event.title}</span>
        <span className="truncate opacity-90">{event.desc}</span>
      </div>
    );
  };

  const handleDeleteWait = () => {
    if (!contextMenu) return;
    const { event } = contextMenu;
    
    // First confirmation: Delete Apppointment
    setConfirmModal({
      isOpen: true,
      title: "Elimina Appuntamento",
      message: `Sei sicuro di voler eliminare l'appuntamento di ${event.title}?`,
      isDanger: true,
      onConfirm: async () => {
        try {
          // Close first modal
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          
          await deleteAppointment(event.id);
          fetchEvents();
          
          // Show non-blocking toast to optionally delete client
          if (event.resource.client_id) {
            setDeleteToast({
              isVisible: true,
              clientId: event.resource.client_id,
              clientName: event.title
            });
          }
        } catch (e) {
          console.error(e);
          alert('Errore eliminazione appuntamento');
        }
      }
    });
  };

  const handleEditWait = () => {
    if (!contextMenu) return;
    setEditingAppointment(contextMenu.event.resource);
    setIsModalOpen(true);
  };

  const handleEventDrop = async ({ event, start }: any) => {
    // Aggiorna data e ora
    const dateStr = format(start, 'yyyy-MM-dd');
    const timeStr = format(start, 'HH:mm');

    try {
      await updateAppointment(event.id, {
        date: dateStr,
        start_time: timeStr
      });
      fetchEvents();
    } catch (error) {
      console.error("Errore spostamento appuntamento", error);
      alert("Impossibile spostare l'appuntamento");
    }
  };

  const dayPropGetter = (date: Date) => {
    const day = getDay(date);
    if (day === 0) return { className: 'bg-red-50' }; // Domenica
    if (day === 1) return { className: 'bg-gray-50' }; // Lunedì
    return {};
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Agenda Appuntamenti</h1>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex-1 relative z-0">
        <DnDCalendar
          localizer={localizer}
          events={events}
          startAccessor={(event: any) => event.start}
          endAccessor={(event: any) => event.end}
          style={{ height: '100%', minHeight: '600px' }}
          culture="it"
          view={view}
          date={date}
          onView={(view) => setView(view)}
          onNavigate={(date) => setDate(date)}
          views={['month', 'week', 'day']}
          step={15}
          timeslots={2} // 2 slots per hour line = 30min visual blocks
          min={new Date(0, 0, 0, 8, 0, 0)} // Start 8:00
          max={new Date(0, 0, 0, 20, 0, 0)} // End 20:00
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onEventDrop={handleEventDrop}
          resizable={false}
          dayPropGetter={dayPropGetter}
          components={{
            event: EventComponent
          }}
          messages={{
            next: "Succ",
            previous: "Prec",
            today: "Oggi",
            month: "Mese",
            week: "Settimana",
            day: "Giorno",
            date: "Data",
            time: "Ora",
            event: "Evento",
            noEventsInRange: "Nessun appuntamento in questo periodo",
          }}
        />

        {/* Context Menu */}
        {contextMenu && (
          <div 
            className="fixed bg-white shadow-xl rounded-lg border border-slate-200 py-1 z-50 min-w-[150px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={handleEditWait}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
            >
              <Edit size={16} /> Modifica
            </button>
            <button 
              onClick={handleDeleteWait}
              className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600"
            >
              <Trash2 size={16} /> Elimina
            </button>
          </div>
        )}
      </div>

      <AgendaModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        initialDate={selectedDate}
        appointmentToEdit={editingAppointment}
        onSaved={fetchEvents}
      />
      
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isDanger={confirmModal.isDanger}
      />
      <DeleteClientToast 
        isVisible={deleteToast.isVisible}
        clientName={deleteToast.clientName}
        onConfirm={() => {
          deleteClient(deleteToast.clientId)
            .then(() => {
              fetchEvents(); // Refresh agenda
              setDeleteToast(prev => ({ ...prev, isVisible: false }));
            })
            .catch(err => {
              console.error(err);
              alert("Errore durante l'eliminazione del cliente");
            });
        }}
        onClose={() => setDeleteToast(prev => ({ ...prev, isVisible: false }))}
      />    </div>
  );
}

