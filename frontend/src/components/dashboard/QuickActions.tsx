import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  CalendarPlus,
  Star,
  CreditCard,
  Receipt,
  Bell,
  MessageSquare,
  Megaphone,
  BarChart3,
} from "lucide-react";
import { useNotificationsContext } from "../../context/NotificationsContext";

const baseButtonClass =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-green-500 text-green-600 rounded-lg font-medium hover:bg-green-50 transition-colors";

interface QuickActionsProps {
  variant?: "caregiver" | "careseeker" | "admin";
  layout?: "horizontal" | "vertical";
}

type ActionEntry =
  | {
      key: string;
      type: "link";
      to: string;
      label: string;
      icon: LucideIcon;
      notificationBadge?: boolean;
    }
  | {
      key: string;
      type: "button";
      label: string;
      icon: LucideIcon;
      onClick: () => void;
    };

const QuickActions = ({
  variant = "caregiver",
  layout = "vertical",
}: QuickActionsProps) => {
  const { unreadCount } = useNotificationsContext();

  const caregiverEntries: ActionEntry[] = [
    {
      key: "earnings-history",
      type: "link",
      to: "/caregiver/earnings-history",
      label: "Earnings History",
      icon: Receipt,
    },
    {
      key: "reviews-received",
      type: "link",
      to: "/caregiver/reviews-received",
      label: "Reviews",
      icon: Star,
    },
    {
      key: "notifications",
      type: "link",
      to: "/notifications",
      label: "Notifications",
      icon: Bell,
      notificationBadge: true,
    },
    {
      key: "announcements",
      type: "link",
      to: "/announcements",
      label: "Announcements",
      icon: Megaphone,
    },
  ];

  const careseekerEntries: ActionEntry[] = [
    {
      key: "book",
      type: "link",
      to: "/careseeker/find-caregiver",
      label: "Book Caregiver",
      icon: CalendarPlus,
    },
    {
      key: "payments",
      type: "link",
      to: "/payments",
      label: "Payment History",
      icon: CreditCard,
    },
    {
      key: "notifications",
      type: "link",
      to: "/notifications",
      label: "Notifications",
      icon: Bell,
      notificationBadge: true,
    },
    {
      key: "announcements",
      type: "link",
      to: "/announcements",
      label: "Announcements",
      icon: Megaphone,
    },
  ];

  const adminEntries: ActionEntry[] = [
    {
      key: "complaints",
      type: "link",
      to: "/admin/complaints",
      label: "View Complaints",
      icon: MessageSquare,
    },
    {
      key: "announcements",
      type: "link",
      to: "/admin/announcements",
      label: "Send Announcement",
      icon: Megaphone,
    },
    {
      key: "reports",
      type: "link",
      to: "/admin/reports",
      label: "View Reports",
      icon: BarChart3,
    },
  ];

  const entries =
    variant === "caregiver"
      ? caregiverEntries
      : variant === "admin"
        ? adminEntries
        : careseekerEntries;

  return (
    <>
      <div className="bg-green-50 rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Quick Actions
        </h2>
        <div
          className={
            layout === "vertical"
              ? "flex flex-col gap-3"
              : "flex flex-wrap gap-3"
          }
        >
          {entries.map((entry) => {
            const cls =
              layout === "vertical"
                ? `${baseButtonClass} w-full min-w-[180px]`
                : baseButtonClass;
            const Icon = entry.icon;

            if (entry.type === "button") {
              return (
                <button
                  key={entry.key}
                  type="button"
                  onClick={entry.onClick}
                  className={cls}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {entry.label}
                </button>
              );
            }

            const showBadge =
              entry.notificationBadge && unreadCount > 0;

            return (
              <Link
                key={entry.key}
                to={entry.to}
                className={`${cls} relative`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {entry.label}
                {showBadge && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1.5 text-xs font-bold text-white bg-blue-500 rounded-full">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default QuickActions;
