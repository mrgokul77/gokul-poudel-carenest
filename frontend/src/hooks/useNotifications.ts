import { useState, useEffect, useCallback, useRef } from "react";
import api, { subscribeAccessTokenRefresh } from "../api/axios";

export interface Notification {
  id: number;
  type: "booking" | "payment" | "message";
  title: string;
  message: string;
  is_read: boolean;
  related_id: number | null;
  message_count?: number | null;
  created_at: string;
}

const WS_BASE = "ws://127.0.0.1:8000";

// dedupes by ID so we don't show the same notification twice
function dedupeNotificationsById(items: Notification[]): Notification[] {
  const map = new Map<number, Notification>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function useNotifications(enabled: boolean) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const fetched = useRef(false);

  const fetchNotifications = useCallback(async (type?: string) => {
    try {
      const params = type ? { type } : {};
      const res = await api.get<{ notifications: Notification[] }>("notifications/", {
        params,
      });
      const raw = res.data?.notifications || [];
      if (import.meta.env.DEV) {
        console.log("API response (notifications):", raw);
      }
      const unique = dedupeNotificationsById(raw);
      setNotifications(unique);
      return unique;
    } catch {
      setNotifications([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get<{ unread_count: number }>("notifications/unread-count/");
      setUnreadCount(res.data?.unread_count ?? 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  const markAsRead = useCallback(async (id: number) => {
    try {
      await api.patch(`notifications/${id}/read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Ignore
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.post("notifications/mark-all-read/");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Ignore
    }
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchNotifications();
    await fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  const openNotificationWs = useCallback(() => {
    const token = localStorage.getItem("access");
    if (!token) return;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const url = `${WS_BASE}/ws/notifications/?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Notification;
        let isNew = true;
        setNotifications((prev) => {
          const existingIdx = prev.findIndex((n) => n.id === data.id);
          if (existingIdx >= 0) {
            isNew = false;
            const updated = [...prev];
            updated[existingIdx] = data;
            const moved = updated.splice(existingIdx, 1)[0];
            return dedupeNotificationsById([moved, ...updated]);
          }
          return dedupeNotificationsById([data, ...prev]);
        });
        if (isNew) setUnreadCount((c) => c + 1);
      } catch {
        // Ignore parse errors
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      fetched.current = false;
      return;
    }
    if (fetched.current) return;
    fetched.current = true;
    setLoading(true);
    fetchNotifications().then(() => {});
    fetchUnreadCount();
  }, [enabled, fetchNotifications, fetchUnreadCount]);

  useEffect(() => {
    if (!enabled) return;
    openNotificationWs();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, openNotificationWs]);

  useEffect(() => {
    if (!enabled) return;
    return subscribeAccessTokenRefresh(() => {
      openNotificationWs();
    });
  }, [enabled, openNotificationWs]);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    refetch,
  };
}
