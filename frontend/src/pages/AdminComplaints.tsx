import { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import { Search, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Eye, X } from "lucide-react";
import { complaintsApi, bookingsApi } from "../api/axios";
import VerifiedAvatar from "../components/VerifiedAvatar";

interface Booking {
  id: number;
  family_name?: string;
  caregiver_name?: string;
  caregiver_profile_image?: string | null;
  family_profile_image?: string | null;
  verification_status?: string | null;
  service_types?: string[];
  person_name?: string;
  person_age?: number;
  date: string;
  start_time?: string;
  duration_hours: number;
  total_amount?: string | null;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  additional_info?: string;
  status: string;
  booking_status?: string;
  payment_status?: string;
  review_rating?: number | null;
  has_review?: boolean;
  created_at: string;
  notes?: string;
  address?: string;
  service_address?: string;
}

interface Complaint {
  id: number;
  reporter_username: string;
  caregiver_name: string;
  booking_id: number | null;
  booking_date?: string | null;
  category: string;
  description: string;
  status: "open" | "investigating" | "resolved" | "dismissed";
  created_at: string;
  updated_at?: string;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// status badge styling - shows if booking is pending, accepted, completed, etc
const bookingStatusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  accepted: "bg-blue-100 text-blue-700",
  completion_requested: "bg-amber-100 text-amber-700",
  awaiting_confirmation: "bg-amber-100 text-amber-700",
  completed: "bg-gray-200 text-gray-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-gray-200 text-gray-600",
};
const bookingStatusLabels: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  completion_requested: "Awaiting Confirmation",
  awaiting_confirmation: "Awaiting Confirmation",
  completed: "Completed",
  rejected: "Declined",
  expired: "Expired",
};

const BookingStatusBadge = ({ status }: { status?: string }) => {
  const safeStatus = status || "pending";
  const style = bookingStatusStyles[safeStatus] || "bg-gray-100 text-gray-700";
  const label = bookingStatusLabels[safeStatus] || safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1);
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${style}`}>
      {label}
    </span>
  );
};

// formats duration like "2 hours" or "1 hour"
const formatDuration = (hours: number) => `${hours} ${hours === 1 ? "hour" : "hours"}`;

// converts time string (HH:mm:ss) to 12-hour format with AM/PM
const formatTime12Hour = (timeStr?: string) => {
  if (!timeStr) return "";
  const [hour, minute] = timeStr.split(":");
  const date = new Date();
  date.setHours(Number(hour));
  date.setMinutes(Number(minute));
  let hours = date.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes} ${ampm}`;
};

const BookingDetailsModal = ({ 
  isOpen, 
  onClose, 
  bookingId 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  bookingId: number | null
}) => {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchBooking();
    }
  }, [isOpen, bookingId]);

  const fetchBooking = async () => {
    setLoading(true);
    try {
      // In Admin context, we need to handle this carefully. 
      // The bookingsApi might not have a direct detail endpoint for admin without specific permissions.
      // But based on project constraints, we use bookingsApi.get("list/") or similar.
      // However, admin can also use adminApi.get(`bookings/${bookingId}/`) if it exists.
      // For now, mirroring MyComplaints logic as requested.
      const res = await bookingsApi.get("list/");
      const bookingData = res.data.find((b: Booking) => b.id === bookingId);
      if (bookingData) {
        setBooking(bookingData);
      } else {
        console.error("[BookingDetailsModal] Booking not found in list for ID:", bookingId);
      }
    } catch (err: any) {
      console.error("[BookingDetailsModal] API Error:", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const status = booking?.booking_status || booking?.status || "pending";
  const paymentStatus = (booking?.payment_status ?? "unpaid") as string;
  const displayName = booking?.caregiver_name || booking?.family_name || "";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-4xl mx-auto overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Booking Details</h3>

          {loading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto" />
            </div>
          ) : booking ? (
            <div className="max-w-4xl w-full mx-auto bg-green-50 rounded-2xl shadow-lg border border-green-200 border-t-4 border-t-green-500 p-6">
              {/* Header Row */}
              <div className="flex items-start justify-between gap-5">
                <div className="flex items-center gap-3 min-w-0">
                  <VerifiedAvatar
                    src={booking.caregiver_profile_image || null}
                    username={displayName || "Caregiver"}
                    isVerified={booking.verification_status === "approved"}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 truncate">
                      {displayName}
                    </h3>
                    {booking.person_name && (
                      <p className="text-sm text-gray-500 truncate">
                        <span className="font-semibold text-gray-800">Care for:</span> {booking.person_name}
                        {booking.person_age && (
                          <span className="text-gray-400"> ({booking.person_age} yrs)</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 gap-2">
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <BookingStatusBadge
                      status={status}
                    />
                    {paymentStatus === "paid" ? (
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full ml-2">
                        Paid
                      </span>
                    ) : (
                      <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full ml-2">
                        Unpaid
                      </span>
                    )}
                  </div>
                  {booking.total_amount && (
                    <span className="text-base font-semibold text-gray-900">
                      Rs {Number(booking.total_amount).toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              </div>

              {/* 3-column grid layout */}
              <div className="grid grid-cols-1 md:[grid-template-columns:1.1fr_0.9fr_1fr] gap-5 mt-5">
                {/* Schedule & Contact */}
                <div className="bg-green-50 rounded-xl border border-green-100 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-green-900 font-bold mb-2">Schedule & Contact</p>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">{booking.date}{booking.start_time && <span className="text-gray-700 font-normal"> at {formatTime12Hour(booking.start_time)}</span>}</p>
                    <p className="text-sm text-gray-600"><span className="font-semibold">Duration:</span> {formatDuration(booking.duration_hours)}</p>
                    {booking.emergency_contact_phone && (
                      <p className="text-sm text-gray-600"><span className="font-semibold">Contact:</span> {booking.emergency_contact_phone}</p>
                    )}
                    {(booking.address || booking.service_address) && (
                      <p className="text-sm text-gray-600"><span className="font-semibold">Address:</span> {booking.address || booking.service_address}</p>
                    )}
                  </div>
                </div>
                {/* Services */}
                <div className="bg-green-50 rounded-xl border border-green-100 p-4">
                  <p className="text-xs uppercase tracking-wide text-green-900 font-bold mb-2">Services</p>
                  <div className="flex flex-wrap gap-2">
                    {booking.service_types && booking.service_types.length > 0 ? (
                      booking.service_types.map((service) => (
                        <span
                          key={service}
                          className="px-2 py-0.5 text-xs font-medium text-green-800 bg-green-100 rounded-full border border-green-200"
                        >
                          {service}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400 italic">No services</span>
                    )}
                  </div>
                </div>
                {/* Additional Care Information */}
                <div className="bg-green-50 rounded-xl border border-green-100 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-green-900 font-bold mb-2">Additional Care Information</p>
                  <div className="space-y-1">
                    {booking.additional_info ? (
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{booking.additional_info}</p>
                    ) : booking.notes ? (
                      <p className="text-sm text-gray-500 italic">{booking.notes}</p>
                    ) : (
                      <p className="text-sm text-gray-300 italic">No additional information</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-gray-500 italic">
              Failed to load booking details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const statusLabels: Record<string, string> = {
  open: "Open",
  investigating: "Investigating",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

const AdminComplaints = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [updating, setUpdating] = useState(false);
  const [bookingModal, setBookingModal] = useState<{ open: boolean; bookingId: number | null }>({
    open: false,
    bookingId: null,
  });
  const PAGE_SIZE = 6;

  const selectedComplaint = useMemo(
    () => complaints.find((c) => c.id === selectedComplaintId) || null,
    [complaints, selectedComplaintId]
  );

  const fetchComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await complaintsApi.get("admin/");
      setComplaints(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    setUpdating(true);
    try {
      await complaintsApi.patch(`admin/${id}/`, { status: newStatus });
      setSuccessMessage(`Complaint status updated to ${newStatus}`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchComplaints();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        return (
          c.reporter_username.toLowerCase().includes(q) ||
          c.caregiver_name.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [complaints, filterStatus, searchQuery]);

  const totalPages = Math.ceil(filteredComplaints.length / PAGE_SIZE) || 1;
  const paginatedComplaints = useMemo(
    () =>
      filteredComplaints.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredComplaints, currentPage]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchQuery]);

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-10">
        {successMessage && (
          <div className="mb-5 p-3 bg-green-50 border border-green-200 rounded-lg flex gap-2">
            <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={18} />
            <p className="text-green-800 text-sm">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
            <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Sidebar Filter */}
          <aside className="w-full lg:w-60 space-y-4 sticky top-6 shrink-0">
            <div className="bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-green-600" />
                Filter Complaints
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
                  { value: "open", label: "Open" },
                  { value: "investigating", label: "Investigating" },
                  { value: "resolved", label: "Resolved" },
                  { value: "dismissed", label: "Dismissed" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 cursor-pointer text-sm text-gray-700"
                  >
                    <input
                      type="radio"
                      name="filterStatus"
                      value={option.value}
                      checked={filterStatus === option.value}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm">
              <button
                onClick={() => {
                  setFilterStatus("all");
                  setSearchQuery("");
                }}
                className="w-full py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm"
              >
                Reset Filters
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 w-full">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              Complaints Management
            </h2>

            <div className="relative w-full mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search complaints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-green-50 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm transition-all"
              />
            </div>

            {loading ? (
              <div className="bg-green-50 border border-gray-200 rounded-xl p-10 text-center">
                <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Loading complaints...</p>
              </div>
            ) : paginatedComplaints.length === 0 ? (
              <div className="bg-green-50 border border-gray-200 rounded-xl p-10 text-center">
                <p className="text-gray-500">
                  {error ? "Could not load complaints." : "No complaints found."}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {paginatedComplaints.map((c) => (
                  <div
                    key={c.id}
                    className="bg-green-50 border border-green-300 border-l-4 border-l-green-500 rounded-2xl shadow-sm p-6"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-gray-900">{c.category}</h4>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedComplaintId(c.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Manage
                        </button>
                        <button
                          onClick={() => setBookingModal({ open: true, bookingId: c.booking_id })}
                          className="text-xs font-semibold text-green-600 hover:text-green-700 transition-colors whitespace-nowrap"
                        >
                          View Booking
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1">
                      <p className="text-sm">
                        <span className="text-gray-600 font-medium">Filed:</span>{" "}
                        <span className="text-gray-900">{formatDate(c.created_at)}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-gray-600 font-medium">Reporter:</span>{" "}
                        <span className="text-gray-900">{c.reporter_username}</span>
                      </p>
                    </div>

                    <p className="text-sm text-gray-700 mt-4 leading-relaxed italic border-l-2 border-gray-200 pl-3">
                      {c.description.length > 80
                        ? c.description.substring(0, 80) + "…"
                        : c.description}
                    </p>

                  </div>
                ))}
              </div>
            )}

            {!loading && filteredComplaints.length > 0 && (
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

      {/* Booking Details Modal */}
      <BookingDetailsModal 
        isOpen={bookingModal.open} 
        onClose={() => setBookingModal({ ...bookingModal, open: false })} 
        bookingId={bookingModal.bookingId} 
      />

      {/* Detail Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedComplaintId(null)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden animate-modal-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Complaint Details</h3>
              <button
                onClick={() => setSelectedComplaintId(null)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Reporter</p>
                  <p className="text-sm font-medium text-gray-900">{selectedComplaint.reporter_username}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Caregiver</p>
                  <p className="text-sm font-medium text-gray-900">{selectedComplaint.caregiver_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Category</p>
                  <p className="text-sm font-medium text-gray-900">{selectedComplaint.category}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Date Reported</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(selectedComplaint.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</p>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-700 leading-relaxed max-h-40 overflow-y-auto">
                  {selectedComplaint.description}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {["open", "investigating", "resolved", "dismissed"].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleUpdateStatus(selectedComplaint.id, s)}
                      disabled={updating || selectedComplaint.status === s}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        selectedComplaint.status === s
                          ? "bg-green-600 text-white shadow-md ring-2 ring-green-100"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      } disabled:opacity-50`}
                    >
                      {statusLabels[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedComplaintId(null)}
                className="px-6 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminComplaints;
