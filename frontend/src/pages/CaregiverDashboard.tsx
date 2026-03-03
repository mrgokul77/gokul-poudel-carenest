import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import DocumentVerificationModal from "../components/DocumentVerificationModal";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { bookingsApi } from "../api/axios";

const MODAL_SHOWN_KEY = "verification_modal_shown";

type ModalType = "incomplete_profile" | "verification_required" | "pending_review" | null;

interface ProfileData {
  phone?: string;
  address?: string;
  verification_status?: string | null;
  caregiver_details?: {
    gender?: string;
    training_authority?: string;
    certification_year?: number | string;
    available_hours?: string;
    hourly_rate?: number | string;
    service_types?: string[];
  };
}

interface Booking {
  id: number;
  family_name: string;
  date: string;
  duration_hours: number;
  status: string;
}

const CaregiverDashboard = () => {
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, []);

  const validateProfileCompleteness = (profile: ProfileData): string[] => {
    const errors: string[] = [];
    const details = profile.caregiver_details || {};

    // Phone must be exactly 10 digits
    const phone = profile.phone?.replace(/\D/g, "") || "";
    if (phone.length !== 10) {
      errors.push("Phone (must be exactly 10 digits)");
    }

    // Address is required
    if (!profile.address || profile.address.trim() === "") {
      errors.push("Address");
    }

    // Caregiver-specific fields
    if (!details.gender || details.gender.trim() === "") {
      errors.push("Gender");
    }

    if (!details.training_authority || details.training_authority.trim() === "") {
      errors.push("Training Authority");
    }

    if (!details.certification_year) {
      errors.push("Certification Year");
    }

    if (!details.available_hours || details.available_hours.trim() === "") {
      errors.push("Available Hours");
    }

    // Hourly rate must be greater than 0
    const rate = Number(details.hourly_rate);
    if (!details.hourly_rate || rate <= 0) {
      errors.push("Hourly Rate (must be greater than 0)");
    }

    // At least one service type selected
    if (!details.service_types || details.service_types.length === 0) {
      errors.push("At least one Service Type");
    }

    return errors;
  };

  const checkVerificationStatus = async () => {
    if (sessionStorage.getItem(MODAL_SHOWN_KEY) === "true") return;

    try {
      const res = await api.get("/profile/");
      const profile: ProfileData = res.data;
      const verificationStatus = profile.verification_status;

      // Check profile completeness first
      const profileErrors = validateProfileCompleteness(profile);

      if (profileErrors.length > 0) {
        // Profile is incomplete
        setModalType("incomplete_profile");
        setMissingFields(profileErrors);
        setShowVerificationModal(true);
        sessionStorage.setItem(MODAL_SHOWN_KEY, "true");
      } else if (verificationStatus === "pending") {
        // Profile complete, verification pending
        setModalType("pending_review");
        setShowVerificationModal(true);
        sessionStorage.setItem(MODAL_SHOWN_KEY, "true");
      } else if (!verificationStatus || verificationStatus === "rejected") {
        // Profile complete, needs verification
        setModalType("verification_required");
        setShowVerificationModal(true);
        sessionStorage.setItem(MODAL_SHOWN_KEY, "true");
      }
      // If approved, do not show popup
    } catch (err) {
      console.error("Failed to fetch verification status", err);
    }
  };

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

      <DocumentVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        modalType={modalType}
        missingFields={missingFields}
      />

      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-xl font-medium text-gray-800 mb-6">
          Caregiver Dashboard
        </h1>

        <div className="mb-6">
          <Link
            to="/caregiver/booking-requests"
            className="inline-block px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
          >
            Booking Requests
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-medium text-gray-800">
              Recent Bookings
            </h2>
            <Link
              to="/caregiver/booking-requests"
              className="text-sm text-green-600 hover:text-green-700"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : bookings.length === 0 ? (
            <p className="text-gray-500 text-sm">No booking requests yet.</p>
          ) : (
            <div className="space-y-2">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="text-sm text-gray-800">{b.family_name}</span>
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

export default CaregiverDashboard;
