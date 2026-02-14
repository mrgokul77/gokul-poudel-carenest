import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";
import { bookingsApi } from "../api/axios";

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
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  additional_info?: string;
  status: string;
  created_at: string;
  notes?: string;
}

const CareseekerBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

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

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-xl font-medium text-gray-800 mb-6">My Bookings</h1>

        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading...</div>
        ) : bookings.length === 0 ? (
          <div className="bg-green-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500 shadow-sm">
            <p className="mb-4">You have not made any booking requests yet.</p>
            <Link
              to="/careseeker/find-caregiver"
              className="text-green-600 hover:text-green-700 font-medium"
            >
              Find a caregiver →
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="bg-green-50 border border-gray-200 rounded-xl p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {b.caregiver_profile_image ? (
                      <img
                        src={b.caregiver_profile_image}
                        alt={b.caregiver_name}
                        className="w-14 h-14 rounded-full border-2 border-gray-200 object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full border-2 border-gray-200 bg-green-100 flex items-center justify-center shrink-0">
                        <span className="text-lg font-semibold text-green-700">
                          {getInitial(b.caregiver_name)}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">
                        {b.caregiver_name}
                      </h3>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={b.status} />
                  </div>
                </div>

                <div className="space-y-4">
                  {b.service_types && b.service_types.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Services</p>
                      <div className="flex flex-wrap gap-1.5">
                        {b.service_types.map((service) => (
                          <span
                            key={service}
                            className="px-2.5 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded-md bg-green-50"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Date</p>
                      <p className="text-sm text-gray-700">{b.date}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Time & Duration</p>
                      <p className="text-sm text-gray-700">
                        {b.start_time ? (
                          <>
                            {b.start_time}
                            <span className="text-gray-500"> • {formatDuration(b.duration_hours)}</span>
                          </>
                        ) : (
                          formatDuration(b.duration_hours)
                        )}
                      </p>
                    </div>
                  </div>

                  {b.person_name && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Person Requiring Care</p>
                      <p className="text-sm text-gray-700">
                        {b.person_name}
                        {b.person_age && <span className="text-gray-500"> • Age {b.person_age}</span>}
                      </p>
                    </div>
                  )}

                  {(b.emergency_contact_phone || b.additional_info || b.notes) && (
                    <div className="pt-4 border-t border-gray-200 space-y-3">
                      {b.emergency_contact_phone && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Emergency Contact</p>
                          <p className="text-sm text-gray-700">{b.emergency_contact_phone}</p>
                        </div>
                      )}

                      {(b.additional_info || b.notes) && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Additional Notes</p>
                          {b.additional_info && (
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{b.additional_info}</p>
                          )}
                          {b.notes && (
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{b.notes}</p>
                          )}
                        </div>
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
  );
};

export default CareseekerBookings;
