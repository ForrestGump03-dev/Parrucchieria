import { useState, useCallback } from 'react';
import type { ProductSold } from '../types';
import { supabase } from '../lib/supabase';
import { isSameDay, startOfMonth, endOfMonth, isWithinInterval, subDays, differenceInDays, parse, startOfDay, format } from 'date-fns';
import { it } from 'date-fns/locale';

export interface TreatmentStat {
  name: string;
  count: number;
  totalRevenue: number;
  penetration: number;
}

export interface ClientStat {
  id: string;
  name: string;
  visits: number;
  spent: number;
  lastVisit: string;
}

export interface StaffStat {
  name: string;
  totalRevenue: number;
  servicesCount: number;
}

export interface DayTrend {
  date: string;
  label: string;
  value: number;
}

export interface KPIStats {
  todayRevenue: number;
  monthRevenue: number;
  yearRevenue: number;
  periodRevenue: number;
  previousPeriodRevenue: number;
  growth: number;
  totalVisits: number;
  averageTicket: number;
  productRevenue: number; 
  topProducts: { name: string; quantity: number; revenue: number }[];
  topTreatments: TreatmentStat[];
  topClients: ClientStat[];
  sleepingClients: ClientStat[];
  staffStats: StaffStat[];
  dailyTrend: DayTrend[];
}

export type DateRange = {
  start: Date;
  end: Date;
  label: string;
};

export function useStats() {
  const [stats, setStats] = useState<KPIStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async (customRange?: DateRange) => {
    setLoading(true);
    try {
      const today = new Date();
      
      // Default range: This Month if not specified
      const currentRange = customRange || { 
        start: startOfMonth(today), 
        end: endOfMonth(today), 
        label: 'Questo Mese' 
      };

      // Calculate Previous Range for Comparison
      const dayDiff = differenceInDays(currentRange.end, currentRange.start) + 1;
      const prevRangeStart = subDays(currentRange.start, dayDiff);
      const prevRangeEnd = subDays(currentRange.end, dayDiff); 

      // Fetch all PAID appointments with pagination to bypass the 1000-row Supabase limit
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let allAppointments: any[] = [];
      let hasMore = true;
      let page = 0;
      const pageSize = 1000;

      while (hasMore) {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
              *,
              clients (id, first_name, last_name),
              staff_members (id, name)
          `)
          .not('price', 'is', null) 
          .order('date', { ascending: true }) // ASC important for timeline
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allAppointments = allAppointments.concat(data);
          if (data.length < pageSize) {
            hasMore = false; // Last page reached
          } else {
            page++; // Fetch next page
          }
        } else {
          hasMore = false; // No more data
        }
      }

      const appointments = allAppointments;
      if (appointments.length === 0) return;

      // 1. Calculate Global Counters (Fixed)
      let todayRev = 0;
      let monthRev = 0;
      let yearRev = 0;

      // 2. Calculate Period Stats
      let periodRev = 0;
      let prevPeriodRev = 0;
      let productRev = 0;
      
      const visitsSet = new Set<string>(); // "ClientID_Date" to count unique visits
      const treatmentMap = new Map<string, { count: number; total: number }>();
      const productMap = new Map<string, { quantity: number; revenue: number }>();
      const allClientsMap = new Map<string, { name: string; lastVisit: string; spent: number; visits: number }>();
      const clientPeriodMap = new Map<string, { name: string; visits: Set<string>; spent: number; lastVisit: string }>();
      const staffMap = new Map<string, { name: string; rev: number; count: number }>();
      const dayMap = new Map<string, number>();

      // Init Day Map
      for (let i = 0; i < dayDiff; i++) {
        const d = new Date(currentRange.start);
        d.setDate(d.getDate() + i);
        const k = format(d, 'yyyy-MM-dd');
        dayMap.set(k, 0);
      }

      appointments.forEach(apt => {
        // Fix: Parse strictly as local date at midnight to match calendar days
        const aptDate = startOfDay(parse(apt.date, 'yyyy-MM-dd', new Date()));
        
        const price = Number(apt.price);
        
        // Calculate Product Revenue
        let productsTotal = 0;
        const sold = (apt.products_sold as ProductSold[] | undefined) ?? [];
        sold.forEach((p) => {
            productsTotal += (Number(p.price) * Number(p.quantity));
        });

        // Total Transaction Value
        const totalValue = price + productsTotal;

        const treatment = apt.treatment;
        const clientId = apt.client_id;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const clientName = apt.clients ? `${apt.clients.first_name} ${apt.clients.last_name}` : 'Cliente Eliminato';
        const uniqueVisitKey = `${clientId}_${apt.date}`; 
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const staffName = apt.staff_members?.name || 'Non Assegnato';

        // --- GLOBAL TRACKING (For Sleeping Clients) ---
        if (!allClientsMap.has(clientId)) {
           allClientsMap.set(clientId, { name: clientName, lastVisit: apt.date, spent: 0, visits: 0 });
        }
        const globalClient = allClientsMap.get(clientId)!;
        // Since data is ordered by date ASC, the current apt is always >= stored lastVisit
        if (apt.date > globalClient.lastVisit) globalClient.lastVisit = apt.date;
        globalClient.spent += totalValue; // Include products
        globalClient.visits += 1;

        // Global Buckets (Today/Month/Year)
        if (isSameDay(aptDate, today)) {
          todayRev += totalValue;
        }
        if (isWithinInterval(aptDate, { start: startOfMonth(today), end: endOfMonth(today) })) {
           monthRev += totalValue;
        }
        if (format(aptDate, 'yyyy') === format(today, 'yyyy')) { // Simple Year Check
           yearRev += totalValue;
        }
        
        // --- PERIOD TRACKING ---
        if (isWithinInterval(aptDate, currentRange)) {
            periodRev += totalValue;
            productRev += productsTotal;
            visitsSet.add(uniqueVisitKey);

            // Period Clients Stats
            if (!clientPeriodMap.has(clientId)) {
               clientPeriodMap.set(clientId, { name: clientName, visits: new Set(), spent: 0, lastVisit: apt.date });
            }
            const cStat = clientPeriodMap.get(clientId)!;
            cStat.spent += totalValue;
            cStat.visits.add(apt.date);
            if(apt.date > cStat.lastVisit) cStat.lastVisit = apt.date;

            // Period Treatments (Only the service part counts for treatment stats)
            if (treatment) {
                if (!treatmentMap.has(treatment)) treatmentMap.set(treatment, { count: 0, total: 0 });
                const tStat = treatmentMap.get(treatment)!;
                tStat.count += 1;
                tStat.total += price; 
            }

            // Period Products
            sold.forEach((p) => {
               const pKey = p.name;
               const pVal = Number(p.price) * Number(p.quantity);
               if (!productMap.has(pKey)) productMap.set(pKey, { quantity: 0, revenue: 0 });
               const pStat = productMap.get(pKey)!;
               pStat.quantity += Number(p.quantity);
               pStat.revenue += pVal;
            });

            // Staff Stats
            if(!staffMap.has(staffName)) staffMap.set(staffName, { name: staffName, rev: 0, count: 0 });
            const sStat = staffMap.get(staffName)!;
            sStat.rev += totalValue; // Attribute total value to staff?
            sStat.count += 1; 
            
            // Daily Trend
            const dateKey = format(aptDate, 'yyyy-MM-dd');
            if (dayMap.has(dateKey)) {
                dayMap.set(dateKey, dayMap.get(dateKey)! + totalValue);
            }

        } else if (isWithinInterval(aptDate, { start: prevRangeStart, end: prevRangeEnd })) {
            prevPeriodRev += totalValue;
        }
      });
      
      // Transform Maps to Arrays
      const topTreatments = Array.from(treatmentMap.entries())
        .map(([name, stat]) => ({
            name,
            count: stat.count,
            totalRevenue: stat.total,
            penetration: (stat.count / (visitsSet.size || 1)) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const topProducts = Array.from(productMap.entries())
        .map(([name, stat]) => ({ name, ...stat }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
        
      const topClients = Array.from(clientPeriodMap.entries())
        .map(([id, c]) => ({
            id: id || c.name,
            name: c.name,
            visits: c.visits.size,
            spent: c.spent,
            lastVisit: c.lastVisit
        }))
        .sort((a, b) => b.spent - a.spent)
        .slice(0, 5);

      // Sleeping Clients (Didn't visit in last 60 days but have visited before)
      const sixtyDaysAgo = subDays(today, 60);
      const sleepingClients = Array.from(allClientsMap.entries())
        .map(([id, c]) => ({ ...c, id: id || c.name }))
        .filter(c => parse(c.lastVisit, 'yyyy-MM-dd', new Date()) < sixtyDaysAgo)
        .sort((a, b) => b.spent - a.spent) // High value lost clients first
        .slice(0, 50);

      const staffStats = Array.from(staffMap.values())
        .map(s => ({
            name: s.name,
            totalRevenue: s.rev,
            servicesCount: s.count
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue); // Best earner first

      const dailyTrend = Array.from(dayMap.entries())
        .map(([date, value]) => ({
            date,
            label: format(parse(date, 'yyyy-MM-dd', new Date()), 'd MMM', { locale: it }),
            value
        }));

      // Calculate aggregated metrics
      const growth = prevPeriodRev === 0 ? (periodRev > 0 ? 100 : 0) : ((periodRev - prevPeriodRev) / prevPeriodRev) * 100;
      const totalVisits = visitsSet.size;
      const averageTicket = totalVisits === 0 ? 0 : periodRev / totalVisits;

      setStats({
          todayRevenue: todayRev,
          monthRevenue: monthRev,
          yearRevenue: yearRev,
          periodRevenue: periodRev,
          previousPeriodRevenue: prevPeriodRev,
          growth,
          totalVisits,
          averageTicket,
          productRevenue: productRev,
          topProducts,
          topTreatments,
          topClients,
          sleepingClients,
          staffStats,
          dailyTrend
      });
    } catch (e) {
      console.error(e);
      // toast.error("Errore caricamento statistiche");
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, fetchStats };
}