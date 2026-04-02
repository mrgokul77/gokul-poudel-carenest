import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { QuickActions } from "../components/dashboard";
import { adminApi } from "../api/axios";
import {
  Users,
  UserCheck,
  CalendarDays,
  ClipboardCheck,
} from "lucide-react";

interface RecentBookingRow {
  id: number;
  care_seeker_name: string;
  caregiver_name: string;
  status: string;
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
  rejected: "Declined",
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
      return "bg-red-100 text-red-800";
    case "completion_requested":
      return "bg-amber-100 text-amber-800";
    case "expired":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function complaintBadgeClass(status: string): string {
  if (status === "resolved") return "bg-green-100 text-green-800";
  return "bg-yellow-100 text-yellow-800";
}

function complaintStatusLabel(status: string): string {
  if (status === "resolved") return "Resolved";
  return "Open";
}

const AdminDashboard = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
  const complaints = summary?.recent_complaints ?? [];
  const noActivity = bookings.length === 0 && complaints.length === 0;



  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-gray-600">Monitor and manage system activities</p>
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
                      className={`w-10 h-10 rounded-lg bg-white/80 flex items-center justify-center ${card.color}`}
                    >
                      <card.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                      <p className="text-sm text-gray-600">{card.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-6 lg:col-span-1">
                <QuickActions variant="admin" />
              </div>

              <div className="lg:col-span-2 space-y-6">
                {noActivity ? (
                  <div className="bg-green-50 rounded-xl border border-gray-200 shadow-sm p-10 text-center text-gray-600">
                    No recent activity
                  </div>
                ) : (
                  <>
                    <div className="bg-green-50 rounded-xl border border-gray-200 shadow-sm p-5">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Bookings</h2>
                      {bookings.length === 0 ? (
                        <p className="text-sm text-gray-600">No recent bookings</p>
                      ) : (
                        <ul className="space-y-3">
                          {bookings.map((b) => (
                            <li
                              key={b.id}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg bg-white/70 border border-gray-100 px-3 py-2.5"
                            >
                              <div className="text-sm">
                                <p className="font-medium text-gray-900">
                                  {b.care_seeker_name}
                                  <span className="text-gray-400 font-normal mx-1">→</span>
                                  {b.caregiver_name}
                                </p>
                              </div>
                              <span
                                className={`inline-flex w-fit text-xs font-medium px-2.5 py-0.5 rounded-full ${bookingBadgeClass(b.status)}`}
                              >
                                {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="bg-green-50 rounded-xl border border-gray-200 shadow-sm p-5">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Complaints</h2>
                      {complaints.length === 0 ? (
                        <p className="text-sm text-gray-600">No recent complaints</p>
                      ) : (
                        <ul className="space-y-3">
                          {complaints.map((c) => (
                            <li
                              key={c.id}
                              className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 rounded-lg bg-white/70 border border-gray-100 px-3 py-2.5"
                            >
                              <div className="text-sm min-w-0">
                                <p className="font-medium text-gray-900">{c.user_name}</p>
                                <p className="text-gray-600 truncate">{c.subject}</p>
                              </div>
                              <span
                                className={`inline-flex w-fit shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-full ${complaintBadgeClass(c.status)}`}
                              >
                                {complaintStatusLabel(c.status)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
