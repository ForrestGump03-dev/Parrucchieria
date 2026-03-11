import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { differenceInMinutes, differenceInDays, format, parse } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export interface NotificationSettings {
  enabled: boolean;
  advanceMinutes: number; // Quanti minuti prima notificare
  sound: boolean;
  checkInterval: number; // Ogni quanto controllare (secondi)
  
  // Backup Settings
  backupReminderEnabled: boolean;
  backupIntervalDays: number;

  // Winback Settings
  winbackDays: number;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  advanceMinutes: 15,
  sound: true,
  checkInterval: 60,
  backupReminderEnabled: true,
  backupIntervalDays: 14,
  winbackDays: 60
};

export function useReminders() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem('notificationSettings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());
  
  // Ref per accedere allo stato aggiornato dentro il setInterval
  const settingsRef = useRef(settings);
  const notifiedIdsRef = useRef(notifiedIds);

  useEffect(() => {
    settingsRef.current = settings;
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    notifiedIdsRef.current = notifiedIds;
  }, [notifiedIds]);

  const sendNotification = useCallback((title: string, body: string, type: 'info' | 'backup' = 'info') => {
    // 1. Add to In-App Notification Center
    addNotification({
      title,
      message: body,
      type
    });

    // 2. Toast Feedack
    toast(body, {
        icon: type === 'backup' ? '💾' : '🔔',
        duration: 5000,
        position: 'top-right',
        style: {
            border: '1px solid #6366f1',
            padding: '16px',
            color: '#1e293b',
        },
    });

    // 3. Audio
    if (settingsRef.current.sound) {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Simple beep
        audio.volume = 0.5;
        audio.play().catch(e => console.error("Audio play failed", e));
    }
  }, [addNotification]);

  const checkAppointments = useCallback(async () => {
    if (!user || !settingsRef.current.enabled) return;

    try {
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');

        // 1. Check Appointment Reminders
        if (settingsRef.current.enabled) {
            const { data: appointments, error } = await supabase
                .from('appointments')
                .select('*, clients(first_name, last_name)')
                .eq('user_id', user.id)
                .eq('date', todayStr)
                .is('price', null); // Only active ones

            if (!error && appointments) {
                appointments.forEach(apt => {
                    if (notifiedIdsRef.current.has(apt.id)) return;

                    const aptTime = parse(`${apt.date} ${apt.start_time}`, 'yyyy-MM-dd HH:mm', new Date());
                    const diff = differenceInMinutes(aptTime, now);
                    const advance = settingsRef.current.advanceMinutes;
                    
                    if (diff <= advance && diff >= 0) {
                        sendNotification(
                            "Promemoria Appuntamento", 
                            `${apt.clients?.first_name} ${apt.clients?.last_name} tra ${diff} minuti (${apt.start_time})`,
                            'info'
                        );
                        setNotifiedIds(prev => {
                            const newSet = new Set(prev);
                            newSet.add(apt.id);
                            return newSet;
                        });
                    }
                });
            }
        }

    } catch (err) {
        console.error("Error checking reminders", err);
    }
  }, [user, sendNotification]);
  
  // Check Backup Reminder (On Load & Interval)
  const checkBackupReminder = useCallback(() => {
      if (!settingsRef.current.backupReminderEnabled) return;
      
      const now = Date.now();
      const lastBackupStr = localStorage.getItem('lastBackup');
      // Using localStorage for dismissal to count days (user request: remind after 14 days if ignored)
      const lastShownStr = localStorage.getItem('lastBackupReminderShown');

      let daysSinceBackup = 999;
      let daysSinceShown = 999;

      if (lastBackupStr) {
          daysSinceBackup = differenceInDays(now, parseInt(lastBackupStr, 10));
      }
      
      if (lastShownStr) {
          daysSinceShown = differenceInDays(now, parseInt(lastShownStr, 10));
      }
      
      const interval = settingsRef.current.backupIntervalDays;

      // Logic: Show reminder only if backup is needed AND we haven't nagged user in the last [interval] days
      if (daysSinceBackup >= interval && daysSinceShown >= interval) {
          const msg = !lastBackupStr 
             ? "Non è mai stato effettuato un backup dei dati. È consigliato scaricarne una copia."
             : `L'ultimo backup è stato fatto ${daysSinceBackup} giorni fa. È consigliato scaricare una copia dei dati.`;

          sendNotification(
              "Backup Consigliato",
              msg,
              'backup'
          );
          
          // Timestamp this reminder to snooze it for 'interval' days
          localStorage.setItem('lastBackupReminderShown', now.toString());
      }
  }, [sendNotification]);


  // Main Interval
  useEffect(() => {
      // Check appointments immediately
      checkAppointments();
      
      // Delay Backup Check (5 seconds) to avoid Splash Screen collision and ensure app is ready
      const backupTimer = setTimeout(() => {
          checkBackupReminder();
      }, 5000);

      const interval = setInterval(() => {
          checkAppointments();
          checkBackupReminder(); 
      }, settings.checkInterval * 1000);

      return () => {
          clearInterval(interval);
          clearTimeout(backupTimer);
      };
  }, [checkAppointments, checkBackupReminder, settings.checkInterval]);


  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
      setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const testNotification = () => {
      sendNotification("Test Notifica", "Se leggi questo, le notifiche funzionano correttamente!");
  };
  
  const testBackupDate = (daysAgo: number) => {
      // Simulate an old backup
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      localStorage.setItem('lastBackup', date.getTime().toString());
      
      // Reset reminder shown to allow testing immediately
      localStorage.removeItem('lastBackupReminderShown'); 
      
      checkBackupReminder();
      toast.success(`Data backup impostata a ${daysAgo} giorni fa. Controllo in corso...`);
  };

  return {
    settings,
    updateSettings,
    testNotification,
    testBackupDate
  };
}
