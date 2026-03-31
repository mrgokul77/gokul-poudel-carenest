import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import BookingCard, { type Booking } from "../BookingCard";

export interface RecentBooking {
  id: number;
  family_name?: string;
  caregiver_name?: string;
  family_profile_image?: string | null;
  caregiver_profile_image?: string | null;
  verification_status?: string | null;
  service_types?: string[];
  person_name?: string;
  person_age?: number;
  date: string;
  start_time?: string;
  duration_hours: number;
  total_amount?: string | null;
  emergency_contact_phone?: string;
  additional_info?: string;
  status: string;
  booking_status?: string;
  payment_status?: string;
  review_rating?: number | null;
  has_review?: boolean;
  created_at: string;
  service_address?: string;
}

interface RecentRequestsProps {
  requests: RecentBooking[];
  role: "caregiver" | "careseeker";
  viewAllHref: string;
  showFindCaregiverButton?: boolean;
}

const RecentRequests = ({
  requests,
  role,
  viewAllHref,
  showFindCaregiverButton = false,
}: RecentRequestsProps) => {
  const displayBookings = (requests || []).slice(0, 1);

  return (
    <div className="bg-green-50 rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold text-gray-800">
          Recent Bookings
        </h2>
        <Link
          to={viewAllHref}
          className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {!displayBookings.length ? (
        <div className="py-8 text-center">
          <p className="text-gray-500 text-sm mb-4">
            You have no recent bookings.
          </p>
          {showFindCaregiverButton && (
            <Link
              to="/careseeker/find-caregiver"
              className="inline-flex items-center gap-2 px-4 py-2 border border-green-500 text-green-600 rounded-lg font-medium hover:bg-green-100 transition-colors"
            >
              Find Caregiver
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayBookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b as Booking}
              role={role}
              showActions={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentRequests;
