import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { QuickActions } from "../components/dashboard";
import { adminApi, emergencyApi } from "../api/axios";
import {
  Users,
  UserCheck,
  CalendarDays,
  ClipboardCheck,
  ChevronRight,
} from "lucide-react";

interface RecentBookingRow {
  id: number;
  care_seeker_name: string;
  caregiver_name: string;
  status: string;
  date?: string | null;
  start_time?: string | null;
  duration_hours?: string | number | null;
}

interface RecentComplaintRow {
  id: number;
  user_name: string;
  subject: string;
  status: string;
}

interface DashboardSummary {
  total_users: number;
  total_caregivers: number;
  total_bookings: number;
  pending_verifications: number;
  open_complaints: number;
  recent_bookings: RecentBookingRow[];
  recent_complaints: RecentComplaintRow[];
}

const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  completion_requested: "Completion Req.",
  completed: "Completed",
  rejected: "Cancelled",
  cancelled: "Cancelled",
  expired: "Expired",
};

function bookingBadgeClass(status: string): string {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "accepted":
    case "completed":
      return "bg-green-100 text-green-800";
    case "rejected":
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "completion_requested":
      return "bg-amber-100 text-amber-800";
    case "expired":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function formatBookingId(id: number): string {
  return String(id);
}

// @ts-ignore
function getInitials(name: string): string {
  if (!name || name === "—") return "--";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatServiceDateTime(booking: RecentBookingRow): string {
  const date = booking.date;
  const time = booking.start_time;

  if (!date && !time) return "-";
  if (!date) return time || "-";

  const formatTime = (timeValue: string): string => {
    const [hourPart, minutePart] = timeValue.split(":");
    const hour = Number(hourPart);
    const minute = Number(minutePart);

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      return timeValue;
    }

    const suffix = hour >= 12 ? "PM" : "AM";
    const normalizedHour = hour % 12 || 12;
    return `${normalizedHour}:${String(minute).padStart(2, "0")} ${suffix}`;
  };

  const parsed = new Date(date);
  const formattedDate = Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

  return time ? `${formattedDate}, ${formatTime(time)}` : formattedDate || "-";
}

function formatDuration(booking: RecentBookingRow): string {
  if (
    booking.duration_hours !== undefined &&
    booking.duration_hours !== null &&
    booking.duration_hours !== ""
  ) {
    return `${booking.duration_hours} hr`;
  }

  return "-";
}

const AdminDashboard = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingEmergencyCount, setPendingEmergencyCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadError(null);
        // TODO: add pagination if data gets too big
        const { data } = await adminApi.get<DashboardSummary>("dashboard-summary/");
        if (!cancelled) setSummary(data);
      } catch {
        if (!cancelled) {
          setLoadError("Could not load dashboard data.");
          setSummary(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPendingCount = async () => {
      try {
        const { data } = await emergencyApi.get<{ count: number }>("pending-count/");
        if (!cancelled) {
          setPendingEmergencyCount(Number(data?.count ?? 0));
        }
      } catch {
        if (!cancelled) {
          setPendingEmergencyCount(0);
        }
      }
    };

    loadPendingCount();
    const intervalId = window.setInterval(loadPendingCount, 20000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const summaryCards = summary
    ? [
        {
          label: "Total Users",
          value: summary.total_users,
          icon: Users,
          color: "text-blue-600",
        },
        {
          label: "Total Caregivers",
          value: summary.total_caregivers,
          icon: UserCheck,
          color: "text-green-600",
        },
        {
          label: "Total Bookings",
          value: summary.total_bookings,
          icon: CalendarDays,
          color: "text-emerald-600",
        },
        {
          label: "Pending Verifications",
          value: summary.pending_verifications,
          icon: ClipboardCheck,
          color: "text-amber-600",
        },
      ]
    : [];

  const bookings = summary?.recent_bookings ?? [];
  const noActivity = bookings.length === 0;



  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {pendingEmergencyCount > 0 && (
          <Link
            to="/admin/emergency-activity"
            className="mb-6 block rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-900 shadow-sm hover:bg-red-100"
          >
            <span className="font-semibold">⚠ You have {pendingEmergencyCount} active emergency alert(s) — Click here to view</span>
          </Link>
        )}

        <header className="mb-8 flex items-stretch gap-4 text-center sm:text-left">
          <div className="w-1 rounded-full bg-[#16a34a]" aria-hidden="true" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-1 text-gray-600">Monitor and manage system activities</p>
          </div>
        </header>

        {loadError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {loadError}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading dashboard…</div>
        ) : !summary ? (
          <div className="text-center py-16 text-gray-600">Unable to load dashboard statistics.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className="bg-green-50 rounded-xl border border-gray-200 shadow-sm p-5"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center ${card.color}`}
                    >
                          <card.icon className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                      <p className="text-sm text-gray-600">{card.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {noActivity ? (
              <div className="bg-green-50 rounded-xl border border-gray-200 shadow-sm p-10 text-center text-gray-600">
                No recent activity
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-fit items-start">
                {/* Quick Actions - 35% width (left) */}
                <div className="h-fit">
                  <QuickActions variant="admin" layout="vertical" />
                </div>

                {/* Recent Bookings - 65% width (right) */}
                <div className="lg:col-span-2 bg-green-50 rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-base font-semibold text-gray-800">
                      Recent Bookings
                    </h2>
                    <Link
                      to="/admin/bookings"
                      className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                    >
                      View All
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                  {bookings.length === 0 ? (
                    <p className="text-sm text-gray-600">No recent bookings</p>
                  ) : (
                    <div className="w-full rounded-xl border border-gray-200 bg-green-50 overflow-x-auto lg:overflow-x-visible">
                      <table className="w-full text-sm text-left table-auto">
                        <thead className="bg-green-50 border-b border-gray-200 text-gray-700">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Booking ID</th>
                            <th className="px-4 py-3 font-semibold">Care Seeker</th>
                            <th className="px-4 py-3 font-semibold">Caregiver</th>
                            <th className="px-4 py-3 font-semibold">Service Date &amp; Time</th>
                            <th className="px-4 py-3 font-semibold">Duration</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookings.map((b, index) => (
                            <tr
                              key={b.id}
                              className={`${index % 2 === 0 ? "bg-green-50" : "bg-green-100/20"} border-b border-green-100`}
                            >
                              <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                                {formatBookingId(b.id)}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-gray-900 font-medium">{b.care_seeker_name || "-"}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-gray-900 font-medium">{b.caregiver_name || "-"}</span>
                              </td>
                              <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                                {formatServiceDateTime(b)}
                              </td>
                              <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                                {formatDuration(b)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex w-fit text-xs font-medium px-2.5 py-1 rounded-full ${bookingBadgeClass(b.status)}`}
                                >
                                  {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
