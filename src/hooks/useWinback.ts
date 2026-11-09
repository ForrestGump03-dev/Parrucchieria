import { useState, useCallback, useEffect, useRef } from 'react';
import { differenceInCalendarDays, startOfDay } from 'date-fns';
import { supabase, ensureAuthenticatedSession } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { parseBusinessDate } from '../lib/date';
import { type Client } from '../types';

export interface WinbackCandidate extends Client {
    last_visit: string;
    days_since: number;
}

export function useWinback(daysThreshold = 60) {
    const { user } = useAuth();
    const [candidates, setCandidates] = useState<WinbackCandidate[]>([]);
    const [loading, setLoading] = useState(false);
    const latestFetchRef = useRef(0);

    const fetchCandidates = useCallback(async () => {
        const fetchId = ++latestFetchRef.current;
        if (!user) return;
        setLoading(true);
        try {
            await ensureAuthenticatedSession();

            // 1. Fetch all appointments with pagination to bypass the 1000-row Supabase limit
            const pageSize = 1000;
            let page = 0;
            let hasMore = true;
            let appointments: { client_id: string; date: string }[] = [];

            while (hasMore) {
                const { data: batch, error: appErr } = await supabase
                    .from('appointments')
                    .select('client_id, date')
                    .order('date', { ascending: true })
                    .range(page * pageSize, (page + 1) * pageSize - 1);

                if (appErr) throw appErr;
                if (fetchId !== latestFetchRef.current) return;

                if (batch && batch.length > 0) {
                    appointments = appointments.concat(batch as { client_id: string; date: string }[]);
                    if (batch.length < pageSize) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                } else {
                    hasMore = false;
                }
            }

            if (fetchId !== latestFetchRef.current) return;
            if (appointments.length === 0) {
                setCandidates([]);
                return;
            }

            // 2. Group by client and find max date
            const latestDates: Record<string, string> = {};
            appointments.forEach(app => {
                if (!app.client_id || !app.date) return;
                if (!latestDates[app.client_id] || app.date > latestDates[app.client_id]) {
                    latestDates[app.client_id] = app.date;
                }
            });

            // 3. Filter candidates >= X calendar days (DST-safe)
            const today = startOfDay(new Date());

            const candidateInfo = new Map<string, { id: string; last_visit: string; days_since: number }>();
            
            Object.entries(latestDates).forEach(([clientId, lastDateStr]) => {
                const lastDate = startOfDay(parseBusinessDate(lastDateStr));
                const diffDays = differenceInCalendarDays(today, lastDate);
                
                if (diffDays >= daysThreshold) {
                    candidateInfo.set(clientId, { id: clientId, last_visit: lastDateStr, days_since: diffDays });
                }
            });

            if (candidateInfo.size === 0) {
                setCandidates([]);
                return;
            }

            // 4. Fetch Client details in chunks of 200 to avoid URL length limits
            const candidateIds = Array.from(candidateInfo.keys());
            const chunkSize = 200;
            let clientsData: Client[] = [];

            for (let i = 0; i < candidateIds.length; i += chunkSize) {
                const chunk = candidateIds.slice(i, i + chunkSize);
                const { data: chunkClients, error: clientErr } = await supabase
                    .from('clients')
                    .select('*')
                    .in('id', chunk)
                    .eq('is_active', true);

                if (clientErr) throw clientErr;
                if (fetchId !== latestFetchRef.current) return;
                if (chunkClients) {
                    clientsData = clientsData.concat(chunkClients as Client[]);
                }
            }
            
            // 5. Merge data
            const results: WinbackCandidate[] = clientsData.map(client => {
                const info = candidateInfo.get(client.id);
                return {
                    ...client,
                    last_visit: info?.last_visit || '',
                    days_since: info?.days_since || 0
                };
            });
            
            // Sort by days_since desc (longest missing first)
            results.sort((a, b) => b.days_since - a.days_since);
            setCandidates(results);
            
        } catch (e) {
            if (fetchId === latestFetchRef.current) {
                console.error("Error fetching winback candidates", e);
            }
        } finally {
            if (fetchId === latestFetchRef.current) {
                setLoading(false);
            }
        }
    }, [user, daysThreshold]);

    useEffect(() => {
        fetchCandidates();
    }, [fetchCandidates]);

    return { candidates, loading, refetch: fetchCandidates };
}
