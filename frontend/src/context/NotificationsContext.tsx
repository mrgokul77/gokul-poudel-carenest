import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { useNotifications as useNotificationsHook } from "../hooks/useNotifications";
import type { Notification } from "../hooks/useNotifications";

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
  fetchNotifications: (type?: string) => Promise<Notification[]>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(
  undefined
);

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, role } = useAuth();
  const enabled =
    isAuthenticated && role !== null && role !== "admin";
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch,
    fetchNotifications,
  } = useNotificationsHook(enabled);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refetch,
        fetchNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export function useNotificationsContext() {
  const ctx = useContext(NotificationsContext);
  if (ctx === undefined) {
    throw new Error("useNotificationsContext must be used within NotificationsProvider");
  }
  return ctx;
}
