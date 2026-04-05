import { useState, useEffect, useMemo } from "react";
import { AlertCircle, X } from "lucide-react";
import Navbar from "../../components/Navbar";
import { complaintsApi, bookingsApi } from "../../api/axios";
import VerifiedAvatar from "../../components/VerifiedAvatar";

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
  booking_id: number;
  booking_date: string | null;
  caregiver_name: string;
  category: string;
  description: string;
  status: "open" | "investigating" | "resolved" | "dismissed";
  created_at: string;
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
  completed: "bg-gray-200 text-gray-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-gray-200 text-gray-600",
};
const bookingStatusLabels: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  completion_requested: "Awaiting Confirmation",
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
  const [booking, setBookingModal] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchBooking();
    }
  }, [isOpen, bookingId]);

  const fetchBooking = async () => {
    if (import.meta.env.DEV) {
      console.log("[BookingDetailsModal] Fetching details for bookingId:", bookingId);
    }
    setLoading(true);
    try {
      // MyBookings.tsx uses bookingsApi.get("list/") to fetch bookings
      const res = await bookingsApi.get("list/");
      const bookingData = res.data.find((b: Booking) => b.id === bookingId);
      if (bookingData) {
        setBookingModal(bookingData);
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

const MyComplaints = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  const [bookingModal, setBookingModal] = useState<{ open: boolean; bookingId: number | null }>({
    open: false,
    bookingId: null,
  });

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await complaintsApi.get("my-complaints/");
      setComplaints(res.data);
    } catch (err) {
      console.error("Failed to fetch complaints", err);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const filteredComplaints = useMemo(() => {
    if (statusFilter === "all") return complaints;
    return complaints.filter((c) => c.status === statusFilter);
  }, [complaints, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredComplaints.length / itemsPerPage));
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentComplaints = filteredComplaints.slice(indexOfFirst, indexOfLast);

  const filterOptions = [
    { value: "all", label: "All" },
    { value: "open", label: "Open" },
    { value: "investigating", label: "Investigating" },
    { value: "resolved", label: "Resolved" },
    { value: "dismissed", label: "Dismissed" },
  ];

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-6 mb-6">
          <div className="w-60 bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-2">
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
            <h3 className="text-base font-bold text-gray-800">Filter Complaints</h3>
          </div>
          <div>
            <h1 className="text-2xl font-semibold">My Complaints</h1>
            <p className="text-gray-600 text-sm mt-1">
              Track and manage complaints you have raised.
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Filter Sidebar */}
          <aside className="w-full lg:w-60 space-y-4 sticky top-6 shrink-0">

            <div className="bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="bg-green-100 rounded-lg px-3 py-2 mb-4">
                <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                  Status
                </span>
              </div>
              <div className="space-y-3 px-1">
                {filterOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer group"
                  >
                    <input
                      type="radio"
                      name="complaintStatusFilter"
                      value={option.value}
                      checked={statusFilter === option.value}
                      onChange={() => {
                        setStatusFilter(option.value);
                        setCurrentPage(1);
                      }}
                      className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                    />
                    <span className="group-hover:text-green-700 transition-colors">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm">
              <button
                type="button"
                onClick={resetFilters}
                className="w-full py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-500 rounded-xl transition-all duration-200 shadow-sm hover:from-green-700 hover:to-green-600 hover:shadow-md active:scale-[0.98]"
              >
                Reset Filters
              </button>
            </div>
          </aside>

          {/* Complaints List Section */}
          <section className="flex-1 w-full">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-green-600" />
              </div>
            ) : filteredComplaints.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl shadow-sm p-12 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No complaints found
                </h3>
                <p className="text-gray-600">
                  {statusFilter === "all"
                    ? "You haven't filed any complaints yet."
                    : `You don't have any complaints with status "${statusFilter}".`}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <ul className="space-y-6">
                  {currentComplaints.map((complaint) => (
                    <li
                      key={complaint.id}
                      className="bg-green-50 border border-green-300 border-l-4 border-l-green-500 rounded-2xl shadow-sm p-6"
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-gray-900">{complaint.category}</h4>
                        <button
                          onClick={() => setBookingModal({ open: true, bookingId: complaint.booking_id })}
                          className="text-xs font-semibold text-green-600 hover:text-green-700 transition-colors whitespace-nowrap"
                        >
                          View Booking
                        </button>
                      </div>


                      <div className="mt-4 space-y-1">
                        <p className="text-sm">
                          <span className="text-gray-600 font-medium">Filed:</span>{" "}
                          <span className="text-gray-900">{formatDate(complaint.created_at)}</span>
                        </p>


                      </div>

                      <p className="text-sm text-gray-700 mt-4 leading-relaxed italic border-l-2 border-gray-200 pl-3">
                        {complaint.description.length > 80
                          ? complaint.description.substring(0, 80) + "…"
                          : complaint.description}
                      </p>

                      <div className="mt-5 pt-4 border-t border-green-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-green-700 font-medium italic">
                            {complaint.status === "open"
                              ? "Your complaint is currently open and awaiting review."
                              : complaint.status === "investigating"
                              ? "Your complaint is being investigated by our team."
                              : complaint.status === "resolved"
                              ? "This complaint has been resolved by our admin team."
                              : "This complaint has been dismissed."}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Pagination */}
                <div className="flex justify-end items-center gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="border border-green-300 rounded-lg px-3 py-1 text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-50 transition-colors"
                  >
                    Prev
                  </button>
                  <span className="text-sm text-gray-700 font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="border border-green-300 rounded-lg px-3 py-1 text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
      <BookingDetailsModal 
        isOpen={bookingModal.open} 
        onClose={() => setBookingModal({ ...bookingModal, open: false })} 
        bookingId={bookingModal.bookingId} 
      />
    </div>
  );
};

export default MyComplaints;
