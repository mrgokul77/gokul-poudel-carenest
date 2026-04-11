import React from "react";
import VerifiedAvatar from "./VerifiedAvatar";
import { resolveBackendMediaUrl } from "../utils/media";

export interface Booking {
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

export interface BookingCardProps {
  booking: Booking;
  role: "caregiver" | "careseeker";
  hasAcceptedBooking?: boolean;
  showActions?: boolean;
  onRespond?: (bookingId: number, action: "accepted" | "rejected") => void;
  onMarkServiceComplete?: (bookingId: number) => void;
  onConfirmCompletion?: (bookingId: number) => void;
  onRate?: (booking: Booking) => void;
  onPay?: (bookingId: number, totalAmount?: string | null | undefined) => void;
  onFileComplaint?: (bookingId: number, familyName: string, caregiverName: string) => void;
  hasActiveComplaint?: boolean;
  paymentLoading?: number | null;
  payClicked?: number | null;
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


const getInitial = (name: string) => name?.charAt(0).toUpperCase();

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

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  role,
  hasAcceptedBooking,
  showActions = true,
  onRespond,
  onMarkServiceComplete,
  onConfirmCompletion,
  onRate,
  onPay,
  onFileComplaint,
  hasActiveComplaint,
  paymentLoading,
  payClicked,
}) => {
  const isCaregiverView = role === "caregiver";
  const status = booking.booking_status || booking.status || "pending";
  const paymentStatus = (booking.payment_status ?? "unpaid") as string;
  const displayName = isCaregiverView
    ? booking.family_name || booking.caregiver_name || ""
    : booking.caregiver_name || booking.family_name || "";
  const displayImage = isCaregiverView
    ? booking.family_profile_image || null
    : booking.caregiver_profile_image || null;
  const resolvedDisplayImage = resolveBackendMediaUrl(displayImage);

  // Calculate start time for "Mark Service Complete" (caregiver: now >= start_time)
  let startDateTime: Date | null = null;
  let canMarkServiceComplete = false;
  if (booking.date && booking.start_time) {
    try {
      const startLocal = new Date(`${booking.date}T${booking.start_time}`);
      if (!Number.isNaN(startLocal.getTime())) {
        startDateTime = startLocal;
        const now = new Date();
        canMarkServiceComplete = now >= startDateTime;
      }
    } catch (e) {
      console.error('Error in Mark Service Complete logic:', e);
    }
  }

  return (
    <div className="max-w-4xl w-full mx-auto bg-green-50 rounded-2xl shadow-lg border border-green-200 border-t-4 border-t-green-500 p-6">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-5">
        <div className="flex items-center gap-3 min-w-0">
          {isCaregiverView ? (
            resolvedDisplayImage ? (
              <img
                src={resolvedDisplayImage}
                alt={displayName || "Profile"}
                className="w-14 h-14 rounded-full border-2 border-green-300 object-cover shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center shrink-0">
                <span className="text-lg font-semibold text-green-800">
                  {getInitial(displayName || "?")}
                </span>
              </div>
            )
          ) : (
            <VerifiedAvatar
              src={booking.caregiver_profile_image || null}
              username={displayName || "Caregiver"}
              isVerified={booking.verification_status === "approved"}
              size="sm"
            />
          )}
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
              status={booking.booking_status || booking.status || "pending"}
            />
            {/* Payment Status Badge (always show) */}
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

      {/* Caregiver actions */}
      {role === "caregiver" && showActions && (
        <div className="flex justify-end items-end gap-3 mt-4">
          {/* PENDING: Accept/Decline */}
          {status === "pending" && (
            <>
              {hasAcceptedBooking && (
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-0">
                  You already have an accepted booking. You cannot accept another one.
                </p>
              )}
              <button
                onClick={() => onRespond && onRespond(booking.id, "rejected")}
                className="px-5 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!!hasAcceptedBooking}
              >
                Decline
              </button>
              <button
                onClick={() => onRespond && onRespond(booking.id, "accepted")}
                className="px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!!hasAcceptedBooking}
              >
                Accept
              </button>
            </>
          )}
          {/* ACCEPTED: Mark Service Complete (when now >= start_time) */}
          {status === "accepted" && (
            <>
              <button
                onClick={() => onMarkServiceComplete && onMarkServiceComplete(booking.id)}
                disabled={!canMarkServiceComplete}
                className="px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mark Service Complete
              </button>
            </>
          )}
          {/* COMPLETED: No action buttons */}
        </div>
      )}

      {/* Careseeker actions */}
      {role === "careseeker" && showActions && (
        <div className="flex justify-between items-end gap-3 mt-4">
          {/* Left side: Complaints */}
          <div>
            {onFileComplaint && status !== "pending" && (
              hasActiveComplaint ? (
                <span className="px-4 py-1.5 text-xs font-semibold text-amber-700 bg-amber-100 rounded-lg">
                  Complaint Pending
                </span>
              ) : (
                <button
                  onClick={() => 
                    isCaregiverView 
                      ? onFileComplaint(booking.id, booking.family_name || "", booking.caregiver_name || "")
                      : onFileComplaint(booking.id, booking.caregiver_name || "")
                  }
                  className="px-4 py-1.5 text-xs font-medium text-red-600 border border-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  File Complaint
                </button>
              )
            )}
          </div>

          {/* Right side: Other actions */}
          <div className="flex gap-3">
            {/* COMPLETION_REQUESTED: Confirm Completion */}
            {(status === "completion_requested" || booking.status === "completion_requested") && (
              <button
                onClick={() => onConfirmCompletion && onConfirmCompletion(booking.id)}
                className="px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors"
              >
                Confirm Completion
              </button>
            )}
            {/* COMPLETED + UNPAID: Pay with Khalti */}
            {status === "completed" &&
              paymentStatus.toLowerCase() !== "paid" &&
              onPay && (
                <button
                  onClick={() => onPay(booking.id, booking.total_amount)}
                  disabled={!!(paymentLoading === booking.id || payClicked === booking.id)}
                  className="px-5 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {paymentLoading === booking.id || payClicked === booking.id
                    ? "Processing..."
                    : "Pay with Khalti"}
                </button>
              )}
            {/* COMPLETED + PAID: Rate & Review (when no review yet) */}
            {status === "completed" &&
              paymentStatus.toLowerCase() === "paid" &&
              !booking.has_review &&
              onRate && (
                <button
                  onClick={() => onRate(booking)}
                  className="px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors"
                >
                  Rate & Review
                </button>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingCard;
