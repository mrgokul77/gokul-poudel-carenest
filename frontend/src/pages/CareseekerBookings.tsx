import { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import BookingCard, { type Booking } from "../components/BookingCard";
import { bookingsApi, paymentsApi, reviewsApi } from "../api/axios";
import { ChevronLeft, ChevronRight } from "lucide-react";

const CareseekerBookings = () => {
  const [bookings, setBookings] = useState<Booking[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState<number | null>(null);
  const [payClicked, setPayClicked] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [ratingModalBooking, setRatingModalBooking] = useState<Booking | null>(null);
  const [ratingValue, setRatingValue] = useState<number>(0);
  const [ratingHover, setRatingHover] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState<string>("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");


  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingsApi.get("list/");
      const data = Array.isArray(res?.data) ? res.data : [];
      setBookings(data);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setBookingStatusFilter("all");
    setPaymentStatusFilter("all");
  };

  const handleKhaltiPayment = async (
    bookingId: number,
    totalAmount?: string | null,
  ) => {
    if (!totalAmount) {
      alert("Payment amount not available");
      return;
    }

    if (payClicked === bookingId || paymentLoading === bookingId) return;

    setPayClicked(bookingId);
    setPaymentLoading(bookingId);

    try {
      const response = await paymentsApi.post("initiate/", {
        booking_id: bookingId,
      });

      if (response.data.payment_url) {
        window.location.href = response.data.payment_url;
      } else {
        alert("Failed to initiate payment");
        setPayClicked(null);
      }
    } catch (error: any) {
      alert(
        error.response?.data?.error ||
          error.response?.data?.detail ||
          "Payment initiation failed",
      );
      setPayClicked(null);
    } finally {
      setPaymentLoading(null);
    }
  };

  const filteredBookings = useMemo(() => {
    if (!Array.isArray(bookings)) return [];
    return bookings.filter((b) => {
      // Use fallback logic for status fields
      const status = b.booking_status || b.status;
      const paymentStatus = typeof b.payment_status !== "undefined" ? b.payment_status : "unpaid";

      const bookingMatch =
        bookingStatusFilter === "all" || status === bookingStatusFilter;
      const paymentMatch =
        paymentStatusFilter === "all"
          ? true
          : paymentStatusFilter === "paid"
            ? paymentStatus === "paid"
            : paymentStatus !== "paid";
      return bookingMatch && paymentMatch;
    });
  }, [bookings, bookingStatusFilter, paymentStatusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredBookings.length / itemsPerPage),
  );
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentBookings = filteredBookings.slice(indexOfFirst, indexOfLast);

  const handleOpenRating = (booking: Booking) => {
    setRatingModalBooking(booking);
    setRatingValue(0);
    setRatingHover(0);
    setRatingComment("");
  };

  const confirmCompletion = async (id: number) => {
    try {
      await bookingsApi.post(`${id}/confirm-completion/`);
      await fetchBookings();
    } catch (error: any) {
      alert(
        error.response?.data?.error ||
          error.response?.data?.detail ||
          "Failed to confirm completion",
      );
    }
  };

  const handleSubmitRating = async () => {
    if (!ratingModalBooking) return;
    if (ratingValue < 1 || ratingValue > 5) {
      alert("Rating must be between 1 and 5 stars.");
      return;
    }
    setRatingSubmitting(true);
    try {
      await reviewsApi.post("", {
        booking_id: ratingModalBooking.id,
        rating: ratingValue,
        comment: ratingComment.trim() || undefined,
      });
      // Refresh bookings to get updated review flags
      await fetchBookings();
      setRatingModalBooking(null);
    } catch (error: any) {
      alert(
        error.response?.data?.error ||
          error.response?.data?.detail ||
          "Failed to submit review",
      );
    } finally {
      setRatingSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-3 hidden md:block">
            <div className="space-y-6 sticky top-6">
              {/* Filter Header */}
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
                  Filter Requests
                </h3>
              </div>

              {/* Booking Status */}
              <div className="bg-green-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="bg-green-100 rounded-xl px-4 py-3 mb-4">
                  <span className="text-xs font-semibold text-green-800 uppercase tracking-wide">
                    Booking Status
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    { value: "all", label: "All" },
                    { value: "pending", label: "Pending" },
                    { value: "accepted", label: "Accepted" },
                    { value: "completion_requested", label: "Awaiting Confirmation" },
                    { value: "completed", label: "Completed" },
                    { value: "rejected", label: "Declined" },
                    { value: "expired", label: "Expired" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="bookingStatusFilter"
                        value={option.value}
                        checked={bookingStatusFilter === option.value}
                        onChange={(e) => setBookingStatusFilter(e.target.value)}
                        className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Payment Status */}
              <div className="bg-green-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="bg-green-100 rounded-xl px-4 py-3 mb-4">
                  <span className="text-xs font-semibold text-green-800 uppercase tracking-wide">
                    Payment Status
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    { value: "all", label: "All" },
                    { value: "paid", label: "Paid" },
                    { value: "unpaid", label: "Unpaid" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="paymentStatusFilter"
                        value={option.value}
                        checked={paymentStatusFilter === option.value}
                        onChange={(e) => setPaymentStatusFilter(e.target.value)}
                        className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Reset Button */}
              <div className="bg-green-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
                <button
                  onClick={resetFilters}
                  className="w-full py-3 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          {/* BOOKINGS LIST */}
          <div className="lg:col-span-9">
            <header className="mb-8">
              <h1 className="text-2xl font-semibold text-gray-800">
                My Bookings
              </h1>
              <p className="text-gray-600">
                 Review your booking history and manage ongoing care arrangements.
              </p>
            </header>
            {loading ? (
              <div className="text-center py-10 text-gray-500">Loading...</div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                No bookings found.
              </div>
            ) : (
              <>
                <div className="space-y-5">
                  {currentBookings.map((b) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      role="careseeker"
                      onPay={handleKhaltiPayment}
                      paymentLoading={paymentLoading}
                      payClicked={payClicked}
                      onConfirmCompletion={confirmCompletion}
                      onRate={handleOpenRating}
                    />
                  ))}
                </div>

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
                      Page {currentPage} of {totalPages || 1}
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
              </>
            )}
          </div>
        </div>

        {ratingModalBooking && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-[520px] w-full mx-auto p-7">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                Share Your Experience
              </h2>
              <p className="text-sm text-gray-500 mb-6 text-center">
                Your feedback helps improve the quality of care for everyone.
              </p>
              {/* Star rating row */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => {
                  const displayValue = ratingHover > 0 ? ratingHover : ratingValue;
                  const isHighlighted = star <= displayValue;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingValue(star)}
                      onMouseEnter={() => setRatingHover(star)}
                      onMouseLeave={() => setRatingHover(0)}
                      className="text-4xl focus:outline-none transition-colors duration-150"
                      aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                    >
                      <span
                        className={
                          isHighlighted
                            ? "text-yellow-400 drop-shadow-sm transition-colors duration-150"
                            : "text-gray-300 hover:text-yellow-400 transition-colors duration-150"
                        }
                      >
                        ★
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Review textarea */}
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Share your experience with this caregiver..."
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 mb-6 bg-white min-h-[120px]"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRatingModalBooking(null)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={ratingSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitRating}
                  disabled={ratingSubmitting}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {ratingSubmitting ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CareseekerBookings;
