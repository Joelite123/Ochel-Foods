import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { supabase, DBOrder } from "@/lib/supabase";
import { toast } from "sonner";

export type OrderNotification = {
  id: string;
  order: DBOrder;
  read: boolean;
  receivedAt: Date;
};

type NotificationContextType = {
  notifications: OrderNotification[];
  unreadCount: number;
  markAllRead: () => void;
  clearNotifications: () => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    // Two-tone chime
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.18, now + i * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.35);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.35);
    });
  } catch {
    /* AudioContext blocked before user gesture — ignore */
  }
}

export function NotificationProvider({
  children,
  isAdmin,
}: {
  children: ReactNode;
  isAdmin: boolean;
}) {
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (!isAdmin) return;

    // Ignore events during initial load — only react to NEW orders after mount
    const timeout = setTimeout(() => {
      initialized.current = true;
    }, 3000);

    const channel = supabase
      .channel("admin-order-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          if (!initialized.current) return;
          const order = payload.new as DBOrder;
          const notif: OrderNotification = {
            id: order.id,
            order,
            read: false,
            receivedAt: new Date(),
          };
          setNotifications((prev) => [notif, ...prev]);
          playNotificationSound();
          toast.success(`New order from ${order.customer_name}!`, {
            description: `#${order.id.slice(0, 8).toUpperCase()} — ₦${Number(order.total).toLocaleString("en-NG")}`,
            duration: 10000,
            action: {
              label: "View Orders",
              onClick: () => {
                window.location.href = "/admin/orders";
              },
            },
          });
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          // Realtime not enabled — silently ignore, poll fallback handles updates
        }
      });

    return () => {
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const clearNotifications = () => setNotifications([]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAllRead, clearNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
