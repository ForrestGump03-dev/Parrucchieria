import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views, type View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, addMinutes, isValid } from 'date-fns';
import { it } from 'date-fns/locale';
import { Trash2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

import { useAppointments } from '../hooks/useAppointments';
import { useClients } from '../hooks/useClients';
import { useStaff } from '../hooks/useStaff';
import { useAuth } from '../context/AuthContext';
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

interface Resource {
  id: string;
  title: string;
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

const DnDCalendar = withDragAndDrop<CalendarEvent, Resource>(Calendar);

const parseDateTime = (dateStr: string, timeStr: string) => {
  const normalizedTime = (timeStr || '00:00').slice(0, 5);
  return parse(`${dateStr} ${normalizedTime}`, 'yyyy-MM-dd HH:mm', new Date());
};

export default function Agenda() {
  const { getAppointmentsForRange, updateAppointment, deleteAppointment } = useAppointments();
  const { deleteClient } = useClients();
  const { staff, refreshStaff } = useStaff();
  const { user } = useAuth();
  const latestFetchRef = useRef(0);
  const retryTimeoutRef = useRef<number | null>(null);

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

  // Prepare Resources (solo se c'è almeno un membro dello staff attivo)
  const resources = useMemo<Resource[] | undefined>(() => {
    const active = staff.filter(s => s.active);
    if (active.length === 0) return undefined;
    return [
      ...active.map(s => ({ id: s.id, title: s.name })),
      { id: 'unassigned', title: 'Non Assegnato' },
    ];
  }, [staff]);

  // Se un appuntamento appartiene a un collaboratore disattivato/rimosso, mostralo in "Non Assegnato"
  // invece di farlo sparire dalla vista giornaliera a colonne di react-big-calendar.
  const displayedEvents = useMemo<CalendarEvent[]>(() => {
    if (!resources) return events;
    const validIds = new Set(resources.map(r => r.id));
    return events.map(evt =>
      evt.resourceId && validIds.has(evt.resourceId)
        ? evt
        : { ...evt, resourceId: 'unassigned' }
    );
  }, [events, resources]);

  const [clusterData, setClusterData] = useState<{ isOpen: boolean; events: CalendarEvent[] }>({ isOpen: false, events: [] });

  const fetchEvents = useCallback(async (retryCount = 0) => {
    const fetchId = ++latestFetchRef.current;
    if (retryTimeoutRef.current !== null) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (!user) return;

    // Calcola il range in base alla vista
    const start = new Date(date);
    start.setDate(start.getDate() - 35);
    const end = new Date(date);
    end.setDate(end.getDate() + 35);

    let timeoutId: number | undefined;
    try {
      // Timeout di sicurezza (10s) per non lasciare l'agenda appesa all'infinito in caso di anomalie di rete
      const fetchPromise = getAppointmentsForRange(start, end);
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error('Timeout recupero appuntamenti')), 10000);
      });
      const data = await Promise.race([fetchPromise, timeoutPromise]);

      // Le richieste possono sovrapporsi al focus della finestra o a un refresh
      // del token. Solo l'ultima risposta può aggiornare l'agenda.
      if (fetchId !== latestFetchRef.current) return;
      
      const safeData = data || [];

      const calendarEvents: CalendarEvent[] = [];
      safeData
        .filter((apt: Appointment) => apt.price === null)
        .forEach((apt: Appointment) => {
          const evtStart = parseDateTime(apt.date, apt.start_time || '00:00');
          if (!isValid(evtStart)) {
            console.warn('Appuntamento con data o ora non valida ignorato:', apt);
            return;
          }
          // USE DURATION
          const duration = apt.duration || 30;
          const evtEnd = addMinutes(evtStart, duration);
          
          const clientName = `${apt.clients?.first_name || ''} ${apt.clients?.last_name || ''}`.trim() || 'Cliente';

          calendarEvents.push({
            id: apt.id,
            title: clientName, 
            desc: apt.treatment,
            start: evtStart,
            end: evtEnd,
            resourceId: apt.staff_id || 'unassigned',
            resource: apt
          });
        });
      
      setEvents(calendarEvents);
    } catch (e) {
      if (fetchId !== latestFetchRef.current) return;
      console.error('Errore recupero appuntamenti agenda:', e);
      // Ritenta silenziosamente fino a 2 volte (es. riconnessione Wi-Fi al risveglio dallo standby)
      // mantenendo intatti gli appuntamenti già visibili a schermo.
      if (retryCount < 2) {
        retryTimeoutRef.current = window.setTimeout(() => {
          void fetchEvents(retryCount + 1);
        }, (retryCount + 1) * 2000);
      } else {
        toast.error('Impossibile aggiornare agenda');
      }
    } finally {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    }
  }, [date, getAppointmentsForRange, user]);

  // Handle focus/visibility/online re-fetch and initial load
  useEffect(() => {
    void fetchEvents();
    
    let debounceTimer: number | null = null;
    const scheduleRefresh = () => {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        void fetchEvents();
        void refreshStaff();
      }, 250);
    };

    const onFocus = () => {
      scheduleRefresh();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        scheduleRefresh();
      }
    };
    const onOnline = () => {
      scheduleRefresh();
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibilityChange);
    
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    
    return () => {
      latestFetchRef.current += 1;
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      if (retryTimeoutRef.current !== null) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      window.removeEventListener('click', handleClick);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fetchEvents, refreshStaff]);

  const [selectedResourceId, setSelectedResourceId] = useState<string | undefined>(undefined);

  const handleSelectSlot = ({ start, resourceId }: { start: Date, resourceId?: string | number }) => {
    // Naviga alla vista giornaliera se siamo in vista mese
    if (view === Views.MONTH) {
       setDate(start);
       setView(Views.DAY);
       return;
    }

    setSelectedDate(start);
    // If resourceId is "unassigned" (string), we treat it as undefined/null for the form
    // or keep it as "unassigned" and handle it in the modal.
    // The AgendaModal form takes string or undefined.
    // The select box has <option value="">-- Chiunque --</option> which maps to falsy.
    
    // If the click is on "Non Assegnato" column (id='unassigned'), we want the select to show "Chiunque".
    // If the click is on a staff column, we want that staff.
    setSelectedResourceId(resourceId === 'unassigned' ? undefined : String(resourceId));
    
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
          events={displayedEvents}
          resources={resources}
          resourceIdAccessor={(r) => r.id}
          resourceTitleAccessor={(r) => r.title}
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
          dayLayoutAlgorithm="no-overlap"
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
            showMore: (total) => `+${total} altri`,
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
        initialStaffId={selectedResourceId}
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

