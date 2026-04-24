import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { isWithinInterval, startOfDay, parse } from 'date-fns';
import { type DateRange } from './useStats';

// ─── Tipi esposti ────────────────────────────────────────────────────────────

export interface ClientAppointmentDetail {
  id: string;
  date: string;        // YYYY-MM-DD
  start_time: string;  // HH:mm (o HH:mm:ss — viene troncato a 5 char nell'UI)
  treatment: string;
  notes?: string;
  staffName: string;
  servicePrice: number;    // = price del servizio (appointments.price)
  productsRevenue: number; // somma (price × quantity) di products_sold
  totalPrice: number;      // servicePrice + productsRevenue
  products: { name: string; quantity: number; price: number }[];
}

export interface DetailedClientRow {
  clientId: string;
  clientName: string;
  phone: string;
  visits: number;           // visite nel periodo selezionato
  totalSpent: number;       // servizi + prodotti nel periodo
  servicesRevenue: number;
  productsRevenue: number;
  avgPerVisit: number;
  topTreatments: { name: string; count: number }[]; // top 3 per frequenza
  lastVisitDate: string;    // YYYY-MM-DD
  firstVisitDate: string;   // YYYY-MM-DD (nel periodo)
  lastStaff: string;
  isNewClient: boolean;     // true se non aveva MAI visitato prima del range.start
  appointments: ClientAppointmentDetail[]; // ordinati per data ASC
}

export interface DetailedReportSummary {
  uniqueClients: number;
  totalVisits: number;
  totalRevenue: number;
  totalProductRevenue: number;
  avgTicket: number;
}

export interface DetailedReportData {
  clients: DetailedClientRow[];
  summary: DetailedReportSummary;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useDetailedReport() {
  const [data, setData] = useState<DetailedReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetailedReport = useCallback(async (range: DateRange) => {
    setLoading(true);
    try {
      // Fetch TUTTI gli appuntamenti pagati con paginazione per aggirare il limite di 1000 righe di Supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let rows: any[] = [];
      let hasMore = true;
      let page = 0;
      const pageSize = 1000;

      while (hasMore) {
        const { data: pageData, error } = await supabase
          .from('appointments')
          .select(`
            id, date, start_time, treatment, price, notes, client_id, products_sold,
            clients (id, first_name, last_name, phone),
            staff_members (name)
          `)
          .not('price', 'is', null)
          .order('date', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        
        if (pageData && pageData.length > 0) {
          rows = rows.concat(pageData);
          if (pageData.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      if (rows.length === 0) return;

      const rangeStart = startOfDay(range.start);

      // Determina quali clienti hanno ALMENO una visita precedente al range
      const clientsBeforeRange = new Set<string>();
      const inRangeRows: typeof rows = [];

      rows.forEach(apt => {
        const aptDate = startOfDay(parse(apt.date, 'yyyy-MM-dd', new Date()));
        if (aptDate < rangeStart) {
          clientsBeforeRange.add(apt.client_id as string);
        } else if (isWithinInterval(aptDate, { start: rangeStart, end: range.end })) {
          inRangeRows.push(apt);
        }
      });

      // Raggruppa appuntamenti nel range per cliente
      const clientMap = new Map<string, {
        clientName: string;
        phone: string;
        appointments: ClientAppointmentDetail[];
        treatmentCount: Map<string, number>;
        servicesRevenue: number;
        productsRevenue: number;
      }>();

      inRangeRows.forEach(apt => {
        const clientId = apt.client_id as string;
        const clientName: string = apt.clients
          ? `${apt.clients.first_name} ${apt.clients.last_name}`
          : 'Cliente Eliminato';
        const phone: string = apt.clients?.phone ?? '';
        const staffName: string = apt.staff_members?.name ?? 'Non Assegnato';
        const servicePrice = Number(apt.price);

        const sold: { id: string; name: string; price: number; quantity: number }[] =
          (apt.products_sold as { id: string; name: string; price: number; quantity: number }[]) ?? [];

        const productsRevenue = sold.reduce(
          (sum, p) => sum + Number(p.price) * Number(p.quantity),
          0
        );

        if (!clientMap.has(clientId)) {
          clientMap.set(clientId, {
            clientName,
            phone,
            appointments: [],
            treatmentCount: new Map(),
            servicesRevenue: 0,
            productsRevenue: 0,
          });
        }

        const entry = clientMap.get(clientId)!;
        entry.servicesRevenue += servicePrice;
        entry.productsRevenue += productsRevenue;
        entry.treatmentCount.set(
          apt.treatment,
          (entry.treatmentCount.get(apt.treatment) ?? 0) + 1
        );
        entry.appointments.push({
          id: apt.id as string,
          date: apt.date as string,
          start_time: (apt.start_time as string) ?? '',
          treatment: apt.treatment as string,
          notes: (apt.notes as string | undefined) ?? undefined,
          staffName,
          servicePrice,
          productsRevenue,
          totalPrice: servicePrice + productsRevenue,
          products: sold.map(p => ({
            name: p.name,
            quantity: Number(p.quantity),
            price: Number(p.price),
          })),
        });
      });

      // Costruisce l'array finale
      const clientRows: DetailedClientRow[] = Array.from(clientMap.entries()).map(
        ([clientId, entry]) => {
          const sortedApts = [...entry.appointments].sort((a, b) =>
            a.date.localeCompare(b.date)
          );
          const topTreatments = Array.from(entry.treatmentCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, count]) => ({ name, count }));
          const totalSpent = entry.servicesRevenue + entry.productsRevenue;
          const uniqueDates = new Set(sortedApts.map(a => a.date));
          const visits = uniqueDates.size;

          return {
            clientId,
            clientName: entry.clientName,
            phone: entry.phone,
            visits,
            totalSpent,
            servicesRevenue: entry.servicesRevenue,
            productsRevenue: entry.productsRevenue,
            avgPerVisit: visits > 0 ? totalSpent / visits : 0,
            topTreatments,
            lastVisitDate: sortedApts[sortedApts.length - 1].date,
            firstVisitDate: sortedApts[0].date,
            lastStaff: sortedApts[sortedApts.length - 1].staffName,
            isNewClient: !clientsBeforeRange.has(clientId),
            appointments: sortedApts,
          };
        }
      );

      const totalRevenue = clientRows.reduce((s, c) => s + c.totalSpent, 0);
      const totalProductRevenue = clientRows.reduce((s, c) => s + c.productsRevenue, 0);
      const totalVisits = clientRows.reduce((s, c) => s + c.visits, 0);

      setData({
        clients: clientRows,
        summary: {
          uniqueClients: clientRows.length,
          totalVisits,
          totalRevenue,
          totalProductRevenue,
          avgTicket: totalVisits > 0 ? totalRevenue / totalVisits : 0,
        },
      });
    } catch (e) {
      console.error('useDetailedReport error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, fetchDetailedReport };
}
