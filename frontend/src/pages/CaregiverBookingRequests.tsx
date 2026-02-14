import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { bookingsApi } from "../api/axios";

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
}

const CaregiverBookingRequests = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

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

  const pending = bookings.filter((b) => b.status === "pending");
  const others = bookings.filter((b) => b.status !== "pending");
  const hasAcceptedBooking = bookings.some((b) => b.status === "accepted");

  const formatDuration = (hours: number) => `${hours} ${hours === 1 ? "hour" : "hours"}`;

  const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
      pending: "bg-amber-50 text-amber-700",
      accepted: "bg-green-50 text-green-700",
      rejected: "bg-red-50 text-red-700",
    };
    return (
      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles] || "bg-gray-100 text-gray-600"}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const BookingCard = ({ booking, isPending, hasAcceptedBooking }: { booking: Booking; isPending: boolean; hasAcceptedBooking: boolean }) => {
    const getInitial = (name: string) => name.charAt(0).toUpperCase();
    
    return (
      <div className="bg-green-50 border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 flex items-center gap-3">
          {booking.family_profile_image ? (
            <img
              src={booking.family_profile_image}
              alt={booking.family_name}
              className="w-14 h-14 rounded-full border-2 border-gray-200 object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full border-2 border-gray-200 bg-green-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-green-700">
                {getInitial(booking.family_name)}
              </span>
            </div>
          )}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-2">{booking.family_name}</h3>
            {booking.person_name && (
              <p className="text-sm text-gray-600">
                {booking.person_name}
                {booking.person_age && <span className="text-gray-500"> • Age {booking.person_age}</span>}
              </p>
            )}
          </div>
        </div>
        <StatusBadge status={booking.status} />
        </div>

        {booking.service_types && booking.service_types.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1.5">
              {booking.service_types.map((service) => (
                <span
                  key={service}
                  className="px-2 py-0.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-md bg-green-400"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4 space-y-1.5">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Date:</span> {booking.date}
            {booking.start_time && <span className="text-gray-500"> at {booking.start_time}</span>}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Duration:</span> {formatDuration(booking.duration_hours)}
          </p>
        </div>

        {(booking.emergency_contact_phone || booking.additional_info || booking.notes) && (
          <div className="pt-4 border-t border-gray-200 space-y-3">
            {booking.emergency_contact_phone && (
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">Emergency Contact</p>
                <p className="text-sm text-gray-700">
                  {booking.emergency_contact_phone}
                </p>
              </div>
            )}

            {(booking.additional_info || booking.notes) && (
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">Additional Information</p>
                {booking.additional_info && (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{booking.additional_info}</p>
                )}
                {booking.notes && (
                  <p className="text-sm text-gray-600 italic">{booking.notes}</p>
                )}
              </div>
            )}
          </div>
        )}

        {isPending && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            {hasAcceptedBooking && (
              <p className="text-xs text-gray-500 mb-2">Already engaged with another booking.</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => respond(booking.id, "rejected")}
                disabled={processing === booking.id}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => respond(booking.id, "accepted")}
                disabled={processing === booking.id || hasAcceptedBooking}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Accept
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-3 order-2 lg:order-1">
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

          <div className="lg:col-span-9 order-1 lg:order-2">
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
            ) : (
              <>
                {pending.length > 0 && (
                  <section className="mb-8">
                    <h2 className="text-sm font-medium text-gray-600 mb-4">Pending</h2>
                    <div className="space-y-5">
                      {pending.map((b) => (
                        <BookingCard key={b.id} booking={b} isPending={true} hasAcceptedBooking={hasAcceptedBooking} />
                      ))}
                    </div>
                  </section>
                )}

                {others.length > 0 && (
                  <section>
                    <h2 className="text-sm font-medium text-gray-600 mb-4">Past Requests</h2>
                    <div className="space-y-5">
                      {others.map((b) => (
                        <BookingCard key={b.id} booking={b} isPending={false} hasAcceptedBooking={hasAcceptedBooking} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaregiverBookingRequests;
