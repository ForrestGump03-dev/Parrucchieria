import { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views, type View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, addMinutes } from 'date-fns';
import { it } from 'date-fns/locale';
import { Trash2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

import { useAppointments } from '../hooks/useAppointments';
import { useClients } from '../hooks/useClients';
import { useStaff } from '../hooks/useStaff';
import AgendaModal from '../components/AgendaModal';
import ConfirmModal from '../components/ConfirmModal';
import DeleteClientToast from '../components/DeleteClientToast';
import { type Appointment } from '../types';

interface CalendarEvent {
  id: string;
  title: string;
  desc?: string;
  start: Date;
  end: Date;
  resourceId?: string; 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resource: any;
}

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

const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar);

const parseDateTime = (dateStr: string, timeStr: string) => {
  return new Date(`${dateStr}T${timeStr}:00`);
};

export default function Agenda() {
  const { getAppointmentsForRange, updateAppointment, deleteAppointment } = useAppointments();
  const { deleteClient } = useClients();
  const { staff, refreshStaff } = useStaff();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<View>(Views.DAY);
  const [date, setDate] = useState(new Date());
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, event: CalendarEvent } | null>(null);
  
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

  // Prepare Resources
  const resources = staff.length > 0 
     ? [
         ...staff.filter(s => s.active).map(s => ({ id: s.id, title: s.name })), 
       ]
     : undefined;
  
  // If resources exist, we always add 'Unassigned' column if there are unassigned events?
  // User wants Columns. If only 3 hairdressers, show 3 columns.
  // If undefined, show Standard View.
  if (resources && staff.length < 5) {
      // Add empty columns? No, react-big-calendar doesn't do "empty" resources easily without dummy logic.
  }
  // Force "Non Assegnato" if we are using columns
  if (resources) {
      resources.push({ id: 'unassigned', title: 'Non Assegnato' });
  }

  const [clusterData, setClusterData] = useState<{ isOpen: boolean; events: CalendarEvent[] }>({ isOpen: false, events: [] });

  const fetchEvents = useCallback(async () => {
    // Calcola il range in base alla vista
    const start = new Date(date);
    start.setDate(start.getDate() - 35);
    const end = new Date(date);
    end.setDate(end.getDate() + 35);

    try {
      const data = await getAppointmentsForRange(start, end);
      
      // Even if data is empty, we must continue to clear events
      const safeData = data || [];

      const calendarEvents = safeData
        .filter((apt: Appointment) => apt.price === null)
        .map((apt: Appointment) => {
        const evtStart = parseDateTime(apt.date, apt.start_time || '00:00');
        // USE DURATION
        const duration = apt.duration || 30;
        const evtEnd = addMinutes(evtStart, duration);
        
        return {
          id: apt.id,
          title: `${apt.clients?.first_name} ${apt.clients?.last_name}`, 
          desc: apt.treatment,
          start: evtStart,
          end: evtEnd,
          resourceId: apt.staff_id || 'unassigned',
          resource: apt
        };
      });
      
      setEvents(calendarEvents);
    } catch (e) {
      console.error(e);
      toast.error('Impossibile aggiornare agenda');
    }
  }, [date, getAppointmentsForRange]);

  // Handle focus re-fetch and initial load
  useEffect(() => {
    void fetchEvents();
    
    // Auto-refresh when window regains focus (solves "minimize/restore" issue)
    const onFocus = () => {
       void fetchEvents();
       void refreshStaff();
    };
    window.addEventListener('focus', onFocus);
    
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    
    return () => {
       window.removeEventListener('click', handleClick);
       window.removeEventListener('focus', onFocus);
    };
  }, [fetchEvents, refreshStaff]);

  const handleSelectSlot = ({ start }: { start: Date }) => {
    // Naviga alla vista giornaliera se siamo in vista mese
    if (view === Views.MONTH) {
       setDate(start);
       setView(Views.DAY);
       return;
    }

    setSelectedDate(start);
    setEditingAppointment(null);
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    // If it's a cluster, open selection modal
    if (event.resource?.isCluster) {
      setClusterData({ isOpen: true, events: event.resource.events });
      return;
    }

    // Standard left click opens edit directly
    setEditingAppointment(event.resource);
    setIsModalOpen(true);
  };
  
  // Custom Event component to handle display
  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    // Render Cluster
    if (event.resource?.isCluster) {
        return (
            <div 
              className="h-full w-full flex flex-col items-start p-0.5 overflow-hidden text-[10px]"
              title="Clicca per espandere"
              onClick={(e) => {
                  e.stopPropagation(); // Stop default click inside (important)
                  // Manually trigger cluster selection
                  setClusterData({ isOpen: true, events: event.resource.events });
              }}
              onContextMenu={(e) => {
                  // Allow treating cluster context menu same as left click -> Open Selection
                  e.preventDefault();
                  e.stopPropagation();
                  setClusterData({ isOpen: true, events: event.resource.events });
              }}
            >
               <div className="font-bold mb-0.5 w-full flex justify-between items-center whitespace-nowrap bg-white/10 px-0.5 rounded pointer-events-none">
                 <span>{format(event.start, 'HH:mm')}</span>
                 <span className="bg-white/20 px-1 rounded text-[9px]">{event.resource.events.length}</span>
               </div>
               
               <div className="flex flex-col gap-px w-full opacity-95 pointer-events-none">
                 {event.resource.events.slice(0, 3).map((sub: CalendarEvent) => (
                   <div key={sub.id} className="truncate leading-none flex items-center gap-1">
                     <span className="opacity-70 font-mono text-[9px]">{format(sub.start, 'HH:mm')}</span>
                     <span>{sub.title}</span>
                   </div>
                 ))}
                 {event.resource.events.length > 3 && <span className="text-[9px] italic leading-tight opacity-75">+{event.resource.events.length - 3} altri...</span>}
               </div>
            </div>
        );
    }

    // Render Single Event
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
        onClick={(e) => {
             // Force Open on any click inside blue area
             e.stopPropagation(); 
             setEditingAppointment(event.resource);
             setIsModalOpen(true);
        }}
        className="h-full w-full flex flex-col text-xs leading-tight overflow-hidden p-0.5"
        title={`${event.title} - ${event.desc}`}
      >
        <span className="font-bold truncate pointer-events-none">{event.title}</span>
        <span className="truncate opacity-90 pointer-events-none">{event.desc}</span>
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
          void fetchEvents();
          
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
          toast.error('Errore eliminazione appuntamento');
        }
      }
    });
  };

  const handleEditWait = () => {
    if (!contextMenu) return;
    setEditingAppointment(contextMenu.event.resource);
    setIsModalOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEventDrop = async ({ event, start, resourceId }: any) => {
    const startDate = new Date(start);
    // Aggiorna data e ora
    const dateStr = format(startDate, 'yyyy-MM-dd');
    const timeStr = format(startDate, 'HH:mm');
    
    const newStaffId = resourceId === 'unassigned' ? null : resourceId;

    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await updateAppointment(event.id, {
        date: dateStr,
        start_time: timeStr,
        staff_id: newStaffId
      });
      fetchEvents();
      toast.success("Appuntamento spostato");
    } catch (error) {
      console.error("Errore spostamento appuntamento", error);
      toast.error("Impossibile spostare l'appuntamento");
    }
  };

  const dayPropGetter = (date: Date) => {
    const day = getDay(date);
    if (day === 0) return { className: 'bg-red-50' }; // Domenica
    if (day === 1) return { className: 'bg-gray-50' }; // Lunedì
    return {};
  };

  const handleToastClose = useCallback(() => {
    setDeleteToast(prev => ({ ...prev, isVisible: false }));
  }, []);

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Agenda Appuntamenti</h1>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex-1 relative z-0">
        <DnDCalendar
          localizer={localizer}
          events={events}
          resources={resources}
          resourceIdAccessor={(r: any) => r.id}
          resourceTitleAccessor={(r: any) => r.title}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%', minHeight: '600px' }}
          culture="it"
          view={view}
          formats={{
            eventTimeRangeFormat: ({ start }: { start: Date }) => format(start, 'HH:mm'),
          }}
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
        onDeleteRequest={(clientId, clientName) => {
          setDeleteToast({ isVisible: true, clientId, clientName });
        }}
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
              void fetchEvents(); // Refresh agenda
              setDeleteToast(prev => ({ ...prev, isVisible: false }));
              toast.success("Cliente eliminato definitivamente");
            })
            .catch(err => {
              console.error(err);
              toast.error("Errore durante l'eliminazione del cliente");
            });
        }}
        onClose={handleToastClose}
      />

      {/* Cluster Selection Modal */}
      {clusterData.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
               <h3 className="font-semibold text-slate-800">Seleziona Appuntamento</h3>
               <button onClick={() => setClusterData({ ...clusterData, isOpen: false })} className="text-slate-500 hover:text-red-500 hover:bg-slate-200 rounded-full p-1 transition-colors">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
               </button>
             </div>
             <div className="p-2 max-h-[60vh] overflow-y-auto">
               {clusterData.events.map((evt) => (
                 <button 
                    key={evt.id}
                    onClick={() => {
                      setClusterData({ ...clusterData, isOpen: false });
                      setEditingAppointment(evt.resource);
                      setIsModalOpen(true);
                    }}
                    className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 rounded-lg transition-colors group"
                 >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-800 group-hover:text-indigo-700">{evt.title}</span>
                      <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">{format(evt.start, 'HH:mm')}</span>
                    </div>
                    <div className="text-sm text-slate-500 truncate">{evt.desc}</div>
                 </button>
               ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

