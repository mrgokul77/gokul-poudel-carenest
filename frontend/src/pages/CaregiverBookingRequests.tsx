import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import BookingCard from "../components/BookingCard";
import ComplaintModal from "../components/ComplaintModal";
import { bookingsApi, complaintsApi } from "../api/axios";
import api from "../api/axios";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Booking {
  id: number;
  family_name: string;
  family_profile_image?: string | null;
  caregiver_name: string;
  service_types?: string[];
  person_name?: string;
  person_age?: number;
  date: string;
  start_time?: string;
  duration_hours: number;
  emergency_contact_phone?: string;
  additional_info?: string;
  status: string;
  booking_status?: string;
  created_at: string;
  notes?: string;
  service_address?: string;
  total_amount?: string | null;
  payment_status?: string;
}

interface UserComplaint {
  id: number;
  booking_id: number;
  status: string;
}

const CaregiverBookingRequests = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setProcessing] = useState<number | null>(null);

  const [serviceTypeFilter, setServiceTypeFilter] = useState<string[]>([]);
  const [durationFilter, setDurationFilter] = useState<string>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [caregiverServices, setCaregiverServices] = useState<string[]>([]);
  const [userComplaints, setUserComplaints] = useState<UserComplaint[]>([]);
  const [complaintModal, setComplaintModal] = useState({
    isOpen: false,
    bookingId: 0,
    caregiverName: "",
    familyName: "",
    status: "",
  });

  useEffect(() => {
    fetchBookings();
    fetchCaregiverServices();
    fetchUserComplaints();
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

  const fetchCaregiverServices = async () => {
    try {
      const res = await api.get("/profile/");
      const data = res.data;
      if (data.role === "caregiver" && data.caregiver_details?.service_types) {
        setCaregiverServices(data.caregiver_details.service_types);
      }
    } catch {
      setCaregiverServices([]);
    }
  };

  const fetchUserComplaints = async () => {
    try {
      const res = await complaintsApi.get("my-complaints/");
      setUserComplaints(res.data);
    } catch (err) {
      console.error("Failed to fetch user complaints", err);
    }
  };

  const hasActiveComplaint = (bookingId: number) => {
    return userComplaints.some(
      (c) => c.booking_id === bookingId && ["open", "investigating"].includes(c.status)
    );
  };

  const handleFileComplaint = (bookingId: number, familyName: string, caregiverName: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    setComplaintModal({
      isOpen: true,
      bookingId,
      familyName,
      caregiverName,
      status: booking ? (booking.booking_status || booking.status) : "",
    });
  };

  const respond = async (id: number, status: "accepted" | "rejected") => {
    setProcessing(id);
    try {
      await bookingsApi.put(`${id}/respond/`, { status });
      await fetchBookings();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to update booking");
    } finally {
      setProcessing(null);
    }
  };

  const markServiceComplete = async (id: number) => {
    setProcessing(id);
    try {
      await bookingsApi.post(`${id}/mark-service-complete/`);
      await fetchBookings();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to mark service as complete");
    } finally {
      setProcessing(null);
    }
  };

  const resetFilters = () => {
    setServiceTypeFilter([]);
    setDurationFilter("all");
    setPaymentStatusFilter("all");
  };

  const toggleServiceTypeFilter = (type: string) => {
    setServiceTypeFilter((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const filteredBookings = bookings
    .filter((b) =>
      serviceTypeFilter.length > 0
        ? b.service_types?.some((st) => serviceTypeFilter.includes(st))
        : true,
    )
    .filter((b) => {
      if (durationFilter === "less4") return b.duration_hours < 4;
      if (durationFilter === "4to8")
        return b.duration_hours >= 4 && b.duration_hours <= 8;
      return true;
    })
    .filter((b) => {
      if (paymentStatusFilter === "all") return true;
      if (paymentStatusFilter === "paid") return b.payment_status === "paid";
      if (paymentStatusFilter === "unpaid") return b.payment_status !== "paid";
      return true;
    });

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / itemsPerPage));
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const pageBookings = filteredBookings.slice(indexOfFirst, indexOfLast);

  const pendingFiltered = pageBookings.filter(
    (b) => (b.booking_status || b.status) === "pending",
  );
  const othersFiltered = pageBookings.filter(
    (b) => (b.booking_status || b.status) !== "pending",
  );

  const hasAcceptedBooking = bookings.some(
    (b) => (b.booking_status || b.status) === "accepted",
  );

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

              {/* Service Type */}
              <div className="bg-green-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="bg-green-100 rounded-xl px-4 py-3 mb-4">
                  <span className="text-xs font-semibold text-green-800 uppercase tracking-wide">
                    Service Type
                  </span>
                </div>

                <div className="space-y-3">
                  {caregiverServices.map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={serviceTypeFilter.includes(type)}
                        onChange={() => toggleServiceTypeFilter(type)}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="bg-green-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="bg-green-100 rounded-xl px-4 py-3 mb-4">
                  <span className="text-xs font-semibold text-green-800 uppercase tracking-wide">
                    Duration
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    { value: "all", label: "All Durations" },
                    { value: "less4", label: "Less than 4 hours" },
                    { value: "4to8", label: "4–8 hours" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="durationFilter"
                        value={option.value}
                        checked={durationFilter === option.value}
                        onChange={(e) => setDurationFilter(e.target.value)}
                        className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Sort By */}
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

          {/* Main Content */}
          <div className="lg:col-span-9">
            <header className="mb-8">
              <h1 className="text-2xl font-semibold text-gray-800">
                Booking Requests
              </h1>
              <p className="text-gray-600">
                Review and respond to care requests from families.
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
                {pendingFiltered.length > 0 && (
                  <section className="mb-8">
                    <h2 className="text-sm text-gray-600 mb-4">
                      Pending ({pendingFiltered.length})
                    </h2>
                    <div className="flex flex-col items-center gap-5">
                      {pendingFiltered.map((b) => (
                        <BookingCard
                          key={b.id}
                          booking={b}
                          role="caregiver"
                          hasAcceptedBooking={hasAcceptedBooking}
                          onRespond={respond}
                          onMarkServiceComplete={markServiceComplete}
                          onFileComplaint={handleFileComplaint}
                          hasActiveComplaint={hasActiveComplaint(b.id)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {othersFiltered.length > 0 && (
                  <section>
                    <div className="flex flex-col items-center gap-5">
                      {othersFiltered.map((b) => (
                        <BookingCard
                          key={b.id}
                          booking={b}
                          role="caregiver"
                          hasAcceptedBooking={hasAcceptedBooking}
                          onRespond={respond}
                          onMarkServiceComplete={markServiceComplete}
                          onFileComplaint={handleFileComplaint}
                          hasActiveComplaint={hasActiveComplaint(b.id)}
                        />
                      ))}
                    </div>
                  </section>
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

        {complaintModal.isOpen && (
          <ComplaintModal
            isOpen={complaintModal.isOpen}
            onClose={() => setComplaintModal({ ...complaintModal, isOpen: false })}
            booking={{
              id: complaintModal.bookingId,
              caregiver_name: complaintModal.caregiverName,
              family_name: complaintModal.familyName,
              status: complaintModal.status,
            }}
            role="caregiver"
            onSuccess={() => {
              alert("Your complaint has been filed successfully. We will investigate and get back to you.");
              fetchBookings();
              fetchUserComplaints();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CaregiverBookingRequests;
