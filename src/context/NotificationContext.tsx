/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type AppNotification } from '../types';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<AppNotification, 'id' | 'read' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const MAX_NOTIFICATIONS = 100;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('app_notifications');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.slice(0, MAX_NOTIFICATIONS) : [];
    } catch (e) {
      console.error('Failed to parse notifications', e);
      return [];
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    try {
      localStorage.setItem('app_notifications', JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
    } catch (e) {
      console.error('Failed to persist notifications', e);
    }
  }, [notifications]);

  useEffect(() => {
    const handleSignedOut = () => {
      setNotifications([]);
    };
    window.addEventListener('auth-signed-out', handleSignedOut);
    return () => window.removeEventListener('auth-signed-out', handleSignedOut);
  }, []);

  const addNotification = (notification: Omit<AppNotification, 'id' | 'read' | 'timestamp'>) => {
    const newNotification: AppNotification = {
      ...notification,
      id: crypto.randomUUID(),
      read: false,
      timestamp: Date.now(),
    };
    
    // Add to top of list and cap at MAX_NOTIFICATIONS
    setNotifications(prev => [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearAll
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
