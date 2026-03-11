import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { type Client } from '../types';

export interface WinbackCandidate extends Client {
    last_visit: string;
    days_since: number;
}

export function useWinback(daysThreshold = 60) {
    const { user } = useAuth();
    const [candidates, setCandidates] = useState<WinbackCandidate[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchCandidates = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // 1. Fetch all appointments simply to find latest dates (lightweight)
            const { data: appointments, error: appErr } = await supabase
                .from('appointments')
                .select('client_id, date');
            
            if (appErr) throw appErr;
            if (!appointments || appointments.length === 0) {
                setCandidates([]);
                return;
            }

            // 2. Group by client and find max date
            const latestDates: Record<string, string> = {};
            appointments.forEach(app => {
                if (!latestDates[app.client_id] || new Date(app.date) > new Date(latestDates[app.client_id])) {
                    latestDates[app.client_id] = app.date;
                }
            });

            // 3. Filter candidates > X days
            const now = new Date();
            // Start of today so the difference is clean
            now.setHours(0, 0, 0, 0); 

            const candidateInfo: { id: string; last_visit: string; days_since: number }[] = [];
            
            Object.entries(latestDates).forEach(([clientId, lastDateStr]) => {
                const lastDate = new Date(lastDateStr);
                const diffTime = now.getTime() - lastDate.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays >= daysThreshold) {
                    candidateInfo.push({ id: clientId, last_visit: lastDateStr, days_since: diffDays });
                }
            });

            if (candidateInfo.length === 0) {
                setCandidates([]);
                return;
            }

            // 4. Fetch Client details for just those IDs
            // Note: If candidateInfo is huge, chunk it, but for a salon it's fine.
            const candidateIds = candidateInfo.map(c => c.id);
            const { data: clientsData, error: clientErr } = await supabase
                .from('clients')
                .select('*')
                .in('id', candidateIds);
                
            if (clientErr) throw clientErr;
            
            // 5. Merge data
            const results: WinbackCandidate[] = (clientsData || []).map(client => {
                const info = candidateInfo.find(c => c.id === client.id);
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
            console.error("Error fetching winback candidates", e);
        } finally {
            setLoading(false);
        }
    }, [user, daysThreshold]);

    useEffect(() => {
        fetchCandidates();
    }, [fetchCandidates]);

    return { candidates, loading, refetch: fetchCandidates };
}
