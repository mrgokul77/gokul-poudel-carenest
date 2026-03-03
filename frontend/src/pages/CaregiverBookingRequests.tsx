import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { bookingsApi } from "../api/axios";
import api from "../api/axios";
import { MapPin, Phone } from "lucide-react";

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
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  additional_info?: string;
  status: string;
  created_at: string;
  notes?: string;
  service_address?: string;
  // ...existing code...
}

const CaregiverBookingRequests = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  // Filter state
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string[]>([]);
  const [durationFilter, setDurationFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");

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

  const respond = async (id: number, status: string) => {
    setProcessing(id);
    try {
      await bookingsApi.put(`${id}/respond/`, { status });
      fetchBookings();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      const errorMessage = ax.response?.data?.error || "Failed to update booking";
      alert(errorMessage);
    } finally {
      setProcessing(null);
    }
  };

  // Only show service types from caregiver profile
  const [caregiverServices, setCaregiverServices] = useState<string[]>([]);
  useEffect(() => { fetchCaregiverServices(); }, []);
  const fetchCaregiverServices = async () => {
    try {
      const res = await api.get("/profile/");
      const data = res.data;
      if (data.role === "caregiver" && data.caregiver_details?.service_types) {
        setCaregiverServices(data.caregiver_details.service_types);
      } else {
        setCaregiverServices([]);
      }
    } catch {
      setCaregiverServices([]);
    }
  };
  const allServiceTypes = caregiverServices;

  // Filter and sort logic
  const getFilteredBookings = () => {
    let filtered = [...bookings];

    // Service type filter
    if (serviceTypeFilter.length > 0) {
      filtered = filtered.filter((b) =>
        b.service_types?.some((st) => serviceTypeFilter.includes(st))
      );
    }

    // Duration filter
    if (durationFilter === "less4") {
      filtered = filtered.filter((b) => b.duration_hours < 4);
    } else if (durationFilter === "4to8") {
      filtered = filtered.filter((b) => b.duration_hours >= 4 && b.duration_hours <= 8);
    } else if (durationFilter === "more8") {
      filtered = filtered.filter((b) => b.duration_hours > 8);
    }

    // Sort
    if (sortBy === "recent") {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === "longest") {
      filtered.sort((a, b) => b.duration_hours - a.duration_hours);
    }

    return filtered;
  };

  const filteredBookings = getFilteredBookings();
  const pendingFiltered = filteredBookings.filter((b) => b.status === "pending");
  const othersFiltered = filteredBookings.filter((b) => b.status !== "pending");
  const hasAcceptedBooking = bookings.some((b) => b.status === "accepted");

  const resetFilters = () => {
    setServiceTypeFilter([]);
    setDurationFilter("all");
    setSortBy("recent");
  };

  const toggleServiceTypeFilter = (type: string) => {
    if (serviceTypeFilter.includes(type)) {
      setServiceTypeFilter(serviceTypeFilter.filter((t) => t !== type));
    } else {
      setServiceTypeFilter([...serviceTypeFilter, type]);
    }
  };

  const formatDuration = (hours: number) => `${hours} ${hours === 1 ? "hour" : "hours"}`;

  const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
      pending: "bg-amber-100 text-amber-800 border-amber-200",
      accepted: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
    };
    const labels = {
      pending: "Pending",
      accepted: "Active",
      rejected: "Declined",
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${styles[status as keyof typeof styles] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'accepted' ? 'bg-green-500' : status === 'pending' ? 'bg-amber-500' : 'bg-red-500'}`} />
        {labels[status as keyof typeof labels] || status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const BookingCard = ({ booking, isPending, hasAcceptedBooking }: { booking: Booking; isPending: boolean; hasAcceptedBooking: boolean }) => {
    const getInitial = (name: string) => name.charAt(0).toUpperCase();
    
    return (
      <div className="bg-green-50 rounded-xl shadow-sm border border-green-100 overflow-hidden">
        {/* Green top border accent */}
        <div className="h-1 bg-gradient-to-r from-green-400 to-green-600" />
        
        <div className="p-6">
          {/* Header: Profile + Status */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-4">
              {booking.family_profile_image ? (
                <img
                  src={booking.family_profile_image}
                  alt={booking.family_name}
                  className="w-14 h-14 rounded-full border-2 border-green-100 object-cover shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center shadow-sm">
                  <span className="text-lg font-semibold text-green-700">
                    {getInitial(booking.family_name)}
                  </span>
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{booking.family_name}</h3>
                {booking.person_name && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    Care for: {booking.person_name}
                    {booking.person_age && <span> • {booking.person_age} yrs</span>}
                  </p>
                )}
              </div>
            </div>
            <StatusBadge status={booking.status} />
          </div>

          {/* Service Type Pills */}
          {booking.service_types && booking.service_types.length > 0 && (
            <div className="mb-5">
              <div className="flex flex-wrap gap-2">
                {booking.service_types.map((service) => (
                  <span
                    key={service}
                    className="px-3 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Two-column layout: Service details (left) & Date/Time (right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {/* Left Column - Date & Time */}
            <div className="bg-green-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Schedule</span>
              </div>
              <p className="text-sm font-medium text-gray-800 mb-1">{booking.date}</p>
              {booking.start_time && (
                <p className="text-sm text-gray-600">Starts at {booking.start_time}</p>
              )}
              <p className="text-sm text-gray-600 mt-1">
                Duration: <span className="font-medium">{formatDuration(booking.duration_hours)}</span>
              </p>
            </div>

            {/* Right Column - Service Address and Emergency Contact */}
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Service Address</span>
                </div>
                <p className="text-sm font-medium text-gray-800">{booking.service_address || "N/A"}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Phone className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Emergency Phone</span>
                </div>
                <p className="text-sm font-medium text-gray-800">{booking.emergency_contact_phone ? booking.emergency_contact_phone : "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Additional Notes Section */}
          {(booking.additional_info || booking.notes) && (
            <div className="bg-green-50 rounded-lg p-4 mb-5 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Notes</span>
              </div>
              {booking.additional_info && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{booking.additional_info}</p>
              )}
              {booking.notes && (
                <p className="text-sm text-gray-600 mt-1 italic">{booking.notes}</p>
              )}
            </div>
          )}

          {/* Action Buttons (for pending bookings) */}
          {isPending && (
            <div className="pt-4 border-t border-green-100">
              {hasAcceptedBooking && (
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-3">
                  You already have an accepted booking. You cannot accept another one.
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => respond(booking.id, "rejected")}
                  disabled={processing === booking.id}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Decline
                </button>
                <button
                  onClick={() => respond(booking.id, "accepted")}
                  disabled={processing === booking.id || hasAcceptedBooking}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Accept Request
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Sidebar - Filter Panel */}
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

              {/* Service Type Filter Card */}
              {allServiceTypes.length > 0 && (
                <div className="bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="bg-green-100 rounded-lg px-3 py-2 mb-3">
                    <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Service Type</span>
                  </div>
                  <div className="space-y-2 px-1 max-h-40 overflow-y-auto">
                    {allServiceTypes.map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={serviceTypeFilter.includes(type)}
                          onChange={() => toggleServiceTypeFilter(type)}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <span className="truncate">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Duration Filter Card */}
              <div className="bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="bg-green-100 rounded-lg px-3 py-2 mb-3">
                  <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Duration</span>
                </div>
                <div className="space-y-2 px-1">
                  {[
                    { value: "all", label: "All Durations" },
                    { value: "less4", label: "Less than 4 hours" },
                    { value: "4to8", label: "4–8 hours" },
                    { value: "more8", label: "More than 8 hours" },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input
                        type="radio"
                        name="durationFilter"
                        value={option.value}
                        checked={durationFilter === option.value}
                        onChange={(e) => setDurationFilter(e.target.value)}
                        className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Sort By Card */}
              <div className="bg-green-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="bg-green-100 rounded-lg px-3 py-2 mb-3">
                  <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Sort By</span>
                </div>
                <div className="space-y-2 px-1">
                  {[
                    { value: "recent", label: "Most Recent" },
                    { value: "oldest", label: "Oldest First" },
                    { value: "longest", label: "Longest Duration" },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input
                        type="radio"
                        name="sortBy"
                        value={option.value}
                        checked={sortBy === option.value}
                        onChange={(e) => setSortBy(e.target.value)}
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

          {/* Main Content */}
          <div className="lg:col-span-6 order-1 lg:order-2">
            <header className="mb-8">
              <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                Booking Requests
              </h1>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Review and respond to care requests from families.
              </p>
            </header>

            {loading ? (
              <div className="py-12 text-center text-gray-500">Loading...</div>
            ) : bookings.length === 0 ? (
              <div className="bg-green-50 border border-gray-200 rounded-xl p-8 text-center shadow-sm">
                <p className="text-gray-500">No booking requests yet.</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="bg-green-50 border border-gray-200 rounded-xl p-8 text-center shadow-sm">
                <p className="text-gray-500">No bookings match your filters.</p>
                <button
                  onClick={resetFilters}
                  className="mt-3 text-green-600 hover:text-green-700 font-medium text-sm"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <>
                {pendingFiltered.length > 0 && (
                  <section className="mb-8">
                    <h2 className="text-sm font-medium text-gray-600 mb-4">Pending ({pendingFiltered.length})</h2>
                    <div className="space-y-5">
                      {pendingFiltered.map((b) => (
                        <BookingCard key={b.id} booking={b} isPending={true} hasAcceptedBooking={hasAcceptedBooking} />
                      ))}
                    </div>
                  </section>
                )}

                {othersFiltered.length > 0 && (
                  <section>
                    {/* <h2 className="text-sm font-medium text-gray-600 mb-4">Past Requests ({othersFiltered.length})</h2> */}
                    <div className="space-y-5">
                      {othersFiltered.map((b) => (
                        <BookingCard key={b.id} booking={b} isPending={false} hasAcceptedBooking={hasAcceptedBooking} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>

          {/* Right Sidebar - Booking Tips */}
          <div className="lg:col-span-3 order-3">
            <div className="bg-green-50 border border-gray-200 rounded-xl p-5 shadow-sm sticky top-6">
              <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold">
                  i
                </span>
                Booking Tips
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  <span>Review care requests carefully before accepting</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  <span>Accept only one request at a time to avoid overbooking</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  <span>Check service details (date, duration, location) before confirming</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  <span>Communicate clearly with the careseeker after acceptance</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaregiverBookingRequests;
