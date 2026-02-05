import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { isSameDay, startOfMonth, endOfMonth, startOfYear, isWithinInterval, subDays, differenceInDays, parse, startOfDay, format } from 'date-fns';
import { it } from 'date-fns/locale';

export interface TreatmentStat {
  name: string;
  count: number;
  totalRevenue: number;
  penetration: number; // % of visits that included this treatment
}

export interface ClientStat {
  id: string;
  name: string;
  visits: number;
  spent: number;
  lastVisit: string; // ISO date
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
  // Global Counters
  todayRevenue: number;
  monthRevenue: number;
  yearRevenue: number;
  
  // Period Analysis
  periodRevenue: number;
  previousPeriodRevenue: number;
  growth: number;
  totalVisits: number; // Unique visits in period
  averageTicket: number;

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
      const prevRangeEnd = subDays(currentRange.end, dayDiff); // Compare with same duration immediately before

      const firstDayOfYear = startOfYear(today);

      // Fetch all PAID appointments (price is not null)
      const { data, error } = await supabase
        .from('appointments')
        .select(`
            *,
            clients (id, first_name, last_name),
            staff_members (id, name)
        `)
        .not('price', 'is', null) 
        .order('date', { ascending: true });

      if (error) throw error;
      if (!data) return;

      const appointments = data;

      // 1. Calculate Global Counters (Fixed)
      let todayRev = 0;
      let monthRev = 0;
      let yearRev = 0;

      // 2. Calculate Period Stats
      let periodRev = 0;
      let prevPeriodRev = 0;
      
      const visitsSet = new Set<string>(); // "ClientID_Date" to count unique visits
      const treatmentMap = new Map<string, { count: number; total: number }>();
      const clientMap = new Map<string, { name: string; visits: Set<string>; spent: number; lastVisit: string }>(); // Visits is Set of dates
      const allClientsMap = new Map<string, { name: string; lastVisit: string; spent: number; visits: number }>();
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
        // apt.date is "YYYY-MM-DD"
        const aptDate = startOfDay(parse(apt.date, 'yyyy-MM-dd', new Date()));
        
        const price = Number(apt.price);
        const treatment = apt.treatment;
        const clientId = apt.client_id;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const clientName = apt.clients ? `${apt.clients.first_name} ${apt.clients.last_name}` : 'Cliente Eliminato';
        const uniqueVisitKey = `${clientId}_${apt.date}`; // Unique per day per client
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const staffName = apt.staff_members?.name || 'Non Assegnato';

        // --- GLOBAL TRACKING (For Sleeping Clients) ---
        if (!allClientsMap.has(clientId)) {
           allClientsMap.set(clientId, { name: clientName, lastVisit: apt.date, spent: 0, visits: 0 });
        }
        const globalClient = allClientsMap.get(clientId)!;
        // Since data is ordered by date ASC, the current apt is always >= stored lastVisit
        globalClient.lastVisit = apt.date; 
        globalClient.spent += price;
        globalClient.visits += 1;

        // Global Buckets
        if (isSameDay(aptDate, today)) todayRev += price;
        if (isWithinInterval(aptDate, { start: startOfMonth(today), end: endOfMonth(today) })) monthRev += price;
        if (aptDate >= firstDayOfYear) yearRev += price;

        // Period Analysis
        if (isWithinInterval(aptDate, { start: currentRange.start, end: currentRange.end })) {
          periodRev += price;
          visitsSet.add(uniqueVisitKey);

          // Treatments in period
          if (!treatmentMap.has(treatment)) {
            treatmentMap.set(treatment, { count: 0, total: 0 });
          }
          const tStats = treatmentMap.get(treatment)!;
          tStats.count += 1; // Count every execution
          tStats.total += price;

          // Clients in period
          if (!clientMap.has(clientId)) {
             clientMap.set(clientId, { name: clientName, visits: new Set(), spent: 0, lastVisit: apt.date });
          }
          const cStats = clientMap.get(clientId)!;
          cStats.visits.add(apt.date); // Add date to set to count visits
          cStats.spent += price;
          cStats.lastVisit = apt.date; // Upgrade last visit in period
          
          // Staff
          if (!staffMap.has(staffName)) staffMap.set(staffName, { name: staffName, rev: 0, count: 0 });
          const sStats = staffMap.get(staffName)!;
          sStats.rev += price;
          sStats.count += 1;

          // Daily Trend
          const dateKey = format(aptDate, 'yyyy-MM-dd');
          const currentDayVal = dayMap.get(dateKey) || 0;
          dayMap.set(dateKey, currentDayVal + price);
        }

        // Previous Period Analysis (for comparison)
        if (isWithinInterval(aptDate, { start: prevRangeStart, end: prevRangeEnd })) {
          prevPeriodRev += price;
        }
      });

      // 3. Finalize Metrics
      let growth = 0;
      if (prevPeriodRev > 0) {
        growth = ((periodRev - prevPeriodRev) / prevPeriodRev) * 100;
      } else if (periodRev > 0) {
        growth = 100; 
      }

      const totalUniqueVisits = visitsSet.size;
      const averageTicket = totalUniqueVisits > 0 ? periodRev / totalUniqueVisits : 0; // NEW

      // Top Treatments with Penetration
      const topTreatments = Array.from(treatmentMap.entries())
        .map(([name, val]) => ({
          name,
          count: val.count,
          totalRevenue: val.total,
          penetration: totalUniqueVisits > 0 ? (val.count / totalUniqueVisits) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count); // Sort by popularity

      // Top Clients (Faithful)
      const topClients = Array.from(clientMap.entries())
        .map(([id, val]) => ({
          id,
          name: val.name,
          visits: val.visits.size,
          spent: val.spent,
          lastVisit: val.lastVisit
        }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 10); // Top 10

      // Sleeping Clients (Oldest Last Visit)
      const sleepingClients = Array.from(allClientsMap.entries())
        .map(([id, val]) => ({
          id,
          name: val.name,
          visits: val.visits,
          spent: val.spent,
          lastVisit: val.lastVisit
        }))
        .sort((a, b) => new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime()) // Oldest date first
        .slice(0, 10);
        
      // NEW: Staff ranking
      const staffStats = Array.from(staffMap.values())
        .map(s => ({
            name: s.name,
            totalRevenue: s.rev,
            servicesCount: s.count
        }))
        .sort((a,b) => b.totalRevenue - a.totalRevenue);

      // NEW: Daily Data
      const dailyTrend = Array.from(dayMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, val]) => {
            const d = parse(date, 'yyyy-MM-dd', new Date());
            return {
                date,
                label: format(d, 'eee dd', { locale: it }),
                value: val
            };
        });


      setStats({
        todayRevenue: todayRev,
        monthRevenue: monthRev,
        yearRevenue: yearRev,
        periodRevenue: periodRev,
        previousPeriodRevenue: prevPeriodRev,
        growth,
        totalVisits: totalUniqueVisits,
        averageTicket,
        topTreatments,
        topClients,
        sleepingClients,
        staffStats,
        dailyTrend
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []); // Dependencies

  return { stats, loading, fetchStats };
}