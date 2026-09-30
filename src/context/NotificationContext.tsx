import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, Sparkles } from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'order' | 'deal' | 'system';
}

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'alert';
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  addNotification: (item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'alert') => void;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Order GRV-98421 Delivered Successfully',
    message: 'Your Hyderabadi Dum Biryani was delivered to your door. Enjoy your meal!',
    timestamp: '2 hours ago',
    read: false,
    type: 'order',
  },
  {
    id: 'notif-2',
    title: 'Fresh Fruits & Veggies Restocked',
    message: 'Royal Gala Apples and Farm Spinach are fresh from local partner hubs today.',
    timestamp: '5 hours ago',
    read: false,
    type: 'deal',
  },
  {
    id: 'notif-3',
    title: 'UNI Ambient Glow Theme Active',
    message: 'Experience the enhanced chromatic perimeter glow across Food, Grocery, and Medicine marketplaces.',
    timestamp: 'Yesterday',
    read: true,
    type: 'system',
  },
  {
    id: 'notif-4',
    title: '15-Min Express Pharmacy Enabled',
    message: 'Emergency OTC tablets and health supplies now dispatched with zero surge fees.',
    timestamp: '2 days ago',
    read: true,
    type: 'system',
  },
];

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem('gravvy_notifications');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return INITIAL_NOTIFICATIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('gravvy_notifications', JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'alert' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  const addNotification = (item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: NotificationItem = {
      ...item,
      id: `notif-${Date.now()}`,
      timestamp: 'Just now',
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
        addNotification,
        showToast,
      }}
    >
      {children}

      {/* Floating Global Toasts */}
      {toasts.length > 0 && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1.5 pointer-events-none px-4 w-full max-w-md">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`py-2.5 px-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center gap-2.5 text-xs font-bold transition-all duration-200 animate-in fade-in slide-in-from-top-3 pointer-events-auto ${
                toast.type === 'alert'
                  ? 'bg-stone-950/95 border-rose-500/50 text-rose-300'
                  : toast.type === 'info'
                  ? 'bg-stone-950/95 border-sky-500/50 text-sky-300'
                  : 'bg-stone-950/95 border-amber-400/50 text-amber-300'
              }`}
            >
              {toast.type === 'alert' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : toast.type === 'info' ? (
                <Info className="w-4 h-4 text-sky-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span className="truncate">{toast.message}</span>
            </div>
          ))}
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
