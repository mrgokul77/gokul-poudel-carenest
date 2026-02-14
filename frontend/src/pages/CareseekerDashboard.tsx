import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";
import { bookingsApi } from "../api/axios";

interface Booking {
  id: number;
  caregiver_name: string;
  date: string;
  duration_hours: number;
  status: string;
}

const CareseekerDashboard = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await bookingsApi.get("list/");
      setBookings(res.data.slice(0, 5));
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-xl font-medium text-gray-800 mb-6">
          Careseeker Dashboard
        </h1>

        <div className="mb-6">
          <Link
            to="/careseeker/find-caregiver"
            className="inline-block px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
          >
            Find Caregiver
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-medium text-gray-800">My Bookings</h2>
            <Link
              to="/careseeker/bookings"
              className="text-sm text-green-600 hover:text-green-700"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : bookings.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No bookings yet. Find a caregiver to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="text-sm text-gray-800">{b.caregiver_name}</span>
                  <span className="text-sm text-gray-600">
                    {b.date} • {b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CareseekerDashboard;
