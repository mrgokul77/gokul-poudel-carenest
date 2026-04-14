import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import { adminApi } from "../api/axios";

interface AdminBooking {
  id: number;
  care_seeker_name: string;
  caregiver_name: string;
  service_types?: string[];
  person_name?: string | null;
  person_age?: number | null;
  date?: string | null;
  start_time?: string | null;
  duration_hours?: number | string | null;
  total_amount?: number | string | null;
  emergency_contact_phone?: string | null;
  service_address?: string | null;
  additional_info?: string | null;
  status: string;
  created_at?: string;
}

type StatusFilter = "all" | "active" | "completed" | "cancelled" | "expired";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Active",
  completion_requested: "Active",
  awaiting_confirmation: "Active",
  completed: "Completed",
  rejected: "Cancelled",
  expired: "Expired",
};

function isActiveStatus(status: string): boolean {
  return status === "pending" || status === "accepted" || status === "completion_requested" || status === "awaiting_confirmation";
}

function bookingStatusClass(status: string): string {
  if (status === "completed") return "bg-green-100 text-green-800";
  if (isActiveStatus(status)) return "bg-yellow-100 text-yellow-800";
  if (status === "rejected") return "bg-red-100 text-red-800";
  if (status === "expired") return "bg-gray-100 text-gray-700";
  return "bg-gray-100 text-gray-700";
}

function formatServiceDateTime(booking: AdminBooking): string {
  if (!booking.date && !booking.start_time) return "-";

  const datePart = booking.date
    ? new Date(booking.date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  if (!booking.start_time) return datePart || "-";

  const [h, m] = booking.start_time.split(":").map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    return datePart ? `${datePart}, ${booking.start_time}` : booking.start_time;
  }

  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  const minute = String(m).padStart(2, "0");
  const timePart = `${hour12}:${minute} ${ampm}`;

  return datePart ? `${datePart}, ${timePart}` : timePart;
}

function formatDuration(duration: AdminBooking["duration_hours"]): string {
  if (duration === undefined || duration === null || duration === "") return "-";
  return `${duration} hr`;
}

interface BookingDetailsModalProps {
  bookingId: number | null;
  onClose: () => void;
  onSaved: () => void;
}

function BookingDetailsModal({ bookingId, onClose, onSaved }: BookingDetailsModalProps) {
  const [booking, setBooking] = useState<AdminBooking | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!bookingId) return;

    const fetchBookingDetails = async () => {
      setLoading(true);
      try {
        const { data } = await adminApi.get<AdminBooking>(`bookings/${bookingId}/`);
        setBooking(data);
      } catch {
        setBooking(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId]);

  if (!bookingId) return null;

  const handleSave = async () => {
    if (!booking) return;
    setSaving(true);
    try {
      await adminApi.patch(`bookings/${booking.id}/`, { status: "rejected" });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const status = booking?.status ?? "pending";
  const canCancel = ["pending", "accepted", "completion_requested", "awaiting_confirmation"].includes(status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-green-50 p-4 shadow-xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-500 hover:bg-green-100"
          aria-label="Close details"
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Booking Details</h3>

        {loading ? (
          <p className="text-gray-600">Loading booking details...</p>
        ) : !booking ? (
          <p className="text-red-600">Unable to load booking details.</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-gray-200 bg-green-50 p-2.5">
                <p className="text-xs text-gray-500">Booking ID</p>
                <p className="font-semibold text-gray-900">{booking.id}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-green-50 p-2.5">
                <p className="text-xs text-gray-500">Current Status</p>
                <p className="font-semibold text-gray-900">{STATUS_LABEL[booking.status] ?? booking.status}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-green-50 p-2.5">
                <p className="text-xs text-gray-500">Care Seeker</p>
                <p className="font-semibold text-gray-900">{booking.care_seeker_name || "-"}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-green-50 p-2.5">
                <p className="text-xs text-gray-500">Caregiver</p>
                <p className="font-semibold text-gray-900">{booking.caregiver_name || "-"}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-green-50 p-2.5">
                <p className="text-xs text-gray-500">Service Date & Time</p>
                <p className="font-semibold text-gray-900">{formatServiceDateTime(booking)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-green-50 p-2.5">
                <p className="text-xs text-gray-500">Duration</p>
                <p className="font-semibold text-gray-900">{formatDuration(booking.duration_hours)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-green-50 p-2.5">
                <p className="text-xs text-gray-500">Total Amount</p>
                <p className="font-semibold text-gray-900">{booking.total_amount ?? "-"}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-green-50 p-2.5">
                <p className="text-xs text-gray-500">Emergency Contact</p>
                <p className="font-semibold text-gray-900">{booking.emergency_contact_phone || "-"}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-green-50 p-2.5">
                <p className="text-xs text-gray-500">Service Address</p>
                <p className="font-semibold text-gray-900">{booking.service_address || "-"}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-green-50 p-2.5 sm:col-span-2">
                <p className="text-xs text-gray-500">Additional Information</p>
                <p className="font-semibold text-gray-900 whitespace-pre-wrap">{booking.additional_info || "-"}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              {canCancel ? (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  {saving ? "Cancelling..." : "Cancel Booking"}
                </button>
              ) : (
                <p className="text-sm text-gray-500">No actions available</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const AdminBookingsPage = () => {
  const location = useLocation();
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const PAGE_SIZE = 6;

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get<AdminBooking[]>("bookings/");
      setBookings(Array.isArray(data) ? data : []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const bookingId = Number(params.get("booking"));
    if (Number.isFinite(bookingId) && bookingId > 0) {
      setSelectedBookingId(bookingId);
    }
  }, [location.search]);

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();

    return bookings.filter((b) => {
      const bookingDate = b.date ? new Date(`${b.date}T00:00:00`) : null;
      const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
      const to = toDate ? new Date(`${toDate}T23:59:59`) : null;

      const matchesSearch =
        q.length === 0 ||
        String(b.id).includes(q) ||
        b.care_seeker_name?.toLowerCase().includes(q) ||
        b.caregiver_name?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? isActiveStatus(b.status)
            : statusFilter === "completed"
              ? b.status === "completed"
              : statusFilter === "cancelled"
                ? b.status === "rejected"
                : b.status === "expired";

      const matchesFromDate = !from || (bookingDate ? bookingDate >= from : false);
      const matchesToDate = !to || (bookingDate ? bookingDate <= to : false);

      return matchesSearch && matchesStatus && matchesFromDate && matchesToDate;
    });
  }, [bookings, search, statusFilter, fromDate, toDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredBookings.slice(start, start + PAGE_SIZE);
  }, [filteredBookings, currentPage]);

  const resetFilters = () => {
    setStatusFilter("all");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-3 order-2 lg:order-1 hidden md:block">
            <div className="space-y-4 sticky top-6">
              <div className="bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
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
                  Filter Bookings
                </h3>
              </div>

              <div className="bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="bg-green-100 rounded-lg px-3 py-2 mb-3">
                  <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                    Status
                  </span>
                </div>
                <div className="space-y-2 px-1">
                  {[
                    { value: "all", label: "All" },
                    { value: "active", label: "Active" },
                    { value: "completed", label: "Completed" },
                    { value: "cancelled", label: "Cancelled" },
                    { value: "expired", label: "Expired" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 cursor-pointer text-sm text-gray-700"
                    >
                      <input
                        type="radio"
                        name="bookingStatus"
                        value={option.value}
                        checked={statusFilter === option.value}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="bg-green-100 rounded-lg px-3 py-2 mb-3">
                  <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                    Date Range
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">From</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-green-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">To</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-green-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-500 rounded-xl shadow-sm transition-all duration-200 hover:from-green-700 hover:to-green-600 hover:shadow-md active:scale-[0.98]"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-9 order-1 lg:order-2">
            <header className="mb-4">
              <h1 className="text-2xl font-semibold text-gray-800">Booking Management</h1>
              <p className="mt-1 text-gray-600">Manage, review, and update all platform bookings.</p>
            </header>

            <div className="relative w-full mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search bookings by ID or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg bg-green-50 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-base"
              />
            </div>

            {loading ? (
              <div className="bg-green-50 border border-gray-200 rounded-lg p-10 text-center">
                <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Loading bookings...</p>
              </div>
            ) : paginatedBookings.length === 0 ? (
              <div className="bg-green-50 border border-gray-200 rounded-lg p-10 text-center">
                <p className="text-gray-500">No bookings found.</p>
              </div>
            ) : (
              <div className="bg-green-50 border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-green-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Booking ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Care Seeker
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Caregiver
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Service Date & Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedBookings.map((b, index) => (
                      <tr
                        key={b.id}
                        className={`${index % 2 === 0 ? "bg-green-50" : "bg-green-100/20"} hover:bg-green-100/80 transition-colors`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-800">{b.id}</td>
                        <td className="px-4 py-3 text-sm text-gray-800">{b.care_seeker_name || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{b.caregiver_name || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatServiceDateTime(b)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDuration(b.duration_hours)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${bookingStatusClass(b.status)}`}
                          >
                            {STATUS_LABEL[b.status] ?? b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => setSelectedBookingId(b.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && filteredBookings.length > 0 && (
              <div className="flex items-center justify-end gap-2 mt-4">
                <button
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
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <BookingDetailsModal
        bookingId={selectedBookingId}
        onClose={() => setSelectedBookingId(null)}
        onSaved={fetchBookings}
      />
    </div>
  );
};

export default AdminBookingsPage;
