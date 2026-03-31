import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { careseekerApi } from "../api/axios";
import {
  RecentRequests,
  QuickActions,
  type RecentBooking,
} from "../components/dashboard";
import {
  Calendar,
  Clock,
  CheckCircle,
  Activity,
  Search,
} from "lucide-react";

interface Notification {
  type: string;
  message: string;
  created_at: string;
  booking_id: number;
}

interface DashboardSummary {
  active_bookings: number;
  pending_requests: number;
  completed_services: number;
  total_bookings: number;
  recent_bookings: RecentBooking[];
  notifications: Notification[];
}

const CareseekerDashboard = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await careseekerApi.get("dashboard-summary/");
      setSummary(res.data);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-green-600" />
        </div>
      </div>
    );
  }

  const hasBookings = (summary?.total_bookings ?? 0) > 0;

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-gray-800">
          Find caregivers and manage your bookings.
          </h1>
        </header>

        {!summary ? (
          <div className="bg-green-50 rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-500">
            Failed to load dashboard. Please try again later.
          </div>
        ) : !hasBookings ? (
          /* Empty state */
          <div className="bg-green-50 rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <p className="text-gray-600 mb-6">
              You have not made any bookings yet.
            </p>
            <Link
              to="/careseeker/find-caregiver"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              <Search className="w-5 h-5" />
              Find Caregiver
            </Link>
          </div>
        ) : (
          <>
            {/* Section 1 — Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Active Bookings",
                  value: summary.active_bookings,
                  icon: Calendar,
                  color: "text-blue-600",
                },
                {
                  label: "Pending Requests",
                  value: summary.pending_requests,
                  icon: Clock,
                  color: "text-amber-600",
                },
                {
                  label: "Completed Services",
                  value: summary.completed_services,
                  icon: CheckCircle,
                  color: "text-green-600",
                },
                {
                  label: "Total Care Sessions",
                  value: summary.total_bookings,
                  icon: Activity,
                  color: "text-green-600",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="bg-green-50 rounded-xl border border-gray-200 shadow-sm p-5"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center ${card.color}`}
                    >
                      <card.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {card.value}
                      </p>
                      <p className="text-sm text-gray-600">{card.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <QuickActions variant="careseeker" layout="vertical" />
              </div>
              <div className="lg:col-span-2">
                <RecentRequests
                  requests={summary.recent_bookings || []}
                  role="careseeker"
                  viewAllHref="/careseeker/bookings"
                  showFindCaregiverButton
                />
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
};

export default CareseekerDashboard;
