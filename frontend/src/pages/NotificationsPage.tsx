import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { useNotificationsContext } from "../context/NotificationsContext";
import {
  Bell,
  Calendar,
  CreditCard,
  MessageCircle,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Notification } from "../hooks/useNotifications";

type TypeFilter = "all" | "booking" | "payment" | "message";
type ReadFilter = "all" | "unread" | "read";

const ITEMS_PER_PAGE = 6;

const formatRelativeTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const groupByTime = (notifications: Notification[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: Notification[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Earlier", items: [] },
  ];

  for (const n of notifications) {
    const d = new Date(n.created_at);
    const nDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (nDate.getTime() === today.getTime()) {
      groups[0].items.push(n);
    } else if (nDate.getTime() === yesterday.getTime()) {
      groups[1].items.push(n);
    } else {
      groups[2].items.push(n);
    }
  }

  return groups.filter((g) => g.items.length > 0);
};

const getIcon = (type: Notification["type"]) => {
  switch (type) {
    case "booking":
      return <Calendar className="w-5 h-5 text-green-600" />;
    case "payment":
      return <CreditCard className="w-5 h-5 text-emerald-600" />;
    case "message":
      return <MessageCircle className="w-5 h-5 text-blue-600" />;
    default:
      return <Bell className="w-5 h-5 text-gray-600" />;
  }
};

const getActionLabel = (type: Notification["type"]): string => {
  switch (type) {
    case "booking":
      return "View Booking";
    case "payment":
      return "View Payment";
    case "message":
      return "Open Chat";
    default:
      return "View";
  }
};

const getActionPath = (n: Notification, role: string | null): string => {
  switch (n.type) {
    case "booking":
      return role === "caregiver" ? "/caregiver/booking-requests" : "/careseeker/bookings";
    case "payment":
      return role === "caregiver" ? "/caregiver/dashboard" : "/payments";
    case "message":
      return n.related_id ? `/messages/${n.related_id}` : "/messages";
    default:
      return "/";
  }
};

const NotificationCardSkeleton = () => (
  <div className="bg-green-50 rounded-xl border border-gray-200 shadow-sm p-5 animate-pulse">
    <div className="flex gap-4">
      <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-1/4" />
      </div>
    </div>
  </div>
);

const NotificationsPage = () => {
  const { role } = useAuth();
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    loading,
    unreadCount,
  } = useNotificationsContext();

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, readFilter]);

  const resetFilters = () => {
    setTypeFilter("all");
    setReadFilter("all");
  };

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      const typeOk = typeFilter === "all" || n.type === typeFilter;
      const readOk =
        readFilter === "all"
          ? true
          : readFilter === "unread"
            ? !n.is_read
            : n.is_read;
      return typeOk && readOk;
    });
  }, [notifications, typeFilter, readFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / ITEMS_PER_PAGE),
  );

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const indexOfLast = currentPage * ITEMS_PER_PAGE;
  const indexOfFirst = indexOfLast - ITEMS_PER_PAGE;
  const paginatedItems = filtered.slice(indexOfFirst, indexOfLast);
  const grouped = groupByTime(paginatedItems);

  const handleCardClick = (n: Notification) => {
    if (!n.is_read) markAsRead(n.id);
  };

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-3 hidden md:block">
            <div className="space-y-6 sticky top-6">
              <div className="bg-green-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                  Filter Notifications
                </h3>
              </div>

              <div className="bg-green-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="bg-green-100 rounded-xl px-4 py-3 mb-4">
                  <span className="text-xs font-semibold text-green-800 uppercase tracking-wide">
                    Type
                  </span>
                </div>
                <div className="space-y-3">
                  {(
                    [
                      { value: "all" as const, label: "All" },
                      { value: "booking" as const, label: "Bookings" },
                      { value: "payment" as const, label: "Payments" },
                      { value: "message" as const, label: "Messages" },
                    ] as const
                  ).map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="notificationTypeFilter"
                        value={option.value}
                        checked={typeFilter === option.value}
                        onChange={() => setTypeFilter(option.value)}
                        className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-green-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="bg-green-100 rounded-xl px-4 py-3 mb-4">
                  <span className="text-xs font-semibold text-green-800 uppercase tracking-wide">
                    Status
                  </span>
                </div>
                <div className="space-y-3">
                  {(
                    [
                      { value: "all" as const, label: "All" },
                      { value: "unread" as const, label: "Unread" },
                      { value: "read" as const, label: "Read" },
                    ] as const
                  ).map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="notificationReadFilter"
                        value={option.value}
                        checked={readFilter === option.value}
                        onChange={() => setReadFilter(option.value)}
                        className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-green-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full py-3 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-9">
            <header className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">
                  Notifications
                </h1>
                <p className="text-gray-600">
                  Bookings, payments, and messages in one place.
                </p>
              </div>
              <button
                type="button"
                onClick={() => markAllAsRead()}
                disabled={unreadCount === 0}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent shrink-0"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all as read
              </button>
            </header>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <NotificationCardSkeleton key={i} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center" role="status">
                <Bell
                  className="w-16 h-16 text-gray-400 mx-auto mb-4"
                  aria-hidden
                />
                {notifications.length === 0 ? (
                  <>
                    <p className="text-gray-700 text-lg font-medium">
                      No notifications yet
                    </p>
                    <p className="text-gray-600 text-sm mt-2 max-w-md mx-auto">
                      When you get bookings, payments, or messages, they will
                      show up here.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-700 text-lg font-medium">
                      No notifications match your filters
                    </p>
                    <p className="text-gray-600 text-sm mt-2 max-w-md mx-auto">
                      Try a different type or status, or reset filters.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {grouped.map(({ label, items }) => (
                  <section key={label}>
                    <h2 className="text-sm font-medium text-gray-500 mb-4">
                      {label}
                    </h2>
                    <div className="space-y-4">
                      {items.map((n) => (
                        <Link
                          key={n.id}
                          to={getActionPath(n, role)}
                          onClick={() => handleCardClick(n)}
                          className={`block bg-green-50 rounded-xl border shadow-sm p-5 transition-all duration-200 hover:shadow-md hover:border-green-300 ${
                            !n.is_read
                              ? "border-green-200"
                              : "border-gray-200"
                          }`}
                        >
                          <div className="flex gap-4">
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                                !n.is_read ? "bg-green-100" : "bg-gray-100"
                              }`}
                            >
                              {getIcon(n.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-gray-800">
                                  {n.title}
                                </p>
                                <div className="flex items-center gap-2 shrink-0">
                                  {n.type === "message" &&
                                    (n.message_count ?? 1) > 1 && (
                                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                        {n.message_count} new messages
                                      </span>
                                    )}
                                  {!n.is_read && (
                                    <span
                                      className="w-2.5 h-2.5 rounded-full bg-blue-500"
                                      aria-hidden
                                    />
                                  )}
                                </div>
                              </div>
                              <p className="text-gray-600 text-sm mt-0.5 line-clamp-2">
                                {n.message.length > 120
                                  ? `${n.message.slice(0, 120)}...`
                                  : n.message}
                              </p>
                              <div className="flex items-center justify-between mt-3">
                                <span className="text-xs text-gray-500">
                                  {formatRelativeTime(n.created_at)}
                                </span>
                                <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600 group-hover:text-green-700">
                                  {getActionLabel(n.type)}
                                  <ChevronRight className="w-4 h-4" />
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                ))}
                {!loading && filtered.length > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                    <p className="text-sm text-gray-600">
                      Showing{" "}
                      <span className="font-medium text-gray-800">
                        {indexOfFirst + 1}–
                        {Math.min(indexOfLast, filtered.length)}
                      </span>{" "}
                      of{" "}
                      <span className="font-medium text-gray-800">
                        {filtered.length}
                      </span>
                    </p>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => p - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Prev
                      </button>
                      <span className="text-sm text-gray-600 px-2">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => p + 1)}
                        disabled={currentPage >= totalPages}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
