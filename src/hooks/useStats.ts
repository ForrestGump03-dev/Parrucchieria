import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { isSameDay, startOfMonth, endOfMonth, startOfYear, isWithinInterval, subDays, differenceInDays, parse, startOfDay } from 'date-fns';

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
  
  topTreatments: TreatmentStat[];
  topClients: ClientStat[];
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
            clients (id, first_name, last_name)
        `)
        .not('price', 'is', null) 
        .order('date', { ascending: false });

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
      const clientMap = new Map<string, { name: string; visits: Set<string>; spent: number }>(); // Visits is Set of dates


      appointments.forEach(apt => {
        // Fix: Parse strictly as local date at midnight to match calendar days
        // apt.date is "YYYY-MM-DD"
        const aptDate = startOfDay(parse(apt.date, 'yyyy-MM-dd', new Date()));
        
        const price = Number(apt.price);
        const treatment = apt.treatment;
        const clientId = apt.client_id;

        // ... rest of logic

        const clientName = `${apt.clients?.first_name} ${apt.clients?.last_name}`;
        const uniqueVisitKey = `${clientId}_${apt.date}`; // Unique per day per client

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
             clientMap.set(clientId, { name: clientName, visits: new Set(), spent: 0 });
          }
          const cStats = clientMap.get(clientId)!;
          cStats.visits.add(apt.date); // Add date to set to count visits
          cStats.spent += price;
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

      // Top Treatments with Penetration
      const topTreatments = Array.from(treatmentMap.entries())
        .map(([name, val]) => ({
          name,
          count: val.count,
          totalRevenue: val.total,
          penetration: totalUniqueVisits > 0 ? (val.count / totalUniqueVisits) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count); // Sort by popularity

      // Top Clients
      const topClients = Array.from(clientMap.entries())
        .map(([id, val]) => ({
          id,
          name: val.name,
          visits: val.visits.size,
          spent: val.spent
        }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 10); // Top 10

      setStats({
        todayRevenue: todayRev,
        monthRevenue: monthRev,
        yearRevenue: yearRev,
        periodRevenue: periodRev,
        previousPeriodRevenue: prevPeriodRev,
        growth,
        totalVisits: totalUniqueVisits,
        topTreatments,
        topClients
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []); // Dependencies

  return { stats, loading, fetchStats };
}