import { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";
import { bookingsApi, paymentsApi } from "../api/axios";

interface Booking {
  id: number;
  family_name: string;
  caregiver_name: string;
  caregiver_profile_image?: string | null;
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
  payment_status?: string;
  created_at: string;
  notes?: string;
}

const CareseekerBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState<number | null>(null);
  const [payClicked, setPayClicked] = useState<number | null>(null);

  // Filter state (copied UI from CaregiverBookingRequests)
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingsApi.get("list/");
      setBookings(res.data);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const refetch = () => {
      fetchBookings();
    };

    const onVisibilityChange = () => {
      if (!document.hidden) {
        refetch();
      }
    };

    window.addEventListener("focus", refetch);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", refetch);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const formatDuration = (hours: number) =>
    `${hours} ${hours === 1 ? "hour" : "hours"}`;

  const resetFilters = () => {
    setBookingStatusFilter("all");
    setPaymentStatusFilter("all");
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
      pending: "bg-amber-100 text-amber-800 border-amber-200",
      accepted: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
      paid: "bg-purple-100 text-purple-800 border-purple-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-gray-100 text-gray-700 border-gray-200",
    };
    const labels = {
      pending: "Pending",
      accepted: "Active",
      rejected: "Declined",
      paid: "Paid",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    const dotColors: { [key: string]: string } = {
      pending: "bg-amber-500",
      accepted: "bg-green-500",
      rejected: "bg-red-500",
      paid: "bg-purple-500",
      completed: "bg-green-500",
      cancelled: "bg-gray-500",
    };
    return (
      <span
        className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${styles[status as keyof typeof styles] || "bg-gray-100 text-gray-600 border-gray-200"}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColors[status] || "bg-gray-500"}`}
        />
        {labels[status as keyof typeof labels] ||
          status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  const handleKhaltiPayment = async (
    bookingId: number,
    totalAmount: string | null | undefined,
  ) => {
    if (!totalAmount) {
      alert("Payment amount not available");
      return;
    }

    if (payClicked === bookingId || paymentLoading === bookingId) {
      console.log("DEBUG - Pay button already clicked, ignoring repeat click.");
      return;
    }

    setPayClicked(bookingId);
    setPaymentLoading(bookingId);
    console.log("DEBUG - Sending payment request:", { booking_id: bookingId });
    try {
      const response = await paymentsApi.post("initiate/", {
        booking_id: bookingId,
      });

      // Debug: Log response
      console.log("DEBUG - Payment initiate response:", response.data);

      // Redirect to Khalti payment page
      if (response.data.payment_url) {
        window.location.href = response.data.payment_url;
      } else {
        alert("Failed to initiate payment");
        setPayClicked(null);
      }
    } catch (error: any) {
      console.error("DEBUG - Payment error:", error.response?.data);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        "Payment initiation failed";
      alert(errorMessage);
      setPayClicked(null);
    } finally {
      setPaymentLoading(null);
    }
  };

  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];

    // Booking status filter
    if (bookingStatusFilter !== "all") {
      filtered = filtered.filter((b) => b.status === bookingStatusFilter);
    }

    // Payment status filter
    if (paymentStatusFilter === "paid") {
      filtered = filtered.filter((b) => b.status === "paid");
    } else if (paymentStatusFilter === "unpaid") {
      filtered = filtered.filter((b) => b.status !== "paid");
    }

    return filtered;
  }, [bookings, bookingStatusFilter, paymentStatusFilter]);

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left – Filters (match FindCaregiver sidebar card sizing) */}
          <div className="lg:col-span-3 order-2 lg:order-1 hidden md:block">
            <div className="space-y-4 sticky top-6">
              {/* Filter Header */}
              <div className="bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filter Requests
                </h3>
              </div>

             

              {/* Booking Status Filter Card */}
              <div className="bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="bg-green-100 rounded-lg px-3 py-2 mb-3">
                  <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Booking Status</span>
                </div>
                <div className="space-y-2 px-1">
                  {[
                    { value: "all", label: "All" },
                    { value: "pending", label: "Pending" },
                    { value: "accepted", label: "Accepted" },
                    { value: "rejected", label: "Declined" },
                    { value: "cancelled", label: "Cancelled" },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input
                        type="radio"
                        name="bookingStatusFilter"
                        value={option.value}
                        checked={bookingStatusFilter === option.value}
                        onChange={(e) => setBookingStatusFilter(e.target.value)}
                        className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Payment Status Filter Card */}
              <div className="bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="bg-green-100 rounded-lg px-3 py-2 mb-3">
                  <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Payment Status</span>
                </div>
                <div className="space-y-2 px-1">
                  {[
                    { value: "all", label: "All" },
                    { value: "paid", label: "Paid" },
                    { value: "unpaid", label: "Unpaid" },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input
                        type="radio"
                        name="paymentStatusFilter"
                        value={option.value}
                        checked={paymentStatusFilter === option.value}
                        onChange={(e) => setPaymentStatusFilter(e.target.value)}
                        className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Reset Button Card */}
              <div className="bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                <button
                  onClick={resetFilters}
                  className="w-full py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-500 rounded-xl shadow-sm transition-all duration-200 hover:from-green-700 hover:to-green-600 hover:shadow-md active:scale-[0.98]"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          {/* Right – Booking Cards */}
          <div className="lg:col-span-9 order-1 lg:order-2">
            <h1 className="text-xl font-medium text-gray-800 mb-6">
              My Bookings
            </h1>
            {loading ? (
              <div className="py-12 text-center text-gray-500">Loading...</div>
            ) : filteredBookings.length === 0 ? (
              <div className="bg-green-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500 shadow-sm">
                <p className="mb-4">
                  You have not made any booking requests yet.
                </p>
                <Link
                  to="/careseeker/find-caregiver"
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  Find a caregiver →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((b) => (
                  <div
                    key={b.id}
                    className="max-w-4xl mx-auto bg-green-50 rounded-xl shadow-md border border-green-200 overflow-hidden"
                  >
                    <div className="border-t-4 border-t-green-500" />
                    <div className="p-5 space-y-4">
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: Caregiver Info */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {b.caregiver_profile_image ? (
                            <img
                              src={b.caregiver_profile_image}
                              alt={b.caregiver_name}
                              className="w-14 h-14 rounded-full border-2 border-green-300 object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center shrink-0">
                              <span className="text-lg font-semibold text-green-800">
                                {getInitial(b.caregiver_name)}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {b.caregiver_name}
                            </h3>
                            {b.person_name && (
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold text-gray-900">
                                  Care for:
                                </span>{" "}
                                <span className="text-gray-800">
                                  {b.person_name}
                                </span>
                                {b.person_age && (
                                  <span className="text-gray-500">
                                    {" "}
                                    ({b.person_age} yrs)
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Status & Cost */}
                        <div className="flex flex-col items-end shrink-0">
                          <StatusBadge status={b.status} />
                          {b.total_amount && (
                            <span className="mt-2 text-base font-semibold text-gray-900">
                              Rs {Number(b.total_amount).toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Services - Horizontal Wrap */}
                      {b.service_types && b.service_types.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {b.service_types.map((service) => (
                            <span
                              key={service}
                              className="px-2 py-0.5 text-xs font-medium text-green-800 bg-green-100 rounded-full border border-green-200"
                            >
                              {service}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Content Row - 2-column layout */}
                      <div className="grid grid-cols-2 gap-6">
                        {/* Left: Schedule & Contact */}
                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                          <p className="text-xs uppercase tracking-wide text-green-800 font-semibold mb-2">
                            Schedule & Contact
                          </p>
                          <div className="space-y-1.5">
                            <p className="text-sm font-medium text-gray-900">
                              {b.date}
                              {b.start_time && (
                                <span className="text-gray-700 font-normal">
                                  {" "}
                                  at {b.start_time}
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-700">
                              Duration: {formatDuration(b.duration_hours)}
                            </p>
                            {b.emergency_contact_phone && (
                              <p className="text-sm text-gray-700">
                                Contact: {b.emergency_contact_phone}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Additional Care Information */}
                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                          <p className="text-xs uppercase tracking-wide text-green-800 font-semibold mb-2">
                            Additional Care Information
                          </p>
                          <div className="space-y-1.5">
                            {b.additional_info ? (
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {b.additional_info}
                              </p>
                            ) : b.notes ? (
                              <p className="text-sm text-gray-700 italic">
                                {b.notes}
                              </p>
                            ) : (
                              <p className="text-sm text-gray-600 italic">
                                No additional information
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Payment / Status Action */}
                      {(b.status === "accepted" ||
                        b.status === "completed" ||
                        b.status === "cancelled") && (
                        <div className="flex justify-end pt-4 border-t border-green-200">
                          {b.status === "accepted" ? (
                            <button
                              onClick={() => handleKhaltiPayment(b.id, b.total_amount)}
                              disabled={paymentLoading === b.id || payClicked === b.id}
                              className="inline-flex items-center gap-2 px-4 py-2 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ backgroundColor: "#5C2D91" }}
                              onMouseEnter={(e) =>
                                !paymentLoading &&
                                !payClicked &&
                                (e.currentTarget.style.backgroundColor = "#4a2475")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor = "#5C2D91")
                              }
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                />
                              </svg>
                              {paymentLoading === b.id || payClicked === b.id
                                ? "Processing..."
                                : "Pay with Khalti"}
                            </button>
                          ) : b.status === "completed" ? (
                            <span className="inline-flex items-center px-3 py-1.5 text-sm font-semibold rounded-full bg-green-100 text-green-800 border border-green-200 cursor-not-allowed">
                              Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1.5 text-sm font-semibold rounded-full bg-gray-100 text-gray-700 border border-gray-200 cursor-not-allowed">
                              Cancelled
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareseekerBookings;
